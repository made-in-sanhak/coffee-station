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

const withoutLocation={...base,items:base.items.map(item=>({...item,cafe:{id:'11',name:'카페'}}))};

test('missing reason without location falls back instead of returning an empty AI reason',async()=>{
  const result=await explainProducts(withoutLocation,provider(undefined));
  assert.deepEqual(result,withoutLocation);
  assert.deepEqual(JSON.parse(JSON.stringify(result)).items[0].reasons,['DB 확인 가격 3000원']);
});

test('blank and non-string reasons always fall back with and without location',async()=>{
  for (const result of [base,withoutLocation]) {
    for (const reason of [undefined,null,'','   ',0,false,{},[]]) {
      assert.deepEqual(await explainProducts(result,provider(reason)),result);
    }
  }
});

test('valid price reason without location still succeeds without changing DB facts',async()=>{
  const result=await explainProducts(withoutLocation,provider('DB 확인 가격 3000원'));
  assert.equal(result.mode,'ai');
  assert.deepEqual(result.items,withoutLocation.items);
});

test('one missing reason discards the entire AI selection and preserves all DB results',async()=>{
  const result={...withoutLocation,items:[...withoutLocation.items,{
    cafe:{id:'12',name:'두 번째 카페'},matchedMenu:{id:'102',price:4000},
    reasons:['DB 확인 가격 4000원'],score:0,
  }]};
  const request=async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{
    text:JSON.stringify({reasons:[{id:'101',reason:'DB 확인 가격 3000원'},{id:'102'}]})
  }]}}]})});
  assert.deepEqual(await explainProducts(result,request),result);
});
