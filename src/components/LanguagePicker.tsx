import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/useAppStore';
import { LANGUAGES, useT } from '@/i18n';
import { colors, radius, shadow, spacing, typography } from '@/theme';

/**
 * 국기를 눌러 언어를 바꾼다.
 *
 * 고른 언어는 기기에 저장되고, 바꾸는 즉시 화면 전체가 그 언어로 다시 그려진다.
 * 스토어 값 하나만 보고 있으므로 앱을 다시 켤 필요가 없다.
 *
 * 국기와 언어는 원래 일대일이 아니다(영어를 쓰는 나라가 여럿이다). 그래도
 * 국기를 쓰는 이유는 글자를 못 읽는 상태에서도 자기 언어를 찾을 수 있어야
 * 하기 때문이다. 그래서 국기 옆에 그 언어로 쓴 이름을 함께 둔다.
 */
export function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const T = useT();

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`${T.home.languageTitle}: ${current.label}`}
        hitSlop={8}
      >
        <Text style={styles.triggerFlag}>{current.flag}</Text>
        <Ionicons name="chevron-down" size={13} color={colors.textSub} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* 바깥을 누르면 닫힌다 */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{T.home.languageTitle}</Text>

            {LANGUAGES.map((l) => {
              const selected = l.code === language;
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
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={styles.flag}>{l.flag}</Text>
                  <Text style={[styles.label, selected && styles.labelSelected]}>{l.label}</Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  triggerFlag: { fontSize: 18, lineHeight: 24 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  sheetTitle: {
    ...typography.captionBold,
    color: colors.textSub,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  flag: { fontSize: 22, lineHeight: 30 },
  label: { ...typography.body, color: colors.text, flex: 1 },
  labelSelected: { color: colors.primary, fontWeight: '700' },
});
