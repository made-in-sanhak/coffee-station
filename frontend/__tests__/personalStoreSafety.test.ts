import { NativeModules } from 'react-native';
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  type Purchase,
} from '../src/app/domain';
import { usePersonalStore } from '../src/store/personalStore';

const record: Purchase = {
  id: 'local-test',
  cafeName: '테스트 카페',
  menuName: '아메리카노',
  quantity: 1,
  unitPrice: 2000,
  total: 2000,
  caffeineMg: null,
  purchasedAt: '2026-10-13T08:42:00.000Z',
  source: 'manual',
  verified: false,
};
const defaults = () => ({
  ...DEFAULT_PREFERENCES,
  menus: [...DEFAULT_PREFERENCES.menus],
  purposes: [],
  tastes: [],
  sizes: [...DEFAULT_PREFERENCES.sizes],
  temperatures: [...DEFAULT_PREFERENCES.temperatures],
});
beforeEach(() => {
  NativeModules.CoffeeDevice = {
    secureGet: jest.fn().mockResolvedValue(null),
    secureSet: jest.fn().mockResolvedValue(undefined),
  };
  usePersonalStore.setState({
    preferences: defaults(),
    purchases: [],
    favoriteIds: [],
    onboarded: false,
    hydrated: false,
    selectedCarSkinLevel: null,
    error: null,
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});

test('exact corrupted JSON case is replaced by safe defaults without overwriting encrypted storage', async () => {
  (NativeModules.CoffeeDevice.secureGet as jest.Mock).mockResolvedValue(
    JSON.stringify({
      preferences: { menus: 42 },
      purchases: [null],
      onboarded: true,
    }),
  );
  await usePersonalStore.getState().hydrate();
  expect(usePersonalStore.getState().preferences).toEqual(defaults());
  expect(usePersonalStore.getState().purchases).toEqual([]);
  expect(usePersonalStore.getState().hydrated).toBe(false);
  expect(usePersonalStore.getState().error).toContain('개인 기록');
  expect(NativeModules.CoffeeDevice.secureSet).not.toHaveBeenCalled();
  await expect(
    usePersonalStore.getState().addPurchase(record),
  ).rejects.toThrow();
});

test.each([
  '[null]',
  'null',
  '{"purchases":[null]}',
  '{"preferences":{"travelMinutes":"ten"}}',
])('invalid stored shape %s remains read-only and recoverable', async raw => {
  (NativeModules.CoffeeDevice.secureGet as jest.Mock).mockResolvedValue(raw);
  await usePersonalStore.getState().hydrate();
  expect(usePersonalStore.getState().hydrated).toBe(false);
  expect(usePersonalStore.getState().error).not.toBeNull();
  expect(NativeModules.CoffeeDevice.secureSet).not.toHaveBeenCalled();
  (NativeModules.CoffeeDevice.secureGet as jest.Mock).mockResolvedValue(
    JSON.stringify({
      preferences: defaults(),
      purchases: [record],
      favoriteIds: ['cafe-1'],
      onboarded: true,
    }),
  );
  await usePersonalStore.getState().hydrate();
  expect(usePersonalStore.getState().purchases).toEqual([record]);
  expect(usePersonalStore.getState().error).toBeNull();
});

test('pre-hydration writes cannot replace stored records', async () => {
  await expect(
    usePersonalStore.getState().addPurchase(record),
  ).rejects.toThrow();
  expect(NativeModules.CoffeeDevice.secureSet).not.toHaveBeenCalled();
});

test('invalid preferences and nonfinite purchase values are rejected before persistence', async () => {
  usePersonalStore.setState({ hydrated: true });
  await expect(
    usePersonalStore
      .getState()
      .setPreferences({ ...defaults(), menus: 42 } as unknown as Preferences),
  ).rejects.toThrow();
  await expect(
    usePersonalStore.getState().addPurchase({ ...record, total: NaN }),
  ).rejects.toThrow();
  expect(NativeModules.CoffeeDevice.secureSet).not.toHaveBeenCalled();
  expect(usePersonalStore.getState().purchases).toEqual([]);
});

test('queued records compose after storage acknowledgements and storage failure leaves memory unchanged', async () => {
  usePersonalStore.setState({ hydrated: true });
  let acknowledge!: () => void;
  (NativeModules.CoffeeDevice.secureSet as jest.Mock).mockReturnValueOnce(
    new Promise<void>(resolve => {
      acknowledge = resolve;
    }),
  );
  const first = usePersonalStore.getState().addPurchase(record);
  const second = usePersonalStore
    .getState()
    .addPurchase({ ...record, id: 'local-second' });
  await Promise.resolve();
  expect(usePersonalStore.getState().purchases).toEqual([]);
  acknowledge();
  await Promise.all([first, second]);
  expect(usePersonalStore.getState().purchases.map(p => p.id)).toEqual([
    'local-test',
    'local-second',
  ]);
  (NativeModules.CoffeeDevice.secureSet as jest.Mock).mockRejectedValueOnce(
    new Error('disk full'),
  );
  await expect(
    usePersonalStore.getState().removePurchase(record.id),
  ).rejects.toThrow();
  expect(usePersonalStore.getState().purchases).toHaveLength(2);
});

test('a stale hydration read cannot erase a purchase saved while it was pending', async () => {
  usePersonalStore.setState({ hydrated: true });
  let complete!: (raw: string) => void;
  (NativeModules.CoffeeDevice.secureGet as jest.Mock).mockReturnValue(
    new Promise<string>(resolve => {
      complete = resolve;
    }),
  );
  const hydration = usePersonalStore.getState().hydrate();
  await Promise.resolve();
  await usePersonalStore.getState().addPurchase(record);
  complete(
    JSON.stringify({
      preferences: defaults(),
      purchases: [],
      favoriteIds: [],
      onboarded: false,
    }),
  );
  await hydration;
  expect(usePersonalStore.getState().purchases).toEqual([record]);
});

test('car skin selection persists as a validated personal preference across hydration', async () => {
  usePersonalStore.setState({ hydrated: true });
  await usePersonalStore.getState().setCarSkinLevel(3);
  const stored = (
    NativeModules.CoffeeDevice.secureSet as jest.Mock
  ).mock.calls.at(-1)![1];
  usePersonalStore.setState({ selectedCarSkinLevel: null });
  (NativeModules.CoffeeDevice.secureGet as jest.Mock).mockResolvedValue(stored);
  await usePersonalStore.getState().hydrate();
  expect(usePersonalStore.getState().selectedCarSkinLevel).toBe(3);
});

test('unsupported saved skin is rejected without replacing the encrypted snapshot', async () => {
  (NativeModules.CoffeeDevice.secureGet as jest.Mock).mockResolvedValue(
    JSON.stringify({ selectedCarSkinLevel: 99 }),
  );
  await usePersonalStore.getState().hydrate();
  expect(usePersonalStore.getState().hydrated).toBe(false);
  expect(NativeModules.CoffeeDevice.secureSet).not.toHaveBeenCalled();
});
