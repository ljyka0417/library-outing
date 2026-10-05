import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Mascot, type MascotPose } from './Mascot';
import { fetchWeather, WEATHER_ICON, weatherEnabled, weatherMood, type Weather, type WeatherMood } from '@/api/weather';
import { AIR_COLOR, airEnabled, airIsBad, fetchAir, stationName, type Air } from '@/api/air';
import { useT, type MessageKey } from '@/i18n';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { useNow } from '@/hooks/useNow';
import { isOpenNow, koreaTime } from '@/utils/openingHours';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import type { Coordinates } from '@/types';

/**
 * 홈의 "오늘 날씨 + 달곰이 한마디".
 *
 * 어디 날씨인지는 부르는 쪽이 정한다(최근 본 도서관, 없으면 서울도서관 자리).
 * 비·눈·더위·추위엔 실내에서 오래 머물기 좋은 도서관을, 맑은 날엔 공원·호수 옆
 * 자연·환경 도서관을 권한다. 미세먼지가 나쁨 이상이면 맑아도 실내를 권한다(에어코리아).
 * 날씨를 모르면 카드를 아예 그리지 않는다.
 */
const POSE: Record<WeatherMood, MascotPose> = {
  wet: 'reading',
  snow: 'reading',
  hot: 'coffee',
  cold: 'coffee',
  nice: 'walk',
  cloudy: 'books',
};

export function WeatherCard({
  coords,
  place,
  onAction,
}: {
  coords: Coordinates;
  /** 어디 날씨인지 (도서관 이름이나 지역) */
  place: string;
  /** 권하는 쪽으로 가기 — 맑은 날은 'nature', 그 밖엔 'indoor', 문 연 곳이 하나도 없으면(밤·휴관일) 'browse' */
  onAction: (kind: 'nature' | 'indoor' | 'browse') => void;
}) {
  const { t, lang } = useT();
  const [w, setW] = useState<Weather | null>(null);
  const [air, setAir] = useState<Air | null>(null);
  /*
   * 밤·휴관일 — 문 연 도서관이 하나도 없으면 "산책하기 좋은 날이에요" · "지금 문 연 도서관 보기" 가
   * 맞지 않는다(누르면 빈 목록이 떴다). 그때는 내일 갈 곳을 고르자고 한다. 밤에는 해 대신 달 아이콘.
   */
  const now = useNow();
  const anyOpen = useMemo(() => MOCK_LIBRARIES.some((l) => isOpenNow(l.hours, now) === true), [now]);
  const hour = koreaTime(now).getHours();
  const night = hour >= 19 || hour < 6;
  const key = `${coords.lat},${coords.lng}`;

  useEffect(() => {
    setW(null);
    setAir(null);
    if (!weatherEnabled) return;
    let alive = true;
    void fetchWeather(coords).then((r) => {
      if (alive) setW(r);
    });
    if (airEnabled) void fetchAir(coords).then((r) => alive && setAir(r));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!w) return null;
  const mood = weatherMood(w);
  const badAir = airIsBad(air);
  const kind = !anyOpen ? 'browse' : mood === 'nice' && !badAir ? 'nature' : 'indoor';
  const icon =
    night && w.condition === 'clear' ? 'moon' : night && w.condition === 'partly' ? 'cloudy-night' : WEATHER_ICON[w.condition];
  const tip: MessageKey = badAir ? 'air.tip.bad' : !anyOpen ? 'weather.tip.closed' : (`weather.tip.${mood}` as MessageKey);
  const sky = t(`weather.${w.condition}` as MessageKey);

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={styles.top}>
          <Ionicons name={icon} size={18} color={colors.primary} />
          <Text style={styles.now} numberOfLines={1}>
            {t('weather.now', { place, temp: w.temp !== undefined ? String(Math.round(w.temp)) : '–', sky })}
          </Text>
        </View>
        {air ? (
          <Text style={[styles.air, { color: AIR_COLOR[air.grade].fg }]}>
            {t('air.line', {
              pm10: air.pm10Grade ? t(`air.grade.${air.pm10Grade}` as MessageKey) : '–',
              pm25: air.pm25Grade ? t(`air.grade.${air.pm25Grade}` as MessageKey) : '–',
              station: stationName(air, lang),
            })}
          </Text>
        ) : null}
        <Text style={styles.tip}>{t(tip)}</Text>
        <Pressable
          onPress={() => onAction(kind)}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{t(kind === 'nature' ? 'weather.goNature' : kind === 'browse' ? 'weather.goBrowse' : 'weather.goIndoor')}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>
      <Mascot pose={badAir || !anyOpen ? 'reading' : POSE[mood]} size={72} />
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  now: {
    ...typography.captionBold,
    color: colors.text,
    flexShrink: 1,
  },
  air: {
    ...typography.captionBold,
    marginTop: 2,
  },
  tip: {
    ...typography.body,
    color: colors.text,
    marginTop: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  actionText: {
    ...typography.captionBold,
    color: colors.primary,
  },
}));
