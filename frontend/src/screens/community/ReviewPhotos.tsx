import React from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';
import { useConfigStore } from '../../store/configStore';
import { tokens } from '../../app/ui';
import { reviewImageUrl } from './reviewImages';

export default function ReviewPhotos({ paths, large = false }: { paths?: string[]; large?: boolean }) {
  const baseUrl = useConfigStore(state => state.backendUrl);
  const photos = (paths ?? []).slice(0, 3).map(path => reviewImageUrl(path, baseUrl)).filter((uri): uri is string => !!uri);
  if (!photos.length) return null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {photos.map((uri, index) => <Image key={uri} source={{ uri }} style={[styles.photo, large && styles.large]} accessibilityLabel={`리뷰 사진 ${index + 1}`} resizeMode="cover" />)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  row: { gap: 8 },
  photo: { width: 84, height: 84, borderRadius: 10, backgroundColor: tokens.brownLight },
  large: { width: 240, height: 240 },
});
