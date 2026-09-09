import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors } from '@/theme';

/**
 * 반투명 유리 배경.
 *
 * 세 갈래로 갈라진다. 위에서부터 좋은 순서다.
 *
 *   1. iOS 26 이상 — 진짜 Liquid Glass. 뒤 내용에 따라 굴절·반사가 살아 움직인다.
 *   2. 그 외 iOS / Android — expo-blur 로 흐림 처리. 굴절은 없지만 비슷하게 보인다.
 *   3. 웹 — 위 둘 다 못 쓰므로 반투명 단색으로 떨어진다.
 *
 * 어느 갈래로 가든 화면이 깨지지 않는 게 중요하다. 유리가 안 되는 기기에서
 * 배경이 아예 투명해지면 탭바 글씨가 콘텐츠와 겹쳐 안 읽힌다.
 */
export function GlassBackground({ tint = 'light' }: { tint?: 'light' | 'dark' }) {
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GlassView
        style={StyleSheet.absoluteFill}
        glassEffectStyle="regular"
        colorScheme={tint}
      />
    );
  }

  if (Platform.OS !== 'web') {
    return (
      <BlurView
        intensity={72}
        tint={tint === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
    );
  }

  return <View style={[StyleSheet.absoluteFill, styles.webFallback]} />;
}

const styles = StyleSheet.create({
  webFallback: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
