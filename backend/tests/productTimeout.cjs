const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test';
process.env.EXTRACTION_MODE='gemini';
process.env.GEMINI_API_KEY='test-key';
process.env.GEMINI_MODEL='test-model';
const {aiPolicy}=require('../dist/config/aiPolicy');
const {explainProducts}=require('../dist/modules/recommendations/productReasons');
const {geminiProductExtractor,prepareProductChat}=require('../dist/modules/recommendations/productChat');

const base={mode:'rules',notice:'시연 가격',items:[{
  cafe:{id:'11',distance:100},matchedMenu:{id:'101',price:3000},
  reasons:['DB 시연 가격 3000원'],score:0,
}]};

// Drive the provider deadline without real waiting or external requests.
function delayedProvider(t, delayBody) {
  const controller=new AbortController();
  t.mock.method(AbortSignal,'timeout',milliseconds=>{
    assert.equal(milliseconds,10000);
    return controller.signal;
  });
  let started;
  const ready=new Promise(resolve=>{started=resolve;});
  const waitForAbort=signal=>new Promise((_,reject)=>{
    signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
    started();
  });
  return {
    ready,
    abort:()=>controller.abort(new DOMException('provider deadline','TimeoutError')),
    request:async(_url,options)=>delayBody
      ? {ok:true,json:()=>waitForAbort(options.signal)}
      : waitForAbort(options.signal),
  };
}

test('DB and AI timeout budget leaves room within the app request limit',()=>{
  assert.ok(3000 + 5000 + aiPolicy.providerTimeoutMs < 20000);
});

for (const delayBody of [false,true]) {
  test(`reason timeout during ${delayBody?'body':'headers'} returns unchanged DB results`,async t=>{
    const provider=delayedProvider(t,delayBody);
    const pending=explainProducts(base,provider.request);
    await provider.ready;
    provider.abort();
    assert.deepEqual(await pending,base);
  });

  test(`extraction timeout during ${delayBody?'body':'headers'} reports a retryable error`,async t=>{
    const provider=delayedProvider(t,delayBody);
    const pending=prepareProductChat('디카페인',geminiProductExtractor(provider.request));
    const rejected=assert.rejects(pending,error=>error.status===504 && error.message.includes('조건 칩'));
    await provider.ready;
    provider.abort();
    await rejected;
  });
}
