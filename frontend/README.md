This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

## Android Studio 에뮬레이터에서 로컬 DB 매장 조회

1. Docker Desktop에서 MySQL을 실행하고 `backend` 폴더에서 `npm run dev`를 실행합니다.
2. Android Studio의 Device Manager에서 에뮬레이터를 시작합니다.
3. `frontend` 폴더에서 `npm start`를 실행한 뒤, 다른 터미널에서 `npm run android`를 실행합니다.
   USB 휴대폰은 분리하여 에뮬레이터만 연결된 상태로 실행합니다.
4. 앱 설정의 서버 주소를 비워 기본값을 사용하거나 `http://10.0.2.2:8080`을 저장합니다.
   이전 USB 테스트에서 저장한 `http://127.0.0.1:8080`은 에뮬레이터용 주소로 변경해야 합니다.
5. 에뮬레이터 브라우저에서 `http://10.0.2.2:8080/health`를 열어 `db: ok`를 확인합니다.
6. 지도에서 행신역을 검색하면 해당 지역에 적재한 매장·가격 데이터를 조회할 수 있습니다.

개발 빌드는 로컬 HTTP 연결을 허용합니다. 백엔드 8080 포트에는 `adb reverse`가 필요하지 않습니다.
개발 앱은 `com.coffeestation.dev` / `Coffee Station Dev`, 배포 앱은
`com.coffeestation` / `CoffeeStation`으로 따로 설치됩니다. 개발 앱은 기존 앱과
설정·로그인을 공유하지 않습니다. 카카오 Android 설정에도 개발 패키지와 디버그 키 해시를 등록하세요.

## 개발 / 배포 빌드

`config/app-environments.json`은 앱에 공개되는 서버 주소만 저장합니다.
DB 비밀번호나 서명 비밀번호를 넣지 마세요. 개발의 `apiBaseUrl`은 기본적으로
`http://10.0.2.2:8080`입니다. `npm run android:dev` 또는 `npm run android`로 실행합니다.

배포 전 `production.apiBaseUrl`에 실제 HTTPS 백엔드 주소를 입력하세요.
배포 앱은 저장된 개발 서버 주소를 무시하고 이 주소만 사용하며, HTTP와 mock API를 허용하지 않습니다.
배포 주소가 비어 있거나 서명 설정이 없으면 빌드가 실패합니다.

개인 Gradle 설정 파일 `%USERPROFILE%/.gradle/gradle.properties`에 다음 값을 설정합니다.
같은 이름의 환경변수로도 전달할 수 있습니다. keystore 경로는 `/`를 사용하세요.

```properties
COFFEE_RELEASE_STORE_FILE=C:/keys/coffee-release.keystore
COFFEE_RELEASE_STORE_PASSWORD=your-store-password
COFFEE_RELEASE_KEY_ALIAS=your-key-alias
COFFEE_RELEASE_KEY_PASSWORD=your-key-password
```

서명키 파일과 비밀번호는 저장소에 커밋하지 마세요. 기존 배포 앱을 업데이트하려면
기존 배포 서명키를 사용해야 합니다.

`frontend` 폴더에서 실행합니다.

```powershell
npm run build:android:apk
npm run build:android:aab
```

APK: `android/app/build/outputs/apk/release/app-release.apk`

AAB: `android/app/build/outputs/bundle/release/app-release.aab`

배포 앱은 Metro 없이 실행됩니다. 실제 배포 서버와 서명키는 별도로 준비해야 합니다.

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
