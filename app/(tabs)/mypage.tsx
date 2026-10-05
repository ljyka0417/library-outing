import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TabScreen, useBleed } from '@/components/TabScreen';
import { Ionicons } from '@expo/vector-icons';
import { Mascot } from '@/components/Mascot';
import { useRouter } from 'expo-router';
import { buddyName, buddyTitle } from '@/data/buddy';
import { BuddyStage } from '@/components/BuddyStage';
import type { ThemePref } from '@/store/useAppStore';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { nearbyDataStatus, photoCredits } from '@/api/nearbyApi';
import { dataCompleteness } from '@/data/libraries.mock';
import { hasCommonsPhotos, libraryPhotoCount } from '@/data/libraryPhotos';
import { loanBookStatus } from '@/data/books.mock';
import { chatIdeasStatus } from '@/utils/chatIdeas';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { centered, useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { libText } from '@/i18n/libraryText';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';

export default function MyPageScreen() {
  const { favorites, visits, recentLibraryIds, resetAll } = useAppStore();
  const { data } = useAsync(() => libraryApi.list(), [], { cacheKey: 'all-libraries' });
  const tabPad = useTabBarPadding();
  const bleed = useBleed();
  const layout = useLayout();
  const { t, lang } = useT();
  const router = useRouter();
  const buddy = useAppStore((s) => s.buddy);
  const themePref = useAppStore((s) => s.themePref);
  const setThemePref = useAppStore((s) => s.setThemePref);

  const visitedNames = visits
    .slice(0, 5)
    .map((v) => (data ?? []).find((l) => l.id === v.libraryId)?.name)
    .filter(Boolean) as string[];

  const confirmReset = () => {
    Alert.alert(t('my.resetTitle'), t('my.resetBody'), [
      { text: t('my.cancel'), style: 'cancel' },
      { text: t('my.delete'), style: 'destructive', onPress: resetAll },
    ]);
  };

  return (
    <TabScreen style={styles.safe} bleed>
      <ScrollView
        directionalLockEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          bleed.on ? { paddingTop: bleed.top + spacing.xl, paddingBottom: bleed.bottom } : { paddingBottom: tabPad },
        ]}
      >
        {/* 태블릿에서는 이 안쪽을 가운데로 모은다. ScrollView 의
            contentContainerStyle 에 직접 넣으면 왼쪽에 붙은 채로 남는다. */}
        <View style={[styles.inner, centered(layout, true), { paddingHorizontal: layout.gutter }]}>
        <View style={styles.profile}>
          {/* 달곰이 꾸미기에서 고른 모습·배경 색·이름 */}
          <Pressable onPress={() => router.push('/dress-up')} accessibilityRole="button" accessibilityLabel={t('my.dressUp')}>
            <BuddyStage pose={buddy.pose || 'hello'} bg={buddy.bg || 'mint'} size={150} />
          </Pressable>
          <Text style={styles.name}>{buddyName(buddy.name, lang)}</Text>
          <View style={styles.rankChip}>
            <Ionicons name="ribbon" size={13} color={colors.primary} />
            <Text style={styles.rankText}>{t(buddyTitle(visits.length) as never)}</Text>
          </View>
          <Text style={styles.sub}>{t('my.taglineSub')}</Text>
        </View>

        <View style={styles.stats}>
          {/* 누르면 그 기록 목록(내 기록)이 열린다 */}
          <Stat label={t('my.statFavorites')} value={favorites.length} onPress={() => router.push('/records?tab=favorites')} />
          <View style={styles.statDivider} />
          <Stat label={t('my.statVisits')} value={visits.length} onPress={() => router.push('/records?tab=visits')} />
          <View style={styles.statDivider} />
          <Stat label={t('my.statRecent')} value={recentLibraryIds.length} onPress={() => router.push('/records?tab=recent')} />
        </View>

        {visitedNames.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('my.recentVisited')}</Text>
            {visitedNames.map((n, i) => (
              <View key={`${n}-${i}`} style={styles.visitRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={styles.visitName}>{n}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('my.settings')}</Text>
          <MenuRow icon="notifications-outline" label={t('my.notifications')} comingSoon />
          <MenuRow icon="person-add-outline" label={t('my.login')} comingSoon />
          {/* 화면 모드 — 시스템 · 밝게 · 어둡게 */}
          <View style={styles.menuRow}>
            <Ionicons name="contrast-outline" size={18} color={colors.textSub} />
            <Text style={styles.menuLabel}>{t('my.theme')}</Text>
            <View style={styles.segment}>
              {(['system', 'light', 'dark'] as ThemePref[]).map((p) => {
                const on = p === themePref;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setThemePref(p)}
                    style={[styles.segItem, on && styles.segOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.segText, on && styles.segTextOn]}>{t(`my.theme.${p}` as never)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <MenuRow icon="color-wand-outline" label={t('my.dressUp')} onPress={() => router.push('/dress-up')} />
          <MenuRow icon="trash-outline" label={t('my.reset')} onPress={confirmReset} danger />
        </View>

        {/* 사진 출처. 공공누리 제1·3유형은 출처 표시가 의무다.
            사진 위에도 찍지만, 한곳에 모아 두는 편이 맞다.
            사진이 없으면 이 칸 자체가 안 나온다. */}
        {photoCredits.length > 0 || libraryPhotoCount > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('my.credits')}</Text>
            <Text style={styles.creditText}>
              {t('my.creditsBody', {
                libs: libraryPhotoCount,
                places: nearbyDataStatus.photoCount,
                who: [...(photoCredits.length ? photoCredits : ['한국관광공사']).map((c) => libText(c, lang)), ...(hasCommonsPhotos ? ['Wikimedia Commons'] : [])].join(', '),
              })}
            </Text>
          </View>
        ) : null}

        {/* 개발용 데이터 수집 현황. __DEV__ 라 배포 빌드에는 나오지 않는다. */}
        {__DEV__ ? <DataStatus /> : null}
        </View>
      </ScrollView>
    </TabScreen>
  );
}

/**
 * 데이터가 얼마나 채워졌는지 한눈에 보여준다.
 * npm run geocode / enrich / collect-nearby 를 돌린 뒤 여기서 확인한다.
 */
/** 기기에 들어간 코드를 눈으로 확인하는 표시. 새 코드를 올릴 때마다 바꾼다 */
const BUILD_MARK = '10-05 탭바 자동·지도 문구';

function DataStatus() {
  const d = dataCompleteness();
  const pct = (n: number) => `${n}/${d.total} (${Math.round((n / d.total) * 100)}%)`;

  return (
    <View style={styles.devBox}>
      <Text style={styles.devTitle}>데이터 수집 현황 (개발 중에만 표시)</Text>
      {/* 기기가 어느 코드를 돌고 있는지 한눈에 보는 표시. 고칠 때마다 손으로 바꾼다 */}
      <Text style={[styles.devText, { fontWeight: '700', color: colors.primary }]}>
        코드 표시: {BUILD_MARK}
      </Text>
      <Text style={styles.devText}>주소 {pct(d.address)} · 전화 {pct(d.phone)}</Text>
      <Text style={styles.devText}>좌표 {pct(d.coords)} · 운영시간 {pct(d.hours)}</Text>
      <Text style={styles.devText}>
        주변정보{' '}
        {nearbyDataStatus.generated
          ? `${nearbyDataStatus.libraryCount}곳 / ${nearbyDataStatus.placeCount}개 장소`
          : '미수집 (mock 사용중)'}
      </Text>
      {/* 달곰이 추천 칩 목록. 0 이면 예전 고정 칩으로 돌아가 있다는 뜻이라 붉게.
          기기가 옛 번들을 돌고 있으면 이 줄 자체가 없다. */}
      <Text
        style={[
          styles.devText,
          chatIdeasStatus.verified === 0 && { color: colors.closed, fontWeight: '700' },
        ]}
      >
        달곰이 추천 칩 {chatIdeasStatus.verified}개 (검사{' '}
        {chatIdeasStatus.generatedAt ? chatIdeasStatus.generatedAt.slice(0, 10) : '안 함'})
        {chatIdeasStatus.verified === 0 ? ' — 예전 고정 칩 사용 중' : ''}
      </Text>
      {/* 수집 시각과 "서로 다른 목록 수"를 같이 보여준다.
          기기가 옛 번들을 돌고 있는지 여기서 바로 구분할 수 있다.
          목록이 전부 같으면 도서관별 데이터가 아니라는 뜻이라 붉게 표시한다. */}
      <Text style={styles.devText}>
        대출순위 도서관별 {loanBookStatus.libraryCount}곳 · 지역별{' '}
        {loanBookStatus.regionCount}곳 / {loanBookStatus.bookCount}권
      </Text>
      <Text
        style={[
          styles.devText,
          loanBookStatus.distinctCount <= 1 && { color: colors.closed, fontWeight: '700' },
        ]}
      >
        서로 다른 목록 {loanBookStatus.distinctCount}곳 · 수집{' '}
        {loanBookStatus.version.slice(0, 16).replace('T', ' ')}
      </Text>
    </View>
  );
}

function Stat({ label, value, onPress }: { label: string; value: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
    >
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  comingSoon?: boolean;
  danger?: boolean;
}

function MenuRow({ icon, label, onPress, comingSoon, danger }: MenuRowProps) {
  const { t } = useT();

  return (
    <Pressable
      onPress={onPress}
      disabled={comingSoon}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={18} color={danger ? colors.closed : colors.textSub} />
      <Text style={[styles.menuLabel, danger && { color: colors.closed }]}>{label}</Text>
      {comingSoon ? (
        <Text style={styles.soon}>{t('my.comingSoon')}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingVertical: spacing.xl, paddingBottom: spacing.xxxl },
  /** 태블릿에서 가운데로 모이는 본문 (폰에서는 화면 폭 그대로) */
  inner: { gap: spacing.lg },
  profile: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
  name: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
  sub: { ...typography.caption, color: colors.textSub },

  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.tiny, color: colors.textSub },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  rankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  rankText: { ...typography.captionBold, color: colors.primary },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  segItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  segOn: {
    backgroundColor: colors.surface,
  },
  segText: {
    ...typography.tiny,
    color: colors.textSub,
  },
  segTextOn: {
    color: colors.primary,
    fontWeight: '700',
  },
  cardTitle: { ...typography.captionBold, color: colors.textSub, marginBottom: spacing.sm },
  creditText: { ...typography.caption, color: colors.textSub, lineHeight: 20 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  visitName: { ...typography.body, color: colors.text },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  menuLabel: { ...typography.body, color: colors.text, flex: 1 },
  soon: { ...typography.tiny, color: colors.textMuted },

  devBox: {
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    gap: 2,
  },
  devTitle: { ...typography.tiny, color: colors.textSub, fontWeight: '700', marginBottom: 2 },
  devText: { ...typography.tiny, color: colors.textMuted },
}));
