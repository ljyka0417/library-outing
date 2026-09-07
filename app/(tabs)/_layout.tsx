import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

export default function TabsLayout() {
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
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          // 한글이 잘리지 않도록 여유를 준다
          lineHeight: 16,
          marginTop: 2,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size - 3} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size - 3} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: '즐겨찾기',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size - 3} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size - 3} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
