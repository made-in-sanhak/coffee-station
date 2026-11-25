import { randomInt } from "node:crypto";
import { json, Router } from "express";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AppError } from "../../common/AppError";
import { ok } from "../../common/response";
import { pool } from "../../config/db";
import { transaction } from "../../config/transaction";
import { requireAuth } from "../../middlewares/requireAuth";
import { getCafe } from "../cafes/directory";
import { bad, id, integer, object, text } from "../community/validation";
import {
  menuPhotos,
  readMenuPhotos,
  type Category,
  type MenuCandidate,
  type Temperature,
} from "./ocr";

type Option = {
  name: string;
  category: Category;
  size: string;
  temperature: Temperature;
  price: number;
};
type Stored = Option & { menuId: string; available: boolean };
type Db = typeof pool | PoolConnection;
const categories: Category[] = ["COFFEE", "DECAF", "BEVERAGE", "TEA"];
const board = Router();
board.use(requireAuth);

function array(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 100)
    return bad("메뉴는 1~100개까지 입력해 주세요.");
  return value.map(object);
}

function option(row: Record<string, unknown>): Option {
  const name = text(row.name, "메뉴 이름", 100);
  const size = text(row.size, "사이즈", 10);
  const category = row.category as Category;
  const temperature = row.temperature;
  if (!categories.includes(category)) return bad("메뉴 분류를 선택해 주세요.");
  if (temperature !== null && temperature !== "HOT" && temperature !== "ICE")
    return bad("메뉴 온도를 확인해 주세요.");
  return {
    name,
    size,
    category,
    temperature,
    price: integer(row.price, "가격", 1, 1000000),
  };
}

const sizeKey = (size: string) =>
  size === "기본" ? "regular" : size.toLowerCase();
const canonicalName = (name: string) =>
  name.trim().replace(/^(?:아이스\s+|디카페인\s*)+/, "") || name.trim();
const nameKey = (value: Pick<MenuCandidate, "name" | "category">) =>
  JSON.stringify([
    canonicalName(value.name).replace(/\s/g, "").toLowerCase(),
    value.category === "DECAF",
  ]);
const key = (value: Option) =>
  JSON.stringify([nameKey(value), sizeKey(value.size), value.temperature]);

async function ownedCafe(
  db: Db,
  cafeId: string,
  ownerId: number,
  lock = false
) {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT cafe_id FROM cafes WHERE cafe_id=? AND owner_id=?${
      lock ? " FOR UPDATE" : ""
    }`,
    [cafeId, ownerId]
  );
  if (!rows.length)
    throw new AppError(403, "연결된 매장의 메뉴만 관리할 수 있어요.");
}

async function cafesOf(ownerId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT CAST(cafe_id AS CHAR) id,name,address FROM cafes WHERE owner_id=? ORDER BY cafe_id",
    [ownerId]
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    address: String(row.address),
  }));
}

async function storedMenus(db: Db, cafeId: string): Promise<Stored[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT CAST(p.price_id AS CHAR) menuId,
    m.standard_name name,m.category,m.is_decaf,p.size,p.option_name,p.price,p.sale_status
    FROM menu_prices p JOIN menus m ON p.menu_id=m.menu_id WHERE p.cafe_id=? ORDER BY p.price_id`,
    [cafeId]
  );
  return rows.map((row) => ({
    menuId: row.menuId,
    name:
      row.is_decaf && !String(row.name).includes("디카페인")
        ? "디카페인 " + row.name
        : row.name,
    category: row.is_decaf
      ? "DECAF"
      : categories.includes(row.category)
      ? row.category
      : "BEVERAGE",
    size: row.size === "기본" ? "Regular" : row.size,
    temperature:
      row.option_name === "HOT" || row.option_name === "ICE"
        ? row.option_name
        : null,
    price: Number(row.price),
    available: row.sale_status === "ON_SALE",
  }));
}

