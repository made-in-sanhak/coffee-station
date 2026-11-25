import { randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../../common/AppError";
import { env } from "../../config/env";
import { bad, object } from "../community/validation";

export type Category = "COFFEE" | "DECAF" | "BEVERAGE" | "TEA";
export type Temperature = "HOT" | "ICE" | null;
export type MenuCandidate = {
  name: string;
  category: Category | null;
  size: string | null;
  temperature: Temperature;
  price: number | null;
  confidence: number;
};
const maxImage = 10 * 1024 * 1024;
const maxUpload = 20 * 1024 * 1024;

export function menuPhotos(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5)
    return bad("메뉴판 사진을 1~5장 선택해 주세요.");
  let total = 0;
  return value.map((entry) => {
    const { type, base64 } = object(entry);
    if (
      typeof base64 !== "string" ||
      base64.length > 4 * Math.ceil(maxImage / 3) ||
      !base64.length ||
      base64.length % 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
    ) {
      return bad("10MB 이하의 JPEG 또는 PNG를 선택해 주세요.");
    }
    const data = Buffer.from(base64, "base64");
    const jpg =
      type === "image/jpeg" &&
      data.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    const png =
      type === "image/png" &&
      data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    if ((!jpg && !png) || data.length > maxImage)
      return bad("10MB 이하의 JPEG 또는 PNG를 선택해 주세요.");
    total += data.length;
    if (total > maxUpload) return bad("사진 용량 합계는 20MB까지 가능해요.");
    return { format: jpg ? "jpg" : "png", data: base64, name: "menu-board" };
  });
}

type Word = {
  name: string;
  x: number;
  y: number;
  height: number;
  confidence: number;
};

export function parseMenuBoard(value: unknown): MenuCandidate[] {
  const root = object(value);
  const image = Array.isArray(root.images) && root.images[0];
  if (!image || image.inferResult !== "SUCCESS" || !Array.isArray(image.fields))
    return [];
  const words: Word[] = [];
  for (const field of image.fields) {
    if (
      typeof field?.inferText !== "string" ||
      !Array.isArray(field.boundingPoly?.vertices)
    )
      continue;
    const vertices: { x: number; y: number }[] = field.boundingPoly.vertices;
    if (
      vertices.length !== 4 ||
      vertices.some((p) => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))
    )
      continue;
    const name = field.inferText.trim();
    const y = Math.min(...vertices.map((p) => p.y));
    const height = Math.max(...vertices.map((p) => p.y)) - y;
    if (!name || height <= 0) continue;
    words.push({
      name,
      x: Math.min(...vertices.map((p) => p.x)),
      y: y + height / 2,
      height,
      confidence:
        typeof field.inferConfidence === "number" ? field.inferConfidence : 0,
    });
  }
  const rows: Word[][] = [];
  for (const word of words.sort((a, b) => a.y - b.y)) {
    const row = rows[rows.length - 1];
    if (row && word.y - row[0].y <= Math.min(row[0].height, word.height) * 0.6)
      row.push(word);
    else rows.push([word]);
  }
  const items: MenuCandidate[] = [];
  for (const row of rows) {
    const ordered = row.sort((a, b) => a.x - b.x);
    let names: string[] = [];
    let confidence = 1;
    for (const word of ordered) {
      const match = word.name.match(
        /^(?:(.*?)\s+)?(\d{1,3}(?:,\d{3})+|\d{3,7})\s*원?$/
      );
      confidence = Math.min(confidence, Math.max(0, word.confidence));
      if (!match) {
        names.push(word.name);
        continue;
      }
      if (match[1]) names.push(match[1]);
      const raw = names.join(" ");
      const price = Number(match[2].replace(/,/g, ""));
      const temperature = /(?:\bICE[D]?\b|아이스|콜드브루)/i.test(raw)
        ? "ICE"
        : /\bHOT\b|핫/.test(raw.toUpperCase())
        ? "HOT"
        : null;
      const size = /\bLARGE\b|라지/i.test(raw)
        ? "Large"
        : /\bREGULAR\b|레귤러|기본/i.test(raw)
        ? "Regular"
        : null;
      const name = raw
        .replace(/\b(?:HOT|ICE[D]?|LARGE|REGULAR)\b/gi, "")
        .replace(/[()\[\]]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (
        name &&
        name.length <= 100 &&
        /\p{L}/u.test(name) &&
        !/^(?:합계|총액|전화|사업자)/.test(name) &&
        price >= 100 &&
        price <= 1000000
      ) {
        const category = /디카페인|decaf/i.test(name)
          ? "DECAF"
          : /아메리카노|라[떼테]|커피|모카|카푸치노|콜드브루|espresso|coffee|latte/i.test(
              name
            )
          ? "COFFEE"
          : /에이드|주스|스무디|초코|ade|juice/i.test(name)
          ? "BEVERAGE"
          : /티$|차$|\btea\b/i.test(name)
          ? "TEA"
          : null;
        items.push({ name, category, size, temperature, price, confidence });
      }
      names = [];
      confidence = 1;
    }
  }
  return items;
}

