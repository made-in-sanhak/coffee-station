const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test';process.env.EXTRACTION_MODE='mock';process.env.PORT='8080';process.env.DB_PORT='3306';
const {recommend}=require('../dist/modules/recommendations/service');
const {conditions}=require('../dist/modules/recommendations/contracts');
test('classification and limit return exact options',async()=>{
 const result=await recommend(conditions({category:'LATTE',limit:1}));
 assert.deepEqual(result.recommendations.map(r=>r.offer.id),['m2']);
 assert.equal(result.recommendations[0].offer.price_krw,4500);
 assert.equal(result.recommendations[0].offer.category,'LATTE');
});
