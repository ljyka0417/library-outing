import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  value?: string;
  onChangeText?: (t: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  /**
   * true 면 입력 대신 버튼처럼 동작한다.
   * 홈 화면에서는 탭하면 검색 화면으로 넘어가야 하므로 이 모드를 쓴다.
   */
  readOnly?: boolean;
  onPress?: () => void;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = '도서관명, 지역, 주제 검색',
  readOnly,
  onPress,
  autoFocus,
}: Props) {
  const content = (
    <View style={styles.wrap} pointerEvents={readOnly ? 'none' : 'auto'}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        editable={!readOnly}
        autoFocus={autoFocus}
        returnKeyType="search"
        // 한글 입력 중 자동수정으로 조합이 깨지는 걸 막는다.
        autoCorrect={false}
        autoCapitalize="none"
      />
      {!readOnly && value ? (
        <Pressable onPress={() => onChangeText?.('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );

  if (readOnly) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.8 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 46,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
});
