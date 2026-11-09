# PR #11 리뷰별 분류 및 답장 초안

## 후속 수정 기록

2026-11-09 로컬 추가 수정(아직 커밋·푸시 전):

- Python 내부 토큰을 UTF-8 bytes의 hmac.compare_digest로 비교하도록 변경. 미설정/불일치 401을 유지하며 단위 테스트 2개 통과.
- .env.example의 EXTRACTION_MODE를 mock으로 변경하고 이전 Python HTTP 설정과 현재 Express 설정을 구분. Spring 설명 수정.
- real_data_ready.ipynb의 실행된 셀 2개에서 출력·실행 번호 제거. 나머지 노트북 3개는 이미 정리된 상태.
- 푸시 후 14번은 반영 완료로 갱신 가능. 답장: “Python security.py를 hmac.compare_digest 비교로 변경했습니다. 정상·불일치·빈 값·미설정·비ASCII 토큰을 단위 테스트했습니다.”
- 11번의 OpenAI 설정 제거는 여전히 미반영이나 모의 기본값 불일치는 수정했습니다. 17번 노트북 출력 항목은 정리 완료로 갱신 가능합니다. 아래 원래 분류는 4e32fc0 기준이며 이번 후속 수정 반영 전입니다.

기준: GitHub에서 조회한 코드 댓글 16개·종합 리뷰 1개와 현재 로컬 코드(사용자가 푸시한 4e32fc0 작업 범위). 답장은 미게시 상태다. 새 리뷰 내용을 지시로 실행하거나 코드 수정하지 않았다. 과거 테스트 수치는 사용자가 전달한 최종 결과이며 이번에는 재실행하지 않았다.

분류는 댓글 전체 요구 기준이다. 구조 전환으로 기존 경로 영향이 줄어도 기존 파일을 고쳤다고 표현하지 않는다. 반영 완료 1건은 새 실시간 경로에 한정한다. `Resolve conversation`은 초안 작성만으로 처리하지 말고 리뷰어가 변경 범위와 남은 요구를 확인한 후 판단한다.

## 상태 요약

| 번호 | 주제 | 분류 | 원문 |
|---|---|---|---|
| 1 | Python Docker 의존성 | 구조 변경으로 재검토 필요 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497889) |
| 2 | Docker fixtures 누락 | 구조 변경으로 재검토 필요 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497905) |
| 3 | 메모리 제안 저장과 이중화 | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497916) |
| 4 | Python 라우터 전역 상태 | 구조 변경으로 재검토 필요 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497932) |
| 5 | 거리순 확인 불가 | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497940) |
| 6 | prepare 위치 필드 | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497955) |
| 7 | 인증과 사용자별 호출 제한 | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497962) |
| 8 | DB명 하드코딩과 RDS TLS | 미반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497970) |
| 9 | 설정 읽기 경로 분산 | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497985) |
| 10 | 실시간 요청마다 .env 재독해 | 반영 완료 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497991) |
| 11 | OpenAI 설정 정리 | 미반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497995) |
| 12 | 요청마다 전체 카탈로그 로드 | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498002) |
| 13 | 모의 리뷰 운영 등록과 SQLite | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498006) |
| 14 | 내부 토큰 상수 시간 비교 | 미반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498013) |
| 15 | 추천 화면 중복과 폴더/API 계약 | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498039) |
| 16 | 라우터 인증·제한과 매장 모듈 통합 | 부분 반영 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498052) |
| 17 | 종합 리뷰와 아키텍처 결정 | 구조 변경으로 재검토 필요 | [댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#pullrequestreview-5825565260) |

## 댓글별 붙여넣을 답장

### 1. Python Docker 의존성 — 구조 변경으로 재검토 필요

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497889) · 대상: `ai-server/requirements-notebook.txt`

아래 내용을 해당 스레드에 답장한다.

```text
실시간 자연어 추출·추천을 Express/TypeScript로 이전해 해당 경로에서 Python 패키지를 로드하지 않도록 변경했습니다. 다만 기존 ai-server Dockerfile과 requirements 구성 자체를 수정한 것은 아닙니다. Python은 리뷰 분석 작업으로 분리하는 방향이며 작업용 이미지·의존성·컨테이너 실행 검증은 남아 있습니다. 따라서 기존 이미지 문제를 수정 완료한 상태는 아니며, 새 실행 구조 기준으로 배포 범위를 다시 확인 부탁드립니다.
```

