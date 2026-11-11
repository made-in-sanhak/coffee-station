const {test}=require('node:test');const assert=require('node:assert/strict');
const {createMidtermGeminiExtractor}=require('../dist/modules/recommendations/midtermGemini');
const {prepareMidterm}=require('../dist/modules/recommendations/midtermFlow');
const {recommendMidterm}=require('../dist/modules/recommendations/midterm');
const config={apiKey:'test-only-key',model:'test-model'};
const message='4천 원 이하 아이스 아메리카노 추천해줘.';
const extracted={conditions:{menu_code:'AMERICANO',temperature:'ICE',size:null,max_price_krw:4000},evidence:{menu_code:'아메리카노',temperature:'아이스',max_price_krw:'4천 원 이하'},unresolved:[]};
const response=value=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]}));
test('Gemini request and validated mock response produce DB-free recommendations in one attempt',async()=>{
 let calls=0;
 const adapter=createMidtermGeminiExtractor(config,async(url,options)=>{
  calls++;assert.ok(url.endsWith('test-model:generateContent'));const body=JSON.parse(options.body);
  assert.equal(options.headers['x-goog-api-key'],'test-only-key');assert.equal(body.contents[0].parts[0].text,message);
  assert.equal(body.generationConfig.responseMimeType,'application/json');assert.equal(body.tools,undefined);
  return response(extracted);
 });
 const p=await prepareMidterm(message,adapter,'gemini');assert.equal(p.status,'AWAITING_CONFIRMATION');assert.equal(p.llm_calls,1);
 assert.deepEqual((await recommendMidterm(p.suggested_constraints)).recommendations.map(o=>o.offer_id),['demo-1','demo-3']);assert.equal(calls,1);
});
test('provider failures, blocked or malformed outputs fail without retry or leaking secrets',async()=>{
 const cases=[async()=>new Response('{}',{status:429}),async()=>new Response('{}',{status:503}),async()=>new Response('{}'),async()=>{throw Error('secret')},async()=>response({...extracted,evidence:{menu_code:'invented'}}),async()=>new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[]}}]}))];
 for(let i=0;i<cases.length;i++){
  let calls=0;const adapter=createMidtermGeminiExtractor(config,async()=>{calls++;return cases[i]()});
  await assert.rejects(prepareMidterm(message,adapter,'gemini'),e=>e.status===(i===0?429:502) && !e.message.includes('secret'));assert.equal(calls,1);
 }
 assert.throws(()=>createMidtermGeminiExtractor({apiKey:'',model:'test'}));
});
