import React from 'react';
import { CourseFlow } from '@/components/CourseFlow';
import { TabScreen, useBleed } from '@/components/TabScreen';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

/**
 * 코스 탭 — 오늘의 나들이. 도서관 고르기부터 (저장한 코스도 여기서 다시 연다).
 * 홈·설정처럼 화면 끝까지 깔고 유리 탭바 밑으로 지나가게(TabScreen bleed).
 */
export default function CourseTab() {
  const bleed = useBleed();
  const tabPad = useTabBarPadding();
  return (
    <TabScreen bleed>
      <CourseFlow insetTop={bleed.on ? bleed.top : 0} insetBottom={bleed.on ? bleed.bottom : tabPad} />
    </TabScreen>
  );
}