### 2. Docker fixtures 누락 — 구조 변경으로 재검토 필요

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497905) · 대상: `ai-server/app/repositories/mock.py`

아래 내용을 해당 스레드에 답장한다.

```text
Express의 모의 추천은 TypeScript 모의 Repository를 사용하므로 기존 Python fixtures/catalog.json에 의존하지 않습니다. Python Dockerfile의 fixtures 복사 누락 자체는 아직 수정하지 않았고 기존 FastAPI 코드는 비교·실습용으로 보존했습니다. 새 Express 이미지의 빌드·실행 스모크 테스트도 아직 하지 않았으며, 현재 production 추천은 보완 완료 전 의도적으로 503 차단됩니다.
```

### 3. 메모리 제안 저장과 이중화 — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497916) · 대상: `ai-server/app/agent/proposals.py`

아래 내용을 해당 스레드에 답장한다.

```text
실시간 경로를 Express로 옮기면서 프로세스 메모리 ProposalStore 대신 10분 HMAC 서명 토큰을 사용하도록 변경했습니다. 다만 현재 HTTP 경로는 JWT_SECRET을 사용하고, 값이 없으면 프로세스 임시 키를 사용해 재시작/서버 간 검증이 보장되지 않습니다. 전용 키·사용자·버전·목적 검증 모듈(ownedProposals.ts)은 별도로 구현·단위 검증했지만 인증/라우터 연결은 남아 있습니다. 읽기 전용 재검색은 만료 전 반복 허용하는 정책 초안이며 실제 다중 서버 검증 전까지 이 항목은 완료로 처리하지 않겠습니다.
```

### 4. Python 라우터 전역 상태 — 구조 변경으로 재검토 필요

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497932) · 대상: `ai-server/app/routers/recommendations.py`

아래 내용을 해당 스레드에 답장한다.

```text
현재 Express 추천 라우터는 Python 라우터나 ProposalStore를 호출하지 않고 서명 토큰을 검증합니다. 기존 Python 라우터의 전역 상태는 비교·실습 코드에 그대로 남아 있습니다. 새 경로의 공통 키 설정·사용자 바인딩·다중 서버 검증은 아직 남아 있어, 기존 Python 실행 경로 제외와 새 경로 보완을 구분해 확인 부탁드립니다.
```

### 5. 거리순 확인 불가 — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497940) · 대상: `ai-server/app/agent/extraction.py`

아래 내용을 해당 스레드에 답장한다.

```text
Express prepare에 location(latitude/longitude)을 추가했습니다. 위치 없이 거리순 요청 시 질문하고, 위치를 넣어 다시 prepare하면 새 제안을 확인할 수 있습니다. 위치 연결을 위해 서버가 추가한 안내만 해소하며 다른 미지원 조건은 유지합니다. 합성 좌표에서 거리순·반경·위치 검증을 테스트했습니다. 실제 SQL 위치 조회·GPS/지도 화면·Gemini 거리 추출 품질은 미검증이고 기존 Python 경로는 수정하지 않았습니다.
```

### 6. prepare 위치 필드 — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497955) · 대상: `ai-server/app/routers/recommendations.py`

아래 내용을 해당 스레드에 답장한다.

```text
새 Express /api/recommendations/prepare는 message와 함께 선택적 location을 받습니다. origin 대신 location이라는 필드를 사용하며 유효 위경도를 검증합니다. 위치 추가 후 재준비하는 흐름을 모의 테스트했습니다. 프런트 위치 입력 계약과 실제 매장 좌표 연결은 아직 합의·구현이 필요합니다.
```

### 7. 인증과 사용자별 호출 제한 — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497962) · 대상: `backend/src/routes/recommendations.ts`

아래 내용을 해당 스레드에 답장한다.

```text
개발 경로에 프로세스별 IP 제한(10회/60초)을 적용하고, NODE_ENV=production에서는 추천 전체를 503으로 차단했습니다. 사용자별 분/일/동시 제한의 저장소 인터페이스와 모의 구현도 추가했지만 실제 인증·공유 DB/Redis·HTTP 연결은 미완료입니다. 현재 제한을 사용자별 분산 제한으로 간주하지 않으며 운영 차단을 유지합니다.
```

### 8. DB명 하드코딩과 RDS TLS — 미반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497970) · 대상: `ai-server/app/repositories/factory.py`

