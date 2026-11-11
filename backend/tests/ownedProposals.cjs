const {test}=require('node:test');const assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
const {createOwnedProposals}=require('../dist/modules/recommendations/ownedProposals');
const key='test-only-proposal-key-32-bytes-long';
const p={max_price_krw:4000,category:null,sort_by:null,evidence:{max_price_krw:'4000'},unresolved:[]};
test('owner, cross-instance, restart, expiry and concurrent read confirmations',async()=>{
 let time=1000;const a=createOwnedProposals(key,()=>time),b=createOwnedProposals(key,()=>time);
 const token=a.issue('alice','4000',p);
 assert.deepEqual(b.verify(token,'alice'),p);
 assert.deepEqual(createOwnedProposals(key,()=>time).verify(token,'alice'),p);
 await Promise.all(Array.from({length:5},async()=>assert.deepEqual(b.verify(token,'alice'),p)));
 for(const action of [()=>b.verify(token,'bob'),()=>b.verify(token+'x','alice'),()=>createOwnedProposals(key+'other',()=>time).verify(token,'alice')])assert.throws(action,e=>e.status===409);
 assert.throws(()=>b.verify(token,''),e=>e.status===401);
 time=601000;assert.throws(()=>b.verify(token,'alice'),e=>e.status===409);
});
test('signed invalid schema, lifetime and unresolved proposals fail closed',()=>{
 const a=createOwnedProposals(key,()=>1000);const token=a.issue('alice','4000',p);
 const original=JSON.parse(Buffer.from(token.split('.')[0],'base64url'));
 for(const patch of [{version:2},{purpose:'login'},{expires:null},{expires:999999999},{issued:2000},{proposal:{...p,unresolved:['단맛']}}]){
  const body=Buffer.from(JSON.stringify({...original,...patch})).toString('base64url');
  const signed=body+'.'+createHmac('sha256',key).update(body).digest('base64url');
  assert.throws(()=>a.verify(signed,'alice'),e=>e.status===409);
 }
 assert.throws(()=>createOwnedProposals('short'));
});
