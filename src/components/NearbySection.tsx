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
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from './common';
import { nearbyApi } from '@/api/nearbyApi';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';
import { openKakaoMap } from '@/utils/mapLinks';
import { useT } from '@/i18n';
import type { Coordinates, NearbyPlace, NearbyType } from '@/types';

/* 이름은 화면에서 언어에 맞춰 붙인다. 여기에는 어떤 탭이 있는지만 적는다. */
const TABS: { type: NearbyType; key: 'nearby.restaurant' | 'nearby.cafe' | 'nearby.culture'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'restaurant', key: 'nearby.restaurant', icon: 'restaurant' },
  { type: 'cafe', key: 'nearby.cafe', icon: 'cafe' },
  { type: 'culture', key: 'nearby.culture', icon: 'color-palette' },
];

/** 사진 대신 쓰는 종류별 색·아이콘 */
const TYPE_STYLE: Record<
  NearbyType,
  { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  restaurant: { bg: '#FDF0DC', fg: '#B98A33', icon: 'restaurant' },
  cafe: { bg: '#F1EBE2', fg: '#8B6F5C', icon: 'cafe' },
  culture: { bg: '#FBE9E1', fg: '#C46B47', icon: 'color-palette' },
};

interface Props {
  libraryId: string;
  coords: Coordinates;
}

/**
 * 도서관 주변 정보 섹션.
 * 탭으로 맛집/카페/문화시설을 전환하고, 카드를 누르면 카카오맵으로 위치를 연다.
 */
export function NearbySection({ libraryId, coords }: Props) {
  const [tab, setTab] = useState<NearbyType>('restaurant');
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  // 실패했는지만 담는다. 문구는 화면에서 언어에 맞춰 붙인다.
  const [error, setError] = useState(false);
  const { t } = useT();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    nearbyApi
      .list(libraryId, coords, tab)
      .then((result) => {
        if (!cancelled) setPlaces(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [libraryId, coords, tab]);

  return (
    <View>
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const active = item.type === tab;
          return (
            <Pressable
              key={item.type}
              onPress={() => setTab(item.type)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons
                name={item.icon}
                size={15}
                color={active ? colors.white : colors.textSub}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t(item.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <EmptyState pose="faceWink" title={t('nearby.error')} description={t('nearby.retry')} />
      ) : places.length === 0 ? (
        <EmptyState
          // 탭에 맞는 포즈를 골라 준다 — 카페 탭이면 커피 든 달곰이
          pose={tab === 'cafe' ? 'coffee' : tab === 'culture' ? 'camera' : 'faceSleepy'}
          title={t('nearby.emptyTitle')}
          description={t('nearby.emptyBody')}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function PlaceCard({ place }: { place: NearbyPlace }) {
  return (
    <Pressable
      onPress={() => void openKakaoMap({ name: place.name, coords: place.coords })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      {/* 카카오 로컬 API 는 장소 사진을 주지 않는다.
          "이미지 없음" 회색 상자를 놓느니, 종류별 색과 아이콘으로 칠해
          목록에서 맛집/카페/문화시설이 한눈에 구분되게 한다. */}
      <View style={[styles.cardImage, { backgroundColor: TYPE_STYLE[place.type].bg }]}>
        <Ionicons
          name={TYPE_STYLE[place.type].icon}
          size={30}
          color={TYPE_STYLE[place.type].fg}
        />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {place.subCategory}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="walk-outline" size={12} color={colors.primary} />
          <Text style={styles.cardMetaText}>
            {formatDistance(place.distanceMeters)} · 도보 {walkingMinutes(place.distanceMeters)}분
          </Text>
        </View>
        {place.note ? (
          <Text style={styles.cardNote} numberOfLines={2}>
            {place.note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSub,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  loading: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  card: {
    width: 176,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 96,
    backgroundColor: colors.surfaceAlt,
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: spacing.md,
    gap: 2,
  },
  cardName: {
    ...typography.captionBold,
    color: colors.text,
  },
  cardSub: {
    ...typography.tiny,
    color: colors.textSub,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardMetaText: {
    ...typography.tiny,
    color: colors.primary,
  },
  cardNote: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 3,
  },
});
