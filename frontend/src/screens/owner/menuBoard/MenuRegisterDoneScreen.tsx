import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, Check, ChevronRight } from 'lucide-react-native';
import { Button, Screen, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { ownerOnboardingStyles as o } from '../invite/ownerOnboardingStyles';
import { CenterTitle } from './MenuBoardParts';
import { MENU_BOARD_CATEGORIES } from './menuBoardLogic';
import { useNoBackUntilReset } from './useNoBackUntilReset';

// 14-5 메뉴 등록 완료
export default function MenuRegisterDoneScreen({
  navigation,
  route,
}: RootStackScreenProps<'MenuRegisterDone'>) {
  useNoBackUntilReset(navigation);
  const { count, counts } = route.params;
  const toOwner = () => navigation.reset({ index: 1, routes: [{ name: 'Map' }, { name: 'Owner' }] });
  const toMenus = () =>
    navigation.reset({ index: 2, routes: [{ name: 'Map' }, { name: 'Owner' }, { name: 'OwnerMenus' }] });
  return (
    <Screen navigation={navigation} header={false} scroll={false} contentStyle={o.content}>
      <CenterTitle title="메뉴 등록 완료" />
      <View style={styles.hero}>
        <View style={styles.check}>
          <Check size={30} color={tokens.white} strokeWidth={3} />
        </View>
        <Text style={styles.heroTitle}>메뉴 {count}개를 등록했어요</Text>
        <Text style={o.pageSubtitle}>지금부터 지도와 가격 비교에 우리 매장 메뉴가 보여요</Text>
      </View>
      <View style={o.card}>
        <Text style={[o.body, o.bold]}>카테고리별 등록 메뉴</Text>
        <View style={styles.stats}>
          {MENU_BOARD_CATEGORIES.map(category => (
            <View key={category.code} style={styles.stat}>
              <Text style={styles.statLabel}>{category.label}</Text>
              <Text style={styles.statValue}>{counts[category.code] ?? 0}개</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={o.spacer} />
      <Pressable
        accessibilityRole="button"
        testID="menu-done-tip"
        onPress={toMenus}
        style={({ pressed }) => [o.linkRow, pressed && o.pressed]}
      >
        <Camera size={18} color={tokens.text} strokeWidth={1.8} />
        <Text style={[o.body, styles.flex]}>가격이 바뀌면 메뉴 관리에서 메뉴판으로 한 번에 갱신할 수 있어요</Text>
        <ChevronRight size={18} color={tokens.muted} />
      </Pressable>
      <View style={styles.buttons}>
        <Button testID="menu-done-owner" label="점주 센터로 가기" onPress={toOwner} style={styles.flex} />
        <Button testID="menu-done-menus" label="메뉴 더 수정하기" variant="outline" onPress={toMenus} style={styles.flex} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 8, paddingTop: 12 },
  check: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.green,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: tokens.font,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
    color: tokens.text,
  },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  statLabel: { fontFamily: tokens.font, fontSize: 11, lineHeight: 15, color: tokens.muted },
  statValue: { fontFamily: tokens.font, fontSize: 15, lineHeight: 21, fontWeight: '700', color: tokens.text },
  buttons: { flexDirection: 'row', gap: 8 },
});
