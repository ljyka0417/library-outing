import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '@/i18n';

/**
 * 국기. 이모지가 아니라 도형으로 그린다.
 *
 * ⚠️ 이모지 국기(🇰🇷)는 기기를 심하게 탄다.
 *   아이폰은 제대로 그리지만, 윈도우 브라우저와 일부 안드로이드는 국기
 *   글꼴이 없어 "KR", "US" 같은 알파벳 두 글자로 나온다. 웹으로 시연할
 *   때마다 글자가 뜨는 건 곤란하다.
 *
 *   그래서 View 몇 개로 직접 그린다. 새로 깔 것도 없고 어디서나 같은
 *   모양이 나온다. 20×14 픽셀에서 알아볼 수 있는 만큼만 그리므로 별의
 *   개수 같은 세부는 줄였다 — 미국기 줄 13개, 중국기 작은 별 4개는
 *   이 크기에서 뭉개져 오히려 지저분해진다.
 */

const W = 21;
const H = 15;

export function Flag({ code, size = 1 }: { code: Lang; size?: number }) {
  const w = W * size;
  const h = H * size;
  const box = [styles.box, { width: w, height: h, borderRadius: 2 * size }];

  if (code === 'ko') {
    // 흰 바탕 + 가운데 태극(위 빨강 / 아래 파랑). 사괘는 이 크기에서 생략.
    return (
      <View style={[box, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.center}>
          <View style={{ width: h * 0.5, height: h * 0.5, borderRadius: h * 0.25, overflow: 'hidden' }}>
            <View style={{ flex: 1, backgroundColor: '#CD2E3A' }} />
            <View style={{ flex: 1, backgroundColor: '#0047A0' }} />
          </View>
        </View>
      </View>
    );
  }

  if (code === 'ja') {
    // 흰 바탕 + 가운데 붉은 원
    return (
      <View style={[box, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.center}>
          <View
            style={{
              width: h * 0.55,
              height: h * 0.55,
              borderRadius: h * 0.3,
              backgroundColor: '#BC002D',
            }}
          />
        </View>
      </View>
    );
  }

  if (code === 'zh') {
    // 붉은 바탕 + 왼쪽 위 노란 별 하나
    return (
      <View style={[box, { backgroundColor: '#DE2910' }]}>
        <Text style={{ position: 'absolute', left: w * 0.1, top: -h * 0.12, fontSize: h * 0.6, color: '#FFDE00' }}>
          ★
        </Text>
      </View>
    );
  }

  // 영어 — 성조기. 줄 넷 + 왼쪽 위 파란 칸 + 별 하나로 줄여 그린다.
  return (
    <View style={[box, { backgroundColor: '#FFFFFF' }]}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: (h / 7) * (i * 2 + 1),
            height: h / 7,
            backgroundColor: '#B22234',
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w * 0.42,
          height: h * 0.54,
          backgroundColor: '#3C3B6E',
        }}
      />
      <Text
        style={{
          position: 'absolute',
          left: w * 0.09,
          top: -h * 0.16,
          fontSize: h * 0.5,
          color: '#FFFFFF',
        }}
      >
        ★
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    // 흰 바탕 국기(한국·일본·미국)가 밝은 배경에 묻히지 않게 테두리를 준다
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
