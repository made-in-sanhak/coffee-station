const {test}=require('node:test');const assert=require('node:assert/strict');const {once}=require('node:events');
process.env.NODE_ENV='test';process.env.EXTRACTION_MODE='gemini';process.env.GEMINI_API_KEY='test-only';process.env.GEMINI_MODEL='test-model';process.env.PORT='8080';process.env.DB_PORT='3306';
const {app}=require('../dist/app');
test('configured Gemini HTTP prepare uses one injected request; search and confirm use zero',async()=>{
 const original=global.fetch;let calls=0,status=200;
 global.fetch=async(url,options)=>{
  assert.equal(new URL(url).origin,'https://generativelanguage.googleapis.com');calls++;
  if(status!==200)return new Response('{}',{status});
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({conditions:{menu_code:'AMERICANO',temperature:'ICE',size:null,max_price_krw:4000},evidence:{menu_code:'아메리카노',temperature:'아이스',max_price_krw:'4천 원 이하'},unresolved:[]})}]}}]}));
 };
 const server=app.listen(0,'127.0.0.1');
 try {
  await once(server,'listening');const base='http://127.0.0.1:'+server.address().port+'/api/recommendations/mvp';
  const post=async(path,body)=>{const r=await original(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return [r.status,await r.json()];};
  let [code,body]=await post('/prepare',{message:'4천 원 이하 아이스 아메리카노 추천해줘.'});
  assert.equal(code,200);const p=body.data;assert.equal(p.extraction_mode,'gemini');assert.equal(p.llm_calls,1);assert.equal(calls,1);
  [code,body]=await post('/confirm',{proposal_id:p.proposal_id,confirmed:true,constraints:p.suggested_constraints});
  assert.equal(code,200);assert.equal(body.data.llm_calls,0);assert.equal(body.data.data_mode,'mock');assert.deepEqual(body.data.recommendations.map(o=>o.offer_id),['demo-1','demo-3']);assert.equal(calls,1);
  [code]=await post('/search',{constraints:p.suggested_constraints});assert.equal(code,200);assert.equal(calls,1);
  for(status of [429,503]){
   [code,body]=await post('/prepare',{message:'테스트'});assert.equal(code,status===429?429:502);assert.equal(body.success,false);assert.equal(body.data,null);
  }
  assert.equal(calls,3); // no retry and no mock success on provider failure
 }finally{
  global.fetch=original;server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));
 }
});
