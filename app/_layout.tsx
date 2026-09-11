import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

// 로컬 저장소 복원이 끝날 때까지 스플래시를 유지한다.
void SplashScreen.preventAutoHideAsync();

/**
 * 웹에서 쓸 글꼴 차례를 정한다.
 *
 * 기본 차례에는 한자·가나를 가진 글꼴이 하나도 없다. 그래서 윈도우
 * 브라우저는 글자마다 아무 글꼴이나 끌어다 쓰는데, 그중에 굵은 꼴이
 * 없는 글꼴이 섞이면 같은 문장 안에서 "您在找" 는 가늘고 "哪座图书馆"
 * 은 굵게 나온다. 중국어 화면에서 굵기가 들쭉날쭉했던 게 이것이다.
 *
 * 한·중·일 글꼴을 차례에 넣어 굵은 꼴이 있는 글꼴로 먼저 가게 한다.
 * 새로 받아 오는 글꼴이 아니라 기기에 이미 있는 것들을 가리키는 것이라
 * 앱이 무거워지지 않는다.
 *
 * 네이티브(아이폰·안드로이드)는 시스템이 알아서 굵은 꼴이 있는 글꼴로
 * 떨어지므로 건드리지 않는다.
 */
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  /*
   * :not([style*="font-family"]) 가 꼭 필요하다.
   *
   * 아이콘(Ionicons)은 글꼴 이름을 요소에 직접 박아 넣는다. !important 로
   * 싸잡아 덮으면 아이콘이 전부 네모로 깨진다. 글꼴을 직접 지정한 요소는
   * 건드리지 않고 지나간다.
   */
  style.textContent = `
    body, body *:not([style*="font-family"]) {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR",
        "PingFang SC", "Hiragino Sans", "Yu Gothic UI", "Microsoft YaHei",
        "Noto Sans SC", "Noto Sans JP", Helvetica, Arial, sans-serif !important;
    }
  `;
  document.head.appendChild(style);
}

export default function RootLayout() {
  const hydrated = useAppStore((s) => s._hydrated);
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!hydrated) return;
    void SplashScreen.hideAsync();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const onOnboarding = segments[0] === 'onboarding';

    /**
     * QR 딥링크로 바로 들어온 경우(libraryapp://library/{id})에는
     * 온보딩을 가로채지 않는다. 책에서 QR을 찍은 사용자는 특정 도서관을 보러 온
     * 것이므로, 목적지를 먼저 보여주는 게 맞다.
     */
    const isDeepLinkedDetail = segments[0] === 'library';

    /**
     * 안내는 처음 설치했을 때 한 번만 띄운다.
     *
     * hasSeenOnboarding 은 기기에 저장되므로 앱을 껐다 켜도 다시 뜨지 않는다.
     * (한때 켤 때마다 띄워 봤는데, 매번 세 장을 넘겨야 해서 금방 성가시다)
     * 마이 탭에서 기록을 전부 지우면 이 값도 함께 지워져 다시 나온다.
     */
    if (!hasSeenOnboarding && !onOnboarding && !isDeepLinkedDetail) {
      router.replace('/onboarding');
    }
  }, [hydrated, hasSeenOnboarding, segments, router]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.text },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="library/[id]"
          options={{ title: '', headerTransparent: true, headerBackTitle: '' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
