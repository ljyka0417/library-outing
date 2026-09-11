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
import { LanguageButton } from '@/components/LanguageButton';
import { useT } from '@/i18n';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { centered, useLayout } from '@/hooks/useLayout';
import { colors, radius, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const recentIds = useAppStore((s) => s.recentLibraryIds);
  const tabPad = useTabBarPadding();
  const { t } = useT();
  const layout = useLayout();

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
      {/* 태블릿에서는 본문을 가운데로 모은다. 폰에서는 화면 폭 그대로라
          centered() 가 아무 일도 하지 않는다. */}
      <ScrollView
        directionalLockEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabPad }]}
      >
        <View style={centered(layout)}>
        {/* 인사 + 검색 */}
        <View style={[styles.header, { paddingHorizontal: layout.gutter }]}>
          {/* 언어 단추는 맨 위 오른쪽. 가이드북을 든 외국인 방문객이
              제일 먼저 찾는 자리다. */}
          <View style={styles.langRow}>
            <LanguageButton />
          </View>

          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{t('home.greeting')}</Text>
              <Text style={styles.headline}>{t('home.headline')}</Text>
            </View>
            <Mascot size={84} pose="faceHappy" />
          </View>

          <SearchBar
            readOnly
            placeholder={t('search.placeholder')}
            onPress={() => router.push('/search')}
          />
        </View>

        {/* QR 안내 배너 - 책과 앱을 잇는 핵심 동선이라 홈 상단에 고정 노출.
            아이콘은 검게 둔다. 실제 QR 이 검은색이라, 흐린 갈색보다
            "이게 QR 이야기구나" 가 한눈에 읽힌다. */}
        <View style={[styles.qrBanner, { marginHorizontal: layout.gutter }]}>
          <View style={styles.qrIcon}>
            <Ionicons name="qr-code" size={20} color={colors.black} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.qrTitle}>{t('home.qrTitle')}</Text>
            <Text style={styles.qrBody}>{t('home.qrBody')}</Text>
          </View>
        </View>

        {/* 주제별 도서관 */}
        <View style={styles.section}>
          <SectionHeader
            title={t('home.categoryTitle')}
            subtitle={t('home.categorySub')}
          />
          <CategoryGrid onSelect={goCategory} />
        </View>

        {/* 추천 도서관 */}
        <View style={styles.section}>
          <SectionHeader
            title={t('home.featuredTitle')}
            subtitle={t('home.featuredSub')}
            actionLabel={t('home.seeAll')}
            onAction={() => router.push('/search')}
          />
          {featured.loading && !featured.data ? (
            <ActivityIndicator color={colors.primary} style={{ height: 160 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.carousel, { paddingHorizontal: layout.gutter }]}
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
            <SectionHeader title={t('home.recentTitle')} />
            <View style={[styles.list, { paddingHorizontal: layout.gutter }]}>
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
          <Text style={styles.offlineNote}>{t('home.offline')}</Text>
        ) : null}
        </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  langRow: {
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
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  offlineNote: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
