# 발표 추천 입력·데이터 계약 초안 (A단계)

## 현재 MVP API 연결 상태

실제 로컬 HTTP 검증: 2026-11-10 Gemini 1회로 prepare HTTP 200/AWAITING_CONFIRMATION→명시적 confirm HTTP 200/RESULT 통과. 아메리카노 ICE·4000원 이하 조건에서 모의 옵션 demo-1(3000), demo-3(4000)을 반환했다. 전체 2126ms, confirm LLM 0회. 실제 DB·프런트는 미연결이며 운영 차단은 유지한다. 서버 종료 완료.

최신 상태(설정 기반 HTTP 연결 완료): `/mvp/prepare`는 중앙 설정 EXTRACTION_MODE=mock/gemini에 따라 공급자를 선택한다. 기본값은 mock이며 gemini는 GEMINI_API_KEY/GEMINI_MODEL이 필요하고 시작 시 검증한다. search/confirm은 선택 모드와 무관하게 LLM 0회·모의 Repository를 사용한다. 기존 추천 API와 추출 모드 설정을 공유하므로 gemini 선택 시 기존 prepare에도 영향을 준다. 프런트는 아직 연결하지 않았다.

검증: 빌드 및 전체 백엔드 28개 테스트 통과. HTTP 테스트는 외부 fetch를 모의 응답으로 치환해 prepare 1회/confirm·search 0회, 429/503 실패의 비재시도·비성공 대체를 확인했다. 이 단계의 실제 외부 호출은 0회다. NODE_ENV=production의 MVP 차단도 유지했다. 아래 평가/준비 기록에서 HTTP가 mock에 고정돼 있다는 설명은 과거 상태다.

로컬 실제 통합 검증은 사용자 승인 후 EXTRACTION_MODE=gemini를 명시해 시작하고, prepare→명시적 조건 확인→confirm의 임시 서버 흐름을 실행한다. 키는 환경에서 읽고 출력하지 않는다. API 성공과 실제 DB 연결 성공을 혼동하지 않는다. 서버 실행·브라우저 테스트를 권하는 것만으로 추가 호출이 승인된 것은 아니다. 이 문서 갱신에서는 서버를 실제 모델로 실행하지 않았다.

2026-11-10 재평가: 동일 Gemini 모델·수정 프롬프트로 대표 5건을 실제 호출해 조건 필드/미해결 판정 5/5 통과. 지연 866~2863ms. HTTP 공급자는 여전히 mock이며 평가 결과만으로 실모델 연결/실DB 조회 완료를 뜻하지 않는다. 상세 기록은 [MVP 계획](midterm-ai-mvp-plan.md)을 따른다.

Gemini 준비 진행: midtermGemini.ts에 키/모델을 명시적으로 받는 추출 어댑터를 추가했다. 30초 제한·JSON 응답·출력 토큰 제한, STOP 종료 검사, 무재시도, 429/연결·출력 실패 처리 후 prepareMidterm 공통 검증을 거친다. 주입 응답 테스트는 요청 1회·정상 추천·잘못된 근거/차단·출력 잘림/제공자 오류를 확인했다. 빌드와 관련 테스트 5개 통과(신규 어댑터 2개 포함). 실제 네트워크 호출은 0회다.

HTTP /mvp/prepare는 여전히 mock 공급자만 쓴다. EXTRACTION_MODE를 변경하는 것만으로 이 새 경로가 실제 Gemini를 호출하지 않는다. 실제 호출은 모델 ID와 최대 요청 수를 사용자에게 확인한 뒤, 검증된 설정·공급자 선택을 연결하는 별도 작업이다. prepareMidterm의 mode/llm_calls는 공급자 메타데이터이며 주입 테스트에서 gemini로 표시한 값은 실제 API 사용 증거가 아니다. DB는 계속 모의 자료다.

기존 `/api/recommendations/prepare`, `/confirm`, `/`는 유지한다. 아래 별도 개발 경로는 새 조건 DTO를 받으며 기존 로컬 IP 제한을 공유하고 production에서는 503이다. 프런트 합의 전까지 기존 화면을 이 경로로 자동 변경하지 않는다.

| 경로 | 요청 | 처리 |
|---|---|---|
| POST /api/recommendations/mvp/search | `{constraints:{...}}` | 칩의 확정 구조화 조건으로 모의 검색 |
| POST /api/recommendations/mvp/prepare | `{message:"4천 원 이하 아이스 아메리카노 추천해줘."}` | 미확정 조건·근거·unresolved·proposal_id·suggested_constraints 반환 |
| POST /api/recommendations/mvp/confirm | `{proposal_id,confirmed:true,constraints:{...}}` | 제안 검증 후 최종 조건 검색 |

공통 envelope는 기존 success/data/message다. confirm은 menu_code/temperature/size/max_price_krw/sort_by/limit 전체를 요구해 필드 누락으로 조건이 사라지는 것을 막는다. 명시적 변경은 사용자가 최종 조건을 확인하는 계약이며 원래 값과 같아야 하는 것은 아니다. 미해결 제안은 수정 조건으로 우회할 수 없다.

기본 공급자는 두 등록 문장만 지원하는 mock이다(아이스 아메리카노 4천 원 이하, 따뜻한 카페라떼 5천 원 미만). 실제 Gemini/DB는 아직 연결하지 않았다. 추출 공급자를 주입할 수 있으며 잘못된 출력/원문 근거는 502다. 다른 문장은 NEEDS_CLARIFICATION 후 칩 입력 전환을 안내한다. 실제 모델 호출을 했다는 뜻은 아니며 llm_calls=0이다.

