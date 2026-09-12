import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookCard } from '@/components/BookCard';
import { LibraryImage } from '@/components/LibraryImage';
import { MapButtons } from '@/components/MapButtons';
import { NearbySection } from '@/components/NearbySection';
import { Badge, EmptyState, InfoRow, SectionHeader } from '@/components/common';
import { libraryApi } from '@/api/libraryApi';
import { CATEGORY_MAP } from '@/data/categories';
import { loanDataVersion } from '@/data/books.mock';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { centered, useLayout } from '@/hooks/useLayout';
import { regionName, translate, useT, type Lang, type MessageKey } from '@/i18n';
import { readableName } from '@/utils/romanize';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { callPhone, openWeb } from '@/utils/mapLinks';
import { isOpenNow, todayHoursLabel } from '@/utils/openingHours';
import { useNow } from '@/hooks/useNow';
import type { Book, Library } from '@/types';

/** 시/군/구는 확인된 곳만 있으므로 있을 때만 붙인다. 옮기는 기준은 LibraryCard 와 같다. */
function regionLabel(library: Library, lang: Lang) {
  return [regionName(lang, library.region.sido), library.region.sigungu]
    .filter(Boolean)
    .join(' ');
}

/**
 * 도서 섹션 제목.
 *
 * 정보나루에 등록되지 않은 도서관(국립·국회·대학·작은도서관)은 자기 대출
 * 데이터가 없어서 시·도 순위를 대신 보여준다. 그럴 땐 지역 이름을 제목에
 * 넣어, 이게 이 도서관의 순위가 아니라는 걸 읽는 사람이 바로 알게 한다.
 */
function booksHeading(first: Book, library: Library, lang: Lang) {
  const tr = (key: MessageKey, vars?: Record<string, string>) => translate(lang, key, vars);

  if (!first.rank) return { title: tr('lib.booksTopic') };
  if (first.rankScope === 'region') {
    // 지역 이름은 옮기지 않는다. 주소에 적힌 원문이다.
    const where = first.rankRegion ?? library.region.sido;
    return {
      title: tr('lib.booksRegion', { where }),
      subtitle: tr('lib.booksRegionSub'),
    };
  }
  return { title: tr('lib.booksLibrary'), subtitle: tr('lib.booksLibrarySub') };
}

/**
 * 도서관 상세 화면.
 *
 * 이 화면이 QR 딥링크의 착지점이다: libraryapp://library/{id}
 * expo-router 의 파일 기반 라우팅 덕분에 별도 링킹 설정 없이
 * app.json 의 scheme 만으로 곧바로 연결된다.
 */
