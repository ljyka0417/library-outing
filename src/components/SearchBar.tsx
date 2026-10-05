import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';

interface Props {
  value?: string;
  onChangeText?: (t: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  /** 칸이 좁아 placeholder 가 잘릴 때 대신 보일 짧은 말 (폴드 바깥 화면·영어처럼 긴 말) */
  shortPlaceholder?: string;
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
  /* 기본값을 한국어로 두면 부르는 쪽이 빠뜨렸을 때 다른 말 화면에 한글이
     새어 나온다. 기본값 없이 두어 그런 일이 생기면 바로 눈에 띄게 한다. */
  placeholder,
  shortPlaceholder,
  readOnly,
  onPress,
  autoFocus,
}: Props) {
  /*
   * 입력칸 폭을 재서, 안내 글이 다 안 들어가면 짧은 글로 바꾼다.
   * 한 줄 입력칸이라 넘치면 "도서관명, 지역, 주제, 도서 검" 처럼 끝이 잘렸다(갤럭시 폴드 1 바깥 화면 274).
   * 글자 폭은 어림한다 — 한글·한자·가나는 글자 크기만큼, 그 밖은 그 절반 남짓.
   */
  const [inputW, setInputW] = useState(0);
  const fits = (text: string) => {
    const size = typography.body.fontSize;
    let w = 0;
    for (const ch of text) w += /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? size : ch === ' ' ? size * 0.28 : size * 0.56;
    return w <= inputW;
  };
  const shown = shortPlaceholder && inputW > 0 && placeholder && !fits(placeholder) ? shortPlaceholder : placeholder;

  const content = (
    <View style={styles.wrap} pointerEvents={readOnly ? 'none' : 'auto'}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={shown}
        onLayout={(e) => setInputW(e.nativeEvent.layout.width)}
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

const styles = themedStyles(() => ({
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
    // 입력칸에는 줄 높이를 주지 않는다 — iOS 는 한 줄 입력칸에 lineHeight 를 주면 글자를 아래로 밀어 받침이 잘린다
    lineHeight: undefined,
    color: colors.text,
    padding: 0,
  },
}));
