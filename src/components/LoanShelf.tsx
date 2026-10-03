import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BookCard } from './BookCard';
import { SectionHeader } from './common';
import { booksForLibrary } from '@/data/books.mock';
import { fetchLoanStatus, loanLookupEnabled, type LoanStatus } from '@/api/loanStatus';
import { bleedRow, useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { spacing } from '@/theme';
import type { Library } from '@/types';

/**
 * 홈의 "○○도서관에서 많이 빌린 책" 줄.
 *
 * 도서관 고르는 순서: 최근 본 곳 → 즐겨찾기 → 추천 도서관.
 * 그중 **그 도서관 자신의** 대출 순위가 있는 곳만 고른다. 지역 순위밖에 없는 곳을
 * "이 도서관에서 많이 빌린 책"이라고 쓰면 거짓말이 된다.
 * 중계 서버가 켜져 있으면 책마다 지금 빌릴 수 있는지도 붙인다.
 */
export function pickLoanLibrary(candidates: Library[]): Library | undefined {
  return candidates.find((lib) => {
    const books = booksForLibrary(lib.id, lib.categories);
    return books[0]?.rankScope === 'library';
  });
}

export function LoanShelf({ library, onOpen }: { library: Library; onOpen: () => void }) {
  const { t } = useT();
  const layout = useLayout();
  const books = booksForLibrary(library.id, library.categories);
  const [loans, setLoans] = useState<Record<string, LoanStatus>>({});

  const libCode = library.sourceApiId;
  const isbnKey = books.map((b) => b.isbn).filter(Boolean).join(',');
  useEffect(() => {
    setLoans({});
    if (!loanLookupEnabled || !libCode || !isbnKey) return;
    let alive = true;
    void fetchLoanStatus(libCode, isbnKey.split(',')).then((r) => {
      if (alive) setLoans(r);
    });
    return () => {
      alive = false;
    };
  }, [libCode, isbnKey]);

  const live = Object.keys(loans).length > 0;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t('home.loanTitle', { name: library.name })}
        subtitle={live ? t('home.loanSubLive') : t('home.loanSub')}
        actionLabel={t('home.loanAction')}
        onAction={onOpen}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={bleedRow(layout).style}
        contentContainerStyle={[styles.row, bleedRow(layout).content]}
      >
        {books.map((b) => (
          <BookCard key={b.id} book={b} loan={b.isbn ? loans[b.isbn] : undefined} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  row: {
    gap: spacing.lg,
  },
});
