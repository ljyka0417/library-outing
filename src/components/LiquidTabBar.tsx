import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/GlassSurface';
import { useAppStore } from '@/store/useAppStore';
import { TAB_BAR } from '@/hooks/useTabBarPadding';
import { colors, typography } from '@/theme';

/**
 * 탭바가 실제로 쓰는 것만 적는다.
 *
 * expo-router 안에 든 MaterialTopTabBarProps 는 any 로 풀려 있어서 타입이
 * 하나도 안 잡힌다. 필요한 모양을 여기 직접 적어 두면 무엇에 기대고 있는지도
 * 분명해지고, 나중에 탭 방식을 또 바꿔도 여기만 맞추면 된다.
 */
interface TabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string; params?: object }[];
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarLabel?: string | ((p: { focused: boolean; color: string }) => React.ReactNode);
        tabBarIcon?: (p: { focused: boolean; color: string }) => React.ReactNode;
      };
    }
  >;
  navigation: {
    emit: (e: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
}


/** 알약 좌우 안쪽 여백 */
const PAD = 6;
/**
 * 방울이 칸보다 얼마나 좁은가 (한쪽).
 *
 * 알약 모서리가 둥글어서, 첫 칸과 마지막 칸에서는 방울이 그 곡선 바깥으로
 * 삐져나온다. 알약 반지름이 35 이므로 방울 위아래를 9 만큼 띄우면 그 높이의
 * 경계는 왼쪽에서 약 11.6 이다. 여백을 14(PAD 6 + INSET 8)로 두면 안에 들어온다.
 * (overflow: hidden 이 걸려 있는데도 iOS 에서는 유리가 잘리지 않아, 자르는 데
 *  기대지 않고 애초에 넘지 않게 둔다)
 */
const INSET = 8;

/**
 * 떠 있는 알약 탭바 + 고른 탭을 따라다니는 방울.
 *
 * 기본 탭바로는 "고른 칸 뒤에 방울이 미끄러져 오는" 모양을 만들 수 없어
 * 직접 그린다. 대신 얻는 게 크다 — 도형 하나를 움직이는 것뿐이라
 * 네이티브 모듈을 새로 깔지 않는다. 이미 들어 있는 Reanimated 로 움직인다.
 *
 * 유리를 켜면 방울 대신 **렌즈**가 된다. 아이콘 위에 올려 봤더니 실기기에서
 * 글씨가 뭉개져 읽을 수 없어, 아이콘 뒤에 깐다.
 */
export function LiquidTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, TAB_BAR.minBottom);
  const glass = useAppStore((s) => s.glassTest);

  /**
   * 칸 하나의 너비.
   *
   * 처음엔 onLayout 으로 쟀는데, 그림자용 겹을 하나 끼우자 측정이 멈추면서
   * 방울이 통째로 사라졌다. 알약 폭은 화면 폭에서 여백을 뺀 값으로 정해지니
   * 재지 않고 계산할 수 있다. 계산으로 두면 구조를 바꿔도 깨지지 않는다.
   */
  const { width: screenWidth } = useWindowDimensions();
  const count = state.routes.length;
  const itemWidth = count > 0 ? (screenWidth - TAB_BAR.side * 2 - PAD * 2) / count : 0;

  /**
   * 가로 위치와 가로 늘어남.
   *
   * ⚠️ React Native 기본 Animated 로 짰더니 실기기에서 방울이 미끄러지지 않고
   *   툭 건너뛰었다. Reanimated 로 옮긴다. UI 스레드에서 직접 돌기 때문에
   *   목록을 스크롤하는 중에도 끊기지 않는다.
   *   Reanimated 는 이미 앱에 들어 있으므로 새로 깔 것도, 다시 빌드할 것도 없다.
   */
  const slide = useSharedValue(INSET);
  const stretch = useSharedValue(1);

  useEffect(() => {
    if (itemWidth <= 0) return;

    // 살짝 물러섰다 자리잡는 정도. 더 튀면 장난스러워진다.
    slide.value = withSpring(state.index * itemWidth + INSET, {
      damping: 16,
      stiffness: 180,
      mass: 0.9,
    });

    /**
     * 출발할 때 옆으로 늘었다가 도착하면서 되돌아온다.
     * 물방울이 움직일 때 길어지는 걸 흉내낸 것이고, 이게 "리퀴드" 로 읽힌다.
     * 늘기만 하면 찌그러져 보이므로 되돌아오는 쪽을 spring 으로 둬서
     * 끝에서 살짝 출렁이게 했다.
     */
    stretch.value = withSequence(
      withTiming(1.22, { duration: 110 }),
      withSpring(1, { damping: 11, stiffness: 200 })
    );
  }, [state.index, itemWidth, slide, stretch]);

  const movingStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value }, { scaleX: stretch.value }],
  }));
  const movingSize = { width: Math.max(0, itemWidth - INSET * 2) };

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      {/* 그림자와 잘라내기를 한 겹에 같이 두면 iOS 에서 그림자가 잘린다.
          바깥은 그림자만, 안쪽은 둥글게 자르는 역할만 맡는다. */}
      <View style={[styles.shadowHost, glass && styles.shadowHostGlass]}>
        <View style={[styles.row, glass && styles.rowGlass]}>
          {/* 유리를 켰을 때만 뒤가 비친다. 스위치는 저장되지 않으므로
              혹시 여기서 죽더라도 앱을 껐다 켜면 꺼진 상태로 돌아온다. */}
          {glass ? <GlassSurface /> : null}

          {/* 고른 칸 표시. 버튼보다 먼저 그려서 아이콘 **뒤**에 깔린다.
              한때 유리 렌즈를 아이콘 위에 올려 봤는데, 실기기에서 진짜
              Liquid Glass 가 돌면서 선택된 탭의 글씨가 뭉개져 읽을 수 없었다.
              뒤에 깔아도 탭바 뒤 화면은 그대로 굴절되므로 유리 느낌은 남는다. */}
          {itemWidth > 0 ? (
            glass ? (
              <Animated.View pointerEvents="none" style={[styles.lens, movingSize, movingStyle]}>
                <GlassSurface variant="clear" />
              </Animated.View>
            ) : (
              <Animated.View pointerEvents="none" style={[styles.blob, movingSize, movingStyle]} />
            )
          ) : null}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : (options.title ?? route.name);
            const color = focused ? colors.primary : colors.textMuted;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              // 이미 그 탭이면 다시 밀어 넣지 않는다 (스크롤 위치가 튄다)
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={styles.item}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={typeof label === 'string' ? label : undefined}
              >
                {options.tabBarIcon?.({ focused, color })}
                <Text numberOfLines={1} style={[styles.label, { color }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: TAB_BAR.side,
    right: TAB_BAR.side,
  },
  shadowHost: {
    borderRadius: TAB_BAR.height / 2,
    // 떠 있어 보이게 하는 그림자. 진하면 무거워 보여 옅게 깐다.
    shadowColor: '#2E2A26',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  shadowHostGlass: {
    // 유리 위에 짙은 그림자가 겹치면 탁해 보인다
    shadowOpacity: 0.08,
  },
  row: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR.height,
    paddingHorizontal: PAD,
    borderRadius: TAB_BAR.height / 2,
    backgroundColor: colors.surface,
  },
  rowGlass: {
    // 유리가 뒤를 그리므로 판 색을 비운다. 색을 남기면 불투명해져 안 비친다.
    backgroundColor: 'transparent',
  },
  blob: {
    position: 'absolute',
    left: PAD,
    top: 9,
    bottom: 9,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
  },
  lens: {
    position: 'absolute',
    left: PAD,
    top: 9,
    bottom: 9,
    borderRadius: 22,
    // 유리가 모서리를 넘지 않도록 잘라낸다
    overflow: 'hidden',
    // 얇은 흰 선을 둬야 렌즈의 가장자리가 보인다
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: '100%',
  },
  label: {
    ...typography.tiny,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
  },
});
