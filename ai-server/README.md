# Coffee Station AI 서버

최종 현황 정리: 2026-11-09. 팀 공유 설명은 [AI_AGENT_OVERVIEW.md](../docs/AI_AGENT_OVERVIEW.md)를 기준으로 읽으세요.

## 현재 구현

- Gemini 구조화 조건 추출 → 사용자 확인·수정 → 추천 API.
- 기본 direct 모드는 확정 조건을 Python으로 검색·정렬하며 추천 단계 LLM 호출은 0회.
- agent 모드는 기존 수동 도구 호출/Agent Loop 실습 경로.
- Express 연결과 React Native 입력·확인·결과/리뷰 화면 구현.
- 리뷰는 모의 구조화 발췌, 근거 검증, SQLite 캐시, 조회 API까지 구현.
- 행신 가격 자료는 별도 MySQL DB에 적재하고 검색·가격 비교를 검증.

## 데이터 사용 원칙

일반 개발은 모의 데이터만 사용합니다. 사용자 승인으로 행신 자료만 별도 테스트 DB에서 사용했습니다.
다른 실제 데이터/리뷰는 승인 없이 사용하지 않습니다. Git 작업은 사용자 직접 진행 단계입니다.

- 기본 개발: [mock_data_development.ipynb](notebooks/mock_data_development.ipynb)
- 승인된 행신 DB 테스트: [real_data_ready.ipynb](notebooks/real_data_ready.ipynb), RUN_HAENGSIN_TEST=True로 실행
- 기존 agent_api_smoke.ipynb/gemini_mock_agent.ipynb는 과거 실습 기록이며 실제 API 호출 셀이 있어 전체 실행하지 않습니다.

## 실행 모드

| 설정 | 값 | 의미 |
|---|---|---|
| EXTRACTION_MODE | mock / gemini | 고정 모의 문장 / 실제 추출 |
| RECOMMENDATION_MODE | direct / agent | Python 직접 추천 / Agent Loop |
| AGENT_REPOSITORY | mock / mysql-demo / mysql | 임시 JSON / 격리 데모 DB / 실제 스키마 |

API 비용 없는 개발은 mock + direct + mock 조합입니다.
추출의 코드 기본값은 gemini이므로 EXTRACTION_MODE=mock을 명시하세요.
행신 검색은 별도 haengsin.py 계층이며 위 추천 Repository 모드에 아직 연결하지 않았습니다.

ai-server 폴더에서 필요한 의존성을 설치한 뒤 실행합니다.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-notebook.txt -r requirements-mysql.txt
$env:EXTRACTION_MODE='mock'
$env:RECOMMENDATION_MODE='direct'
$env:AGENT_REPOSITORY='mock'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

venv에 pip가 없으면 먼저 `python -m ensurepip --upgrade`를 해당 venv Python으로 실행하거나 uv pip를 사용합니다.
Express/Python의 INTERNAL_API_TOKEN을 동일하게 설정하고 키·비밀번호는 .env/환경변수로 관리합니다.

## 검증 및 제한

최신 실행 이력: Python 테스트 72개, 프런트엔드 Jest 7개, TypeScript/변경 파일 린트, Express 모의 전달 테스트 통과.
행신 DB: 매장 8개/옵션 57개, 4000원 이하 ICE 아메리카노 12옵션/카페라떼 6옵션 확인.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

카카오 지도·에뮬레이터 검증·개인화 점수·사용자별 소유권·공유 상태 저장은 미완료입니다.
확인 제안은 단일 서버 메모리 10분/1회 사용입니다. 자연어 추출은 사용자 확인을 대체하지 않습니다.
리뷰는 실제 종합 요약이 아닙니다. 행신 가격은 검증일·판매 상태·좌표가 부족한 비교 후보이며 확정 추천이 아닙니다.

## 상세 문서

- [추천 API](RECOMMENDATION_API.md), [확인 흐름](CONFIRMATION_FLOW.md)
- [조건 추출](CONDITION_EXTRACTION.md), [직접 추천/모의 모드](DIRECT_RECOMMENDATION.md)
- [추천 원칙](RECOMMENDATION_POLICY.md), [리뷰 요약](REVIEW_SUMMARY.md)
- [ERD 조회 매핑](app/repositories/README.md), [행신 개발 순서](../backend/sql/haengsin/WORK_PLAN.md)
- [앱 추천 화면](../frontend/MOCK_RECOMMENDATION_SCREEN.md)

상세 문서의 테스트 개수는 해당 단계 당시 기록이며 최신 합계는 위 검증 항목을 따릅니다.
