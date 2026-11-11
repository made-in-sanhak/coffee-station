import type { PickedImage } from '../../app/native';

export const MAX_REVIEW_IMAGES = 3;
export const MAX_REVIEW_IMAGE_BYTES = 2 * 1024 * 1024;
export function reviewPhotoInput(image: PickedImage) {
  if (!['image/jpeg', 'image/png'].includes(image.type))
    throw new Error('JPEG 또는 PNG 사진을 선택해 주세요.');
  if (!image.base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.base64))
    throw new Error('사진을 읽지 못했습니다. 다시 선택해 주세요.');
  const size = image.base64.length * 3 / 4 - (image.base64.endsWith('==') ? 2 : image.base64.endsWith('=') ? 1 : 0);
  if (size > MAX_REVIEW_IMAGE_BYTES)
    throw new Error('리뷰 사진은 한 장당 2MB 이하로 첨부해 주세요.');
  return { type: image.type, base64: image.base64 };
}
export function reviewImageUrl(path: string, baseUrl: string) {
  return baseUrl && /^\/api\/review-images\/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(path)
    ? baseUrl.replace(/\/+$/, '') + path
    : null;
}
