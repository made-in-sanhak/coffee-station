import { native } from '../../../app/native';
import type { MenuBoardImage } from '../../../types/menuBoard';

// 카메라·앨범에서 메뉴판 사진 한 장을 고릅니다. 사용자가 취소하면 null.
export async function pickMenuBoardImage(camera: boolean): Promise<MenuBoardImage | null> {
  try {
    const picked = await native.pickImage(camera);
    return picked;
  } catch (cause) {
    if ((cause as { code?: string })?.code === 'E_CANCELLED') return null;
    throw cause;
  }
}
