import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { ok } from '../../common/response';
import { AppError } from '../../common/AppError';
import { actor } from './auth';
import { bad, object, text, id, integer, queryNumber } from './validation';
import { distanceMeters } from '../recommendations/repository';

export const cafeFeaturesRouter=Router();
cafeFeaturesRouter.post('/:id/interactions',async(req,res)=>{
 const cafeId=id(req.params.id,'매장 ID'),body=object(req.body);
 const type=text(body.type,'이용 종류',20),key=text(body.interactionKey,'중복 방지 키',64);
 if(!['DETAIL_VIEW','DIRECTIONS'].includes(type) || !/^[a-fA-F0-9]{32,64}$/.test(key))return bad('이용 종류 또는 중복 방지 키가 올바르지 않습니다.');
 const [cafes]=await pool.execute<RowDataPacket[]>('SELECT cafe_id FROM cafes WHERE cafe_id=?',[cafeId]);
 if(!cafes.length)throw new AppError(404,'매장을 찾을 수 없습니다.');
 try{await pool.execute('INSERT INTO cafe_interactions(interaction_key,cafe_id,interaction_type) VALUES(?,?,?)',[key,cafeId,type]);}
 catch(e){if((e as {code?:string}).code!=='ER_DUP_ENTRY')throw e;
   const [rows]=await pool.execute<RowDataPacket[]>('SELECT CAST(cafe_id AS CHAR) cafeId,interaction_type type FROM cafe_interactions WHERE interaction_key=?',[key]);
   if(rows[0].cafeId!==cafeId || rows[0].type!==type)throw new AppError(409,'이미 다른 요청에 사용된 키입니다.');
 }
 res.json(ok({recorded:true}));
});
cafeFeaturesRouter.post('/:id/price-requests',async(req,res)=>{
 const user=(await actor(req,true))!,cafeId=id(req.params.id,'매장 ID'),body=object(req.body);
 // Frontend Menu.id is a menu_prices.price_id, not menus.menu_id.
 const priceId=id(body.menuId,'메뉴 옵션 ID'),price=integer(body.reportedPrice,'제보 가격',1,1000000),note=text(body.note??'','메모',1000,true);
 const [rows]=await pool.execute<RowDataPacket[]>(`SELECT p.price,m.standard_name name FROM menu_prices p JOIN menus m ON m.menu_id=p.menu_id WHERE p.price_id=? AND p.cafe_id=?`,[priceId,cafeId]);
 if(!rows.length)throw new AppError(404,'해당 매장의 메뉴 옵션을 찾을 수 없습니다.');
 const requestId=randomUUID();
 await pool.execute('INSERT INTO cafe_price_requests(id,cafe_id,price_id,author_id,reported_price,note) VALUES(?,?,?,?,?,?)',[requestId,cafeId,priceId,user.id,price,note]);
 res.status(201).json(ok({id:requestId,cafeId,menuId:priceId,menuName:rows[0].name,currentPrice:Number(rows[0].price),reportedPrice:price,note,status:'OPEN'}));
});

export const comparisonRouter=Router();
export function comparisonQuery(q: Record<string,unknown>){
 const menu=text(q.menu,'메뉴명',100),size=text(q.size??'Regular','사이즈',40),temperature=text(q.temperature??'ICE','온도',3),sort=text(q.sort??'price','정렬',10);
 if(!['ICE','HOT'].includes(temperature)||!['price','distance','rating'].includes(sort))return bad('온도 또는 정렬을 확인해 주세요.');
 if((q.latitude===undefined)!==(q.longitude===undefined))return bad('위도와 경도를 함께 입력해 주세요.');
 const location=q.latitude===undefined?null:{latitude:queryNumber(q.latitude,'위도',-90,90),longitude:queryNumber(q.longitude,'경도',-180,180)};
 if(!location&&(q.radius!==undefined ||sort==='distance'))return bad('거리 비교에는 위치가 필요합니다.');
 const radius=location?queryNumber(q.radius??'1000','반경',1,5000):null;
 if(menu.startsWith('아이스 ')&&temperature!=='ICE')return bad('아이스 메뉴는 ICE를 선택해 주세요.');
 const decaf=menu.includes('디카페인');
 const name=menu.replace(/^아이스\s+/,'').replace(/^디카페인\s*/,'').replace(/\s/g,'');
 return {menu,size,temperature,sort,location,radius,decaf,name};
}
comparisonRouter.get('/compare',async(req,res)=>{
 const q=comparisonQuery(req.query);
 const basic=['regular','기본'].includes(q.size.toLowerCase());
 const [rows]=await pool.execute<RowDataPacket[]>(`SELECT CAST(c.cafe_id AS CHAR) cafeId,c.name cafeName,c.latitude,c.longitude,c.rating_avg rating,
  p.price,p.size,p.option_name temperature,p.source,DATE_FORMAT(p.verified_at,'%Y-%m-%d') checkedAt,CAST(p.price_id AS CHAR) priceId
  FROM cafes c JOIN menu_prices p ON p.cafe_id=c.cafe_id JOIN menus m ON m.menu_id=p.menu_id
  WHERE REPLACE(REPLACE(m.standard_name,' ',''),'디카페인','')=? AND m.is_decaf=? AND p.sale_status='ON_SALE' AND p.price>=0 AND UPPER(p.option_name)=?
  AND ${basic?"(LOWER(p.size)='regular' OR p.size='기본')":"LOWER(p.size)=LOWER(?)"}
  ORDER BY p.price,p.price_id`,[q.name,q.decaf?1:0,q.temperature,...(basic?[]:[q.size])]);
 const cheapest=new Map<string,Record<string,unknown>>();
 for(const r of rows){
   const distance=q.location?distanceMeters(q.location,{latitude:Number(r.latitude),longitude:Number(r.longitude)}):undefined;
   if(distance!==undefined&&distance>q.radius!)continue;
   if(cheapest.has(r.cafeId))continue;
   cheapest.set(r.cafeId,{cafeId:r.cafeId,cafeName:r.cafeName,rating:Number(r.rating),...(distance===undefined?{}:{distance:Math.round(distance)}),price:Number(r.price),size:r.size==='기본'?'Regular':r.size,temperature:r.temperature,
     source:r.source==='DEMO'?'시연 데이터 (가격 검증일 아님)':r.source,...(r.source==='DEMO'?{}:{checkedAt:r.checkedAt})});
 }
 const items=[...cheapest.values()];
 items.sort((a,b)=>Number(q.sort==='rating'?Number(b.rating)-Number(a.rating):q.sort==='distance'?Number(a.distance)-Number(b.distance):Number(a.price)-Number(b.price))||Number(a.price)-Number(b.price)||String(a.cafeId).localeCompare(String(b.cafeId)));
 const prices=items.map(i=>Number(i.price));
 res.json(ok({menuName:q.menu,average:prices.length?Math.round(prices.reduce((a,b)=>a+b,0)/prices.length):null,min:prices.length?Math.min(...prices):null,max:prices.length?Math.max(...prices):null,items}));
});
