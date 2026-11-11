
import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PreferenceScreenProps = {
  onSkip: () => void;
  onStart: (preferences: {
    brands: string[];
    size: string;
    orderMethod: string;
    cafeType: string;
    tastes: string[];
  }) => void;
};

const GREEN = '#205C43';
const BACKGROUND = '#F7F3ED';
const TEXT = '#29251F';
const BORDER = '#E8E1D8';

const brands = [
  '아이스 아메리카노',
  '카페라떼',
  '콜드브루',
  '바닐라라떼',
  '카푸치노',
  '디카페인 아메리카노',
  '카라멜 마끼아또',
  '아인슈페너',
];

const sizes = ['Regular', 'Large'];
const orderMethods = ['테이크아웃', '매장 이용', '드라이브스루'];
const cafeTypes = ['저가 브랜드', '프랜차이즈', '개인 카페'];
const tastes = ['산미 적은', '고소한', '달달한', '디카페인', '우유 들어간'];

export default function PreferenceScreen({
  onSkip,
  onStart,
}: PreferenceScreenProps) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [selectedCafe, setSelectedCafe] = useState('');
  const [selectedTastes, setSelectedTastes] = useState<string[]>([]);

  const toggleItem = (
    item: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected(
      selected.includes(item)
        ? selected.filter(value => value !== item)
        : [...selected, item],
    );
  };

  const Chip = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.selectedChip]}
    >
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>
        {label}
      </Text>
    </Pressable>
  );

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipContainer}>{children}</View>
    </View>
  );

  const handleStart = () => {
    onStart({
      brands: selectedBrands,
      size: selectedSize,
      orderMethod: selectedOrder,
      cafeType: selectedCafe,
      tastes: selectedTastes,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerText}>처음 한 번만 설정해요</Text>
        <Pressable onPress={onSkip} hitSlop={12}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.titleArea}>
          <Text style={styles.title}>어떤 커피를 자주 드세요?</Text>
          <Text style={styles.subtitle}>
            고른 메뉴의 가격으로 지도 마커를 보여드려요
          </Text>
        </View>

        <Section title="자주 마시는 메뉴 (여러 개 선택 가능)">
          {brands.map(item => (
            <Chip
              key={item}
              label={item}
              selected={selectedBrands.includes(item)}
              onPress={() =>
                toggleItem(item, selectedBrands, setSelectedBrands)
              }
            />
          ))}
        </Section>

        <Section title="사이즈 (하나만 선택 가능)">
          {sizes.map(item => (
            <Chip
              key={item}
              label={item}
              selected={selectedSize === item}
              onPress={() =>
                setSelectedSize(selectedSize === item ? '' : item)
              }
            />
          ))}
        </Section>

        <Section title="주로 이용하는 방식 (하나만 선택 가능)">
          {orderMethods.map(item => (
            <Chip
              key={item}
              label={item}
              selected={selectedOrder === item}
              onPress={() =>
                setSelectedOrder(selectedOrder === item ? '' : item)
              }
            />
          ))}
        </Section>

        <Section title="선호 카페 유형 (하나만 선택 가능)">
          {cafeTypes.map(item => (
            <Chip
              key={item}
              label={item}
              selected={selectedCafe === item}
              onPress={() =>
                setSelectedCafe(selectedCafe === item ? '' : item)
              }
            />
          ))}
        </Section>

        <Section title="취향 (여러 개 선택 가능)">
          {tastes.map(item => (
            <Chip
              key={item}
              label={item}
              selected={selectedTastes.includes(item)}
              onPress={() =>
                toggleItem(item, selectedTastes, setSelectedTastes)
              }
            />
          ))}
        </Section>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            첫 번째 메뉴가 지도 마커 기본값이 되고, 나머지는 지도 상단 칩에서
            바꿔볼 수 있어요.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>시작하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    height: 58,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 14,
    color: '#77716A',
    fontWeight: '500',
  },
  skipText: {
    fontSize: 14,
    color: '#55504A',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
  },
  titleArea: {
    marginBottom: 25,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 9,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#8A837B',
  },
  section: {
    marginBottom: 21,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  chipText: {
    fontSize: 13,
    color: '#514B44',
    fontWeight: '500',
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notice: {
    backgroundColor: '#F0E9DF',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginTop: 2,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#71685E',
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: BACKGROUND,
  },
  startButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
