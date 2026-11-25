const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { once } = require("node:events");
const { test } = require("node:test");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.MVP_CATALOG_MODE = "mysql-seed";
const ocr = require("../dist/modules/menuBoard/ocr");
const { menuDifference } = require("../dist/modules/menuBoard/router");

const field = (inferText, x, y, inferConfidence = 0.98) => ({
  inferText,
  inferConfidence,
  boundingPoly: {
    vertices: [
      { x, y },
      { x: x + 40, y },
      { x: x + 40, y: y + 16 },
      { x, y: y + 16 },
    ],
  },
});
const result = {
  images: [
    {
      inferResult: "SUCCESS",
      fields: [
        field("아이스", 20, 35),
        field("아메리카노", 85, 35),
        field("2,000", 390, 35),
        field("카페라떼", 20, 65),
        field("2,900원", 385, 65, 0.62),
        field("캐모마일티", 20, 95),
        field("3,000", 390, 95),
      ].reverse(),
    },
  ],
};
const photo = {
  type: "image/jpeg",
  base64: Buffer.from([255, 216, 255, 217]).toString("base64"),
};

test("parses OCR coordinates into menu and price rows without assuming a temperature", () => {
  const items = ocr.parseMenuBoard(result);
  assert.deepEqual(
    items.map(({ name, price, category, temperature, confidence }) => [
      name,
      price,
      category,
      temperature,
      confidence,
    ]),
    [
      ["아이스 아메리카노", 2000, "COFFEE", "ICE", 0.98],
      ["카페라떼", 2900, "COFFEE", null, 0.62],
      ["캐모마일티", 3000, "TEA", null, 0.98],
    ]
  );
  assert.throws(() => ocr.menuPhotos([{ ...photo, type: "image/png" }]), {
    status: 400,
  });
  assert.equal(ocr.menuPhotos([photo])[0].format, "jpg");
});

test("diff keeps ambiguous options and requires a price for blurred OCR changes", () => {
  const items = ocr.parseMenuBoard(result);
  const stored = (name, menuId, price, temperature) => ({
    name,
    menuId,
    price,
    temperature,
    size: "Regular",
    category: "COFFEE",
    available: true,
  });
  const { changes, unchanged } = menuDifference(
    [items[0], { ...items[1], temperature: "HOT" }, items[2]],
    [
      stored("아메리카노", "1", 2000, "ICE"),
      stored("카페라떼", "2", 3000, "HOT"),
      stored("콜드브루", "3", 3500, "ICE"),
    ]
  );
  assert.deepEqual(
    unchanged.map((item) => item.menuId),
    ["1"]
  );
  assert.deepEqual(
    changes.map((item) => [item.kind, item.name, item.price]),
    [
      ["PRICE_CHANGED", "카페라떼", null],
      ["NEW", "캐모마일티", 3000],
      ["MISSING", "콜드브루", null],
    ]
  );
  const ambiguous = menuDifference(
    [items[1]],
    [stored("카페라떼", "2", 3000, "HOT"), stored("카페라떼", "4", 3500, "ICE")]
  );
  assert.deepEqual(
    ambiguous.changes.map((item) => [item.kind, item.temperature]),
    [["NEW", null]]
  );
  assert.equal(ambiguous.unchanged.length, 2);
});

