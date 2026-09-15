import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Mascot, type MascotPose } from './Mascot';
import { useLayout } from '@/hooks/useLayout';
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
  /** 좌우 여백을 직접 줄 때. 두 단 배치처럼 이미 안쪽에 들어가 있는 칸에서 쓴다 */
  inset?: number;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, inset }: SectionHeaderProps) {
  // 좌우 여백은 화면 폭을 따라간다. 부르는 쪽마다 넘겨 주면 한 군데만
  // 빠뜨려도 제목 줄이 어긋나므로 여기서 직접 읽는다.
  const layout = useLayout();

  return (
    <View style={[styles.sectionHeader, { paddingHorizontal: inset ?? layout.gutter }]}>
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

/* ---------------------------------------------------------------- 칩 줄 */

interface ChipRowProps {
  children: React.ReactNode;
  /** 칩 사이 간격·위아래 여유 같은 줄 안쪽 모양 */
  contentStyle?: ViewStyle | ViewStyle[];
  /** 줄 바깥 여백 */
  style?: ViewStyle | ViewStyle[];
}

/**
 * 칩을 늘어놓는 한 줄.
 *
 * 폰에서는 옆으로 밀어 넘기고, **태블릿에서는 여러 줄로 감싸 전부 보여 준다.**
 *
 * 태블릿은 본문을 가운데 칸에 가둔다. 옆으로 넘기는 줄을 그 안에 두면 칩이
 * 칸 오른쪽 끝에서 뚝 잘렸다. 양옆은 비어 있는데 가운데서 끊기니 고장 난
 * 것처럼 보였다. 칩은 카드와 달리 짧고, 태블릿은 폭이 넉넉하다. 숨겨 두고
 * 넘기게 할 이유가 없어서 한 번에 다 펼친다 — 고를 수 있는 게 전부 보인다.
 */
export function ChipRow({ children, contentStyle, style }: ChipRowProps) {
  const layout = useLayout();
  const pad = { paddingHorizontal: layout.gutter };

  if (layout.isTablet) {
    return <View style={[styles.chipWrap, contentStyle, pad, style]}>{children}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.chipScroll, style]}
      contentContainerStyle={[styles.chipLine, contentStyle, pad]}
    >
      {children}
    </ScrollView>
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
  /** 폰: 옆으로 넘기는 줄. 세로로 늘어나 목록 자리를 먹지 않게 묶는다. */
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipLine: { alignItems: 'center' },
  /** 태블릿: 여러 줄로 감싼다 */
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },

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
    // 좌우 여백은 useLayout 이 준다
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
