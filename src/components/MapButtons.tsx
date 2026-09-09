import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import { openKakaoMap, openNaverMap, type MapTarget } from '@/utils/mapLinks';

/**
 * 네이버지도 / 카카오맵 바로 열기 버튼.
 * 사용자가 어떤 지도앱을 쓰는지 모르므로 둘 다 동등한 비중으로 노출한다.
 *
 * ⚠️ 로고에 대하여
 * 네이버·카카오 로고는 각 사의 등록상표이고, 제휴 서비스가 쓸 수 있는 공식
 * 버튼 에셋과 사용 규정(최소 여백·크기·변형 금지 등)이 따로 있다.
 * 임의로 흉내 낸 마크를 쓰면 상표 문제가 생기므로, 지금은 중립적인 지도 아이콘을
 * 쓰고 브랜드 컬러만 액센트로 반영해 두었다.
 *
 * 배포 전에 아래 <BrandMark> 안쪽만 공식 로고 <Image> 로 교체하면 된다.
 *   - 네이버: 네이버 개발자센터 > 지도 > 서비스 이용 가이드의 버튼 에셋
 *   - 카카오: Kakao Developers > 디자인 가이드의 카카오맵 버튼 에셋
 */
export function MapButtons({ target }: { target: MapTarget }) {
  return (
    <View style={styles.row}>
      <MapButton
        label="네이버 지도"
        brandColor="#03C75A"
        onPress={() => void openNaverMap(target)}
      />
      <MapButton
        label="카카오맵"
        brandColor="#FEE500"
        markTint={colors.text}
        onPress={() => void openKakaoMap(target)}
      />
    </View>
  );
}

interface ButtonProps {
  label: string;
  brandColor: string;
  /** 밝은 브랜드 컬러(카카오 노랑) 위에서는 아이콘을 어둡게 */
  markTint?: string;
  onPress: () => void;
}

function MapButton({ label, brandColor, markTint = colors.white, onPress }: ButtonProps) {
  const T = useT();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label} 앱에서 이 도서관 위치 보기`}
      // 지도앱으로 화면이 전환되는 동작이라 미리 알려 준다
      accessibilityHint="지도 앱이 열립니다"
    >
      <BrandMark color={brandColor} tint={markTint} />

      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{T.common.openIn}</Text>
      </View>

      <Ionicons name="open-outline" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

/** 공식 로고 에셋으로 교체할 슬롯 */
function BrandMark({ color, tint }: { color: string; tint: string }) {
  return (
    <View style={[styles.mark, { backgroundColor: color }]}>
      <Ionicons name="navigate" size={18} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    // 최소 터치 영역 48dp 확보
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  buttonPressed: {
    opacity: 0.75,
    backgroundColor: colors.surfaceAlt,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyBold,
    color: colors.text,
  },
  sub: {
    ...typography.tiny,
    color: colors.textSub,
    marginTop: 1,
  },
});
