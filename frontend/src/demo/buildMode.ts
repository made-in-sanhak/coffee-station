import { NativeModules } from 'react-native';
import { canUseDemo } from './demoPolicy';

const buildInfo = NativeModules.CoffeeBuildInfo as
  | { isDemoBuild?: boolean }
  | undefined;

export const DEMO_AVAILABLE = canUseDemo(
  __DEV__,
  buildInfo?.isDemoBuild === true,
);
