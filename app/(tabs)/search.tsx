import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LibraryCard } from '@/components/LibraryCard';
import { SearchBar } from '@/components/SearchBar';
import { Chip, EmptyState } from '@/components/common';
import { CATEGORIES, CATEGORY_MAP, SIDO_LIST } from '@/data/categories';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { isOpenNow } from '@/utils/openingHours';
import { colors, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<CategoryId | undefined>(
    params.category as CategoryId | undefined
  );
  const [sido, setSido] = useState<string | undefined>();
  const [openNow, setOpenNow] = useState(false);

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

  const activeCategoryLabel = category ? CATEGORY_MAP[category] : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={keyword}
          onChangeText={setKeyword}
          placeholder="도서관명, 지역, 주제 검색"
        />
      </View>

      {/* 필터: 주제 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={[{ flexGrow: 0, flexShrink: 0 }, styles.filterRowSpacing]}
      >
        <Chip
          label="전체 주제"
          selected={!category}
          onPress={() => setCategory(undefined)}
        />
        {/* 칩에도 부제는 붙이지 않는다. "음악·LP" 는 그 분류가 LP 도서관만
            모아 둔 것처럼 읽힌다. 실제로는 음악 도서관 6곳 중 한 곳뿐이다. */}
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            selected={category === c.id}
            onPress={() => setCategory(category === c.id ? undefined : c.id)}
          />
        ))}
      </ScrollView>

      {/* 필터: 지역 + 운영중 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={[{ flexGrow: 0, flexShrink: 0 }, styles.filterRowSpacing]}
      >
        <Chip label="지금 운영중" selected={openNow} onPress={() => setOpenNow(!openNow)} />
        <View style={styles.divider} />
        <Chip label="전국" selected={!sido} onPress={() => setSido(undefined)} />
        {SIDO_LIST.map((s) => (
          <Chip
            key={s}
            label={s}
            selected={sido === s}
            onPress={() => setSido(sido === s ? undefined : s)}
          />
        ))}
      </ScrollView>

      <Text style={styles.count}>
        {activeCategoryLabel ? `${activeCategoryLabel.name} ` : ''}
        도서관 {results.length}곳
        {isStale ? ' · 오프라인 저장본' : ''}
      </Text>

      {loading && !data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />
      ) : error ? (
        <EmptyState
          pose="faceWink"
          title="목록을 불러오지 못했어요"
          description="네트워크 상태를 확인한 뒤 다시 시도해 주세요"
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title="조건에 맞는 도서관이 없어요"
              description="검색어나 필터를 조금 바꿔 보세요"
            />
          }
          renderItem={({ item }) => (
            <LibraryCard
              library={item}
              onPress={() => router.push(`/library/${item.id}`)}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  filterRow: {
    paddingHorizontal: spacing.xl,
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
});
