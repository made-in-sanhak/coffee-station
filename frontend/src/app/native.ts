import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { Coordinate } from './domain';

export interface PickedImage {
  uri: string;
  type: string;
  name: string;
  base64: string;
}
interface DeviceModule {
  secureGet(key: string): Promise<string | null>;
  secureSet(key: string, value: string): Promise<void>;
  secureRemove(key: string): Promise<void>;
  randomHex(bytes: number): Promise<string>;
  getLocation(): Promise<Coordinate>;
  pickImage(camera: boolean): Promise<PickedImage>;
  recognizeSpeech(): Promise<string>;
}
function device(): DeviceModule {
  const module = NativeModules.CoffeeDevice as DeviceModule | undefined;
  if (!module)
    throw new Error('이 기능은 최신 Android 앱에서 사용할 수 있습니다.');
  return module;
}
export const native = {
  secureGet: (key: string) => device().secureGet(key),
  secureSet: (key: string, value: string) => device().secureSet(key, value),
  secureRemove: (key: string) => device().secureRemove(key),
  randomHex: (bytes: number) => device().randomHex(bytes),
  getLocation: () => device().getLocation(),
  recognizeSpeech: () => device().recognizeSpeech(),
  pickImage: async (camera: boolean): Promise<PickedImage> => {
    if (camera && Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error(
          '촬영하려면 카메라 권한이 필요합니다. 사진 선택도 이용할 수 있습니다.',
        );
    }
    return device().pickImage(camera);
  },
  requestLocation: async (): Promise<Coordinate> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      if (
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] !==
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        throw new Error(
          '위치 권한을 허용하지 않았습니다. 지역 검색으로 지도를 이동할 수 있습니다.',
        );
      }
    }
    return device().getLocation();
  },
};
