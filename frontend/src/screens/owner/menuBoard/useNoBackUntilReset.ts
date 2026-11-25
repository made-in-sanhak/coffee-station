import { usePreventRemove } from '@react-navigation/native';

// 뒤로 가기(제스처·하드웨어 버튼)로는 나갈 수 없고, 흐름을 마칠 때의 navigation.reset 만 허용합니다.
// 첫 메뉴 등록처럼 반드시 끝까지 거쳐야 하는 화면에서 씁니다.
export function useNoBackUntilReset(navigation: { dispatch: (action: any) => void }) {
  usePreventRemove(true, ({ data }) => {
    if (data.action.type === 'RESET') navigation.dispatch(data.action);
  });
}
