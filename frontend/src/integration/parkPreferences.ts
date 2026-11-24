import { DEFAULT_PREFERENCES, type Preferences } from '../app/domain';
import type { UserPreferences } from '../store/preferenceStore';

export function mapParkPreferences(
  value: UserPreferences | null,
  current: Preferences = DEFAULT_PREFERENCES,
): Preferences {
  const base = value ? current : DEFAULT_PREFERENCES;
  return {
    ...base,
    menus: value?.brands.length ? [...value.brands] : [...DEFAULT_PREFERENCES.menus],
    sizes: value?.size ? [value.size] : [...DEFAULT_PREFERENCES.sizes],
    temperatures: [...base.temperatures],
    purposes: value?.orderMethod ? [value.orderMethod] : [],
    cafeTypes: value?.cafeType ? [value.cafeType] : [],
    tastes: value ? [...value.tastes] : [],
  };
}
