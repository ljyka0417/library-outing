import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Mascot } from './Mascot';
import { CourseMap } from './CourseMap';
import { CategoryIcon } from './CategoryIcon';
import { hasNearby, nearbyApi } from '@/api/nearbyApi';
import { CATEGORY_MAP } from '@/data/categories';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { centered, useLayout } from '@/hooks/useLayout';
import { useT, type MessageKey } from '@/i18n';
import { libText } from '@/i18n/libraryText';
import { useAppStore, type CourseStop, type SavedCourse } from '@/store/useAppStore';
import { distanceMeters } from '@/utils/geo';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';
import { openKakaoMap } from '@/utils/mapLinks';
import { categoryColors, colors, radius, spacing, typography, themedStyles } from '@/theme';
import type { Coordinates, Library, NearbyPlace } from '@/types';

/**
 * 오늘의 나들이 — 달곰이와 코스 짜기.  도서관 → 맛집(식당·카페) → 볼거리 → 코스 확인(지도·저장·공유)
 *
 * 코스 탭(app/(tabs)/course.tsx)은 도서관 고르기부터, 달곰이 연결(app/course/[id].tsx)은 맛집부터 시작한다.
 * 장소는 도서관 화면 "주변 둘러보기" 와 같은 자료(카카오 장소 + 한국관광공사 사진, 빌드 때 모아 둔 것).
 * 볼거리는 **고른 맛집에서** 가까운 순 — 좌표로 직선거리를 재고 걸어서 몇 분으로 바꾼다.
 * 운영시간은 자료에 없어서 정하지 않는다(코스 확인에서 "가기 전에 확인" 을 적는다).
 */
type Step = 'library' | 'food' | 'see' | 'done';
type FoodKind = 'restaurant' | 'cafe';
type SeeKind = 'all' | 'exhibit' | 'show' | 'etc';

const SEE_TABS: { k: SeeKind; key: MessageKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { k: 'all', key: 'course.all', icon: 'apps' },
  { k: 'exhibit', key: 'course.exhibit', icon: 'image-outline' },
  { k: 'show', key: 'course.show', icon: 'musical-notes-outline' },
  { k: 'etc', key: 'course.etc', icon: 'business-outline' },
];
/** 카카오 분류 이름으로 볼거리 갈래 */
function seeKind(p: { subCategory?: string; name: string }): SeeKind {
  const c = `${p.subCategory ?? ''} ${p.name}`;
  if (/전시|미술|갤러리|박물관|기념관|아트/.test(c)) return 'exhibit';
  if (/공연|극장|아트홀|콘서트|영화/.test(c)) return 'show';
  return 'etc';
}

/** 사진 있는 곳(한국관광공사)을 앞에 — 다만 걸어서 15분(1.2km)이 넘으면 가까운 곳 뒤로. 그 안에서는 가까운 순 */
const WALKABLE = 1200;
function photoFirst(a: { p: NearbyPlace; d: number }, b: { p: NearbyPlace; d: number }) {
  const pa = a.p.imageUrl && a.d <= WALKABLE ? 0 : 1;
  const pb = b.p.imageUrl && b.d <= WALKABLE ? 0 : 1;
  return pa - pb || a.d - b.d;
}

// 코스를 짤 수 있는 도서관 — 좌표가 있고 근처에 먹을 곳이나 볼 곳이 있는 곳
const COURSE_LIBS = MOCK_LIBRARIES.filter(
  (l) => l.coords && (hasNearby(l.id, 'restaurant') || hasNearby(l.id, 'cafe') || hasNearby(l.id, 'culture'))
);
const toStop = (p: NearbyPlace): CourseStop => ({ name: p.name, coords: p.coords, type: p.type as CourseStop['type'], subCategory: p.subCategory });
const fromStop = (s: CourseStop, id: string): NearbyPlace => ({ id, libraryId: '', type: s.type, name: s.name, subCategory: s.subCategory ?? '', address: '', coords: s.coords, distanceMeters: 0 });

