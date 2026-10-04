import React, { forwardRef, useImperativeHandle } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/i18n';
import { colors, spacing, typography, themedStyles } from '@/theme';
import type { NearbyMapHandle } from './NearbyMap';
import type { Coordinates, Library } from '@/types';

/**
 * 웹에서는 지도 부품(react-native-maps)이 돌지 않는다. 지도 자리에 안내만 두고,
 * 가까운 도서관 목록(아래 카드)은 그대로 쓴다 — 개발 중 웹 미리보기에서 목록을 확인하는 용도.
 */
export const NearbyMap = forwardRef<NearbyMapHandle, { libraries: Library[]; user: Coordinates | null; selectedId: string | null; onSelect: (id: string) => void; padding?: { top: number; right: number; bottom: number; left: number } }>(
  function NearbyMap(_props, ref) {
    const { t } = useT();
    useImperativeHandle(ref, () => ({ focus: () => {} }));
    return (
      <View style={styles.box}>
        <Ionicons name="map-outline" size={40} color={colors.textMuted} />
        <Text style={styles.text}>{t('nearby.webNote')}</Text>
      </View>
    );
  }
);

const styles = themedStyles(() => ({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt },
  text: { ...typography.caption, color: colors.textSub },
}));
