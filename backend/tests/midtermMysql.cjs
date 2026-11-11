const {test}=require('node:test');const assert=require('node:assert/strict');
process.env.NODE_ENV='test';process.env.EXTRACTION_MODE='mock';process.env.MVP_CATALOG_MODE='mock';
const {SeedMidtermRepository}=require('../dist/modules/recommendations/midtermMysql');
const {recommendMidterm}=require('../dist/modules/recommendations/midterm');
test('seed SQL binds exact menu/options/budget and does not claim verification',async()=>{
 const repo=new SeedMidtermRepository(async(sql,params)=>{
  assert.match(sql,/p.source = 'DEMO'/);assert.match(sql,/LIMIT \?/);
  assert.deepEqual(params,['아메리카노','ICE','Regular',4000,10]);
  return [{cafe_id:'1',menu_id:'2',offer_id:'3',cafe_name:'행신 테스트',menu_name:'아메리카노',temperature:'ICE',size:'Regular',price_krw:3000,source:'DEMO'}];
 });
 const r=await recommendMidterm({menu_code:'AMERICANO',temperature:'ICE',size:'Regular',max_price_krw:4000},repo);
 assert.equal(r.data_mode,'database');assert.equal(r.recommendations[0].verified_at,null);
 assert.equal(r.recommendations[0].is_mock,false);assert.match(r.notice,/시연/);
});
test('seed query errors fail closed instead of falling back to mock',async()=>{
 await assert.rejects(recommendMidterm({},new SeedMidtermRepository(async()=>{throw Error('private');})),e=>e.status===503&&!e.message.includes('private'));
 const r=await recommendMidterm({},new SeedMidtermRepository(async()=>[]));assert.equal(r.status,'QUESTION');
});