async function reserve(
  directory: string,
  month: string,
  limit: number,
  count: number
) {
  const folder = path.join(directory, month);
  const reserved: string[] = [];
  const releaseUnused = () =>
    Promise.allSettled(reserved.map((marker) => unlink(marker)));
  try {
    await mkdir(folder, { recursive: true });
    for (let i = 1; i <= limit && reserved.length < count; i++) {
      try {
        const filename = path.join(folder, String(i));
        const marker = await open(filename, "wx");
        reserved.push(filename);
        await marker.close();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    }
  } catch {
    await releaseUnused();
    throw new AppError(503, "OCR 사용 한도를 확인할 수 없어요.");
  }
  if (reserved.length !== count) {
    await releaseUnused();
    throw new AppError(429, "이번 달 OCR 한도로 사진을 모두 읽을 수 없어요.");
  }
}

export async function readMenuPhotos(photos: ReturnType<typeof menuPhotos>) {
  const month = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
  const limit = Number(process.env.CLOVA_OCR_CALL_LIMIT);
  const ledger = process.env.MENU_BOARD_OCR_USAGE_DIR;
  const url = URL.parse(process.env.CLOVA_OCR_URL ?? "");
  const secret = process.env.CLOVA_OCR_SECRET?.trim();
  if (
    env.nodeEnv !== "development" ||
    env.host !== "127.0.0.1" ||
    process.env.CLOVA_OCR_BUDGET_MONTH !== month ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !ledger ||
    !path.isAbsolute(ledger) ||
    !url ||
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".apigw.ntruss.com") ||
    !url.pathname.endsWith("/general") ||
    !secret
  ) {
    throw new AppError(
      503,
      "메뉴판 사진 인식이 아직 활성화되지 않았어요. 직접 입력할 수 있어요."
    );
  }
  await reserve(ledger, month, limit, photos.length);
  let pages: MenuCandidate[][];
  try {
    pages = await Promise.all(
      photos.map(async (photo) => {
        const response = await fetch(url, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(14500),
          headers: {
            "Content-Type": "application/json",
            "X-OCR-SECRET": secret,
          },
          body: JSON.stringify({
            version: "V2",
            requestId: randomUUID(),
            timestamp: Date.now(),
            lang: "ko",
            enableTableDetection: false,
            images: [photo],
          }),
        });
        if (!response.ok) throw new Error("OCR response error");
        return parseMenuBoard(await response.json());
      })
    );
  } catch {
    throw new AppError(502, "메뉴판 인식 서비스에 연결하지 못했어요.");
  }
  if (pages.some((page) => !page.length))
    throw new AppError(
      422,
      "일부 사진에서 메뉴와 가격을 읽지 못했어요. 사진을 확인해 주세요."
    );
  const items = new Map<string, MenuCandidate>();
  for (const item of pages.flat()) {
    const key = JSON.stringify([
      item.name.replace(/\s/g, ""),
      item.size,
      item.temperature,
    ]);
    const existing = items.get(key);
    if (!existing) items.set(key, item);
    else if (existing.price !== item.price)
      items.set(key, { ...item, price: null, confidence: 0 });
  }
  if (items.size > 100)
    throw new AppError(
      422,
      "한 번에 메뉴 100개까지 읽을 수 있어요. 사진을 나누어 올려 주세요."
    );
  return [...items.values()];
}
