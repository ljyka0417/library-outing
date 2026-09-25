import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';
import type { Category } from '@/types';

/**
 * 주제 아이콘.
 *
 * 거의 다 Ionicons 로 그린다. 그런데 없는 그림이 있다 — 법률의 판사봉이 그렇다.
 * Ionicons 의 'hammer' 는 못 박는 망치라 법원이 아니라 공사장으로 읽힌다.
 * 그래서 주제마다 아이콘 묶음을 고를 수 있게 하고, 법률만 MaterialCommunityIcons 의
 * 'gavel'(판사봉과 받침)을 쓴다. 둘 다 @expo/vector-icons 에 이미 들어 있어
 * 새로 깔 것은 없다.
 *
 * 쓰는 곳: 주제 그리드 · 아이패드 사이드바 · 사진이 없는 도서관 카드
 */
export function CategoryIcon({
  category,
  size,
  color,
  style,
}: {
  category: Pick<Category, 'icon' | 'iconFamily'>;
  size: number;
  color: string;
  style?: StyleProp<TextStyle>;
}) {
  if (category.iconFamily === 'material') {
    return (
      <MaterialCommunityIcons
        name={category.icon as never}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return <Ionicons name={category.icon as never} size={size} color={color} style={style} />;
}
