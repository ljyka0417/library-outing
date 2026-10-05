import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from './common';
import { fetchSubway, type SubwayStation } from '@/api/subway';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';
import { lineColor } from '@/utils/subwayLineColor';
import type { Coordinates } from '@/types';

/**
 * 도서관 화면의 "가까운 지하철역" — 버스 칸과 같은 모양으로 1km 안 역 두 곳과 노선·방향별 다음 열차.
 * 수도권은 실시간(서울 열린데이터광장), 그 밖은 시간표(국토교통부 TAGO) — 어디서나 "○분 뒤" 로 보이고,
 * 아래 출처 줄에만 실시간인지 시간표 기준인지 적는다. 근처에 역이 없으면 칸을 그리지 않는다.
 * 노선은 고유색으로 칠한다(9호선 금색 · 2호선 초록 …) — 역 앞 동그라미는 첫 노선 색.
 */
function LinePill({ line, small }: { line: string; small?: boolean }) {
  const c = lineColor(line);
  return (
    <View style={[styles.pill, small && styles.pillSmall, { backgroundColor: c?.bg ?? colors.surfaceAlt }]}>
      <Text
        style={[styles.pillText, small && styles.pillTextSmall, { color: c?.fg ?? colors.textSub }, c?.shadow && styles.pillShadow]}
        numberOfLines={1}
      >
        {line}
      </Text>
    </View>
  );
}

type Train = NonNullable<SubwayStation['live']>[number];

/** 역 전광판처럼 방향(group)마다 묶는다 — 서버가 이미 노선·방향 차례로 준다 */
function boards(live: Train[]) {
  const out: { key: string; line: string; dir: string; trains: Train[] }[] = [];
  for (const a of live) {
    const key = a.group ?? `${a.line}|${a.dir}|${a.to}`;
    const last = out[out.length - 1];
    if (last && last.key === key) last.trains.push(a);
    else out.push({ key, line: a.line, dir: a.dir, trains: [a] });
  }
  return out;
}

/** 열차가 지금 어디쯤 — "전역 출발 (잠원)" · "현재 옥수" (실시간만. 시간표는 빈칸) */
function where(a: Train, t: (k: 'subway.now', v: { at: string }) => string) {
  if (!a.at && !a.msg) return '';
  const positional = /전역|번째|당역|진입|도착|출발/.test(a.msg) && !/\d+분/.test(a.msg);
  if (positional) return a.msg.replace(/\s*\(.*\)\s*$/, '') + (a.at && !a.msg.includes('당역') ? ` (${a.at})` : '');
  return a.at ? t('subway.now', { at: a.at }) : '';
}

