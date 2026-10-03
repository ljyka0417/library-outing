import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchWeather, WEATHER_ICON, weatherEnabled, type Weather } from '@/api/weather';
import { AIR_COLOR, airEnabled, fetchAir, type Air } from '@/api/air';
import { useT, type MessageKey } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';
import type { Coordinates } from '@/types';

/**
 * 도서관 화면의 "지금 18° · 맑음" 과 "미세먼지 좋음".
 * 그 도서관 자리의 기상청 실황, 가장 가까운 에어코리아 측정소 값이다.
 * 모르면(인터넷·기상청·에어코리아 오류) 그 칩만 그리지 않는다.
 */
export function WeatherChip({ coords }: { coords?: Coordinates }) {
  const { t } = useT();
  const [w, setW] = useState<Weather | null>(null);
  const [air, setAir] = useState<Air | null>(null);
  const key = coords ? `${coords.lat},${coords.lng}` : '';

  useEffect(() => {
    setW(null);
    setAir(null);
    if (!coords) return;
    let alive = true;
    if (weatherEnabled) void fetchWeather(coords).then((r) => alive && setW(r));
    if (airEnabled) void fetchAir(coords).then((r) => alive && setAir(r));
    return () => {
      alive = false;
    };
    // coords 객체가 매번 새로 와도 같은 자리면 다시 묻지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!w && !air) return null;
  return (
    <View style={styles.row}>
      {w ? (
        <View style={styles.chip} accessibilityLabel={t('weather.a11y', { temp: String(w.temp ?? ''), sky: t(`weather.${w.condition}` as MessageKey) })}>
          <Ionicons name={WEATHER_ICON[w.condition]} size={14} color={colors.textSub} />
          <Text style={styles.text}>
            {w.temp !== undefined ? `${Math.round(w.temp)}° · ` : ''}
            {t(`weather.${w.condition}` as MessageKey)}
          </Text>
        </View>
      ) : null}
      {air ? (
        <View
          style={[styles.chip, { backgroundColor: AIR_COLOR[air.grade].bg }]}
          accessibilityLabel={t('air.a11y', { grade: t(`air.grade.${air.grade}` as MessageKey), station: air.station })}
        >
          <Ionicons name="leaf-outline" size={14} color={AIR_COLOR[air.grade].fg} />
          <Text style={[styles.text, { color: AIR_COLOR[air.grade].fg }]}>
            {t('air.chip', { grade: t(`air.grade.${air.grade}` as MessageKey) })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  text: {
    ...typography.captionBold,
    color: colors.textSub,
  },
}));
