const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { once } = require('node:events');
const { randomBytes } = require('node:crypto');
process.env.NODE_ENV='test';
process.env.EXTRACTION_MODE='mock';
process.env.JWT_SECRET=randomBytes(32).toString('hex');
const secret=process.env.JWT_SECRET;
const { verifyAccessToken,signAccessToken }=require('../dist/modules/auth/tokens');
const sign=(sub,extra={})=>{
 const now=Math.floor(Date.now()/1000);
 const parts=[{alg:'HS256',typ:'JWT'},{sub,iss:'coffee-station',aud:'coffee-station-app',role:'USER',typ:'access',sid:'11111111-1111-4111-8111-111111111111',iat:now,exp:now+600,...extra}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url'));
 return [...parts,createHmac('sha256',createHmac('sha256',secret).update('coffee-station/auth/access-token/v1').digest()).update(parts.join('.')).digest('base64url')].join('.');
};
test('service access-token signature, identity, expiry and token purpose',()=>{
 assert.equal(verifyAccessToken(sign('1')).userId,1);
 for(const token of [sign('1',{exp:0}),sign('1',{typ:'refresh'}),sign('1',{aud:'other'}),sign('1',{sub:'1 OR 1=1'}),sign('1',{nbf:9999999999}),'mock-access-token',sign('1')+'x'])assert.equal(verifyAccessToken(token),null);
});
test('comparison validation rejects mismatched and invalid conditions',()=>{
 const { comparisonQuery }=require('../dist/modules/community/cafes');
 assert.equal(comparisonQuery({menu:'아이스 아메리카노',size:'기본'}).name,'아메리카노');
 for(const query of [{menu:'x',latitude:'37'},{menu:'x',sort:'distance'},{menu:'x',temperature:'WARM'},{menu:'x',size:['Regular']},{menu:'아이스 아메리카노',temperature:'HOT'},{menu:'x',latitude:'91',longitude:'127'}])assert.throws(()=>comparisonQuery(query));
});
test('MySQL HTTP workflows: compare, report, analytics, reviews, photos, likes, comments', {skip:!process.env.COMMUNITY_TEST_DB},async t=>{
 assert.match(process.env.DB_NAME||'',/^coffee_features_test_\d+$/);
 const {app}=require('../dist/app');const {pool}=require('../dist/config/db');
 // This destructive reset is confined to an explicitly opted-in disposable DB.
 for(const table of ['community_review_images','community_review_comments','community_review_likes','cafe_price_requests','cafe_interactions','community_reviews'])await pool.query('DELETE FROM '+table);
 await pool.query('UPDATE cafes SET review_count=0,rating_avg=0');
 await pool.query("INSERT INTO refresh_tokens(session_id,user_id,token_hash,expires_at) VALUES('11111111-1111-4111-8111-111111111111',1,REPEAT('a',64),DATE_ADD(NOW(),INTERVAL 1 DAY)) ON DUPLICATE KEY UPDATE revoked_at=NULL,expires_at=DATE_ADD(NOW(),INTERVAL 1 DAY)");
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 async function call(path,method='GET',body,token){
  const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:res.status,body:await res.json()};
 }
 const token=sign('1');let review;
 try{
 await t.test('comparison deduplicates options per cafe, filters radius and computes statistics',async()=>{
  const r=await call('/api/menus/compare?menu=아이스%20아메리카노&size=Regular&temperature=ICE&latitude=37.615&longitude=126.835&radius=1000');
  assert.equal(r.status,200);assert.equal(r.body.data.items.length,2);assert.equal(r.body.data.min,2000);assert.equal(r.body.data.max,3000);assert.equal(r.body.data.average,2500);
  const empty=await call('/api/menus/compare?menu=없는메뉴');assert.equal(empty.body.data.min,null);
  assert.equal((await call('/api/menus/compare?menu=x&sort=no')).status,400);
 });
 await t.test('cafe name search reaches directory route',async()=>{assert.equal((await call('/api/cafes?query=카페')).status,200);});
 await t.test('price report requires service identity and matching store option',async()=>{
  const input={menuId:'1',reportedPrice:2500,note:'가격 확인 부탁해요'};
  assert.equal((await call('/api/cafes/1/price-requests','POST',input)).status,401);
  assert.equal((await call('/api/cafes/2/price-requests','POST',input,token)).status,404);
  const r=await call('/api/cafes/1/price-requests','POST',input,token);assert.equal(r.status,201);assert.equal(r.body.data.menuId,'1');
  const [rows]=await pool.query('SELECT author_id FROM cafe_price_requests');assert.equal(rows[0].author_id,1);
 });
 await t.test('interaction retries deduplicate, conflicting keys reject',async()=>{
  const input={type:'DETAIL_VIEW',interactionKey:'a'.repeat(32)};
  assert.equal((await call('/api/cafes/1/interactions','POST',input)).status,200);
  assert.equal((await call('/api/cafes/1/interactions','POST',input)).status,200);
  assert.equal((await call('/api/cafes/2/interactions','POST',input)).status,409);
  const [rows]=await pool.query('SELECT COUNT(*) n FROM cafe_interactions');assert.equal(rows[0].n,1);
 });
 await t.test('review creation authenticates author, persists images and updates cafe rating atomically',async()=>{
  const image={type:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5XcAAAAASUVORK5CYII='};
  const input={cafeId:'1',rating:4,text:'라떼가 고소하고 맛있어요',category:'리뷰',images:[image],authorId:'2',verified:true};
  assert.equal((await call('/api/reviews','POST',input)).status,401);
  assert.equal((await call('/api/reviews','POST',{...input,rating:6},token)).status,400);
  assert.equal((await call('/api/reviews','POST',{...input,images:[{...image,base64:'YWJj'}]},token)).status,400);
  const r=await call('/api/reviews','POST',input,token);assert.equal(r.status,201);review=r.body.data;
  assert.equal(review.authorNickname,'테스트사용자');assert.equal(review.verified,false);assert.equal(review.rating,4);assert.equal(review.imageUrls.length,1);
  const img=await fetch(base+review.imageUrls[0]);assert.equal(img.status,200);assert.equal(img.headers.get('content-type'),'image/png');
  const [rows]=await pool.query('SELECT review_count,rating_avg FROM cafes WHERE cafe_id=1');assert.equal(rows[0].review_count,1);assert.equal(Number(rows[0].rating_avg),4);
 });
 await t.test('filters and author ownership, missing resources, persisted detail',async()=>{
  assert.equal((await call('/api/reviews?authorId=1','GET',undefined,token)).body.data.length,1);
  assert.equal((await call('/api/reviews?authorId=2','GET',undefined,token)).status,403);
  assert.equal((await call('/api/reviews?category=신메뉴')).body.data.length,0);
  assert.equal((await call('/api/reviews?cafeId=2')).body.data.length,0);
  assert.equal((await call('/api/reviews','GET',undefined,sign('999'))).status,401);
  assert.equal((await call('/api/reviews/'+review.id)).body.data.text,review.text);
  assert.equal((await call('/api/reviews/missing')).status,404);
 });
 await t.test('like toggle persists unique memberships including concurrent requests',async()=>{
  const path='/api/reviews/'+review.id+'/like';
  assert.equal((await call(path,'POST',{},token)).body.data.likes,1);
  assert.equal((await call('/api/reviews/'+review.id,'GET',undefined,token)).body.data.liked,true);
  assert.equal((await call(path,'POST',{},token)).body.data.likes,0);
  await Promise.all([call(path,'POST',{},token),call(path,'POST',{},token)]);
  assert.equal((await call('/api/reviews/'+review.id)).body.data.likes,0);
 });
 await t.test('comments authenticate, validate and update counts',async()=>{
  const path='/api/reviews/'+review.id+'/comments';
  assert.equal((await call(path,'POST',{text:'좋아요'})).status,401);
  assert.equal((await call(path,'POST',{text:' '},token)).status,400);
  const r=await call(path,'POST',{text:'저도 맛있게 마셨어요'},token);assert.equal(r.status,201);
  assert.equal((await call(path)).body.data[0].text,'저도 맛있게 마셨어요');
  assert.equal((await call('/api/reviews/'+review.id)).body.data.commentCount,1);
 });
 await t.test('legacy generated reviews import once and preserve provenance',async()=>{
  const mysql=require('mysql2/promise');const fs=require('node:fs/promises');const path=require('node:path');
  const {env}=require('../dist/config/env');const {name:database,...settings}=env.db;
  const conn=await mysql.createConnection({...settings,database,multipleStatements:true});
  try{
   await conn.query(await fs.readFile(path.join(__dirname,'../sql/migrations/001_generated_reviews.sql'),'utf8'));
   // Older installed databases may use a different collation for generated IDs.
   await conn.query('ALTER TABLE generated_reviews CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
   await conn.execute("INSERT INTO generated_reviews(id,cafe_id,menu_id,slot,author_nickname,rating,content) VALUES('generated-test',1,1,1,'이전리뷰',5,'맛있어요') ON DUPLICATE KEY UPDATE content=VALUES(content)");
   const sql=await fs.readFile(path.join(__dirname,'../sql/migrations/003_import_generated_reviews.sql'),'utf8');
   await conn.query(sql);await conn.query(sql);
   const [rows]=await conn.execute("SELECT source FROM community_reviews WHERE id='generated-test'");
   assert.equal(rows.length,1);assert.equal(rows[0].source,'GENERATED');
   assert.equal((await call('/api/reviews/generated-test')).body.data.verified,false);
  }finally{await conn.end();}
 });
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await pool.end();}
});
