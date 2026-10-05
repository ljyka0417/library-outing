import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from './common';
import {
  fetchEventDetail,
  fetchNearbyEvents,
  isAtLibrary,
  isOngoing,
  type CultureEvent,
  type CultureEventDetail,
} from '@/api/culture';
import { useAsync } from '@/hooks/useAsync';
import { bleedRow, useLayout, MODAL_ORIENTATIONS } from '@/hooks/useLayout';
import { useT, type Lang, type MessageKey } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import { callPhone, openGoogleMap, openKakaoMap, openWeb } from '@/utils/mapLinks';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';
import type { Coordinates } from '@/types';

const KIND_ICON = { show: 'musical-notes', exhibit: 'image', other: 'sparkles' } as const;

/** 기기 시각 기준 오늘 (YYYY-MM-DD) */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "10.2" / 영어는 "10/2". 올해가 아니면 연도를 붙인다 */
function shortDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  const md = lang === 'en' ? `${m}/${d}` : `${m}.${d}`;
  return y === new Date().getFullYear() ? md : lang === 'en' ? `${md}/${y}` : `${y}.${md}`;
}

function dateLabel(e: CultureEvent, lang: Lang, ongoing: boolean): string {
  if (!e.start) return '';
  if (!e.end || e.end === e.start) return shortDate(e.start, lang);
  // 이미 열려 있는 행사는 언제까지인지가 궁금하다 (2015년부터 하는 공연도 있다)
  if (ongoing) return `~ ${shortDate(e.end, lang)}`;
  return `${shortDate(e.start, lang)} – ${shortDate(e.end, lang)}`;
}

/**
 * 도서관 화면의 "근처 공연·전시" — 한눈에보는문화정보에서 걸어서 갈 만한 거리(2km)의 행사.
 * 도서관 안에서 하는 행사는 거의 실리지 않아서(전국 천여 건 중 몇 건) 근처 행사로 보여 주고,
 * 장소 이름이 이 도서관이면 "이 도서관에서" 표시를 단다.
 * 행사가 없거나 못 불러오면 칸을 통째로 숨긴다.
 */
