import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchWeather, WEATHER_ICON, weatherEnabled, type Weather } from '@/api/weather';
import { useT, type MessageKey } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import type { Coordinates } from '@/types';

/**
 * 도서관 화면의 "지금 18° · 맑음". 그 도서관 자리의 기상청 실황이다.
 * 모르면(인터넷·기상청 오류) 아무것도 그리지 않는다.
 */
export function WeatherChip({ coords }: { coords?: Coordinates }) {
  const { t } = useT();
  const [w, setW] = useState<Weather | null>(null);
  const key = coords ? `${coords.lat},${coords.lng}` : '';

  useEffect(() => {
    setW(null);
    if (!weatherEnabled || !coords) return;
    let alive = true;
    void fetchWeather(coords).then((r) => {
      if (alive) setW(r);
    });
    return () => {
      alive = false;
    };
    // coords 객체가 매번 새로 와도 같은 자리면 다시 묻지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!w) return null;
  return (
    <View style={styles.chip} accessibilityLabel={t('weather.a11y', { temp: String(w.temp ?? ''), sky: t(`weather.${w.condition}` as MessageKey) })}>
      <Ionicons name={WEATHER_ICON[w.condition]} size={14} color={colors.textSub} />
      <Text style={styles.text}>
        {w.temp !== undefined ? `${Math.round(w.temp)}° · ` : ''}
        {t(`weather.${w.condition}` as MessageKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  text: {
    ...typography.captionBold,
    color: colors.textSub,
  },
});
