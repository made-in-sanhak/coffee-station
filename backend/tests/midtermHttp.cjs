const {test}=require('node:test');const assert=require('node:assert/strict');const {once}=require('node:events');
process.env.NODE_ENV='test';process.env.EXTRACTION_MODE='mock';process.env.PORT='8080';process.env.DB_PORT='3306';
const {app}=require('../dist/app');const {prepareMidterm}=require('../dist/modules/recommendations/midtermFlow');
test('MVP HTTP chip and natural-language confirmation return identical options',async()=>{
 const server=app.listen(0,'127.0.0.1');
 try {
  await once(server,'listening');const base='http://127.0.0.1:'+server.address().port+'/api/recommendations/mvp';
  const post=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return [r.status,await r.json()];};
  let [code,data]=await post('/prepare',{message:'4천 원 이하 아이스 아메리카노 추천해줘.'});assert.equal(code,200);const p=data.data;
  const payload={confirmed:true,proposal_id:p.proposal_id,constraints:p.suggested_constraints};
  const [chipCode,chip]=await post('/search',{constraints:payload.constraints});assert.equal(chipCode,200);
  [code,data]=await post('/confirm',payload);assert.equal(code,200);assert.deepEqual(data.data,chip.data);
  assert.deepEqual(data.data.recommendations.map(o=>o.offer_id),['demo-1','demo-3']);assert.equal(data.data.llm_calls,0);
  [code]=await post('/confirm',{...payload,confirmed:false});assert.equal(code,409);
  [code]=await post('/confirm',{...payload,proposal_id:p.proposal_id+'bad'});assert.equal(code,409);
  [code]=await post('/confirm',{...payload,constraints:{}});assert.equal(code,422);
  [,data]=await post('/prepare',{message:'달지 않은 커피'});assert.equal(data.data.status,'NEEDS_CLARIFICATION');
  [code]=await post('/confirm',{...payload,proposal_id:data.data.proposal_id});assert.equal(code,409);
 } finally{server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));}
});
test('injected extraction rejects malformed conditions and invented evidence',async()=>{
 for(const provider of [async()=>({}),async()=>({conditions:{menu_code:'AMERICANO',temperature:null,size:null,max_price_krw:null},evidence:{menu_code:'없는 원문'},unresolved:[]}),async()=>{throw Error('secret')}])
  await assert.rejects(prepareMidterm('커피',provider),e=>e.status===502 && !e.message.includes('secret'));
});
