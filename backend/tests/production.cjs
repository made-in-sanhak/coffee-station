const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('production startup blocks recommendation and mock review routes',()=>{
 const result=spawnSync(process.execPath,['-e',`
 const assert=require('node:assert/strict');
 const {app}=require('./dist/app');
 const server=app.listen(0,'127.0.0.1',async()=>{
  try {
   const origin='http://127.0.0.1:'+server.address().port;
   for(const route of ['/prepare','/confirm','/','/mvp/prepare','/mvp/confirm','/mvp/search']) assert.equal((await fetch(origin+'/api/recommendations'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
   assert.equal((await fetch(origin+'/api/cafes/990001/review-summary')).status,503);
  } catch(e){console.error(e);process.exitCode=1;}
  finally {server.closeAllConnections();server.close();}
 });
 `],{cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8',timeout:10000,
 env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,NODE_ENV:'production',EXTRACTION_MODE:'mock',PORT:'8080',DB_PORT:'3306'}});
 assert.equal(result.status,0,result.stderr || String(result.error || 'startup failed'));
});
