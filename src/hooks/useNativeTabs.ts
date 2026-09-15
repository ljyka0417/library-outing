import { Platform } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * 애플 기본 탭바(NativeTabs)를 쓰고 있는가.
 *
 * iOS 에서 마이 탭의 시험 스위치를 켰을 때만 참이다. 웹과 안드로이드는 늘
 * 우리가 그린 탭바를 쓴다. 웹의 기본 탭바는 화면 위에 글자만 늘어놓은 모양이라
 * QR 로 들어온 사람이 보는 화면으로는 맞지 않다.
 */
export function useNativeTabs() {
  const on = useAppStore((s) => s.nativeTabsTest);
  return Platform.OS === 'ios' && on;
}
