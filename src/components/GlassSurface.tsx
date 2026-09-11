import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * 유리 표면. 뒤 내용이 비쳐 보이게 한다.
 *
 * 세 갈래로 갈라진다.
 *   1. iOS 26 이상 — 진짜 Liquid Glass. 뒤 내용이 굴절돼 보인다.
 *   2. 그 외 iOS / Android — 흐림 처리. 굴절은 없지만 비슷하게 보인다.
 *   3. 웹, 또는 모듈이 없는 빌드 — 아무것도 그리지 않는다 (부르는 쪽이 색을 깐다).
 *
 * ⚠️ 왜 require 를 try 로 감싸는가
 *   둘 다 네이티브 모듈이라, 패키지만 넣고 네이티브를 다시 만들지 않으면
 *   자바스크립트에는 있는데 기기에는 없는 상태가 된다. 그대로 부르면 죽는다.
 *   전에 그 상태로 앱이 켜지자마자 죽어 되돌리는 데 며칠이 걸렸다.
 *   불러오기부터 감싸 두면 최악의 경우에도 조용히 아래 갈래로 떨어진다.
 *
 *   다만 try 로 막을 수 없는 것도 있다 — 모듈은 있는데 **그리는 순간**
 *   네이티브가 죽는 경우다. 그래서 이 컴포넌트를 쓰는 곳은 저장되지 않는
 *   스위치 뒤에 둔다. 죽어도 앱을 껐다 켜면 꺼진 상태로 돌아온다.
 */

function loadGlass() {
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

/** 이 기기에서 유리(또는 흐림)를 쓸 수 있는가. 화면에서 안내 문구에 쓴다. */
export const glassSupport: 'liquid' | 'blur' | 'none' = GlassView
  ? 'liquid'
  : BlurView
    ? 'blur'
    : 'none';

interface Props {
  tint?: 'light' | 'dark';
  /**
   * regular  판처럼 쓸 때. 뒤가 은은하게 비친다.
   * clear    렌즈처럼 쓸 때. 더 맑아서 뒤 모양이 그대로 굴절돼 보인다.
   */
  variant?: 'regular' | 'clear';
}

export function GlassSurface({ tint = 'light', variant = 'regular' }: Props) {
  if (GlassView) {
    return (
      <GlassView
        style={StyleSheet.absoluteFill}
        glassEffectStyle={variant}
        colorScheme={tint}
      />
    );
  }

  if (BlurView) {
    return (
      <BlurView
        intensity={variant === 'clear' ? 34 : 70}
        tint={tint === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
    );
  }

  // 유리를 못 쓰는 곳에서는 반투명 흰 판으로 흉내만 낸다
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: `rgba(255,255,255,${variant === 'clear' ? 0.4 : 0.88})` },
      ]}
    />
  );
}
