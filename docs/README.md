# 문서 안내

기준: 2026-11-11 `develop` (`2e9c1dd`). 이 폴더에는 현재 구현 안내와 과거 계획·검증 기록이 함께 있다. 제품 목표 초안인 `산학프로젝트/최신 문서/커피 주유소 · API 명세서`와 저장소의 현재 구현 안내인 `api.md`를 구분한다.

## 지금 필요한 문서

| 문서 | 용도 |
| --- | --- |
| [추천 MVP 구현 기준](recommendation-mvp-implementation.md) | 추천 탭 DB 연동의 우선순위·지원 데이터·미결정 계약 |
| [실시간 추천](ai-recommendation.md) | 현재 Express 경로와 미연결·운영 차단 상태. 날짜별 테스트 개수는 현재 수치가 아님 |
| [로컬 MVP 실행](mvp-local-run.md) | mock·행신 DEMO DB 검색의 로컬 실행과 검증 |
| [API 안내](api.md) | 현재 구현 API의 출발점. 제품 전체 API 명세는 아님 |
| [배포 안내](deployment.md) | 현재 배포 구성과 운영 활성화 전 조건 |

## 후속 작업 때 필요한 문서

| 문서 | 용도 |
| --- | --- |
| [Python 리뷰 분석](ai-review-analysis.md) | 조용함·콘센트·산미·고소함·단맛 등 리뷰 근거 수집 단계에서 사용. 현재 추천 MVP의 선행 조건은 아님 |
| [AI 개발 계획](ai-development-plan.md) | 인증·공유 호출 제한·분석 저장 등 장기 과제. 파일 구조 정리와 테스트 기록은 과거 상태 |

## 기록으로만 보존할 문서

| 문서 | 보존 이유와 주의 |
| --- | --- |
| [중간발표 MVP 계획](midterm-ai-mvp-plan.md) | 단계별 프롬프트·평가 기록. 과거의 미연결 상태와 테스트 개수는 현재 상태가 아님 |
| [중간발표 추천 계약](midterm-recommendation-contract.md) | 개발용 `/mvp` 계약·fixture. 제품 추천 탭의 최종 계약은 아님 |
| [프런트 통합 테스트](frontend-integration-test.md) | 당시 화면·로컬 연동 검증. 현재 기기 검증으로 간주하지 않음 |
| [지도 DB 인계](map-db-handoff.md) | 행신 지도 연결 인계와 당시 브랜치 상태 |
| [지도 DB 로컬 검증](map-db-local-verification.md) | 당시 PC DB/API 검증. 기기 화면 검증과 구분 |

추천 MVP 작업은 `recommendation-mvp-implementation.md`와 최신 문서의 F06/API 명세로 시작하고, 실제 `backend/src`·`frontend/src`로 현재 구현을 확인한다. 과거 계획과 인계 문서의 날짜별 서술을 현재 코드 상태로 옮겨 쓰지 않는다. 이 분류는 삭제 목록이 아니며 검증 근거와 계약 변경 과정을 보존한다.