export function SubwaySection({ coords, inset = 0 }: { coords?: Coordinates; inset?: number }) {
  const { t } = useT();
  const [stations, setStations] = useState<SubwayStation[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    const s = await fetchSubway(coords);
    setStations(s);
    setCheckedAt(new Date());
    setLoading(false);
  }, [coords?.lat, coords?.lng]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!stations || stations.length === 0) return null;
  const hhmm = checkedAt ? `${String(checkedAt.getHours()).padStart(2, '0')}:${String(checkedAt.getMinutes()).padStart(2, '0')}` : '';
  const kinds = new Set(stations.map((s) => s.kind).filter(Boolean));
  const hasTimes = kinds.size > 0;
  const source = [
    kinds.has('live') ? t('subway.sourceLive') : null,
    kinds.has('schedule') ? t('subway.sourceSchedule') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.section}>
      <SectionHeader title={t('subway.title')} subtitle={t(hasTimes ? 'subway.subTimes' : 'subway.sub')} inset={inset} />
      <View style={{ paddingHorizontal: inset, gap: spacing.sm }}>
        {stations.map((s) => (
          <View key={s.name} style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.badge, { backgroundColor: lineColor(s.lines[0] ?? '')?.bg ?? '#3B6FB6' }]}>
                <Ionicons name="subway" size={17} color={lineColor(s.lines[0] ?? '')?.fg ?? colors.white} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={2}>{t('subway.station', { name: s.name })}</Text>
                {s.lines.length ? (
                  <View style={styles.pills}>
                    {s.lines.map((l) => (
                      <LinePill key={l} line={l} small />
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={styles.right}>
                <Text style={styles.dist}>{formatDistance(s.dist)}</Text>
                <Text style={styles.walk}>{t('nearby.walk', { n: walkingMinutes(s.dist) })}</Text>
              </View>
            </View>
            {s.live === null ? null : s.live.length === 0 ? (
              <Text style={styles.empty}>{t('subway.none')}</Text>
            ) : (
              <View style={styles.boards}>
                {boards(s.live).map((b) => (
                  <View key={b.key} style={styles.board}>
                    <View style={styles.boardHead}>
                      <LinePill line={b.line} />
                      <Text style={styles.boardDir} numberOfLines={1}>
                        {b.dir ? b.dir.replace(/방면$/, ' 방면') : b.trains[0]?.to}
                      </Text>
                    </View>
                    {b.trains.map((a, i) => (
                      <View key={i} style={styles.row}>
                        <Text style={styles.order}>{t(i === 0 ? 'subway.this' : 'subway.next')}</Text>
                        <Text style={styles.when}>{a.min === null ? a.msg : a.min <= 0 ? t('bus.soon') : t('bus.min', { n: a.min })}</Text>
                        <Text style={styles.dir} numberOfLines={1}>
                          {[b.dir ? a.to : '', where(a, t)].filter(Boolean).join(' · ')}
                        </Text>
                        {a.express ? <Text style={[styles.tag, styles.tagExpress]}>{t('subway.express')}</Text> : null}
                        {a.last ? <Text style={[styles.tag, styles.tagLast]}>{t('subway.last')}</Text> : null}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        <View style={styles.foot}>
          <Text style={styles.source} numberOfLines={2}>
            {hasTimes ? `${source} · ${t('subway.asOf', { time: hhmm })}` : t('subway.source')}
          </Text>
          {hasTimes ? (
            <Pressable onPress={() => void load()} disabled={loading} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.refresh, loading && { opacity: 0.4 }]}>{t('bus.refresh')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  section: { marginBottom: spacing.xxl },
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3B6FB6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.captionBold, color: colors.text },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  pillSmall: { paddingHorizontal: 6, paddingVertical: 1 },
  pillText: { ...typography.tiny, fontWeight: '700' },
  pillTextSmall: { fontSize: 11, lineHeight: 15 },
  // 밝은 노선색 위 흰 글자 윤곽
  pillShadow: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 0.5 }, textShadowRadius: 1.5 },
  right: { alignItems: 'flex-end' },
  dist: { ...typography.captionBold, color: colors.primary },
  walk: { ...typography.tiny, color: colors.textMuted },
  boards: { gap: spacing.sm, paddingLeft: 32 + spacing.md },
  board: { gap: 4 },
  boardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  boardDir: { ...typography.captionBold, color: colors.text, flexShrink: 1 },
  order: { ...typography.tiny, color: colors.textMuted, minWidth: 28 },
  tag: { ...typography.tiny, fontWeight: '700', paddingHorizontal: 6, borderRadius: 6, overflow: 'hidden' },
  tagExpress: { color: colors.white, backgroundColor: '#C9536B' },
  tagLast: { color: colors.white, backgroundColor: colors.textSub },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  when: { ...typography.captionBold, color: colors.closed },
  dir: { ...typography.tiny, color: colors.textMuted, flex: 1 },
  empty: { ...typography.tiny, color: colors.textMuted, paddingLeft: 32 + spacing.md },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  source: { ...typography.tiny, color: colors.textMuted, flex: 1 },
  refresh: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
}));
