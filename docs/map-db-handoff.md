# 지도 매장·메뉴 가격 로컬 연결 인계

## 준비된 범위

현재 통합 프런트 MapScreen의 useResource<Cafe[]>('/api/cafes')에 맞춘 GET API를 추가했다. 기존 /stores/nearby 타입과는 다른 계약이다. 지도·로그인·카카오 SDK 코드는 수정하지 않았다. SQL 적재·실제 DB·기기 연결은 담당자가 진행한다.

환경: NODE_ENV=development, MVP_CATALOG_MODE=mysql-seed, EXTRACTION_MODE=mock. DB_HOST/PORT/NAME/USER/PASSWORD를 설정하고 backend/sql/README.md 순서로 공식 schema와 행신 seed를 검토·적재한 뒤 Express를 실행한다. DB·프런트 주소는 각 PC에서 관리하며 키를 공유 문서에 넣지 않는다. production과 기본 mock 모드의 지도 조회는 503이다.

## API

GET /api/cafes?latitude=37.62&longitude=126.83&radius=1000&menu=아메리카노&size=Regular&temperature=ICE&sort=price

- 좌표는 실제 지도 중심을 사용한다. 예시 좌표가 매장 위치를 보장하지 않는다.
- radius: 미터, 1~5000. sort: price/distance. rating 정렬은 현재 미지원(422).
- 메뉴: 아메리카노/카페라떼, 아이스 접두어 허용(ICE 조건과 일치해야 함).
- size: 생략하면 전체 사이즈. 지도 첫 화면은 전체이며 응답 옵션으로 선택한다. 특정 값은 DB 원문과 정확히 일치해야 한다. 기본/Regular/Tall 등은 임의로 통합하지 않는다. 카드에 최저가를 만든 실제 메뉴·온도·사이즈를 표시한다.
- 원문 사이즈 선택지는 개발 DB 모드의 `GET /api/cafes/options`에서도 제공한다. 특정 사이즈로 조회한 뒤에도 다른 사이즈로 변경할 수 있도록 전체 선택지를 유지한다. HOT/ICE도 지도에서 직접 선택한다.
- 결과: 공통 success/data/message, data는 Cafe 배열. 문자열 id, name/address, latitude/longitude, distance(직선 미터), minPrice, verified=false, tags, menus 제공.
- menus.id는 price_id(가격 옵션 ID), cafeId는 cafe_id. menus는 요청 조건에 맞는 옵션만 포함한다. 전체 메뉴나 menu_id와 혼동하지 않는다.
- 가격은 DEMO 출처이며 브랜드 가격이 포함될 수 있다. checkedAt=null, isDemo=true, priceScope=STORE/BRAND를 제공한다. 카드에는 시연 가격·확인일 미확인과 브랜드 기준 가격을 표시한다. seed 입력일을 가격 확인일로 해석하지 않는다. 리뷰·영업시간·카카오 placeUrl은 만들지 않는다.
- 정상 빈 결과: 200 data=[]. 입력 오류:422. 연결/쿼리 오류:503. 1000개 옵션을 넘는 범위는 반경 축소 요청.

## 담당자 확인 순서

### 빽다방·우지커피 위치 보정 (2026-11-11)

카카오 키워드 검색 각 1회에서 지점명·도로명 주소(충경로 52)가 일치하는 결과를 확인했다.
우지커피 행신역점은 장소 ID 875716738, 빽다방 행신역점은 197327126으로 매핑했다.
기존 동일 건물 좌표를 카카오가 반환한 각 장소 좌표로 보정하고, 이전 값은 로컬 artifacts에 보관했다.
가격/메뉴는 변경하지 않았다. 갱신 SQL은 backend/sql/updates/haengsin/001_kakao_place_mapping.sql에 있다.
지도 API는 해당 카카오 placeUrl을 제공한다. 장소 좌표 보정은 가격 검증을 뜻하지 않는다.

화면에서는 각 매장의 실제 DB 좌표에 개별 가격 마커를 표시한다.
사용자 요청으로 '인근 N개 매장' 묶음과 별도 매장 선택창은 제거했다.
확인된 카카오 장소 ID와 보정 좌표는 유지하며, 마커를 누르면 해당 매장 카드를 선택한다.

1. PC에서 API 요청으로 좌표·매장명·옵션·가격을 먼저 확인.
2. 에뮬레이터의 서버 주소를 http://10.0.2.2:8080으로 확인. 기존 저장 주소가 있으면 우선 사용된다.
3. 지도를 행신으로 이동하고 반경·메뉴·사이즈·온도를 DB 값에 맞춘다. 에뮬레이터 기본 위치는 행신이 아닐 수 있다.
4. 해당 API의 Cafe 배열이 지도 마커/카드에 반영되는지 확인. 카카오 키는 해당 환경에서 설정.
5. 카카오 장소 ID와 내부 cafe_id는 별개다. 지도 가격 마커·카드는 DB 응답 중 현재 메뉴·온도·사이즈에 유효한 가격이 있는 매장만 표시한다. 카카오 검색은 장소 이동에 사용하며 가격 목록에 합치지 않는다. 동일 매장의 카카오 검색 결과와 DB 결과가 가격 등록/미등록으로 중복 노출되는 것을 방지한다.
6. 카페 상세 /api/cafes/:id, 전체 메뉴 /api/cafes/:id/menus, 주문·리뷰 API는 이번 작업 범위 밖이다. 지도 선택 시 해당 호출이 발생할 수 있으며 이들을 구현 완료로 보지 않는다.

검증: TypeScript 빌드 성공, 백엔드 모의 테스트 32개 통과. 실제 DB/지도 API/에뮬레이터는 미검증. 공유 브랜치는 codex/mvp-frontend-integration이다. 담당자는 git fetch origin 후 해당 브랜치에서 git pull --ff-only로 최신화한다. 작업 중인 변경이 있으면 먼저 보존한다.
