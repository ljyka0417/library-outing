import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BookCard } from './BookCard';
import { WhereToBorrowSheet } from './WhereToBorrowSheet';
import { loanLookupEnabled } from '@/api/loanStatus';
import { booksForRegion, regionsWithBooks } from '@/data/regionBooks';
import { SIDO_LIST } from '@/data/categories';
import { bleedRow, useLayout, MODAL_ORIENTATIONS } from '@/hooks/useLayout';
import { regionName, useT } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import type { Book } from '@/types';

/**
 * 홈의 "지역별 많이 빌린 책" 줄. 제목 옆 단추로 지역을 바꾼다.
 *
 * 처음 지역은 부르는 쪽이 정한다(최근 본 도서관의 지역, 없으면 서울).
 * 지역 순위는 그 지역 도서관들을 합친 것이라 특정 도서관의 대출 가능 여부는 붙이지 않는다.
 */
export function RegionBooksShelf({
  region: wanted,
  onRegionChange,
}: {
  /** 홈의 책 줄들이 함께 쓰는 지역 (연령별 줄과 같은 지역) */
  region: string;
  onRegionChange: (region: string) => void;
}) {
  const { t, lang } = useT();
  const layout = useLayout();
  const regions = SIDO_LIST.filter((r) => regionsWithBooks.includes(r));
  // 순위가 모이지 않은 지역이면 첫 지역을 보여 준다
  const region = regions.includes(wanted) ? wanted : regions[0];
  const setRegion = onRegionChange;
  const [picking, setPicking] = useState(false);
  // 누른 책 — "어디서 빌릴 수 있나요?" 판을 띄운다
  const [asking, setAsking] = useState<Book | null>(null);
  const router = useRouter();
  const books = booksForRegion(region);
  if (!region || books.length === 0) return null;

  const label = regionName(lang, region);
  return (
    <View style={styles.section}>
      <View style={[styles.header, { paddingHorizontal: layout.gutter }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('home.regionBooksTitle')}</Text>
          <Text style={styles.subtitle}>{t('home.regionBooksSub', { region: label })}</Text>
        </View>
        <Pressable
          onPress={() => setPicking(true)}
          style={({ pressed }) => [styles.pick, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={t('home.regionPick')}
        >
          <Ionicons name="location-outline" size={15} color={colors.primary} />
          <Text style={styles.pickText}>{label}</Text>
          <Ionicons name="chevron-down" size={15} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        // 지역을 바꾸면 줄을 처음으로 돌린다
        key={region}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={bleedRow(layout).style}
        contentContainerStyle={[styles.row, bleedRow(layout).content]}
      >
        {books.map((b) =>
          loanLookupEnabled && b.isbn ? (
            <Pressable
              key={b.id}
              onPress={() => setAsking(b)}
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
      {loanLookupEnabled ? (
        <Text style={[styles.hint, { paddingHorizontal: layout.gutter }]}>{t('home.regionBooksHint')}</Text>
      ) : null}

      <WhereToBorrowSheet
        book={asking}
        // 판에서 순위가 없는 지역을 골라도 되돌아가지 않게 고른 지역 그대로 넘긴다
        region={wanted}
        onRegionChange={onRegionChange}
        onClose={() => setAsking(null)}
        onOpenLibrary={(id) => {
          setAsking(null);
          router.push(`/library/${id}`);
        }}
      />

      {/* 지역 고르기 — 아래에서 올라오는 판 */}
      <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)} supportedOrientations={MODAL_ORIENTATIONS}>
        <Pressable style={styles.backdrop} onPress={() => setPicking(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{t('home.regionPick')}</Text>
            <View style={styles.grid}>
              {regions.map((r) => {
                const on = r === region;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setRegion(r);
                      setPicking(false);
                    }}
                    style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.7 }]}
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{regionName(lang, r)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = themedStyles(() => ({
  section: {
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
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
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginTop: 2,
  },
  pickText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  row: {
    gap: spacing.lg,
  },
  hint: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: spacing.sm,
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
  sheetTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipOn: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.body,
    color: colors.text,
  },
  chipTextOn: {
    color: colors.white,
    fontWeight: '700',
  },
}));
