import { randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../../common/AppError";
import { ocrUsageDirectory } from "../../config/ocrUsage";
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
  note?: string;
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

function classifyMenu(name: string): Category | null {
  return /디카페인|decaf/i.test(name)
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
}

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
  // General OCR may split a monetary suffix into its own field. Normalize
  // adjacent tokens before unit detection, menu boundaries, and price columns.
  for (const row of rows) {
    // Normalize combined name/price fields as well as numeric-only fields.
    // Keeping their relative order makes every later stage independent of OCR
    // token boundaries, including HOT/ICE columns and adjacent menu pairs.
    for (let i=0;i<row.length;i++) {
      const word=row[i];
      const combined=word.name.match(/^(.*?)\s+(\d{1,9}|\d{1,3}(?:,\d{3})+|\d{1,3}\.\d{1,2})\s*(원)?$/);
      if (combined?.[1]) {
        row.splice(i,1,{...word,name:combined[1].trim()},
          {...word,name:combined[2]+(combined[3]||""),x:word.x+0.01});
        i++;
      }
    }
    row.sort((a,b)=>a.x-b.x);
    for (let i=1;i<row.length;i++) {
      if (row[i].name === "원" && /^(?:\d{1,9}|\d{1,3}(?:,\d{3})+|\d{1,3}\.\d{1,2})$/.test(row[i-1].name)) {
        row[i-1] = {...row[i-1], name: row[i-1].name + "원",
          confidence: Math.min(row[i-1].confidence,row[i].confidence)};
        row.splice(i,1);
        i--;
      }
    }
  }
  const items: MenuCandidate[] = [];
  // Decimal menu prices are often expressed in thousands of won. Convert only
  // when this image states the unit; otherwise preserve a manual-review item.
  const thousandWon = /단위\s*[:：]?\s*(?:천\s*원|1[,.]?000\s*원)/i.test(
    rows
      .map((row) =>
        [...row]
          .sort((a, b) => a.x - b.x)
          .map((word) => word.name)
          .join(" ")
      )
      .join("\n")
  );
    const pricePattern = thousandWon
        ? /^(?:(.*?)\s+)?(\d{1,3}(?:,\d{3})+|\d{1,3}\.\d{1,2}|\d{1,7})\s*(원)?$/
        : /^(?:(.*?)\s+)?(\d{1,3}(?:,\d{3})+|\d{1,3}\.\d{1,2}|\d{3,7}|\d{1,2}(?=\s*원$))\s*(원)?$/;
  let temperatures: string[] = [];
  const expanded: Word[][] = [];
  for (const row of rows) {
    const words = [...row].sort((a,b)=>a.x-b.x);
    const headers = words.filter(word=>/^(HOT|ICE|ICED)$/i.test(word.name));
    if (headers.length === 2 && new Set(headers.map(w=>w.name.toUpperCase().replace('ICED','ICE'))).size === 2) {
      temperatures = headers.map(w=>w.name.toUpperCase().replace('ICED','ICE'));
      continue;
    }
    // A new text label between prices begins a different menu, even when both
    // menus are on the same horizontal line. Split those pairs before columns.
    const priceIndexes = words.flatMap((word,i)=>{const m=word.name.match(pricePattern);return m&&!m[1]?[i]:[];});
    const segments: Word[][] = [];
    let begin = 0;
    for (let i=0;i<priceIndexes.length-1;i++) {
      const left=priceIndexes[i],right=priceIndexes[i+1];
      if (words.slice(left+1,right).some(word=>/\p{L}/u.test(word.name))) {
        segments.push(words.slice(begin,left+1));begin=left+1;
      }
    }
    segments.push(words.slice(begin));
    for (const ordered of segments) {
      const prices = ordered.filter(word=>{const m=word.name.match(pricePattern);return m&&!m[1];});
      const first = prices.length ? ordered.indexOf(prices[0]) : -1;
      if (prices.length === 2 && first > 0 && temperatures.length === 2) {
        for (let i=0;i<2;i++) expanded.push([...ordered.slice(0,first), {...prices[i],name:temperatures[i],x:prices[i].x-1},prices[i]]);
      } else if (prices.length > 1 && first > 0 && !ordered.some(word=>word.name === "/")) {
        const name=ordered.slice(0,first).map(w=>w.name).join(' ');
        items.push({name,category:classifyMenu(name),size:null,temperature:null,price:null,confidence:0,note:'가격 열을 구분하지 못했어요. 기존 옵션과 가격을 직접 확인해 주세요.'});
      } else expanded.push(ordered);
    }
  }
  for (const ordered of expanded) {
    let names: string[] = [];
    let confidence = 1;
    for (const [index, word] of ordered.entries()) {
      const match = word.name.replace(/^\/\s*/, "").match(pricePattern);
      confidence = Math.min(confidence, Math.max(0, word.confidence));
      if (!match) {
        names.push(word.name);
        continue;
      }
      // A number followed by another price without a new menu label belongs
      // to the current name (e.g. "블렌드 2 / 4.5"), not an earlier price.
      let numberInName = false;
      for (const next of ordered.slice(index + 1)) {
        const following = next.name.replace(/^\/\s*/, "").match(pricePattern);
        if (following) { numberInName = !following[1] && !match[3]; break; }
        if (/\p{L}/u.test(next.name)) break;
      }
      if (numberInName) { names.push(word.name); continue; }
      if (match[1]) names.push(match[1]);
      const raw = names.join(" ");
      const decimal = match[2].includes(".");
      const amount = Number(match[2].replace(/,/g, ""));
      const explicitWon = !!match[3];
      const shortInteger = !explicitWon && thousandWon && /^\d{1,2}$/.test(match[2]);
      const price = explicitWon ? amount : shortInteger ? amount * 1000 : decimal
        ? thousandWon
          ? Math.round(amount * 1000)
          : null
        : amount;
      if (decimal && price === null) confidence = 0;
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
        .replace(/[/:：]\s*$/, "")
        .trim();
      if (
        name &&
        name.length <= 100 &&
        /\p{L}/u.test(name) &&
        !/^(?:합계|총액|전화|사업자|단위)/.test(name) &&
        amount > 0 &&
        (price === null || (Number.isInteger(price) && price >= (explicitWon ? 1 : 100) && price <= 1000000))
      ) {
        const category = classifyMenu(name);
        items.push({
          name,
          category,
          size,
          temperature,
          price,
          confidence,
          ...(decimal && price === null
            ? { note: "가격 단위를 확인해 원 단위로 입력해 주세요." }
            : {}),
        });
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
  const ledger = ocrUsageDirectory();
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
