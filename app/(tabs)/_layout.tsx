import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR } from '@/hooks/useTabBarPadding';
import { colors } from '@/theme';

/**
 * 떠 있는 알약 탭바.
 *
 * 화면 끝에 붙은 띠가 아니라, 양옆과 아래에 여백을 두고 둥글게 떠 있는 모양이다.
 * 요즘 앱들이 쓰는 그 느낌인데, 핵심은 흐림 효과가 아니라 **형태와 띄움**이다.
 *
 * 그래서 네이티브 모듈을 쓰지 않는다. 전에 expo-glass-effect 로 진짜 유리를
 * 넣었다가 앱이 켜지자마자 죽었고, 되돌리는 데 며칠이 걸렸다. 스타일만으로
 * 만들면 어느 기기에서도 죽을 일이 없고, 저장하는 즉시 반영된다.
 *
 * 떠 있는 만큼 콘텐츠가 그 밑으로 흘러 들어가므로, 각 화면은
 * useTabBarPadding() 으로 아래 여백을 확보해야 한다.
 */
export default function TabsLayout() {
  /**
   * 기기마다 다른 하단 안전영역을 반영한다.
   * (홈 버튼이 있는 기기는 inset 0, 인디케이터가 있는 기기는 약 34pt)
   */
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, TAB_BAR.minBottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          left: TAB_BAR.side,
          right: TAB_BAR.side,
          bottom,
          height: TAB_BAR.height,
          borderRadius: TAB_BAR.height / 2,
          backgroundColor: colors.surface,
          // 띠가 아니라 떠 있는 판이므로 위쪽 경계선을 지운다
          borderTopWidth: 0,
          paddingTop: 9,
          paddingBottom: 9,
          // 떠 있어 보이게 하는 그림자. 진하면 무거워 보여 옅게 깐다.
          shadowColor: '#2E2A26',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
        },
        tabBarItemStyle: {
          // 알약 안에서 위아래 가운데를 잡는다
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
          // 한글이 잘리지 않도록 여유를 준다
          lineHeight: 14,
          marginTop: 1,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
