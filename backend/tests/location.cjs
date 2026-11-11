const {test}=require('node:test');const assert=require('node:assert/strict');
process.env.NODE_ENV='test';process.env.EXTRACTION_MODE='mock';process.env.PORT='8080';process.env.DB_PORT='3306';
const {prepare,recommend,conditions,validateConfirmation}=require('../dist/modules/recommendations/service');
const {distanceMeters}=require('../dist/modules/recommendations/repository');
test('missing location can be resolved by preparing again',async()=>{
 const first=await prepare('가까운 커피 추천해줘.');assert.equal(first.status,'NEEDS_CLARIFICATION');
 assert.throws(()=>validateConfirmation(first.proposal_id));
 const second=await prepare('가까운 커피 추천해줘.',{latitude:37,longitude:127});
 assert.equal(second.status,'AWAITING_CONFIRMATION');validateConfirmation(second.proposal_id);
 const result=await recommend(conditions(second.suggested_constraints));
 assert.deepEqual(result.recommendations.map(r=>r.offer.id),['m1','m4','m5']);
 assert.equal(result.recommendations[0].distance_m,0);
 const limited=await recommend(conditions({...second.suggested_constraints,radius_m:100}));
 assert.deepEqual(limited.recommendations.map(r=>r.offer.id),['m1']);
 const unsupported=await prepare('달지 않은 가까운 커피',{latitude:37,longitude:127});assert.equal(unsupported.status,'NEEDS_CLARIFICATION');
});
test('coordinate ranges, radius and straight distance',()=>{
 for(const location of [{latitude:91,longitude:127},{latitude:37,longitude:181},{latitude:'37',longitude:127}])assert.throws(()=>conditions({location}));
 assert.throws(()=>conditions({sort_by:'distance'}));assert.throws(()=>conditions({location:{latitude:37,longitude:127},radius_m:0}));
 assert.equal(distanceMeters({latitude:37,longitude:127},{latitude:37,longitude:127}),0);
 assert.ok(Math.abs(distanceMeters({latitude:0,longitude:0},{latitude:0,longitude:1})-111195)<1);
});
