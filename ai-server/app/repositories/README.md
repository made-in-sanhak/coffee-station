# ERD 기반 MySQL / 선별 데이터 연결

제공된 `coffee-station.sql`의 cafes, menus, menu_prices를 조회합니다.
기존 ai_catalog_* 임시 테이블 방식은 사용하지 않습니다. 원본 SQL은 수정하지 않았습니다.

## 현재 검증 상태 (2026-11-09)

- Docker coffee-mysql에 별도 coffee_station_agent_demo DB 생성.
- 가상 매장 1개, 메뉴 6개, 가격 6개 등록.
- 4000원 이하 COFFEE 검색: 992004(3000원), 992001(3500원), 992005(4000원).
- demo_cleanup.sql 실행 후 매장/메뉴/가격 0건 확인, 테스트를 위해 seed 재등록.
- 기존 Docker 앱 계정에 데모 DB SELECT만 추가하고 Python Repository 실제 조회 통과.
- 실제 Gemini → search_menus → MySQL → Gemini 왕복 통과: 모델 호출 2회, 위 3개 ID 일치.
- SQL DATE는 도구 응답에서 ISO 문자열로 변환합니다. 자동 테스트 45개 통과.
- 실제 업무 DB에는 테이블·데이터를 생성하거나 삭제하지 않았습니다.

## 사용

ai-server 디렉터리의 .venv 커널/Python에서:

```python
from app.repositories.factory import create_repository
from app.repositories.base import SearchFilters
repo = create_repository('mysql-demo', cafe_ids=(990001,))
items = repo.search_menus(SearchFilters(max_price_krw=4000, category='COFFEE', sort_by='price'))
for item in items:
    print(item.offer.name, item.offer.price_krw)
```

실제 데이터가 준비되면 `create_repository('mysql', cafe_ids=(실제_매장_ID,))`로 변경합니다.
이 모드는 .env의 DB_NAME을 사용하며 source=DEMO 가격을 제외합니다.
`mysql-demo`는 DB_NAME과 무관하게 coffee_station_agent_demo만 읽고 결과를 is_mock=True로 표시합니다.
Mock JSON은 `create_repository('mock')`로 계속 사용할 수 있습니다.
Agent는 동일하게 `run_turn(model, repo, message, constraints=...)`를 사용합니다.

위 코드로 repo를 만든 뒤 실제 Agent까지 확인하려면 아래를 실행합니다(실제 API 할당량 사용).

```python
from pathlib import Path
from app.agent.loop import run_turn
from app.llm.gemini import GeminiModel
from app.llm.settings import read_gemini_settings

key, model_id = read_gemini_settings(Path.cwd())
model = GeminiModel(api_key=key, model=model_id)
try:
    result = run_turn(model, repo, '4000원 이하 COFFEE 메뉴를 모두 찾아줘.',
        constraints=SearchFilters(max_price_krw=4000, category='COFFEE', sort_by='price'))
    print(result.status, result.message)
    print([(m.offer.name, m.offer.price_krw) for m in result.recommendations])
    print(result.trace)
finally:
    model.close()
```

DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD는 환경변수 > ai-server/.env > 루트 .env 순서입니다.
PC의 Python에서는 DB_HOST=127.0.0.1, DB_PORT=3306을 사용합니다.
MySQL 드라이버 설치: `uv pip install --python .venv/Scripts/python.exe -r requirements-mysql.txt`
키·비밀번호는 코드나 노트북에 적지 않습니다.

## 샘플 적용 및 삭제

sql/demo_schema.sql은 원본 ERD의 관련 5개 테이블 컬럼과 PK를 추출한 데모 전용 DDL입니다.
원본 전체 ERD/모든 관계를 설치하는 마이그레이션은 아닙니다.
새 환경에서 관리 계정으로 demo_schema.sql → demo_seed.sql 순서로 실행합니다.
이미 테이블이 있으면 schema 재실행은 오류로 중단됩니다. 데이터는 덮어쓰지 않습니다.
실행 계정에는 별도로 데모 DB SELECT 권한이 필요합니다.

샘플을 없애려면 sql/demo_cleanup.sql만 실행합니다. 예를 들어 저장소 루트에서:

```powershell
docker cp ai-server/sql/demo_cleanup.sql coffee-mysql:/tmp/demo_cleanup.sql
docker exec -it coffee-mysql mysql -uroot -p
```

컨테이너 DB 관리자 암호로 접속한 다음 `source /tmp/demo_cleanup.sql;`을 실행합니다.
삭제 파일은 데모 DB의 고정 샘플 ID와 표식을 확인합니다. DROP/TRUNCATE와 업무 DB 삭제는 없습니다.
새로 추가한 데모 자료까지 전부 삭제하는 스크립트는 아닙니다.
다시 테스트하려면 demo_seed.sql을 같은 방법으로 적용합니다.

## 매핑과 제한

- price_id → 판매 옵션 ID, menu_id → 메뉴 ID, standard_name → 메뉴명, price → 정수 원.
- option_name은 원문 보존. 전용 온도·단맛 컬럼이 없어 temperature/sweetness=None.
- LATTE와 COFFEE는 원본 카테고리 그대로 구분합니다. 라떼는 COFFEE 검색에 포함되지 않습니다.
- STORE 가격만 조회하고 ON_SALE만 판매 가능으로 처리합니다. 브랜드 가격 대체는 아직 없습니다.
- 현재 목적 태그 매핑은 보류했습니다. 조용함/콘센트 리뷰 태그를 임의로 STUDY로 바꾸지 않습니다.
- 조회 출처는 테이블/행 ID를 근거로 표시합니다. DB에 있다는 이유로 검증일을 생성하지 않습니다.
- 선택 매장 ID는 1~100개, 조회 결과는 1000개 초과 시 오류로 처리합니다.
- 소량 선별 데이터 스냅샷이므로 데이터 추가/수정 후 repo를 새로 생성해야 합니다.
- 최종 DB 변경 시 factory.py의 SELECT/매핑을 수정하면 되며 Agent Loop는 유지합니다.
- 원본 SQL은 가격 등의 컬럼이 NOT NULL입니다. 미확인 값을 0으로 채우지 말고 검증된 데이터부터 적재하세요.
