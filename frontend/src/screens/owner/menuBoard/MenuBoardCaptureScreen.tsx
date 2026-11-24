import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, ChevronRight, Pencil, X } from 'lucide-react-native';
import { Button, Screen, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useMenuBoardStore } from '../../../store/menuBoardStore';
import { ReceiptViewfinder } from '../../receipt/RewardVisuals';
import { ownerOnboardingStyles as o } from '../invite/ownerOnboardingStyles';
import { MenuBoardIllustration } from './MenuBoardParts';
import { pickMenuBoardImage } from './pickMenuBoardImage';

export const MAX_MENU_BOARD_IMAGES = 5;

// 14-2 메뉴판 촬영 / 14-7 바뀐 메뉴판 다시 촬영 (mode 만 다름). 영수증 촬영 화면의 뷰파인더를 그대로 씁니다.
export default function MenuBoardCaptureScreen({
  navigation,
  route,
}: RootStackScreenProps<'MenuBoardCapture'>) {
  const { mode, cafe } = route.params;
  const images = useMenuBoardStore(state => state.images);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = mode === 'update';

  // 다른 매장·모드에서 들어오면 이전 사진을 비웁니다. (안내 화면에서 고른 사진은 유지)
  useEffect(() => {
    const store = useMenuBoardStore.getState();
    if (store.mode !== mode || store.cafe?.id !== cafe.id) store.start(mode, cafe);
  }, [mode, cafe]);

  const pick = async (camera: boolean) => {
    if (busy) return;
    if (images.length >= MAX_MENU_BOARD_IMAGES) {
      setError(`메뉴판 사진은 ${MAX_MENU_BOARD_IMAGES}장까지 올릴 수 있어요.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const image = await pickMenuBoardImage(camera);
      if (image) useMenuBoardStore.getState().addImage(image);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사진을 가져오지 못했어요.');
    } finally {
      setBusy(false);
    }
  };
  const manual = () => {
    useMenuBoardStore.getState().setScanItems([]);
    navigation.navigate('MenuBoardReview');
  };

  return (
    <Screen navigation={navigation} title={update ? '메뉴판으로 갱신' : '메뉴판 등록'} contentStyle={o.content}>
      <View style={styles.titleBlock}>
        <Text style={o.pageTitle}>{update ? '바뀐 메뉴판을 찍어 주세요' : '메뉴판을 찍어 주세요'}</Text>
        <Text style={o.pageSubtitle}>
          {update
            ? '등록된 메뉴와 비교해 바뀐 가격과 새 메뉴를 찾아 드려요'
            : '메뉴 이름과 가격을 자동으로 읽어 등록해 드려요'}
        </Text>
      </View>
      <ReceiptViewfinder
        imageUri={images[images.length - 1]?.uri}
        imageLabel="선택한 메뉴판"
        hint="메뉴판 한 면이 다 보이게 맞춰 주세요"
        placeholder={
          <View style={styles.placeholder}>
            <MenuBoardIllustration />
          </View>
        }
      />
      {images.length > 0 && (
        <View style={styles.thumbs}>
          {images.map((image, index) => (
            <View key={image.uri} style={styles.thumb}>
              <Image source={{ uri: image.uri }} style={styles.thumbImage} accessibilityLabel={`메뉴판 사진 ${index + 1}`} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`메뉴판 사진 ${index + 1} 빼기`}
                testID={`menu-board-remove-${index}`}
                hitSlop={6}
                onPress={() => useMenuBoardStore.getState().removeImage(image.uri)}
                style={styles.thumbRemove}
              >
                <X size={12} color={tokens.white} strokeWidth={3} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.buttons}>
        <Button
          testID="menu-board-camera"
          label={images.length ? '한 장 더 찍기' : '촬영하기'}
          variant={images.length ? 'outline' : 'primary'}
          disabled={busy}
          onPress={() => pick(true)}
          style={styles.flex}
        />
        <Button
          testID="menu-board-album"
          label="앨범에서 선택"
          variant="outline"
          disabled={busy}
          onPress={() => pick(false)}
          style={styles.flex}
        />
      </View>
      {images.length > 0 && (
        <Button
          testID="menu-board-read"
          label={`메뉴판 ${images.length}장 읽기`}
          disabled={busy}
          onPress={() => navigation.navigate('MenuBoardProcessing')}
        />
      )}
      {error && (
        <Text accessibilityRole="alert" style={o.error}>
          {error}
        </Text>
      )}
      {!update && (
        <Pressable
          accessibilityRole="button"
          testID="menu-board-manual"
          onPress={manual}
          style={({ pressed }) => [o.linkRow, pressed && o.pressed]}
        >
          <Pencil size={18} color={tokens.text} strokeWidth={1.8} />
          <Text style={[o.body, styles.flex]}>메뉴판이 없나요? 직접 입력하기</Text>
          <ChevronRight size={18} color={tokens.muted} />
        </Pressable>
      )}
      <View style={styles.tip}>
        <Camera size={18} color={tokens.green} strokeWidth={2} />
        <View style={styles.flex}>
          <Text style={[o.body, o.bold, styles.green]}>메뉴판이 여러 면이면 나눠서 찍어도 돼요</Text>
          <Text style={[o.muted, styles.green]}>흐리거나 빛 반사가 있으면 가격을 잘못 읽을 수 있어요</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: 4 },
  flex: { flex: 1 },
  placeholder: { position: 'absolute', top: 44 },
  buttons: { flexDirection: 'row', gap: 8 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: tokens.card },
  thumbImage: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.text,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: tokens.greenLight,
  },
  green: { color: tokens.green },
});
