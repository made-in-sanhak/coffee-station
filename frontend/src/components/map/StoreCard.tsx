import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Store } from '../../types/store';
import { formatDistance, formatPrice } from '../../utils/format';
import { colors } from '../../utils/theme';

// 마커를 눌렀을 때 지도 아래에 뜨는 매장 요약 카드
export default function StoreCard({ store }: { store: Store }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>
          {store.name}
        </Text>
        <Text style={styles.distance}>{formatDistance(store.distance)}</Text>
      </View>
      <Text style={styles.price}>
        {store.menuName} {formatPrice(store.price)}원
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        ★ {store.rating.toFixed(1)} ({store.reviewCount}) · {store.address}
      </Text>
      <Text style={styles.meta}>
        {store.priceSource} · {store.priceCheckedAt} 기준
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  distance: {
    marginLeft: 8,
    fontSize: 13,
    color: colors.textMuted,
  },
  price: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
});
