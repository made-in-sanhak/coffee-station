const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
process.env.NODE_ENV='test';process.env.EXTRACTION_MODE='mock';process.env.PORT='8080';process.env.DB_PORT='3306';
const {prepare}=require('../dist/services/recommendations');
const {aiPolicy}=require('../dist/config/aiPolicy');
test('advertised TTL matches signed expiry and existing defaults',async()=>{
 const before=Date.now();const p=await prepare('4천 원 이하 커피를 저렴한 순으로 추천해줘.');const after=Date.now();
 const data=JSON.parse(Buffer.from(p.proposal_id.split('.')[0],'base64url'));
 assert.equal(p.expires_in_seconds,600);
 assert.ok(data.expires>=before+p.expires_in_seconds*1000 && data.expires<=after+p.expires_in_seconds*1000);
 assert.deepEqual({...aiPolicy},{proposalTtlSeconds:600,providerTimeoutMs:30000,localRateWindowMs:60000,localRateRequests:10,localRateKeys:1000});
});
test('invalid configuration fails during module startup',()=>{
 for(const change of [{EXTRACTION_MODE:'invalid'},{PORT:'0'},{EXTRACTION_MODE:'gemini'}]){
  const r=spawnSync(process.execPath,['-e',"require('./dist/config/env')"],{cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8',timeout:5000,env:{SystemRoot:process.env.SystemRoot,NODE_ENV:'test',...change}});
  assert.notEqual(r.status,0);assert.match(r.stderr,/Invalid setting|Gemini mode requires/);
 }
});
