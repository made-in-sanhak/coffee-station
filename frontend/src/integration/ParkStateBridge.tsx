import { useEffect } from 'react';
import { usePreferenceStore } from '../store/preferenceStore';
import { usePersonalStore } from '../store/personalStore';
import { mapParkPreferences } from './parkPreferences';

export default function ParkStateBridge() {
  const ready = usePreferenceStore(state => state.hasHydrated);
  const completed = usePreferenceStore(state => state.isCompleted);
  const preferences = usePreferenceStore(state => state.preferences);
  const personalReady = usePersonalStore(state => state.hydrated);
  useEffect(() => {
    if (!ready || !personalReady || !completed) return;
    void usePersonalStore.getState().setPreferences(mapParkPreferences(preferences))
      .catch(() => { /* The personal store keeps its error and original records. */ });
  }, [ready, completed, preferences, personalReady]);
  return null;
}
