import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

// 로컬 저장소 복원이 끝날 때까지 스플래시를 유지한다.
void SplashScreen.preventAutoHideAsync();

/**
 * 이번 실행에서 달곰이 안내를 이미 띄웠는가.
 *
 * 앱을 켤 때마다 안내를 보여 준다. 모듈 스코프 변수라 앱이 완전히 꺼지면
 * 함께 사라지고, 앱 안에서 화면을 옮겨 다니는 동안에는 남아 있다.
 * 저장소에 넣지 않는 이유가 그것이다 — 저장하면 "한 번 보면 끝" 이 되고,
 * 화면 상태로 두면 탭을 옮길 때마다 다시 뜬다.
 */
let shownThisLaunch = false;

export default function RootLayout() {
  const hydrated = useAppStore((s) => s._hydrated);
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

    if (isDeepLinkedDetail) {
      // QR 로 들어왔으면 안내를 건너뛰되, 이번 실행에서는 다시 띄우지 않는다
      shownThisLaunch = true;
      return;
    }

    if (!shownThisLaunch && !onOnboarding) {
      shownThisLaunch = true;
      router.replace('/onboarding');
    }
  }, [hydrated, segments, router]);

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
