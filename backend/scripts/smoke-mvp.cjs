const assert = require('node:assert/strict');
const base = process.env.MVP_TEST_URL || 'http://127.0.0.1:8080';
const constraints = {menu_code:'AMERICANO', temperature:'ICE', size:null, max_price_krw:4000, sort_by:'price', limit:10};
async function post(action, body) {
  const response = await fetch(`${base}/api/recommendations/mvp/${action}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
    signal:AbortSignal.timeout(10000),
  });
  const value = await response.json();
  assert(response.ok && value.success, `${action}: HTTP ${response.status} ${value.message || ''}`);
  return value.data;
}
(async () => {
  const direct = await post('search', {constraints});
  assert.equal(direct.status, 'RESULT');
  const proposal = await post('prepare', {message:'4천 원 이하 아이스 아메리카노 추천해줘.'});
  assert.equal(proposal.status, 'AWAITING_CONFIRMATION');
  assert.equal(proposal.extraction_mode, 'mock', 'Run with dev:mvp or dev:mvp:db');
  const confirmed = await post('confirm', {proposal_id:proposal.proposal_id, confirmed:true, constraints});
  assert.deepEqual(confirmed.recommendations, direct.recommendations);
  const prices = direct.recommendations.map(item => item.price_krw);
  assert(prices.every(price => price <= 4000));
  assert.deepEqual(prices, [...prices].sort((a,b) => a-b));
  if (direct.data_mode === 'mock') assert.deepEqual(prices, [3000,4000]);
  console.log(`PASS search -> prepare -> confirm; mode=${direct.data_mode}; options=${prices.length}; prices=${prices.join(',')}`);
  if (!prices.length) console.log('No matching DB options; check DEMO seed data. This is not a connection failure.');
})().catch(error => {console.error(error.message); process.exitCode = 1;});
