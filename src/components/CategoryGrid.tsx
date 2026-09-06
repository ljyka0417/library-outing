import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '@/data/categories';
import { categoryColors, colors, radius, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

interface Props {
  onSelect: (id: CategoryId) => void;
  /** 현재 선택된 카테고리 (검색 화면에서 필터로 쓸 때) */
  selected?: CategoryId;
}

/** 4열 x 2행 주제 그리드. 가이드북 목차의 8개 분류와 대응한다. */
export function CategoryGrid({ onSelect, selected }: Props) {
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((cat) => {
        const palette = categoryColors[cat.id];
        const isSelected = selected === cat.id;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`${cat.name} ${cat.sub} 주제 도서관 보기`}
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
            <Text style={styles.name}>{cat.name}</Text>
            <Text style={styles.sub}>{cat.sub}</Text>
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
