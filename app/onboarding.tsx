import React, { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mascot } from '@/components/Mascot';
import { useAppStore } from '@/store/useAppStore';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * 가이드북 → 앱으로 이어지는 사용 흐름 3단계.
 * 달곰이 포즈를 각 단계의 행동에 맞췄다 (인사 → 책 읽기 → 지도 펼치기).
 * 글은 언어마다 다르므로 포즈만 여기 두고 문구는 번역 사전에서 가져온다.
 */
const POSES = ['wave', 'read', 'map'] as const;

export default function OnboardingScreen() {
  // Dimensions.get() 을 모듈 스코프에서 읽으면 화면이 아직 없는 시점이라
  // 0 이 나올 수 있다. 훅으로 읽어야 회전/리사이즈에도 따라온다.
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const router = useRouter();
  const T = useT();

  const SLIDES = T.onboarding.slides.map((s, i) => ({ ...s, pose: POSES[i] }));

  const finish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (page >= SLIDES.length - 1) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable onPress={finish} style={styles.skip} hitSlop={10}>
        <Text style={styles.skipText}>{T.onboarding.skip}</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flexGrow: 0 }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            {/* 포즈 자체가 각 단계의 행동을 말해 주므로 별도 아이콘 배지는 두지 않는다 */}
            <View style={styles.mascotWrap}>
              <Mascot size={190} pose={slide.pose} />
            </View>

            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>
            {page === SLIDES.length - 1 ? T.onboarding.start : T.onboarding.next}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skip: {
    alignSelf: 'flex-end',
    padding: spacing.xl,
  },
  skipText: {
    ...typography.caption,
    color: colors.textSub,
  },
  slide: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
  },
  mascotWrap: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  footer: {
    padding: spacing.xl,
    marginTop: 'auto',
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});
