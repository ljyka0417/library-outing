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
   * 애플 기본 탭바에서는 탭바 자리를 TabScreen 의 SafeAreaView 가 이미 비웠다.
   * (기기가 알려 주는 실제 값이다) 여기서 또 49 니 하고 어림잡아 더하면 그만큼
   * 빈칸이 생긴다 — 달곰이 입력칸이 탭바에서 한참 떠 있던 것이 이것이다.
   * 마지막 줄이 답답하지 않을 만큼만 둔다.
   */
  if (native) return 16;

  return TAB_BAR.height + bottom + 16;
}
