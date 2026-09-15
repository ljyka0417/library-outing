import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navKind } from './useLayout';
import { useNativeTabs } from './useNativeTabs';

/** 떠 있는 탭바의 크기. 레이아웃과 화면 여백이 같은 값을 봐야 어긋나지 않는다. */
export const TAB_BAR = {
  /** 알약 높이 */
  height: 70,
  /** 좌우 여백 */
  side: 16,
  /** 화면 아래에서 띄우는 최소 거리 (홈 인디케이터가 없는 기기용) */
  minBottom: 14,
  /**
   * 알약이 이보다 넓어지지 않는다.
   *
   * 아이패드에서 화면 끝까지 늘리면 탭 다섯 개가 양쪽 끝으로 흩어져
   * 한 손으로는 닿지 않는다. 폰에서 쓰던 크기 그대로 가운데에 둔다.
   */
  maxWidth: 460,
} as const;

/**
 * 떠 있는 탭바에 가리지 않도록 화면 아래에 비워 둘 높이.
 *
 * 탭바가 콘텐츠 위에 떠 있으므로, 스크롤 목록의 마지막 항목이 그 밑에 숨는다.
 * 각 화면의 스크롤 컨테이너 아래 여백에 이 값을 더해 준다.
 */
export function useTabBarPadding() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const native = useNativeTabs();
  const bottom = Math.max(insets.bottom, TAB_BAR.minBottom);

  // 태블릿은 이동 메뉴가 왼쪽에 있어서 아래를 가리는 것이 없다.
  // 탭바 높이만큼 비워 두면 목록 끝에 까닭 없는 빈칸이 생긴다.
  if (navKind(width) !== 'bottom') return bottom + 16;

  /*
   * 애플 기본 탭바. UITabBar 의 표준 높이는 49 이고 홈 인디케이터 영역 위에 놓인다.
   * iOS 26 의 떠 있는 유리 탭바도 대략 그 자리를 차지한다.
   * (아이패드는 탭바가 위에 있어 위의 태블릿 갈래로 간다)
   */
  if (native) return insets.bottom + 49 + 16;

  return TAB_BAR.height + bottom + 16;
}
