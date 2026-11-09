# 확정 조건 직접 추천

RECOMMENDATION_MODE=direct가 기본값이다. 서버 재시작 후 적용된다.
prepare는 실제 Gemini로 조건을 추출한다. confirm 및 /recommendations는
확정 조건으로 Repository를 검색하고 Python으로 결과를 반환한다. 이 단계의 llm_calls는 0이다.
기존 API 응답 형식은 유지한다. 자연어 원문은 직접 추천 단계에서 해석하지 않는다.
입력 문장보다 확정 constraints가 우선한다. 필터 UI 수정 요청은 LLM 없이 처리할 수 있다.
빈 결과는 고정 QUESTION 문구를 반환하며 조건을 자동 완화하지 않는다.

RECOMMENDATION_MODE=agent로 설정하면 기존 수업용 Agent Loop를 사용한다.
직접 추천은 Agent Loop 실행이 아니다. 목적·취향·리뷰 가중치는 아직 구현하지 않았다.
llm_calls는 추천 단계만의 횟수이므로 prepare 호출까지 합한 전체 횟수와 구분한다.
현재 소량 카탈로그 검색 상한 100개를 그대로 사용한다. 대량 데이터/페이지 검색은 후속 작업이다.

검증: 자동 테스트 61개 통과, API 키 조회 및 모델 생성이 호출되지 않음을 검증.
이번 실제 데모 DB HTTP 테스트는 Docker 엔진 미실행으로 미완료.
노트북 8절에서는 Docker 없이 임시 메뉴 6개로 직접 추천을 확인할 수 있다.
기존 노트북 앞부분의 Agent 실습은 계속 실제 Gemini를 호출하므로 8절과 구분한다.

다음 작업: 모의 모델 서버 모드 → 리뷰 데이터 구조/저장형 요약 → 취향·리뷰 추천 점수 평가.

## 모의 추출 서버 모드

EXTRACTION_MODE=mock + RECOMMENDATION_MODE=direct + AGENT_REPOSITORY=mock 설정으로
준비/확인/추천을 API 키와 Docker 없이 실행한다. 서버 재시작이 필요하다.
기본 추출 모드는 gemini이며 외부 장애 시 mock으로 자동 전환하지 않는다.
모의 추출은 app/llm/mock_extraction.py의 고정 문장 3개만 지원한다.
미등록 문장은 NEEDS_CLARIFICATION으로 반환하며 실제 해석을 흉내 내지 않는다.
준비 응답에 extraction_mode와 llm_calls를 추가했다. 추천 단계와 호출 수는 따로 집계한다.
노트북 9절에 설정/테스트 절차를 추가했다. 7절에서도 추출 모드를 표시한다.
기본 MockRepository는 기존 JSON 카탈로그이므로 MySQL 데모와 메뉴 ID가 다르다.
자동 테스트 62개 통과. 모의 모드에서 키 조회·Gemini 생성 없이 준비→확인→추천 검증 완료.
이번에는 실제 Gemini/DB 호출을 하지 않았다. 오류 응답 시나리오는 기존 모의 HTTP 테스트로 검증한다.