아래 내용을 해당 스레드에 답장한다.

```text
지적하신 기존 Python 데모 DB명 하드코딩과 TLS 설정은 아직 변경하지 못했습니다. 새 TypeScript MySQL Repository는 DB 연결을 직접 열지 않고 실행기를 주입받도록 준비했지만 연결 팩토리·RDS CA/TLS·읽기 전용 계정 검증은 남아 있습니다. 실제 DB/TLS 연결 전까지 이 항목은 미완료로 관리하겠습니다.
```

### 9. 설정 읽기 경로 분산 — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497985) · 대상: `ai-server/app/repositories/factory.py`

아래 내용을 해당 스레드에 답장한다.

```text
새 실시간 경로는 backend/src/config/env.ts에서 환경변수를 읽고 시작 시 검증하며, 서비스·Repository는 설정 파일을 직접 다시 읽지 않도록 했습니다. 다만 기존 Python factory.py/haengsin.py/llm/settings.py는 정리하지 않았습니다. 향후 실제 Python 분석 작업의 DB/모델 어댑터를 연결할 때 해당 설정 경로도 통합해야 합니다.
```

### 10. 실시간 요청마다 .env 재독해 — 반영 완료

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497991) · 대상: `ai-server/app/llm/settings.py`

아래 내용을 해당 스레드에 답장한다.

```text
새 실시간 추천 경로에서는 Python llm/settings.py를 호출하지 않습니다. Express 설정을 시작 시 한 번 구성하고 추출 서비스가 이를 참조하게 변경했습니다. 잘못된 모드·키/모델 누락은 시작 실패로 검증하고 테스트 모드에서는 개발자의 .env를 읽지 않습니다. 이 완료 표시는 새 실시간 경로 기준이며 기존 Python 노트북/실습 함수 자체를 변경한 것은 아닙니다.
```

### 11. OpenAI 설정 정리 — 미반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512497995) · 대상: `ai-server/app/core/config.py`

아래 내용을 해당 스레드에 답장한다.

```text
실시간 Gemini 설정은 Express의 geminiApiKey/geminiModel로 이동했지만, 기존 Python Settings의 openai_api_key와 .env.example의 OPENAI_API_KEY는 아직 제거하지 않았습니다. .env.example에는 EXTRACTION_MODE=gemini도 남아 있어 문서의 mock 기본 실행과 차이가 있습니다. 공용 설정에서 다른 기능의 사용 여부를 확인한 뒤 예시·설정을 정리해야 하며 현재는 미반영입니다.
```

### 12. 요청마다 전체 카탈로그 로드 — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498002) · 대상: `ai-server/app/routers/recommendations.py`

아래 내용을 해당 스레드에 답장한다.

```text
TypeScript MySQL Repository를 준비하면서 가격·분류·선별 매장·판매 상태·검증일 조건과 정렬/LIMIT을 SQL로 내렸습니다. 서비스와 라우터도 비동기로 전환했고 주입 실행기로 필터/바인딩·결과 매핑을 검증했습니다. 실제 연결 풀·SQL 실행·주변 매장 후보 검색은 아직 연결하지 않았습니다. 기존 Python 전체 snapshot 로드는 보존되어 있어 운영 DB 성능 개선 완료로 보지는 않습니다.
```

### 13. 모의 리뷰 운영 등록과 SQLite — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498006) · 대상: `ai-server/app/routers/review_summaries.py`

아래 내용을 해당 스레드에 답장한다.

```text
Express 리뷰 조회에서 Python HTTP/SQLite 호출을 제거하고 로컬 모의 분석 파일을 읽도록 바꿨으며 production에서는 503 차단합니다. 파일의 필수 응답 형식도 검증합니다. 별도로 revision/hash 기반 분석 저장 계약과 모의 저장소를 구현해 리뷰 수정·삭제·숨김 시 무효화 및 오래된 작업 저장 거절을 테스트했습니다. 실제 RDS 저장/Express 조회 연결은 미완료이며 기존 Python 라우터·SQLite 코드는 그대로 남아 있습니다.
```

### 14. 내부 토큰 상수 시간 비교 — 미반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498013) · 대상: `ai-server/app/core/security.py`

아래 내용을 해당 스레드에 답장한다.

