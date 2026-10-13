import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import KakaoLoginScreen from '../screens/auth/KakaoLoginScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import MapScreen from '../screens/map/MapScreen';
import { useAuthStore } from '../store/authStore';
import { colors } from '../utils/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isLoggedIn = useAuthStore(state => state.accessToken !== null);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      {isLoggedIn ? (
        <Stack.Screen name="Map" component={MapScreen} />
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
