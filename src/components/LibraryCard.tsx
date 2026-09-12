import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from './common';
import { LibraryImage } from './LibraryImage';
import { regionName, useT, type Lang } from '@/i18n';
import { readableName } from '@/utils/romanize';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { isOpenNow } from '@/utils/openingHours';
import { useNow } from '@/hooks/useNow';
import type { Library } from '@/types';

/**
 * 시/군/구는 확인된 곳만 있으므로 있을 때만 붙인다.
 *
 * 시·도는 쓰는 말로 옮긴다. 검색 화면의 지역 단추는 이미 「ソウル」이라고
 * 쓰는데 그 아래 카드만 「서울」로 남아 한 화면에서 말이 갈렸다.
 * 시/군/구는 옮기지 않는다 — 네 말 모두의 표기를 가진 표가 우리에게 없고,
 * 없는 이름을 지어내느니 도서관 이름과 똑같이 원문으로 두는 편이 낫다.
 */
function regionLabel(library: Library, lang: Lang) {
  return [regionName(lang, library.region.sido), library.region.sigungu]
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
  // 분이 바뀌면 다시 그려진다. 9시가 되면 그 자리에서 "운영중" 으로 바뀐다.
  const now = useNow();
  const open = isOpenNow(library.hours, now);
  const mainCategory = library.categories[0];
  const { t, lang } = useT();

  /**
   * 한글 이름 아래 붙는 읽는 법. 한국어일 때는 빈 문자열이라 줄이 생기지 않는다.
   *
   * 이름을 갈아 치우지 않고 한 줄 더 붙이는 이유는 romanize.ts 에 적어 두었다.
   * 요지는 이게 공식 영문명이 아니라 소리를 옮긴 것이라는 점이다.
   */
  const reading = readableName(library.name, lang);

  /**
   * 배지에는 분류 이름만 쓴다.
   *
   * 예전엔 "음악·LP" 처럼 부제까지 붙였는데, 부제는 그 분류를 설명하는 말이
   * 아니라 그 안의 한 예일 뿐이다. 음악 분류 6곳 중 실제로 LP 가 있는 곳은
   * 한 곳인데, 국악 도서관에도 미술 도서관에도 "음악·LP" 가 찍혔다.
   * 그 도서관만의 특화는 아래 specialty 줄이 이미 정확하게 말해 준다.
   */
  const categoryLabel = mainCategory ? t(`cat.${mainCategory}`) : '';

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
          {reading ? (
            <Text style={styles.reading} numberOfLines={1}>
              {reading}
            </Text>
          ) : null}
          <Text style={styles.region} numberOfLines={1}>
            {regionLabel(library, lang)}
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
            <Badge label={open ? t('badge.open') : t('badge.closed')} tone={open ? 'open' : 'closed'} />
          ) : null}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {library.name}
        </Text>
        {reading ? (
          <Text style={styles.reading} numberOfLines={1}>
            {reading}
          </Text>
        ) : null}
        <Text style={styles.region} numberOfLines={1}>
          {regionLabel(library, lang)}
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
          accessibilityLabel={isFavorite ? t('lib.favRemove') : t('lib.favAdd')}
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
  /** 한글 이름 아래 붙는 읽는 법. 이름보다 눈에 덜 띄게 둔다. */
  reading: {
    ...typography.tiny,
    color: colors.textSub,
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
