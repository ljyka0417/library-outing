import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryColors, colors, radius, spacing, typography } from '@/theme';
import type { Book } from '@/types';

/**
 * 추천 도서 카드.
 *
 * 표지 이미지는 쓰지 않는다. 출판사 표지는 저작물이고, 랜덤 이미지를 표지인 양
 * 보여주는 건 더 나쁘다. 대신 주제 색 위에 제목을 얹어 표지처럼 보이게 그린다.
 * 실제 표지가 필요하면 알라딘/교보 OpenAPI 로 ISBN 기반 표지를 받아
 * coverImageUrl 을 채우면 이 컴포넌트가 자동으로 그걸 쓴다.
 */
export function BookCard({ book }: { book: Book }) {
  const palette = categoryColors[book.category] ?? {
    bg: colors.surfaceAlt,
    fg: colors.textMuted,
  };

  return (
    <View style={styles.card}>
      {book.coverImageUrl ? (
        <View>
          <Image source={{ uri: book.coverImageUrl }} style={styles.cover} />
          {/* 실제 대출 순위가 있을 때만 표시한다 */}
          {book.rank ? (
            <View style={styles.rank}>
              <Text style={styles.rankText}>{book.rank}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.cover, styles.fauxCover, { backgroundColor: palette.bg }]}>
          {/* 책등 느낌의 세로선 — 표지처럼 읽히게 하는 최소한의 장치 */}
          <View style={[styles.spine, { backgroundColor: palette.fg }]} />
          <Ionicons name="book" size={18} color={palette.fg} style={{ opacity: 0.5 }} />
          <Text style={[styles.fauxTitle, { color: palette.fg }]} numberOfLines={4}>
            {book.title}
          </Text>
        </View>
      )}

      <Text style={styles.title} numberOfLines={2}>
        {book.title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {book.author}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 104,
    gap: 2,
  },
  cover: {
    width: 104,
    height: 148,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.sm,
  },
  fauxCover: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.lg,
    gap: 6,
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    left: 6,
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.35,
  },
  fauxTitle: {
    ...typography.tiny,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
  },
  rank: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(46,42,38,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  rankText: {
    ...typography.tiny,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    ...typography.captionBold,
    color: colors.text,
  },
  author: {
    ...typography.tiny,
    color: colors.textSub,
  },
});
