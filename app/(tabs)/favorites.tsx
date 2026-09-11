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
import { colors, spacing, typography } from '@/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const tabPad = useTabBarPadding();

  const { data } = useAsync(() => libraryApi.list(), [], { cacheKey: 'all-libraries' });

  // 저장한 순서(최근 저장이 위)를 유지한다.
  const saved = (data ?? [])
    .filter((lib) => favorites.includes(lib.id))
    .sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
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
        contentContainerStyle={[styles.list, { paddingBottom: tabPad }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            pose="faceHeart"
            title="아직 저장한 도서관이 없어요"
            description={'도서관 상세 화면의 하트를 눌러\n나만의 나들이 목록을 만들어 보세요'}
          />
        }
        renderItem={({ item }) => (
          <LibraryCard
            library={item}
            onPress={() => router.push(`/library/${item.id}`)}
            isFavorite
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
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
    padding: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
});
