import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookCard } from './BookCard';
import { Chip, ChipRow } from './common';
import { WhereToBorrowSheet } from './WhereToBorrowSheet';
import { loanLookupEnabled } from '@/api/loanStatus';
import {
  agesWithBooks,
  booksForAge,
  GENDER_KEYS,
  keywordItems,
  keywordMonth,
  type AgeKey,
  type GenderKey,
} from '@/data/trendBooks';
import { libText } from '@/i18n/libraryText';
import { bleedRow, useLayout } from '@/hooks/useLayout';
import { regionName, useT, type MessageKey } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import type { Book } from '@/types';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 책 가로 줄. 누르면 "어디서 빌릴 수 있나요?" 판을 띄운다 (지역은 홈의 지역) */
function BookRow({ books, rowKey, onAsk }: { books: Book[]; rowKey: string; onAsk: (b: Book) => void }) {
  const { t } = useT();
  const layout = useLayout();
  return (
    <ScrollView
      key={rowKey}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={bleedRow(layout).style}
      contentContainerStyle={[styles.row, bleedRow(layout).content]}
    >
      {books.map((b) =>
        loanLookupEnabled && b.isbn ? (
          <Pressable
            key={b.id}
            onPress={() => onAsk(b)}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
            accessibilityRole="button"
            accessibilityHint={t('home.regionBooksHint')}
          >
            <BookCard book={b} />
          </Pressable>
        ) : (
          <BookCard key={b.id} book={b} />
        )
      )}
    </ScrollView>
  );
}

/**
 * 홈의 "나이대별 많이 빌린 책"(전국, 최근 3개월)과 "이달의 키워드".
 * 둘 다 정보나루에서 미리 모아 둔 것이다(src/data/trendBooks.ts). 책을 누르면 홈에서 고른 지역의
 * 도서관 중 어디서 빌릴 수 있는지 묻는다 — 그때만 정보나루를 부른다.
 */
export function TrendBooksShelf({ region }: { region: string }) {
  const { t, lang } = useT();
  const layout = useLayout();
  const router = useRouter();
  const [age, setAge] = useState<AgeKey>(agesWithBooks.includes('20s') ? '20s' : agesWithBooks[0]);
  const [gender, setGender] = useState<GenderKey>('all');
  const [word, setWord] = useState(keywordItems[0]?.word);
  const [asking, setAsking] = useState<Book | null>(null);

  const ageBooks = age ? booksForAge(age, gender) : [];
  const keyword = keywordItems.find((k) => k.word === word);
  const monthNum = Number(keywordMonth.slice(5, 7));
  const month = lang === 'en' ? MONTH_NAMES[monthNum - 1] ?? String(monthNum) : String(monthNum);

  return (
    <>
      {agesWithBooks.length ? (
        <View style={styles.section}>
          <View style={[styles.header, { paddingHorizontal: layout.gutter }]}>
            <Text style={styles.title}>{t('trend.ageTitle')}</Text>
            <Text style={styles.subtitle}>{t('trend.ageSub')}</Text>
          </View>
          <ChipRow contentStyle={styles.chips} style={styles.chipRow}>
            {agesWithBooks.map((a) => (
              <Chip key={a} label={t(`trend.age.${a}` as MessageKey)} selected={a === age} onPress={() => setAge(a)} />
            ))}
          </ChipRow>
          {/* 성별은 작게 — 기본은 전체 */}
          <View style={[styles.segment, { marginHorizontal: layout.gutter }]}>
            {GENDER_KEYS.map((g) => {
              const on = g === gender;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  style={[styles.segItem, on && styles.segOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.segText, on && styles.segTextOn]}>{t(`trend.gender.${g}` as MessageKey)}</Text>
                </Pressable>
              );
            })}
          </View>
          {ageBooks.length ? (
            <BookRow books={ageBooks} rowKey={`${age}-${gender}`} onAsk={setAsking} />
          ) : (
            <Text style={[styles.empty, { paddingHorizontal: layout.gutter }]}>{t('trend.empty')}</Text>
          )}
        </View>
      ) : null}

      {keywordItems.length ? (
        <View style={styles.section}>
          <View style={[styles.header, { paddingHorizontal: layout.gutter }]}>
            <Text style={styles.title}>{t('trend.kwTitle')}</Text>
            <Text style={styles.subtitle}>{t('trend.kwSub', { month })}</Text>
          </View>
          <ChipRow contentStyle={styles.chips} style={styles.chipRow}>
            {keywordItems.map((k) => (
              <Chip key={k.word} label={`#${libText(k.word, lang)}`} selected={k.word === word} onPress={() => setWord(k.word)} />
            ))}
          </ChipRow>
          {keyword ? (
            <>
              <Text style={[styles.caption, { paddingHorizontal: layout.gutter }]}>
                {/* 책 제목은 한국어라, 외국어 화면에서도 제목에 든 한국어 낱말을 함께 적는다 */}
                {t('trend.kwCaption', { word: lang === 'ko' ? keyword.word : `${keyword.word} (${libText(keyword.word, lang)})` })}
              </Text>
              <BookRow books={keyword.books} rowKey={keyword.word} onAsk={setAsking} />
            </>
          ) : null}
          {loanLookupEnabled ? (
            <Text style={[styles.hint, { paddingHorizontal: layout.gutter }]}>
              {t('trend.hint', { region: regionName(lang, region) })}
            </Text>
          ) : null}
        </View>
      ) : null}

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
  section: {
    marginBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSub,
    marginTop: 2,
  },
  chipRow: {
    marginBottom: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
  },
  segItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  segOn: {
    backgroundColor: colors.surface,
  },
  segText: {
    ...typography.caption,
    color: colors.textSub,
  },
  segTextOn: {
    color: colors.primary,
    fontWeight: '700',
  },
  row: {
    gap: spacing.lg,
  },
  caption: {
    ...typography.caption,
    color: colors.textSub,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
