import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LibraryCard } from '@/components/LibraryCard';
import { LibraryDetail } from '@/components/LibraryDetail';
import { SearchBar } from '@/components/SearchBar';
import { Chip, ChipRow, EmptyState } from '@/components/common';
import { CATEGORIES, CATEGORY_MAP, SIDO_LIST } from '@/data/categories';
import { regionName, useT } from '@/i18n';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { isOpenNow } from '@/utils/openingHours';
import { useNow } from '@/hooks/useNow';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { LayoutWidth, centered, useLayout } from '@/hooks/useLayout';
import { colors, spacing, typography } from '@/theme';
import type { CategoryId, Library } from '@/types';

/**
 * 검색.
 *
 * 폰과 세로로 든 아이패드에서는 목록만 보이고, 누르면 상세 화면으로 넘어간다.
 *
 * 폭이 넉넉하면(가로로 눕힌 아이패드, 13인치 세로) **목록과 상세를 나란히** 둔다.
 * 메일·지도 앱과 같은 모양이다. 카드를 누르면 오른쪽 칸만 바뀌어서 여러 도서관을
 * 오가며 비교하기 쉽다. 폰 화면을 크게 늘려 두었을 때는 도서관 하나 볼 때마다
 * 화면 전체가 넘어갔다 돌아왔다.
 */
export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const layout = useLayout();
  const { t } = useT();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<CategoryId | undefined>(
    CATEGORY_MAP[params.category ?? ''] ? (params.category as CategoryId) : undefined
  );
  const [sido, setSido] = useState<string | undefined>();
  const [openNow, setOpenNow] = useState(false);
  // "지금 운영중" 필터도 분이 바뀌면 다시 걸러진다
  const now = useNow();

  /** 나란히 둘 때 사람이 직접 골라 오른쪽에 띄운 도서관 */
  const [selectedId, setSelectedId] = useState<string | undefined>();

  /**
   * 홈에서 주제를 눌러 들어왔을 때 그 주제로 맞춘다.
   *
   * 검색은 탭 화면이라 한 번 뜨면 계속 살아 있다. 위 useState 의 초기값은
   * 맨 처음 한 번만 읽히므로, 홈에서 주제를 눌러도 필터가 안 걸리고 전체가
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
      if (openNow && isOpenNow(lib.hours, now) !== true) return false;
      return true;
    });
  }, [data, keyword, category, sido, openNow, now]);

  /*
   * 오른쪽 칸에 띄울 도서관.
   *
   * 고른 곳이 필터에 걸려 목록에서 사라지면 첫 번째로 옮긴다. 목록에 없는
   * 도서관이 오른쪽에 계속 떠 있으면 "필터가 안 먹는다" 로 보인다.
   * 처음 열었을 때도 첫 도서관을 띄운다 — 오른쪽이 빈 채로 시작하면 덜 만든
   * 화면처럼 보인다. 대신 이렇게 저절로 띄운 것은 "최근 본 도서관" 에 남기지 않는다.
   */
  const stillListed = selectedId !== undefined && results.some((r) => r.id === selectedId);
  const activeId = stillListed ? selectedId : results[0]?.id;

  // 목록 칸(ResultsPane)이 memo 라서 누를 때마다 새 함수를 넘기면 memo 가 소용없어진다
  const split = layout.split;
  const openLibrary = useCallback(
    (id: string) => {
      if (split) setSelectedId(id);
      else router.push(`/library/${id}`);
    },
    [split, router]
  );

  const list = (
    <ResultsPane
      keyword={keyword}
      onKeyword={setKeyword}
      category={category}
      onCategory={setCategory}
      sido={sido}
      onSido={setSido}
      openNow={openNow}
      onOpenNow={setOpenNow}
      results={results}
      loading={loading && !data}
      error={!!error}
      isStale={isStale}
      activeId={layout.split ? activeId : undefined}
      onOpen={openLibrary}
    />
  );

  /* ── 목록만 ───────────────────────────────────────────────── */
  if (!layout.split) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* 태블릿 세로에서는 이 안쪽을 가운데로 모은다. 검색창부터 목록까지 한
            덩어리로 묶어야 세로줄이 어긋나지 않는다. */}
        <View style={[styles.body, centered(layout)]}>{list}</View>
      </SafeAreaView>
    );
  }

  /* ── 목록 | 상세 ──────────────────────────────────────────── */
  const detailWidth = layout.width - layout.listPaneWidth - StyleSheet.hairlineWidth;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.split}>
        {/* 각 칸이 자기 폭을 알아야 카드 열 수와 여백이 칸에 맞게 정해진다 */}
        <LayoutWidth width={layout.listPaneWidth}>
          <View style={[styles.listPane, { width: layout.listPaneWidth }]}>{list}</View>
        </LayoutWidth>

        <View style={styles.paneDivider} />

        <LayoutWidth width={detailWidth}>
          <View style={styles.detailPane}>
            {activeId ? (
              /* key 로 도서관이 바뀔 때마다 새로 그린다. "더보기" 를 펼친 채
                 다음 도서관으로 넘어가는 일이 없게. */
              <LibraryDetail key={activeId} id={activeId} embedded recordRecent={stillListed} />
            ) : (
              /* 오른쪽이 비는 건 검색 결과가 하나도 없을 때뿐이다 */
              <EmptyState
                pose="faceSleepy"
                title={t('search.emptyTitle')}
                description={t('search.emptyBody')}
                style={styles.detailEmpty}
              />
            )}
          </View>
        </LayoutWidth>
      </View>
    </SafeAreaView>
  );
}

