const {test}=require('node:test');const assert=require('node:assert/strict');
const {rankCandidates}=require('../dist/recommendations/ranking');
const {conditions}=require('../dist/recommendations/contracts');
const item=(id,price,category='COFFEE')=>({cafe:{id,name:id},offer:{id,name:id,category,price_krw:price,evidence:{is_mock:true}},distance_m:100});
const experiment={order:'relevance',topic:'noise',preferredCategory:'LATTE',weights:{review:1,preference:1},smoothing:3};
const feature=(id,rev=1)=>({cafeId:id,revision:rev,currentRevision:1,opinions:[{reviewId:'1',topic:'noise',sentiment:'positive'}]});
test('mandatory constraints precede scores; stale and missing features do not vote',()=>{
 const result=rankCandidates([item('a',3000),item('b',3500),item('c',5000,'LATTE'),item('d',3200,'LATTE')],conditions({max_price_krw:4000,category:'COFFEE'}),[feature('a',0),feature('c')],experiment);
 assert.deepEqual(result.map(r=>r.offer.id),['a','b']);assert.equal(result[0].ranking.review,0);
});
test('small samples, duplicates and mixed opinions remain explainable',()=>{
 const f=feature('a');f.opinions.push({...f.opinions[0]},{reviewId:'2',topic:'noise',sentiment:'negative'});
 const [r]=rankCandidates([item('a',3000)],conditions({}),[f],experiment);
 assert.equal(r.ranking.positive,1);assert.equal(r.ranking.negative,1);assert.equal(r.ranking.score,0);assert.equal(r.ranking.mixedOpinions,true);
});
test('explicit price and distance order override preference scores',()=>{
 const items=[item('a',4000,'LATTE'),item('b',3000)];items[0].distance_m=200;
 for(const order of ['price','distance']) assert.deepEqual(rankCandidates(items,conditions({}),[feature('a')],{...experiment,order}).map(r=>r.offer.id),['b','a']);
});
