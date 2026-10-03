import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from './common';
import { BF_GROUPS, barrierFreeFor, bfHighlights, type BfGroup } from '@/data/barrierFree';
import { useT, type MessageKey } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

const CHIP_ICON = {
  wheelchair: 'accessibility',
  elevator: 'swap-vertical',
  restroom: 'water',
  parking: 'car',
  visual: 'eye',
  hearing: 'ear',
  family: 'happy',
} as const;

const GROUP_ICON: Record<BfGroup, keyof typeof Ionicons.glyphMap> = {
  physical: 'accessibility',
  visual: 'eye',
  hearing: 'ear',
  family: 'happy',
};

/**
 * 도서관 화면의 "편의 시설" — 휠체어·엘리베이터·장애인 화장실·주차, 시각·청각 지원, 아이 동반.
 * 한국관광공사 무장애 여행 정보에 그 도서관이 있을 때만 그린다.
 * 칩은 "있음"인 것만, 자세히 보기는 관광공사 원문 그대로(없음이라 적힌 것도 그대로).
 */
export function BarrierFreeSection({ libraryId, inset = 0 }: { libraryId: string; inset?: number }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const info = barrierFreeFor(libraryId);
  if (!info) return null;
  const chips = bfHighlights(info);

  return (
    <View style={styles.section}>
      <SectionHeader title={t('bf.title')} subtitle={t('bf.sub')} inset={inset} />
      <View style={{ paddingHorizontal: inset }}>
        <View style={styles.chips}>
          {chips.map((c) => (
            <View key={c} style={styles.chip}>
              <Ionicons name={CHIP_ICON[c]} size={14} color={colors.primary} />
              <Text style={styles.chipText}>{t(`bf.chip.${c}` as MessageKey)}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => setOpen(!open)}
          style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <Text style={styles.moreText}>{open ? t('lib.less') : t('bf.more')}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primary} />
        </Pressable>

        {open ? (
          <View style={styles.detail}>
            {(Object.keys(BF_GROUPS) as BfGroup[]).map((g) => {
              const rows = BF_GROUPS[g].filter((f) => info[f]);
              if (!rows.length) return null;
              return (
                <View key={g} style={styles.group}>
                  <View style={styles.groupHead}>
                    <Ionicons name={GROUP_ICON[g]} size={15} color={colors.textSub} />
                    <Text style={styles.groupTitle}>{t(`bf.group.${g}` as MessageKey)}</Text>
                  </View>
                  {rows.map((f) => (
                    <View key={f} style={styles.row}>
                      <Text style={styles.label}>{t(`bf.f.${f}` as MessageKey)}</Text>
                      <Text style={styles.value}>{info[f]}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
            <Text style={styles.source}>{t('bf.source')}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  moreText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  detail: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSub,
    width: 78,
    flexShrink: 0,
  },
  value: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  source: {
    ...typography.tiny,
    color: colors.textMuted,
  },
});