interface ResultsPaneProps {
  keyword: string;
  onKeyword: (v: string) => void;
  category?: CategoryId;
  onCategory: (v: CategoryId | undefined) => void;
  sido?: string;
  onSido: (v: string | undefined) => void;
  openNow: boolean;
  onOpenNow: (v: boolean) => void;
  results: Library[];
  loading: boolean;
  error: boolean;
  isStale: boolean;
  /** 나란히 둘 때 오른쪽에 떠 있는 도서관 */
  activeId?: string;
  onOpen: (id: string) => void;
}

/**
 * 검색창·필터·결과 목록.
 *
 * memo 로 감싼다. 탭을 오갈 때마다 검색 화면이 다시 그려지는데, 그때 이 칸도
 * 따라 그려지면 카드 132장을 전부 다시 만든다. 재 보니 검색 탭으로 돌아올 때
 * 컴포넌트 5,357개를 다시 그렸고, 그동안 탭 전환 효과가 멈춰 뚝 끊겨 보였다.
 * 받는 값이 그대로면 건너뛴다.
 *
 * 따로 떼어 둔 이유: 나란히 둘 때 이 칸은 360~420 폭만 쓴다. 폭에 따라 정해지는
 * 여백·열 수를 **이 안에서** useLayout 으로 읽어야 칸 폭을 따른다. 부모에서
 * 읽어 넘기면 부모의 넓은 폭 기준으로 두 줄 카드를 좁은 칸에 욱여넣는다.
 */
const ResultsPane = memo(function ResultsPane({
  keyword,
  onKeyword,
  category,
  onCategory,
  sido,
  onSido,
  openNow,
  onOpenNow,
  results,
  loading,
  error,
  isStale,
  activeId,
  onOpen,
}: ResultsPaneProps) {
  const { t, lang } = useT();
  const layout = useLayout();
  const tabPad = useTabBarPadding();
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  // 지역 이름(서울, 경기…)은 옮기지 않는다. 주소에 적힌 원문이고,
  // 현지에서 길을 물을 때도 그 글자가 있어야 통한다.
  const countLabel = category
    ? t('search.countInCategory', { c: t(`cat.${category}`), n: results.length })
    : t('search.count', { n: results.length });

  return (
    <>
      <View style={[styles.searchWrap, { paddingHorizontal: layout.gutter }]}>
        <SearchBar value={keyword} onChangeText={onKeyword} placeholder={t('search.placeholder')} />
      </View>

      {/* 필터: 주제 */}
      <ChipRow contentStyle={styles.filterRow} style={styles.filterRowSpacing}>
        <Chip
          label={t('search.allCategories')}
          selected={!category}
          onPress={() => onCategory(undefined)}
        />
        {/* 칩에도 부제는 붙이지 않는다. "음악·LP" 는 그 분류가 LP 도서관만
            모아 둔 것처럼 읽힌다. 실제로는 음악 도서관 6곳 중 한 곳뿐이다. */}
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={t(`cat.${c.id}`)}
            selected={category === c.id}
            onPress={() => onCategory(category === c.id ? undefined : c.id)}
          />
        ))}
      </ChipRow>

      {/* 필터: 지역 + 운영중 */}
      <ChipRow contentStyle={styles.filterRow} style={styles.filterRowSpacing}>
        <Chip label={t('search.openNow')} selected={openNow} onPress={() => onOpenNow(!openNow)} />
        <View style={styles.divider} />
        <Chip label={t('search.nationwide')} selected={!sido} onPress={() => onSido(undefined)} />
        {SIDO_LIST.map((s) => (
          <Chip
            key={s}
            /* 보이는 글자만 그 말로 바꾼다. 걸러 내는 값 s 는 한국어 원문이다 */
            label={regionName(lang, s)}
            selected={sido === s}
            onPress={() => onSido(sido === s ? undefined : s)}
          />
        ))}
      </ChipRow>

      <Text style={[styles.count, { paddingHorizontal: layout.gutter }]}>
        {countLabel}
        {isStale ? t('search.stale') : ''}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />
      ) : error ? (
        <EmptyState pose="faceWink" title={t('search.errorTitle')} description={t('search.errorBody')} />
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
          columnWrapperStyle={layout.listColumns > 1 ? { gap: spacing.md } : undefined}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: layout.gutter, paddingBottom: tabPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState title={t('search.emptyTitle')} description={t('search.emptyBody')} />
          }
          renderItem={({ item }) => (
            /* 여러 줄로 놓을 때 카드가 각자 나눠 갖게 한다.
               한 줄일 때도 flex:1 은 해가 없다. */
            <View style={{ flex: 1 }}>
              <LibraryCard
                library={item}
                onPress={() => onOpen(item.id)}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                selected={item.id === activeId}
              />
            </View>
          )}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /** 목록만 보일 때의 본문 (태블릿 세로에서는 가운데로 모인다) */
  body: {
    flex: 1,
  },

  /* 나란히 */
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  listPane: {
    backgroundColor: colors.background,
  },
  paneDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  detailPane: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailEmpty: {
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
