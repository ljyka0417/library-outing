import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LibraryCard } from '@/components/LibraryCard';
import { EmptyState } from '@/components/common';
import { libraryApi } from '@/api/libraryApi';
import { useAsync } from '@/hooks/useAsync';
import { useAppStore } from '@/store/useAppStore';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { centered, useLayout } from '@/hooks/useLayout';
import { colors, spacing, typography } from '@/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const tabPad = useTabBarPadding();
  const layout = useLayout();

  const { data } = useAsync(() => libraryApi.list(), [], { cacheKey: 'all-libraries' });

  // 저장한 순서(최근 저장이 위)를 유지한다.
  const saved = (data ?? [])
    .filter((lib) => favorites.includes(lib.id))
    .sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 태블릿에서는 제목부터 목록까지 한 덩어리로 가운데에 모은다 */}
      <View style={[styles.body, centered(layout)]}>
      <View style={[styles.header, { paddingHorizontal: layout.gutter }]}>
        <Text style={styles.title}>즐겨찾기</Text>
        <Text style={styles.subtitle}>
          {saved.length > 0
            ? `${saved.length}곳을 저장했어요`
            : '가고 싶은 도서관을 모아 두세요'}
        </Text>
      </View>

      <FlatList
        directionalLockEnabled
        data={saved}
        keyExtractor={(item) => item.id}
        /* 열 수가 바뀌면 FlatList 를 새로 만들어야 한다 (아이패드 회전) */
        key={layout.listColumns}
        numColumns={layout.listColumns}
        columnWrapperStyle={layout.listColumns > 1 ? { gap: spacing.md } : undefined}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: layout.gutter, paddingBottom: tabPad },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            pose="faceHeart"
            title="아직 저장한 도서관이 없어요"
            description={'도서관 상세 화면의 하트를 눌러\n나만의 나들이 목록을 만들어 보세요'}
          />
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <LibraryCard
              library={item}
              onPress={() => router.push(`/library/${item.id}`)}
              isFavorite
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          </View>
        )}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /** 태블릿에서 가운데로 모이는 본문 (폰에서는 화면 폭 그대로) */
  body: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSub,
    marginTop: 4,
  },
  list: {
    paddingVertical: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
});
