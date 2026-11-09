const {test}=require('node:test');const assert=require('node:assert/strict');
process.env.NODE_ENV='test';process.env.EXTRACTION_MODE='mock';process.env.PORT='8080';process.env.DB_PORT='3306';
const {MySQLMenuRepository}=require('../dist/recommendations/mysqlRepository');
const {conditions}=require('../dist/recommendations/contracts');
const {recommend}=require('../dist/services/recommendations');
const row={id:'11',cafe_id:'1',menu_id:'2',cafe_name:'테스트 매장',name:'카페라떼',category:'LATTE',size:'M',option_name:'ICE',price_krw:4000,source:'CATALOG',verified_at:'2026-11-09'};
test('SQL uses bound filters, stable order, limit and preserved options',async()=>{
 const repo=new MySQLMenuRepository(async(sql,args)=>{
  assert.deepEqual(args,['1',4000,'LATTE',1]);
  for(const part of ["p.sale_status = 'ON_SALE'","p.price_scope = 'STORE'","p.source <> 'DEMO'",'p.verified_at IS NOT NULL','p.price <= ?','m.category = ?','ORDER BY p.price ASC, p.price_id ASC LIMIT ?'])assert.ok(sql.includes(part));
  return [row];
 },['1']);
 const result=await recommend(conditions({max_price_krw:4000,category:'LATTE',limit:1}),repo);
 assert.equal(result.status,'RESULT');assert.equal(result.recommendations[0].offer.option_name,'ICE');
 assert.equal(result.recommendations[0].offer.menu_id,'2');assert.equal(result.recommendations[0].offer.evidence.is_mock,false);
 assert.equal(result.trace[0].data_mode,'mysql');assert.ok(!result.message.includes('임시'));
});
test('empty results differ from query failure and malformed catalog',async()=>{
 const c=conditions({max_price_krw:3999});
 assert.equal((await recommend(c,new MySQLMenuRepository(async()=>[],['1']))).status,'QUESTION');
 for(const select of [async()=>{throw Error('DB failure')},async()=>[{...row,price_krw:4000}],async()=>[{...row,price_krw:null}],async()=>[{...row,cafe_id:'9'}]])
  await assert.rejects(new MySQLMenuRepository(select,['1']).search(c),e=>e.status===503);
 assert.throws(()=>new MySQLMenuRepository(async()=>[],['1 OR 1=1']));
});
