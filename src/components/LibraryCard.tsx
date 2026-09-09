import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from './common';
import { LibraryImage } from './LibraryImage';
import { localizeRegion, useT } from '@/i18n';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { isOpenNow } from '@/utils/openingHours';
import type { Library } from '@/types';

/**
 * 시/군/구는 확인된 곳만 있으므로 있을 때만 붙인다.
 * 시·도만 번역한다. 시/군/구는 옮겨 적어도 그 표기로는 어디서도 못 찾는다.
 */
function regionLabel(library: Library, T: ReturnType<typeof useT>) {
  return [localizeRegion(T, library.region.sido), library.region.sigungu]
    .filter(Boolean)
    .join(' ');
}

interface Props {
  library: Library;
  onPress: () => void;
  /** 가로 스크롤 캐러셀용 컴팩트 카드 */
  variant?: 'list' | 'carousel';
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function LibraryCard({
  library,
  onPress,
  variant = 'list',
  isFavorite,
  onToggleFavorite,
}: Props) {
  const T = useT();
  const open = isOpenNow(library.hours);
  const mainCategory = library.categories[0];

  /**
   * 배지에는 분류 이름만 쓴다.
   *
   * 예전엔 "음악·LP" 처럼 부제까지 붙였는데, 부제는 그 분류를 설명하는 말이
   * 아니라 그 안의 한 예일 뿐이다. 음악 분류 6곳 중 실제로 LP 가 있는 곳은
   * 한 곳인데, 국악 도서관에도 미술 도서관에도 "음악·LP" 가 찍혔다.
   * 그 도서관만의 특화는 아래 specialty 줄이 이미 정확하게 말해 준다.
   */
  const categoryLabel = T.categories[mainCategory] ?? '';

  if (variant === 'carousel') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.carouselCard, pressed && { opacity: 0.85 }]}
      >
        <LibraryImage library={library} variant="carousel" />
        <View style={styles.carouselBody}>
          <Text style={styles.carouselName} numberOfLines={1}>
            {library.name}
          </Text>
          <Text style={styles.region} numberOfLines={1}>
            {regionLabel(library, T)}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <LibraryImage library={library} variant="card" />

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          {categoryLabel ? <Badge label={categoryLabel} category={mainCategory} /> : null}
          {open !== null ? (
            <Badge label={open ? T.common.open : T.common.closed} tone={open ? 'open' : 'closed'} />
          ) : null}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {library.name}
        </Text>
        <Text style={styles.region} numberOfLines={1}>
          {regionLabel(library, T)}
        </Text>
        <Text style={styles.services} numberOfLines={1}>
          {library.specialty}
        </Text>
      </View>

      {onToggleFavorite ? (
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={10}
          style={styles.heart}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? colors.heart : colors.textMuted}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  body: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: 2,
  },
  name: {
    ...typography.bodyBold,
    color: colors.text,
  },
  region: {
    ...typography.caption,
    color: colors.textSub,
  },
  services: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  heart: {
    padding: spacing.xs,
    alignSelf: 'flex-start',
  },

  carouselCard: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  carouselImage: {
    width: '100%',
    height: 104,
    backgroundColor: colors.surfaceAlt,
  },
  carouselBody: {
    padding: spacing.md,
    gap: 2,
  },
  carouselName: {
    ...typography.captionBold,
    color: colors.text,
  },
});
