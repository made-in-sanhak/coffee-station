# 공식 DB와 지역 자료

행신은 첫 서비스 지역이며 테이블은 공통 스키마로 관리한다.

- schema.sql: 신규 DB용 공통 테이블.
- seeds/haengsin.sql: 행신 초기 매장·메뉴·가격.
- migrations/: 기존 DB 구조 변경 SQL.
- updates/haengsin/: 이후 행신 가격·매장 갱신 SQL.
- staging/haengsin/: 이전 원본·검토용 적재 자료. 별도 검증 DB용이다.

신규 DB는 대상 DB를 선택하고 schema.sql → seeds/haengsin.sql 순으로 적용한다. 이번 정리에서는 DB 실행이나 Docker 자동 초기화 연결을 하지 않았다.

기존 DB에는 schema/seed를 통째로 재실행하지 않는다. 구조 변경은 migrations, 데이터 변경은 updates에 001_설명.sql부터 순서대로 추가한다. 이미 적용한 파일은 수정하지 않는다. 각 변경에 대상 DB, 선행 조건, 적용 순서, 출처, 검증 결과를 기록한다. 자동 실행기·적용 이력 테이블은 아직 없다.

MySQL DDL은 트랜잭션 롤백이 보장되지 않는다. 백업·대상 DB·기존 구조를 확인하고 오류 무시 옵션을 사용하지 않는다. 초기 seed는 최대 ID 기반 배정이므로 동시 실행하지 않는다. 기존 가격 변경은 별도 갱신 SQL을 작성한다.

현재 seed의 verified_at은 입력일이며 실제 가격 확인일과 다르다는 주석이 있다. 추천 연결 전 출처·입력일·가격 확인일의 의미를 구분해야 한다.

공통 연결 풀은 src/config/db.ts를 유지한다. 실제 DB와 MVP 메뉴·온도·사이즈 매핑은 아직 미연결이다. 모의 개발 기본값과 운영 차단은 유지한다.

## Express에서 제공 SQL 조회

`MVP_CATALOG_MODE=mock`이 기본값이다. `mysql-seed`는 제공 seed의 DEMO 출처 행을 조회하는 개발 전용 모드이며 검증된 운영 가격 모드가 아니다. 메뉴 표준명은 아메리카노/카페라떼, 온도는 option_name의 HOT/ICE, 사이즈는 원문 그대로 매핑한다. 입력일을 확인일로 노출하지 않아 응답 verified_at은 null이다. 브랜드 가격 포함 가능성은 notice로 표시한다.

Docker/MySQL을 시작하고 사용할 DB를 확인한 뒤, MySQL 클라이언트에서 해당 DB를 선택하고 아래 파일을 순서대로 SOURCE한다. 기존 테이블이 있는 DB는 먼저 스키마 차이와 ID 충돌을 검토한다. 자동 적재는 하지 않는다.

```sql
USE coffee_station;
SOURCE C:/Users/kjryj/projects/coffee-station/backend/sql/schema.sql;
SOURCE C:/Users/kjryj/projects/coffee-station/backend/sql/seeds/haengsin.sql;
```

SOURCE는 실행하는 PC의 실제 경로로 바꾼다. 컨테이너 안 mysql에서는 컨테이너에 복사한 파일 경로를 사용한다. DB_PASSWORD 등 접속값은 각 PC 환경에 설정하고 공유하지 않는다.

backend 터미널:

```powershell
$env:NODE_ENV='development'
$env:EXTRACTION_MODE='mock'
$env:MVP_CATALOG_MODE='mysql-seed'
npm run dev
```

루트 .env의 DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD를 공통 연결 풀이 사용한다. 모의 자연어 추출을 사용하므로 Gemini 호출은 없다. production 503 차단은 유지한다.

```powershell
$body = @{constraints=@{menu_code='AMERICANO';temperature='ICE';max_price_krw=4000;sort_by='price';limit=10}} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/recommendations/mvp/search -ContentType 'application/json' -Body $body
```

응답 data_mode=database와 실제 ID를 확인한다. 결과 없음은 QUESTION, 연결/쿼리 오류는 503이다. 기존 카테고리 API는 계속 mock이며 DB 연결 대상은 /mvp/search와 /mvp/confirm이다. /mvp/prepare는 조건 추출만 한다. 개발 화면의 사이즈 전체(null)는 원문 사이즈 모두를 허용한다. 지도·상세 ID 연결은 아직 하지 않는다.

검증: TypeScript 빌드·30개 모의 테스트 통과. Docker 엔진 미실행으로 실제 SQL 적재/조회는 미검증이다. DB 모드에서 seed 이외의 OWNER/RECEIPT 등 자료를 조회하는 운영 정책은 후속 작업이다.
