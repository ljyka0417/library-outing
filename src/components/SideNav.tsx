import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from './Mascot';
import type { TabBarProps } from './LiquidTabBar';
import { NAV_WIDTH } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * 태블릿의 왼쪽 이동 메뉴.
 *
 * 폰의 떠 있는 알약 탭바를 아이패드에 그대로 두었더니 "폰 앱을 크게 띄운 것"
 * 으로 보였다. 메모·설정·지도 같은 아이패드 기본 앱은 왼쪽에 메뉴를 둔다.
 *
 *   rail     아이콘 아래 이름. 세로로 든 아이패드처럼 폭이 아쉬울 때
 *   sidebar  아이콘 옆 이름과 앱 이름. 가로로 눕혀 폭이 넉넉할 때
 *
 * 어느 쪽을 쓸지는 창 폭이 정한다 (useLayout 의 navKind). 아이패드를 반으로
 * 나눠 폭이 폰만큼 좁아지면 다시 아래 탭바로 돌아간다.
 *
 * 누르는 동작은 LiquidTabBar 와 똑같이 tabPress 를 먼저 알린다. 그래야
 * 화면 쪽에서 "이미 보고 있는 탭을 또 누르면 맨 위로" 같은 걸 가로챌 수 있다.
 */
export function SideNav({
  state,
  descriptors,
  navigation,
  variant,
}: TabBarProps & { variant: 'rail' | 'sidebar' }) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const isSidebar = variant === 'sidebar';

  return (
    <View
      style={[
        styles.wrap,
        {
          width: NAV_WIDTH[variant],
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingLeft: insets.left,
        },
      ]}
      accessibilityRole="tablist"
    >
      {/* 앱 얼굴. 레일에서는 달곰이만, 사이드바에서는 이름까지 */}
      <View style={[styles.brand, isSidebar && styles.brandSidebar]}>
        <Mascot size={isSidebar ? 40 : 44} pose="faceHappy" />
        {isSidebar ? (
          <Text style={styles.brandName} numberOfLines={1}>
            {t('app.name')}
          </Text>
        ) : null}
      </View>

      <View style={[styles.items, isSidebar && styles.itemsSidebar]}>
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const color = focused ? colors.primary : colors.textSub;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={({ pressed }) => [
                isSidebar ? styles.rowItem : styles.railItem,
                focused && styles.itemFocused,
                pressed && !focused && styles.itemPressed,
              ]}
            >
              {options.tabBarIcon?.({ focused, color, size: isSidebar ? 20 : 22 })}
              <Text
                numberOfLines={1}
                style={[
                  isSidebar ? styles.rowLabel : styles.railLabel,
                  { color },
                  focused && styles.labelFocused,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },

  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandSidebar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  brandName: {
    ...typography.bodyBold,
    color: colors.text,
    flexShrink: 1,
  },

  items: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemsSidebar: {
    alignItems: 'stretch',
    gap: 2,
    paddingHorizontal: spacing.md,
  },

  /* 레일: 아이콘 아래 이름 */
  railItem: {
    width: 68,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 4,
  },
  railLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* 사이드바: 아이콘 옆 이름 */
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  rowLabel: {
    ...typography.body,
    flexShrink: 1,
  },

  itemFocused: {
    backgroundColor: colors.primarySoft,
  },
  itemPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  labelFocused: {
    fontWeight: '700',
  },
});
