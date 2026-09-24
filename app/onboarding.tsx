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
import { centered, useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * 가이드북 → 앱으로 이어지는 사용 흐름 3단계.
 * 달곰이 포즈를 각 단계의 행동에 맞췄다 (인사 → 책 읽기 → 지도 펼치기).
 */
const SLIDES = [
  { title: 'ob.title1', body: 'ob.body1', pose: 'wave' },
  { title: 'ob.title2', body: 'ob.body2', pose: 'read' },
  { title: 'ob.title3', body: 'ob.body3', pose: 'map' },
] as const;

export default function OnboardingScreen() {
  // Dimensions.get() 을 모듈 스코프에서 읽으면 화면이 아직 없는 시점이라
  // 0 이 나올 수 있다. 훅으로 읽어야 회전/리사이즈에도 따라온다.
  const { width } = useWindowDimensions();
  const layout = useLayout();
  const { t } = useT();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const router = useRouter();

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
        <Text style={styles.skipText}>{t('ob.skip')}</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        /* 남은 높이를 다 쓴다. 내용 높이만큼만 차지하게 두었더니 세로로 든
           아이패드에서 한 장의 내용이 위쪽에 몰리고 아래가 휑했다. */
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            {/* 한 장은 화면 폭을 그대로 차지해야 넘기기가 맞는다. 대신 안쪽
                내용만 태블릿에서 가운데로 모아 글줄이 길어지지 않게 한다. */}
            <View style={[styles.slideInner, centered(layout, true)]}>
              {/* 포즈 자체가 각 단계의 행동을 말해 주므로 별도 아이콘 배지는 두지 않는다 */}
              <View style={styles.mascotWrap}>
                <Mascot size={190} pose={slide.pose} />
              </View>

              <Text style={styles.title}>{t(slide.title)}</Text>
              <Text style={styles.body}>{t(slide.body)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* 아이패드에서 버튼을 화면 폭으로 늘리면 누를 곳이 아니라 띠처럼 보인다 */}
      <View style={[styles.footer, centered(layout, true), layout.isTablet && { maxWidth: 480 }]}>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>
            {page === SLIDES.length - 1 ? t('ob.start') : t('ob.next')}
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
    /*
     * 한 장의 내용을 세로 가운데에 둔다.
     *
     * 위에서부터 쌓아 두었더니 세로로 든 아이패드(1180 높이)에서 달곰이와 글이
     * 위쪽 3분의 1에 몰리고 가운데가 휑했다. 폰에서는 화면이 짧아 차이가 거의 없다.
     * 위 여백은 「건너뛰기」와 겹치지 않을 만큼만 남긴다.
     */
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  /** 태블릿에서 가운데로 모이는 한 장의 내용 (폰에서는 화면 폭 그대로) */
  slideInner: {
    alignItems: 'center',
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
