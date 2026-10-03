import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchRelated, fetchWhereToBorrow, type FoundBook, type LoanStatus } from '@/api/loanStatus';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { regionName, useT } from '@/i18n';
import { libText } from '@/i18n/libraryText';
import { colors, radius, spacing, typography } from '@/theme';
import type { Book, Library } from '@/types';

/**
 * "이 책 어디서 빌릴 수 있어요?" — 지역 책 줄에서 책을 누르면 아래에서 올라온다.
 *
 * 그 지역에서 정보나루에 등록된 도서관(많아야 11곳)에 한 번에 묻고,
 * 대출 가능 → 대출 중 순으로 보여 준다. 책이 없는 곳은 이름 대신 곳 수만 적는다
 * (없는 곳을 줄줄이 늘어놓으면 정작 빌릴 수 있는 곳이 묻힌다).
 *
 * 아래에는 "이 책을 빌린 사람들이 함께 빌린 책"(정보나루)을 둔다. 누르면 판이 그 책으로 바뀌어
 * 다시 어디서 빌릴지 묻는다 — 책 구경이 판 안에서 이어진다.
 */

export function WhereToBorrowSheet({
  book: startBook,
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
  // 지금 보는 책 — 함께 빌린 책을 누르면 바뀐다. 밖에서 다른 책을 주면 그 책으로 돌아간다
  const [book, setBook] = useState<Book | null>(startBook);
  useEffect(() => setBook(startBook), [startBook]);
  const [related, setRelated] = useState<FoundBook[]>([]);
  const libs: Library[] = MOCK_LIBRARIES.filter((l) => l.sourceApiId && l.region.sido === region);
  const [state, setState] = useState<'loading' | 'done' | 'failed'>('loading');
  const [results, setResults] = useState<Record<string, LoanStatus>>({});
  const codesKey = libs.map((l) => l.sourceApiId).join(',');
  // 책 검색에서 온 책은 판본 ISBN 이 여럿이다 — 함께 물어 어느 판본이든 있으면 "있음"
  const isbnKey = (book?.isbns?.length ? book.isbns : book?.isbn ? [book.isbn] : [])
    .slice(0, 3)
    .join(',');

  useEffect(() => {
    if (!isbnKey || !codesKey) return;
    let alive = true;
    setState('loading');
    setResults({});
    void fetchWhereToBorrow(isbnKey.split(','), codesKey.split(',')).then((r) => {
      if (!alive) return;
      // 한 곳도 답을 못 받았으면(정보나루 하루 한도·인터넷) "없어요"가 아니라 "확인할 수 없어요"
      if (r && Object.keys(r).length > 0) {
        setResults(r);
        setState('done');
      } else setState('failed');
    });
    return () => {
      alive = false;
    };
  }, [isbnKey, codesKey]);

  // 함께 빌린 책 — 대출 많은 판본 하나로 묻는다 (서버가 7일 기억한다)
  const firstIsbn = isbnKey.split(',')[0];
  useEffect(() => {
    setRelated([]);
    if (!firstIsbn) return;
    let alive = true;
    void fetchRelated(firstIsbn).then((r) => {
      if (alive && Array.isArray(r)) setRelated(r);
    });
    return () => {
      alive = false;
    };
  }, [firstIsbn]);

  if (!book) return null;

  const openRelated = (b: FoundBook) =>
    setBook({
      id: `related-${b.isbns[0]}`,
      title: b.title,
      author: b.author,
      coverImageUrl: b.coverImageUrl,
      isbn: b.isbns[0],
      isbns: b.isbns,
      category: 'humanities',
    });

  const statusOf = (l: Library) => results[l.sourceApiId!];
  const available = libs.filter((l) => statusOf(l)?.hasBook && statusOf(l)?.loanAvailable);
  const onLoan = libs.filter((l) => statusOf(l)?.hasBook && !statusOf(l)?.loanAvailable);
  const notOwned = libs.filter((l) => statusOf(l) && !statusOf(l)!.hasBook);
  // 답을 못 받은 곳 — 없다고 단정하지 않고 따로 센다
  const unknown = libs.filter((l) => !statusOf(l));

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
        {l.region.sigungu ? (
          <Text style={styles.libSub}>
            {libText(l.region.sigungu, lang)}
          </Text>
        ) : null}
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
              <ScrollView style={{ maxHeight: related.length ? 260 : 360 }}>
                {available.map((l) => row(l, true))}
                {onLoan.map((l) => row(l, false))}
                {available.length + onLoan.length === 0 && unknown.length === 0 ? (
                  <Text style={styles.note}>{t('where.none')}</Text>
                ) : null}
                {notOwned.length > 0 && available.length + onLoan.length > 0 ? (
                  <Text style={styles.notOwned}>{t('where.notOwned', { n: String(notOwned.length) })}</Text>
                ) : null}
                {unknown.length > 0 ? (
                  <Text style={styles.notOwned}>{t('where.unknown', { n: String(unknown.length) })}</Text>
                ) : null}
              </ScrollView>
            </>
          )}

          {related.length ? (
            <View style={styles.related}>
              <Text style={styles.relatedTitle}>{t('where.related')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
                {related.map((b) => (
                  <Pressable
                    key={b.isbns[0]}
                    onPress={() => openRelated(b)}
                    style={({ pressed }) => [styles.relatedItem, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.title}, ${b.author}`}
                  >
                    {b.coverImageUrl ? (
                      <Image source={{ uri: b.coverImageUrl }} style={styles.relatedCover} />
                    ) : (
                      <View style={[styles.relatedCover, styles.relatedCoverEmpty]}>
                        <Ionicons name="book" size={18} color={colors.textMuted} />
                      </View>
                    )}
                    <Text style={styles.relatedName} numberOfLines={2}>{b.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  related: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  relatedTitle: {
    ...typography.captionBold,
    color: colors.textSub,
    marginBottom: spacing.sm,
  },
  relatedRow: {
    gap: spacing.md,
  },
  relatedItem: {
    width: 72,
  },
  relatedCover: {
    width: 72,
    height: 102,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  relatedCoverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedName: {
    ...typography.tiny,
    color: colors.text,
    marginTop: 4,
  },
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
