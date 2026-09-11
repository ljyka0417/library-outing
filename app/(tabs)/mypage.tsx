import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Mascot } from '@/components/Mascot';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { nearbyDataStatus } from '@/api/nearbyApi';
import { dataCompleteness } from '@/data/libraries.mock';
import { loanBookStatus } from '@/data/books.mock';
import { glassSupport } from '@/components/GlassSurface';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { centered, useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

export default function MyPageScreen() {
  const { favorites, visits, recentLibraryIds, resetAll } = useAppStore();
  const { data } = useAsync(() => libraryApi.list(), [], { cacheKey: 'all-libraries' });
  const tabPad = useTabBarPadding();
  const layout = useLayout();
  const { t } = useT();

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        directionalLockEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabPad }]}
      >
        {/* 태블릿에서는 이 안쪽을 가운데로 모은다. ScrollView 의
            contentContainerStyle 에 직접 넣으면 왼쪽에 붙은 채로 남는다. */}
        <View style={[styles.inner, centered(layout), { paddingHorizontal: layout.gutter }]}>
        <View style={styles.profile}>
          <Mascot size={110} pose="hello" />
          <Text style={styles.name}>{t('my.tagline')}</Text>
          <Text style={styles.sub}>{t('my.taglineSub')}</Text>
        </View>

        <View style={styles.stats}>
          <Stat label={t('my.statFavorites')} value={favorites.length} />
          <View style={styles.statDivider} />
          <Stat label={t('my.statVisits')} value={visits.length} />
          <View style={styles.statDivider} />
          <Stat label={t('my.statRecent')} value={recentLibraryIds.length} />
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
          <MenuRow icon="color-wand-outline" label={t('my.dressUp')} comingSoon />
          <MenuRow icon="trash-outline" label={t('my.reset')} onPress={confirmReset} danger />
        </View>

        {/* 개발용 데이터 수집 현황. __DEV__ 라 배포 빌드에는 나오지 않는다. */}
        {__DEV__ ? <GlassTest /> : null}
        {__DEV__ ? <DataStatus /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 유리 효과 시험 스위치 (개발 중에만 표시).
 *
 * 유리는 네이티브 기능이라 기기에서만 진짜 모습이 나온다. 그런데 전에
 * 바로 켜 두었다가 앱이 켜지자마자 죽어 되돌릴 방법이 없었다.
 * 그래서 앱 안에서 켜고 끄게 하고, 이 값은 **저장하지 않는다.**
 * 켜서 문제가 생겨도 앱을 껐다 켜면 꺼진 상태로 돌아온다.
 */
function GlassTest() {
  const glass = useAppStore((s) => s.glassTest);
  const setGlass = useAppStore((s) => s.setGlassTest);

  const support =
    glassSupport === 'liquid'
      ? '이 기기는 진짜 유리(Liquid Glass)를 씁니다'
      : glassSupport === 'blur'
        ? '이 기기는 흐림 처리로 대신합니다'
        : '이 기기는 유리를 쓸 수 없어 반투명으로 대신합니다';

  return (
    <Pressable
      onPress={() => setGlass(!glass)}
      style={({ pressed }) => [styles.devBox, pressed && { opacity: 0.7 }]}
      accessibilityRole="switch"
      accessibilityState={{ checked: glass }}
    >
      <View style={styles.glassRow}>
        <Ionicons
          name={glass ? 'toggle' : 'toggle-outline'}
          size={26}
          color={glass ? colors.primary : colors.textMuted}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.devTitle}>탭바 유리 효과 {glass ? '켜짐' : '꺼짐'} (시험)</Text>
          <Text style={styles.devText}>{support}</Text>
          <Text style={styles.devText}>앱을 껐다 켜면 다시 꺼집니다</Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * 데이터가 얼마나 채워졌는지 한눈에 보여준다.
 * npm run geocode / enrich / collect-nearby 를 돌린 뒤 여기서 확인한다.
 */
function DataStatus() {
  const d = dataCompleteness();
  const pct = (n: number) => `${n}/${d.total} (${Math.round((n / d.total) * 100)}%)`;

  return (
    <View style={styles.devBox}>
      <Text style={styles.devTitle}>데이터 수집 현황 (개발 중에만 표시)</Text>
      <Text style={styles.devText}>주소 {pct(d.address)} · 전화 {pct(d.phone)}</Text>
      <Text style={styles.devText}>좌표 {pct(d.coords)} · 운영시간 {pct(d.hours)}</Text>
      <Text style={styles.devText}>
        주변정보{' '}
        {nearbyDataStatus.generated
          ? `${nearbyDataStatus.libraryCount}곳 / ${nearbyDataStatus.placeCount}개 장소`
          : '미수집 (mock 사용중)'}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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

const styles = StyleSheet.create({
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
  statDivider: { width: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTitle: { ...typography.captionBold, color: colors.textSub, marginBottom: spacing.sm },
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
  glassRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  devTitle: { ...typography.tiny, color: colors.textSub, fontWeight: '700', marginBottom: 2 },
  devText: { ...typography.tiny, color: colors.textMuted },
});
