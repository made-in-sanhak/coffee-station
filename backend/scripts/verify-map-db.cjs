// Read-only integration verification. Never prints connection settings.
process.env.NODE_ENV = 'development';
process.env.EXTRACTION_MODE = 'mock';
process.env.MVP_CATALOG_MODE = 'mysql-seed';
const {pool} = require('../dist/config/db');
const {readFileSync, mkdirSync, writeFileSync} = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const report = {schema:[], counts:{}, variants:[], checks:[]};
(async () => {
  const schema = readFileSync(path.join(__dirname,'../sql/schema.sql'),'utf8');
  for (const match of schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\) ENGINE/g)) {
    const [,table,definition] = match;
    const [columns] = await pool.query(`SHOW FULL COLUMNS FROM \`${table}\``);
    for (const col of definition.matchAll(/`(\w+)`\s+([A-Z]+(?:\([\d, ]+\))?)\s+(NOT NULL|NULL)/g)) {
      const actual = columns.find(item => item.Field === col[1]);
      assert(actual, `${table}.${col[1]} missing`);
      assert.equal(actual.Type.replace(/\s/g,'').toLowerCase(), col[2].replace(/\s/g,'').toLowerCase(), `${table}.${col[1]} type`);
      assert.equal(actual.Null, col[3] === 'NULL' ? 'YES' : 'NO', `${table}.${col[1]} nullable`);
    }
    const [ddl] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
    report.schema.push({table, ddl:ddl[0]['Create Table']});
    const [[count]] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    report.counts[table] = count.count;
  }
  const [rows] = await pool.query(`SELECT CAST(c.cafe_id AS CHAR) cafeId,c.name,
    CAST(p.price_id AS CHAR) id,m.standard_name menu,p.size,p.option_name temperature,p.price,
    ST_Distance_Sphere(POINT(c.longitude,c.latitude),POINT(126.8337344,37.6152147)) distance
    FROM cafes c JOIN menu_prices p ON p.cafe_id=c.cafe_id JOIN menus m ON m.menu_id=p.menu_id
    WHERE p.source='DEMO' AND p.sale_status='ON_SALE' AND m.brand_id IS NULL AND m.is_decaf=0
      AND m.standard_name IN ('아메리카노','카페라떼')`);
  const local = rows.filter(row => row.distance <= 1000);
  report.localStores = new Set(local.map(row => row.cafeId)).size;
  report.localOptions = local.length;
  report.variants = [...new Map(local.map(row => [JSON.stringify([row.menu,row.size,row.temperature]),
    {menu:row.menu,size:row.size,temperature:row.temperature}])).values()];
  if (process.argv.includes('--api')) {
    const base = process.env.MVP_TEST_URL || 'http://127.0.0.1:8080';
    for (const variant of report.variants) {
      const query = new URLSearchParams({latitude:'37.6152147',longitude:'126.8337344',radius:'1000',sort:'price',...variant});
      const response = await fetch(`${base}/api/cafes?${query}`, {signal:AbortSignal.timeout(10000)});
      const body = await response.json();
      assert.equal(response.status,200); assert.equal(body.success,true);
      const expected = local.filter(row => row.menu === variant.menu && row.size === variant.size && row.temperature === variant.temperature);
      assert.equal(body.data.length,new Set(expected.map(row => row.cafeId)).size);
      for (const cafe of body.data) {
        const offers = expected.filter(row => row.cafeId === cafe.id);
        assert.equal(cafe.minPrice,Math.min(...offers.map(row => row.price)));
        assert.equal(cafe.verified,false);
        assert.deepEqual(cafe.menus.map(m=>m.id).sort(),offers.map(row=>row.id).sort());
        for (const menu of cafe.menus) {
          assert.equal(menu.price,offers.find(row=>row.id===menu.id).price);
          assert.equal(menu.size,variant.size); assert.equal(menu.temperature,variant.temperature);
          assert.equal(menu.checkedAt,null);
          assert.equal(menu.isDemo,true);
        }
      }
      report.checks.push({...variant,stores:body.data.length,example:body.data[0]});
    }
    const bad = await fetch(`${base}/api/cafes?latitude=37.6&longitude=126.8&radius=1000&menu=${encodeURIComponent('아메리카노')}&size=Regular&temperature=ICE&sort=rating`);
    assert.equal(bad.status,422); report.invalidSortStatus=bad.status;
    const empty = await fetch(`${base}/api/cafes?latitude=37.6152147&longitude=126.8337344&radius=1000&menu=${encodeURIComponent('아메리카노')}&size=NOT_REGISTERED&temperature=ICE&sort=price`);
    assert.equal(empty.status,200); assert.deepEqual((await empty.json()).data,[]);
    report.emptyResultStatus=empty.status;
  }
  const output = path.resolve(__dirname,'../artifacts/map-db-verification.json');
  mkdirSync(path.dirname(output),{recursive:true}); writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({counts:report.counts,localStores:report.localStores,localOptions:report.localOptions,variants:report.variants,apiChecks:report.checks.length,report:output},null,2));
})().catch(error => {console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
