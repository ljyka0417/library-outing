import React from 'react';
import { CourseFlow } from '@/components/CourseFlow';
import { TabScreen, useBleed } from '@/components/TabScreen';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { colors, themedStyles } from '@/theme';

/**
 * 코스 탭 — 오늘의 나들이. 도서관 고르기부터 (저장한 코스도 여기서 다시 연다).
 * 홈·설정처럼 화면 끝까지 깔고 유리 탭바 밑으로 지나가게(TabScreen bleed).
 *
 * ⚠️ 틀에 flex:1 을 꼭 준다. 빠뜨렸더니 우리가 그린 탭바(안드로이드·애플 탭바 끈 iOS)에서는
 *   틀 높이가 0 이라 안쪽 목록(flex:1)도 0 이 되어 화면이 통째로 비었다.
 *   애플 탭바는 틀이 알아서 늘어나서 거기서만 보였다.
 */
export default function CourseTab() {
  const bleed = useBleed();
  const tabPad = useTabBarPadding();
  return (
    <TabScreen style={styles.safe} bleed>
      <CourseFlow insetTop={bleed.on ? bleed.top : 0} insetBottom={bleed.on ? bleed.bottom : tabPad} />
    </TabScreen>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.background },
}));