export default function LibraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const layout = useLayout();
  const { t, lang } = useT();
  // 분이 바뀌면 다시 그려져서 운영중/운영종료가 저절로 넘어간다
  const now = useNow();

  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const pushRecent = useAppStore((s) => s.pushRecent);
  const addVisit = useAppStore((s) => s.addVisit);

  const { data: library, loading, error } = useAsync(
    () => libraryApi.detail(id),
    [id],
    { cacheKey: `library-${id}`, enabled: !!id }
  );

  // 캐시 키에 수집 시각을 섞는다. 데이터를 새로 모으면 기기에 남은 옛 목록이
  // 조회되지 않고 곧바로 새 목록이 뜬다.
  const { data: books } = useAsync(
    () => libraryApi.recommendedBooks(id),
    [id],
    { cacheKey: `books-${id}-${loanDataVersion}`, enabled: !!id }
  );

  // 상세를 실제로 본 시점에만 "최근 본 도서관"에 기록한다.
  useEffect(() => {
    if (library?.id) pushRecent(library.id);
  }, [library?.id, pushRecent]);

  if (loading && !library) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !library) {
    return (
      <View style={styles.center}>
        <EmptyState
          pose="faceWink"
          title={t('lib.notFoundTitle')}
          description={t('lib.notFoundBody')}
        />
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.homeButton}>
          <Text style={styles.homeButtonText}>{t('lib.goHome')}</Text>
        </Pressable>
      </View>
    );
  }

  const open = isOpenNow(library.hours, now);
  const isFav = favorites.includes(library.id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 태블릿에서는 상세 전체를 가운데로 모은다. QR 로 바로 들어오는
            화면이라 여기가 제일 자주 보인다. */}
        <View style={centered(layout)}>
        {/* 대표 이미지. 실사진이 없으면 주제 색 플레이스홀더가 나온다. */}
        <LibraryImage library={library} variant="hero" />

        <View style={styles.card}>
          <View style={styles.badgeRow}>
            {library.isLandmark ? <Badge label={t('lib.landmark')} tone="brown" /> : null}
            {library.categories.map((c) =>
              // 부제(LP·IT 같은 예시어)는 붙이지 않는다. 그 분류의 한 예일 뿐이라
              // 이 도서관 이야기인 것처럼 읽힌다. 특화는 아래 "특화" 줄에 있다.
              CATEGORY_MAP[c] ? (
                <Badge key={c} label={t(`cat.${c}`)} category={c} />
              ) : null
            )}
          </View>

          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{library.name}</Text>
              {/* 읽는 법. 한국어일 때는 빈 문자열이라 줄이 생기지 않는다.
                  이름을 갈아 치우지 않는 이유는 romanize.ts 에 적어 두었다. */}
              {readableName(library.name, lang) ? (
                <Text style={styles.reading}>{readableName(library.name, lang)}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => toggleFavorite(library.id)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={isFav ? t('lib.favRemove') : t('lib.favAdd')}
            >
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={26}
                color={isFav ? colors.heart : colors.textMuted}
              />
            </Pressable>
          </View>

          {open !== null ? (
            <View style={styles.openRow}>
              <View style={[styles.dot, { backgroundColor: open ? colors.open : colors.closed }]} />
              <Text style={[styles.openText, { color: open ? colors.open : colors.closed }]}>
                {open ? t('badge.open') : t('badge.closed')}
              </Text>
              <Text style={styles.openSub}>· {todayHoursLabel(library.hours, lang, now)}</Text>
            </View>
          ) : null}

          {library.description ? (
            <Text style={styles.description} numberOfLines={expanded ? undefined : 3}>
              {library.description}
            </Text>
          ) : null}

          {/* 기본 정보.
              아직 확인되지 않은 항목은 아예 렌더하지 않는다. "정보 없음" 을 줄줄이
              띄우는 것보다 조용히 비는 편이 신뢰를 덜 깎는다. */}
          <View style={styles.infoBlock}>
            <InfoRow icon="sparkles-outline" label={t('lib.specialty')} value={library.specialty} />
            <View style={styles.hr} />
            <InfoRow icon="map-outline" label={t('lib.region')} value={regionLabel(library, lang)} />

            {library.address ? (
              <>
                <View style={styles.hr} />
                <InfoRow icon="location-outline" label={t('lib.address')} value={library.address} />
              </>
            ) : null}

            {library.hours ? (
              <>
                <View style={styles.hr} />
                <InfoRow icon="time-outline" label={t('lib.hours')} value={library.hours.label} />
              </>
            ) : null}

            {library.closedDays ? (
              <>
                <View style={styles.hr} />
                <InfoRow icon="close-circle-outline" label={t('lib.closedDays')} value={library.closedDays} />
              </>
            ) : null}

            {library.phone ? (
              <>
                <View style={styles.hr} />
                <InfoRow
                  icon="call-outline"
                  label={t('lib.phone')}
                  value={library.phone}
                  onPress={() => void callPhone(library.phone!)}
                />
              </>
            ) : null}

            {expanded && library.homepage ? (
              <>
                <View style={styles.hr} />
                <InfoRow
                  icon="globe-outline"
                  label={t('lib.homepage')}
                  value={library.homepage}
                  onPress={() => void openWeb(library.homepage!)}
                />
              </>
            ) : null}
          </View>

          {!library.address && !library.hours ? (
            <Text style={styles.pending}>
              상세 정보는 준비 중이에요. 지도에서 위치를 먼저 확인해 보세요.
            </Text>
          ) : null}

          {library.description || library.homepage ? (
            <Pressable onPress={() => setExpanded(!expanded)} style={styles.moreButton}>
              <Text style={styles.moreText}>{expanded ? t('lib.less') : t('lib.more')}</Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={15}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>

        {/* 지도 연결 */}
        <View style={styles.section}>
          <SectionHeader title={t('lib.mapTitle')} subtitle={t('lib.mapSub')} />
          <View style={{ paddingHorizontal: spacing.xl }}>
            <MapButtons
              target={{
                name: library.name,
                coords: library.coords,
                address: library.address,
              }}
            />
          </View>
        </View>

        {/* 추천 도서 */}
        {books && books.length > 0 ? (
          <View style={styles.section}>
            {/* 무엇을 집계한 목록인지 제목에서 분명히 밝힌다.
                도서관 순위·지역 순위·주제 추천은 정보의 무게가 다르고,
                지역 순위를 그 도서관 순위인 척 보여주면 거짓말이 된다. */}
            <SectionHeader {...booksHeading(books[0], library, lang)} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookList}
            >
              {books.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* 주변 정보. 좌표를 모르면 반경 검색을 할 수 없으므로 섹션 자체를 생략한다. */}
        {library.coords ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('lib.nearbyTitle')}
              subtitle={t('lib.nearbySub')}
            />
            <NearbySection libraryId={library.id} coords={library.coords} />
          </View>
        ) : null}

        {/* 방문 체크인 */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.sm }}>
          <Pressable
            onPress={() => addVisit(library.id)}
            style={({ pressed }) => [styles.checkin, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="footsteps-outline" size={18} color={colors.primary} />
            <Text style={styles.checkinText}>{t('lib.checkin')}</Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  hero: {
    width: '100%',
    height: 260,
    backgroundColor: colors.surfaceAlt,
  },
  card: {
    backgroundColor: colors.surface,
    marginTop: -spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.card,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    ...typography.h1,
    color: colors.text,
  },
  /** 한글 이름 아래 붙는 읽는 법 */
  reading: {
    ...typography.caption,
    color: colors.textSub,
    marginTop: 2,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openText: {
    ...typography.captionBold,
  },
  openSub: {
    ...typography.caption,
    color: colors.textSub,
  },
  description: {
    ...typography.body,
    color: colors.textSub,
    marginTop: spacing.lg,
  },
  pending: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  infoBlock: {
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  hr: {
    height: 1,
    backgroundColor: colors.divider,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  moreText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  section: {
    marginTop: spacing.xxl,
  },
  bookList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  checkin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  checkinText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  homeButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  homeButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});
