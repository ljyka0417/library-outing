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
import { colors, radius, spacing, typography } from '@/theme';

export default function MyPageScreen() {
  const { favorites, visits, recentLibraryIds, resetAll } = useAppStore();
  const { data } = useAsync(() => libraryApi.list(), [], { cacheKey: 'all-libraries' });

  const visitedNames = visits
    .slice(0, 5)
    .map((v) => (data ?? []).find((l) => l.id === v.libraryId)?.name)
    .filter(Boolean) as string[];

  const confirmReset = () => {
    Alert.alert(
      '기록을 모두 지울까요?',
      '즐겨찾기, 최근 본 도서관, 방문 기록이 모두 삭제돼요. 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: resetAll },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <Mascot size={110} pose="hello" />
          <Text style={styles.name}>달곰이와 도서관 나들이 중</Text>
          <Text style={styles.sub}>로그인 없이도 기록은 이 기기에 저장돼요</Text>
        </View>

        <View style={styles.stats}>
          <Stat label="즐겨찾기" value={favorites.length} />
          <View style={styles.statDivider} />
          <Stat label="방문 기록" value={visits.length} />
          <View style={styles.statDivider} />
          <Stat label="최근 본 곳" value={recentLibraryIds.length} />
        </View>

        {visitedNames.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>최근 다녀온 도서관</Text>
            {visitedNames.map((n, i) => (
              <View key={`${n}-${i}`} style={styles.visitRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={styles.visitName}>{n}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>설정</Text>
          <MenuRow icon="notifications-outline" label="알림 설정" comingSoon />
          <MenuRow icon="person-add-outline" label="로그인 / 기기 간 동기화" comingSoon />
          <MenuRow icon="color-wand-outline" label="달곰이 꾸미기" comingSoon />
          <MenuRow icon="trash-outline" label="기록 전체 삭제" onPress={confirmReset} danger />
        </View>

        {/* 개발용 데이터 수집 현황. __DEV__ 라 배포 빌드에는 나오지 않는다. */}
        {__DEV__ ? <DataStatus /> : null}
      </ScrollView>
    </SafeAreaView>
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
  return (
    <Pressable
      onPress={onPress}
      disabled={comingSoon}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={18} color={danger ? colors.closed : colors.textSub} />
      <Text style={[styles.menuLabel, danger && { color: colors.closed }]}>{label}</Text>
      {comingSoon ? (
        <Text style={styles.soon}>준비중</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
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
  devTitle: { ...typography.tiny, color: colors.textSub, fontWeight: '700', marginBottom: 2 },
  devText: { ...typography.tiny, color: colors.textMuted },
});
