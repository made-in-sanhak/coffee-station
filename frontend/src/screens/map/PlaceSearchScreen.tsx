import React, { useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { RootStackScreenProps } from '../../navigation/types';
import { Button, Notice, Screen, tokens } from '../../app/ui';
import ExploreIcon from '../../components/map/ExploreIcon';
import { useExploreSession } from './exploreSession';

export default function PlaceSearchScreen({
  navigation,
}: RootStackScreenProps<'PlaceSearch'>) {
  const input = useRef<React.ElementRef<typeof TextInput>>(null);
  const [query, setQuery] = useState(useExploreSession.getState().placeName);
  const [error, setError] = useState<string | null>(null);
  const search = () => {
    if (!query.trim()) {
      setError('검색할 카페·메뉴·지역을 입력해 주세요.');
      input.current?.focus();
      return;
    }
    Keyboard.dismiss();
    useExploreSession.getState().search(query);
    navigation.popTo('Map');
  };
  return (
    <Screen
      navigation={navigation}
      title="지역 검색"
      scroll={false}
      contentStyle={styles.canvas}
    >
      <View style={styles.content}>
        <View style={styles.search}>
          <ExploreIcon name="search" />
          <TextInput
            ref={input}
            testID="place-search-input"
            accessibilityLabel="카페 메뉴 지역 검색"
            autoFocus
            value={query}
            onChangeText={value => {
              setQuery(value);
              setError(null);
            }}
            onSubmitEditing={search}
            placeholder="카페·메뉴·지역 검색 (예: 행신역)"
            placeholderTextColor={tokens.muted}
            returnKeyType="search"
            style={styles.input}
          />
          <Pressable
            accessibilityLabel="검색어 지우기"
            onPress={() => setQuery('')}
            hitSlop={8}
          >
            <Text style={styles.clear}>×</Text>
          </Pressable>
        </View>
        <Text style={styles.guide}>
          역이나 동네를 검색하면 해당 장소로 지도가 이동해요.
        </Text>
        {error ? <Notice>{error}</Notice> : null}
        <Button label="지도에서 찾기" onPress={search} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  canvas: { padding: 0, gap: 0 },
  content: { padding: 20, gap: 16 },
  search: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE3D9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 14,
    color: tokens.text,
    paddingVertical: 12,
  },
  clear: { fontSize: 24, color: tokens.muted },
  guide: {
    fontFamily: tokens.font,
    color: tokens.muted,
    lineHeight: 21,
    fontSize: 13,
  },
});
