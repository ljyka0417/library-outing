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
 * 노선 종류 색 — 서울 버스 색(간선 파랑 · 지선 초록 · 순환 노랑 · 광역 빨강 · 마을 연두 · 공항 하늘).
 * 다른 도시도 같은 갈래(TAGO 노선 종류)로 맞춘다. 모르는 종류는 회색.
 */
const BUS_KIND: Record<string, { bg: string }> = {
  trunk: { bg: '#3D5BAB' },
  branch: { bg: '#5BB025' },
  circle: { bg: '#E5A400' },
  express: { bg: '#E60012' },
  village: { bg: '#79B33A' },
  airport: { bg: '#00A0E9' },
  other: { bg: '#6E7781' },
};

/**
 * 도서관 화면의 "가까운 버스 정류장" — 정류장 두 곳과 실시간 도착 예정 버스 (국토교통부 TAGO).
 * 서울은 TAGO 에 없고, 근처에 정류장이 없으면 칸을 그리지 않는다.
 * 도착 시간은 서버가 1분 기억한다. "새로고침" 을 누르면 다시 묻는다.
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
                {s.arrivals.map((a) => {
                  const kc = BUS_KIND[a.kind ?? 'other'];
                  return (
                    <View key={a.route} style={styles.busRow}>
                      <View style={styles.busLeft}>
                        <View style={[styles.routePill, { backgroundColor: kc.bg }]}>
                          <Text style={styles.routePillText} numberOfLines={1}>{a.route}</Text>
                        </View>
                        {a.type?.includes('저상') ? <Ionicons name="accessibility" size={13} color={colors.primary} /> : null}
                        {a.last ? <Text style={styles.lastTag}>{t('subway.last')}</Text> : null}
                      </View>
                      <View style={styles.busMid}>
                        {/* 좁은 폰에서 '10분 뒤' 가 두 줄로 꺾이지 않게 — 시간은 줄지 않고 옆 설명이 줄어든다 */}
                        <Text style={[styles.when, styles.noShrink]} numberOfLines={1}>{a.min <= 1 ? t('bus.soon') : t('bus.min', { n: a.min })}</Text>
                        <Text style={styles.prev} numberOfLines={1}>
                          {[
                            a.toward ? t('subway.toward', { name: a.toward }) : '',
                            a.prev > 0 ? t('bus.prev', { n: a.prev }) : '',
                            a.next !== undefined ? t('bus.next', { n: a.next }) : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}
        {/* 사람 아이콘이 무엇인지 — 저상버스가 하나라도 보일 때만 */}
        {bus.stops.some((st) => st.arrivals?.some((x) => x.type?.includes('저상'))) ? (
          <View style={styles.legend}>
            <Ionicons name="accessibility" size={12} color={colors.primary} />
            <Text style={styles.source}>{t('bus.lowFloor')}</Text>
          </View>
        ) : null}
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
  noShrink: { flexShrink: 0 },
  busRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 1 },
  busLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 92 },
  busMid: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  routePill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, maxWidth: 76 },
  routePillText: { ...typography.tiny, color: '#FFFFFF', fontWeight: '800' },
  lastTag: {
    ...typography.tiny,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: colors.textSub,
    paddingHorizontal: 5,
    borderRadius: 5,
    overflow: 'hidden',
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
    flexShrink: 1,
  },
  empty: {
    ...typography.tiny,
    color: colors.textMuted,
    paddingLeft: 32 + spacing.md,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
