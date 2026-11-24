-- Optional: preserve earlier generated_reviews without presenting them as verified purchases.
-- Run after 002. Safe when the earlier table does not exist. Repeatable by review ID.
SET @has_generated = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='generated_reviews');
SET @import_generated = IF(@has_generated=1,
 'INSERT INTO community_reviews(id,cafe_id,author_nickname,rating,content,category,source,created_at) SELECT g.id,g.cafe_id,g.author_nickname,g.rating,g.content,''리뷰'',''GENERATED'',g.created_at FROM generated_reviews g JOIN cafes c ON c.cafe_id=g.cafe_id WHERE NOT EXISTS(SELECT 1 FROM community_reviews r WHERE BINARY r.id=BINARY g.id)',
 'SELECT 1');
PREPARE import_statement FROM @import_generated;
EXECUTE import_statement;
DEALLOCATE PREPARE import_statement;
UPDATE cafes c JOIN (SELECT cafe_id,COUNT(*) n,AVG(rating) rating FROM community_reviews GROUP BY cafe_id) r ON r.cafe_id=c.cafe_id SET c.review_count=r.n,c.rating_avg=r.rating;
