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
 *   폭    아이패드에서 사이드바를 펼치면 그만큼 화면이 좁아진다. 창 폭은 그대로라
 *         화면들이 창 폭을 믿으면 사이드바 밑으로 파고든다. 실제로 받은 폭을 재서
 *         LayoutWidth 로 알려 준다.
 */
export function TabScreen({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
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
    <ControllerSafeAreaView style={style} edges={{ top: true }}>
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