export function CourseFlow({
  initialLibraryId,
  initialSavedId,
  insetTop = 0,
  insetBottom = 0,
}: {
  initialLibraryId?: string;
  /** 내 기록에서 저장한 코스를 열 때 */
  initialSavedId?: string;
  /** 화면 끝까지 깔 때(코스 탭) 위·아래 비울 만큼 */
  insetTop?: number;
  insetBottom?: number;
}) {
  const router = useRouter();
  const layout = useLayout();
  const { t, lang } = useT();
  const courses = useAppStore((s) => s.courses);
  const saveCourse = useAppStore((s) => s.saveCourse);
  const removeCourse = useAppStore((s) => s.removeCourse);
  const favorites = useAppStore((s) => s.favorites);
  const recent = useAppStore((s) => s.recentLibraryIds);

  const [library, setLibrary] = useState<Library | undefined>(() => COURSE_LIBS.find((l) => l.id === initialLibraryId));
  const [step, setStep] = useState<Step>(library ? 'food' : 'library');
  const [foodKind, setFoodKind] = useState<FoodKind>('restaurant');
  const [seeTab, setSeeTab] = useState<SeeKind>('all');
  const [lists, setLists] = useState<Record<'restaurant' | 'cafe' | 'culture', NearbyPlace[]>>({ restaurant: [], cafe: [], culture: [] });
  const [food, setFood] = useState<NearbyPlace | null>(null);
  const [see, setSee] = useState<NearbyPlace | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [me, setMe] = useState<Coordinates | null>(null);

  // 도서관 고르기 — 위치를 이미 허락했으면 가까운 순 (묻지는 않는다)
  useEffect(() => {
    if (step !== 'library') return;
    let alive = true;
    void Location.getForegroundPermissionsAsync()
      .then((p) => (p.granted ? Location.getLastKnownPositionAsync() : null))
      .then((pos) => alive && pos && setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [step]);

  useEffect(() => {
    if (!library?.coords) return;
    let alive = true;
    void Promise.all(
      (['restaurant', 'cafe', 'culture'] as const).map((k) => nearbyApi.list(library.id, library.coords!, k).catch(() => []))
    ).then(([restaurant, cafe, culture]) => alive && setLists({ restaurant, cafe, culture }));
    return () => {
      alive = false;
    };
  }, [library?.id]);

  const libChoices = useMemo(() => {
    const q = query.replace(/\s+/g, '').toLowerCase();
    if (q) {
      return COURSE_LIBS.filter((l) =>
        [l.name, libText(l.name, lang), l.region.sido, l.region.sigungu ?? ''].some((v) => v.replace(/\s+/g, '').toLowerCase().includes(q))
      ).slice(0, 10);
    }
    const mine = [...favorites, ...recent].filter((id, i, a) => a.indexOf(id) === i);
    const pinned = mine.map((id) => COURSE_LIBS.find((l) => l.id === id)).filter((l): l is Library => !!l);
    const rest = COURSE_LIBS.filter((l) => !mine.includes(l.id)).sort((a, b) =>
      me ? distanceMeters(me, a.coords!) - distanceMeters(me, b.coords!) : a.name.localeCompare(b.name, 'ko')
    );
    return [...pinned, ...rest].slice(0, 10);
  }, [query, lang, favorites, recent, me?.lat, me?.lng]);

  // 볼거리 — 고른 맛집(안 골랐으면 도서관)에서 가까운 순
  const from: Coordinates | undefined = food?.coords ?? library?.coords;
  const seeList = useMemo(() => {
    if (!from) return [];
    return lists.culture
      .map((p) => ({ p, d: distanceMeters(from, p.coords) }))
      .filter((x) => seeTab === 'all' || seeKind(x.p) === seeTab)
      .sort(photoFirst);
  }, [lists.culture, from?.lat, from?.lng, seeTab]);
  const foodList = library?.coords
    ? lists[foodKind].map((p) => ({ p, d: distanceMeters(library.coords!, p.coords) })).sort(photoFirst)
    : [];

  const libName = library ? libText(library.name, lang) : '';
  const stops = library?.coords
    ? [
        { name: libName, kind: 'library' as const, coords: library.coords },
        ...(food ? [{ name: food.name, kind: 'food' as const, coords: food.coords }] : []),
        ...(see ? [{ name: see.name, kind: 'see' as const, coords: see.coords }] : []),
      ]
    : [];
  const legs = stops.slice(1).map((s, i) => distanceMeters(stops[i].coords, s.coords));
  const totalWalk = legs.reduce((a, d) => a + walkingMinutes(d), 0);

  const reset = () => {
    setFood(null);
    setSee(null);
    setSavedId(null);
  };
  const pickLibrary = (l: Library) => {
    if (l.id !== library?.id) setLists({ restaurant: [], cafe: [], culture: [] });
    setLibrary(l);
    reset();
    setStep('food');
  };
  const openSaved = (c: SavedCourse) => {
    const l = COURSE_LIBS.find((x) => x.id === c.libraryId) ?? MOCK_LIBRARIES.find((x) => x.id === c.libraryId);
    if (!l?.coords) return;
    setLibrary(l);
    setFood(c.food ? fromStop(c.food, `saved-food-${c.id}`) : null);
    setSee(c.see ? fromStop(c.see, `saved-see-${c.id}`) : null);
    setSavedId(c.id);
    setStep('done');
  };
  const save = () => {
    if (!library) return;
    if (savedId) {
      removeCourse(savedId);
      setSavedId(null);
      return;
    }
    setSavedId(saveCourse({ libraryId: library.id, food: food ? toStop(food) : undefined, see: see ? toStop(see) : undefined }));
  };
  const share = () => {
    const lines = stops.map((s, i) => `${i + 1}. ${s.name}${i > 0 ? ` (${t('nearby.walk', { n: walkingMinutes(legs[i - 1]) })})` : ''}`);
    void Share.share({ message: `${t('course.shareTitle')}\n${lines.join('\n')}\n— ${t('course.shareFrom')}` });
  };

  // 내 기록에서 저장한 코스를 눌러 들어왔으면 그 코스 확인 화면부터
  useEffect(() => {
    const c = initialSavedId ? courses.find((x) => x.id === initialSavedId) : undefined;
    if (c) openSaved(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSavedId]);

  const stepIndex = step === 'library' ? 0 : step === 'food' ? 1 : step === 'see' ? 2 : 3;

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={[styles.content, { paddingTop: insetTop + spacing.md, paddingBottom: insetBottom + spacing.xxxl }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[centered(layout, true), { paddingHorizontal: layout.gutter, gap: spacing.lg }]}>
        {/* 단계 — 도서관 · 맛집 · 볼거리 (지난 단계는 눌러서 돌아간다) */}
        <View style={styles.steps}>
          {(['course.stepLibrary', 'course.stepFood', 'course.stepSee'] as MessageKey[]).map((k, i) => {
            const done = i < stepIndex;
            const now = i === stepIndex;
            const target: Step = i === 0 ? 'library' : i === 1 ? 'food' : 'see';
            return (
              <React.Fragment key={k}>
                {i > 0 ? <View style={[styles.stepLine, i <= stepIndex && styles.stepLineOn]} /> : null}
                <Pressable style={styles.stepItem} disabled={!done} onPress={() => setStep(target)} accessibilityRole="button">
                  <View style={[styles.stepDot, (done || now) && styles.stepDotOn]}>
                    {done ? <Ionicons name="checkmark" size={14} color={colors.white} /> : <Text style={[styles.stepNum, now && { color: colors.white }]}>{i + 1}</Text>}
                  </View>
                  <Text style={[styles.stepLabel, now && styles.stepLabelOn]}>{t(k)}</Text>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {step === 'library' ? (
          <>
            {/* 저장한 코스 */}
            {courses.length ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.sectionTitle}>{t('course.saved')}</Text>
                {courses.slice(0, 5).map((c) => {
                  const l = MOCK_LIBRARIES.find((x) => x.id === c.libraryId);
                  if (!l) return null;
                  return (
                    <Pressable key={c.id} onPress={() => openSaved(c)} style={({ pressed }) => [styles.savedRow, pressed && { opacity: 0.85 }]}>
                      <Ionicons name="bookmark" size={16} color={colors.primary} />
                      <Text style={styles.savedText} numberOfLines={1}>
                        {[libText(l.name, lang), c.food?.name, c.see?.name].filter(Boolean).join(' → ')}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.hello}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.helloTitle}>{t('course.libTitle')}</Text>
                <Text style={styles.helloSub}>{t(me ? 'course.libSubNear' : 'course.libSub')}</Text>
              </View>
              <Mascot pose="map" size={86} />
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('course.libSearch')}
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <View style={{ gap: spacing.sm }}>
              {libChoices.map((l) => {
                const cat = CATEGORY_MAP[l.categories[0]] ?? { icon: 'library' };
                const palette = categoryColors[l.categories[0]] ?? { bg: colors.surfaceAlt, fg: colors.textSub };
                const d = me ? distanceMeters(me, l.coords!) : null;
                const mine = favorites.includes(l.id);
                return (
                  <Pressable key={l.id} onPress={() => pickLibrary(l)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
                    <View style={[styles.libIcon, { backgroundColor: palette.bg }]}>
                      <CategoryIcon category={cat} size={26} color={palette.fg} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={styles.rowName} numberOfLines={1}>{libText(l.name, lang)}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {[libText(l.region.sigungu ?? l.region.sido, lang), d !== null ? formatDistance(d) : '', mine ? t('course.favorite') : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                );
              })}
              {!libChoices.length ? <Text style={styles.note}>{t('course.noLib')}</Text> : null}
            </View>
          </>
        ) : (
          <>
            {/* 지금까지 고른 것 */}
            <View style={styles.picked}>
              <Ionicons name="library-outline" size={16} color={colors.primary} />
              <Text style={styles.pickedText} numberOfLines={1}>{libName}</Text>
              {food ? (
                <>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                  <Ionicons name={food.type === 'cafe' ? 'cafe-outline' : 'restaurant-outline'} size={16} color={colors.primary} />
                  <Text style={styles.pickedText} numberOfLines={1}>{food.name}</Text>
                </>
              ) : null}
              {see && step === 'done' ? (
                <>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                  <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
                  <Text style={styles.pickedText} numberOfLines={1}>{see.name}</Text>
                </>
              ) : null}
            </View>

            {step !== 'done' ? (
              <>
                <View style={styles.hello}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.helloTitle}>{t(step === 'food' ? 'course.foodTitle' : 'course.seeTitle')}</Text>
                    <Text style={styles.helloSub}>
                      {t(step === 'food' ? 'course.foodSub' : 'course.seeSub', { name: step === 'food' ? libName : food?.name ?? libName })}
                    </Text>
                  </View>
                  <Mascot pose="map" size={86} />
                </View>

                <View style={styles.chips}>
                  {step === 'food'
                    ? (['restaurant', 'cafe'] as FoodKind[]).map((k) => (
                        <Chip
                          key={k}
                          on={foodKind === k}
                          icon={k === 'cafe' ? 'cafe-outline' : 'restaurant-outline'}
                          label={t(k === 'cafe' ? 'nearby.cafe' : 'nearby.restaurant')}
                          onPress={() => setFoodKind(k)}
                        />
                      ))
                    : SEE_TABS.map((x) => <Chip key={x.k} on={seeTab === x.k} icon={x.icon} label={t(x.key)} onPress={() => setSeeTab(x.k)} />)}
                </View>

                <View style={{ gap: spacing.sm }}>
                  {(step === 'food' ? foodList : seeList).slice(0, 8).map(({ p, d }) => {
                    const on = (step === 'food' ? food : see)?.id === p.id;
                    return (
                      <PlaceRow
                        key={p.id}
                        place={p}
                        on={on}
                        lang={lang}
                        dist={t(step === 'food' ? 'course.fromLibrary' : 'course.fromFood', { d: formatDistance(d), n: walkingMinutes(d) })}
                        onPress={() => (step === 'food' ? setFood(on ? null : p) : setSee(on ? null : p))}
                      />
                    );
                  })}
                  {(step === 'food' ? foodList : seeList).length === 0 ? <Text style={styles.note}>{t('course.noPlaces')}</Text> : null}
                </View>

                <Pressable onPress={() => setStep(step === 'food' ? 'see' : 'done')} style={styles.skip}>
                  <Text style={styles.skipText}>{t(step === 'food' ? 'course.skipFood' : 'course.skipSee')}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  disabled={step === 'food' ? !food : !see}
                  onPress={() => setStep(step === 'food' ? 'see' : 'done')}
                  style={({ pressed }) => [styles.cta, (step === 'food' ? !food : !see) && styles.ctaOff, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.ctaText}>{t(step === 'food' ? 'course.next' : 'course.finish')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.hello}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.helloTitle}>{t('course.doneTitle')}</Text>
                    <Text style={styles.helloSub}>{t('course.doneSub', { n: totalWalk })}</Text>
                  </View>
                  <Mascot pose="faceHappy" size={86} />
                </View>
                {stops.length ? <CourseMap stops={stops} /> : null}
                <View style={styles.timeline}>
                  {stops.map((s, i) => (
                    <View key={`${s.kind}-${i}`}>
                      {i > 0 ? (
                        <View style={styles.leg}>
                          <View style={styles.legLine} />
                          <Ionicons name="walk" size={14} color={colors.primary} />
                          <Text style={styles.legText}>{t('course.leg', { d: formatDistance(legs[i - 1]), n: walkingMinutes(legs[i - 1]) })}</Text>
                        </View>
                      ) : null}
                      <View style={styles.stop}>
                        <View style={styles.stopNum}>
                          <Text style={styles.stopNumText}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.stopName} numberOfLines={1}>{s.name}</Text>
                          <Text style={styles.stopKind}>{t(s.kind === 'library' ? 'course.stepLibrary' : s.kind === 'food' ? 'course.stepFood' : 'course.stepSee')}</Text>
                        </View>
                        <Pressable onPress={() => void openKakaoMap({ name: s.name, coords: s.coords })} hitSlop={8} style={styles.mapBtn} accessibilityRole="button">
                          <Ionicons name="map-outline" size={16} color={colors.primary} />
                          <Text style={styles.mapBtnText}>{t('course.map')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
                <Text style={styles.note}>{t('course.hoursNote')}</Text>
                <View style={styles.doneBtns}>
                  <Pressable onPress={save} style={({ pressed }) => [styles.ghost, savedId && styles.ghostOn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                    <Ionicons name={savedId ? 'bookmark' : 'bookmark-outline'} size={18} color={savedId ? colors.white : colors.primary} />
                    <Text style={[styles.ghostText, savedId && { color: colors.white }]}>{t(savedId ? 'course.savedDone' : 'course.save')}</Text>
                  </Pressable>
                  <Pressable onPress={share} style={({ pressed }) => [styles.cta, { flex: 1 }, pressed && { opacity: 0.9 }]}>
                    <Text style={styles.ctaText}>{t('course.share')}</Text>
                  </Pressable>
                </View>
                <View style={styles.doneRow}>
                  <Pressable
                    onPress={() => {
                      reset();
                      setStep('food');
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.link}>{t('course.again')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      reset();
                      setStep('library');
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.link}>{t('course.otherLibrary')}</Text>
                  </Pressable>
                  {library ? (
                    <Pressable onPress={() => router.push(`/library/${library.id}`)} hitSlop={8}>
                      <Text style={styles.link}>{t('course.openLibrary')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Chip({ on, icon, label, onPress }: { on: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Ionicons name={icon} size={15} color={on ? colors.white : colors.textSub} />
      <Text style={[styles.chipText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function PlaceRow({ place, on, dist, lang, onPress }: { place: NearbyPlace; on: boolean; dist: string; lang: Parameters<typeof libText>[1]; onPress: () => void }) {
  const icon: keyof typeof Ionicons.glyphMap = place.type === 'cafe' ? 'cafe' : place.type === 'culture' ? 'color-palette' : 'restaurant';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.85 }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      {place.imageUrl ? (
        <View style={styles.photoWrap}>
          <Image source={{ uri: place.imageUrl }} style={styles.photo} resizeMode="cover" />
          {place.credit ? <Text style={styles.credit} numberOfLines={1}>{libText(place.credit, lang)}</Text> : null}
        </View>
      ) : (
        <View style={[styles.photoWrap, styles.photoNone]}>
          <Ionicons name={icon} size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={styles.rowName} numberOfLines={1}>{place.name}</Text>
        {place.subCategory ? <Text style={styles.rowSub} numberOfLines={1}>{place.subCategory}</Text> : null}
        <Text style={styles.rowDist} numberOfLines={1}>{dist}</Text>
      </View>
      <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {},
  steps: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingTop: spacing.sm },
  stepItem: { alignItems: 'center', gap: 4, width: 64 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepDotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepNum: { ...typography.captionBold, color: colors.textMuted },
  stepLabel: { ...typography.tiny, color: colors.textMuted },
  stepLabelOn: { color: colors.primary, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 13, maxWidth: 80 },
  stepLineOn: { backgroundColor: colors.primary },
  sectionTitle: { ...typography.bodyBold, color: colors.text },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  savedText: { ...typography.captionBold, color: colors.text, flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, height: 46 },
  // iOS 는 lineHeight 가 있으면 글자가 잘린다 — 정해 두지 않는다
  searchInput: { flex: 1, ...typography.body, lineHeight: undefined, color: colors.text, paddingVertical: 0 },
  libIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  picked: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pickedText: { ...typography.captionBold, color: colors.text, flexShrink: 1 },
  hello: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  helloTitle: { ...typography.h2, color: colors.text },
  helloSub: { ...typography.caption, color: colors.textSub },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.captionBold, color: colors.textSub },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rowOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.surfaceAlt },
  photoWrap: { width: 88, height: 72, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  photoNone: { alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  credit: { position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 9, lineHeight: 12, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 4 },
  rowName: { ...typography.bodyBold, color: colors.text },
  rowSub: { ...typography.tiny, color: colors.textSub },
  rowDist: { ...typography.tiny, color: colors.textMuted },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  skip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: spacing.sm },
  skipText: { ...typography.caption, color: colors.textMuted },
  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.bodyBold, color: colors.white },
  doneBtns: { flexDirection: 'row', gap: spacing.sm },
  ghost: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary },
  ghostOn: { backgroundColor: colors.primary },
  ghostText: { ...typography.bodyBold, color: colors.primary },
  timeline: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  stop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stopNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stopNumText: { ...typography.captionBold, color: colors.white },
  stopName: { ...typography.bodyBold, color: colors.text },
  stopKind: { ...typography.tiny, color: colors.textMuted },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  mapBtnText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 7, paddingVertical: 10 },
  legLine: { width: 2, height: 22, backgroundColor: colors.border, marginRight: 12 },
  legText: { ...typography.tiny, color: colors.textSub },
  note: { ...typography.tiny, color: colors.textMuted, textAlign: 'center' },
  doneRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', columnGap: spacing.xl, rowGap: spacing.sm },
  link: { ...typography.captionBold, color: colors.primary },
}));
