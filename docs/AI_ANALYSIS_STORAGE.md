# 리뷰 분석 저장 계약 — 7단계 모의 구현

Python `app/repositories/analyses.py`에 입력 snapshot/revision/hash, 분석 저장·조회 인터페이스와 MockAnalysisRepository를 구현했다. 실제 DB 연결/DDL 적용은 없다.

## 입력·저장·조회

- 매장별 리뷰 변경 시 revision을 증가시키고 저장된 분석을 즉시 무효화한다. VISIBLE에 대응하는 visible=true, deleted=false, 비어 있지 않은 리뷰만 ID순 snapshot으로 만든다.
- 분석 입력은 cafe_id/revision/input_hash와 리뷰 원문이다. 해시는 선택한 리뷰 ID·내용을 정해진 순서로 직렬화해 계산한다.
- 산출물: analysis_id, generator_version, generated_at(시간대 필수), opinions. 저장소가 cafe_id/revision/input_hash/schema_version/status/source_review_ids를 추가한다. schema_version=1은 새 저장 계약 버전이며 기존 발췌 JSON의 schema_version=2와 별개다.
- 저장 직전 현재 snapshot과 일치하는지 원자적으로 확인한다. 오래된 작업은 false를 반환하며 기존 유효 결과를 덮어쓰지 않는다.
- 각 의견은 review_id/quote/topic/sentiment를 가지며 허용 분류와 정확한 원문 인용을 검증한다. 의미 분류의 정확성을 증명하는 검증은 아니다. 메뉴 연결이 없으므로 메뉴 선호 특징으로 사용하지 않는다.
- 현재 조회는 유효한 저장 결과 또는 None이다. 삭제/숨김/수정 뒤 분석에 실패해도 이전 인용은 노출하지 않는다. 입력/출력은 복사해 외부 변경으로 저장 상태가 바뀌지 않게 한다.

## 향후 DB 및 Express 계약

테이블 초안은 cafe_analysis_state(cafe_id PK, revision), cafe_analyses(analysis_id PK, cafe_id, revision, input_hash, schema_version, generator_version, generated_at, payload_json)다. 실제 ERD 합의 후 migration을 작성한다. 모든 리뷰 쓰기와 revision 증가/분석 무효화는 같은 트랜잭션이어야 한다.

Python 저장 시 상태 행 잠금 및 revision/hash 비교 후 publish, Express 조회 시 현재 revision과 일치하는 분석만 SELECT한다. 복제 지연이 있는 DB에서 오래된 결과를 읽지 않도록 조회 일관성 정책도 필요하다. 원문·위치·개인정보를 분석 JSON에 불필요하게 복제하지 않는다.

표시용 opinions에서 noise/seating 등의 추천 특징을 집계할 수 있지만 현재 저장소는 요약문 생성/점수 산출을 하지 않는다. 표현된 의견 수·상반 의견·표본 수를 보존하는 특징 계약은 8~9단계에서 확장한다.

## 검증과 미완료

ai-server 디렉터리에서 `.venv/Scripts/python.exe -m unittest discover -s tests -p test_analysis_repository.py` 실행: 3개 통과. 저장·조회·외부 변경 격리, 수정/삭제/숨김 무효화, 오래된 작업 거절, 잘못된 인용 거절, 빈 리뷰를 검사했다. 최초 루트 실행은 app import 경로 오류였으며 올바른 작업 디렉터리에서 재실행했다.

아직 기존 Python export 작업/Express 조회 라우터에는 연결하지 않았다. Express는 기존 모의 파일 조회를 유지한다. RLock은 모의 트랜잭션 모델이며 여러 서버의 DB 동시성 검증이 아니다. 작업 실패 상태·중복 작업 점유·실제 DB·Express 조회 계층은 후속 구현이며 7단계 전체 통합 완료로 표시하지 않는다.
