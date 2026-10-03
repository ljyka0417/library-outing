import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Mascot } from './Mascot';
import { useT } from '@/i18n';
import { libText } from '@/i18n/libraryText';
import { programKind, PROGRAM_LOOK } from '@/utils/programKind';
import { categoryColors, colors, radius, spacing, typography } from '@/theme';

/**
 * 운영 프로그램 카드 — 대출 순위 책 카드(BookCard)와 같은 자리·크기의 가로 줄 카드.
 *
 * 그림 자리에는 프로그램 성격에 맞춘 달곰이를 놓는다. 책에 실린 프로그램 사진은
 * 출처가 도서관 홈페이지·블로그라 앱에 싣지 않는다(programKind.ts 참고).
 */
export function ProgramCard({ name }: { name: string }) {
  const { t, lang } = useT();
  // 갈래는 원문(한국어) 이름으로 가른다
  const kind = programKind(name);
  const look = PROGRAM_LOOK[kind];
  const palette = categoryColors[look.palette] ?? { bg: colors.surfaceAlt, fg: colors.textMuted };

  return (
    <View style={styles.card}>
      <View style={[styles.tile, { backgroundColor: palette.bg }]}>
        <Mascot pose={look.pose} size={88} />
        <View style={[styles.kind, { backgroundColor: colors.surface }]}>
          <Text style={[styles.kindText, { color: palette.fg }]}>{t(`prog.${kind}`)}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {libText(name, lang)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 128,
    gap: 2,
  },
  tile: {
    width: 128,
    height: 128,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  kind: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  kindText: {
    ...typography.tiny,
    fontWeight: '700',
  },
  title: {
    ...typography.captionBold,
    color: colors.text,
  },
});
