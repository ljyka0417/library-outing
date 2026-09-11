import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LiquidTabBar } from '@/components/LiquidTabBar';

/**
 * 탭 구성.
 *
 * 탭바는 LiquidTabBar 가 직접 그린다 — 떠 있는 알약 모양과, 고른 칸을
 * 따라다니는 방울이 기본 탭바로는 안 되기 때문이다. 그래서 여기에는
 * 모양에 대한 설정이 없고 어떤 탭이 있는지만 적는다.
 *
 * 탭바가 콘텐츠 위에 떠 있으므로 각 화면은 useTabBarPadding() 으로
 * 아래 여백을 확보해야 한다. 안 그러면 목록 마지막 항목이 알약에 가린다.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
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