test(
  "owner HTTP scan, menu registration and selected diff persist to MySQL",
  { skip: !process.env.MENU_BOARD_TEST_DB },
  async (t) => {
    assert.match(process.env.DB_NAME ?? "", /^coffee_features_test_\d+$/);
    const { app } = require("../dist/app");
    const { pool } = require("../dist/config/db");
    const { signAccessToken } = require("../dist/modules/auth/tokens");
    const sessionId = randomUUID();
    const token = signAccessToken({ userId: 1, role: "OWNER", sessionId });
    await pool.query("UPDATE cafes SET owner_id=1 WHERE cafe_id=2");
    await pool.execute(
      "INSERT INTO refresh_tokens(user_id,token_hash,session_id,expires_at) VALUES (1,?,?,?)",
      [
        randomBytes(32).toString("hex"),
        sessionId,
        new Date(Date.now() + 3600000),
      ]
    );
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (path, body, auth = true) => {
      const response = await fetch(base + path, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(auth ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, ...(await response.json()) };
    };
    const owner = "/api/owner";
    const scan = owner + "/menu-board/scan";
    const cafeId = "2";
    try {
      const linked = await call(owner + "/me");
      assert.equal(linked.status, 200, linked.message);
      assert.equal(linked.data.cafe.id, cafeId);
      assert.equal(
        (await call(scan, { cafeId, images: [photo] }, false)).status,
        401
      );
      assert.equal(
        (await call(scan, { cafeId: "1", images: [photo] })).status,
        403
      );
      assert.equal((await call(scan, { cafeId, images: [photo] })).status, 503);
      t.mock.method(ocr, "readMenuPhotos", async () =>
        ocr.parseMenuBoard(result)
      );
      assert.equal(
        (await call(scan, { cafeId, images: [photo] })).data.items.length,
        3
      );
      const latte = {
        name: "카페라떼",
        price: 2900,
        category: "COFFEE",
        temperature: "HOT",
        size: "Regular",
      };
      assert.equal(
        (await call(owner + "/menus/bulk", { cafeId, items: [latte] })).data
          .count,
        1
      );
      const diff = (
        await call(owner + "/menu-board/diff", { cafeId, images: [photo] })
      ).data;
      const change = diff.changes.find((item) => item.kind === "PRICE_CHANGED");
      assert.equal(change.previousPrice, 3000);
      assert.equal(
        (await call(owner + "/menus/apply-diff", { cafeId, changes: [change] }))
          .data.applied,
        1
      );
      assert.equal(
        (await call(owner + "/menus/apply-diff", { cafeId, changes: [change] }))
          .status,
        409
      );
      const unresolved = (await call(owner + '/menu-board/diff', {cafeId,images:[photo]})).data;
      const candidate = unresolved.changes.find(item=>item.name==='카페라떼' && item.kind==='NEW');
      const target = candidate.existingOptions.find(item=>item.temperature==='HOT');
      assert.ok(target);
      const corrected = await call(owner+'/menus/apply-diff', {cafeId,changes:[{...target,kind:'PRICE_CHANGED',previousPrice:target.price,price:3100}]});
      assert.equal(corrected.status,200,corrected.message);
      const options = (await call("/api/cafes/2/menus")).data;
      assert.equal(options.filter(item=>item.name==='카페라떼').length,1);
      assert.ok(
        options.some(
          (item) =>
            item.name === "카페라떼" && item.price === 3100 && item.available
        )
      );
      assert.ok(
        options.some(
          (item) =>
            item.name === "아메리카노" &&
            item.price === 2000 &&
            item.source === "OWNER"
        )
      );
      assert.ok(!options.some((item) => item.name === "캐모마일티"));
      const recommended = await call("/api/recommendations/search", {
        conditions: { maxPrice: 2100 },
      });
      assert.equal(recommended.status, 200, recommended.message);
      const ownerPrice = recommended.data.items.find(
        (item) => item.cafe.id === cafeId
      ).matchedMenu;
      assert.equal(ownerPrice.price, 2000);
      assert.equal(ownerPrice.source, "OWNER");
      assert.equal(ownerPrice.isDemo, false);
      assert.match(ownerPrice.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
      const mvp = await call("/api/recommendations/mvp/search", {
        constraints: {
          menu_code: "AMERICANO",
          temperature: "ICE",
          max_price_krw: 2100,
        },
      });
      assert.equal(mvp.status, 200, mvp.message);
      assert.ok(
        mvp.data.recommendations.some(
          (item) =>
            item.cafe_id === cafeId &&
            item.source === "OWNER" &&
            item.price_krw === 2000
        )
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  }
);

test("decimal menu prices preserve a manual candidate when the currency unit is unknown", () => {
  const parsed = ocr.parseMenuBoard({
    images: [
      {
        inferResult: "SUCCESS",
        fields: [field("카페라떼", 20, 30), field("3.5", 300, 30)],
      },
    ],
  });
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].price, null);
  assert.equal(parsed[0].confidence, 0);
  assert.match(parsed[0].note, /가격 단위/);
  const current = [
    {
      name: "카페라떼",
      menuId: "1",
      category: "COFFEE",
      size: "Regular",
      temperature: "HOT",
      price: 3000,
      available: true,
    },
  ];
  const diff = menuDifference([{ ...parsed[0], temperature: "HOT" }], current);
  assert.equal(diff.changes[0].kind, "PRICE_CHANGED");
  assert.equal(diff.changes[0].price, null);
});

test("decimal prices use an explicit thousand-won unit without changing ordinary won amounts", () => {
  const items = ocr.parseMenuBoard({
    images: [
      {
        inferResult: "SUCCESS",
        fields: [
          field("단위:", 20, 10),
          field("천원", 100, 10),
          field("카페라떼", 20, 40),
          field("3.5", 300, 40),
          field("바닐라라떼", 20, 70),
          field("4.90", 300, 70),
          field("아메리카노", 20, 100),
          field("2,000", 300, 100),
        ],
      },
    ],
  });
  assert.deepEqual(
    items.map((x) => x.price),
    [3500, 4900, 2000]
  );
  assert.ok(items.every((x) => x.confidence > 0.8));
});


test('missing size and temperature offer explicit existing targets without guessing', () => {
 const option=(menuId,size,temperature)=>({menuId,name:'카페라떼',category:'COFFEE',size,temperature,price:4000,available:true});
 const current=[option('10','Regular','HOT'),option('11','Large','ICE')];
 const diff=menuDifference([{name:'카페라떼',category:'COFFEE',size:null,temperature:null,price:4500,confidence:.99}],current);
 assert.equal(diff.changes[0].kind,'NEW');
 assert.deepEqual(diff.changes[0].existingOptions.map(x=>x.menuId),['10','11']);
 assert.equal(diff.unchanged.length,2);
});

test('explicit thousand-won menus retain both short integers and decimals', () => {
 const parsed=ocr.parseMenuBoard({images:[{inferResult:'SUCCESS',fields:[field('단위: 천원',0,0),field('아메리카노',0,30),field('4',300,30),field('카페라떼',0,60),field('4.5',300,60)]}]});
 assert.deepEqual(parsed.map(x=>x.price),[4000,4500]);
 const unknown=ocr.parseMenuBoard({images:[{inferResult:'SUCCESS',fields:[field('아메리카노',0,30),field('4',300,30)]}]});
 assert.equal(unknown.length,0);
});
