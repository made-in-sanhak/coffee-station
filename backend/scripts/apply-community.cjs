const fs=require('node:fs/promises');
const path=require('node:path');
const mysql=require('mysql2/promise');
const {env}=require('../dist/config/env');
async function main(){
 if(env.nodeEnv==='production')throw new Error('운영 DB는 배포 migration 절차를 사용하세요.');
 const {name:database,...settings}=env.db;
 const connection=await mysql.createConnection({...settings,database,multipleStatements:true});
 try{
  for(const name of ['002_community_features.sql','003_import_generated_reviews.sql']){
   await connection.query(await fs.readFile(path.join(__dirname,'../sql/migrations',name),'utf8'));
   console.log('Applied:',name);
  }
  const [rows]=await connection.query('SELECT COUNT(*) count FROM community_reviews');
  console.log('Database:',env.db.name,'/ reviews:',rows[0].count);
 }finally{await connection.end();}
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1;});
