import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type LayoutRectangle,
} from 'react-native';
import Reanimated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Mascot } from './Mascot';
import { CATEGORIES } from '@/data/categories';
import { useT, type MessageKey } from '@/i18n';
import { categoryColors, colors, radius, spacing } from '@/theme';

/**
 * 태블릿의 이동 메뉴. 아이패드 기본 앱(App Store, 설정)과 같은 두 모양이다.
 *
 *   사이드바   왼쪽에 펼친 목록. 고른 줄은 색이 꽉 찬 알약.
 *   위쪽 탭바  사이드바를 접으면 화면 위 가운데에 떠 있는 알약 한 줄.
 *
 * 둘은 맨 왼쪽의 사이드바 단추로 오간다.
 *
 * 탭 내비게이터의 탭바 자리에 넣지 않고 바깥에서 그린다. 내비게이터는 탭바를
 * 화면의 한쪽 끝에만 붙일 수 있어서, "펼치면 왼쪽, 접으면 위" 를 오가게 하려면
 * 우리가 틀을 쥐어야 한다. 대신 어느 탭이 선택됐는지는 주소(pathname)로 알고,
 * 이동도 주소로 한다.
 */

export interface TabDef {
  /** (tabs) 안의 파일 이름 */
  name: 'index' | 'search' | 'chat' | 'favorites' | 'mypage';
  /** 이동할 주소 */
  href: '/' | '/search' | '/chat' | '/favorites' | '/mypage';
  titleKey: MessageKey;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
}

/** 탭 목록. 폰의 아래 탭바와 태블릿 메뉴가 같은 목록을 쓴다 */
export const TABS: TabDef[] = [
  { name: 'index', href: '/', titleKey: 'tab.home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'search', href: '/search', titleKey: 'tab.search', icon: 'search', iconOutline: 'search-outline' },
  { name: 'chat', href: '/chat', titleKey: 'tab.chat', icon: 'chatbubble-ellipses', iconOutline: 'chatbubble-ellipses-outline' },
  { name: 'favorites', href: '/favorites', titleKey: 'tab.favorites', icon: 'heart', iconOutline: 'heart-outline' },
  { name: 'mypage', href: '/mypage', titleKey: 'tab.mypage', icon: 'person', iconOutline: 'person-outline' },
];

/** 펼친 사이드바의 폭 */
export const SIDEBAR_WIDTH = 300;

/** 지금 주소가 어느 탭인가. 홈은 '/' 하나뿐이라 따로 본다 */
function isActive(pathname: string, href: TabDef['href']) {
  if (href === '/') return pathname === '/' || pathname === '/index';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ───────────────────────────────────────────────────────── 사이드바 단추 */

/**
 * 사이드바 모양 아이콘 (둥근 네모 안 왼쪽에 칸막이).
 *
 * 아이패드 앱들이 쓰는 기호인데 아이콘 글꼴에 같은 모양이 없다. 비슷한 걸
 * 빌려 쓰면 "책", "목록" 처럼 다른 뜻으로 읽혀서 선 두 개로 직접 그린다.
 */
function SidebarGlyph({ color }: { color: string }) {
  return (
    <View style={[glyph.frame, { borderColor: color }]}>
      <View style={[glyph.divider, { backgroundColor: color }]} />
      <View style={[glyph.line, { top: 4, backgroundColor: color }]} />
      <View style={[glyph.line, { top: 8, backgroundColor: color }]} />
    </View>
  );
}

function SidebarToggle({ onPress, open }: { onPress: () => void; open: boolean }) {
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={open ? t('nav.closeSidebar') : t('nav.openSidebar')}
      style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.6 }]}
    >
      <SidebarGlyph color={colors.text} />
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────── 사이드바 */

interface SidebarProps {
  onToggle: () => void;
  /** 좁은 화면에서 내용 위에 덮어 띄울 때. 고르면 저절로 닫힌다 */
  onPicked?: () => void;
}

