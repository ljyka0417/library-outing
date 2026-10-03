import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SearchBar } from './SearchBar';
import { Chip, ChipRow, EmptyState } from './common';
import { WhereToBorrowSheet } from './WhereToBorrowSheet';
import { searchBooks, type FoundBook } from '@/api/loanStatus';
import { SIDO_LIST } from '@/data/categories';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { useAppStore } from '@/store/useAppStore';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { useLayout } from '@/hooks/useLayout';
import { regionName, useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import type { Book } from '@/types';

/** 정보나루에 등록돼 대출 여부를 물을 수 있는 도서관이 있는 지역만 고를 수 있게 한다 */
const REGIONS = SIDO_LIST.filter((r) => MOCK_LIBRARIES.some((l) => l.region.sido === r && l.sourceApiId));

/**
 * 검색 탭의 "책" 모드 — 책 제목으로 찾고, 고른 지역에서 어디서 빌릴 수 있는지 본다.
 *
 * 제목을 치면 잠깐 기다렸다가(타자 칠 때마다 묻지 않게) 정보나루 도서 검색을 부른다.
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

  const [query, setQuery] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [books, setBooks] = useState<FoundBook[]>([]);
  const [asking, setAsking] = useState<Book | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.replace(/\s/g, '').length < 2) {
      setState('idle');
      setBooks([]);
      return;
    }
    setState('loading');
    let alive = true;
    const timer = setTimeout(() => {
      void searchBooks(q).then((r) => {
        if (!alive) return;
        if (r) {
          setBooks(r);
          setState('done');
        } else setState('failed');
      });
    }, 450);
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
      <ChipRow contentStyle={styles.filterRow} style={styles.filterRowSpacing}>
        {REGIONS.map((r) => (
          <Chip key={r} label={regionName(lang, r)} selected={region === r} onPress={() => setRegion(r)} />
        ))}
      </ChipRow>

      {state === 'idle' ? (
        <EmptyState pose="reading" title={t('bookSearch.idleTitle')} description={t('bookSearch.idle')} />
      ) : state === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t('bookSearch.loading')}</Text>
        </View>
      ) : state === 'failed' ? (
        <EmptyState pose="faceWink" title={t('search.errorTitle')} description={t('bookSearch.failed')} />
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.isbns[0]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingHorizontal: layout.gutter, paddingBottom: tabPad }]}
          ListEmptyComponent={<EmptyState title={t('search.emptyTitle')} description={t('bookSearch.empty')} />}
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
        onClose={() => setAsking(null)}
        onOpenLibrary={(id) => {
          setAsking(null);
          router.push(`/library/${id}`);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
});
