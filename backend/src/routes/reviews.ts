import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { transaction } from '../config/transaction';
import { ok } from '../common/response';
import { AppError } from '../common/AppError';
import { actor } from '../modules/community/auth';
import { object, text, id, integer, category, bad } from '../modules/community/validation';

const router = Router();
const select = `SELECT r.id, CAST(r.cafe_id AS CHAR) cafeId, c.name cafeName,
 COALESCE(a.nickname,r.author_nickname) authorNickname, r.rating, r.content text, r.category, r.created_at createdAt,
 (SELECT COUNT(*) FROM community_review_likes l WHERE l.review_id=r.id) likes,
 EXISTS(SELECT 1 FROM community_review_likes l WHERE l.review_id=r.id AND l.user_id=?) liked,
 (SELECT COUNT(*) FROM community_review_comments cm WHERE cm.review_id=r.id) commentCount
 FROM community_reviews r JOIN cafes c ON c.cafe_id=r.cafe_id LEFT JOIN users a ON a.user_id=r.author_id`;
const reviewId = (value: unknown) => {
 const v = text(value, '리뷰 ID', 64);
 if (!/^[a-zA-Z0-9-]+$/.test(v)) return bad('리뷰 ID를 확인해 주세요.');
 return v;
};
async function serialized(rows: RowDataPacket[]) {
 if (!rows.length) return [];
 const [images] = await pool.query<RowDataPacket[]>('SELECT id,review_id FROM community_review_images WHERE review_id IN (?) ORDER BY position', [rows.map(r=>r.id)]);
 return rows.map(r=>({...r, rating:Number(r.rating),likes:Number(r.likes),liked:!!Number(r.liked),commentCount:Number(r.commentCount),verified:false,
   imageUrls:images.filter(i=>i.review_id===r.id).map(i=>'/api/review-images/'+i.id)}));
}
async function detail(value: string, viewer: string | null) {
 const [rows] = await pool.execute<RowDataPacket[]>(select+' WHERE r.id=?', [viewer,value]);
 if (!rows.length) throw new AppError(404,'리뷰를 찾을 수 없습니다.');
 return (await serialized(rows))[0];
}
function photos(value: unknown): { type:string; data:Buffer }[] {
 if (value === undefined) return [];
 if (!Array.isArray(value) || value.length>3) return bad('사진은 최대 3장입니다.');
 return value.map(v=>{
   const image=object(v);
   if (image.type!=='image/jpeg' && image.type!=='image/png') return bad('JPEG 또는 PNG 사진만 지원합니다.');
   const base64=image.base64;
   if (typeof base64!=='string' || !base64 || base64.length>2796204 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) return bad('사진 데이터가 올바르지 않습니다.');
   const data=Buffer.from(base64,'base64');
   const png=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
   const jpeg=data.length>=4 && data[0]===255 && data[1]===216 && data[2]===255 && data[data.length-2]===255 && data[data.length-1]===217;
   if (!data.length || data.length>2*1024*1024 || (image.type==='image/png'?!png:!jpeg)) return bad('사진 형식 또는 크기를 확인해 주세요.');
   return {type:image.type,data};
 });
}
router.get('/',async(req,res)=>{
 const user=await actor(req); const where:string[]=[]; const args:(string|null)[]=[user?.id??null];
 if(req.query.cafeId!==undefined){where.push('r.cafe_id=?');args.push(id(req.query.cafeId,'매장 ID'));}
 if(req.query.authorId!==undefined){
   const author=id(req.query.authorId,'작성자 ID');
   if(!user || user.id!==author) throw new AppError(403,'내 리뷰만 조회할 수 있습니다.');
   where.push('r.author_id=?');args.push(author);
 }
 if(req.query.category!==undefined && req.query.category!=='전체'){where.push('r.category=?');args.push(category(req.query.category));}
 const [rows]=await pool.execute<RowDataPacket[]>(select+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY r.created_at DESC,r.id DESC',args);
 res.json(ok(await serialized(rows)));
});
router.post('/',async(req,res)=>{
 const user=(await actor(req,true))!;const body=object(req.body);
 const cafeId=id(body.cafeId,'매장 ID'),rating=integer(body.rating,'별점',1,5),content=text(body.text,'리뷰',2000),cat=category(body.category),images=photos(body.images);
 const review=randomUUID();
 await transaction(async connection=>{
   const [cafes]=await connection.execute<RowDataPacket[]>('SELECT cafe_id FROM cafes WHERE cafe_id=? FOR UPDATE',[cafeId]);
   if(!cafes.length)throw new AppError(404,'매장을 찾을 수 없습니다.');
   await connection.execute('INSERT INTO community_reviews(id,cafe_id,author_id,author_nickname,rating,content,category) VALUES(?,?,?,?,?,?,?)',[review,cafeId,user.id,user.nickname,rating,content,cat]);
   for(let i=0;i<images.length;i++)await connection.execute('INSERT INTO community_review_images(id,review_id,position,mime_type,image_data) VALUES(?,?,?,?,?)',[randomUUID(),review,i,images[i].type,images[i].data]);
   await connection.execute(`UPDATE cafes SET review_count=(SELECT COUNT(*) FROM community_reviews WHERE cafe_id=?),rating_avg=(SELECT COALESCE(AVG(rating),0) FROM community_reviews WHERE cafe_id=?) WHERE cafe_id=?`,[cafeId,cafeId,cafeId]);
 });
 res.status(201).json(ok(await detail(review,user.id)));
});
router.get('/:id/comments',async(req,res)=>{
 const value=reviewId(req.params.id);await detail(value,null);
 const [rows]=await pool.execute<RowDataPacket[]>(`SELECT cm.id,a.nickname authorNickname,cm.content text,cm.created_at createdAt FROM community_review_comments cm JOIN users a ON a.user_id=cm.author_id WHERE cm.review_id=? ORDER BY cm.created_at,cm.id`,[value]);
 res.json(ok(rows));
});
router.post('/:id/comments',async(req,res)=>{
 const user=(await actor(req,true))!;const value=reviewId(req.params.id),content=text(object(req.body).text,'댓글',1000);
 await detail(value,user.id);const comment=randomUUID();
 await pool.execute('INSERT INTO community_review_comments(id,review_id,author_id,content) VALUES(?,?,?,?)',[comment,value,user.id,content]);
 const [rows]=await pool.execute<RowDataPacket[]>('SELECT id,content text,created_at createdAt FROM community_review_comments WHERE id=?',[comment]);
 res.status(201).json(ok({...rows[0],authorNickname:user.nickname}));
});
router.post('/:id/like',async(req,res)=>{
 const user=(await actor(req,true))!;const value=reviewId(req.params.id);
 await transaction(async connection=>{
   const [rows]=await connection.execute<RowDataPacket[]>('SELECT id FROM community_reviews WHERE id=? FOR UPDATE',[value]);
   if(!rows.length)throw new AppError(404,'리뷰를 찾을 수 없습니다.');
   const [likes]=await connection.execute<RowDataPacket[]>('SELECT user_id FROM community_review_likes WHERE review_id=? AND user_id=?',[value,user.id]);
   await connection.execute(likes.length?'DELETE FROM community_review_likes WHERE review_id=? AND user_id=?':'INSERT INTO community_review_likes(review_id,user_id) VALUES(?,?)',[value,user.id]);
 });
 res.json(ok(await detail(value,user.id)));
});
router.get('/:id',async(req,res)=>{const user=await actor(req);res.json(ok(await detail(reviewId(req.params.id),user?.id??null)));});
export const reviewImagesRouter=Router();
reviewImagesRouter.get('/:id',async(req,res)=>{
 const value=text(req.params.id,'사진 ID',36);
 if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value))throw new AppError(404,'사진이 없습니다.');
 const [rows]=await pool.execute<RowDataPacket[]>('SELECT mime_type,image_data FROM community_review_images WHERE id=?',[value]);
 if(!rows.length)throw new AppError(404,'사진이 없습니다.');
 res.set({'Content-Type':rows[0].mime_type,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=86400'}).send(rows[0].image_data);
});
export default router;
