# DB 적용

일반 개발 실행은 루트 또는 backend의 `npm run dev`가 자동 준비한다.
새 DB의 schema·인증·리뷰 테이블과 행신 초기 데이터를 순서대로 적용하며
기존 DB 변경 전에는 Git 제외 .local/db-backups에 백업을 남긴다.
자세한 실행·옵션·운영과의 구분은 ../../docs/development-startup.md를 참고한다.

- schema.sql: 신규 DB 공통 테이블.
- seeds/haengsin.sql: 매장·메뉴·가격 초기 자료. 기존 가격은 보존한다.
- seeds/haengsin_reviews.sql: 각 매장별 생성 리뷰 5개. 구매 인증으로 표시하지 않는다.
- migrations/005_unified_auth.sql + scripts/migrate-auth.cjs: 회원·작성자 관계 통합.
- migrations/006_community_schema.sql: users를 참조하는 커뮤니티 테이블.
- scripts/prepare-development-db.cjs: 개발용 적용 순서·이력·백업·잠금·시드 관리.

초기 seed의 버전 변경은 없는 조합만 추가한다. 기존 판매 가격 수정은 별도 update/migration으로 작성한다.
운영 DB에는 자동 준비와 DEMO 시드를 사용하지 않고 승인된 배포 migration을 적용한다.
004_service_auth는 이전 구조의 기록이다. 새 설치에는 별도로 적용하지 않는다.

일반 개발 명령에서 SQL을 매번 SOURCE할 필요는 없다.
기존 DB의 수동 확인/복구를 위해 `backend`의 `npm run db:community`도 같은 개발 준비 실행기를 사용한다.
이 명령 역시 production/원격 DB에는 자동 적용하지 않는다.
