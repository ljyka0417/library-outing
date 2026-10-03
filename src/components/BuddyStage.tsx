import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { Mascot, type MascotPose } from './Mascot';
import { BUDDY_BG, sceneLibrary } from '@/data/buddy';
import { getPhoto } from '@/data/libraryPhotos';
import { radius, spacing, typography, themedStyles } from '@/theme';

/**
 * 꾸민 달곰이가 서 있는 무대 — 꾸미기 미리보기와 마이 화면 위쪽에서 같이 쓴다.
 *
 * 배경은 파스텔 두 겹(하늘·바닥) 이거나, 다녀온 도서관의 실사진.
 * 발밑에 그림자를 깔아 떠 보이지 않게 하고, 숨 쉬듯 살짝 오르내린다.
 * 모습을 바꾸면 톡 튀어나오며 바뀐다. 말풍선은 있을 때만.
 */
export function BuddyStage({
  pose,
  bg,
  size = 200,
  bubble,
  shape = 'circle',
}: {
  pose: string;
  bg: string;
  size?: number;
  bubble?: string;
  shape?: 'circle' | 'card';
}) {
  const libraryId = sceneLibrary(bg);
  const photo = libraryId ? getPhoto(libraryId)?.uri : undefined;
  const palette = BUDDY_BG[bg] ?? BUDDY_BG.mint;

  // 숨쉬기 (위아래 4px) + 바꿀 때 톡
  const bob = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  useEffect(() => {
    pop.setValue(0.82);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [pose, pop]);

  const w = shape === 'card' ? size * 1.5 : size;
  const mascot = size * 0.72;
  const round = shape === 'circle' ? size / 2 : radius.xl;

  return (
    <View style={[styles.stage, { width: w, height: size, borderRadius: round, backgroundColor: palette.color }]}>
      {photo ? (
        <>
          <Image source={{ uri: photo }} style={styles.fill} resizeMode="cover" />
          {/* 사진 위에서도 달곰이가 묻히지 않게 아래쪽을 살짝 어둡게 */}
          <View style={[styles.photoShade, { height: size * 0.45 }]} />
        </>
      ) : (
        // 바닥 — 아래쪽 넓은 타원
        <View style={[styles.floor, { backgroundColor: palette.deep, width: w * 1.3, height: size * 0.62, borderRadius: size, bottom: -size * 0.3 }]} />
      )}

      {/* 발밑 그림자 */}
      <Animated.View
        style={[
          styles.shadow,
          {
            width: mascot * 0.55,
            height: mascot * 0.1,
            borderRadius: mascot,
            bottom: size * 0.15,
            transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) }],
          },
        ]}
      />
      <Animated.View
        style={{
          marginTop: size * 0.04,
          transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { scale: pop }],
        }}
      >
        <Mascot size={mascot} pose={pose as MascotPose} />
      </Animated.View>

      {bubble ? (
        <View style={[styles.bubble, { maxWidth: w * 0.62 }]}>
          <Text style={styles.bubbleText}>{bubble}</Text>
          <View style={styles.tail} />
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  stage: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  photoShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30,24,18,0.28)',
  },
  floor: {
    position: 'absolute',
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(40,30,20,0.18)',
  },
  bubble: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleText: {
    ...typography.captionBold,
    color: '#2E2A26',
  },
  tail: {
    position: 'absolute',
    bottom: -5,
    left: 18,
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
}));

