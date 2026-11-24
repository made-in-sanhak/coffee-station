import type { ReceiptDraft, ReceiptItem } from '../../app/domain';

type Word = {
  text: string;
  lineBreak: boolean;
  x: number;
  y: number;
  height: number;
};
const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;

function readWords(value: unknown): Word[] {
  const images = object(value)?.images;
  const image =
    Array.isArray(images) && images.length === 1
      ? object(images[0])
      : undefined;
  if (
    !image ||
    (image.inferResult && image.inferResult !== 'SUCCESS') ||
    !Array.isArray(image.fields)
  ) {
    throw new Error(
      '영수증 한 장의 CLOVA General OCR 결과 JSON을 입력해 주세요.',
    );
  }
  return image.fields.flatMap((value: unknown) => {
    const field = object(value);
    if (typeof field?.inferText !== 'string' || !field.inferText.trim())
      return [];
    const vertices = object(field.boundingPoly ?? field.bounding)?.vertices;
    const points = Array.isArray(vertices) ? vertices.map(object) : [];
    const valid =
      points.length === 4 &&
      points.every(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
    const xs = valid ? points.map(p => Number(p?.x)) : [];
    const ys = valid ? points.map(p => Number(p?.y)) : [];
    return [
      {
        text: field.inferText.trim(),
        lineBreak: field.lineBreak === true,
        x: valid ? Math.min(...xs) : NaN,
        y: valid ? (Math.min(...ys) + Math.max(...ys)) / 2 : NaN,
        height: valid ? Math.max(...ys) - Math.min(...ys) : 0,
      },
    ];
  });
}

function groupRows(words: Word[]): Word[][] {
  if (!words.every(word => word.height > 0)) {
    if (!words.some(word => word.lineBreak)) return words.map(word => [word]);
    const rows: Word[][] = [[]];
    for (const word of words) {
      rows[rows.length - 1].push(word);
      if (word.lineBreak) rows.push([]);
    }
    return rows.filter(row => row.length);
  }
  const rows: Word[][] = [];
  for (const word of [...words].sort((a, b) => a.y - b.y)) {
    const row = rows[rows.length - 1];
    if (row && word.y - row[0].y <= Math.min(word.height, row[0].height) * 0.65)
      row.push(word);
    else rows.push([word]);
  }
  return rows.map(row => row.sort((a, b) => a.x - b.x));
}

const datePattern =
  /\b(20\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\s+(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?/;
const totalPattern =
  /^(?:합\s*계(?:\s*금\s*액)?|총\s*(?:결\s*제\s*)?금\s*액|결\s*제\s*금\s*액|받\s*을\s*금\s*액)\s*[:：]?\s*/;
const won = (value: string): number | undefined => {
  if (!/^(?:\d{1,9}|\d{1,3}(?:,\d{3}){1,2})\s*원?$/.test(value))
    return undefined;
  return Number(value.replace(/[,\s원]/g, ''));
};

function readItems(rows: Word[][], lines: string[]): ReceiptItem[] {
  const header = lines.findIndex(
    line =>
      /상품명|품목명|메뉴명/.test(line) &&
      /수량/.test(line) &&
      /금액/.test(line),
  );
  if (header < 0) return [];
  const quantityHeader = rows[header].find(word => word.text === '수량');
  const amountHeader = [...rows[header]]
    .reverse()
    .find(word => /금액/.test(word.text));
  if (!quantityHeader || !amountHeader || !Number.isFinite(quantityHeader.x))
    return [];
  const items: ReceiptItem[] = [];
  for (let i = header + 1; i < rows.length; i++) {
    if (
      /부\s*가\s*세|과세|공급가|결제수단/.test(lines[i]) ||
      totalPattern.test(lines[i])
    )
      break;
    const row = rows[i];
    const numbers = row.filter(word => won(word.text) !== undefined);
    const quantityWord = [...numbers].sort(
      (a, b) =>
        Math.abs(a.x - quantityHeader.x) - Math.abs(b.x - quantityHeader.x),
    )[0];
    const amountWord = numbers[numbers.length - 1];
    if (
      !quantityWord ||
      quantityWord === amountWord ||
      Math.abs(quantityWord.x - quantityHeader.x) > quantityHeader.height * 2 ||
      Math.abs(amountWord.x - amountHeader.x) > amountHeader.height * 2
    )
      continue;
    const quantity = won(quantityWord.text) ?? 0;
    const amount = won(amountWord.text) ?? 0;
    const menuName = row
      .slice(0, row.indexOf(numbers[0]))
      .map(word => word.text)
      .join(' ')
      .replace(/^\[(?:포장|매장)\]\s*/, '')
      .replace(/^\(ICE\)\s*/i, '아이스 ');
    if (
      !menuName ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99 ||
      amount <= 0 ||
      amount % quantity !== 0
    )
      continue;
    const previous = items[items.length - 1];
    if (
      /^샷\s*추가$/.test(menuName) &&
      previous?.quantity === quantity &&
      /아메리카노/.test(previous.menuName)
    ) {
      previous.menuName += ` + ${menuName}`;
      previous.unitPrice += amount / quantity;
    } else {
      items.push({
        menuName,
        quantity,
        unitPrice: amount / quantity,
        caffeineMg: null,
      });
    }
  }
  return items;
}

export function clovaReceiptDraft(value: unknown): ReceiptDraft {
  const words = readWords(value);
  if (!words.length) throw new Error('OCR 결과에 인식된 글자가 없어요.');
  const rows = groupRows(words);
  const lines = rows.map(row => row.map(word => word.text).join(' '));
  const date = lines.map(line => line.match(datePattern)).find(Boolean);
  let purchasedAt = '';
  if (date) {
    const [, year, month, day, hour, minute, second = '00'] = date;
    const pad = (part: string) => part.padStart(2, '0');
    const local = `${year}-${pad(month)}-${pad(day)}T${pad(
      hour,
    )}:${minute}:${second}`;
    const time = new Date(`${local}+09:00`);
    if (
      Number.isFinite(time.getTime()) &&
      new Date(time.getTime() + 9 * 3600000).toISOString().startsWith(local)
    ) {
      purchasedAt = time.toISOString();
    }
  }
  const storeName =
    lines
      .slice(0, 12)
      .find(
        line =>
          line.length <= 100 &&
          /커피|카페|coffee|caf[eé]|(?:\p{L}{2,}점)(?:\s|$)/iu.test(line) &&
          !/사업자|주소|상품명|https?:|^\[/.test(line),
      ) ?? '';
  const items = readItems(rows, lines);
  const total = lines.flatMap((line, index) => {
    const label = line.match(totalPattern);
    if (!label) return [];
    const amount = won(
      line.slice(label[0].length).trim() || lines[index + 1] || '',
    );
    return amount === undefined ? [] : [amount];
  })[0];
  if (!storeName && !purchasedAt && !items.length && total === undefined) {
    throw new Error(
      '영수증에서 매장명, 결제 일시, 상품 또는 금액을 찾지 못했어요.',
    );
  }
  return {
    storeName,
    purchasedAt,
    items,
    total: total ?? 0,
    scanned: true,
    verified: false,
  };
}
