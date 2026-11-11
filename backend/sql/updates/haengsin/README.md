# 행신 데이터 갱신

초기 자료는 ../../seeds/haengsin.sql이다. 이후 변경은 001_설명.sql부터 추가하고 매장·메뉴·가격 ID와 옵션을 확인해 필요한 행만 수정한다. 출처·확인일·적용 결과를 기록한다. 이미 적용한 파일은 수정하지 않는다.

001_kakao_place_mapping.sql: 2026-11-11 카카오 키워드 검색으로 확인한 우지커피/빽다방 행신역점 장소 ID와 좌표.
로컬 DB에는 scripts/apply-haengsin-kakao.cjs로 기존 이름·주소·매핑을 확인한 뒤 적용했다.
이전 값은 artifacts/kakao-mapping-before-*.json에 보관했다. 가격·메뉴·검증 상태는 변경하지 않았다.
이미 적용된 DB에는 다시 실행할 필요가 없다. 원본 seed는 수정하지 않는다.
