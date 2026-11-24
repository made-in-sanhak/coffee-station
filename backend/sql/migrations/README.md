# 스키마 변경 이력

기존 DB의 구조 변경을 001_설명.sql부터 추가한다. 이미 적용한 파일은 수정하지 않는다. 대상 DB·선행 조건·실행 순서·백업·검증 방법을 기록한다.

| 순서 | 파일 | 내용 |
| --- | --- | --- |
| 001 | `001_recommendation_quota.sql` | 추천 호출 제한 테이블 두 개 (아래 설명) |
| 002 | `002_auth_users.sql` | 회원(`users`)·refresh 토큰(`refresh_tokens`) 테이블. 카카오 로그인 후 서비스 JWT 발급에 필요하다. 새 테이블만 만들며 기존 데이터는 바꾸지 않는다. 001과 서로 의존하지 않는다. |

## 001 추천 호출 제한

`001_recommendation_quota.sql`은 추천 호출 제한을 위한 InnoDB 테이블 두 개를 추가한다. 현재 검증 대상은 로컬 테스트 DB다. 운영 적용 전에는 대상 DB 백업과 JWT 연동, 오래된 이력의 정리 정책을 확정한다.

일일 한도는 한국 시간(Asia/Seoul, UTC+9) 자정에 초기화한다. 분당 한도와 활성 호출 슬롯은 자정에도 유지한다. GitHub Actions의 `Backend tests`는 MySQL 8.4 서비스와 `QUOTA_TEST_PORT`를 설정해 통합 테스트를 실행한다.

현재 `MysqlQuotaStore`는 테스트에만 연결되어 있다. 앱의 JWT 인증·추천 라우터 연결과 회원 BIGINT ID에 맞춘 호출 제한 `user_id` 변환·마이그레이션은 #29에서 다룬다. 그 전까지 문자열 ID를 받는 저장소 계약과 `VARBINARY(800)` 스키마를 유지한다.

비활성 사용자까지 포함한 이력 보존·배치 정리는 #46에서 다룬다. 운영 적용 전에 완료해야 한다.

로컬 MySQL 8.4에서 독립 연결 두 개로 검증하려면 아래 명령을 실행한다. MySQL 초기화가 끝나면 `backend` 폴더에서 테스트를 실행한다. 테스트가 빈 DB에 스키마를 적용한다.

```powershell
docker run -d --rm --name coffee-quota-test -p 127.0.0.1:33313:3306 -e MYSQL_DATABASE=coffee_quota_test -e MYSQL_USER=quota_test -e MYSQL_PASSWORD=quota-test-local -e MYSQL_RANDOM_ROOT_PASSWORD=yes mysql:8.4
$env:QUOTA_TEST_PORT = '33313'
npm test
Remove-Item Env:QUOTA_TEST_PORT
docker stop coffee-quota-test
```
