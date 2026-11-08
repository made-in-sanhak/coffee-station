
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import KakaoLoginScreen from '../screens/auth/KakaoLoginScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import PreferenceScreen from '../screens/auth/PreferenceScreen';
import MapScreen from '../screens/map/MapScreen';
import NotificationScreen from '../screens/map/NotificationScreen';
import RecommendationScreen from '../screens/recommend/RecommendationScreen';
import RecommendationResultScreen from '../screens/recommend/RecommendationResultScreen';

import { useAuthStore } from '../store/authStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { colors } from '../utils/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isLoggedIn = useAuthStore(state => state.accessToken !== null);

  const isCompleted = usePreferenceStore(state => state.isCompleted);
  const hasHydrated = usePreferenceStore(state => state.hasHydrated);

  const completeSetup = usePreferenceStore(
    state => state.completeSetup,
  );

  if (!hasHydrated) {
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {isLoggedIn ? (
        <>
          {!isCompleted && (
            <Stack.Screen name="Preference">
              {({ navigation }) => (
                <PreferenceScreen
                  onSkip={() => {
                    completeSetup(null);
                    navigation.replace('Map');
                  }}
                  onStart={preferences => {
                    completeSetup(preferences);
                    navigation.replace('Map');
                  }}
                />
              )}
            </Stack.Screen>
          )}

          <Stack.Screen name="Map" component={MapScreen} />

          <Stack.Screen
            name="Notification"
            component={NotificationScreen}
          />

          <Stack.Screen
            name="Recommendation"
            component={RecommendationScreen}
          />

          <Stack.Screen
            name="RecommendationResult"
            component={RecommendationResultScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />

          <Stack.Screen
            name="KakaoLogin"
            component={KakaoLoginScreen}
            options={{
              headerShown: true,
              title: '카카오 로그인',
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.background },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
