import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
export default function TabsLayout() {
  const { t } = useT();
  const { width } = useWindowDimensions();
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
      screenOptions={{ headerShown: false }}
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