export function TabletSidebar({ onToggle, onPicked }: SidebarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  /** 「주제별 도서관」 묶음을 펼쳤는가. App Store 의 「제품별 쇼핑하기」처럼 접을 수 있다 */
  const [topicsOpen, setTopicsOpen] = useState(true);

  const go = (href: string) => {
    router.navigate(href as never);
    onPicked?.();
  };

  return (
    <View style={[styles.sidebar, { paddingTop: insets.top + spacing.md, paddingLeft: insets.left }]}>
      <View style={styles.sidebarHead}>
        <View style={styles.brand}>
          <Mascot size={34} pose="faceHappy" />
          <Text style={styles.brandName} numberOfLines={1}>
            {t('app.name')}
          </Text>
        </View>
        <SidebarToggle onPress={onToggle} open />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {TABS.map((tab) => (
          <SidebarTabRow
            key={tab.name}
            tab={tab}
            label={t(tab.titleKey)}
            active={isActive(pathname, tab.href)}
            onPress={() => go(tab.href)}
          />
        ))}

        {/* 주제별 도서관 — 누르면 검색 탭이 그 주제로 걸러진 채 열린다 */}
        <Pressable
          onPress={() => setTopicsOpen(!topicsOpen)}
          style={styles.groupHead}
          accessibilityRole="button"
          accessibilityState={{ expanded: topicsOpen }}
        >
          <Text style={styles.groupTitle}>{t('home.categoryTitle')}</Text>
          <Ionicons
            name={topicsOpen ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>

        {topicsOpen
          ? CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => go(`/search?category=${c.id}`)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={[styles.topicIcon, { backgroundColor: categoryColors[c.id].bg }]}>
                  <Ionicons name={c.icon as never} size={16} color={categoryColors[c.id].fg} />
                </View>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {t(`cat.${c.id}` as MessageKey)}
                </Text>
              </Pressable>
            ))
          : null}
      </ScrollView>
    </View>
  );
}

/**
 * 사이드바의 탭 한 줄.
 *
 * 고른 줄의 알약이 뚝 켜지지 않고 짧게 번지며 켜진다. 알약을 옆 줄로 미끄러뜨리지
 * 않은 까닭은 글자색 때문이다. 고른 줄의 글자는 흰색이라, 알약이 도착하기 전의
 * 순간에 흰 글자가 밝은 바탕 위에 놓여 안 보인다. 그래서 알약·아이콘·글자색이
 * 같은 박자로 함께 바뀐다.
 */
function SidebarTabRow({
  tab,
  label,
  active,
  onPress,
}: {
  tab: TabDef;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    const to = active ? 1 : 0;
    on.value = reduceMotion ? to : withTiming(to, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, [active, reduceMotion, on]);

  const fill = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: 0.94 + 0.06 * on.value }],
  }));
  const shownWhenOn = useAnimatedStyle(() => ({ opacity: on.value }));
  const shownWhenOff = useAnimatedStyle(() => ({ opacity: 1 - on.value }));
  const labelColor = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [colors.text, colors.white]),
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.row, pressed && !active && styles.rowPressed]}
    >
      <Reanimated.View pointerEvents="none" style={[styles.rowFill, fill]} />
      <View style={styles.rowIcon}>
        <Reanimated.View style={[styles.iconLayer, shownWhenOff]}>
          <Ionicons name={tab.iconOutline} size={23} color={colors.primary} />
        </Reanimated.View>
        <Reanimated.View style={[styles.iconLayer, shownWhenOn]}>
          <Ionicons name={tab.icon} size={23} color={colors.white} />
        </Reanimated.View>
      </View>
      <Reanimated.Text
        style={[styles.rowLabel, active && styles.rowLabelActive, labelColor]}
        numberOfLines={1}
      >
        {label}
      </Reanimated.Text>
    </Pressable>
  );
}

/* ─────────────────────────────────────────────────── 좁은 화면: 덮어 띄우기 */

/**
 * 세로로 든 아이패드에서 사이드바를 열면 내용 위에 덮어 띄운다.
 *
 * 폭 820 에서 사이드바 300 이 내용을 밀어내면 목록이 폰보다 좁아진다. 아이패드
 * 기본 앱도 세로에서는 이렇게 위에 얹었다가 고르면 닫는다.
 */
