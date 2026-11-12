const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test';
process.env.MVP_CATALOG_MODE='mysql-seed';
const {prepareProductChat,confirmProductChat}=require('../dist/modules/recommendations/productChat');

test('selected chips fill conditions absent from natural language and survive confirmation',async()=>{
  const proposal=await prepareProductChat('우유 포함',async()=>({
    conditions:{maxPrice:null,purpose:null,tastes:['MILK']},evidence:{tastes:'우유 포함'},unresolved:[],
  }),{lat:37.62,lng:126.83},{maxPrice:3000,purpose:'DRIVE_THRU',tastes:['DECAF']});
  assert.equal(proposal.status,'AWAITING_CONFIRMATION');
  assert.deepEqual(confirmProductChat(proposal.proposalId),{
    maxPrice:3000,purpose:'DRIVE_THRU',tastes:['DECAF','MILK'],lat:37.62,lng:126.83,
  });
  assert.deepEqual(proposal.evidence,{tastes:'우유 포함'});
});

test('explicit natural-language budget overrides chips and tastes are deduplicated',async()=>{
  const proposal=await prepareProductChat('5천 원 이하 디카페인 메뉴를 찾아줘',undefined,undefined,
    {maxPrice:3000,purpose:null,tastes:['MILK','DECAF']});
  assert.deepEqual(confirmProductChat(proposal.proposalId),{
    maxPrice:5000,purpose:null,tastes:['MILK','DECAF'],
  });
});

test('invalid selected conditions fail before invoking the provider',async()=>{
  let calls=0;
  await assert.rejects(prepareProductChat('추천',async()=>{calls++;},undefined,
    {maxPrice:3000,tastes:['SWEET']}),e=>e.status===422);
  assert.equal(calls,0);
});

test('selected chips never bypass unresolved natural-language conditions',async()=>{
  const proposal=await prepareProductChat('조용한 카페를 찾아줘',undefined,undefined,
    {maxPrice:3000,tastes:['MILK']});
  assert.equal(proposal.conditions.maxPrice,3000);
  assert.equal(proposal.status,'NEEDS_CLARIFICATION');
  assert.throws(()=>confirmProductChat(proposal.proposalId),e=>e.status===409);
});

test('natural language requires confirmation and preserves supported evidence',async()=>{
  const proposal=await prepareProductChat('5천 원 이하 디카페인 메뉴를 찾아줘',undefined,{lat:37.62,lng:126.83});
  assert.equal(proposal.status,'AWAITING_CONFIRMATION');
  assert.deepEqual(confirmProductChat(proposal.proposalId),{maxPrice:5000,purpose:null,tastes:['DECAF'],lat:37.62,lng:126.83});
  assert.throws(()=>confirmProductChat(proposal.proposalId+'x'),e=>e.status===409);
});

test('unsupported requests stay unresolved and never search',async()=>{
  const proposal=await prepareProductChat('조용한 카페를 찾아줘');
  assert.equal(proposal.status,'NEEDS_CLARIFICATION');
  assert.throws(()=>confirmProductChat(proposal.proposalId),e=>e.status===409);
});

test('provider invented evidence and invalid conditions fail closed',async()=>{
  await assert.rejects(prepareProductChat('디카페인',async()=>({
    conditions:{maxPrice:5000,purpose:null,tastes:['DECAF']},
    evidence:{maxPrice:'5천 원',tastes:'디카페인'},unresolved:[],
  })),e=>e.status===502);
  await assert.rejects(prepareProductChat('산미 적은',async()=>({
    conditions:{maxPrice:null,purpose:null,tastes:['LOW_ACIDITY']},evidence:{},unresolved:[],
  })),e=>e.status===502);
});
