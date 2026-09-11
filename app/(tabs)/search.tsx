import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LibraryCard } from '@/components/LibraryCard';
import { SearchBar } from '@/components/SearchBar';
import { Chip, EmptyState } from '@/components/common';
import { CATEGORIES, CATEGORY_MAP, SIDO_LIST } from '@/data/categories';
import { useT } from '@/i18n';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { isOpenNow } from '@/utils/openingHours';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { centered, useLayout } from '@/hooks/useLayout';
import { colors, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<CategoryId | undefined>(
    CATEGORY_MAP[params.category ?? ''] ? (params.category as CategoryId) : undefined
  );
  const [sido, setSido] = useState<string | undefined>();
  const [openNow, setOpenNow] = useState(false);
  const tabPad = useTabBarPadding();
  const { t } = useT();
  const layout = useLayout();

  /**
   * 홈에서 주제를 눌러 들어왔을 때 그 주제로 맞춘다.
   *
   * 검색은 탭 화면이라 한 번 뜨면 계속 살아 있다. 위 useState 의 초기값은
   * 맨 처음 한 번만 읽히므로, 홈에서 주제를 눌러도 필터가 안 걸리고 132곳이
   * 통째로 나왔다. 목록이 랜드마크로 시작하니 "전부 랜드마크로 나온다" 로
   * 보였던 게 이것이다.
   *
   * 읽고 나면 주소에서 지운다(consume). 그래야 사용자가 화면에서 주제를
   * 직접 껐을 때 다시 켜지지 않고, 홈에서 같은 주제를 또 눌러도 반응한다.
   */
  useEffect(() => {
    const incoming = params.category;
    if (!incoming || !CATEGORY_MAP[incoming]) return;
    setCategory(incoming as CategoryId);
    // 주제를 새로 고른 것은 새로 둘러보겠다는 뜻이다. 이전 검색어는 비운다.
    setKeyword('');
    router.setParams({ category: '' });
  }, [params.category, router]);

  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  // 전체 목록을 한 번만 받아 오고, 필터는 클라이언트에서 처리한다.
  // (전국 도서관이 수천 곳 규모가 되면 서버 사이드 필터로 옮겨야 한다)
  const { data, loading, error, isStale } = useAsync(() => libraryApi.list(), [], {
    cacheKey: 'all-libraries',
  });

  const results = useMemo(() => {
    const list = data ?? [];
    const q = keyword.trim().toLowerCase();
    return list.filter((lib) => {
      if (category && !lib.categories.includes(category)) return false;
      if (sido && lib.region.sido !== sido) return false;
      if (q) {
        const hay = [lib.name, lib.address, lib.specialty, lib.region.sido]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // 운영시간을 모르는 곳은 "운영중" 필터에서 빠진다 (isOpenNow 가 null).
      if (openNow && isOpenNow(lib.hours) !== true) return false;
      return true;
    });
  }, [data, keyword, category, sido, openNow]);

  // 지역 이름(서울, 경기…)은 옮기지 않는다. 주소에 적힌 원문이고,
  // 현지에서 길을 물을 때도 그 글자가 있어야 통한다.
  const countLabel = category
    ? t('search.countInCategory', { c: t(`cat.${category}`), n: results.length })
    : t('search.count', { n: results.length });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 태블릿에서는 이 안쪽을 가운데로 모은다. 검색창부터 목록까지 한
          덩어리로 묶어야 세로줄이 어긋나지 않는다. */}
      <View style={[styles.body, centered(layout)]}>
      <View style={[styles.searchWrap, { paddingHorizontal: layout.gutter }]}>
        <SearchBar
          value={keyword}
          onChangeText={setKeyword}
          placeholder={t('search.placeholder')}
        />
      </View>

      {/* 필터: 주제 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { paddingHorizontal: layout.gutter }]}
        style={[{ flexGrow: 0, flexShrink: 0 }, styles.filterRowSpacing]}
      >
        <Chip
          label={t('search.allCategories')}
          selected={!category}
          onPress={() => setCategory(undefined)}
        />
        {/* 칩에도 부제는 붙이지 않는다. "음악·LP" 는 그 분류가 LP 도서관만
            모아 둔 것처럼 읽힌다. 실제로는 음악 도서관 6곳 중 한 곳뿐이다. */}
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={t(`cat.${c.id}`)}
            selected={category === c.id}
            onPress={() => setCategory(category === c.id ? undefined : c.id)}
          />
        ))}
      </ScrollView>

      {/* 필터: 지역 + 운영중 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { paddingHorizontal: layout.gutter }]}
        style={[{ flexGrow: 0, flexShrink: 0 }, styles.filterRowSpacing]}
      >
        <Chip
          label={t('search.openNow')}
          selected={openNow}
          onPress={() => setOpenNow(!openNow)}
        />
        <View style={styles.divider} />
        <Chip
          label={t('search.nationwide')}
          selected={!sido}
          onPress={() => setSido(undefined)}
        />
        {SIDO_LIST.map((s) => (
          <Chip
            key={s}
            label={s}
            selected={sido === s}
            onPress={() => setSido(sido === s ? undefined : s)}
          />
        ))}
      </ScrollView>

      <Text style={[styles.count, { paddingHorizontal: layout.gutter }]}>
        {countLabel}
        {isStale ? t('search.stale') : ''}
      </Text>

      {loading && !data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />
      ) : error ? (
        <EmptyState
          pose="faceWink"
          title={t('search.errorTitle')}
          description={t('search.errorBody')}
        />
      ) : (
        <FlatList
          directionalLockEnabled
          data={results}
          keyExtractor={(item) => item.id}
          /* 열 수가 바뀌면 FlatList 는 다시 만들어야 한다. 안 그러면
             "numColumns 를 도중에 못 바꾼다" 며 화면이 깨진다.
             아이패드를 돌리거나 화면을 나눠 쓸 때 실제로 바뀐다. */
          key={layout.listColumns}
          numColumns={layout.listColumns}
          columnWrapperStyle={
            layout.listColumns > 1 ? { gap: spacing.md } : undefined
          }
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: layout.gutter, paddingBottom: tabPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title={t('search.emptyTitle')}
              description={t('search.emptyBody')}
            />
          }
          renderItem={({ item }) => (
            /* 두 줄로 놓을 때 카드가 각자 반씩 나눠 갖게 한다.
               한 줄일 때도 flex:1 은 해가 없다. */
            <View style={{ flex: 1 }}>
              <LibraryCard
                library={item}
                onPress={() => router.push(`/library/${item.id}`)}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            </View>
          )}
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /** 태블릿에서 가운데로 모이는 본문 (폰에서는 화면 폭 그대로) */
  body: {
    flex: 1,
  },
  searchWrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  filterRow: {
    gap: spacing.sm,
    // 칩이 잘리지 않도록 위아래 여유를 준다
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  filterRowSpacing: {
    marginBottom: spacing.sm,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  count: {
    ...typography.caption,
    color: colors.textSub,
    paddingVertical: spacing.sm,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});
