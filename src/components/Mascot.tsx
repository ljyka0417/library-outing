import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

/**
 * 마스코트 「달곰이 (Dalgomi)」
 *
 * 원본 캐릭터 시트를 포즈별로 잘라 쓴다.
 * 시트 갱신 시:  npm run slice-mascot  → assets/mascot/slices/ 확인 → poses/ 로 정리
 *
 * 포즈를 상황에 맞게 고르는 게 이 컴포넌트의 존재 이유다.
 * "빈 화면"에 그냥 웃는 얼굴을 놓는 것과, 즐겨찾기가 비었을 때 하트를 든 달곰이를
 * 놓는 것은 전달되는 감정이 다르다.
 */

export type MascotPose =
  // 전신
  | 'wave' // 손 흔들며 인사
  | 'walk' // 걸어가며 인사
  | 'read' // 초록 책 읽기
  | 'camera' // 카메라 들기
  | 'map' // 지도 펼치기
  | 'side' // 옆모습, 책 들고
  | 'back' // 뒤돌아본 모습
  | 'hatGreen' // 초록 모자
  | 'hatExplorer' // 탐험 모자
  | 'flag' // 깃발 들기
  | 'hello' // 반갑게 손 들기
  | 'coffee' // 커피 들기
  | 'books' // 책 더미 안기
  | 'sparkle' // 반짝임과 함께
  | 'reading' // 책 읽는 상반신
  | 'backpack' // 배낭 멘 뒷모습
  // 얼굴만
  | 'face'
  | 'faceHappy'
  | 'faceSleepy'
  | 'faceTongue'
  | 'faceCalm'
  | 'faceWink'
  | 'faceHeart'
  | 'faceCheer';

/**
 * require 는 정적으로 해석되므로 변수로 만들 수 없다.
 * 포즈를 추가하려면 여기에 한 줄 넣으면 된다.
 */
const POSES: Record<MascotPose, number> = {
  wave: require('../../assets/mascot/poses/dalgomi-wave.png'),
  walk: require('../../assets/mascot/poses/dalgomi-walk.png'),
  read: require('../../assets/mascot/poses/dalgomi-read.png'),
  camera: require('../../assets/mascot/poses/dalgomi-camera.png'),
  map: require('../../assets/mascot/poses/dalgomi-map.png'),
  side: require('../../assets/mascot/poses/dalgomi-side.png'),
  back: require('../../assets/mascot/poses/dalgomi-back.png'),
  hatGreen: require('../../assets/mascot/poses/dalgomi-hat-green.png'),
  hatExplorer: require('../../assets/mascot/poses/dalgomi-hat-explorer.png'),
  flag: require('../../assets/mascot/poses/dalgomi-flag.png'),
  hello: require('../../assets/mascot/poses/dalgomi-hello.png'),
  coffee: require('../../assets/mascot/poses/dalgomi-coffee.png'),
  books: require('../../assets/mascot/poses/dalgomi-books.png'),
  sparkle: require('../../assets/mascot/poses/dalgomi-sparkle.png'),
  reading: require('../../assets/mascot/poses/dalgomi-reading.png'),
  backpack: require('../../assets/mascot/poses/dalgomi-backpack.png'),
  face: require('../../assets/mascot/poses/dalgomi-face.png'),
  faceHappy: require('../../assets/mascot/poses/dalgomi-face-happy.png'),
  faceSleepy: require('../../assets/mascot/poses/dalgomi-face-sleepy.png'),
  faceTongue: require('../../assets/mascot/poses/dalgomi-face-tongue.png'),
  faceCalm: require('../../assets/mascot/poses/dalgomi-face-calm.png'),
  faceWink: require('../../assets/mascot/poses/dalgomi-face-wink.png'),
  faceHeart: require('../../assets/mascot/poses/dalgomi-face-heart.png'),
  faceCheer: require('../../assets/mascot/poses/dalgomi-face-cheer.png'),
};

interface Props {
  size?: number;
  pose?: MascotPose;
  style?: StyleProp<ImageStyle>;
}

export function Mascot({ size = 96, pose = 'wave', style }: Props) {
  return (
    <Image
      source={POSES[pose]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      // 장식용 일러스트다. 스크린리더가 "이미지"라고 읽어 주면 방해만 된다.
      accessible={false}
    />
  );
}
