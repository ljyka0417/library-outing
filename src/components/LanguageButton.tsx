import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, useT } from '@/i18n';
import { Flag } from './Flag';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * 홈 우측 상단의 언어 단추. 누르면 아래에서 4개 국기가 올라온다.
 *
 * 굳이 목록을 따로 띄우는 이유: 국기 네 개를 늘 붙여 두면 인사말 옆이
 * 복잡해지고, 지금 어느 말인지도 알아보기 어렵다. 단추에는 지금 쓰는
 * 국기 하나만 두고, 고를 때만 펼친다.
 *
 * react-native 에 들어 있는 Modal 만 쓴다. 새로 깔 것이 없으니
 * 네이티브를 다시 만들 필요도 없다.
 */
export function LanguageButton() {
  const [open, setOpen] = useState(false);
  const { t, lang } = useT();
  const setLanguage = useAppStore((s) => s.setLanguage);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={`${t('lang.title')} — ${current.label}`}
      >
        <Flag code={current.code} />
        <Ionicons name="chevron-down" size={12} color={colors.textSub} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* 바깥을 눌러도 닫힌다 */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* 시트 안쪽을 누른 것이 바깥 누름으로 새어 나가지 않게 막는다 */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{t('lang.title')}</Text>

            {LANGUAGES.map((l) => {
              const selected = l.code === lang;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => {
                    setLanguage(l.code);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    selected && styles.rowSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Flag code={l.code} size={1.4} />
                  <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                    {l.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}

            {/* 도서관 이름·주소는 안 옮긴다는 것을 미리 알려 준다.
                모르고 보면 "번역이 덜 됐다" 로 읽히기 때문이다. */}
            <Text style={styles.note}>{t('lang.note')}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xs,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  rowLabel: { ...typography.body, color: colors.text, flex: 1 },
  rowLabelSelected: { color: colors.primary, fontWeight: '700' },
  note: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
