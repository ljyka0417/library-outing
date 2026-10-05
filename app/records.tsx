import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { libText } from '@/i18n/libraryText';
import { LibraryCard } from '@/components/LibraryCard';
import { Mascot } from '@/components/Mascot';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { useAppStore } from '@/store/useAppStore';
import { centered, useLayout } from '@/hooks/useLayout';
import { useT, type Lang } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import type { Library } from '@/types';
import { useFavoriteToggle } from '@/components/FavoritePopup';

/**
 * 내 기록 — 설정 탭의 숫자 세 칸(즐겨찾기 · 방문 기록 · 최근 본 곳)을 누르면 열린다.
 * 누른 칸이 처음 보이는 목록이고, 위쪽 단추로 오간다. 기록은 이 기기에만 있다.
 *
 *   즐겨찾기   하트를 누른 도서관 (여기서 하트를 다시 누르면 빠진다)
 *   방문 기록  "여기 다녀왔어요" 를 누른 날짜별로. 같은 날 같은 곳을 여러 번 눌렀으면 한 번만 보이고 횟수를 적는다
 *   최근 본 곳 도서관 화면을 연 차례 (최근 것부터)
 */
type Tab = 'favorites' | 'visits' | 'recent' | 'courses';
const TABS: Tab[] = ['favorites', 'visits', 'recent', 'courses'];
const TAB_LABEL = { favorites: 'my.statFavorites', visits: 'my.statVisits', recent: 'my.statRecent', courses: 'rec.courses' } as const;
const LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };

const libById = new Map(MOCK_LIBRARIES.map((l) => [l.id, l]));
const libsOf = (ids: string[]) => ids.map((id) => libById.get(id)).filter((l): l is Library => !!l);

/** 기기 시각 기준 날짜 열쇠 (YYYY-MM-DD) */
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "2026년 10월 4일 (일)" · "Oct 4, 2026 (Sun)" · "2026年10月4日 (日)" · "2026年10月4日 (周日)" */
function dayLabel(d: Date, lang: Lang) {
  const date = d.toLocaleDateString(LOCALE[lang], { year: 'numeric', month: lang === 'en' ? 'short' : 'long', day: 'numeric' });
  const weekday = d.toLocaleDateString(LOCALE[lang], { weekday: 'short' });
  return `${date} (${weekday.replace(/요일$/, '')})`;
}

