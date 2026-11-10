const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test'; process.env.EXTRACTION_MODE='mock';
const {conditions,validateProposal}=require('../dist/modules/recommendations/contracts');
const {extract}=require('../dist/modules/recommendations/extraction');
const {env}=require('../dist/config/env');
const proposal=()=>({max_price_krw:null,category:null,sort_by:null,evidence:{},unresolved:[]});
test('strict condition types and boundaries',()=>{
 for(const category of [['COFFEE'],{},true,1]) assert.throws(()=>conditions({category}),e=>e.status===422);
 for(const price of [-1,0.5,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>conditions({max_price_krw:price}));
 assert.equal(conditions({max_price_krw:0}).max_price_krw,0);
 for(const limit of [0,101]) assert.throws(()=>conditions({limit}));
 for(const limit of [1,100]) assert.equal(conditions({limit}).limit,limit);
 assert.throws(()=>conditions({unknown:1}));
 assert.equal(conditions({category:'COFFEE'}).category,'COFFEE');
 assert.equal(conditions({category:null}).category,null);
});
test('provider validation is 502 and does not mutate input',()=>{
 assert.throws(()=>validateProposal({...proposal(),max_price_krw:-1},''),e=>e.status===502);
 const p={...proposal(),sort_by:'distance',evidence:{sort_by:'가까운'}};
 const result=validateProposal(p,'가까운'); assert.equal(p.unresolved.length,0); assert.equal(result.unresolved.length,1);
});
test('injected provider success and errors without network',async()=>{
 const old=env.extractionMode; env.extractionMode='gemini';
 env.geminiApiKey='test-only'; env.geminiModel='test-model';
 const response=text=>async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text}]}}]}));
 try {
  assert.deepEqual(await extract('',response(JSON.stringify(proposal()))),proposal());
  for(const text of ['{',JSON.stringify({...proposal(),category:['COFFEE']}),JSON.stringify({...proposal(),category:'COFFEE',evidence:{category:'커피'}})])
   await assert.rejects(extract('',response(text)),e=>e.status===502);
  await assert.rejects(extract('',async()=>new Response('{}')),e=>e.status===502);
  for(const status of [429,503]) await assert.rejects(extract('',async()=>new Response('{}',{status})),e=>e.status===(status===429?429:502));
  await assert.rejects(extract('',async()=>{throw new DOMException('timeout','TimeoutError')}),e=>e.status===502);
 } finally {env.extractionMode=old;env.geminiApiKey='';env.geminiModel='';}
});
