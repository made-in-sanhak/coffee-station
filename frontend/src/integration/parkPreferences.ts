import { DEFAULT_PREFERENCES, type Preferences } from '../app/domain';
import type { UserPreferences } from '../store/preferenceStore';

export function mapParkPreferences(value: UserPreferences | null): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    menus: value?.brands.length ? [...value.brands] : [...DEFAULT_PREFERENCES.menus],
    sizes: value?.size ? [value.size] : [...DEFAULT_PREFERENCES.sizes],
    temperatures: [...DEFAULT_PREFERENCES.temperatures],
    purposes: value?.orderMethod ? [value.orderMethod] : [],
    cafeTypes: value?.cafeType ? [value.cafeType] : [],
    tastes: value ? [...value.tastes] : [],
  };
}
