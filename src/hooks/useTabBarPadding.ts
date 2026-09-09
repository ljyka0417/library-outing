import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 유리를 쓸 수 있는 곳인가. 웹은 탭바 배경 슬롯 자체가 동작하지 않는다. */
export const isGlassTabBar = Platform.OS !== 'web';

/**
 * 유리 탭바에 가리지 않도록 화면 아래에 비워 둘 높이.
 *
 * 유리 탭바는 콘텐츠 위에 떠 있다. 그래야 뒤가 비쳐 보이는데, 그만큼
 * 목록의 마지막 항목이 탭바 밑에 숨는다. 스크롤 컨테이너의 아래 여백에
 * 이 값을 더해 준다. 웹은 탭바가 문서 흐름 안에 있으므로 0 이다.
 */
export function useTabBarPadding() {
  const insets = useSafeAreaInsets();
  return isGlassTabBar ? 70 + insets.bottom : 0;
}
