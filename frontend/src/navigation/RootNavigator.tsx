import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { tokens } from '../app/ui';
import MapScreen from '../screens/map/MapScreen';
import PlaceSearchScreen from '../screens/map/PlaceSearchScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import KakaoLoginScreen from '../screens/auth/KakaoLoginScreen';
import PreferenceScreen from '../screens/auth/PreferenceScreen';
import ParkPreferencesRoute from '../integration/ParkPreferencesRoute';
import NotificationScreen from '../screens/map/NotificationScreen';
import { useAuthStore } from '../store/authStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { useSessionStore } from '../store/sessionStore';
import SettingsScreen from '../screens/settings/SettingsScreen';
import LocationPermissionScreen from '../screens/onboarding/LocationPermissionScreen';
import CafeDetailScreen from '../screens/cafe/CafeDetailScreen';
import CompareScreen from '../screens/cafe/CompareScreen';
import RecommendScreen from '../screens/recommend/RecommendScreen';
import RecommendationResultScreen from '../screens/recommend/RecommendationResultScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import ReviewWriteScreen from '../screens/community/ReviewWriteScreen';
import ReviewDetailScreen from '../screens/community/ReviewDetailScreen';
import MeetupCreateScreen from '../screens/community/MeetupCreateScreen';
import MeetupDetailScreen from '../screens/community/MeetupDetailScreen';
import ReceiptScreen from '../screens/receipt/ReceiptScreen';
import ReceiptReviewScreen from '../screens/receipt/ReceiptReviewScreen';
import CalendarScreen from '../screens/purchase/CalendarScreen';
import CouponsScreen from '../screens/coupon/CouponsScreen';
import GarageScreen from '../screens/mypage/GarageScreen';
import OwnerScreen from '../screens/owner/OwnerScreen';
import OwnerMenusScreen from '../screens/owner/OwnerMenusScreen';
import OwnerOrdersScreen from '../screens/owner/OwnerOrdersScreen';
import OrderScreen from '../screens/order/OrderScreen';
import PaymentPendingScreen from '../screens/order/PaymentPendingScreen';
import OrderCompleteScreen from '../screens/order/OrderCompleteScreen';
import PaymentFailureScreen from '../screens/order/PaymentFailureScreen';
import EventsScreen from '../screens/events/EventsScreen';
const Stack = createNativeStackNavigator<RootStackParamList>();
export default function RootNavigator() {
  const isLoggedIn = useAuthStore(state => state.accessToken !== null);
  const serviceUser = useSessionStore(state => state.user);
  const isCompleted = usePreferenceStore(state => state.isCompleted);
  const hasHydrated = usePreferenceStore(state => state.hasHydrated);
  const completeSetup = usePreferenceStore(state => state.completeSetup);
  if (!hasHydrated) return null;
  return (
    <Stack.Navigator
      key={isLoggedIn ? (serviceUser ? 'service' : 'preview') : 'guest'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.bg },
      }}
    >
      {isLoggedIn ? <>
        {!isCompleted && <Stack.Screen name="Preference">
          {({ navigation }) => <PreferenceScreen
            onSkip={() => { completeSetup(null); navigation.replace('Map'); }}
            onStart={preferences => { completeSetup(preferences); navigation.replace('Map'); }} />}
        </Stack.Screen>}
        <Stack.Screen
          name="Map"
          component={MapScreen}
          listeners={({ navigation }) => ({
            focus: () => {
              const destination = useAuthStore.getState().takeLoginReturn();
              if (destination) navigation.navigate(destination);
            },
          })}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Preferences" component={ParkPreferencesRoute} />
        <Stack.Screen name="Notification" component={NotificationScreen} />
        <Stack.Screen name="Recommendation">
          {props => <RecommendScreen {...props} route={{ ...props.route, name: 'Recommend' }} />}
        </Stack.Screen>
      <Stack.Screen
        name="LocationPermission"
        component={LocationPermissionScreen}
      />
      <Stack.Screen name="PlaceSearch" component={PlaceSearchScreen} />
      <Stack.Screen name="CafeDetail" component={CafeDetailScreen} />
      <Stack.Screen name="Compare" component={CompareScreen} />
      <Stack.Screen name="Recommend" component={RecommendScreen} />
      <Stack.Screen
        name="RecommendationResult"
        component={RecommendationResultScreen}
      />
      <Stack.Screen name="Community" component={CommunityScreen} />
      <Stack.Screen name="ReviewWrite" component={ReviewWriteScreen} />
      <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} />
      <Stack.Screen name="MeetupCreate" component={MeetupCreateScreen} />
      <Stack.Screen name="MeetupDetail" component={MeetupDetailScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="ReceiptReview" component={ReceiptReviewScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Coupons" component={CouponsScreen} />
      <Stack.Screen name="Garage" component={GarageScreen} />
      <Stack.Screen name="Owner" component={OwnerScreen} />
      <Stack.Screen name="OwnerMenus" component={OwnerMenusScreen} />
      <Stack.Screen name="OwnerOrders" component={OwnerOrdersScreen} />
      <Stack.Screen name="Order" component={OrderScreen} />
      <Stack.Screen name="PaymentPending" component={PaymentPendingScreen} />
      <Stack.Screen name="OrderComplete" component={OrderCompleteScreen} />
      <Stack.Screen name="PaymentFailure" component={PaymentFailureScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="KakaoLogin" component={KakaoLoginScreen} options={{ headerShown: true, title: '카카오 로그인' }} />
      </> : <>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="KakaoLogin" component={KakaoLoginScreen} options={{ headerShown: true, title: '카카오 로그인' }} />
      </>}
    </Stack.Navigator>
  );
}
