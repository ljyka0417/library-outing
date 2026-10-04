import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { create } from 'zustand';
import { Mascot } from './Mascot';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { useAppStore } from '@/store/useAppStore';
import { useT } from '@/i18n';
import { colors, radius, shadow, spacing, typography, themedStyles } from '@/theme';

/**
 * 하트를 눌러 즐겨찾기에 **담았을 때** 뜨는 창 — "여기 다녀왔어요"(VisitPopup)와 같은 모양.
 * 뺄 때는 조용히 빠진다 (즐겨찾기 목록에서 하트를 끌 때마다 창이 뜨면 성가시다).
 *
 * 하트는 도서관 화면·검색·즐겨찾기·달곰이·내 기록 여러 곳에 있어서, 창은 앱 맨 위(_layout)에
 * 하나만 두고 어디서든 useFavoriteToggle() 로 켠다. 무엇을 띄울지는 저장하지 않는다.
 */
const usePopup = create<{ libraryId: string | null; show: (id: string) => void; hide: () => void }>((set) => ({
  libraryId: null,
  show: (libraryId) => set({ libraryId }),
  hide: () => set({ libraryId: null }),
}));

/** 하트 단추가 부르는 것. 담으면 창을 띄우고, 빼면 그냥 뺀다 */
export function useFavoriteToggle() {
  const toggle = useAppStore((s) => s.toggleFavorite);
  const show = usePopup((s) => s.show);
  return useCallback(
    (id: string) => {
      const adding = !useAppStore.getState().favorites.includes(id);
      toggle(id);
      if (adding) show(id);
    },
    [toggle, show]
  );
}

/** 저절로 닫히기까지 (ms) — 다녀왔어요 창과 같다 */
const AUTO_CLOSE = 2600;

/** 앱 맨 위에 하나만 둔다 (app/_layout.tsx) */
export function FavoritePopupHost() {
  const { t } = useT();
  const router = useRouter();
  const libraryId = usePopup((s) => s.libraryId);
  const hide = usePopup((s) => s.hide);
  const count = useAppStore((s) => s.favorites.length);
  const name = MOCK_LIBRARIES.find((l) => l.id === libraryId)?.name ?? '';
  const visible = !!libraryId;

  const pop = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    pop.setValue(0);
    heart.setValue(0);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      // 하트는 조금 늦게 톡 — 달곰이가 먼저 올라오고 그 위로 하트가 튄다
      Animated.sequence([
        Animated.delay(180),
        Animated.spring(heart, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      ]),
    ]).start();
    const timer = setTimeout(hide, AUTO_CLOSE);
    return () => clearTimeout(timer);
  }, [visible, libraryId, pop, heart, hide]);

  const mascotStyle = {
    transform: [
      { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
      { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
    ],
  };
  const heartStyle = {
    opacity: heart,
    transform: [
      { scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
      { translateY: heart.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
    ],
  };
  const cardStyle = { opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }) };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={hide} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={hide} accessibilityLabel={t('visit.close')}>
        <Animated.View style={[styles.card, cardStyle]} accessibilityRole="alert">
          <View>
            <Animated.View style={mascotStyle}>
              <Mascot pose="books" size={112} />
            </Animated.View>
            <Animated.View style={[styles.heart, heartStyle]}>
              <Ionicons name="heart" size={30} color={colors.heart} />
            </Animated.View>
          </View>
          <Text style={styles.title}>{t('fav.popTitle')}</Text>
          <Text style={styles.body}>{t('fav.popBody', { name })}</Text>
          <View style={styles.countPill}>
            <Ionicons name="heart" size={12} color={colors.heart} />
            <Text style={styles.countText}>{t('fav.popCount', { n: String(count) })}</Text>
          </View>
          <Pressable onPress={hide} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
            <Text style={styles.buttonText}>{t('visit.ok')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hide();
              router.push('/records?tab=favorites');
            }}
            style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.linkText}>{t('fav.popOpen')}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,26,22,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadow.card,
  },
  heart: { position: 'absolute', top: 0, right: -14 },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.sm, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSub, marginTop: spacing.xs, textAlign: 'center' },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  countText: { ...typography.captionBold, color: colors.primary },
  button: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: { ...typography.bodyBold, color: colors.white },
  linkButton: { marginTop: spacing.sm, paddingVertical: spacing.xs },
  linkText: { ...typography.captionBold, color: colors.textSub },
}));
