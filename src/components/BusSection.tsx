import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from './common';
import { fetchBus, type BusInfo } from '@/api/bus';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';
import type { Coordinates } from '@/types';

/**
 * 도서관 화면의 "가까운 버스 정류장" — 정류장 두 곳과 실시간 도착 예정 버스 (국토교통부 TAGO).
 * 서울은 TAGO 에 없고, 근처에 정류장이 없으면 칸을 그리지 않는다.
 * 도착 시간은 서버가 1분 기억한다. "새로 보기" 를 누르면 다시 묻는다.
 */
export function BusSection({ coords, inset = 0 }: { coords?: Coordinates; inset?: number }) {
  const { t } = useT();
  const [bus, setBus] = useState<BusInfo | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    const r = await fetchBus(coords);
    setBus(r);
    setCheckedAt(new Date());
    setLoading(false);
  }, [coords]);

  useEffect(() => {
    void load();
  }, [load]);

  const stops = bus?.stops;
  if (!bus || !stops || stops.length === 0) return null;
  const hhmm = checkedAt ? `${String(checkedAt.getHours()).padStart(2, '0')}:${String(checkedAt.getMinutes()).padStart(2, '0')}` : '';

  return (
    <View style={styles.section}>
      <SectionHeader title={t('bus.title')} subtitle={t('bus.sub')} inset={inset} />
      <View style={{ paddingHorizontal: inset, gap: spacing.sm }}>
        {stops.map((s) => (
          <View key={`${s.name}-${s.no ?? s.dist}`} style={styles.card}>
            <View style={styles.head}>
              <View style={styles.badge}>
                <Ionicons name="bus" size={17} color={colors.white} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={2}>{s.name}</Text>
                {s.no ? <Text style={styles.meta}>{t('bus.stopNo', { no: s.no })}</Text> : null}
              </View>
              <View style={styles.right}>
                <Text style={styles.dist}>{formatDistance(s.dist)}</Text>
                <Text style={styles.walk}>{t('nearby.walk', { n: walkingMinutes(s.dist) })}</Text>
              </View>
            </View>
            {s.arrivals === null ? (
              <Text style={styles.empty}>{t('bus.failed')}</Text>
            ) : s.arrivals.length === 0 ? (
              <Text style={styles.empty}>{t('bus.none')}</Text>
            ) : (
              <View style={styles.list}>
                {s.arrivals.map((a) => (
                  <View key={a.route} style={styles.row}>
                    <Text style={styles.route} numberOfLines={1}>{t('bus.route', { r: a.route })}</Text>
                    {a.type?.includes('저상') ? <Ionicons name="accessibility" size={13} color={colors.primary} /> : null}
                    <Text style={styles.when}>{a.min <= 1 ? t('bus.soon') : t('bus.min', { n: a.min })}</Text>
                    {a.prev > 0 ? <Text style={styles.prev}>{t('bus.prev', { n: a.prev })}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        <View style={styles.foot}>
          <Text style={styles.source}>{t(bus.source === 'seoul' ? 'bus.sourceSeoul' : 'bus.source', { time: hhmm })}</Text>
          <Pressable onPress={() => void load()} disabled={loading} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.refresh, loading && { opacity: 0.4 }]}>{t('bus.refresh')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  section: {
    marginBottom: spacing.xxl,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3D8C4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.captionBold,
    color: colors.text,
  },
  meta: {
    ...typography.tiny,
    color: colors.textSub,
  },
  right: {
    alignItems: 'flex-end',
  },
  dist: {
    ...typography.captionBold,
    color: colors.primary,
  },
  walk: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  list: {
    gap: 4,
    paddingLeft: 32 + spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  route: {
    ...typography.captionBold,
    color: colors.text,
    minWidth: 64,
  },
  when: {
    ...typography.captionBold,
    color: colors.closed,
  },
  prev: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  empty: {
    ...typography.tiny,
    color: colors.textMuted,
    paddingLeft: 32 + spacing.md,
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  source: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  refresh: {
    ...typography.tiny,
    color: colors.primary,
    fontWeight: '700',
  },
}));