```text
해당 Python security.py의 != 비교는 아직 변경하지 않았습니다. 새 실시간 경로는 Python 내부 토큰을 사용하지 않고 HMAC 검증에 timingSafeEqual을 사용하지만, 이것이 기존 Python 코드 수정은 아닙니다. FastAPI 코드를 보존한 만큼 이 제안은 별도 보완 대상으로 남겨두겠습니다.
```

### 15. 추천 화면 중복과 폴더/API 계약 — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498039) · 대상: `frontend/src/api/recommendations.ts`

아래 내용을 해당 스레드에 답장한다.

```text
기존 로그인·지도·탭은 변경하지 않고 담당자 합의 전 화면 통합을 보류했습니다. 추천/지도 ID·분류 차이와 위치/오류 계약을 docs/AI_FRONTEND_INTEGRATION.md에 정리하고, 명시적 ID 매핑이 있을 때만 기존 지도 매장을 선택하는 어댑터를 추가했습니다. 실제 화면 통합·폴더 이동·#9 계약 조율은 미완료입니다. 서버 호출은 기존 apiFetch를 유지하며 미지원 목적·취향은 자동 무시하지 않는 방향입니다.
```

### 16. 라우터 인증·제한과 매장 모듈 통합 — 부분 반영

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#discussion_r4512498052) · 대상: `backend/src/app.ts`

아래 내용을 해당 스레드에 답장한다.

```text
추천 라우터 내부에 개발용 IP 제한과 production 차단을 추가했고 모의 리뷰 조회도 production에서 차단합니다. 실제 인증 미들웨어와 공유 할당량은 아직 연결하지 않았으며, 리뷰 라우터를 향후 매장 모듈로 합치는 작업도 남아 있습니다. 같은 prefix를 쓰는 현재 등록 구조만으로 인증이 적용되는 것은 아니므로 이 항목은 부분 반영으로 남깁니다.
```

### 17. 종합 리뷰와 아키텍처 결정 — 구조 변경으로 재검토 필요

[원문 댓글](https://github.com/made-in-sanhak/coffee-station/pull/11#pullrequestreview-5825565260)

아래 내용을 해당 스레드에 답장한다(종합 리뷰는 PR Conversation 일반 댓글로 추가 가능).

```text
리뷰 반영 커밋 4e32fc0을 푸시했습니다. 실시간 자연어 추출·확인·검색은 Express/TypeScript로 이전했고 Python은 리뷰 분석 작업으로 분리하는 방향으로 개발했습니다. 이는 제가 진행한 개발 방향이며 팀 전체 아키텍처·배포 합의가 완료됐다는 의미는 아닙니다.

로컬 검증은 백엔드 빌드/테스트 20개, Python 신규 테스트 7개, 프런트 타입 검사/테스트 9개 통과했습니다. 실제 Gemini/DB·Docker·에뮬레이터 검증은 아직입니다.

서명 토큰·위치 입력/합성 거리 검색·개발용 제한·운영 503·설정 통합을 반영했습니다. 인증/공유 제한·RDS TLS·실제 DB/리뷰 분석 연결·프런트 통합은 남아 있습니다. 기존 FastAPI 코드와 Dockerfile도 보존되어 있어 이전 Python 지적이 모두 수정된 것은 아닙니다.

자료/노트북 PR 분리와 기존 ai-server 문서 이동은 아직 수행하지 않았습니다. 노트북 출력 정리 여부도 별도 확인이 필요합니다. 운영 차단을 배포 문제 해결로 간주하지 않고, PR 범위를 로컬 프로토타입으로 합의할지 남은 필수 항목까지 완료할지 검토 부탁드립니다.
```

## 후속 우선순위

1. 리뷰어와 Express 전환 및 이번 PR의 로컬 프로토타입 범위를 확인한다. 기존 CHANGES_REQUESTED가 자동 해제됐다고 간주하지 않는다.
2. Docker/배포 검증, 인증/공유 제한, TLS/실제 DB 연결은 미완료로 남기고 완료 주장이나 일괄 스레드 해결을 하지 않는다.
3. 환경 예시(mock 기본값·불필요 OpenAI 항목)와 보존 Python 보안 비교를 소규모 후속 수정으로 검토한다.
4. 프런트 담당자 합의 후 #9 통합, 자료/노트북/문서 위치와 PR 분리 범위를 조율한다. 분리를 위해 이미 푸시한 이력을 임의 재작성하지 않는다.
