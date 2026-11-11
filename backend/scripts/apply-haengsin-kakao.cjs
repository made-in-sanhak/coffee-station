process.env.NODE_ENV='development';process.env.EXTRACTION_MODE='mock';
const {pool}=require('../dist/config/db');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const evidence=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../artifacts/haengsin-kakao-places.json'),'utf8'));
 const targets=[{id:9006,name:'우지커피 행신역점'},{id:9007,name:'빽다방 행신역점'}];
 const connection=await pool.getConnection();
 try {
  await connection.beginTransaction();
  const snapshots=[];
  for(const target of targets) {
   const candidates=evidence.find(item=>item.query===target.name)?.places??[];
   if(candidates.length!==1) throw Error(`Ambiguous place: ${target.name}`);
   const place=candidates[0];
   if(place.name!==target.name||!place.address.endsWith('충경로 52')||!/^\d+$/.test(place.id)
     ||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude)) throw Error('Place evidence mismatch');
   const [rows]=await connection.execute('SELECT cafe_id,name,address,kakao_place_id,latitude,longitude FROM cafes WHERE cafe_id=? FOR UPDATE',[target.id]);
   const current=rows[0];
   if(!current||current.name!==target.name||!current.address.includes('충경로 52')||
      (current.kakao_place_id && String(current.kakao_place_id)!==place.id)) throw Error('Existing store mapping mismatch');
   snapshots.push(current);
   const [result]=await connection.execute('UPDATE cafes SET kakao_place_id=?,latitude=?,longitude=? WHERE cafe_id=? AND name=?',
    [place.id,place.latitude,place.longitude,target.id,target.name]);
   if(result.affectedRows!==1) throw Error('Unexpected update count');
  }
  const backup=path.resolve(__dirname,`../artifacts/kakao-mapping-before-${Date.now()}.json`);
  fs.writeFileSync(backup,JSON.stringify(snapshots,null,2));
  await connection.commit();console.log('Updated only cafes 9006 and 9007: Kakao place IDs and verified lookup coordinates. Price rows unchanged.');
 } catch(error) {await connection.rollback();throw error;} finally {connection.release();}
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
