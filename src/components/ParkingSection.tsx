import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from './common';
import { parkingFor, type ParkingLot } from '@/data/parking';
import { useT, type Lang, type MessageKey } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import { openGoogleMap, openKakaoMap } from '@/utils/mapLinks';
import { formatDistance, walkingMinutes } from '@/utils/openingHours';

const KNOWN_SE = ['공영', '민영'];
const KNOWN_TYPE = ['노상', '노외', '부설'];
const KNOWN_FEE = ['무료', '유료', '혼합'];

const won = (n: number, lang: Lang) => (lang === 'ko' ? `${n.toLocaleString('ko-KR')}원` : `₩${n.toLocaleString('en-US')}`);

/**
 * 도서관 화면의 "근처 주차장" — 아이와 차로 오는 가족을 위해.
 * 전국주차장정보표준데이터에서 도서관 800m 안의 주차장을 가까운 순으로 셋까지.
 * 누르면 지도 앱으로 연다(한국어는 카카오맵, 다른 언어는 구글 지도).
 */
export function ParkingSection({ libraryId, inset = 0 }: { libraryId: string; inset?: number }) {
  const { t, lang } = useT();
  const lots = parkingFor(libraryId);
  if (!lots.length) return null;

  const fee = (p: ParkingLot) => {
    const bits: string[] = [];
    if (p.fee && KNOWN_FEE.includes(p.fee)) bits.push(t(`park.fee.${p.fee}` as MessageKey));
    // 원문에 0원으로 적힌 기본요금은 정말 0원인지 알 수 없어서 적지 않는다
    if (p.basicTime && p.basicCharge) bits.push(t('park.basic', { t: String(p.basicTime), c: won(p.basicCharge, lang) }));
    if (p.addTime && p.addCharge) bits.push(t('park.add', { t: String(p.addTime), c: won(p.addCharge, lang) }));
    return bits.join(' · ');
  };

  const open = (p: ParkingLot) => {
    const target = { name: p.name, coords: p.coords, address: p.address };
    void (lang === 'ko' ? openKakaoMap(target) : openGoogleMap(target));
  };

  return (
    <View style={styles.section}>
      <SectionHeader title={t('park.title')} subtitle={t('park.sub')} inset={inset} />
      <View style={{ paddingHorizontal: inset, gap: spacing.sm }}>
        {lots.map((p) => {
          const kind = [
            p.se && KNOWN_SE.includes(p.se) ? t(`park.se.${p.se}` as MessageKey) : undefined,
            p.type && KNOWN_TYPE.includes(p.type) ? t(`park.type.${p.type}` as MessageKey) : undefined,
            p.spaces ? t('park.spaces', { n: String(p.spaces) }) : undefined,
          ].filter(Boolean).join(' · ');
          const feeText = fee(p);
          return (
            <Pressable
              key={`${p.name}-${p.distance}`}
              onPress={() => open(p)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${formatDistance(p.distance)}`}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>P</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                {kind ? <Text style={styles.meta}>{kind}</Text> : null}
                {feeText ? <Text style={styles.meta}>{feeText}</Text> : null}
                {p.weekday ? <Text style={styles.meta}>{t('park.hours', { h: p.weekday })}</Text> : null}
              </View>
              <View style={styles.right}>
                <Text style={styles.dist}>{formatDistance(p.distance)}</Text>
                <Text style={styles.walk}>{t('nearby.walk', { n: walkingMinutes(p.distance) })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          );
        })}
        <Text style={styles.source}>{t('park.source')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2F6FC0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 17,
  },
  name: {
    ...typography.captionBold,
    color: colors.text,
  },
  meta: {
    ...typography.tiny,
    color: colors.textSub,
  },
  right: {
    alignItems: 'flex-end',
  },
  dist: {
    ...typography.captionBold,
    color: colors.primary,
  },
  walk: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  source: {
    ...typography.tiny,
    color: colors.textMuted,
  },
});
