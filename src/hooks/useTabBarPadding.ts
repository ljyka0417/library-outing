import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const bottom = Math.max(insets.bottom, TAB_BAR.minBottom);
  return TAB_BAR.height + bottom + 16;
}
