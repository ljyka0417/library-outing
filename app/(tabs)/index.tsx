import React, { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CategoryGrid } from '@/components/CategoryGrid';
import { LibraryCard } from '@/components/LibraryCard';
import { Mascot } from '@/components/Mascot';
import { SearchBar } from '@/components/SearchBar';
import { SectionHeader } from '@/components/common';
import { LanguagePicker } from '@/components/LanguagePicker';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { useT } from '@/i18n';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const recentIds = useAppStore((s) => s.recentLibraryIds);
  const T = useT();
  const tabPad = useTabBarPadding();

  const featured = useAsync(() => libraryApi.featured(), [], { cacheKey: 'featured' });
  const all = useAsync(() => libraryApi.list(), [], { cacheKey: 'all-libraries' });

  const recentLibraries = (all.data ?? [])
    .filter((lib) => recentIds.includes(lib.id))
    // 최근 본 순서를 유지한다
    .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));

  const goCategory = useCallback(
    (id: CategoryId) => router.push(`/search?category=${id}`),
    [router]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 40 + tabPad }]}>
        {/* 인사 + 검색 */}
        <View style={styles.header}>
          {/* 언어 선택은 오른쪽 위 고정.
              글을 못 읽는 상태에서도 국기는 알아볼 수 있어야 하므로 아이콘을 앞세운다. */}
          <View style={styles.topBar}>
            <LanguagePicker />
          </View>

          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{T.home.greeting}</Text>
              <Text style={styles.headline}>{T.home.headline}</Text>
            </View>
            <Mascot size={84} pose="faceHappy" />
          </View>

          <SearchBar readOnly onPress={() => router.push('/search')} />
        </View>

        {/* QR 안내 배너 - 책과 앱을 잇는 핵심 동선이라 홈 상단에 고정 노출 */}
        <View style={styles.qrBanner}>
          <View style={styles.qrIcon}>
            <Ionicons name="qr-code-outline" size={20} color={colors.brown} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.qrTitle}>{T.home.qrTitle}</Text>
            <Text style={styles.qrBody}>{T.home.qrBody}</Text>
          </View>
        </View>

        {/* 주제별 도서관 */}
        <View style={styles.section}>
          <SectionHeader title={T.home.categories} subtitle={T.home.categoriesSub} />
          <CategoryGrid onSelect={goCategory} />
        </View>

        {/* 추천 도서관 */}
        <View style={styles.section}>
          <SectionHeader
            title={T.home.featured}
            subtitle={T.home.featuredSub}
            actionLabel={T.home.seeAll}
            onAction={() => router.push('/search')}
          />
          {featured.loading && !featured.data ? (
            <ActivityIndicator color={colors.primary} style={{ height: 160 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {(featured.data ?? []).map((lib) => (
                <LibraryCard
                  key={lib.id}
                  library={lib}
                  variant="carousel"
                  onPress={() => router.push(`/library/${lib.id}`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* 최근 본 도서관 */}
        {recentLibraries.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={T.home.recent} />
            <View style={styles.list}>
              {recentLibraries.slice(0, 3).map((lib) => (
                <LibraryCard
                  key={lib.id}
                  library={lib}
                  onPress={() => router.push(`/library/${lib.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {featured.isStale || all.isStale ? (
          <Text style={styles.offlineNote}>{T.home.staleNote}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    // 마지막 항목이 탭바에 가리지 않도록 넉넉히 둔다
    paddingBottom: spacing.xxxl + spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    ...typography.caption,
    color: colors.textSub,
    marginBottom: 4,
  },
  headline: {
    ...typography.h1,
    color: colors.text,
  },
  qrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brownSoft,
  },
  qrIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: {
    ...typography.captionBold,
    color: colors.text,
  },
  qrBody: {
    ...typography.tiny,
    color: colors.brown,
    marginTop: 1,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  carousel: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  offlineNote: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
