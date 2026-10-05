import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import type { Coordinates } from '@/types';

/** 웹에는 지도 부품이 없다 — 안내만 (개발 중 미리보기용). 앱은 CourseMap.tsx */
export function CourseMap(_props: { stops: { name: string; coords: Coordinates }[] }) {
  const { t } = useT();
  return (
    <View style={styles.box}>
      <Ionicons name="map-outline" size={32} color={colors.textMuted} />
      <Text style={styles.text}>{t('nearby.webNote')}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  box: { height: 120, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  text: { ...typography.caption, color: colors.textMuted },
}));
