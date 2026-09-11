import React, { useEffect, useState } from 'react';
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
import { useT } from '@/i18n';
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

/** 상세 상단 사진이 너무 납작하거나 너무 길어지지 않게 가두는 범위 */
const HERO_MIN_RATIO = 1.2;
const HERO_MAX_RATIO = 1.9;
/** 아직 크기를 모를 때 쓰는 비율 (관광공사 사진에서 제일 흔한 3:2) */
const HERO_DEFAULT_RATIO = 1.5;

export function LibraryImage({ library, variant, style }: Props) {
  const { t } = useT();
  const photo = getPhoto(library.id);

  /**
   * 상세 상단 사진은 **잘리지 않게** 사진 비율에 칸을 맞춘다.
   *
   * 높이를 260 으로 못 박아 두었더니 위아래가 잘렸다. 관광공사 사진은
   * 비율이 제각각이다 — 4:3(1.33), 3:2(1.50), 16:9(1.78) 이 섞여 있다.
   * 어떤 높이를 골라도 어느 한쪽은 잘린다.
   *
   * 그래서 사진 크기를 물어보고 그 비율대로 칸을 만든다. 칸과 사진의 비율이
   * 같으면 cover 로 깔아도 잘릴 것이 없다.
   * 너무 납작하거나 너무 긴 사진이 화면을 차지하지 않게 범위는 가둔다.
   *
   * 목록 썸네일(card·carousel)은 그대로 둔다. 거기서는 줄이 맞는 게 더 중요해서
   * 잘리는 편이 낫다.
   */
  const [ratio, setRatio] = useState(HERO_DEFAULT_RATIO);

  useEffect(() => {
    if (variant !== 'hero') return;

    if (photo?.source) {
      const asset = Image.resolveAssetSource(photo.source);
      if (asset?.width && asset?.height) setRatio(asset.width / asset.height);
      return;
    }
    if (!photo?.uri) return;

    let alive = true;
    Image.getSize(
      photo.uri,
      (w, h) => {
        // 크기를 받아오는 사이에 화면을 벗어났을 수 있다
        if (alive && h > 0) setRatio(w / h);
      },
      // 못 받아오면 기본 비율 그대로 쓴다. 사진은 어차피 보인다.
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [variant, photo?.source, photo?.uri]);

  const heroRatio = Math.min(Math.max(ratio, HERO_MIN_RATIO), HERO_MAX_RATIO);
  const shapeStyle =
    variant === 'hero'
      ? [styles.hero, { aspectRatio: heroRatio }]
      : variant === 'card'
        ? styles.card
        : styles.carousel;

  /*
   * 앱에 넣어 둔 사진(source)과 인터넷에서 불러오는 사진(uri) 둘 다 받는다.
   * 관광공사 사진은 uri 로 온다.
   */
  if (photo?.source || photo?.uri) {
    return (
      <View style={[shapeStyle, style]}>
        <Image
          source={photo.source ? photo.source : { uri: photo.uri! }}
          style={styles.fill}
          resizeMode="cover"
        />
        {/* 공공누리 사진은 출처를 밝혀야 한다.
            다만 목록 썸네일은 84픽셀이라 글자를 넣으면 읽히지도 않고 지저분하다.
            거기서는 빼고, 상세 상단과 [마이 > 사진 출처] 에서 밝힌다. */}
        {photo.credit && variant !== 'card' ? (
          <View style={[styles.creditBar, variant === 'hero' && styles.creditBarHero]}>
            <Text style={styles.creditText} numberOfLines={1}>
              {photo.credit}
            </Text>
          </View>
        ) : null}
      </View>
    );
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
          <Text style={[styles.heroText, { color: palette.fg }]}>{t('image.preparing')}</Text>
        </>
      ) : (
        <Ionicons name={icon as never} size={variant === 'card' ? 28 : 34} color={palette.fg} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  /** 공공누리 사진의 출처 표기 */
  creditBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  /**
   * 상세 상단 사진은 위아래가 다 가린다 — 위는 헤더 막대가, 아래는 흰 카드가
   * 20픽셀 덮고 올라온다. 그래서 아래에서 조금 띄워 그 사이에 넣는다.
   */
  creditBarHero: {
    bottom: 26,
    right: undefined,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  creditText: {
    ...typography.tiny,
    fontSize: 10,
    color: colors.white,
  },
  hero: {
    width: '100%',
    // 높이는 사진 비율대로 정해진다 (위 useEffect)
    overflow: 'hidden',
  },
  card: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
  },
  carousel: {
    width: '100%',
    height: 104,
    overflow: 'hidden',
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
