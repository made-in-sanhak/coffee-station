import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { api } from '../../app/api';
import { native } from '../../app/native';
import ReceiptScreen from './ReceiptScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../../app/api', () => ({
  api: { post: jest.fn() },
  useResource: () => ({}),
}));
jest.mock('../../app/native', () => ({ native: { pickImage: jest.fn() } }));

test.each([
  ['촬영하기', true],
  ['앨범에서 선택', false],
])(
  '%s sends the selected photo and opens the review',
  async (label, camera) => {
    const navigate = jest.fn();
    const props = {
      navigation: { navigate, canGoBack: () => false },
    } as unknown as React.ComponentProps<typeof ReceiptScreen>;
    (native.pickImage as jest.Mock).mockResolvedValue({
      uri: 'file:///receipt.jpg',
      base64: 'photo',
      type: 'image/jpeg',
    });
    (api.post as jest.Mock).mockResolvedValue({
      images: [
        {
          fields: [
            { inferText: '테스트 커피 매장', lineBreak: true },
            { inferText: '합계: 2,600', lineBreak: true },
          ],
        },
      ],
    });
    let tree!: Renderer.ReactTestRenderer;
    await act(() => {
      tree = Renderer.create(<ReceiptScreen {...props} />);
    });
    const button = tree.root.findAll(
      node => node.props.label === label && node.props.onPress,
    )[0];
    await act(async () => {
      await button.props.onPress();
    });
    expect(native.pickImage).toHaveBeenCalledWith(camera);
    expect(api.post).toHaveBeenCalledWith('/api/receipts/scan', {
      base64: 'photo',
      type: 'image/jpeg',
    });
    expect(navigate).toHaveBeenCalledWith('ReceiptReview', {
      draft: expect.objectContaining({
        storeName: '테스트 커피 매장',
        total: 2600,
        scanned: true,
        verified: false,
        imageUri: 'file:///receipt.jpg',
      }),
    });
    await act(() => tree.unmount());
  },
);
