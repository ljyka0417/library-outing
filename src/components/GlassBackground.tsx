import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

/**
 * 반투명 유리 배경.
 *
 * 네 갈래로 갈라진다. 위에서부터 좋은 순서다.
 *
 *   1. iOS 26 이상 — 진짜 Liquid Glass. 뒤 내용에 따라 굴절·반사가 살아 움직인다.
 *   2. 그 외 iOS / Android — expo-blur 로 흐림 처리. 굴절은 없지만 비슷하게 보인다.
 *   3. 웹, 또는 위 모듈이 없는 빌드 — 반투명 단색.
 *
 * ⚠️ 왜 이렇게까지 방어하는가
 *   expo-glass-effect / expo-blur 는 네이티브 모듈이다. 패키지를 새로 넣고
 *   네이티브 프로젝트를 다시 만들지 않으면(prebuild + pod install) 자바스크립트에는
 *   있는데 네이티브에는 없는 상태가 된다. 그 상태로 부르면 앱이 켜지자마자 죽는다.
 *   탭바 배경 하나 때문에 앱 전체가 못 켜지는 건 어떤 경우에도 안 된다.
 *   그래서 불러오기 자체를 try 로 감싸고, 실패하면 조용히 단색으로 떨어진다.
 */

/**
 * iOS 26 의 Liquid Glass 를 쓸 것인가.
 *
 * ⚠️ 지금은 꺼 두었다.
 *   앱이 켜지자마자 죽는 문제를 쫓는 중인데, 이게 가장 유력한 용의자다.
 *   iOS 26 에서만 켜지는 새 네이티브 기능이라 웹에서는 멀쩡하고 아이폰에서만
 *   죽는 증상과 맞는다. 꺼 두면 아래 흐림 처리로 떨어지는데, 보기에는
 *   거의 차이가 없다.
 *
 *   앱이 정상으로 켜지는 걸 확인한 뒤 이 값을 true 로 바꿔 다시 시험한다.
 *   그때도 죽으면 원인이 확정되고, 안 죽으면 원인은 다른 데 있다.
 */
const USE_LIQUID_GLASS = false;

/** 모듈을 안전하게 불러온다. 없으면 null. 한 번만 확인한다. */
function loadGlass() {
  if (!USE_LIQUID_GLASS) return null;
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-glass-effect');
    if (typeof mod?.isLiquidGlassAvailable !== 'function') return null;
    return mod.isLiquidGlassAvailable() ? mod.GlassView : null;
  } catch {
    return null;
  }
}

function loadBlur() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-blur')?.BlurView ?? null;
  } catch {
    return null;
  }
}

const GlassView = loadGlass();
const BlurView = loadBlur();

export function GlassBackground({ tint = 'light' }: { tint?: 'light' | 'dark' }) {
  if (GlassView) {
    return (
      <GlassView
        style={StyleSheet.absoluteFill}
        glassEffectStyle="regular"
        colorScheme={tint}
      />
    );
  }

  if (BlurView) {
    return (
      <BlurView
        intensity={72}
        tint={tint === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
    );
  }

  return <View style={[StyleSheet.absoluteFill, styles.fallback]} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
