const {test}=require('node:test');const assert=require('node:assert/strict');
const {midtermConditions,recommendMidterm,MockMidtermRepository}=require('../dist/modules/recommendations/midterm');
const cases=require('./fixtures/midterm-inputs.json');
test('exact menu, options, budget and price order',async()=>{
 const a=await recommendMidterm(cases[0].expected);assert.deepEqual(a.recommendations.map(o=>o.offer_id),['demo-1','demo-3']);
 const b=await recommendMidterm(cases[1].expected);assert.deepEqual(b.recommendations.map(o=>o.offer_id),['demo-5']);
 assert.equal(a.llm_calls,0);assert.equal(a.data_mode,'mock');assert.ok(a.recommendations.every(o=>o.is_mock && o.verified_at===null));
 assert.equal((await recommendMidterm({...cases[0].expected,max_price_krw:3999})).recommendations.length,1);
 assert.equal((await recommendMidterm({...cases[0].expected,max_price_krw:2999})).status,'QUESTION');
 assert.equal((await recommendMidterm({size:'L'})).recommendations.length,0);
 assert.equal((await recommendMidterm({limit:1})).recommendations.length,1);
});
test('invalid and unsupported constraints fail instead of being discarded',()=>{
 for(const value of [null,[],{category:'COFFEE'},{menu_code:['AMERICANO']},{temperature:'cold'},{purpose:'study'},{limit:21},{max_price_krw:-1},{sort_by:'distance'}])assert.throws(()=>midtermConditions(value),e=>e.status===422);
});
test('injected repository failure differs from empty result and sold out',async()=>{
 const mock=new MockMidtermRepository();const rows=await mock.search(midtermConditions({}));
 const repo={mode:'mock',search:async()=>rows.map(o=>({...o,available:false}))};
 assert.equal((await recommendMidterm({},repo)).status,'QUESTION');
 await assert.rejects(recommendMidterm({},{mode:'database',search:async()=>{throw Error('secret')}}),e=>e.status===503 && !e.message.includes('secret'));
 await assert.rejects(recommendMidterm({},{mode:'database',search:async()=>rows}),e=>e.status===503);
});
