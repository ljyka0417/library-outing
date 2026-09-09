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
import { useT } from '@/i18n';
import { colors, spacing, typography } from '@/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const T = useT();
  const tabPad = useTabBarPadding();

  const { data } = useAsync(() => libraryApi.list(), [], { cacheKey: 'all-libraries' });

  // 저장한 순서(최근 저장이 위)를 유지한다.
  const saved = (data ?? [])
    .filter((lib) => favorites.includes(lib.id))
    .sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{T.favorites.title}</Text>
        <Text style={styles.subtitle}>
          {saved.length > 0 ? T.favorites.subtitle(saved.length) : T.favorites.emptyBody}
        </Text>
      </View>

      <FlatList
        data={saved}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + tabPad }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            pose="faceHeart"
            title={T.favorites.emptyTitle}
            description={T.favorites.emptyBody}
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
