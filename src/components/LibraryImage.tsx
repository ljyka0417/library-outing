import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Mascot } from './Mascot';
import { CATEGORY_MAP } from '@/data/categories';
import { getPhoto } from '@/data/libraryPhotos';
import { categoryColors, colors, typography } from '@/theme';
import type { Library } from '@/types';

/**
 * 도서관 이미지.
 *
 * 실사진이 등록돼 있으면 그걸 쓰고, 없으면 주제 색 + 아이콘으로 된
 * 브랜드 플레이스홀더를 그린다.
 *
 * 왜 랜덤 사진을 쓰지 않는가
 *   전에는 picsum 랜덤 사진을 넣어 뒀는데, 우리소리도서관에 해변 사진이,
 *   서울음악도서관에 산 사진이 나왔다. 개발 중에는 상관없지만 스토어에 올릴
 *   앱이 엉뚱한 건물을 "그 도서관"인 양 보여주면 사용자를 속이는 것이다.
 *   사진이 없으면 없다고 말하는 편이 낫고, 주제 색으로 칠해 두면
 *   오히려 목록에서 분류가 한눈에 들어온다.
 *
 * 사진 넣는 방법은 src/data/libraryPhotos.ts 주석 참고.
 */

interface Props {
  library: Library;
  /** hero: 상세 상단 / card: 목록 썸네일 / carousel: 가로 스크롤 */
  variant: 'hero' | 'card' | 'carousel';
  /** Image 와 View 양쪽에 쓰이므로 두 스타일의 교집합만 받는다 */
  style?: StyleProp<ImageStyle & ViewStyle>;
}

export function LibraryImage({ library, variant, style }: Props) {
  const photo = getPhoto(library.id);
  const shapeStyle = variant === 'hero' ? styles.hero : variant === 'card' ? styles.card : styles.carousel;

  if (photo) {
    return <Image source={photo.source} style={[shapeStyle, style]} resizeMode="cover" />;
  }

  const category = library.categories[0];
  const palette = categoryColors[category] ?? { bg: colors.surfaceAlt, fg: colors.textMuted };
  const icon = CATEGORY_MAP[category]?.icon ?? 'library';

  return (
    <View style={[shapeStyle, styles.placeholder, { backgroundColor: palette.bg }, style]}>
      {variant === 'hero' ? (
        <>
          {/* 큰 아이콘을 옅게 깔아 배경 무늬처럼 쓴다 */}
          <Ionicons
            name={icon as never}
            size={190}
            color={palette.fg}
            style={styles.watermark}
          />
          <Mascot size={104} pose="camera" />
          <Text style={[styles.heroText, { color: palette.fg }]}>사진을 준비하고 있어요</Text>
        </>
      ) : (
        <Ionicons name={icon as never} size={variant === 'card' ? 28 : 34} color={palette.fg} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 260,
  },
  card: {
    width: 84,
    height: 84,
    borderRadius: 12,
  },
  carousel: {
    width: '100%',
    height: 104,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    opacity: 0.12,
    right: -30,
    bottom: -40,
  },
  heroText: {
    ...typography.caption,
    marginTop: 6,
    opacity: 0.85,
  },
});
