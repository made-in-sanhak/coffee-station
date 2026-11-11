import { create } from 'zustand';
import { native } from '../app/native';
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  type Purchase,
} from '../app/domain';

const KEY = 'coffee.personal.v1';
const READ_ERROR =
  '개인 기록을 읽지 못했습니다. 원본은 유지되며 다시 불러올 때까지 저장할 수 없습니다.';
const SHAPE_ERROR = '개인 기록의 데이터 형식이 올바르지 않습니다.';
export type CarSkinLevel = 1 | 3 | 4 | 6;
interface PersonalData {
  preferences: Preferences;
  purchases: Purchase[];
  favoriteIds: string[];
  onboarded: boolean;
  selectedCarSkinLevel: CarSkinLevel | null;
}
interface PersonalState extends PersonalData {
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  setPreferences: (value: Preferences) => Promise<void>;
  addPurchase: (value: Purchase) => Promise<void>;
  addPurchases: (value: Purchase[]) => Promise<void>;
  removePurchase: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setCarSkinLevel: (level: CarSkinLevel) => Promise<void>;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(SHAPE_ERROR);
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(SHAPE_ERROR);
  return value;
}
function strings(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error(SHAPE_ERROR);
  return value.map(text);
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(SHAPE_ERROR);
  return value;
}
function preferences(value: unknown, partial: boolean): Preferences {
  const source = object(value);
  const list = (
    key: 'menus' | 'purposes' | 'tastes' | 'sizes' | 'temperatures',
  ) =>
    strings(
      source[key] === undefined && partial
        ? DEFAULT_PREFERENCES[key]
        : source[key],
    );
  const travelMode =
    source.travelMode === undefined && partial
      ? DEFAULT_PREFERENCES.travelMode
      : source.travelMode;
  if (travelMode !== 'walk' && travelMode !== 'drive')
    throw new Error(SHAPE_ERROR);
  const price =
    source.priceMax === undefined && partial
      ? DEFAULT_PREFERENCES.priceMax
      : source.priceMax;
  return {
    menus: list('menus'),
    priceMax: price === null ? null : number(price),
    purposes: list('purposes'),
    tastes: list('tastes'),
    sizes: list('sizes'),
    temperatures: list('temperatures'),
    travelMode,
    travelMinutes: number(
      source.travelMinutes === undefined && partial
        ? DEFAULT_PREFERENCES.travelMinutes
        : source.travelMinutes,
    ),
    ...(source.cafeTypes === undefined
      ? {}
      : { cafeTypes: strings(source.cafeTypes) }),
  };
}
function purchase(value: unknown): Purchase {
  const source = object(value);
  const quantity = number(source.quantity);
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    typeof source.verified !== 'boolean' ||
    typeof source.source !== 'string' ||
    !['manual', 'ocr', 'order'].includes(source.source)
  )
    throw new Error(SHAPE_ERROR);
  if (source.source === 'manual' && source.verified)
    throw new Error(SHAPE_ERROR);
  const purchasedAt = text(source.purchasedAt);
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(purchasedAt) ||
    !Number.isFinite(Date.parse(purchasedAt))
  )
    throw new Error(SHAPE_ERROR);
  return {
    id: text(source.id),
    cafeName: text(source.cafeName),
    menuName: text(source.menuName),
    quantity,
    unitPrice: number(source.unitPrice),
    total: number(source.total),
    purchasedAt,
    caffeineMg: source.caffeineMg === null ? null : number(source.caffeineMg),
    source: source.source as Purchase['source'],
    verified: source.verified,
    ...(source.cafeId === undefined ? {} : { cafeId: text(source.cafeId) }),
    ...(source.receiptId === undefined
      ? {}
      : { receiptId: text(source.receiptId) }),
  };
}
function purchases(value: unknown): Purchase[] {
  if (!Array.isArray(value)) throw new Error(SHAPE_ERROR);
  const result = value.map(purchase);
  if (new Set(result.map(item => item.id)).size !== result.length)
    throw new Error(SHAPE_ERROR);
  return result;
}
function carSkin(value: unknown): CarSkinLevel | null {
  if (value === null || value === undefined) return null;
  if (value !== 1 && value !== 3 && value !== 4 && value !== 6)
    throw new Error(SHAPE_ERROR);
  return value;
}
function defaults(): PersonalData {
  return {
    preferences: preferences(DEFAULT_PREFERENCES, false),
    purchases: [],
    favoriteIds: [],
    onboarded: false,
    selectedCarSkinLevel: null,
  };
}
function personalData(value: unknown): PersonalData {
  const source = object(value);
  if (source.onboarded !== undefined && typeof source.onboarded !== 'boolean')
    throw new Error(SHAPE_ERROR);
  return {
    preferences:
      source.preferences === undefined
        ? defaults().preferences
        : preferences(source.preferences, true),
    purchases:
      source.purchases === undefined ? [] : purchases(source.purchases),
    favoriteIds:
      source.favoriteIds === undefined
        ? []
        : [...new Set(strings(source.favoriteIds))],
    onboarded: source.onboarded === true,
    selectedCarSkinLevel: carSkin(source.selectedCarSkinLevel),
  };
}
let writes: Promise<void> = Promise.resolve();
let revision = 0;
let hydration: Promise<void> | null = null;
function snapshot(): PersonalData {
  const {
    preferences: currentPreferences,
    purchases: currentPurchases,
    favoriteIds,
    onboarded,
    selectedCarSkinLevel,
  } = usePersonalStore.getState();
  return {
    preferences: currentPreferences,
    purchases: currentPurchases,
    favoriteIds,
    onboarded,
    selectedCarSkinLevel,
  };
}
function update(change: (value: PersonalData) => PersonalData): Promise<void> {
  const task = writes.then(async () => {
    if (!usePersonalStore.getState().hydrated)
      throw new Error(
        usePersonalStore.getState().error ?? '저장한 기록을 불러오는 중입니다.',
      );
    const value = personalData(change(personalData(snapshot())));
    await native.secureSet(KEY, JSON.stringify(value));
    revision++;
    usePersonalStore.setState({ ...value, hydrated: true, error: null });
  });
  writes = task.catch(() => {});
  return task;
}
export const usePersonalStore = create<PersonalState>(set => ({
  ...defaults(),
  hydrated: false,
  error: null,
  hydrate: () => {
    if (hydration) return hydration;
    const current = revision;
    hydration = (async () => {
      await writes;
      if (current !== revision) return;
      try {
        const raw = await native.secureGet(KEY);
        const value = raw === null ? defaults() : personalData(JSON.parse(raw));
        if (current === revision)
          set({ ...value, hydrated: true, error: null });
      } catch {
        if (current === revision)
          set({ ...defaults(), hydrated: false, error: READ_ERROR });
      }
    })().finally(() => {
      hydration = null;
    });
    return hydration;
  },
  setPreferences: async input => {
    const next = preferences(input, false);
    await update(value => ({ ...value, preferences: next, onboarded: true }));
  },
  addPurchase: async input => {
    const next = purchase(input);
    await update(value => ({
      ...value,
      purchases: [...value.purchases.filter(item => item.id !== next.id), next],
    }));
  },
  addPurchases: async input => {
    const next = purchases(input),
      ids = new Set(next.map(item => item.id));
    await update(value => ({
      ...value,
      purchases: [
        ...value.purchases.filter(item => !ids.has(item.id)),
        ...next,
      ],
    }));
  },
  removePurchase: async input => {
    const id = text(input);
    await update(value => ({
      ...value,
      purchases: value.purchases.filter(item => item.id !== id),
    }));
  },
  setCarSkinLevel: async input => {
    const level = carSkin(input);
    if (level === null) throw new Error(SHAPE_ERROR);
    await update(value => ({ ...value, selectedCarSkinLevel: level }));
  },
  toggleFavorite: async input => {
    const id = text(input);
    await update(value => ({
      ...value,
      favoriteIds: value.favoriteIds.includes(id)
        ? value.favoriteIds.filter(item => item !== id)
        : [...value.favoriteIds, id],
    }));
  },
}));
