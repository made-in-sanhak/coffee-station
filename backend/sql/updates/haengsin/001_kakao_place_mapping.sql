-- Source: Kakao keyword search, 2026-11-11, one exact-name result per branch.
-- Both confirmed road addresses: 경기 고양시 덕양구 충경로 52.
-- Existing cafes 9006/9007 only. Do not rerun schema/seed or change price rows.
-- scripts/apply-haengsin-kakao.cjs additionally checks current names, addresses and
-- conflicting IDs, saves old mapping values and asserts updated row counts.
START TRANSACTION;
UPDATE cafes SET kakao_place_id='875716738', latitude=37.61534967739138, longitude=126.83545566077363
 WHERE cafe_id=9006 AND name='우지커피 행신역점'
 AND (kakao_place_id IS NULL OR kakao_place_id='875716738');
UPDATE cafes SET kakao_place_id='197327126', latitude=37.615103392475014, longitude=126.83522967628703
 WHERE cafe_id=9007 AND name='빽다방 행신역점'
 AND (kakao_place_id IS NULL OR kakao_place_id='197327126');
COMMIT;
