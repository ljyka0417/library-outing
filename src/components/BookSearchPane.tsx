import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SearchBar } from './SearchBar';
import { Chip, ChipRow, EmptyState } from './common';
import { WhereToBorrowSheet } from './WhereToBorrowSheet';
import { searchBooks, type FoundBook } from '@/api/loanStatus';
import { searchLocalBooks } from '@/data/bookIndex';
import { SIDO_LIST } from '@/data/categories';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { useAppStore } from '@/store/useAppStore';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { useLayout } from '@/hooks/useLayout';
import { regionName, useT } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import type { Book } from '@/types';

const squash = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
/** 앱 목록 먼저, 서버에서 온 것 중 같은 책(제목+지은이)은 빼고 뒤에 */
function mergeBooks(local: FoundBook[], server: FoundBook[]): FoundBook[] {
  const seen = new Set(local.map((b) => `${squash(b.title)}|${squash(b.author)}`));
  return [...local, ...server.filter((b) => !seen.has(`${squash(b.title)}|${squash(b.author)}`))];
}

/** 정보나루에 등록돼 대출 여부를 물을 수 있는 도서관이 있는 지역만 고를 수 있게 한다 */
const REGIONS = SIDO_LIST.filter((r) => MOCK_LIBRARIES.some((l) => l.region.sido === r && l.sourceApiId));

/**
 * 검색 탭의 "책" 모드 — 책 제목으로 찾고, 고른 지역에서 어디서 빌릴 수 있는지 본다.
 *
 * 제목을 치면 먼저 앱에 담아 둔 많이 빌린 책(src/data/bookIndex.ts)에서 찾고, 모자라면
 * 잠깐 기다렸다가(타자 칠 때마다 묻지 않게) 정보나루 도서 검색을 부른다.
 * 책을 누르면 "어디서 빌릴 수 있나요?" 판이 그 지역 도서관에 판본까지 함께 묻는다.
 */
