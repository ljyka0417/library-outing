import { useWindowDimensions } from 'react-native';

/**
 * 화면 크기에 따라 달라지는 값들을 한곳에 모은다.
 *
 * 기기별로 맞추지 않는다. 아이폰 8부터 17 프로, 갤럭시 S7부터 S26,
 * 아이패드와 갤럭시 탭까지 전부 **폭 세 갈래**로 갈린다. 새 기기가 나와도
 * 폭은 이 셋 중 하나에 들어오므로 여기만 고치면 된다.
 *
 *   좁은 폰   ~359   아이폰 SE 1·2세대, 옛 갤럭시
 *   보통 폰   360~767 대부분의 폰. 접는 폰을 펼친 상태도 여기 들어온다
 *   태블릿    768~   아이패드, 갤럭시 탭
 *
 * 태블릿에서 본문을 화면 끝까지 늘리지 않는 이유
 *   글 한 줄이 길어질수록 눈이 다음 줄 첫 글자를 못 찾는다. 종이책이
 *   아무리 큰 판형이어도 단을 나누는 것과 같은 이유다. 그래서 가운데로
 *   모으고 폭을 묶는다. 여백이 남는 게 아니라 읽기 쉬워지는 것이다.
 */

/** 폭이 이 값 이상이면 태블릿으로 본다 (아이패드 세로가 768) */
const TABLET = 768;
/** 폭이 이 값 미만이면 좁은 폰으로 본다 (아이폰 SE 가 375, 옛 기기가 360) */
const COMPACT = 360;

export interface Layout {
  width: number;
  isCompact: boolean;
  isTablet: boolean;
  /** 본문을 이 폭 안에 가둔다. 폰에서는 화면 폭 그대로다. */
  maxContentWidth: number;
  /** 좌우 여백 */
  gutter: number;
  /** 주제 그리드 열 수. 12개라서 4열이면 3줄, 6열이면 2줄로 딱 떨어진다. */
  categoryColumns: number;
  /** 도서관 목록 열 수 */
  listColumns: number;
  /** 가로로 넘기는 추천 카드 한 장의 폭 */
  carouselCardWidth: number;
  /** 주제 아이콘 상자 크기 */
  categoryIconSize: number;
}

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET;
  const isCompact = width < COMPACT;

  return {
    width,
    isCompact,
    isTablet,
    /*
     * 680.
     *
     * 처음에 760 으로 뒀는데 아이패드 세로 폭이 768 이라 좌우에 4픽셀씩만
     * 남았다. 결국 폰 화면을 그대로 늘린 모양 그대로였다. 680 이면 세로로
     * 볼 때도 여백이 생기고, 가로로 눕히거나 큰 아이패드로 가도 글 한 줄이
     * 눈으로 좇을 수 있는 길이에 머문다.
     */
    maxContentWidth: isTablet ? 680 : width,
    gutter: isTablet ? 28 : isCompact ? 16 : 20,
    categoryColumns: isTablet ? 6 : 4,
    listColumns: isTablet ? 2 : 1,
    carouselCardWidth: isTablet ? 220 : isCompact ? 150 : 168,
    categoryIconSize: isTablet ? 64 : isCompact ? 48 : 56,
  };
}

/**
 * 본문을 가운데로 모으는 스타일.
 *
 * ⚠️ ScrollView 의 contentContainerStyle 에 그냥 넣으면 안 된다.
 *   그 자리는 스크롤되는 내용 전체를 감싸는 틀이라, alignSelf 가 먹지 않고
 *   왼쪽에 붙은 채로 남는다. ScrollView 안에서는 **내용을 View 하나로 감싸
 *   그 View 에** 넣어야 한다.
 *
 * 폰에서는 maxContentWidth 가 화면 폭이라 아무 일도 일어나지 않는다.
 */
export function centered(layout: Layout) {
  return {
    width: '100%' as const,
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center' as const,
  };
}
