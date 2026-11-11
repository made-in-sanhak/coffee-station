import React from 'react';
import PreferenceScreen from '../screens/auth/PreferenceScreen';
import { usePreferenceStore } from '../store/preferenceStore';
import type { RootStackScreenProps } from '../navigation/types';

export default function ParkPreferencesRoute({ navigation }: RootStackScreenProps<'Preferences'>) {
  const completeSetup = usePreferenceStore(state => state.completeSetup);
  return <PreferenceScreen onSkip={() => navigation.goBack()}
    onStart={preferences => { completeSetup(preferences); navigation.goBack(); }} />;
}
