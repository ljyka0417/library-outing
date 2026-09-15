import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { LiquidTabBar, type TabBarProps } from '@/components/LiquidTabBar';
import {
  SIDEBAR_WIDTH,
  TABS,
  TabletSidebar,
  TabletSidebarOverlay,
  TabletTopBar,
} from '@/components/TabletNav';
import { LayoutWidth, SIDEBAR_DOCK, navKind } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { colors } from '@/theme';

/**
 * 탭 구성.
 *
 * 눌러서 넘기는 탭이다. 한때 페이지를 쓸어 넘기는 방식으로 바꿔 봤는데,
 * 정작 원했던 건 페이지가 아니라 **탭바 위에서 손가락을 끄는 것**이었다.
 * 그건 LiquidTabBar 안에서 처리하므로 페이지 넘김은 필요 없어져 되돌렸다.
 * (react-native-tab-view / react-native-pager-view 도 같이 걷어냈다)
 *
 * 폰: 탭바는 LiquidTabBar 가 직접 그린다 — 떠 있는 알약, 따라다니는 유리,
 *     끌어서 옮기기가 기본 탭바로는 안 되기 때문이다. 탭바가 콘텐츠 위에
 *     떠 있으므로 각 화면은 useTabBarPadding() 으로 아래 여백을 확보한다.
 *
 * 태블릿: 아이패드 기본 앱(App Store)처럼 사이드바 ⇄ 위쪽 탭바. TabletNav 참고.
 *     탭 내비게이터의 탭바 자리는 비워 두고 틀을 여기서 짠다.
 */
/**
 * 탭을 바꿀 때 화면이 넘어가는 모양.
 *
 * 아무것도 안 주면 탭이 한 프레임 만에 바뀌어서 뚝 끊겨 보였다. App Store 앱처럼
 * 짧게 겹쳐 사라지고 나타나게 한다. 옆으로 미는 움직임은 넣지 않는다. 아이폰·
 * 아이패드 기본 앱들도 탭 사이에서는 화면을 밀지 않는다 (밀면 "안으로 들어간다"
 * 로 읽힌다).
 *
 * 그냥 'fade' 를 쓰면 나가는 화면과 들어오는 화면이 똑같이 반씩 투명해지는
 * 순간 바탕색이 비쳐 한 번 깜빡인다. 그래서 가운데까지는 거의 불투명하게 두고
 * 끝에서만 빠르게 사라진다. 들어오는 화면이 위에 놓이므로 둘을 합치면 거의
 * 가려진 채로 바뀐다.
 */
const TAB_TRANSITION = {
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    config: { duration: 220, easing: Easing.out(Easing.cubic) },
  },
  sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, -0.5, 0, 0.5, 1],
        outputRange: [0, 0.85, 1, 0.85, 0],
      }),
    },
  }),
};

export default function TabsLayout() {
  const { t } = useT();
  const { width } = useWindowDimensions();
  // 설정에서 「동작 줄이기」를 켠 사람에게는 넘어가는 효과를 주지 않는다
  const reduceMotion = useReducedMotion();
  const nav = navKind(width);

  /*
   * 사이드바를 펼쳐 둘까.
   *
   * 가로로 눕힌 아이패드(창 폭 1100 이상)는 펼친 채로, 세로는 접은 채로 시작한다.
   * 사람이 단추로 바꾸면 그걸 따르되, 아이패드를 돌려 폭이 그 경계를 넘으면 다시
   * 그 방향의 기본값으로 돌아간다. 세로에서 열어 둔 사이드바가 가로로 돌렸을 때
   * 덮개 모양 그대로 남아 있으면 어색하다.
   */
  const wide = width >= SIDEBAR_DOCK;
  const [openChoice, setOpenChoice] = useState<boolean | null>(null);
  useEffect(() => setOpenChoice(null), [wide]);
  const sidebarOpen = openChoice ?? wide;

  const docked = nav === 'tablet' && sidebarOpen && wide;
  const overlay = nav === 'tablet' && sidebarOpen && !wide;

  const tabs = (
    <Tabs
      /* 내비게이션 라이브러리가 주는 타입은 이벤트 이름까지 제네릭으로 묶여 있어
         우리가 쓰는 부분만 적은 타입과 그대로는 안 맞는다. 실제로 넘어오는 값은
         같은 모양이므로 이 한 곳에서만 맞춰 준다. */
      tabBar={(props) =>
        nav === 'bottom' ? <LiquidTabBar {...(props as unknown as TabBarProps)} /> : null
      }
      screenOptions={{ headerShown: false, ...(reduceMotion ? null : TAB_TRANSITION) }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            // 탭 이름도 언어를 따라간다. 여기서 title 을 바꾸면 LiquidTabBar 가 그대로 받아 그린다.
            title: t(tab.titleKey),
            tabBarIcon: ({ color }) => <Ionicons name={tab.icon} size={22} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );

  if (nav === 'bottom') return tabs;

  /*
   * 사이드바가 붙어 있으면 그만큼 화면이 쓸 폭이 준다. 그 폭을 LayoutWidth 로
   * 알려 준다. 알려 주지 않으면 화면들이 창 전체 폭을 믿고 사이드바 밑으로 파고든다.
   * 덮어 띄울 때와 위쪽 탭바일 때는 창 전체를 쓴다.
   */
  return (
    <View style={[styles.frame, docked && styles.frameRow]}>
      {docked ? (
        <TabletSidebar onToggle={() => setOpenChoice(false)} />
      ) : (
        <TabletTopBar onToggle={() => setOpenChoice(true)} />
      )}

      <LayoutWidth width={docked ? width - SIDEBAR_WIDTH : width}>
        <View style={styles.content}>{tabs}</View>
      </LayoutWidth>

      {overlay ? <TabletSidebarOverlay onClose={() => setOpenChoice(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.background,
  },
  frameRow: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});