export function TabletSidebarOverlay({ onClose }: { onClose: () => void }) {
  const slide = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [slide, fade]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="close" />
      </Animated.View>
      <Animated.View
        style={[styles.overlaySidebar, { transform: [{ translateX: slide }] }]}
      >
        <TabletSidebar onToggle={onClose} onPicked={onClose} />
      </Animated.View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────── 위쪽 탭바 */

/** 위쪽 탭바의 고른 칸 표시가 옮겨 갈 때의 탄성. 살짝만 넘쳤다 자리 잡는다 */
const PILL_SPRING = { damping: 26, stiffness: 320, mass: 0.9 };

export function TabletTopBar({ onToggle }: { onToggle: () => void }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const reduceMotion = useReducedMotion();

  const activeIndex = TABS.findIndex((tab) => isActive(pathname, tab.href));

  /*
   * 고른 칸 표시는 탭마다 따로 켜지 않고 하나를 옮긴다. App Store 의 위쪽 탭바가
   * 이렇게 옆 칸으로 미끄러진다.
   *
   * 칸마다 글자 길이가 달라(「홈」과 「즐겨찾기」) 폭도 같이 옮긴다. 칸의 위치는
   * 그려진 뒤에야 알 수 있어서 onLayout 으로 모아 둔다. 언어를 바꾸면 칸 폭이
   * 바뀌고 onLayout 이 다시 불려 표시도 따라간다.
   */
  const frames = useRef<(LayoutRectangle | undefined)[]>([]);
  const placed = useRef(false);
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const shown = useSharedValue(0);

  const moveTo = (index: number) => {
    const f = frames.current[index];
    if (!f) {
      shown.value = 0;
      return;
    }
    // 처음 자리 잡을 때는 날아오지 않고 그 자리에 바로 놓는다
    if (!placed.current || reduceMotion) {
      x.value = f.x;
      w.value = f.width;
    } else {
      x.value = withSpring(f.x, PILL_SPRING);
      w.value = withSpring(f.width, PILL_SPRING);
    }
    placed.current = true;
    shown.value = 1;
  };

  useEffect(() => {
    moveTo(activeIndex);
    // moveTo 는 그릴 때마다 새로 만들어지지만 하는 일은 같아서 고른 칸이 바뀔 때만 부른다
  }, [activeIndex]);

  const onItemLayout = (index: number) => (e: LayoutChangeEvent) => {
    frames.current[index] = e.nativeEvent.layout;
    if (index === activeIndex) moveTo(index);
  };

  const indicator = useAnimatedStyle(() => ({
    opacity: shown.value,
    width: w.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={[styles.topStrip, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topPill}>
        <SidebarToggle onPress={onToggle} open={false} />
        <View style={styles.topDivider} />
        {/* 표시의 위치를 칸 위치와 같은 기준으로 재려고 테두리·여백 없는 줄에 따로 담는다 */}
        <View style={styles.topTabs}>
          <Reanimated.View pointerEvents="none" style={[styles.topIndicator, indicator]} />
          {TABS.map((tab, index) => {
            const active = index === activeIndex;
            return (
              <Pressable
                key={tab.name}
                onLayout={onItemLayout(index)}
                onPress={() => router.navigate(tab.href as never)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.topItem, pressed && !active && { opacity: 0.6 }]}
              >
                <Text
                  style={[styles.topLabel, active && styles.topLabelActive]}
                  numberOfLines={1}
                >
                  {t(tab.titleKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────── 모양 */

/** 사이드바 바탕. 내용 바탕보다 한 톤 짙은 따뜻한 회색이라 칸막이 선 없이도 나뉜다 */
const SIDEBAR_BG = '#F1ECE4';

const styles = StyleSheet.create({
  sidebar: {
    // flex: 1 을 주면 내용과 나란히 놓일 때 폭까지 반씩 나눠 가져 화면 절반을 먹었다.
    // 폭은 못 박고, 높이만 틀을 채운다.
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: SIDEBAR_BG,
  },
  sidebarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },

  toggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 50,
    borderRadius: 25,
  },
  rowFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 25,
    backgroundColor: colors.primary,
  },
  rowPressed: {
    backgroundColor: 'rgba(79, 166, 149, 0.10)',
  },
  rowIcon: {
    width: 23,
    height: 23,
  },
  iconLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  rowLabel: {
    fontSize: 17,
    color: colors.text,
    flexShrink: 1,
  },
  rowLabelActive: {
    fontWeight: '600',
  },

  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSub,
  },
  topicIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backdrop: {
    // absoluteFillObject 는 이 RN 버전의 타입에 없어서 네 방향을 직접 쓴다
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(46, 42, 38, 0.18)',
  },
  overlaySidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 6, height: 0 },
    elevation: 12,
  },

  topStrip: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 5,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#8B6F5C',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  topDivider: {
    width: 1,
    height: 22,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.border,
  },
  topTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  topIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
  },
  topItem: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
  },
  topLabel: {
    fontSize: 16,
    // 고른 칸만 굵게 하면 그 칸이 넓어지면서 옆 칸들이 밀려 표시가 흔들린다.
    // 굵기는 모두 같게 두고 색으로만 가른다.
    fontWeight: '600',
    color: colors.text,
  },
  topLabelActive: {
    color: colors.primary,
  },
});

const glyph = StyleSheet.create({
  frame: {
    width: 22,
    height: 17,
    borderWidth: 1.8,
    borderRadius: 4.5,
  },
  divider: {
    position: 'absolute',
    left: 6,
    top: 0,
    bottom: 0,
    width: 1.8,
  },
  line: {
    position: 'absolute',
    left: 1.5,
    width: 2.8,
    height: 1.4,
    borderRadius: 1,
  },
});
