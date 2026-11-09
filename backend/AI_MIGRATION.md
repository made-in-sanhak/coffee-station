# Express 실시간 AI / Python 분석 작업 전환

단계별 작업 조건·검증 기준·재사용 프롬프트: [AI_MIGRATION_WORKBOOK.md](../docs/AI_MIGRATION_WORKBOOK.md).
현재/목표 API와 팀 확인 목록: [AI_API_CONTRACT.md](../docs/AI_API_CONTRACT.md) (초안, 팀 합의 전).

## 현재 완료 (로컬 모의 검증)

2단계(2026-11-09): `src/recommendations/`로 조건 계약(contracts), 추출(extraction), 서명(proposals), 모의 데이터 접근(repository)을 분리했다. `services/recommendations.ts`는 준비·추천 흐름을 조합하며 기존 라우터의 import와 응답/토큰 형식을 유지한다.

설정은 `config/env.ts`에서 시작 시 검증한다. 잘못된 NODE_ENV/EXTRACTION_MODE/포트, Gemini 모드의 키·모델 누락은 시작 실패다(기존에는 일부 요청 시 실패). NODE_ENV=test에서는 .env를 읽지 않는다. DB 선택/TLS 설정은 SQL Repository를 구현하는 5단계에서 추가하며 현재 실제 SQL 추천 경로는 없다.

모의 리뷰 조회도 production에서 503으로 차단한다. 로컬 파일 위치는 MOCK_REVIEW_SUMMARY_FILE로 지정 가능하며 기본 위치는 기존 backend/artifacts/mock-review-summary.json이다.

- /api/recommendations/prepare, /confirm, / 요청은 Express TypeScript에서 직접 처리한다.
- Gemini 추출 REST 호출 코드는 Express로 이전했으나 이번 실제 API 호출은 하지 않았다.
- EXTRACTION_MODE=mock으로 고정 예시 문장을 테스트한다. 추천은 임시 메뉴 6개 가격순이다.
- 확인 토큰은 HMAC 서명과 10분 만료로 검증한다. JWT_SECRET이 같으면 서버 간 검증 가능하다.
  개발 환경에서 키가 없으면 프로세스 임시 키를 쓰므로 재시작 시 무효화된다.
- 무상태 토큰이므로 1회 사용 보장은 없다. 반복 확인은 현재 LLM 호출 없이 검색만 수행한다.
  사용자별 소유권, 공유 저장소/사용자별 호출 제한은 미완료다.
- 현재 거리순을 지원하는 것처럼 처리하지 않고 미해결/입력 거절한다.
- 로컬 IP별 분당 10회 제한은 개발 보호용이다. 운영에서는 전체 추천 경로를 503으로 차단한다.
  NODE_ENV=production 설정이 필요하다. 인증·공유 제한 구현 전 운영 활성화하지 않는다.

Python 리뷰 작업은 scripts/export_mock_review_summary.py로 실행한다.
근거 검증된 모의 분석 결과를 backend/artifacts에 원자적으로 기록한다.
Express 리뷰 API는 이 저장 파일을 읽으며 Python HTTP 서버에 요청하지 않는다.
실제 운영에서는 분석 결과 DB 저장과 변경 이벤트/실패 재처리로 확장해야 한다.
이 작업은 아직 실제 LLM 리뷰 분석 Agent가 아니며 기존 모의 발췌를 재사용한다.

## 로컬 실행 (저장소 루트)

수동 리뷰 조회를 시연할 때만 첫 Python 내보내기를 실행한다. 자동 테스트에는 필요 없다.

```powershell
ai-server/.venv/Scripts/python.exe ai-server/scripts/export_mock_review_summary.py
cd backend
$env:EXTRACTION_MODE='mock'
npm run build
node --test tests/recommendations.cjs
npm run dev
```

FastAPI/INTERNAL_API_TOKEN/AI_SERVER_URL은 이 실시간 경로에 필요 없다.
기존 Python FastAPI는 비교·수업 실습 자료로 보존했으며 앱 연결에는 사용하지 않는다.
기존 문서의 FastAPI 실행 안내는 이전 구조에 해당한다.
Express 라우터를 바꾸면서 Python 프록시 검증 테스트를 직접 실행 검증으로 교체했다.
자동 테스트는 임시 분석 파일을 직접 준비·삭제하므로 Python 내보내기가 필요 없다. `npm run build` 후 `node --test tests/recommendations.cjs`만 실행해도 된다. 수동 리뷰 조회 시연에는 위 Python 내보내기를 실행한다.

2단계 검증: 빌드 성공, Node 테스트 2개 통과(설정 오류, HTTP 모의 흐름). HTTP 검증은 가격 4000/3999/2999 경계, 변조/미해결 거절, 리뷰 파일 누락/정상 조회, production의 prepare/confirm/직접 검색/모의 리뷰 503을 포함한다. 테스트는 외부 fetch와 DB 메서드 호출을 차단한다. 최초 샌드박스 실행은 로컬 소켓 EACCES로 실패했으며 로컬 연결 허용 후 통과했다. 실제 Gemini·DB는 호출하지 않았다.

## 아직 남은 이전

### 보완 A~C 완료 기록

- `src/config/aiPolicy.ts`: 제안 TTL 600초, 제공자 요청 제한 30초, 로컬 IP 제한 10회/60초·최대 1,000키를 한곳에 정의한다. TTL 응답과 실제 서명 만료는 같은 값을 사용한다. 기존 기본값은 유지한다.
- Gemini 설정 누락/잘못된 모드·포트는 시작 오류이며 HTTP 요청 오류가 아니다. 리뷰 파일 손상은 503, 모델 출력 검증 실패는 502로 처리한다.
- 운영 차단은 반드시 `NODE_ENV=production`을 지정해야 적용된다. 누락 시 development이며 HOST 기본값은 0.0.0.0이다. 운영 배포는 production 명시와 이미지 수준 차단 검증 전까지 활성화하지 않는다.
- 검증: 빌드 및 테스트 9개 통과. TTL 일치, 잘못된 설정의 격리 프로세스 시작 실패, production 프로세스의 경로 차단 포함. Docker/ALB 및 실제 Gemini/DB는 이번에 검증하지 않았다.
- 자동 검증 명령(backend 디렉터리): `npm run build` 후 `node --test tests/catalog.cjs tests/extraction.cjs tests/policy.cjs tests/production.cjs tests/recommendations.cjs`.
- 모의 노트북의 Express 테스트 셀은 내보내기 선행을 제거했다. 노트북 전체 실행 검증은 별도다.

1. 프런트 담당자와 #9 요청·응답 및 screens/recommend 구조 통합.
2. 공유 상태/확인 소유권/인증·사용자별 할당량 연결 후 운영 차단 해제.
3. MySQL 검색을 TypeScript Repository로 이전: 현재 실시간 경로는 모의 메뉴만 사용한다.
4. 위치 입력 계약과 거리순을 구현하고 예산/위치 등 누락 조건 검증.
5. Python 리뷰 Agent → 운영 DB 분석 저장 → Express 조회.
6. 실제 Gemini 추출 평가, Docker/제안서/배포 가이드 갱신.

실제 데이터/Gemini/프런트 화면/Git 작업은 이번에 수행하지 않았다.
