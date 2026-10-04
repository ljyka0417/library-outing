import React, { useEffect, useRef } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppStore } from '@/store/useAppStore';
import { applyScheme, colors, currentScheme } from '@/theme';
import { FavoritePopupHost } from '@/components/FavoritePopup';

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
  const pathname = usePathname();

  /*
   * 다크 모드. 시스템을 따르면 기기 설정(useColorScheme), 아니면 고른 쪽.
   * 색(colors)을 바꾸고 화면 전체를 새로 그린다(아래 key). 새로 그리면 내비게이션이 처음으로
   * 돌아가므로, 바꾸기 직전에 보던 화면으로 다시 데려다 놓는다.
   */
  const themePref = useAppStore((s) => s.themePref);
  const system = useColorScheme();
  const scheme = themePref === 'system' ? (system === 'dark' ? 'dark' : 'light') : themePref;
  const before = currentScheme();
  /*
   * 저장된 설정을 읽은 뒤에만 색을 바꾼다. 읽기 전(themePref 가 기본값 'system')에 기기 설정(다크)을
   * 먼저 칠했다가 곧 저장된 쪽(밝게)으로 되돌리는 사이에, 아이패드에서 일부만 다크로 남는 일이 있었다.
   */
  if (hydrated) applyScheme(scheme);
  const lastPath = useRef(pathname);
  const backTo = useRef<string | null>(null);
  if (hydrated && before !== scheme) backTo.current = lastPath.current;
  useEffect(() => {
    lastPath.current = pathname;
  }, [pathname]);
  // 앱이 네이티브 모드를 덮어썼는지 — 덮어쓴 적이 없으면 "시스템"일 때 다시 묻지 않는다
  // (괜히 되돌리면 그 순간 밝게↔어둡게가 한 번 깜빡여 화면이 두 번 칠해진다)
  const overridden = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    // 애플 기본 탭바·키보드·알림창 같은 네이티브 부분도 같은 모드로
    if (themePref === 'system') {
      if (overridden.current) Appearance.setColorScheme?.('unspecified');
      overridden.current = false;
    } else {
      Appearance.setColorScheme?.(themePref);
      overridden.current = true;
    }
  }, [themePref, hydrated]);
  useEffect(() => {
    // 앱 창 맨 밑 바탕(키보드·화면 전환 때 비치는 곳)도 같은 색으로
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [scheme]);
  useEffect(() => {
    if (backTo.current && backTo.current !== '/') {
      const to = backTo.current;
      backTo.current = null;
      setTimeout(() => router.replace(to as never), 0);
    }
  }, [scheme, router]);

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
    /* 바탕색을 창 맨 밑에도 깔아 둔다. 애플 기본 탭바를 쓰면 화면 칸이 상태 표시줄
       아래에서 시작해, 그 위가 기기 기본 회색으로 남았다. */
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        key={scheme}
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.text },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          // 뒤로가기는 화살표만 — 이전 화면 이름이 폴더 이름 「(tabs)」 로 나와서 (달곰이 꾸미기 등 모든 화면)
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="library/[id]"
          options={{
            title: '',
            headerTransparent: true,
            /*
             * 뒤로가기 단추에 화살표만 남긴다.
             *
             * iOS 는 기본으로 이전 화면의 이름을 화살표 옆에 붙이는데, 우리 이전 화면은
             * 파일 폴더 이름인 「(tabs)」 라서 그 글자가 그대로 나왔다. 개발 중인 티가 난다.
             * headerBackTitle: '' 로는 안 없어지고, 이 옵션이라야 화살표만 남는다.
             */
            headerBackButtonDisplayMode: 'minimal',
            // 내리면 투명하던 위쪽 바에 바탕이 깔린다 — 도서관 화면 본문(흰 surface)과 같은 색이라야 띠가 안 생긴다
            headerStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack>
      {/* 하트로 즐겨찾기에 담았을 때 뜨는 창 — 하트가 여러 화면에 있어서 여기 하나만 둔다 */}
      <FavoritePopupHost />
    </GestureHandlerRootView>
  );
}
