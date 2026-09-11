import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '@/data/categories';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { useT } from '@/i18n';
import { categoryColors, colors, radius, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

/**
 * 주제별 도서관 수.
 *
 * 원래 이 자리에는 부제("LP", "IT", "디자인")가 있었다. 부제는 그 분류를
 * 설명하는 말이 아니라 그 안의 한 예일 뿐이어서, 「음악·LP」를 누른 사람이
 * LP 도서관을 기대하고 들어와 음악 도서관 6곳을 보게 됐다. 그중 LP 는 한 곳뿐이다.
 * 개수는 어긋날 일이 없고, 어느 주제에 볼거리가 많은지 고르는 데도 도움이 된다.
 */
const COUNTS: Record<string, number> = MOCK_LIBRARIES.reduce(
  (acc, lib) => {
    for (const c of lib.categories) acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

interface Props {
  onSelect: (id: CategoryId) => void;
  /** 현재 선택된 카테고리 (검색 화면에서 필터로 쓸 때) */
  selected?: CategoryId;
}

/** 4열 x 2행 주제 그리드. 가이드북 목차의 8개 분류와 대응한다. */
export function CategoryGrid({ onSelect, selected }: Props) {
  const { t } = useT();

  return (
    <View style={styles.grid}>
      {CATEGORIES.map((cat) => {
        const palette = categoryColors[cat.id];
        const isSelected = selected === cat.id;
        // 주제 이름은 옮긴다. 도서관 이름과 달리 우리가 지은 분류라서
        // 옮겨도 없는 것을 지어내는 게 아니다.
        const name = t(`cat.${cat.id}`);
        const count = COUNTS[cat.id] ?? 0;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.category', { c: name, n: count })}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: palette.bg },
                isSelected && { borderColor: palette.fg, borderWidth: 2 },
              ]}
            >
              <Ionicons name={cat.icon as never} size={24} color={palette.fg} />
            </View>
            <Text numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            <Text style={styles.sub}>{t('unit.places', { n: count })}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    rowGap: spacing.lg,
  },
  item: {
    // 4열 고정
    width: '25%',
    alignItems: 'center',
    gap: 2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  name: {
    ...typography.captionBold,
    color: colors.text,
  },
  sub: {
    ...typography.tiny,
    color: colors.textSub,
  },
});
