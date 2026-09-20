import { Platform } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * 애플 기본 탭바(NativeTabs)를 쓰고 있는가.
 *
 * iOS 는 기본으로 쓴다 — iOS 26 부터 이게 진짜 Liquid Glass 탭바이고, 선택 표시가
 * 물방울처럼 옮겨 가는 것, 끌어서 고르기, 스크롤하면 작아지기까지 애플이 해 준다.
 * 마이 탭에서 끄면 우리가 그린 탭바로 돌아가고, 그 선택은 저장된다.
 *
 * 웹과 안드로이드는 늘 우리 탭바다. 웹의 기본 탭바는 화면 위에 글자만 늘어놓은
 * 모양이라 QR 로 들어온 사람이 보는 화면으로는 맞지 않다.
 */
export function useNativeTabs() {
  const on = useAppStore((s) => s.nativeTabs);
  return Platform.OS === 'ios' && on;
}
