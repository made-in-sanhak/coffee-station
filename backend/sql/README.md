# SQL 파일 관리

- `haengsin/`: 제공된 행신 가격 자료의 원본과 적재 준비 파일.
- 이 폴더는 Docker 자동 초기화에 연결하지 않았다. 파일 배치만으로 DB는 변경되지 않는다.
- 실제 자료는 사용자 요청 전까지 Agent/추천 테스트에 사용하지 않는다.

기존 ERD 전체 스키마를 설치하는 001_schema.sql은 아직 이 폴더에 추가하지 않았다.
haengsin의 staging 테이블은 검토용이며 기존 cafes/menus/menu_prices를 대체하지 않는다.
