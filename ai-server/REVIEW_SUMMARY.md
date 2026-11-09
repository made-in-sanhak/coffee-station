# 리뷰 저장형 요약 준비

원본 ERD reviews는 review_id/user_id/cafe_id/rating/content/status/deleted_at 등을 가진다.
menu_id와 updated_at은 없다. 따라서 현재는 매장 리뷰만 대상으로 하며 메뉴별 평가를 추정하지 않는다.
향후 메뉴 평가는 별도 메뉴 평가 테이블과 연결 ID를 설계한다. 리뷰 수정 추적용 updated_at도 검토한다.
원본 SQL/실제 DB는 이번에 변경하지 않았다.

app/review_summary.py는 별도 SQLite 파일을 사용하는 로컬 저장 실습이다.
원문 중 최대 3개를 발췌하는 MockReviewSummarizer이며 LLM 종합 요약이나 감성 분석이 아니다.
SummaryService.refresh에 해당 매장의 현재 전체 리뷰 스냅샷을 전달한다.
VISIBLE, 삭제되지 않음, 텍스트 있음 조건으로 선별한다. 내용/ID/생성기 버전 해시가 같으면 재사용한다.
변경되면 이전 저장값을 지운 뒤 갱신한다. 삭제/숨김 리뷰는 새 결과의 근거에서 제외한다.
저장 항목: 매장 ID, 대상 리뷰 수/ID, 발췌와 근거 ID, UTC 생성 시각, 생성기 버전.
작성자 ID는 요약 입력에 필요하지 않다. 리뷰 내용 자체의 개인정보 처리는 실제 연동 전 추가한다.

이 구현은 단일 실행 로컬 테스트용이다. 동시 갱신/대량 리뷰/스케줄 작업/운영 DB 연결은 아직 없다.
삭제 반영은 refresh 시점에 일어나므로 실제 서비스에서는 변경 이벤트로 무효화해야 한다.
노트북 10절은 임시 파일을 자동 삭제하며 API 키/Docker를 사용하지 않는다.

다음 단계: 실제 리뷰 조회 계층 → Gemini 구조화 요약과 근거 검증 → 변경 이벤트 갱신.
요약에는 상반된 의견을 보존하고, 리뷰를 검증된 매장 사실로 단정하지 않는다.
추천용 특징은 표시용 요약과 분리해 근거 리뷰 ID와 긍정/부정 언급을 저장한다.
현재 발췌를 추천 점수로 사용하지 않는다.

## 구조화 모의 요약 v2

모의 생성기는 전체 대상 리뷰에서 리뷰당 발췌 1개(최대 160자)를 반환한다.
opinions는 review_id/quote/topic/sentiment, topics는 주제별 긍정·부정·중립 근거 ID를 포함한다.
mixed_opinions는 서로 다른 의견 존재 여부이며 사실 모순이나 매장 품질 판정이 아니다.
represented_review_count와 review_count로 발췌 대상 수와 전체 대상 수를 구분한다.
기존 excerpts 필드는 호환을 위해 유지한다. 생성기 버전 변경으로 이전 캐시를 갱신한다.

검증: 엄격한 타입/허용 주제/허용 감성/불필요한 필드 금지/근거 ID/원문 인용/중복 근거.
고정 모의 문장만 noise/seating으로 분류하며 나머지는 other/neutral이다.
인용 일치 검증은 주제·감성의 의미적 정확성을 보장하지 않는다. 추후 실제 모델 평가는 별도로 필요하다.
현재 자유 서술형 주장을 저장하지 않으며 리뷰를 검증된 사실처럼 종합하지 않는다.
모의 노트북 전체 실행과 자동 테스트 68개 통과. 실제 데이터/Gemini 호출 없음.

## 모의 리뷰 조회 API

Express: GET /api/cafes/990001/review-summary
Python 내부: GET /cafes/990001/review-summary (X-Internal-Token 필요).
990001은 모의 리뷰 3개와 숨김 1개, 990002는 리뷰 없는 가상 매장이다.
그 외 ID는 404. 반환 필드: data_mode=mock, llm_calls=0, cache_hit, status, summary.
status는 READY 또는 NO_REVIEWS. Express는 기존 success/data/message 형식으로 감싼다.
AGENT_REPOSITORY 설정과 무관하게 이 엔드포인트는 모의 리뷰만 사용한다.
실제 리뷰 조회 및 LLM 요약은 연결하지 않았다.

서버 저장소는 ai-server/.cache/mock_review_summaries.sqlite이며 Git에서 제외한다.
반복 조회는 원문 스냅샷 해시를 확인해 저장 결과를 재사용한다. 생성 시각도 유지한다.
이미 캐시가 있으면 첫 요청부터 cache_hit=true일 수 있다.
프로세스 내부 잠금으로 동시 갱신을 직렬화한다. 다중 프로세스 운영은 아직 지원하지 않는다.
모의 데이터 노트북의 HTTP 테스트는 별도 임시 파일을 사용하고 자동 삭제한다.
Python 자동 테스트 69개 및 Express 모의 전달 테스트 통과. 실제 DB/API 호출 없음.
