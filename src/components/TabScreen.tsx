import React, { useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaView as ControllerSafeAreaView } from 'react-native-screens/experimental';
import { LayoutWidth } from '@/hooks/useLayout';
import { useNativeTabs } from '@/hooks/useNativeTabs';

/**
 * 탭 화면의 바깥 틀. 위쪽 안전 영역만큼 내려서 시작한다.
 *
 * 우리가 그린 탭바를 쓸 때는 예전과 똑같이 상태 표시줄 아래에서 시작한다.
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
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** 아래쪽 안전 영역(탭바 자리)을 비울지. 키보드가 올라온 동안에는 끈다 */
  bottomEdge?: boolean;
}) {
  const native = useNativeTabs();
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState<number | null>(null);

  if (!native) {
    return (
      <SafeAreaView style={style} edges={['top']}>
        {children}
      </SafeAreaView>
    );
  }

  return (
    <ControllerSafeAreaView
      style={style}
      edges={{ top: true, left: true, right: true, bottom: bottomEdge }}
    >
      <View
        style={styles.fill}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0 && w !== width) setWidth(w);
        }}
      >
        <LayoutWidth width={width ?? windowWidth}>{children}</LayoutWidth>
      </View>
    </ControllerSafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
