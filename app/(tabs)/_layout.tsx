import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/GlassBackground';
import { isGlassTabBar as isGlass } from '@/hooks/useTabBarPadding';
import { useT } from '@/i18n';
import { colors } from '@/theme';

export default function TabsLayout() {
  const T = useT();
  /**
   * 탭바 높이를 60 으로 고정해 뒀더니 아이폰에서 아이콘·라벨이 홈 인디케이터에
   * 겹쳐 내려가 눌리기 어려웠다. 기기마다 다른 하단 안전영역을 더해 줘야 한다.
   * (홈 버튼이 있는 기기는 inset 0, 인디케이터가 있는 기기는 약 34pt)
   */
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        /**
         * 유리 탭바.
         *
         * 배경을 투명으로 비우고 그 자리에 유리를 깐다. 색을 남겨 두면
         * 유리 위에 불투명한 판이 한 겹 더 얹혀 흐림이 보이지 않는다.
         * position:absolute 로 띄워야 콘텐츠가 탭바 밑으로 흘러가면서
         * 비쳐 보인다 — 그게 유리를 쓰는 이유다.
         *
         * 웹은 예외다. tabBarBackground 가 먹지 않아 배경이 아예 비고,
         * 글자가 뒤 내용과 겹쳐 안 읽힌다. 웹에서는 그냥 불투명하게 깐다.
         * (웹은 개발 중 확인용 화면이라 유리가 안 나와도 잃을 게 없다)
         */
        tabBarBackground: isGlass ? () => <GlassBackground /> : undefined,
        tabBarStyle: {
          position: isGlass ? 'absolute' : 'relative',
          backgroundColor: isGlass ? 'transparent' : colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isGlass ? 'rgba(0,0,0,0.06)' : colors.border,
          elevation: 0,
          // 탭이 다섯이 되면서 라벨이 눌려 3px 로 찌그러졌다. 세로를 조금 늘린다.
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
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
          title: T.tabs.home,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size - 3} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: T.tabs.search,
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size - 3} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: T.tabs.chat,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size - 3} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: T.tabs.favorites,
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size - 3} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: T.tabs.mypage,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size - 3} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
