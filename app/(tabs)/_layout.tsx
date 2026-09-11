import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { LiquidTabBar, type TabBarProps } from '@/components/LiquidTabBar';

/**
 * 탭 구성.
 *
 * 눌러서 넘기는 탭이다. 한때 페이지를 쓸어 넘기는 방식으로 바꿔 봤는데,
 * 정작 원했던 건 페이지가 아니라 **탭바 위에서 손가락을 끄는 것**이었다.
 * 그건 LiquidTabBar 안에서 처리하므로 페이지 넘김은 필요 없어져 되돌렸다.
 * (react-native-tab-view / react-native-pager-view 도 같이 걷어냈다)
 *
 * 탭바는 LiquidTabBar 가 직접 그린다 — 떠 있는 알약, 따라다니는 유리,
 * 끌어서 옮기기가 기본 탭바로는 안 되기 때문이다. 여기에는 어떤 탭이
 * 있는지만 적는다.
 *
 * 탭바가 콘텐츠 위에 떠 있으므로 각 화면은 useTabBarPadding() 으로
 * 아래 여백을 확보해야 한다.
 */
export default function TabsLayout() {
  return (
    <Tabs
      /* 내비게이션 라이브러리가 주는 타입은 이벤트 이름까지 제네릭으로 묶여 있어
         우리가 쓰는 부분만 적은 타입과 그대로는 안 맞는다. 실제로 넘어오는 값은
         같은 모양이므로 이 한 곳에서만 맞춰 준다. */
      tabBar={(props) => <LiquidTabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarIcon: ({ color }) => <Ionicons name="search" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '달곰이',
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-ellipses" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: '즐겨찾기',
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
