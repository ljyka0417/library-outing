import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Mascot, type MascotPose } from './Mascot';
import { categoryColors, colors, radius, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

/* ------------------------------------------------------------------ 뱃지 */

interface BadgeProps {
  label: string;
  /** 카테고리 색을 쓰고 싶을 때 */
  category?: CategoryId;
  tone?: 'primary' | 'brown' | 'open' | 'closed';
}

export function Badge({ label, category, tone = 'primary' }: BadgeProps) {
  const palette = category
    ? categoryColors[category]
    : tone === 'brown'
      ? { bg: colors.brownSoft, fg: colors.brown }
      : tone === 'open'
        ? { bg: '#E6F4EC', fg: colors.open }
        : tone === 'closed'
          ? { bg: '#FBEAE7', fg: colors.closed }
          : { bg: colors.primarySoft, fg: colors.primary };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------- 섹션 헤더 */

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSub} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------- 빈 상태 */

interface EmptyStateProps {
  title: string;
  description?: string;
  /** 상황에 맞는 달곰이 포즈. 기본은 자는 얼굴(= 아직 아무것도 없음) */
  pose?: MascotPose;
  style?: ViewStyle;
}

/** 마스코트를 등장시켜 "비었음"을 부드럽게 전달한다. */
export function EmptyState({ title, description, pose = 'faceSleepy', style }: EmptyStateProps) {
  return (
    <View style={[styles.empty, style]}>
      <Mascot size={88} pose={pose} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDesc}>{description}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------- 칩 */

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------ 정보 한 줄 */

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}

export function InfoRow({ icon, label, value, onPress }: InfoRowProps) {
  const body = (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, onPress && styles.infoValueLink]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    minHeight: 24,
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.tiny,
    fontWeight: '700',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSub,
    marginTop: 2,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionActionText: {
    ...typography.caption,
    color: colors.textSub,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.caption,
    color: colors.textSub,
    textAlign: 'center',
  },

  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    // 글자가 잘리지 않도록 최소 높이를 고정한다 (한글 대응)
    minHeight: 38,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSub,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  infoIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSub,
    width: 60,
    paddingTop: 3,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  infoValueLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
