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
  const out: { key: string; line: string; dir: string; toward: string; trains: Train[] }[] = [];
  for (const a of live) {
    const key = a.group ?? `${a.line}|${a.dir}|${a.to}`;
    const last = out[out.length - 1];
    if (last && last.key === key) last.trains.push(a);
    else out.push({ key, line: a.line, dir: a.dir, toward: a.toward ?? '', trains: [a] });
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

/** 이번 열차가 몇 정거장 전 — "당역 도착" 0 · "전역 출발" 1 · "[3]번째 전역" 3 · 시간만 오면 어림. 모르면 null */
function stationsAway(a: Train): number | null {
  if (!a.msg || !a.at) return null;
  if (/당역|진입/.test(a.msg) && !/전역/.test(a.msg)) return 0;
  const n = a.msg.match(/\[(\d+)\]번째 전역/);
  if (n) return Math.min(4, Number(n[1]));
  if (/전역/.test(a.msg)) return 1;
  // "4분 후 (샛강)" 처럼 시간만 올 때는 역 사이 2분쯤으로 어림 (열차가 있는 역 이름은 실제 값)
  if (a.min !== null && a.min > 0) return Math.min(4, Math.max(1, Math.round(a.min / 2)));
  return null;
}

/** 전광판 아래 작은 선로 — 오른쪽 끝이 이 역, 열차가 몇 정거장 전에 있는지 */
function Track({ away, color, at, here }: { away: number; color: string; at: string; here: string }) {
  const STOPS = 5; // 왼쪽부터 4정거장 전 … 이 역
  const pos = STOPS - 1 - away;
  return (
    <View style={styles.track}>
      <View style={[styles.trackLine, { backgroundColor: color }]} />
      {Array.from({ length: STOPS }, (_, i) => (
        <View key={i} style={styles.trackSlot}>
          <View style={[styles.trackDot, { borderColor: color }, i === STOPS - 1 && { backgroundColor: color }]} />
          {i === pos ? (
            <View style={[styles.trackTrain, { backgroundColor: color }]}>
              <Ionicons name="train" size={11} color="#FFFFFF" />
            </View>
          ) : null}
          <Text style={styles.trackLabel} numberOfLines={1}>
            {i === STOPS - 1 ? here : i === pos && away > 0 ? at : ''}
          </Text>
        </View>
      ))}
    </View>
  );
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
                {boards(s.live).map((b) => {
                  const lc = lineColor(b.line);
                  return (
                    <View key={b.key} style={styles.led}>
                      {/* 머리말 — 노선 색 띠 + 종착역 방면 */}
                      <View style={styles.ledHead}>
                        <LinePill line={b.line} />
                        <Text style={styles.ledDir} numberOfLines={1}>
                          {b.toward
                            ? /순환$/.test(b.toward)
                              ? b.toward
                              : t('subway.toward', { name: b.toward })
                            : b.dir || b.trains[0]?.to}
                        </Text>
                        {b.toward && /순환$/.test(b.toward) && b.dir ? (
                          <Text style={styles.ledSub} numberOfLines={1}>{b.dir.replace(/방면$/, ' 방면')}</Text>
                        ) : null}
                      </View>
                      {b.trains.map((a, i) => (
                        <View key={i} style={styles.ledRow}>
                          <Text style={styles.ledOrder}>{t(i === 0 ? 'subway.this' : 'subway.next')}</Text>
                          <Ionicons name="train" size={15} color={lc?.bg ?? colors.primary} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.ledTo} numberOfLines={1}>
                              {a.to}
                              {a.express ? <Text style={styles.ledExpress}>{'  '}{t('subway.express')}</Text> : null}
                              {a.last ? <Text style={styles.ledLast}>{'  '}{t('subway.last')}</Text> : null}
                            </Text>
                            <Text style={styles.ledWhere} numberOfLines={1}>
                              {[where(a, t), a.no ? t('subway.trainNo', { no: a.no }) : ''].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                          <Text style={styles.ledMin}>{a.min === null ? '' : a.min <= 0 ? t('bus.soon') : t('subway.minShort', { n: a.min })}</Text>
                        </View>
                      ))}
                      {/* 이번 열차가 몇 정거장 전인지 — 실시간만 (시간표는 위치를 모른다) */}
                      {b.trains[0] && stationsAway(b.trains[0]) !== null ? (
                        <Track away={stationsAway(b.trains[0])!} color={lc?.bg ?? colors.primary} at={b.trains[0].at ?? ''} here={t('subway.here')} />
                      ) : null}
                    </View>
                  );
                })}
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
  boards: { gap: spacing.sm },
  // 승강장 전광판 — 어두운 판에 주황 글씨 (밝게·어둡게 화면 모드와 상관없이 같은 모양)
  led: { backgroundColor: '#15181D', borderRadius: radius.md, padding: spacing.md, gap: 8 },
  ledHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#2A2F36' },
  ledDir: { ...typography.captionBold, color: '#FFFFFF', flexShrink: 1 },
  ledSub: { ...typography.tiny, color: '#9AA3AD', flexShrink: 1 },
  ledRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ledOrder: { ...typography.tiny, color: '#FFB547', fontWeight: '700', minWidth: 28 },
  ledTo: { ...typography.captionBold, color: '#FFFFFF' },
  ledExpress: { color: '#FF6B6B', fontWeight: '800' },
  ledLast: { color: '#9AA3AD', fontWeight: '800' },
  ledWhere: { ...typography.tiny, color: '#FFB547' },
  ledMin: { ...typography.bodyBold, color: '#FFB547', fontVariant: ['tabular-nums'] },
  track: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, height: 34 },
  trackLine: { position: 'absolute', left: '10%', right: '10%', top: 6, height: 2, opacity: 0.6 },
  trackSlot: { flex: 1, alignItems: 'center' },
  trackDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, backgroundColor: '#15181D' },
  trackTrain: {
    position: 'absolute',
    top: -5,
    width: 22,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLabel: { fontSize: 10, lineHeight: 13, color: '#9AA3AD', marginTop: 4 },
  board: { gap: 4 },
  boardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  boardDir: { ...typography.captionBold, color: colors.text, flexShrink: 1 },
  boardSub: { ...typography.tiny, color: colors.textMuted, flexShrink: 1 },
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