export default function RecordsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'visits');
  const router = useRouter();
  const layout = useLayout();
  const { t, lang } = useT();
  const favorites = useAppStore((s) => s.favorites);
  const visits = useAppStore((s) => s.visits);
  const recentIds = useAppStore((s) => s.recentLibraryIds);
  const courses = useAppStore((s) => s.courses);
  const removeCourse = useAppStore((s) => s.removeCourse);
  // 담으면 "즐겨찾기에 담았어요" 창이 뜬다 (FavoritePopup)
  const toggleFavorite = useFavoriteToggle();

  // 방문 기록을 날짜별로 (최근 날짜부터). 같은 날 같은 곳은 한 줄로 모으고 횟수를 센다
  const visitDays = useMemo(() => {
    const days = new Map<string, { date: Date; items: Map<string, number> }>();
    for (const v of visits) {
      const key = dayKey(v.visitedAt);
      const day = days.get(key) ?? { date: new Date(v.visitedAt), items: new Map<string, number>() };
      day.items.set(v.libraryId, (day.items.get(v.libraryId) ?? 0) + 1);
      days.set(key, day);
    }
    return [...days.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [visits]);
  const visitedPlaces = new Set(visits.map((v) => v.libraryId)).size;

  const open = (id: string) => router.push(`/library/${id}`);
  const card = (lib: Library, key: string) => (
    <LibraryCard
      key={key}
      library={lib}
      onPress={() => open(lib.id)}
      isFavorite={favorites.includes(lib.id)}
      onToggleFavorite={() => toggleFavorite(lib.id)}
    />
  );
  const empty = (key: 'rec.emptyFavorites' | 'rec.emptyVisits' | 'rec.emptyRecent' | 'rec.emptyCourses') => (
    <View style={styles.empty}>
      <Mascot size={96} pose="faceHappy" />
      <Text style={styles.emptyText}>{t(key)}</Text>
    </View>
  );

  const count = { favorites: favorites.length, visits: visits.length, recent: recentIds.length, courses: courses.length };

  return (
    <>
      <Stack.Screen options={{ title: t('rec.title') }} />
      <ScrollView style={styles.safe} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, centered(layout, true), { paddingHorizontal: layout.gutter }]}>
          {/* 세 목록 사이를 오가는 단추 */}
          <View style={styles.segment}>
            {TABS.map((k) => {
              const on = k === tab;
              return (
                <Pressable
                  key={k}
                  onPress={() => setTab(k)}
                  style={[styles.segItem, on && styles.segOn]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>
                    {t(TAB_LABEL[k])} {count[k]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'favorites' ? (
            favorites.length ? libsOf(favorites).map((l) => card(l, l.id)) : empty('rec.emptyFavorites')
          ) : null}

          {tab === 'visits' ? (
            visits.length ? (
              <>
                <Text style={styles.summary}>{t('rec.visitSummary', { times: visits.length, places: visitedPlaces })}</Text>
                {visitDays.map(([key, day]) => (
                  <View key={key} style={styles.day}>
                    <Text style={styles.dayTitle}>
                      {dayLabel(day.date, lang)}
                    </Text>
                    {[...day.items.entries()].map(([id, times]) => {
                      const lib = libById.get(id);
                      if (!lib) return null;
                      return (
                        <View key={id} style={{ gap: spacing.xs }}>
                          {times > 1 ? <Text style={styles.times}>{t('rec.timesThatDay', { n: times })}</Text> : null}
                          {card(lib, `${key}-${id}`)}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </>
            ) : (
              empty('rec.emptyVisits')
            )
          ) : null}

          {tab === 'recent' ? (
            recentIds.length ? libsOf(recentIds).map((l) => card(l, l.id)) : empty('rec.emptyRecent')
          ) : null}

          {/* 오늘의 나들이에서 저장한 코스 — 누르면 코스 확인 화면으로 */}
          {tab === 'courses' ? (
            courses.length ? (
              courses.map((c) => {
                const lib = libById.get(c.libraryId);
                if (!lib) return null;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => router.push(`/course/${c.libraryId}?saved=${c.id}`)}
                    style={({ pressed }) => [styles.course, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="map" size={20} color={colors.primary} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={styles.courseTitle} numberOfLines={1}>
                        {[libText(lib.name, lang), c.food?.name, c.see?.name].filter(Boolean).join(' → ')}
                      </Text>
                      <Text style={styles.courseDate}>{dayLabel(new Date(c.savedAt), lang)}</Text>
                    </View>
                    <Pressable onPress={() => removeCourse(c.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel="delete">
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  </Pressable>
                );
              })
            ) : (
              empty('rec.emptyCourses')
            )
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = themedStyles(() => ({
  course: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  courseTitle: { ...typography.bodyBold, color: colors.text },
  courseDate: { ...typography.tiny, color: colors.textMuted },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingVertical: spacing.lg, paddingBottom: spacing.xxxl },
  inner: { gap: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.sm,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  segOn: { backgroundColor: colors.surface },
  segText: { ...typography.caption, color: colors.textSub },
  segTextOn: { color: colors.primary, fontWeight: '700' },
  summary: { ...typography.caption, color: colors.textSub },
  day: { gap: spacing.sm, marginTop: spacing.sm },
  dayTitle: { ...typography.bodyBold, color: colors.text },
  times: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyText: { ...typography.body, color: colors.textSub, textAlign: 'center' },
}));
