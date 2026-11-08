import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Map,
  Astroid,
  MessageCircle,
  UserRound,
} from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../utils/theme';
import type { RootStackParamList } from '../navigation/types';

type TabName = '지도' | '추천' | '휴게소' | '내 기록';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const TABS = [
  { name: '지도' as const, Icon: Map },
  { name: '추천' as const, Icon: Astroid },
  { name: '휴게소' as const, Icon: MessageCircle },
  { name: '내 기록' as const, Icon: UserRound },
];

interface BottomTabBarProps {
  activeTab: TabName;
}

export default function BottomTabBar({
  activeTab,
}: BottomTabBarProps) {
  const navigation = useNavigation<Navigation>();

  const handleTabPress = (tab: TabName) => {
    if (tab === '지도') {
      navigation.navigate('Map');
      return;
    }

    if (tab === '추천') {
      navigation.navigate('Recommendation');
      return;
    }

    Alert.alert(
      tab,
      '해당 화면은 아직 준비 중입니다.',
    );
  };

  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.name;
        const Icon = tab.Icon;

        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab.name)}
            accessibilityRole="button"
            accessibilityLabel={tab.name}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.5 : 1.8}
              color={
                isActive
                  ? colors.primary
                  : colors.textMuted
              }
            />

            <Text
              style={[
                styles.label,
                isActive && styles.activeLabel,
              ]}
            >
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
