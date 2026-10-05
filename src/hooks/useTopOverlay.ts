import { createContext, useContext } from 'react';

/**
 * 화면 위에 떠 있는 위쪽 탭바의 높이 (상태 표시줄 포함, dp). 없으면 0.
 *
 * 우리가 그린 태블릿 위쪽 탭바(안드로이드·웹 태블릿, 사이드바를 접었을 때)는 본문 위에 **떠** 있다 —
 * 폰 탭바처럼 스크롤하면 글이 반투명 유리판 밑으로 지나가게 (2026-10-05). 그래서 본문 틀(TabScreen)이
 * 이만큼 위를 비우거나(보통 화면), 화면 끝까지 까는 화면(bleed)은 스크롤 목록이 이만큼 비운다.
 * 값은 app/(tabs)/_layout.tsx 가 탭바를 재서 넣는다. 아이패드는 애플 탭바라 0.
 */
export const TopOverlayContext = createContext(0);

export function useTopOverlay() {
  return useContext(TopOverlayContext);
}
