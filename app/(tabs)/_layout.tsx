import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TopTabs } from 'expo-router/build/layouts/TopTabs';
import type { ComponentProps } from 'react';
import { LiquidTabBar } from '@/components/LiquidTabBar';
import { colors } from '@/theme';

/**
 * 좌우로 쓸어 넘길 수 있는 탭.
 *
 * 원래는 눌러야만 넘어가는 탭이었다. 손가락을 따라 화면이 끌려오게 하려면
 * 페이지를 넘기는 방식이라야 해서 갈아탔다. 위치는 그대로 아래다.
 *
 * ⚠️ @react-navigation/material-top-tabs 를 직접 쓰면 안 된다.
 *   SDK 56 부터 expo-router 는 외부 react-navigation 패키지와 함께 쓸 수
 *   없고, 번들러가 아예 막는다. 대신 expo-router 가 같은 것을 안에 넣어
 *   두었으므로 그걸 쓴다 (react-native-tab-view / react-native-pager-view 는
 *   따로 깔아야 한다 — 이 둘은 expo-router 가 동적으로 찾는다).
 *
 * 탭바는 LiquidTabBar 가 직접 그린다. 여기에는 어떤 탭이 있는지만 적는다.
 */
export default function TabsLayout() {
  return (
    <TopTabs
      tabBarPosition="bottom"
      tabBar={(props: ComponentProps<typeof LiquidTabBar>) => <LiquidTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <TopTabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <TopTabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="search" size={22} color={color} />,
        }}
      />
      <TopTabs.Screen
        name="chat"
        options={{
          title: '달곰이',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="chatbubble-ellipses" size={22} color={color} />
          ),
        }}
      />
      <TopTabs.Screen
        name="favorites"
        options={{
          title: '즐겨찾기',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="heart" size={22} color={color} />,
        }}
      />
      <TopTabs.Screen
        name="mypage"
        options={{
          title: '마이',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
    </TopTabs>
  );
}
