import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { queryClient } from './src/app/queryClient';
import { usePersonalStore } from './src/store/personalStore';
import { useConfigStore } from './src/store/configStore';
import KakaoSettingsStorage from './src/components/settings/KakaoSettingsStorage';
import ParkStateBridge from './src/integration/ParkStateBridge';
import OwnerInviteLinkBridge from './src/integration/OwnerInviteLinkBridge';
import { navigationRef } from './src/navigation/navigationRef';

function App() {
  useEffect(() => { void Promise.allSettled([
    usePersonalStore.getState().hydrate(), useConfigStore.getState().hydrate(),
  ]); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <KakaoSettingsStorage />
        <ParkStateBridge />
        <StatusBar barStyle="dark-content" />
        <NavigationContainer ref={navigationRef}>
          <OwnerInviteLinkBridge />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
