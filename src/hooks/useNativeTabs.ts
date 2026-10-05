import { Platform } from 'react-native';

/**
 * 애플 기본 탭바(NativeTabs)를 쓰고 있는가.
 *
 * **iOS 26 이상만** 쓴다 — 그때부터 이게 진짜 Liquid Glass 탭바이고, 선택 표시가 물방울처럼
 * 옮겨 가는 것, 끌어서 고르기, 스크롤하면 작아지기까지 애플이 해 준다. 끄는 스위치는 없다.
 *
 * iOS 25 이하는 애플 기본 탭바가 화면 아래에 붙은 납작한 옛 모양이라, 우리가 그린 둥근 유리판
 * 알약 탭바(LiquidTabBar)를 쓴다 (2026-10-05). 기기 버전을 보고 자동으로 고른다.
 *
 * 웹과 안드로이드는 늘 우리 탭바다. 웹의 기본 탭바는 화면 위에 글자만 늘어놓은
 * 모양이라 QR 로 들어온 사람이 보는 화면으로는 맞지 않다.
 */
const IOS_LIQUID = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

export function useNativeTabs() {
  return IOS_LIQUID;
}