export function CultureEventsSection({ libraryName, coords }: { libraryName: string; coords: Coordinates }) {
  const { t, lang } = useT();
  const layout = useLayout();
  const [picked, setPicked] = useState<CultureEvent | null>(null);
  const { data: events } = useAsync(() => fetchNearbyEvents(coords), [coords.lat, coords.lng], {
    cacheKey: `culture:${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`,
  });

  const today = todayKey();
  // 캐시에서 꺼낸 목록에는 그새 끝난 행사가 있을 수 있다
  const list = (events ?? []).filter((e) => !e.end || e.end >= today);
  if (list.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('culture.title')} subtitle={t('culture.sub')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={bleedRow(layout).style}
        contentContainerStyle={[styles.list, bleedRow(layout).content]}
      >
        {list.map((e) => {
          const ongoing = isOngoing(e, today);
          const here = isAtLibrary(e, libraryName);
          return (
            <Pressable
              key={e.seq}
              onPress={() => setPicked(e)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`${e.title}, ${e.place ?? ''}`}
            >
              <View style={styles.poster}>
                {e.thumb ? (
                  <Image source={{ uri: e.thumb }} style={styles.posterImg} resizeMode="cover" />
                ) : (
                  <Ionicons name={KIND_ICON[e.kind]} size={30} color={colors.primary} />
                )}
                <View style={styles.badges}>
                  {here ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.badgeText}>{t('culture.atLibrary')}</Text>
                    </View>
                  ) : null}
                  {ongoing ? (
                    <View style={[styles.badge, { backgroundColor: colors.open }]}>
                      <Text style={styles.badgeText}>{t('culture.ongoing')}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.body}>
                <Text style={styles.kind}>{t(`culture.${e.kind}` as MessageKey)}</Text>
                <Text style={styles.title} numberOfLines={2}>{e.title}</Text>
                {e.place ? <Text style={styles.place} numberOfLines={1}>{e.place}</Text> : null}
                <Text style={styles.date}>{dateLabel(e, lang, ongoing)}</Text>
                {here ? null : (
                  <View style={styles.meta}>
                    <Ionicons name="walk-outline" size={12} color={colors.primary} />
                    <Text style={styles.metaText}>
                      {formatDistance(e.dist)} · {t('nearby.walk', { n: walkingMinutes(e.dist) })}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={[styles.source, { paddingHorizontal: layout.gutter }]}>{t('culture.source')}</Text>
      <EventSheet event={picked} libraryName={libraryName} onClose={() => setPicked(null)} />
    </View>
  );
}

function EventSheet({ event, libraryName, onClose }: { event: CultureEvent | null; libraryName: string; onClose: () => void }) {
  const { t, lang } = useT();
  const [state, setState] = useState<'loading' | 'done' | 'failed'>('loading');
  const [detail, setDetail] = useState<CultureEventDetail | null>(null);

  useEffect(() => {
    if (!event) return;
    let alive = true;
    setState('loading');
    setDetail(null);
    void fetchEventDetail(event.seq).then((d) => {
      if (!alive) return;
      setDetail(d);
      setState(d ? 'done' : 'failed');
    });
    return () => {
      alive = false;
    };
  }, [event?.seq]);

  if (!event) return null;
  const ongoing = isOngoing(event, todayKey());
  const here = isAtLibrary(event, libraryName);
  const openMap = () => {
    const target = { name: event.place ?? event.title, coords: { lat: event.lat, lng: event.lng }, address: detail?.placeAddr };
    // 한국어는 카카오맵, 다른 언어는 구글 지도 (외국인은 대개 구글을 쓴다)
    void (lang === 'ko' ? openKakaoMap(target) : openGoogleMap(target));
  };

  const row = (label: MessageKey, value?: string, onPress?: () => void) =>
    value ? (
      <Pressable key={label} onPress={onPress} disabled={!onPress} style={styles.row}>
        <Text style={styles.rowLabel}>{t(label)}</Text>
        <Text style={[styles.rowValue, onPress && { color: colors.primary }]}>{value}</Text>
      </Pressable>
    ) : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} supportedOrientations={MODAL_ORIENTATIONS}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.head}>
            {event.thumb ? <Image source={{ uri: event.thumb }} style={styles.sheetPoster} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>
                {t(`culture.${event.kind}` as MessageKey)}
                {event.realm && event.realm !== '전시' && lang === 'ko' ? ` · ${event.realm}` : ''}
              </Text>
              <Text style={styles.sheetTitle} numberOfLines={3}>{event.title}</Text>
              <Text style={styles.sheetSub}>
                {dateLabel(event, lang, ongoing)}
                {here ? ` · ${t('culture.atLibrary')}` : ` · ${formatDistance(event.dist)}`}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('visit.close')}>
              <Ionicons name="close" size={22} color={colors.textSub} />
            </Pressable>
          </View>

          {state === 'loading' ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <View style={styles.rows}>
              {row('culture.place', [event.place, detail?.placeAddr].filter(Boolean).join('\n'))}
              {row('culture.price', detail?.price)}
              {row('culture.phone', detail?.phone, detail?.phone ? () => void callPhone(detail.phone!) : undefined)}
              {state === 'failed' ? <Text style={styles.note}>{t('culture.detailError')}</Text> : null}
            </View>
          )}

          <View style={styles.actions}>
            {detail?.url || detail?.placeUrl ? (
              <Pressable
                onPress={() => void openWeb((detail.url ?? detail.placeUrl)!)}
                style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && { opacity: 0.8 }]}
                accessibilityRole="link"
              >
                <Ionicons name="open-outline" size={16} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>
                  {t(detail.url ? 'culture.more' : 'culture.placeSite')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={openMap} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]} accessibilityRole="button">
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={styles.actionText}>{t('culture.map')}</Text>
            </Pressable>
          </View>
          {lang !== 'ko' ? <Text style={styles.note}>{t('culture.koreanOnly')}</Text> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  // 위 책 줄(이름 밑 지은이)에 붙어 보이지 않게 위쪽을 띄운다 — 다른 칸들과 같은 간격
  section: {
    marginTop: spacing.xxl,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: 196,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterImg: {
    width: '100%',
    height: '100%',
  },
  badges: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    gap: 4,
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.tiny,
    fontWeight: '700',
    color: colors.white,
  },
  body: {
    padding: spacing.md,
    gap: 1,
  },
  kind: {
    ...typography.tiny,
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    ...typography.captionBold,
    color: colors.text,
  },
  place: {
    ...typography.tiny,
    color: colors.textSub,
  },
  date: {
    ...typography.tiny,
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  metaText: {
    ...typography.tiny,
    color: colors.primary,
  },
  source: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,26,22,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  head: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  sheetPoster: {
    width: 64,
    height: 88,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  kicker: {
    ...typography.captionBold,
    color: colors.primary,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: 2,
  },
  sheetSub: {
    ...typography.caption,
    color: colors.textSub,
  },
  rows: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textSub,
    width: 66,
    flexShrink: 0,
  },
  rowValue: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  note: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
}));
