import {Router} from 'express';
import {pool} from '../../config/db';
import {env} from '../../config/env';
import {AppError} from '../../common/AppError';
import {ok} from '../../common/response';
import {distanceMeters} from '../recommendations/repository';

type Select = (sql:string,params:(string|number)[])=>Promise<Record<string,unknown>[]>;
const select:Select = async(sql,params)=>{
  const [rows]=await pool.query({sql,timeout:5000},params);
  return rows as Record<string,unknown>[];
};
export async function nearby(q:Record<string,unknown>,query:Select=select) {
  const number=(key:string,min:number,max:number)=>{
    const raw=q[key];
    if(typeof raw!=='string'||!raw.trim()||!Number.isFinite(Number(raw))||Number(raw)<min||Number(raw)>max)
      throw new AppError(422,`잘못된 지도 조건: ${key}`);
    return Number(raw);
  };
  if(Object.keys(q).some(k=>!['latitude','longitude','radius','menu','size','temperature','sort'].includes(k)))
    throw new AppError(422,'지원하지 않는 지도 조건입니다.');
  const latitude=number('latitude',-90,90),longitude=number('longitude',-180,180),radius=number('radius',1,5000);
  const names:Record<string,string>={'아메리카노':'아메리카노','아이스 아메리카노':'아메리카노','카페라떼':'카페라떼','아이스 카페라떼':'카페라떼'};
  if(typeof q.menu!=='string'||!names[q.menu]||!['HOT','ICE'].includes(String(q.temperature))
    ||typeof q.size!=='string'||!q.size.trim()||q.size.length>40||!['price','distance'].includes(String(q.sort??'price'))
    ||String(q.menu).startsWith('아이스')&&q.temperature!=='ICE') throw new AppError(422,'메뉴·온도·사이즈·정렬을 확인하세요.');
  // Bounding square first; exact radius below. Fetch cap+1 and reject rather than silently truncate stores.
  const latDelta=radius/110000, lngDelta=radius/(110000*Math.max(0.001,Math.cos(latitude*Math.PI/180)));
  let rows:Record<string,unknown>[];
  try { rows=await query(`SELECT CAST(c.cafe_id AS CHAR) AS cafe_id,c.name,c.address,
    c.latitude,c.longitude,CAST(p.price_id AS CHAR) AS offer_id,m.standard_name,
    p.size,p.option_name,p.price,p.price_scope FROM cafes c
    JOIN menu_prices p ON p.cafe_id=c.cafe_id JOIN menus m ON m.menu_id=p.menu_id
    WHERE p.source='DEMO' AND p.sale_status='ON_SALE' AND p.price>=0
    AND m.standard_name=? AND m.brand_id IS NULL AND m.is_decaf=0
    AND p.option_name=? AND BINARY p.size=BINARY ?
    AND c.latitude BETWEEN ? AND ? AND c.longitude BETWEEN ? AND ?
    ORDER BY c.cafe_id,p.price,p.price_id LIMIT 1001`,
    [names[q.menu],String(q.temperature),q.size,latitude-latDelta,latitude+latDelta,longitude-lngDelta,longitude+lngDelta]);
  } catch {throw new AppError(503,'지도 매장 정보를 조회할 수 없습니다.');}
  if(rows.length>1000) throw new AppError(422,'조회 반경을 줄여주세요.');
  const cafes=new Map<string,any>();
  for(const r of rows){
    const lat=Number(r.latitude),lng=Number(r.longitude),price=Number(r.price);
    if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180
      ||!Number.isSafeInteger(price)||price<0||typeof r.cafe_id!=='string'||typeof r.offer_id!=='string')
      throw new AppError(503,'지도 데이터 형식을 확인하세요.');
    const distance=distanceMeters({latitude,longitude},{latitude:lat,longitude:lng});
    if(distance>radius) continue;
    const menu={id:r.offer_id,cafeId:r.cafe_id,name:r.standard_name,size:r.size,temperature:r.option_name,
      price,caffeineMg:null,available:true,source:'DEMO (실제 가격 확인일 미확인)'};
    const cafe=cafes.get(r.cafe_id)??{id:r.cafe_id,name:r.name,address:r.address,latitude:lat,longitude:lng,
      distance,minPrice:price,verified:false,tags:['시연 가격'],menus:[]};
    cafe.minPrice=Math.min(cafe.minPrice,price);cafe.menus.push(menu);cafes.set(r.cafe_id,cafe);
  }
  return [...cafes.values()].sort((a,b)=>(q.sort==='distance'?a.distance-b.distance:a.minPrice-b.minPrice)||a.id.localeCompare(b.id));
}
const router=Router();
router.get('/',async(req,res)=>{
  if(env.nodeEnv==='production'||env.catalogMode!=='mysql-seed') throw new AppError(503,'개발용 DB 지도 조회를 활성화하세요.');
  res.json(ok(await nearby(req.query)));
});
export default router;
