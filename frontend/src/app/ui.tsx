import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabBar, { type TabName } from '../navigation/BottomTabBar';

export const tokens = {
  bg: '#FBF8F3',
  green: '#1F5A3E',
  text: '#2B1D14',
  muted: '#7A6E64',
  border: '#EAE3D9',
  card: '#F6F0E8',
  white: '#FFFFFF',
  brown: '#8B5E3C',
  brownLight: '#E9D8C4',
  greenLight: '#E3EFE6',
  background: '#FBF8F3',
  surface: '#FFFFFF',
  primary: '#1F5A3E',
  textMuted: '#7A6E64',
  red: '#B04B3C',
  kakao: '#FEE500',
  font: 'NotoSansKR',
};
export const formatMoney = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${Math.round(value).toLocaleString('ko-KR')}원`
    : '가격 미등록';
export const formatDate = (
  value: string,
  options?: Intl.DateTimeFormatOptions,
) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(
        'ko-KR',
        options ?? { month: 'long', day: 'numeric' },
      );
};

type Navigation = {
  navigate: (...args: any[]) => void;
  goBack: () => void;
  canGoBack?: () => boolean;
  popTo?: (...args: any[]) => void;
};
export type AppTab = 'map' | 'recommend' | 'receipt' | 'community' | 'garage';
const tabLabels: Record<AppTab, TabName> = {
  map: '지도', recommend: '추천', community: '휴게소', garage: '내 기록', receipt: '내 기록',
};
const tabRoutes: Record<TabName, string> = {
  지도: 'Map', 추천: 'Recommend', 휴게소: 'Community', '내 기록': 'Calendar',
};
export function TabBar({ navigation, active }: { navigation: Navigation; active?: AppTab }) {
  return <BottomTabBar activeTab={active ? tabLabels[active] : undefined}
    onTabPress={label => {
      if (label === '지도' && navigation.popTo) {
        navigation.popTo('Map');
      } else if (label === '내 기록') {
        navigation.navigate('Calendar', undefined, { pop: true });
      } else {
        navigation.navigate(tabRoutes[label]);
      }
    }} />;
}
export function HeaderMain({ navigation }: { navigation: Navigation }) {
  return (
    <View style={styles.mainHeader}>
      <View style={styles.brand}>
        <Image
          source={require('../assets/figma/common/brand-coffee.png')}
          style={styles.brandIcon}
        />
        <Text style={styles.brandLabel}>커피 주유소</Text>
      </View>
      <View style={styles.mainActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="지역 검색"
          hitSlop={10}
          onPress={() => navigation.navigate('PlaceSearch')}
        >
          <Image
            source={require('../assets/figma/common/search.png')}
            style={styles.actionIcon}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="알림"
          hitSlop={10}
          onPress={() => navigation.navigate('Notification')}
        >
          <Image
            source={require('../assets/figma/common/bell.png')}
            style={styles.actionIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}
export function Screen({
  title,
  navigation,
  children,
  tab,
  scroll = true,
  header = true,
  headerRight,
  footer,
  contentStyle,
}: {
  title?: string;
  navigation: Navigation;
  children: React.ReactNode;
  tab?: AppTab;
  scroll?: boolean;
  header?: boolean;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {header ? (
        title !== undefined ? (
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 화면"
              hitSlop={12}
              onPress={() =>
                navigation.canGoBack?.()
                  ? navigation.goBack()
                  : navigation.navigate('Map')
              }
              style={styles.back}
            >
              <Image
                source={require('../assets/figma/common/back.png')}
                style={styles.tabIcon}
              />
            </Pressable>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {headerRight ?? <View style={styles.headerSpacer} />}
          </View>
        ) : (
          <HeaderMain navigation={navigation} />
        )
      ) : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, contentStyle]}>
          {children}
        </View>
      )}
      {footer}
      {tab ? <TabBar navigation={navigation} active={tab} /> : null}
    </SafeAreaView>
  );
}
export function Card({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'outline' | 'kakao' | 'quiet';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        disabled: !!disabled || !!loading,
        busy: !!loading,
      }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' && styles.outline,
        variant === 'kakao' && styles.kakao,
        variant === 'quiet' && styles.quiet,
        (disabled || loading || pressed) && styles.dim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? tokens.white : tokens.green}
        />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant !== 'primary' && styles.darkButtonLabel,
            variant === 'outline' && { color: tokens.green },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  style,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selectedChip, style]}
    >
      <Text style={[styles.chipLabel, selected && styles.selectedChipLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={tokens.muted}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}
export function Empty({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text accessibilityLiveRegion="polite" style={styles.emptyText}>
        {message}
      </Text>
      {onRetry ? (
        <Button label="다시 시도" variant="outline" onPress={onRetry} />
      ) : null}
    </View>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}
export const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: tokens.bg },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  back: { width: 24, justifyContent: 'center', alignItems: 'center' },
  backLabel: { fontSize: 36, lineHeight: 40, color: tokens.text },
  title: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 17,
    fontWeight: '700',
    color: tokens.text,
    textAlign: 'center',
  },
  headerSpacer: { width: 24 },
  mainHeader: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  brandIcon: { width: 24, height: 24 },
  brandLabel: {
    fontFamily: tokens.font,
    fontSize: 18,
    fontWeight: '700',
    color: tokens.text,
  },
  mainActions: { flexDirection: 'row', gap: 16 },
  actionIcon: { width: 22, height: 22 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    backgroundColor: tokens.white,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: tokens.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: tokens.white,
    borderWidth: 1,
    borderColor: tokens.green,
  },
  kakao: { backgroundColor: tokens.kakao },
  quiet: { backgroundColor: 'transparent' },
  dim: { opacity: 0.5 },
  buttonLabel: {
    fontFamily: tokens.font,
    color: tokens.white,
    fontWeight: '700',
    fontSize: 16,
  },
  darkButtonLabel: { color: tokens.text },
  chip: {
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: { borderColor: tokens.green, backgroundColor: tokens.green },
  chipLabel: {
    fontFamily: tokens.font,
    color: tokens.text,
    fontSize: 13,
    lineHeight: 18.2,
  },
  selectedChipLabel: { color: tokens.white, fontWeight: '700' },
  field: { gap: 6 },
  fieldLabel: {
    fontFamily: tokens.font,
    fontSize: 13,
    fontWeight: '600',
    color: tokens.muted,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tokens.white,
    color: tokens.text,
    fontFamily: tokens.font,
    fontSize: 14,
  },
  empty: {
    padding: 20,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: tokens.muted,
  },
  notice: { padding: 14, borderRadius: 14, backgroundColor: tokens.greenLight },
  noticeText: {
    fontFamily: tokens.font,
    color: tokens.green,
    fontSize: 12,
    lineHeight: 19,
  },
  tabIcon: { width: 24, height: 24 },
});
