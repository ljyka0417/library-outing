import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from './common';
import { fetchSubway, type SubwayStation } from '@/api/subway';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';
import { lineColor } from '@/utils/subwayLineColor';
import { approach } from '@/utils/subwayOrder';
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

const sameEnd = (to: string, toward?: string) =>
  !!toward && to.replace(/행$/, '').replace(/\s*\(.*\)$/, '').trim() === toward;

/** 열차가 지금 어디쯤 — "전역 출발 (잠원)" · "현재 옥수" (실시간만. 시간표는 빈칸) */
function where(a: Train, t: (k: 'subway.now', v: { at: string }) => string) {
  if (!a.at && !a.msg) return '';
  const positional = /전역|번째|당역|진입|도착|출발/.test(a.msg) && !/\d+분/.test(a.msg);
  if (positional) {
    const m = a.msg.replace(/\s*\(.*\)\s*$/, '');
    // "고속터미널 진입 (고속터미널)" 처럼 역 이름이 이미 들어 있으면 괄호를 붙이지 않는다
    return m + (a.at && !a.msg.includes('당역') && !m.includes(a.at) ? ` (${a.at})` : '');
  }
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
function Track({ away, color, at, here, label }: { away: number; color: string; at: string; here: string; label: string }) {
  // 왼쪽 끝 = 4정거장 전, 오른쪽 끝 = 이 역. 열차 아이콘이 그 사이 어디쯤인지
  const pct = Math.max(0, Math.min(1, 1 - away / 4));
  return (
    <View style={styles.track}>
      <Text style={styles.trackEnd} numberOfLines={1}>{away > 0 ? at : ''}</Text>
      <View style={styles.trackBar}>
        <View style={[styles.trackLine, { backgroundColor: color }]} />
        <View style={[styles.trackHere, { backgroundColor: color }]} />
        <View style={[styles.trackTrain, { backgroundColor: color, left: `${pct * 100}%` }]}>
          <Ionicons name="train" size={11} color="#FFFFFF" />
        </View>
      </View>
      <Text style={[styles.trackEnd, styles.trackHereText]} numberOfLines={1}>
        {here}
        {away > 0 ? <Text style={styles.trackAway}>{'  '}{label}</Text> : null}
      </Text>
    </View>
  );
}

/**
 * 전광판 선로 — 3전역 · 2전역 · 전역 · 이 역 이름과, 실시간이면 열차가 지금 어느 역에 있는지.
 * 4정거장 이상 멀면 열차는 왼쪽 바깥에 그 역 이름과 함께. 시간표 지역은 열차 없이 역 이름만.
 */
function NamedTrack({ before, away, color, at, here }: { before: string[]; away?: number; color: string; at: string; here: string }) {
  const names = [...before, here];
  const last = names.length - 1;
  // 열차 자리: 0 = 이 역, 1 = 전역 … (names 안의 칸 번호로)
  const slot = away === undefined ? null : away <= last ? last - away : -1;
  return (
    <View style={styles.nt}>
      {slot === -1 ? (
        <View style={styles.ntFar}>
          <View style={[styles.ntTrain, { backgroundColor: color }]}>
            <Ionicons name="train" size={11} color="#FFFFFF" />
          </View>
          <Text style={styles.ntLabel} numberOfLines={1}>{at}</Text>
        </View>
      ) : null}
      <View style={styles.ntRail}>
        <View style={[styles.ntLine, { backgroundColor: color }]} />
        {names.map((n, i) => (
          <View key={`${n}-${i}`} style={styles.ntSlot}>
            {slot === i ? (
              <View style={[styles.ntTrain, { backgroundColor: color }]}>
                <Ionicons name="train" size={11} color="#FFFFFF" />
              </View>
            ) : (
              <View style={[styles.ntDot, { borderColor: color }, i === last && { backgroundColor: color }]} />
            )}
            <Text style={[styles.ntLabel, i === last && styles.ntHere]} numberOfLines={1}>
              {n}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SubwaySection({ coords, inset = 0 }: { coords?: Coordinates; inset?: number }) {
  const { t } = useT();
  const [stations, setStations] = useState<SubwayStation[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  // 눌러서 펼친 방향 (역 이름 선로 · 열차 번호)
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

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
                  const first = b.trains[0];
                  const second = b.trains[1];
                  const key = `${s.name}|${b.key}`;
                  const isOpen = open.has(key);
                  const head = b.toward
                    ? /순환$/.test(b.toward)
                      ? `${b.toward}${b.dir ? ` · ${b.dir.replace(/방면$/, ' 방면')}` : ''}`
                      : t('subway.toward', { name: b.toward })
                    : b.dir || first?.to;
                  const sub = [
                    first && !sameEnd(first.to, b.toward) ? first.to : '',
                    first ? where(first, t) : '',
                    first?.express ? t('subway.express') : '',
                    first?.last ? t('subway.last') : '',
                  ].filter(Boolean);
                  const ap = first ? approach(b.line, s.name, first.at, b.toward) : null;
                  return (
                    <View key={b.key} style={styles.dir}>
                      <Pressable
                        onPress={() => toggle(key)}
                        style={({ pressed }) => [styles.dirRow, pressed && { opacity: 0.7 }]}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isOpen }}
                      >
                        <LinePill line={b.line} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.dirHead} numberOfLines={1}>{head}</Text>
                          {sub.length ? (
                            <Text style={styles.dirSub} numberOfLines={1}>
                              {sub.map((x, i) => (
                                <Text key={i} style={x === t('subway.express') ? styles.ledExpress : undefined}>
                                  {i ? ' · ' : ''}
                                  {x}
                                </Text>
                              ))}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.dirRight}>
                          <Text style={styles.ledMin} numberOfLines={1}>
                            {!first || first.min === null ? '' : first.min <= 0 ? t('bus.soon') : t('subway.minShort', { n: first.min })}
                          </Text>
                          {second && second.min !== null ? <Text style={styles.dirNext}>{t('bus.next', { n: second.min })}</Text> : null}
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
                      </Pressable>
                      {isOpen ? (
                        <View style={styles.dirMore}>
                          {ap && ap.before.length ? (
                            <NamedTrack before={ap.before} away={ap.away} color={lc?.bg ?? colors.primary} at={first?.at ?? ''} here={t('subway.here')} />
                          ) : first && stationsAway(first) !== null ? (
                            <Track
                              away={stationsAway(first)!}
                              color={lc?.bg ?? colors.primary}
                              at={first.at ?? ''}
                              here={t('subway.here')}
                              label={t('bus.prev', { n: stationsAway(first)! })}
                            />
                          ) : null}
                          {b.trains.map((x, i) => (
                            <Text key={i} style={styles.dirTrain} numberOfLines={1}>
                              <Text style={styles.dirTrainOrder}>{t(i === 0 ? 'subway.this' : 'subway.next')}  </Text>
                              {[x.to, where(x, t), x.no ? t('subway.trainNo', { no: x.no }) : '', x.express ? t('subway.express') : '', x.last ? t('subway.last') : '']
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          ))}
                        </View>
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
  boards: { gap: 2 },
  dir: { borderRadius: radius.sm, overflow: 'hidden' },
  dirRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  dirHead: { ...typography.captionBold, color: colors.text },
  dirSub: { ...typography.tiny, color: colors.textSub },
  dirRight: { alignItems: 'flex-end', flexShrink: 0 },
  dirNext: { ...typography.tiny, color: colors.textMuted },
  dirMore: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, gap: 6, marginBottom: 6 },
  dirTrain: { ...typography.tiny, color: colors.textSub },
  dirTrainOrder: { color: colors.primary, fontWeight: '700' },
  ledExpress: { color: '#D2404D', fontWeight: '800' },
  ledMin: { ...typography.bodyBold, color: colors.closed, fontVariant: ['tabular-nums'] },
  nt: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, gap: 4 },
  ntFar: { alignItems: 'center', width: 52 },
  ntRail: { flex: 1, flexDirection: 'row' },
  ntLine: { position: 'absolute', left: '12.5%', right: '12.5%', top: 9, height: 3, borderRadius: 2, opacity: 0.4 },
  ntSlot: { flex: 1, alignItems: 'center', gap: 3 },
  ntDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, backgroundColor: colors.surfaceAlt, marginTop: 3 },
  ntTrain: { width: 24, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  ntLabel: { fontSize: 11, lineHeight: 14, color: colors.textSub, maxWidth: '96%' },
  ntHere: { color: colors.text, fontWeight: '700' },
  track: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  trackEnd: { fontSize: 11, lineHeight: 15, color: colors.textMuted, maxWidth: 88 },
  trackHereText: { color: colors.text, fontWeight: '700' },
  trackAway: { color: colors.textMuted, fontWeight: '400' },
  trackBar: { flex: 1, height: 22, justifyContent: 'center' },
  trackLine: { height: 3, borderRadius: 2, opacity: 0.45 },
  trackHere: { position: 'absolute', right: -4, width: 10, height: 10, borderRadius: 5 },
  trackTrain: {
    position: 'absolute',
    marginLeft: -11,
    width: 22,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { ...typography.tiny, color: colors.textMuted, paddingLeft: 32 + spacing.md },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  source: { ...typography.tiny, color: colors.textMuted, flex: 1 },
  refresh: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
}));
