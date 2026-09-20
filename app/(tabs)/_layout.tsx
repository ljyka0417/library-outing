import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { LiquidTabBar, type TabBarProps } from '@/components/LiquidTabBar';
import {
  SIDEBAR_WIDTH,
  TABS,
  TabletSidebar,
  TabletSidebarOverlay,
  TabletTopBar,
} from '@/components/TabletNav';
import { LayoutWidth, SIDEBAR_DOCK, navKind } from '@/hooks/useLayout';
import { useNativeTabs } from '@/hooks/useNativeTabs';
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
 * ⚠️ 처음엔 두 화면이 반투명하게 겹치는 순간을 줄이려고 앞쪽에서 빨리 나타나는
 *   곡선(ease-out + 가운데 0.85)을 썼다. 재 보니 새 화면이 0.06초 만에 거의 다
 *   나타나서 눈에는 효과가 없는 것과 같았다. 두 화면의 바탕색이 같아 겹치는 순간에
 *   깜빡임도 없으므로, 전체 시간에 고르게 겹치는 평범한 크로스페이드로 둔다.
 */
const TAB_TRANSITION = {
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    config: { duration: 250, easing: Easing.inOut(Easing.quad) },
  },
  sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
      }),
    },
  }),
};

export default function TabsLayout() {
  // 스위치를 바꾸면 내비게이터가 통째로 바뀐다. 그때 첫 탭(홈)으로 돌아간다.
  return useNativeTabs() ? <AppleTabs /> : <OurTabs />;
}

/**
 * 애플 기본 탭바 (시험). iOS 에서 마이 탭의 스위치를 켰을 때만 쓴다.
 *
 * UITabBarController 를 그대로 쓰므로 iOS 26 이상에서는 진짜 Liquid Glass 가 된다.
 * 선택 표시가 물방울처럼 옮겨 가고, 탭바를 끌어 고르기, 스크롤하면 작아지기가
 * 모두 애플 앱과 같게 움직인다.
 *
 *   검색     role="search" 로 두면 iOS 26 이 탭 묶음 오른쪽에 동그란 유리 단추로
 *            떼어 놓는다(App Store·음악 앱 모양). 그래서 맨 끝에 둔다.
 *            이름은 시스템이 기기 언어로 붙인다.
 *   아이패드  sidebarAdaptable 로 App Store 처럼 위쪽 탭바 ⇄ 사이드바를 오간다.
 *   여백     화면 안의 스크롤 목록 하나에만 자동으로 여백이 붙는 방식이라, 검색처럼
 *            가로 칩 줄이 먼저 나오는 화면에서는 엉뚱한 곳에 붙는다. 끄고
 *            useTabBarPadding / TabScreen 으로 직접 잡는다.
 */
/** 탭 화면 칸의 바탕색. 비워 두면 기기 기본색(흰·회색)이 비친다 */
const TAB_CONTENT = { backgroundColor: colors.background };

function AppleTabs() {
  const { t } = useT();

  return (
    <NativeTabs tintColor={colors.primary} minimizeBehavior="onScrollDown" sidebarAdaptable>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets contentStyle={TAB_CONTENT}>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>{t('tab.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat" disableAutomaticContentInsets contentStyle={TAB_CONTENT}>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
        />
        <NativeTabs.Trigger.Label>{t('tab.chat')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites" disableAutomaticContentInsets contentStyle={TAB_CONTENT}>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
        <NativeTabs.Trigger.Label>{t('tab.favorites')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mypage" disableAutomaticContentInsets contentStyle={TAB_CONTENT}>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <NativeTabs.Trigger.Label>{t('tab.mypage')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search" disableAutomaticContentInsets contentStyle={TAB_CONTENT}>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>{t('tab.search')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** 우리가 그린 탭바. 폰은 떠 있는 알약, 태블릿은 사이드바 ⇄ 위쪽 탭바 */
function OurTabs() {
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

  /*
   * 나머지 탭을 미리 만들어 둔다.
   *
   * 탭 화면은 처음 눌렀을 때 만들어진다. 검색 탭은 카드 목록과 상세 칸까지 만드느라
   * 재 보니 누른 뒤 전환이 시작되기까지 0.5초가 걸렸다(개발 PC, CPU 6배 느리게).
   * 그동안 화면이 멈춰 첫 전환이 뚝 끊겨 보인다. 앱이 켜지고 첫 화면이 자리 잡은
   * 뒤에 하나씩 미리 만들어 두면, 처음 누를 때도 이미 있는 화면으로 넘어간다.
   * 한꺼번에 만들면 그 순간 첫 화면이 멈추므로 사이를 둔다.
   */
  useEffect(() => {
    const timers = TABS.filter((tab) => tab.href !== '/').map((tab, i) =>
      setTimeout(() => router.prefetch(tab.href), 1200 + i * 400)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

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
