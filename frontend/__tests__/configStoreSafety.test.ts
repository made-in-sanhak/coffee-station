import { NativeModules } from 'react-native';
import { useConfigStore } from '../src/store/configStore';

test('a delayed configuration read cannot replace a newly saved server', async () => {
  let complete!: (value: string) => void;
  NativeModules.CoffeeDevice = {
    secureGet: jest.fn().mockImplementation(
      () =>
        new Promise<string>(resolve => {
          complete = resolve;
        }),
    ),
    secureSet: jest.fn().mockResolvedValue(undefined),
  };
  useConfigStore.setState({ backendUrl: '', hydrated: false });
  const pending = useConfigStore.getState().hydrate();
  await useConfigStore.getState().setBackendUrl('https://new.unit.test');
  complete('https://old.unit.test');
  await pending;
  expect(useConfigStore.getState().backendUrl).toBe('https://new.unit.test');
});