MVP 토큰은 목적이 분리된 개발용 프로세스 임시 키·600초 만료다. 사용자 인증/다중 서버/재시작 유지용이 아니며 재시작 시 재준비해야 한다. 기존 토큰과 혼용하지 않고 토큰·원문은 로그에 기록하지 않는다. 공유 키/소유권/실제 제한은 운영 연결 전 과제다.

검증: TypeScript 빌드 및 전체 백엔드 테스트 25개 통과. 신규 HTTP에서 칩/모의 자연어 결과 일치·확인 누락·변조·조건 누락·미해결 거절, 주입 제공자 출력 오류를 검사했다. 실제 API/DB/Git·프런트 작업은 없음. 아래 A/B 준비 기록보다 이 연결 상태가 우선한다.

기준: 2026-11-10. 기존 HTTP API를 바꾸지 않은 목표 계약이다. 프런트 최신 브랜치·DB 파일은 아직 반영하지 않았다.

B단계 준비 구현: `backend/src/modules/recommendations/midterm.ts`에 공통 조건 검증, 비동기 MidtermRepository, 모의 옵션 6개와 recommendMidterm을 추가했다. 정확한 메뉴/온도/사이즈/예산 필터→가격/offer ID 정렬→limit→템플릿 이유/태그를 실행한다. category/목적 등 미지원 필드는 422로 거절한다. 자료 오류·조회 실패는 503, 정상 빈 결과는 QUESTION이다. 모의 자료는 출처 MVP_FIXTURE·is_mock=true·검증일 null을 유지한다.

이 모듈은 아직 HTTP 라우터에 연결하지 않았다. DB 스키마·실행기/팩토리와 프런트 계약 확인 전 기존 HTTP 요청 형식은 유지한다. 신규 테스트 3개 및 TypeScript 빌드 통과. 실제 DB/LLM·Git 작업 없음. 대표 문장 fixture는 추출 결과를 주입한 검색 테스트이며 실제 자연어 해석을 실행한 결과가 아니다.

## 공통 조건

| 필드 | 권장값 | 처리 |
|---|---|---|
| menu_code | AMERICANO / CAFE_LATTE / null | 정확한 메뉴. 기존 category와 별개 |
| temperature | ICE / HOT / null | DB에 구분이 있어야 필터 가능 |
| size | 문자열 / null | DB의 원본 옵션명. 임의 통일 금지 |
| max_price_krw | 0 이상 정수 / null | 상한 포함, 미만 표현은 1원 차감 |
| sort_by | price | 기본값임을 표시. 거리순은 좌표·SQL 준비 후 확장 |
| limit | 1~20 | 발표용 기본 10개, 기존 API 최대값과 다른 목표값 |

칩과 자연어는 같은 확정 조건으로 검색한다. 자연어에는 추출 근거·unresolved를 추가한다. 화면 기본 ICE/AMERICANO를 사용자 발화의 추출 근거로 만들지 않는다. 메뉴 미지정은 null로 제안하고 화면에서 선택/전체 여부를 명시적으로 확인한다. 단맛·디카페인·목적·복수 메뉴·위치 등 미지원 조건은 질문/미지원으로 유지한다.

기존 API는 category를 사용하며 정확한 menu_code·temperature·size 필드를 아직 받지 않는다. 이 초안을 기존 API에 그대로 보내면 안 된다. B단계에서 호환/버전 및 검증을 적용한 뒤 연결한다. COFFEE를 AMERICANO로 바꾸는 어댑터는 금지한다.

## 담당자 DB 파일 수신 시 확인 목록

1. CREATE TABLE·FK·PK·컬럼 타입·문자셋 및 DB 버전. 파일만 정적으로 읽고 실행은 별도 범위 확인.
2. 매장 cafe_id, 표준 menu_id, 매장별 판매 옵션 offer/price ID의 관계.
3. 메뉴명/표준 코드 대응, HOT/ICE·size·추가 옵션이 분리되는지 확인.
4. 가격 단위/자료형/NULL, 매장·배달 등 가격 범위, 판매 상태·출처·검증일.
5. 좌표 유무/단위, 합성 자료·실제 자료·미확인 상태 표시.
6. 제공 파일은 앱 코드와 분리해 보존하고 매핑표를 먼저 작성. 스키마나 데이터를 추천에 맞추려고 가짜 값으로 채우지 않음.

파일 수신 전에는 fixture와 주입 실행기로 검증한다. 파일 수신 후 select 실행기를 연결하고 읽기 전용 풀·바인딩·쿼리 시간 제한을 적용한다. DB명이 코드에 고정되지 않도록 설정한다. 최신 스키마 확인 전 운영용 SQL과 자동 초기화 스크립트를 추가하지 않는다.

## 출력과 프런트 통합

후보는 cafe_id/menu_id/offer_id·가격·옵션·출처·검증 상태를 보존한다. 이유와 태그는 서버가 확인한 예산·메뉴 일치 사실만 사용한다. 없는 리뷰 특징/평점/현재 판매/최신성을 생성하지 않는다.

프런트 브랜치 통합 전에는 기존 화면·탭·지도와 API를 바꾸지 않는다. 브랜치 수신 후 기존 DTO와 이 초안을 비교해 하나로 합의한다. ID 타입과 Kakao ID를 구분하고 미지원 칩을 조용히 버리지 않는다. 외부 API·Git은 사용자 확인 후 실행한다.

## 대표 기대값 fixture

[대표 입력·정답](../backend/tests/fixtures/midterm-inputs.json)은 모의 제공자/계약 테스트를 위한 자료다. 아직 실제 모델 평가나 API 지원 결과가 아니다. B단계에서 검증기/Repository 테스트에 연결한다.
