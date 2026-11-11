# 지도 매장·메뉴 가격 로컬 연결 인계

## 준비된 범위

현재 통합 프런트 MapScreen의 useResource<Cafe[]>('/api/cafes')에 맞춘 GET API를 추가했다. 기존 /stores/nearby 타입과는 다른 계약이다. 지도·로그인·카카오 SDK 코드는 수정하지 않았다. SQL 적재·실제 DB·기기 연결은 담당자가 진행한다.

환경: NODE_ENV=development, MVP_CATALOG_MODE=mysql-seed, EXTRACTION_MODE=mock. DB_HOST/PORT/NAME/USER/PASSWORD를 설정하고 backend/sql/README.md 순서로 공식 schema와 행신 seed를 검토·적재한 뒤 Express를 실행한다. DB·프런트 주소는 각 PC에서 관리하며 키를 공유 문서에 넣지 않는다. production과 기본 mock 모드의 지도 조회는 503이다.

## API

GET /api/cafes?latitude=37.62&longitude=126.83&radius=1000&menu=아메리카노&size=Regular&temperature=ICE&sort=price

- 좌표는 실제 지도 중심을 사용한다. 예시 좌표가 매장 위치를 보장하지 않는다.
- radius: 미터, 1~5000. sort: price/distance. rating 정렬은 현재 미지원(422).
- 메뉴: 아메리카노/카페라떼, 아이스 접두어 허용(ICE 조건과 일치해야 함).
- size: DB 원문과 정확히 일치. 기본/Regular/Large 등의 별칭을 임의 통합하지 않았다. 프런트 기본 Regular와 실제 적재값을 대조한다. 빈 결과면 옵션 일치를 먼저 확인한다.
- 결과: 공통 success/data/message, data는 Cafe 배열. 문자열 id, name/address, latitude/longitude, distance(직선 미터), minPrice, verified=false, tags, menus 제공.
- menus.id는 price_id(가격 옵션 ID), cafeId는 cafe_id. menus는 요청 조건에 맞는 옵션만 포함한다. 전체 메뉴나 menu_id와 혼동하지 않는다.
- 가격은 DEMO 출처이며 브랜드 가격이 포함될 수 있다. checkedAt은 제공하지 않는다. seed 입력일을 가격 확인일로 해석하지 않는다. 리뷰·영업시간·카카오 placeUrl은 만들지 않는다.
- 정상 빈 결과: 200 data=[]. 입력 오류:422. 연결/쿼리 오류:503. 1000개 옵션을 넘는 범위는 반경 축소 요청.

## 담당자 확인 순서

1. PC에서 API 요청으로 좌표·매장명·옵션·가격을 먼저 확인.
2. 에뮬레이터의 서버 주소를 http://10.0.2.2:8080으로 확인. 기존 저장 주소가 있으면 우선 사용된다.
3. 지도를 행신으로 이동하고 반경·메뉴·사이즈·온도를 DB 값에 맞춘다. 에뮬레이터 기본 위치는 행신이 아닐 수 있다.
4. 해당 API의 Cafe 배열이 지도 마커/카드에 반영되는지 확인. 카카오 키는 해당 환경에서 설정.
5. 카카오 장소 ID와 내부 cafe_id는 별개다. 이름 기반 병합은 동명이점 오매칭 가능성이 있으므로 프런트 mergeCafeSources와 명시적 ID 매핑을 확인한다.
6. 카페 상세 /api/cafes/:id, 전체 메뉴 /api/cafes/:id/menus, 주문·리뷰 API는 이번 작업 범위 밖이다. 지도 선택 시 해당 호출이 발생할 수 있으며 이들을 구현 완료로 보지 않는다.

검증: TypeScript 빌드 성공, 백엔드 모의 테스트 32개 통과. 실제 DB/지도 API/에뮬레이터는 미검증. 공유 브랜치는 codex/mvp-frontend-integration이다. 담당자는 git fetch origin 후 해당 브랜치에서 git pull --ff-only로 최신화한다. 작업 중인 변경이 있으면 먼저 보존한다.
