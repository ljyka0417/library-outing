import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { usePathname, useRouter } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';

/**
 * 탭 순서. 탭바에 놓인 순서와 같아야 한다.
 * (app/(tabs)/_layout.tsx 의 Tabs.Screen 순서)
 */
const TAB_ORDER = ['/', '/search', '/chat', '/favorites', '/mypage'] as const;

/** 이만큼 옆으로 쓸어야 넘어간다. 짧으면 스크롤하다 실수로 넘어간다. */
const THRESHOLD = 60;

/**
 * 좌우로 쓸어 옆 탭으로 넘긴다.
 *
 * 새 부품을 깔지 않는다. 제스처 처리기는 이미 앱에 들어 있어서 다시 빌드할
 * 필요가 없다 — 지난번 유리 사고를 생각하면 그게 제일 중요한 조건이었다.
 *
 * ⚠️ 손가락을 따라 화면이 끌려오지는 않는다.
 *   그건 페이지를 넘기는 방식의 탭이라야 되고, 그러려면 부품을 새로 깔고
 *   탭 구조를 갈아야 한다. 여기서는 "쓸면 넘어간다" 까지만 한다.
 *
 * 세로 스크롤을 방해하지 않는 게 관건이다. 가로로 20 이상 움직여야 잡고,
 * 세로로 12 이상 움직이면 손을 뗀다. 그래야 목록을 위아래로 넘기다가
 * 엉뚱하게 탭이 바뀌지 않는다.
 */
export function SwipeTabs({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (dir: 1 | -1) => {
    const current = TAB_ORDER.indexOf(pathname as (typeof TAB_ORDER)[number]);
    if (current < 0) return;
    const next = current + dir;
    if (next < 0 || next >= TAB_ORDER.length) return;
    router.navigate(TAB_ORDER[next]);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX <= -THRESHOLD) runOnJS(go)(1);
      else if (e.translationX >= THRESHOLD) runOnJS(go)(-1);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}
