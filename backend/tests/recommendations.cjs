const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
process.env.EXTRACTION_MODE = 'mock';
process.env.NODE_ENV = 'test';
process.env.PORT='8080'; process.env.DB_PORT='3306';
delete process.env.GEMINI_API_KEY;
delete process.env.GEMINI_MODEL;
delete process.env.JWT_SECRET;
const { app } = require('../dist/app');
const { env, loadSettings } = require('../dist/config/env');
const { pool } = require('../dist/config/db');
pool.query = pool.execute = pool.getConnection = () => { throw new Error('DB calls forbidden in mock tests'); };

test('settings reject invalid modes, ports and missing Gemini credentials', () => {
 assert.equal(loadSettings({}).extractionMode, 'mock');
 for (const values of [{EXTRACTION_MODE:'other'}, {NODE_ENV:'prod'}, {PORT:'abc'}, {DB_PORT:'0'}, {EXTRACTION_MODE:'gemini'}]) {
  assert.throws(() => loadSettings(values));
 }
 assert.equal(loadSettings({EXTRACTION_MODE:'gemini',GEMINI_API_KEY:'test-only',GEMINI_MODEL:'test-model'}).extractionMode,'gemini');
});
test('Express prepares/confirms/searches without Python or LLM', async () => {
 const directory = await mkdtemp(path.join(tmpdir(),'coffee-agent-test-'));
 const oldFile = env.reviewSummaryFile;
 env.reviewSummaryFile = path.join(directory,'summary.json');
 const realFetch = global.fetch;
 let allowedOrigin;
 global.fetch = (url, options) => {
  assert.equal(new URL(url).origin, allowedOrigin, 'External API calls forbidden');
  return realFetch(url, options);
 };
 const server = app.listen(0, '127.0.0.1');
 try {
 await once(server, 'listening');
 allowedOrigin=`http://127.0.0.1:${server.address().port}`;
 const base = `http://127.0.0.1:${server.address().port}/api/recommendations`;
 const post = async (suffix, body) => { const r = await fetch(base+suffix, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); return [r.status, await r.json()]; };
  let [code, body] = await post('/prepare', {message:'4천 원 이하 커피를 저렴한 순으로 추천해줘.'});
  assert.equal(code,200); const p=body.data; assert.equal(p.status,'AWAITING_CONFIRMATION');
  [code,body]=await post('/confirm',{proposal_id:p.proposal_id,confirmed:false,constraints:p.suggested_constraints}); assert.equal(code,409);
  for (const [price,count] of [[4000,3],[3999,2],[2999,0]]) {
   [code,body]=await post('/confirm',{proposal_id:p.proposal_id,confirmed:true,constraints:{...p.suggested_constraints,max_price_krw:price}});
   assert.equal(code,200); assert.equal(body.data.recommendations.length,count); assert.equal(body.data.llm_calls,0);
   assert.equal(body.data.status,count ? 'RESULT':'QUESTION');
   assert.deepEqual(body.data.recommendations.map(r=>r.offer.id),price===4000?['m4','m1','m5']:price===3999?['m4','m1']:[]);
   assert.deepEqual(body.data.recommendations.map(r=>r.offer.price_krw),price===4000?[3000,3500,4000]:price===3999?[3000,3500]:[]);
   assert.ok(body.data.recommendations.every(r=>r.offer.evidence.is_mock===true));
  }
  [code]=await post('/confirm',{proposal_id:p.proposal_id+'tamper',confirmed:true,constraints:p.suggested_constraints}); assert.equal(code,409);
  [code]=await post('/',{constraints:{sort_by:'distance'}}); assert.equal(code,422);
  [,body]=await post('/prepare',{message:'단맛 조건'});
  [code]=await post('/confirm',{proposal_id:body.data.proposal_id,confirmed:true,constraints:{}}); assert.equal(code,409);
  const reviewUrl = base.replace('/recommendations','/cafes/990001/review-summary');
  assert.equal((await fetch(reviewUrl)).status,503);
  const artifact={data_mode:'mock',status:'READY',cache_hit:false,llm_calls:0,summary:{cafe_id:990001,review_count:1,source_review_ids:[1],generated_at:'2026-11-09T00:00:00Z',notice:'모의',opinions:[{review_id:1,quote:'조용해요',topic:'noise',sentiment:'positive'}]}};
  for(const invalid of [null,{}, {...artifact,summary:{...artifact.summary,cafe_id:2}}, {...artifact,summary:{...artifact.summary,opinions:null}}]) {
   await writeFile(env.reviewSummaryFile,JSON.stringify(invalid)); assert.equal((await fetch(reviewUrl)).status,503);
  }
  await writeFile(env.reviewSummaryFile,JSON.stringify(artifact));
  const review = await fetch(reviewUrl);
  assert.equal(review.status,200);
  assert.deepEqual((await review.json()).data,artifact);
  env.nodeEnv = 'production';
  for (const route of ['/prepare','/confirm','/']) {
   assert.equal((await post(route,{}))[0],503);
  }
  assert.equal((await fetch(reviewUrl)).status,503);
 } finally {
  env.nodeEnv = 'test'; env.reviewSummaryFile = oldFile; global.fetch = realFetch;
  server.closeAllConnections(); if(server.listening) await new Promise(resolve=>server.close(resolve));
  await rm(directory,{recursive:true,force:true});
 }
});
