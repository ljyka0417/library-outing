import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchWhereToBorrow, type LoanStatus } from '@/api/loanStatus';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { regionName, useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import type { Book, Library } from '@/types';

/**
 * "이 책 어디서 빌릴 수 있어요?" — 지역 책 줄에서 책을 누르면 아래에서 올라온다.
 *
 * 그 지역에서 정보나루에 등록된 도서관(많아야 11곳)에 한 번에 묻고,
 * 대출 가능 → 대출 중 순으로 보여 준다. 책이 없는 곳은 이름 대신 곳 수만 적는다
 * (없는 곳을 줄줄이 늘어놓으면 정작 빌릴 수 있는 곳이 묻힌다).
 */
export function WhereToBorrowSheet({
  book,
  region,
  onClose,
  onOpenLibrary,
}: {
  book: Book | null;
  region: string;
  onClose: () => void;
  onOpenLibrary: (id: string) => void;
}) {
  const { t, lang } = useT();
  const libs: Library[] = MOCK_LIBRARIES.filter((l) => l.region.sido === region && l.sourceApiId);
  const [state, setState] = useState<'loading' | 'done' | 'failed'>('loading');
  const [results, setResults] = useState<Record<string, LoanStatus>>({});
  const codesKey = libs.map((l) => l.sourceApiId).join(',');
  // 책 검색에서 온 책은 판본 ISBN 이 여럿이다 — 함께 물어 어느 판본이든 있으면 "있음"
  const isbnKey = (book?.isbns?.length ? book.isbns : book?.isbn ? [book.isbn] : []).join(',');

  useEffect(() => {
    if (!isbnKey || !codesKey) return;
    let alive = true;
    setState('loading');
    setResults({});
    void fetchWhereToBorrow(isbnKey.split(','), codesKey.split(',')).then((r) => {
      if (!alive) return;
      if (r) {
        setResults(r);
        setState('done');
      } else setState('failed');
    });
    return () => {
      alive = false;
    };
  }, [isbnKey, codesKey]);

  if (!book) return null;

  const statusOf = (l: Library) => results[l.sourceApiId!];
  const available = libs.filter((l) => statusOf(l)?.hasBook && statusOf(l)?.loanAvailable);
  const onLoan = libs.filter((l) => statusOf(l)?.hasBook && !statusOf(l)?.loanAvailable);
  const notOwned = libs.filter((l) => statusOf(l) && !statusOf(l)!.hasBook);

  const row = (l: Library, ok: boolean) => (
    <Pressable
      key={l.id}
      onPress={() => onOpenLibrary(l.id)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
    >
      <View style={[styles.dot, { backgroundColor: ok ? colors.open : colors.closed }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.libName} numberOfLines={1}>{l.name}</Text>
        {l.region.sigungu ? <Text style={styles.libSub}>{l.region.sigungu}</Text> : null}
      </View>
      <Text style={[styles.status, { color: ok ? colors.open : colors.closed }]}>
        {ok ? t('loan.available') : t('loan.onLoan')}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.head}>
            {book.coverImageUrl ? <Image source={{ uri: book.coverImageUrl }} style={styles.cover} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{t('where.title')}</Text>
              <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
              {book.author ? <Text style={styles.author} numberOfLines={1}>{book.author}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('visit.close')}>
              <Ionicons name="close" size={22} color={colors.textSub} />
            </Pressable>
          </View>

          {libs.length === 0 ? (
            <Text style={styles.note}>{t('where.unsupported')}</Text>
          ) : state === 'loading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.note}>{t('where.loading')}</Text>
            </View>
          ) : state === 'failed' ? (
            <Text style={styles.note}>{t('where.failed')}</Text>
          ) : (
            <>
              <Text style={styles.sub}>
                {t('where.sub', { region: regionName(lang, region), n: String(libs.length) })}
              </Text>
              <ScrollView style={{ maxHeight: 360 }}>
                {available.map((l) => row(l, true))}
                {onLoan.map((l) => row(l, false))}
                {available.length + onLoan.length === 0 ? <Text style={styles.note}>{t('where.none')}</Text> : null}
                {notOwned.length > 0 && available.length + onLoan.length > 0 ? (
                  <Text style={styles.notOwned}>{t('where.notOwned', { n: String(notOwned.length) })}</Text>
                ) : null}
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,26,22,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  head: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  cover: {
    width: 52,
    height: 74,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  kicker: {
    ...typography.captionBold,
    color: colors.primary,
  },
  bookTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: 2,
  },
  author: {
    ...typography.caption,
    color: colors.textSub,
  },
  sub: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  note: {
    ...typography.body,
    color: colors.textSub,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  libName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  libSub: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  status: {
    ...typography.captionBold,
  },
  notOwned: {
    ...typography.tiny,
    color: colors.textMuted,
    paddingTop: spacing.md,
  },
});
