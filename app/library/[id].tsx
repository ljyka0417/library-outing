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
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { callPhone, openWeb } from '@/utils/mapLinks';
import { isOpenNow, todayHoursLabel } from '@/utils/openingHours';
import type { Library } from '@/types';

/** 시/군/구는 확인된 곳만 있으므로 있을 때만 붙인다. */
function regionLabel(library: Library) {
  return [library.region.sido, library.region.sigungu].filter(Boolean).join(' ');
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
          title="도서관 정보를 찾을 수 없어요"
          description={'QR 코드가 오래되었거나\n주소가 잘못되었을 수 있어요'}
        />
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.homeButton}>
          <Text style={styles.homeButtonText}>홈으로 가기</Text>
        </Pressable>
      </View>
    );
  }

  const open = isOpenNow(library.hours);
  const isFav = favorites.includes(library.id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 대표 이미지. 실사진이 없으면 주제 색 플레이스홀더가 나온다. */}
        <LibraryImage library={library} variant="hero" />

        <View style={styles.card}>
          <View style={styles.badgeRow}>
            {library.isLandmark ? <Badge label="지역 대표" tone="brown" /> : null}
            {library.categories.map((c) =>
              CATEGORY_MAP[c] ? (
                <Badge
                  key={c}
                  label={`${CATEGORY_MAP[c].name}·${CATEGORY_MAP[c].sub}`}
                  category={c}
                />
              ) : null
            )}
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.name}>{library.name}</Text>
            <Pressable
              onPress={() => toggleFavorite(library.id)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
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
                {open ? '운영중' : '운영종료'}
              </Text>
              <Text style={styles.openSub}>· {todayHoursLabel(library.hours)}</Text>
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
            <InfoRow icon="sparkles-outline" label="특화" value={library.specialty} />
            <View style={styles.hr} />
            <InfoRow icon="map-outline" label="지역" value={regionLabel(library)} />

            {library.address ? (
              <>
                <View style={styles.hr} />
                <InfoRow icon="location-outline" label="위치" value={library.address} />
              </>
            ) : null}

            {library.hours ? (
              <>
                <View style={styles.hr} />
                <InfoRow icon="time-outline" label="운영시간" value={library.hours.label} />
              </>
            ) : null}

            {library.closedDays ? (
              <>
                <View style={styles.hr} />
                <InfoRow icon="close-circle-outline" label="휴관일" value={library.closedDays} />
              </>
            ) : null}

            {library.phone ? (
              <>
                <View style={styles.hr} />
                <InfoRow
                  icon="call-outline"
                  label="전화"
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
                  label="홈페이지"
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
              <Text style={styles.moreText}>{expanded ? '접기' : '상세 정보 더보기'}</Text>
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
          <SectionHeader title="지도로 위치 확인" subtitle="쓰시는 지도앱으로 바로 열려요" />
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
            {/* 실제 대출 순위 데이터가 있으면 그렇다고 밝힌다.
                주제별 일반 추천과 구분되어야 정보의 무게가 다르게 읽힌다. */}
            <SectionHeader
              title={books[0].rank ? '이 도서관에서 많이 빌린 책' : '이 주제의 추천 도서'}
              subtitle={books[0].rank ? '실제 대출 순위' : undefined}
            />
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
              title="도서관 주변 둘러보기"
              subtitle="책 읽고 나서 들르기 좋은 곳"
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
            <Text style={styles.checkinText}>여기 다녀왔어요</Text>
          </Pressable>
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
    flex: 1,
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
