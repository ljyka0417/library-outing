import React, { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TabScreen, useBleed } from '@/components/TabScreen';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CategoryGrid } from '@/components/CategoryGrid';
import { LibraryCard } from '@/components/LibraryCard';
import { RegionBooksShelf } from '@/components/RegionBooksShelf';
import { TrendBooksShelf } from '@/components/TrendBooksShelf';
import { Mascot } from '@/components/Mascot';
import { SearchBar } from '@/components/SearchBar';
import { SectionHeader } from '@/components/common';
import { LanguageButton } from '@/components/LanguageButton';
import { regionName, useT } from '@/i18n';
import { WeatherCard } from '@/components/WeatherCard';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { bleedRow, centered, useLayout } from '@/hooks/useLayout';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import type { CategoryId } from '@/types';

/*
 * 탭을 오갈 때마다 탭 화면은 다시 그려진다(내비게이터가 그렇게 한다). 그때 홈의
 * 카드·주제 그리드까지 따라 그려지면 전환 효과가 시작되기 전에 멈칫한다.
 * 본문을 받는 값 없는 memo 로 떼어 두면 본문은 자기가 쓰는 값(최근 본 도서관,
 * 언어, 화면 폭)이 바뀔 때만 다시 그려진다.
 */
export default function HomeScreen() {
  return <HomeContent />;
}

const HomeContent = memo(function HomeContent() {
  const router = useRouter();
  const recentIds = useAppStore((s) => s.recentLibraryIds);
  const tabPad = useTabBarPadding();
  const bleed = useBleed();
  const { t, lang } = useT();
  const layout = useLayout();

  const featured = useAsync(() => libraryApi.featured(), [], { cacheKey: 'featured' });
  const all = useAsync(() => libraryApi.list(), [], { cacheKey: 'all-libraries' });

  const recentLibraries = (all.data ?? [])
    .filter((lib) => recentIds.includes(lib.id))
    // 최근 본 순서를 유지한다
    .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));

  const startRegion = recentLibraries[0]?.region.sido ?? '서울';
  /*
   * 책 줄들이 함께 쓰는 지역. 처음엔 최근 본 도서관의 지역이고, 지역별 줄의 단추나
   * "어디서 빌릴 수 있나요?" 판에서 고르면 그 지역으로 바뀐다(연령별·키워드 줄도 같이).
   * 다른 지역 도서관을 새로 보면 다시 그 지역으로 맞춘다.
   */
  const [pickedRegion, setPickedRegion] = useState<string | null>(null);
  useEffect(() => setPickedRegion(null), [startRegion]);
  const bookRegion = pickedRegion ?? startRegion;

  /*
   * 날씨를 볼 자리 — 홈에 올 때마다(탭을 다시 누르거나 앱으로 돌아올 때) 127곳 중 한 곳을 새로 뽑는다.
   * 예전엔 최근 본 도서관으로 고정이라 늘 같은 도서관 날씨만 보였다. 여러 도서관을 구경시키는 자리로 쓴다.
   */
  const [spotRoll, setSpotRoll] = useState(() => Math.random());
  useFocusEffect(useCallback(() => setSpotRoll(Math.random()), []));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setSpotRoll(Math.random()));
    return () => sub.remove();
  }, []);
  const withCoords = (all.data ?? []).filter((l) => l.coords);
  const spotLib = withCoords.length ? withCoords[Math.floor(spotRoll * withCoords.length) % withCoords.length] : undefined;
  const weatherSpot = spotLib?.coords ? { coords: spotLib.coords, place: spotLib.name } : undefined;

  const goCategory = useCallback(
    (id: CategoryId) => router.push(`/search?category=${id}`),
    [router]
  );

  return (
    <TabScreen style={styles.safe} bleed>
      {/* 태블릿에서는 본문을 가운데로 모은다. 폰에서는 화면 폭 그대로라
          centered() 가 아무 일도 하지 않는다. */}
      <ScrollView
        directionalLockEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          bleed.on ? { paddingTop: bleed.top, paddingBottom: bleed.bottom } : { paddingBottom: tabPad },
        ]}
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

        {/* 오늘 날씨 + 달곰이 한마디 — 홈에 올 때마다 무작위로 고른 도서관 자리. 날씨를 모르면 안 그린다 */}
        {weatherSpot ? (
          <View style={{ marginHorizontal: layout.gutter, marginBottom: spacing.xxl }}>
            <WeatherCard
              coords={weatherSpot.coords!}
              place={weatherSpot.place}
              onAction={(kind) => router.push(kind === 'nature' ? '/search?category=nature' : '/search?open=1')}
            />
          </View>
        ) : null}

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
              // 태블릿에서는 가운데 칸 밖으로 늘려 화면 끝까지 흐르게 한다 (useLayout 의 bleedRow)
              style={bleedRow(layout).style}
              contentContainerStyle={[styles.carousel, bleedRow(layout).content]}
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

        {/* 지역별 많이 빌린 책 — 제목 옆 단추로 지역을 바꾼다.
            처음 지역은 최근 본 도서관의 지역(없으면 서울). 그 값이 바뀌면 줄도 그 지역으로 맞춘다 */}
        <RegionBooksShelf region={bookRegion} onRegionChange={setPickedRegion} />

        {/* 나이대별 많이 빌린 책 · 이달의 키워드 (정보나루, 미리 모아 둔 것). 책을 누르면 고른 지역에서 어디서 빌릴지 */}
        <TrendBooksShelf region={bookRegion} onRegionChange={setPickedRegion} />

        {/* 최근 본 도서관 */}
        {recentLibraries.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('home.recentTitle')} />
            {/* 폰은 세 곳을 한 줄씩, 태블릿은 검색 목록과 같은 열 수로 두 줄 */}
            {/* 칸마다 좌우로 반씩 띄우므로, 바깥 줄이 제목과 맞도록 그만큼 덜 민다 */}
            <View style={[styles.grid, { paddingHorizontal: layout.gutter - (layout.listColumns > 1 ? spacing.md / 2 : 0) }]}>
              {recentLibraries
                .slice(0, layout.listColumns > 1 ? layout.listColumns * 2 : 3)
                .map((lib) => (
                  <View
                    key={lib.id}
                    style={{
                      width: `${100 / layout.listColumns}%`,
                      paddingHorizontal: layout.listColumns > 1 ? spacing.md / 2 : 0,
                    }}
                  >
                    <LibraryCard library={lib} onPress={() => router.push(`/library/${lib.id}`)} />
                  </View>
                ))}
            </View>
          </View>
        ) : null}

        {featured.isStale || all.isStale ? (
          <Text style={styles.offlineNote}>{t('home.offline')}</Text>
        ) : null}
        </View>
      </ScrollView>
    </TabScreen>
  );
});

const styles = themedStyles(() => ({
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  offlineNote: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
}));