export function menuDifference(items: MenuCandidate[], current: Stored[]) {
  const active = current.filter((item) => item.available);
  const seen = new Set<string>();
  const changes = [];
  for (const item of items) {
    const compatible = active.filter(
      (other) =>
        nameKey(other) === nameKey(item) &&
        (!item.size || sizeKey(other.size) === sizeKey(item.size)) &&
        (!item.temperature || item.temperature === other.temperature)
    );
    for (const candidate of compatible) seen.add(candidate.menuId);
    const exact = compatible.filter(
      (other) =>
        sizeKey(other.size) === sizeKey(item.size ?? "Regular") &&
        other.temperature === item.temperature
    );
    if (exact.length === 1 && item.price !== exact[0].price) {
      changes.push({
        ...exact[0],
        kind: "PRICE_CHANGED",
        previousPrice: exact[0].price,
        price: item.confidence >= 0.8 ? item.price : null,
      });
    } else if (!exact.length) {
      changes.push({
        ...item,
        size: item.size ?? "Regular",
        kind: "NEW",
        existingOptions: compatible,
        previousPrice: null,
        price: item.confidence >= 0.8 ? item.price : null,
      });
    }
  }
  for (const item of active)
    if (!seen.has(item.menuId))
      changes.push({
        ...item,
        kind: "MISSING",
        previousPrice: item.price,
        price: null,
      });
  const changedIds = new Set(
    changes.flatMap((change) => ("menuId" in change ? [change.menuId] : []))
  );
  const unchanged = active.filter(
    (item) => seen.has(item.menuId) && !changedIds.has(item.menuId)
  );
  return { changes, unchanged };
}

function catalogId() {
  return String(randomInt(1, 2 ** 47 - 1));
}

async function storeOption(
  conn: PoolConnection,
  cafeId: string,
  item: Option,
  current: Stored[]
) {
  const candidates = current.filter((existing) => key(existing) === key(item));
  if (candidates.length > 1)
    throw new AppError(
      409,
      "같은 메뉴 옵션이 여러 개예요. 메뉴 관리에서 확인해 주세요."
    );
  if (candidates.length === 1) {
    const [existing] = candidates;
    await setPrice(conn, cafeId, existing.menuId, item.price);
    return;
  }
  const menuId = catalogId();
  const name = canonicalName(item.name);
  await conn.execute(
    "INSERT INTO menus (menu_id,standard_name,category,is_decaf) VALUES(?,?,?,?)",
    [
      menuId,
      name,
      item.category === "DECAF" ? "COFFEE" : item.category,
      item.category === "DECAF" ? 1 : 0,
    ]
  );
  await conn.execute(
    `INSERT INTO menu_prices (price_id,cafe_id,menu_id,size,option_name,price,source,owner_verified,verified_at,is_new)
    VALUES (?,?,?,?,?,?,'OWNER',1,CURRENT_DATE,1)`,
    [catalogId(), cafeId, menuId, item.size, item.temperature ?? "", item.price]
  );
}

async function setPrice(
  conn: PoolConnection,
  cafeId: string,
  menuId: string,
  price: number
) {
  await conn.execute(
    `UPDATE menu_prices SET price=?,sale_status='ON_SALE',source='OWNER',price_scope='STORE',owner_verified=1,
    verified_at=CURRENT_DATE,updated_at=CURRENT_TIMESTAMP WHERE price_id=? AND cafe_id=?`,
    [price, menuId, cafeId]
  );
}

function distinct(keys: string[]) {
  if (new Set(keys).size !== keys.length)
    return bad("같은 메뉴 옵션이 중복되어 있어요.");
}

board.get("/me", async (_req, res) => {
  const [cafe] = await cafesOf(res.locals.user.id);
  const menuCount = cafe ? (await storedMenus(pool, cafe.id)).length : 0;
  res.json(ok({ linked: !!cafe, cafe: cafe ?? null, menuCount }));
});

