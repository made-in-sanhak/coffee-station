# TypeScript SQL Repository — 5단계 준비

## 구현 범위

MenuRepository.search와 recommend를 Promise 기반으로 전환하고 confirm/직접 추천 라우터에서 await한다. HTTP JSON 형식은 유지하며 trace에 data_mode를 추가했다. 기본 실행은 MockMenuRepository 그대로다.

MySQLMenuRepository는 select(sql, parameters) 실행기를 주입받는다. 서버에서 실제 연결 풀이나 환경변수를 가져오지 않으므로 모듈 생성 자체로 DB에 접속하지 않는다. SQL 계약은 기존 Python ERD 매핑(cafes/menus/menu_prices)을 참고했으며 실제 DB 스키마 대조 검증은 남아 있다.

- 선별 매장 1~100개와 가격/분류/LIMIT을 바인딩한다. 가격 상한 포함, 가격·price_id 오름차순으로 동률을 고정한다.
- STORE/ON_SALE, 비DEMO, 검증일 존재, 0 이상 가격만 조회한다. 카탈로그 전체를 메모리에 적재하지 않는다.
- BIGINT 식별자는 SQL에서 문자열로 변환한다. menu_id/size/option_name/출처/검증일을 보존한다. 임의 온도·좌표를 생성하지 않는다.
- SQL 실패/손상 행은 503, 정상 빈 조회는 QUESTION으로 구분한다. 실제 Repository에는 모의 추천 문구를 사용하지 않는다.
- 검증일 존재가 최신 가격을 보장하지는 않는다. 검증일 신선도 기준은 팀 합의 후 추가해야 한다.

## 검증

빌드 및 관련 테스트 총 15개 통과. 신규 2개는 주입 실행기로 SQL 필터/바인딩/정렬/제한, 옵션·ID·출처 보존, 실제 데이터 문구, 빈 결과/쿼리 오류/손상 데이터 구분을 확인했다. 실제 MySQL 실행 계획·타입·인덱스·성능을 검증한 결과는 아니다.

## 실제 연결 전 남은 작업

1. 최신 ERD의 필드·타입·판매 상태·인덱스 확인. 정확한 메뉴 검색은 category와 별도 계약으로 추가해야 한다(COFFEE를 아메리카노로 간주하지 않음).
2. DB명/선별 매장/모의·실제 선택과 연결 제한을 중앙 설정에서 검증하는 팩토리 구성. 실제 모드 자동 전환 금지.
3. 연결 풀의 execute 반환 rows를 SelectRows로 연결하고 읽기 전용 DB 권한·쿼리 시간 제한·연결 종료 정책 검증. 풀은 앱 수명 동안 재사용하고 종료 시 end한다.
4. RDS CA·TLS 인증서 검증 설정을 구성해 실제 격리 DB에서 검증. 인증서 검증 비활성화로 우회하지 않음.
5. 실제 격리 DB fixture로 가격 경계/NULL/SOLD_OUT/DEMO/검증일 누락·동률/LIMIT 검사. 주입 테스트의 SQL 문자열 검사는 DB 동작 검증을 대체하지 않는다.
6. 행신 import_haengsin_*는 원본 비교용 staging이다. 현재 판매 테이블로 자동 적재하지 않는다. 매장 ID·좌표·판매/검증 정보 확보 후 별도 승인된 매핑 절차 적용.

현재 HTTP 경로는 모의 Repository만 사용한다. 실제 연결, 데이터 변경, TLS 테스트는 수행하지 않았다. 운영 차단은 유지한다. 5단계 전체 완료가 아닌 비동기·SQL 조회 준비 완료 상태다.
