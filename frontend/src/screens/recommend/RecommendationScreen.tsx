import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Coffee,
  Mic,
  Sparkles,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BottomTabBar from '../../navigation/BottomTabBar';
import { colors } from '../../utils/theme';
import type {
  RecommendationConditions,
  RootStackParamList,
} from '../../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const budgets = ['3천원 이하', '5천원 이하', '상관없음'];
const purposes = ['테이크아웃', '공부·작업', '대화', '드라이브스루'];
const tastes = ['산미 적은', '고소한', '달달한', '디카페인', '우유 들어간'];
const distances = ['도보 5분', '도보 10분', '차로 10분'];

export default function RecommendationScreen() {
  const navigation = useNavigation<Navigation>();

  const [prompt, setPrompt] = useState('');
  const [budget, setBudget] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedTastes, setSelectedTastes] = useState<string[]>([]);
  const [distance, setDistance] = useState('');

  const toggleTaste = (taste: string) => {
    setSelectedTastes(current =>
      current.includes(taste)
        ? current.filter(item => item !== taste)
        : [...current, taste],
    );
  };

  const handleRecommend = () => {
    const conditions: RecommendationConditions = {
      prompt: prompt.trim(),
      budget: budget as RecommendationConditions['budget'],
      purpose,
      tastes: selectedTastes,
      distance,
    };

    navigation.navigate('RecommendationResult', conditions);
  };

  const renderChips = (
    items: string[],
    selected: string | string[],
    onSelect: (item: string) => void,
    multi = false,
  ) => (
    <View style={styles.chipContainer}>
      {items.map(item => {
        const active = multi
          ? (selected as string[]).includes(item)
          : selected === item;

        return (
          <Pressable
            key={item}
            onPress={() => onSelect(item)}
            style={[
              styles.chip,
              active && styles.selectedChip,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                active && styles.selectedChipText,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.logoArea}>
          <Coffee size={17} color={colors.primary} />
          <Text style={styles.logoText}>커피 주유소</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            hitSlop={10}
            onPress={() => navigation.navigate('Notification')}
          >
            <Bell size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>어떤 커피가 필요하세요?</Text>
        <Text style={styles.subtitle}>
          조건을 고르면 AI가 주변 카페를 골라드려요
        </Text>

        <View style={styles.promptBox}>
          <TextInput
            style={styles.promptInput}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="회의 전에 30분 정도 조용히 앉아 있을 수 있는 곳, 5천원 이하로 찾아줘"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
          <Pressable style={styles.micButton} hitSlop={8}>
            <Mic size={17} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예산</Text>
          {renderChips(budgets, budget, setBudget)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 목적</Text>
          {renderChips(purposes, purpose, setPurpose)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>취향</Text>
          {renderChips(
            tastes,
            selectedTastes,
            toggleTaste,
            true,
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이동 거리</Text>
          {renderChips(distances, distance, setDistance)}
        </View>
      </ScrollView>

      <View style={styles.bottomArea}>
        <Pressable
          style={styles.recommendButton}
          onPress={handleRecommend}
        >
          <Sparkles size={16} color="#FFFFFF" />
          <Text style={styles.recommendButtonText}>
            AI 추천 받기
          </Text>
        </Pressable>
      </View>

      <BottomTabBar activeTab="추천" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 14,
  },
  promptBox: {
    minHeight: 66,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  promptInput: {
    flex: 1,
    minHeight: 42,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    padding: 0,
  },
  micButton: {
    padding: 5,
    alignSelf: 'flex-end',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    minHeight: 35,       
    paddingHorizontal: 15, 
    paddingVertical: 7,   
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13, 
    color: colors.text,
    fontWeight: '500',
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomArea: {
    paddingHorizontal: 20,
    paddingTop: 7,
    paddingBottom: 9,
    backgroundColor: colors.background,
  },
  recommendButton: {
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  recommendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