board.get("/dashboard", async (req, res) => {
  const owned = await cafesOf(res.locals.user.id);
  const cafeId =
    req.query.cafeId === undefined
      ? owned[0]?.id
      : id(req.query.cafeId, "매장 ID");
  if (cafeId && !owned.some((cafe) => cafe.id === cafeId))
    throw new AppError(403, "연결된 매장만 조회할 수 있어요.");
  const cafes = await Promise.all(owned.map((cafe) => getCafe(cafe.id)));
  const selected = cafes.find((cafe) => cafe.id === cafeId);
  res.json(
    ok({
      cafes,
      selectedCafeId: cafeId,
      menus: selected?.menus ?? [],
      deals: [],
      reviewCount: selected?.reviewCount ?? 0,
      todaySales: 0,
      todayOrders: 0,
      waitingOrders: 0,
    })
  );
});

const photoBody = json({ limit: "28mb" });
for (const action of ["scan", "diff"] as const) {
  board.post("/menu-board/" + action, photoBody, async (req, res) => {
    const body = object(req.body);
    const cafeId = id(body.cafeId, "매장 ID");
    await ownedCafe(pool, cafeId, res.locals.user.id);
    const items = await readMenuPhotos(menuPhotos(body.images));
    const result =
      action === "scan"
        ? { items }
        : menuDifference(items, await storedMenus(pool, cafeId));
    res.set("Cache-Control", "no-store").json(ok(result));
  });
}
board.post("/menus/bulk", json({ limit: "100kb" }), async (req, res) => {
  const body = object(req.body),
    cafeId = id(body.cafeId, "매장 ID");
  const items = array(body.items).map(option);
  distinct(items.map(key));
  await transaction(async (conn) => {
    await ownedCafe(conn, cafeId, res.locals.user.id, true);
    const current = await storedMenus(conn, cafeId);
    for (const item of items) await storeOption(conn, cafeId, item, current);
  });
  res.json(ok({ count: items.length }));
});

board.post("/menus/apply-diff", json({ limit: "100kb" }), async (req, res) => {
  const body = object(req.body),
    cafeId = id(body.cafeId, "매장 ID");
  const changes = array(body.changes);
  await transaction(async (conn) => {
    await ownedCafe(conn, cafeId, res.locals.user.id, true);
    const current = await storedMenus(conn, cafeId);
    const newItems = changes
      .filter((change) => change.kind === "NEW")
      .map(option);
    distinct(newItems.map(key));
    const updates = changes.filter((change) => change.kind !== "NEW");
    distinct(updates.map((change) => id(change.menuId, "메뉴 옵션 ID")));
    for (const change of updates) {
      if (change.kind !== "PRICE_CHANGED" && change.kind !== "MISSING")
        return bad("메뉴 변경 종류를 확인해 주세요.");
      const existing = current.find((item) => item.menuId === change.menuId);
      if (
        !existing ||
        !existing.available ||
        existing.price !== change.previousPrice
      ) {
        throw new AppError(
          409,
          "메뉴가 이미 변경됐어요. 메뉴판을 다시 읽어 주세요."
        );
      }
      if (change.kind === "PRICE_CHANGED") {
        await setPrice(
          conn,
          cafeId,
          existing.menuId,
          integer(change.price, "가격", 1, 1000000)
        );
      } else {
        await conn.execute(
          `UPDATE menu_prices SET sale_status='SOLD_OUT',updated_at=CURRENT_TIMESTAMP WHERE price_id=? AND cafe_id=?`,
          [existing.menuId, cafeId]
        );
      }
    }
    for (const item of newItems) {
      if (current.some((other) => other.available && key(other) === key(item)))
        throw new AppError(
          409,
          "이미 등록된 메뉴가 있어요. 메뉴판을 다시 읽어 주세요."
        );
      await storeOption(conn, cafeId, item, current);
    }
  });
  res.json(ok({ applied: changes.length }));
});

export default board;
