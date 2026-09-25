import { createContext, createElement, useContext, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * 화면 크기에 따라 달라지는 값들을 한곳에 모은다.
 *
 * ─────────────────────────────────────────────────────────────
 * 기기별로 맞추지 않는다. 폭으로 가른다.
 * ─────────────────────────────────────────────────────────────
 * 아이폰 SE 부터 17 프로, 갤럭시, 아이패드 미니부터 13인치 프로까지 전부
 * "지금 쓸 수 있는 폭" 하나로 갈린다. 그래야 아이패드를 반으로 나눠 쓰거나
 * 새 기종이 나와도 따로 손댈 게 없다.
 *
 *   아이패드 (pt)            세로     가로
 *   미니 6·7세대             744     1133
 *   아이패드 10·11세대       820     1180
 *   에어 11 / 프로 11        820~834 1180~1210
 *   에어 13 / 프로 13        1024~1032  1366~1376
 *
 * ─────────────────────────────────────────────────────────────
 * 아이패드를 폰 화면처럼 쓰지 않는다
 * ─────────────────────────────────────────────────────────────
 * 처음엔 태블릿에서 내용을 폭 680 칸에 가두고 폰 화면을 가운데에 놓았다.
 * 실제 아이패드에서 보니 "폰 앱을 크게 띄운 것" 으로 보였다. 가로로 눕히면
 * 화면 절반이 비었고, 아래 떠 있는 탭바도 폰의 모양이었다. 그래서
 *
 *   - 이동 메뉴를 아이패드 앱처럼 둔다  (사이드바 ⇄ 위쪽 탭바 → navKind, TabletNav)
 *   - 넓으면 목록과 상세를 나란히 둔다 (쓸 수 있는 폭으로 정한다 → split)
 *   - 카드 열 수는 폭에서 계산한다     (기기 이름을 보지 않는다 → listColumns)
 *   - 긴 글만 읽기 좋은 폭에 묶는다     (readableWidth)
 *
 * 태블릿 기준을 768 에서 600 으로 내렸다. 768 로 두었더니 아이패드 미니를
 * 세로로 들었을 때(744) 폰 화면이 나왔다. 가장 큰 폰도 440 이라 600 이면
 * 폰과 섞이지 않는다.
 */

/** 이 폭부터 태블릿 배치 */
const TABLET = 600;
/** 이 폭 미만이면 좁은 폰 (아이폰 SE 1세대, 옛 갤럭시) */
const COMPACT = 360;
/**
 * 창 폭이 이 이상이면 사이드바를 내용 옆에 붙여 두고, 아니면 내용 위에 덮어 띄운다.
 * 모든 아이패드의 가로가 여기 든다. 사이드바를 처음에 펼쳐 둘지도 이 값으로 정한다.
 */
export const SIDEBAR_DOCK = 1100;
/** 쓸 수 있는 폭이 이 이상이면 목록과 상세를 나란히 둔다. 에어 11 가로에 사이드바를 펼쳐 둔 880 까지 든다 */
const SPLIT = 880;
/** 카드 한 장이 이보다 좁아지면 열을 줄인다. 이름이 두 줄로 잘리지 않는 폭이다 */
const MIN_CARD = 290;

export type NavKind = 'bottom' | 'tablet';

/**
 * 창 폭으로 이동 메뉴를 정한다.
 *   bottom  폰의 아래 떠 있는 알약
 *   tablet  사이드바 ⇄ 위쪽 탭바 (TabletNav)
 */
export function navKind(windowWidth: number): NavKind {
  return windowWidth < TABLET ? 'bottom' : 'tablet';
}

export interface Layout {
  /** 이 화면(또는 칸)이 쓸 수 있는 폭 */
  width: number;
  /** 창 전체의 폭. 이동 메뉴를 고를 때만 쓴다 */
  windowWidth: number;
  nav: NavKind;
  isCompact: boolean;
  isTablet: boolean;
  /** 목록·그리드가 퍼질 수 있는 최대 폭 */
  maxContentWidth: number;
  /** 긴 글·대화·설정처럼 한 줄이 길면 읽기 힘든 내용의 최대 폭 */
  readableWidth: number;
  /** 좌우 여백 */
  gutter: number;
  /** 주제 그리드 열 수. 분류 14개 — 태블릿 7열이면 2줄로 딱 떨어지고, 폰 4열은 마지막 줄만 2개 */
  categoryColumns: number;
  /** 도서관 카드 열 수 */
  listColumns: number;
  /** 목록과 상세를 나란히 둘 만큼 넓은가 */
  split: boolean;
  /** 나란히 둘 때 왼쪽 목록 칸의 폭 */
  listPaneWidth: number;
  /** 가로로 넘기는 추천 카드 한 장의 폭 */
  carouselCardWidth: number;
  /** 주제 아이콘 상자 크기 */
  categoryIconSize: number;
}

/**
 * 이 아래가 쓸 수 있는 폭.
 *
 * 창 폭을 그대로 쓰면 틀린다. 사이드바가 왼쪽을 차지하고, 나란히 놓인 목록·상세
 * 칸은 각자 창의 일부만 쓴다. 그 칸 안의 화면이 "나는 1180 짜리 화면이다" 라고
 * 믿으면 두 줄 카드를 좁은 칸에 욱여넣는다. 감싼 쪽이 폭을 알려 준다.
 * 감싼 게 없으면(탭 바깥의 상세 화면처럼) 창 폭을 쓴다.
 */
const WidthContext = createContext<number | null>(null);

export function LayoutWidth({ width, children }: { width: number; children: ReactNode }) {
  return createElement(WidthContext.Provider, { value: width }, children);
}

export function useLayout(): Layout {
  const { width: windowWidth } = useWindowDimensions();
  const provided = useContext(WidthContext);
  const width = provided ?? windowWidth;

  const isTablet = width >= TABLET;
  const isCompact = width < COMPACT;
  const gutter = isTablet ? 28 : isCompact ? 16 : 20;

  /*
   * 1080.
   *
   * 폭 680 에 가두던 것을 풀었다. 카드와 아이콘은 넓게 퍼져도 읽기가 어렵지
   * 않다. 다만 13인치 가로(1134)까지 끝에서 끝으로 늘리면 카드 사이가 휑해져서
   * 이쯤에서 멈춘다.
   */
  const maxContentWidth = isTablet ? Math.min(width, 1080) : width;

  /*
   * 카드 열 수는 폭에서 셈한다. 기기 이름을 보지 않으므로 아이패드를 반으로
   * 나눠 써도 맞게 줄어든다. 세 줄이 넘으면 눈이 가로로 오가느라 지친다.
   */
  const usable = maxContentWidth - gutter * 2;
  const gap = 12;
  const listColumns = Math.max(1, Math.min(3, Math.floor((usable + gap) / (MIN_CARD + gap))));

  const split = width >= SPLIT;

  return {
    width,
    windowWidth,
    nav: navKind(windowWidth),
    isCompact,
    isTablet,
    maxContentWidth,
    readableWidth: isTablet ? Math.min(width, 720) : width,
    gutter,
    categoryColumns: isTablet ? 7 : 4,
    listColumns,
    split,
    // 목록 칸은 폰 한 대 폭쯤. 넓은 화면에서도 420 을 넘기지 않아야 상세가 넉넉하다.
    listPaneWidth: split ? Math.round(Math.min(420, Math.max(360, width * 0.38))) : width,
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
 * readable 을 주면 긴 글에 맞는 좁은 폭에 모은다.
 */
export function centered(layout: Layout, readable = false) {
  return {
    width: '100%' as const,
    maxWidth: readable ? layout.readableWidth : layout.maxContentWidth,
    alignSelf: 'center' as const,
  };
}

/**
 * 가운데 칸 바깥, 양옆에 남는 폭. 폰에서는 0 이다.
 */
export function sideSpace(layout: Layout, readable = false) {
  const inner = readable ? layout.readableWidth : layout.maxContentWidth;
  return Math.max(0, (layout.width - inner) / 2);
}

/**
 * 옆으로 넘기는 카드 줄을 칸 양 끝까지 늘린다.
 *
 * 가운데 칸 안에 가둔 채로 두면, 아이패드에서 카드가 칸 오른쪽 끝에서 뚝
 * 잘렸다. 그 바깥은 텅 비어 있는데 가운데서 끊기니 고장 난 것처럼 보였다.
 * 그래서 줄은 칸 밖으로 양쪽을 늘리고, 첫 카드만 본문 왼쪽 줄에 맞춘다.
 * 아이패드 앱스토어의 가로 선반이 이렇게 생겼다.
 *
 * 쓰는 법 — 가운데 칸 안에 있는 ScrollView 에
 *   style={bleedRow(layout).style}
 *   contentContainerStyle={[원래 스타일, bleedRow(layout).content]}
 *
 * 첫 카드가 섹션 제목과 같은 선에서 시작하도록 여백은 gutter 를 쓴다.
 */
export function bleedRow(layout: Layout) {
  const outside = sideSpace(layout);
  return {
    style: { marginHorizontal: -outside },
    content: { paddingHorizontal: outside + layout.gutter },
  };
}
