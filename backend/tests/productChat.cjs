const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test';
process.env.MVP_CATALOG_MODE='mysql-seed';
const {prepareProductChat,confirmProductChat}=require('../dist/modules/recommendations/productChat');

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
