const {test}=require('node:test');const assert=require('node:assert/strict');
process.env.NODE_ENV='test';process.env.EXTRACTION_MODE='mock';
const {nearby}=require('../dist/modules/cafes/router');
const q={latitude:'37.62',longitude:'126.83',radius:'1000',menu:'아메리카노',temperature:'ICE',size:'Regular',sort:'price'};
test('map keeps coordinates, option IDs and minimum matching price without invented verification',async()=>{
 const result=await nearby(q,async(sql,args)=>{
  assert.match(sql,/LIMIT 1001/);assert.deepEqual(args.slice(0,3),['아메리카노','ICE','Regular']);
  return [3000,3500].map((price,i)=>({cafe_id:'1',offer_id:String(i+2),name:'테스트 매장',address:'행신',latitude:'37.62',longitude:'126.83',standard_name:'아메리카노',size:'Regular',option_name:'ICE',price}));
 });
 assert.equal(result.length,1);assert.equal(result[0].menus.length,2);assert.equal(result[0].minPrice,3000);
 assert.equal(result[0].verified,false);assert.equal(result[0].menus[0].checkedAt,null);
});
test('map rejects unsupported conditions, separates empty and failed queries',async()=>{
 for(const bad of [{radius:'0'},{latitude:'NaN'},{temperature:'HOT',menu:'아이스 아메리카노'},{sort:'rating'}])
  await assert.rejects(nearby({...q,...bad},async()=>[]),e=>e.status===422);
 assert.deepEqual(await nearby(q,async()=>[]),[]);
 await assert.rejects(nearby(q,async()=>{throw Error('private');}),e=>e.status===503&&!e.message.includes('private'));
});

test('all sizes omit SQL filter and preserve brand evidence',async()=>{
 const {size,...all}=q;
 const r=await nearby(all,async(sql,args)=>{
  assert.doesNotMatch(sql,/BINARY p.size/);assert.equal(args[2]>0,true);
  return [{cafe_id:'1',offer_id:'2',name:'테스트',address:'행신',latitude:'37.62',longitude:'126.83',standard_name:'아메리카노',size:'Tall',option_name:'ICE',price:4700,price_scope:'BRAND'}];
 });
 assert.equal(r[0].menus[0].size,'Tall');assert.equal(r[0].menus[0].priceScope,'BRAND');assert.equal(r[0].menus[0].isDemo,true);
});
