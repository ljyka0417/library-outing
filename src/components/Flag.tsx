import React from 'react';
import { Image, StyleSheet } from 'react-native';
import type { Lang } from '@/i18n';

/**
 * 국기.
 *
 * ⚠️ 이모지 국기(🇰🇷)를 쓰지 않는다.
 *   아이폰은 제대로 그리지만, 윈도우 브라우저와 일부 안드로이드는 국기
 *   글꼴이 없어 "KR", "US" 같은 알파벳 두 글자로 나온다. 웹으로 시연할
 *   때마다 글자가 뜨는 건 곤란하다.
 *
 * ⚠️ View 로 그리지도 않는다.
 *   태극 문양이 곡선이라 네모를 겹쳐서는 흉내가 안 난다.
 *
 * 그래서 규격대로 그린 그림을 쓴다. 그림은 scripts/make-flags.mjs 가
 * 수식으로 만들어 내므로(npm run flags) 어떤 크기로 뽑아도 선명하고,
 * 네 장 합쳐 11KB 라 앱 크기에 영향이 없다.
 */

const SOURCES: Record<Lang, number> = {
  ko: require('../../assets/flags/kr.png'),
  en: require('../../assets/flags/us.png'),
  ja: require('../../assets/flags/jp.png'),
  zh: require('../../assets/flags/cn.png'),
};

/** 그림 비율. 넷 다 3:2 로 구워 두어 나란히 놓으면 줄이 맞는다. */
const W = 21;
const H = 14;

export function Flag({ code, size = 1 }: { code: Lang; size?: number }) {
  return (
    <Image
      source={SOURCES[code]}
      style={[styles.flag, { width: W * size, height: H * size, borderRadius: 2 * size }]}
      resizeMode="cover"
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  flag: {
    // 흰 바탕 국기(태극기·일장기·성조기)가 밝은 배경에 묻히지 않게 테두리를 준다
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
  },
});
