import React from 'react';
import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Category } from '@/types';

/**
 * 주제 아이콘.
 *
 * 우리가 직접 그린 13종이다(선 + 옅은 속 두 겹, 48 격자). 예전엔 Ionicons 의 기본 그림을
 * 썼는데, 굵기와 모양이 제각각이라 앱이 기본 부품을 모아 붙인 티가 났다.
 *
 * 그림은 흰색 PNG 로 구워 두고(assets/category, 원본 SVG 는 assets/icon-src/category)
 * tintColor 로 주제 색을 입힌다. 흰색의 투명도가 그대로 남아서 선은 진하게, 속은 옅게 칠해진다.
 * 그래서 다크 모드에서 주제 색이 바뀌어도 그림을 따로 둘 필요가 없다.
 *
 * 쓰는 곳: 주제 그리드 · 아이패드 사이드바 · 사진이 없는 도서관 카드
 */
const ART: Record<string, ImageSourcePropType> = {
  landmark: require('../../assets/category/landmark.png'),
  kids: require('../../assets/category/kids.png'),
  language: require('../../assets/category/language.png'),
  music: require('../../assets/category/music.png'),
  art: require('../../assets/category/art.png'),
  nature: require('../../assets/category/nature.png'),
  science: require('../../assets/category/science.png'),
  food: require('../../assets/category/food.png'),
  travel: require('../../assets/category/travel.png'),
  humanities: require('../../assets/category/humanities.png'),
  law: require('../../assets/category/law.png'),
  media: require('../../assets/category/media.png'),
  education: require('../../assets/category/education.png'),
};

export function CategoryIcon({
  category,
  size,
  color,
  style,
}: {
  category: Partial<Pick<Category, 'id'>> & Pick<Category, 'icon' | 'iconFamily'>;
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const art = category.id ? ART[category.id] : undefined;
  if (art) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image source={art} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />
      </View>
    );
  }
  // 그림이 없는 주제(새로 생긴 주제 등)는 예전처럼 글꼴 아이콘으로
  if (category.iconFamily === 'material') {
    return <MaterialCommunityIcons name={category.icon as never} size={size} color={color} style={style as never} />;
  }
  return <Ionicons name={category.icon as never} size={size} color={color} style={style as never} />;
}
