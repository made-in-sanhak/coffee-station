import React, { useRef, useState } from 'react';
import PreferenceScreen from '../screens/auth/PreferenceScreen';
import { usePersonalStore } from '../store/personalStore';
import { usePreferenceStore, type UserPreferences } from '../store/preferenceStore';
import type { RootStackScreenProps } from '../navigation/types';
import { mapParkPreferences } from './parkPreferences';

export default function ParkPreferencesRoute({ navigation }: RootStackScreenProps<'Preferences'>) {
  const preferences = usePreferenceStore(state => state.preferences);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async (next: UserPreferences) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    const { preferences: previous, setPreferences } = usePersonalStore.getState();
    try {
      await setPreferences(mapParkPreferences(next, previous));
      try {
        await usePreferenceStore.getState().savePreferences(next);
      } catch (error) {
        await setPreferences(previous).catch(() => {});
        throw error;
      }
      if (navigation.isFocused()) navigation.goBack();
    } catch {
      setSaveError('취향을 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <PreferenceScreen
      initialPreferences={preferences}
      editing
      saving={saving}
      saveError={saveError}
      onSkip={() => navigation.goBack()}
      onStart={save}
    />
  );
}
