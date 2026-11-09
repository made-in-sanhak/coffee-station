"""One stateless, internal recommendation endpoint."""
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.agent.loop import run_turn
from app.agent.direct import recommend_direct
from app.agent.extraction import extract_proposal
from app.agent.proposals import ProposalStore
from app.core.config import settings
from app.core.security import verify_internal_token
from app.llm.gemini import GeminiModel
from app.llm.mock_extraction import MockExtractionModel
from app.llm.diagnostics import diagnose_model_error
from app.llm.settings import read_gemini_settings
from app.repositories.base import Location, RepositoryError, SearchFilters
from app.repositories.factory import create_repository


class Coordinates(BaseModel):
    model_config = ConfigDict(extra='forbid')
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)


class Constraints(BaseModel):
    model_config = ConfigDict(extra='forbid')
    max_price_krw: int | None = Field(default=None, ge=0, strict=True)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    origin: Coordinates | None = None
    radius_m: float | None = Field(default=None, ge=0, le=20100000, allow_inf_nan=False)
    sort_by: Literal['price', 'distance'] = 'price'
    limit: int = Field(default=20, ge=1, le=100, strict=True)

    @model_validator(mode='after')
    def validate_location(self):
        if (self.radius_m is not None or self.sort_by == 'distance') and self.origin is None:
            raise ValueError('origin is required for radius or distance sorting')
        if self.category is not None and not self.category.strip():
            raise ValueError('category cannot be blank')
        return self

    def to_filters(self):
        values = self.model_dump()
        values['origin'] = Location(**values['origin']) if self.origin else None
        return SearchFilters(**values)


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    message: str = Field(min_length=1, max_length=4000)
    # Required: natural language alone does not establish trusted constraints yet.
    constraints: Constraints


router = APIRouter(tags=['recommendations'], dependencies=[Depends(verify_internal_token)])
proposals = ProposalStore()


class PrepareRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    message: str = Field(min_length=1, max_length=4000)


class ConfirmRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    proposal_id: str = Field(min_length=1, max_length=100)
    confirmed: bool = Field(strict=True)
    constraints: Constraints


@router.post('/recommendations/prepare')
def prepare(request: PrepareRequest):
    try:
        if settings.extraction_mode == 'mock':
            model = MockExtractionModel(request.message)
        else:
            key, model_id = read_gemini_settings(Path(__file__).resolve().parents[2])
            model = GeminiModel(api_key=key, model=model_id)
    except (ValueError, ImportError):
        raise HTTPException(503, 'Extraction configuration unavailable') from None
    try:
        proposal = extract_proposal(model, request.message)
    except Exception as error:
        diagnostic, hint = diagnose_model_error(error)
        raise HTTPException(502, {**diagnostic, 'message': hint}) from None
    finally:
        model.close()
    try:
        proposal_id = proposals.add(proposal)
    except ValueError:
        raise HTTPException(503, 'Too many pending proposals') from None
    return {'status': 'NEEDS_CLARIFICATION' if proposal.unresolved else 'AWAITING_CONFIRMATION',
            'extraction_mode': settings.extraction_mode,
            'llm_calls': 0 if settings.extraction_mode == 'mock' else 1,
            'proposal_id': proposal_id, 'expires_in_seconds': proposals.ttl,
            'proposal': proposal.model_dump(),
            'suggested_constraints': {'max_price_krw': proposal.max_price_krw,
                'category': proposal.category, 'sort_by': proposal.sort_by or 'price', 'limit': 20},
            'notice': '조건을 확인·수정하세요. 정렬 미지정 시 가격순, 최대 20개를 제안합니다.'}


@router.post('/recommendations/confirm')
def confirm(request: ConfirmRequest):
    if not request.confirmed:
        raise HTTPException(409, 'Explicit confirmation required')
    if request.constraints.category not in (None, 'COFFEE', 'LATTE', 'TEA', 'ETC'):
        raise HTTPException(422, 'Unsupported category')
    try:
        proposals.consume(request.proposal_id)
    except KeyError:
        raise HTTPException(409, 'Proposal expired or already used; prepare again') from None
    except ValueError:
        raise HTTPException(409, 'Unresolved conditions; revise the message and prepare again') from None
    # Use the explicitly confirmed replacement conditions, not the old wording.
    return recommend(RecommendationRequest(
        message='사용자가 확인한 조건에 맞는 메뉴를 검색해 추천해 주세요.', constraints=request.constraints))


@router.post('/recommendations')
def recommend(request: RecommendationRequest):
    try:
        cafe_ids = tuple(int(i.strip()) for i in settings.agent_cafe_ids.split(',') if i.strip())
        repo = create_repository(settings.agent_repository, cafe_ids=cafe_ids)
        if settings.recommendation_mode == 'direct':
            return JSONResponse(content=jsonable_encoder(recommend_direct(repo, request.constraints.to_filters())))
        key, model_id = read_gemini_settings(Path(__file__).resolve().parents[2])
        model = GeminiModel(api_key=key, model=model_id)
    except (ValueError, RepositoryError, ImportError):
        raise HTTPException(503, 'Recommendation service configuration or database unavailable') from None
    try:
        result = run_turn(model, repo, request.message, constraints=request.constraints.to_filters())
    finally:
        model.close()
    code = {'ERROR': 502, 'LIMIT': 504}.get(result.status, 200)
    return JSONResponse(status_code=code, content=jsonable_encoder(result))
