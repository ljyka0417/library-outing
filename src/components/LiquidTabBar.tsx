import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { TAB_BAR } from '@/hooks/useTabBarPadding';
import { colors, typography } from '@/theme';

/**
 * 떠 있는 알약 탭바 + 고른 탭을 따라다니는 방울.
 *
 * 기본 탭바로는 "고른 칸 뒤에 색 방울이 미끄러져 오는" 모양을 만들 수 없어
 * 직접 그린다. 대신 얻는 게 크다 — 방울 하나를 움직이는 것뿐이라
 * 네이티브 모듈이 필요 없다.
 *
 * 지난번에 expo-glass-effect 로 진짜 유리를 넣었다가 앱이 켜지자마자 죽었고
 * 되돌리는 데 며칠이 걸렸다. 여기서는 React Native 에 원래 있는 Animated 만
 * 쓴다. 새로 까는 것도, 다시 빌드할 것도 없다.
 *
 * 움직임은 spring 이다. 일정한 속도로 미끄러지면 기계 같고, 끝에서 살짝
 * 물러섰다 자리를 잡아야 말랑해 보인다. 그게 "리퀴드" 로 읽히는 부분이다.
 */
export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, TAB_BAR.minBottom);

  /** 알약 안쪽 너비. 칸 너비를 나누려면 실제로 그려진 뒤에 재야 한다. */
  const [innerWidth, setInnerWidth] = useState(0);
  const count = state.routes.length;
  const itemWidth = count > 0 ? innerWidth / count : 0;

  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (itemWidth === 0) return;
    Animated.spring(slide, {
      toValue: state.index * itemWidth,
      useNativeDriver: true,
      // 살짝 물러섰다 자리잡는 정도. 더 튀면 장난스러워진다.
      damping: 16,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [state.index, itemWidth, slide]);

  return (
    <View
      style={[styles.wrap, { bottom }]}
      onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width - PAD * 2)}
      pointerEvents="box-none"
    >
      <View style={styles.row}>
        {/* 방울. 칸 뒤에 깔리므로 버튼보다 먼저 그린다. */}
        {itemWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.blob,
              {
                width: itemWidth - BLOB_INSET * 2,
                transform: [{ translateX: Animated.add(slide, new Animated.Value(BLOB_INSET)) }],
              },
            ]}
          />
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
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={typeof label === 'string' ? label : undefined}
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              <Text numberOfLines={1} style={[styles.label, { color }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 알약 좌우 안쪽 여백 */
const PAD = 6;
/** 방울이 칸보다 얼마나 좁은가 (한쪽) */
const BLOB_INSET = 6;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: TAB_BAR.side,
    right: TAB_BAR.side,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR.height,
    paddingHorizontal: PAD,
    borderRadius: TAB_BAR.height / 2,
    backgroundColor: colors.surface,
    // 떠 있어 보이게 하는 그림자. 진하면 무거워 보여 옅게 깐다.
    shadowColor: '#2E2A26',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  blob: {
    position: 'absolute',
    left: PAD,
    top: 7,
    bottom: 7,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
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
