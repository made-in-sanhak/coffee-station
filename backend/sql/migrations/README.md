# 스키마 변경 이력

기존 DB의 구조 변경을 001_설명.sql부터 추가한다. 이미 적용한 파일은 수정하지 않는다. 대상 DB·선행 조건·실행 순서·백업·검증 방법을 기록한다.

`001_recommendation_quota.sql`은 추천 호출 제한을 위한 InnoDB 테이블 두 개를 추가한다. 현재 검증 대상은 로컬 테스트 DB다. 운영 적용 전에는 대상 DB 백업과 JWT 연동, 오래된 이력의 정리 정책을 확정한다.

로컬 MySQL 8.4에서 독립 연결 두 개로 검증하려면 아래 명령을 실행한다. MySQL 초기화가 끝나면 `backend` 폴더에서 테스트를 실행한다. 테스트가 빈 DB에 스키마를 적용한다.

```powershell
docker run -d --rm --name coffee-quota-test -p 127.0.0.1:33313:3306 -e MYSQL_DATABASE=coffee_quota_test -e MYSQL_USER=quota_test -e MYSQL_PASSWORD=quota-test-local -e MYSQL_RANDOM_ROOT_PASSWORD=yes mysql:8.4
$env:QUOTA_TEST_PORT = '33313'
npm test
Remove-Item Env:QUOTA_TEST_PORT
docker stop coffee-quota-test
```
