-- 카페 조회용 MySQL 스키마. coffee_station DB를 선택한 뒤 실행합니다.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS brands (
	`brand_id`	BIGINT	NOT NULL	COMMENT '브랜드ID',
	`name`	VARCHAR(50)	NOT NULL	COMMENT '브랜드명',
	`logo_key`	VARCHAR(255)	NULL	COMMENT '로고경로',
  PRIMARY KEY (brand_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cafes (
	`cafe_id`	BIGINT	NOT NULL	COMMENT '매장ID',
	`brand_id`	BIGINT	NULL	COMMENT '브랜드ID(개인카페는 NULL)',
	`owner_id`	BIGINT	NULL	COMMENT '연결점주ID',
	`kakao_place_id`	VARCHAR(30)	NULL	COMMENT '카카오장소ID',
	`name`	VARCHAR(100)	NOT NULL	COMMENT '매장명',
	`address`	VARCHAR(255)	NOT NULL	COMMENT '주소',
	`phone`	VARCHAR(20)	NULL	COMMENT '전화번호',
	`latitude`	DECIMAL(10, 7)	NOT NULL	COMMENT '위도',
	`longitude`	DECIMAL(10, 7)	NOT NULL	COMMENT '경도',
	`has_drive_thru`	TINYINT(1)	NOT NULL	DEFAULT 0	COMMENT '드라이브스루여부',
	`rating_avg`	DECIMAL(2, 1)	NOT NULL	DEFAULT 0.0	COMMENT '평균평점',
	`review_count`	INT	NOT NULL	DEFAULT 0	COMMENT '리뷰수',
	`info_verified_at`	DATE	NULL	COMMENT '정보확인일',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '등록일시',
	`updated_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (cafe_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menus (
	`menu_id`	BIGINT	NOT NULL	COMMENT '메뉴ID',
	`brand_id`	BIGINT	NULL	COMMENT '브랜드ID(공통메뉴는 NULL)',
	`standard_name`	VARCHAR(100)	NOT NULL	COMMENT '표준메뉴명',
	`category`	VARCHAR(20)	NOT NULL	COMMENT '분류(COFFEE/LATTE/TEA/ETC)',
	`caffeine_regular_mg`	INT	NULL	COMMENT 'Regular카페인(mg)',
	`caffeine_large_mg`	INT	NULL	COMMENT 'Large카페인(mg)',
	`is_decaf`	TINYINT(1)	NOT NULL	DEFAULT 0	COMMENT '디카페인여부',
	`has_milk`	TINYINT(1)	NOT NULL	DEFAULT 0	COMMENT '우유포함여부',
	`caffeine_source`	VARCHAR(255)	NULL	COMMENT '카페인자료출처',
  PRIMARY KEY (menu_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_prices (
	`price_id`	BIGINT	NOT NULL	COMMENT '메뉴가격ID',
	`cafe_id`	BIGINT	NOT NULL	COMMENT '매장ID',
	`menu_id`	BIGINT	NOT NULL	COMMENT '메뉴ID',
	`size`	VARCHAR(10)	NOT NULL	COMMENT '사이즈(REGULAR/LARGE)',
	`option_name`	VARCHAR(30)	NOT NULL	DEFAULT ''	COMMENT '옵션명',
	`price`	INT	NOT NULL	COMMENT '가격(원)',
	`sale_status`	VARCHAR(10)	NOT NULL	DEFAULT 'ON_SALE'	COMMENT '판매상태(ON_SALE/SOLD_OUT)',
	`source`	VARCHAR(10)	NOT NULL	COMMENT '출처(OWNER/RECEIPT/COLLECTED)',
	`price_scope`	VARCHAR(10)	NOT NULL	DEFAULT 'STORE'	COMMENT '가격기준(BRAND/STORE)',
	`owner_verified`	TINYINT(1)	NOT NULL	DEFAULT 0	COMMENT '점주확인여부',
	`is_new`	TINYINT(1)	NOT NULL	DEFAULT 0	COMMENT '신메뉴여부',
	`verified_at`	DATE	NOT NULL	COMMENT '확인일',
	`updated_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (price_id)
) ENGINE=InnoDB;
