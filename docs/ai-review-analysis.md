# 리뷰 분석 — Python 작업

> 후속 리뷰 특징 수집·분석 참고 문서. 현재 추천 탭 DB 연동 MVP의 선행 조건은 아니다. [문서 안내](README.md) 참조.

기준: 2026-11-10 현재 코드. Python은 리뷰 분석·근거 검증·저장 작업을 담당한다. 상시 HTTP 서버와 운영용 작업 이미지는 없다.

## 남은 두 모의 경로

- [review_job.py](../ai-jobs/app/review_job.py)는 `MockAnalysisRepository`의 리뷰 snapshot을 읽어 `MockReviewModel`의 분석·재조회 행동을 제한된 횟수와 시간 안에 처리한다. 저장소는 revision과 입력 해시를 확인하고 원문에 있는 인용만 게시한다. 결과는 `READY`, `BUSY`, `TIMEOUT`, `LIMIT_REACHED`, `FAILED` 중 하나다. 프로세스 로컬 잠금·메모리 저장소이므로 운영용 분산 작업이 아니다.
- [export_mock_review_summary.py](../ai-jobs/scripts/export_mock_review_summary.py)는 별도의 `review_summary.py` 모의 발췌 결과를 `backend/artifacts/mock-review-summary.json`에 원자적으로 쓴다. Express의 모의 리뷰 조회가 이 파일을 읽는다. `review_job.py`의 분석 저장소와 이 파일 경로는 아직 연결되지 않았다. 요약은 규칙 기반이며 실제 종합 LLM 요약이 아니다.

`repositories/reviews.py`는 리뷰 조회 계약과 MySQL 주입형 구현이다. `repositories/haengsin.py`와 `notebooks/real_data_ready.ipynb`는 승인된 행신 가격 자료 검증용이며 일반 리뷰 작업이나 현재 추천에 연결되지 않는다. 노트북의 DB 실행 기본값은 `False`다. 원본·staging 자료는 [행신 자료 설명](../backend/sql/staging/haengsin/README.md)에 남겼다.

## 실행 및 검증

Python 3.11 이상 환경에서 `ai-jobs/requirements.txt`를 설치한다. 노트북 실행은 `requirements-notebook.txt`, 행신 자료 검증은 `requirements-mysql.txt`를 추가로 설치한다. 기본 검증에는 DB·API 키가 필요하지 않다.

```powershell
cd ai-jobs
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_*.py'
.\.venv\Scripts\python.exe scripts/export_mock_review_summary.py
```

첫 명령은 현재 리뷰·행신 모의 테스트 16개를 실행한다. 둘째 명령은 수동 모의 조회 시연이 필요할 때만 실행하며 `backend/artifacts/`에 파일을 만든다. [모의 노트북](../ai-jobs/notebooks/mock_data_development.ipynb)은 Express 빌드·Node HTTP 테스트와 Python 리뷰 작업을 함께 검증한다. 저장 출력·실행 번호는 비워 두었다.

## 운영 연결 전에 필요한 것

실제 리뷰 변경 이벤트, 영속 revision·분석 저장소와 트랜잭션, 작업 큐·lease·재시도·감시, 제공자 타임아웃과 의미 품질 평가, Express의 현재 revision 조회가 필요하다. 리뷰 원문이나 키를 로그·작업 trace에 남기지 않는다. 현재 Dockerfile은 제거됐으며 Python 작업의 운영 배포 방식은 미확정이다.

## 분석 저장 계약

AnalysisInput은 cafe_id/revision/input_hash와 ID순의 표시 가능·미삭제·비어 있지 않은 리뷰다. 입력 해시는 선택된 리뷰 ID·원문을 정해진 형식으로 직렬화해 계산한다. 리뷰 변경 시 revision 증가와 현재 분석 무효화가 필요하다. MockAnalysisRepository는 이를 로컬 lock으로 모델링한다.

publish는 현재 snapshot과 일치할 때만 저장하며 오래된 작업은 false를 반환한다. analysis_id/generator_version/시간대가 있는 generated_at/opinions를 입력받고 cafe_id/revision/hash/schema_version/status/source_review_ids를 추가한다. 저장 계약 schema_version=1과 기존 발췌 JSON schema_version=2는 별개다. 의견은 원문 quote와 review_id/topic/sentiment를 검증하지만 분류 의미의 정확성을 증명하지 않는다. 메뉴 연결 필드가 없으므로 메뉴 평가로 추정하지 않는다. 수정·삭제·숨김 뒤 재분석이 실패해도 이전 인용은 제공하지 않는다.

운영 테이블 초안은 cafe_analysis_state(cafe_id, revision), cafe_analyses(analysis_id, cafe_id, revision, input_hash, schema_version, generator_version, generated_at, payload_json)다. 아직 DDL이 아니다. 모든 리뷰 쓰기와 revision/무효화는 한 트랜잭션으로 처리하고 publish 시 상태 행 잠금·버전 비교, Express 조회 시 현재 revision 일치와 복제 지연 정책을 검증해야 한다.

## Agent 행동과 제한

허용 행동은 analyze(opinions)/refresh이며 저장은 코드가 통제한다. 모델에 임의 SQL/외부 URL/저장 위치 권한을 주지 않는다. 리뷰의 지시는 데이터로 처리한다. 기본 3회 결정·10초 경과 검사이며 잘못된 근거를 수정하거나 입력 변경 후 재조회한다. 시간 검사는 호출 전후의 협력적 검사이므로 정지된 모델을 강제 취소하지 못한다. 실제 제공자 타임아웃·입력 총량/인용 길이·분산 lease·영속 작업 상태/실패 재시도·중복 방지가 남아 있다. 원문/개인정보는 필요 최소한만 사용하고 trace에는 행동·결과 코드만 남긴다.
