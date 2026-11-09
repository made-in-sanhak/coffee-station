const {test}=require('node:test');const assert=require('node:assert/strict');
const {createQuota,MockQuotaStore}=require('../dist/recommendations/quota');
const policy={perMinute:2,perDay:3,concurrent:1,leaseMs:30000};
test('two services share concurrency, minute and daily attempt budgets',async()=>{
 let time=0;const store=new MockQuotaStore(()=>time),a=createQuota(store,policy),b=createQuota(store,policy);
 const release=await a('alice');
 await assert.rejects(b('alice'),e=>e.status===429 && e.retryAfterSeconds===30);
 await release();await release();
 const next=await b('alice');await next();
 await assert.rejects(a('alice'),e=>e.status===429 && e.retryAfterSeconds===60);
 await (await a('bob'))();
 time=60000;await (await a('alice'))();
 await assert.rejects(b('alice'),e=>e.status===429);
 time=86400000;await (await b('alice'))();
});
test('atomic contenders, lease recovery, store outage and identity',async()=>{
 let time=0;const a=createQuota(new MockQuotaStore(()=>time),{...policy,perMinute:10});
 const outcomes=await Promise.allSettled([a('alice'),a('alice')]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 time=30000;await (await a('alice'))();
 await assert.rejects(a(''),e=>e.status===401);
 const down=createQuota({reserve:async()=>{throw Error('down')},release:async()=>{}},policy);
 await assert.rejects(down('alice'),e=>e.status===503);
});