export function BookSearchPane() {
  const { t, lang } = useT();
  const layout = useLayout();
  const tabPad = useTabBarPadding();
  const router = useRouter();
  const recentIds = useAppStore((s) => s.recentLibraryIds);

  // 처음 지역: 최근 본 도서관의 지역, 없으면 서울
  const startRegion = useMemo(() => {
    const recent = recentIds.map((id) => MOCK_LIBRARIES.find((l) => l.id === id)).find(Boolean);
    return recent && REGIONS.includes(recent.region.sido) ? recent.region.sido : '서울';
  }, [recentIds]);
  const [region, setRegion] = useState(startRegion);
  // 전국 칩은 뺐다 — 한 번 누를 때마다 정보나루에 80곳을 묻는다
  // 칩은 늘 같은 차례(서울 · 경기 · 인천 …). 고른 지역이 뒤쪽이면 칩 줄이 그 자리로 넘어가 보이게 한다
  const chips = REGIONS;

  const [query, setQuery] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'failed' | 'quota'>('idle');
  const [books, setBooks] = useState<FoundBook[]>([]);
  const [asking, setAsking] = useState<Book | null>(null);
  // 앱에 담긴 목록만으로 보여 주는 중이면 'local' — 아래에 "더 찾아보기"(서버)를 단다
  const [more, setMore] = useState<'local' | 'loading' | 'done' | 'failed' | 'quota'>('done');

  /** 서버(정보나루)에 물어서 앱 목록 뒤에 붙인다. 서버가 안 되면 앱 목록만 남긴다 */
  const askServer = (q: string, local: FoundBook[], isAlive: () => boolean) => {
    void searchBooks(q).then((r) => {
      if (!isAlive()) return;
      if (Array.isArray(r)) {
        setBooks(mergeBooks(local, r));
        setState('done');
        setMore('done');
      } else if (local.length) {
        setBooks(local);
        setState('done');
        setMore(r === 'quota' ? 'quota' : 'failed');
      } else setState(r === 'quota' ? 'quota' : 'failed');
    });
  };

  useEffect(() => {
    const q = query.trim();
    if (q.replace(/\s/g, '').length < 2) {
      setState('idle');
      setBooks([]);
      return;
    }
    // 먼저 앱에 담아 둔 많이 빌린 책에서 찾는다 — 세 권 이상이거나 제목이 똑같은 책이 있으면
    // 서버에 묻지 않는다 (하루 500건 한도). 모자라면 아래 "더 찾아보기"로 서버에 물을 수 있다
    const local = searchLocalBooks(q);
    if (local.length >= 3 || local.some((b) => squash(b.title) === squash(q))) {
      setBooks(local);
      setState('done');
      setMore('local');
      return;
    }
    setState('loading');
    let alive = true;
    const timer = setTimeout(() => askServer(q, local, () => alive), 450);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const open = (b: FoundBook) =>
    setAsking({
      id: `search-${b.isbns[0]}`,
      title: b.title,
      author: b.author,
      coverImageUrl: b.coverImageUrl,
      isbn: b.isbns[0],
      isbns: b.isbns,
      category: 'humanities',
    });

  return (
    <>
      <View style={[styles.searchWrap, { paddingHorizontal: layout.gutter }]}>
        <SearchBar value={query} onChangeText={setQuery} placeholder={t('bookSearch.placeholder')} />
      </View>

      <Text style={[styles.label, { paddingHorizontal: layout.gutter }]}>{t('bookSearch.region')}</Text>
      <ChipRow contentStyle={styles.filterRow} style={styles.filterRowSpacing} focusIndex={chips.indexOf(startRegion)}>
        {chips.map((r) => (
          <Chip
            key={r}
            label={regionName(lang, r)}
            selected={region === r}
            onPress={() => setRegion(r)}
          />
        ))}
      </ChipRow>

      {state === 'idle' ? (
        <EmptyState pose="reading" title={t('bookSearch.idleTitle')} description={t('bookSearch.idle')} />
      ) : state === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t('bookSearch.loading')}</Text>
        </View>
      ) : state === 'failed' || state === 'quota' ? (
        <EmptyState
          pose="faceWink"
          title={t('search.errorTitle')}
          description={state === 'quota' ? t('loan.quota') : t('bookSearch.failed')}
        />
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.isbns[0]}
          keyboardShouldPersistTaps="handled"
          /* 키보드가 올라와도 목록 끝까지 올려 볼 수 있게(아이폰), 목록을 끌면 키보드를 내린다.
             그대로 두면 아래쪽 결과가 키보드 밑에 깔려 누를 수 없었다 */
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingHorizontal: layout.gutter, paddingBottom: tabPad }]}
          ListEmptyComponent={<EmptyState title={t('search.emptyTitle')} description={t('bookSearch.empty')} />}
          ListFooterComponent={
            more === 'local' ? (
              <Pressable
                onPress={() => {
                  setMore('loading');
                  askServer(query.trim(), books, () => true);
                }}
                style={({ pressed }) => [styles.more, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
              >
                <Ionicons name="search" size={15} color={colors.primary} />
                <Text style={styles.moreText}>{t('bookSearch.more')}</Text>
              </Pressable>
            ) : more === 'loading' ? (
              <ActivityIndicator color={colors.primary} style={styles.moreLoading} />
            ) : more === 'quota' || more === 'failed' ? (
              <Text style={styles.moreNote}>{more === 'quota' ? t('loan.quota') : t('bookSearch.failed')}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityHint={t('home.regionBooksHint')}
            >
              {item.coverImageUrl ? (
                <Image source={{ uri: item.coverImageUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverEmpty]}>
                  <Ionicons name="book" size={18} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {item.author ? <Text style={styles.author} numberOfLines={1}>{item.author}</Text> : null}
                <Text style={styles.cta}>{t('where.title')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}

      <WhereToBorrowSheet
        book={asking}
        region={region}
        onRegionChange={setRegion}
        onClose={() => setAsking(null)}
        onOpenLibrary={(id) => {
          setAsking(null);
          router.push(`/library/${id}`);
        }}
      />
    </>
  );
}

const styles = themedStyles(() => ({
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
  },
  moreText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  moreLoading: {
    marginVertical: spacing.lg,
  },
  moreNote: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  searchWrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  label: {
    ...typography.captionBold,
    color: colors.textSub,
    marginBottom: spacing.xs,
  },
  filterRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  filterRowSpacing: {
    marginBottom: spacing.sm,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxxl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSub,
  },
  list: {
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cover: {
    width: 48,
    height: 68,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
  },
  author: {
    ...typography.caption,
    color: colors.textSub,
    marginTop: 1,
  },
  cta: {
    ...typography.tiny,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
}));
