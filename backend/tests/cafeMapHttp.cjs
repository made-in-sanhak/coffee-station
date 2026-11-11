const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test';
process.env.EXTRACTION_MODE='mock';
process.env.MVP_CATALOG_MODE='mysql-seed';
const {pool}=require('../dist/config/db');
const {app}=require('../dist/app');
test('map options and queries fail as 503 on DB errors without substituting mock data',async()=>{
 const original=pool.query;
 pool.query=async()=>{throw Error('private connection failure');};
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  for(const suffix of ['/options','?latitude=37&longitude=127&radius=1000&menu='+encodeURIComponent('아메리카노')+'&size=기본&temperature=ICE&sort=price']) {
   const response=await fetch(base+'/api/cafes'+suffix);
   assert.equal(response.status,503);
   const body=await response.json();assert.equal(body.success,false);assert(!JSON.stringify(body).includes('private'));
  }
 } finally {pool.query=original;await new Promise(resolve=>server.close(resolve));await pool.end();}
});
