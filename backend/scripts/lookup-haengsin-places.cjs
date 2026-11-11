require('dotenv').config({path:require('node:path').resolve(__dirname,'../../.env'),quiet:true});
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const key=process.env.KAKAO_REST_API_KEY;
 if(!key) throw Error('Development Kakao REST key is not configured.');
 const results=[];
 for(const query of ['우지커피 행신역점','빽다방 행신역점']) {
  const url=new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  url.search=new URLSearchParams({query,x:'126.8353627',y:'37.6152347',radius:'1000',size:'5'});
  const res=await fetch(url,{headers:{Authorization:`KakaoAK ${key}`},signal:AbortSignal.timeout(10000)});
  if(!res.ok) throw Error(`Kakao lookup HTTP ${res.status}`);
  const body=await res.json();
  results.push({query,places:body.documents.map(p=>({id:p.id,name:p.place_name,address:p.road_address_name,landAddress:p.address_name,latitude:Number(p.y),longitude:Number(p.x),placeUrl:p.place_url}))});
 }
 const output=path.resolve(__dirname,'../artifacts/haengsin-kakao-places.json');
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
