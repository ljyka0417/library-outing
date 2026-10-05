import React, { useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { SafeAreaView as ControllerSafeAreaView } from 'react-native-screens/experimental';
import { LayoutWidth, navKind } from '@/hooks/useLayout';
import { useNativeTabs } from '@/hooks/useNativeTabs';
import { currentScheme, themedStyles } from '@/theme';

/** 애플 탭바(폰)가 홈 인디케이터 위로 차지하는 높이 — 알약과 그 아래위 틈 */
const NATIVE_BAR = 50;

/**
 * 화면 끝까지 깔기(bleed). 폰에서 애플 탭바를 쓸 때만 켜진다.
 *
 * 인스타처럼 글이 유리 탭바 **밑으로** 지나가고 시계 자리 밑으로도 올라간다. 틀이 위아래를
 * 잘라 내지 않는 대신, 스크롤 목록이 처음과 끝에 top / bottom 만큼 비워 둔다.
 * 아이패드는 탭바가 위에 있고 사이드바도 있어 예전처럼 틀이 비운다(on = false).
 */
export function useBleed() {
  const native = useNativeTabs();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const on = native && navKind(width) === 'bottom';
  return { on, top: on ? insets.top : 0, bottom: on ? insets.bottom + NATIVE_BAR + 16 : 0 };
}

/**
 * 탭 화면의 바깥 틀. 위쪽 안전 영역만큼 내려서 시작한다.
 *
 * 우리가 그린 탭바(웹·안드로이드, 또는 iOS 에서 끈 경우)는 예전과 똑같이
 * 상태 표시줄 아래에서 시작한다.
 *
 * 애플 기본 탭바를 쓸 때는 두 가지가 달라진다.
 *
 *   위쪽  아이패드에서는 탭바가 화면 **위**에 뜬다. 상태 표시줄 높이만 비우면
 *         화면 제목이 탭바 밑에 깔린다. 그래서 탭바까지 포함한 안전 영역을
 *         아는 react-native-screens 의 SafeAreaView 를 쓴다.
 *
 *   옆    아이패드의 사이드바는 화면을 밀어내지 않고 **화면 위에 유리로 떠 있다.**
 *         화면은 창 전체에 깔리고, 사이드바 폭은 왼쪽 안전 영역으로만 알려 준다.
 *         위쪽만 비웠더니 실기기에서 인사말·검색창·주제 첫 칸이 사이드바 밑에 깔렸다.
 *         그래서 왼쪽·오른쪽도 안전 영역만큼 비운다. 바탕색은 틀에 칠해 두어
 *         사이드바 유리 너머로는 여전히 화면이 비친다.
 *
 *   폭    그렇게 비우고 남은 폭을 재서 LayoutWidth 로 알려 준다. 창 폭을 믿으면
 *         열 수와 가운데 정렬이 사이드바까지 포함한 폭으로 계산된다.
 *
 *   아래  탭바가 차지하는 만큼도 기기에게 물어서 비운다. 우리가 "탭바는 이만큼"
 *         이라고 어림잡아 여백을 넣었더니, 애플 탭바에서는 그 위에 또 여백이 붙어
 *         달곰이 입력칸과 탭바 사이가 손가락 두 개만큼 떴다.
 *         키보드가 올라오면 탭바는 그 밑에 가려지므로 그때는 끈다(bottomEdge).
 */
export function TabScreen({
  style,
  children,
  bottomEdge = true,
  overlay = false,
  bleed = false,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** 아래쪽 안전 영역(탭바 자리)을 비울지. 키보드가 올라온 동안에는 끈다 */
  bottomEdge?: boolean;
  /**
   * 화면 뒤에 따로 깐 것(내 주변 지도)이 비쳐 보이고 만져지게 — 틀은 손가락을 받지 않고
   * 안쪽 단추·카드만 받는다. 바탕색도 칠하지 않는다.
   */
  overlay?: boolean;
  /** 화면 끝까지 깔기 — useBleed 참고. 스크롤 목록이 useBleed().top / bottom 을 비워야 한다 */
  bleed?: boolean;
}) {
  const native = useNativeTabs();
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState<number | null>(null);
  const edge = useBleed();
  const full = bleed && edge.on;

  if (!native) {
    return (
      <SafeAreaView style={style} edges={['top']} pointerEvents={overlay ? 'box-none' : 'auto'}>
        {/* 한 겹 더 — 안전 영역은 padding 이라, 바로 안의 position:absolute 는 그걸 무시하고
            상태 표시줄 밑으로 올라간다(안드로이드 내 주변 제목이 시계와 겹쳤다) */}
        <View style={styles.fill} pointerEvents={overlay ? 'box-none' : 'auto'}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ControllerSafeAreaView
      style={style}
      edges={{ top: !full, left: true, right: true, bottom: bottomEdge && !full }}
      pointerEvents={overlay ? 'box-none' : 'auto'}
    >
      <View
        style={styles.fill}
        pointerEvents={overlay ? 'box-none' : 'auto'}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0 && w !== width) setWidth(w);
        }}
      >
        <LayoutWidth width={width ?? windowWidth}>{children}</LayoutWidth>
      </View>
      {/* 시계 자리 — 글이 밑으로 지나갈 때 겹쳐 읽히지 않게 살짝 흐린 유리 */}
      {full ? (
        <BlurView
          pointerEvents="none"
          intensity={40}
          tint={currentScheme() === 'dark' ? 'dark' : 'light'}
          style={[styles.statusGlass, { height: edge.top }]}
        />
      ) : null}
    </ControllerSafeAreaView>
  );
}

const styles = themedStyles(() => ({
  fill: {
    flex: 1,
  },
  statusGlass: { position: 'absolute', top: 0, left: 0, right: 0 },
}));
