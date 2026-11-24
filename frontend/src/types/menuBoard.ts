// 점주 메뉴판 OCR 등록·갱신 타입
// TODO(백엔드 협의): 필드 이름·형식은 임시입니다. docs/api.md 확정 후 맞춰주세요.

// 서버와 주고받는 카테고리 코드 (화면 표시는 menuBoardLogic 의 라벨을 씁니다)
export type MenuBoardCategory = 'COFFEE' | 'DECAF' | 'BEVERAGE' | 'TEA';

export type MenuBoardMode = 'register' | 'update';

// 기기에서 고른 사진 (업로드 전)
export interface MenuBoardImage {
  uri: string;
  type: string;
  name: string;
}

// POST /api/owner/menu-board/upload-url 응답: S3 Presigned URL
export interface MenuBoardUploadTicket {
  uploadUrl: string;
  imageKey: string;
  headers?: Record<string, string>;
}

// POST /api/owner/menu-board/scan 응답 항목
export interface MenuBoardScanItem {
  name: string;
  category: MenuBoardCategory | null;
  size: string | null;
  price: number | null;
  // 0~1. OCR_CONFIDENCE_THRESHOLD 미만이면 "확인 필요"
  confidence: number;
  // 서버가 붙이는 짧은 안내 (예: "가격 글자가 흐려요")
  note?: string | null;
}

export interface MenuBoardScanResult {
  items: MenuBoardScanItem[];
}

// POST /api/owner/menus/bulk 요청 항목
export interface MenuBulkItem {
  name: string;
  category: MenuBoardCategory;
  size: string;
  price: number;
}

export type MenuDiffKind = 'PRICE_CHANGED' | 'NEW' | 'MISSING';

// POST /api/owner/menu-board/diff 응답 항목
export interface MenuDiffItem {
  kind: MenuDiffKind;
  // 기존 메뉴 id (NEW 는 없음)
  menuId?: string | null;
  name: string;
  category: MenuBoardCategory | null;
  size: string | null;
  previousPrice: number | null;
  price: number | null;
}

export interface MenuDiffResult {
  changes: MenuDiffItem[];
  unchanged: Array<{ menuId: string; name: string }>;
}

// POST /api/owner/menus/apply-diff 요청: 켜 둔 항목만 보냅니다.
// MISSING 을 반영하면 해당 메뉴를 판매 중지(available=false)로 바꿉니다.
export interface ApplyMenuDiffRequest {
  changes: MenuDiffItem[];
}
