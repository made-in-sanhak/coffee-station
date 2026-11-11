const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test';
process.env.EXTRACTION_MODE='gemini';
process.env.GEMINI_API_KEY='test-key';
process.env.GEMINI_MODEL='test-model';
const {explainProducts}=require('../dist/modules/recommendations/productReasons');

const base={mode:'rules',notice:'시연 가격',items:[{
  cafe:{id:'11',name:'카페',distance:100},
  matchedMenu:{id:'101',price:3000},reasons:['DB 확인 가격 3000원'],score:0,
}]};
const provider=reason=>async(_url,options)=>{
  const sent=JSON.parse(options.body);
  assert.equal(sent.contents[0].parts[0].text.includes('test-key'),false);
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{
    text:JSON.stringify({reasons:[{id:'101',reason}]})}]}}]})};
};

test('AI can select an evidenced sentence without changing rank or price',async()=>{
  const result=await explainProducts(base,provider('매장까지의 직선거리는 약 100m입니다.'));
  assert.equal(result.mode,'ai');
  assert.equal(result.items[0].matchedMenu.price,3000);
  assert.equal(result.items[0].reasons[0],'매장까지의 직선거리는 약 100m입니다.');
});

test('invented reason and provider failure fall back to DB sentence',async()=>{
  assert.deepEqual(await explainProducts(base,provider('오늘 50% 할인합니다.')),base);
  assert.deepEqual(await explainProducts(base,async()=>{throw Error('provider');}),base);
});
