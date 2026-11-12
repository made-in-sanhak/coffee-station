const {test} = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.MVP_CATALOG_MODE = 'mysql-seed';
const {productConditions} = require('../dist/modules/recommendations/productContract');
const {searchProducts} = require('../dist/modules/recommendations/productSearch');

const row = (overrides = {}) => ({cafe_id:'11', cafe_name:'행신 카페', address:'행신로 1',
  latitude:'37.62',longitude:'126.83',rating_avg:'0',review_count:0,has_drive_thru:0,
  price_id:'101',menu_name:'아메리카노',category:'COFFEE',size:'기본',option_name:'ICE',
  price:3000,source:'DEMO',price_scope:'STORE',option_rank:1,...overrides});

test('validates only supported product filters', () => {
  assert.deepEqual(productConditions({maxPrice:5000,purpose:'DRIVE_THRU',tastes:['MILK']}),
    {maxPrice:5000,purpose:'DRIVE_THRU',tastes:['MILK']});
  for (const value of [null, {purpose:'STUDY'}, {tastes:['SWEET']}, {maxPrice:-1},
    {lat:37}, {lat:91,lng:127}, {tastes:['MILK','MILK']}, {budget:5000}]) {
    assert.throws(() => productConditions(value), error => error.status === 422);
  }
});

test('binds filters and returns one evidenced offer per cafe in price order', async () => {
  let statement, parameters;
  const select = async (sql, params) => {
    statement = sql; parameters = params;
    return [row({cafe_id:'12',price_id:'102',price:4000}), row()];
  };
  const result = await searchProducts({maxPrice:5000,purpose:'DRIVE_THRU',tastes:['DECAF','MILK'],lat:37.62,lng:126.83},select);
  assert.match(statement,/ROW_NUMBER\(\) OVER \(PARTITION BY f.cafe_id/);
  assert.match(statement,/f.has_drive_thru = 1/);
  assert.match(statement,/m.is_decaf = 1/);
  assert.match(statement,/m.has_milk = 1/);
  assert.deepEqual(parameters,[5000]);
  assert.deepEqual(result.items.map(item => item.matchedMenu.id),['101','102']);
  assert.equal(result.items[0].matchedMenu.isDemo,true);
  assert.equal(result.items[0].matchedMenu.checkedAt,null);
  assert.equal(result.items[0].cafe.distance,0);
});

test('empty results and database failures stay distinct', async () => {
  assert.deepEqual((await searchProducts({},async()=>[])).items,[]);
  await assert.rejects(searchProducts({},async()=>{throw Error('private DB detail');}),
    error => error.status === 503 && !error.message.includes('private'));
  await assert.rejects(searchProducts({},async()=>[row({source:'OWNER'})]),
    error => error.status === 503);
  await assert.rejects(searchProducts({maxPrice:2999},async()=>[row()]),
    error => error.status === 503);
});
