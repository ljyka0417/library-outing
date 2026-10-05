import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { CategoryIcon } from './CategoryIcon';
import { Mascot } from './Mascot';
import { CATEGORY_MAP } from '@/data/categories';
import { KOREA_CENTER } from '@/utils/geo';
import { categoryColors, colors, currentScheme, themedStyles } from '@/theme';
import type { Coordinates, Library } from '@/types';

/**
 * 안드로이드 핀 그림 [보통, 고름] — scripts/make-map-pins.mjs 가 만든다(npm run map-pins).
 * 안드로이드 구글 지도는 핀 안 화면을 찍을 때 주제 아이콘이 빠져서 빈 동그라미만 남았다.
 * 그래서 안드로이드만 미리 합쳐 둔 그림을 쓴다. 아이폰은 화면으로 그린다(다크 모드 색도 따라간다).
 */
const ANDROID_ME: number = require('../../assets/map-pin/me.png');
const ANDROID_PIN: Record<string, [number, number]> = {
  landmark: [require('../../assets/map-pin/landmark.png'), require('../../assets/map-pin/landmark-on.png')],
  kids: [require('../../assets/map-pin/kids.png'), require('../../assets/map-pin/kids-on.png')],
  language: [require('../../assets/map-pin/language.png'), require('../../assets/map-pin/language-on.png')],
  music: [require('../../assets/map-pin/music.png'), require('../../assets/map-pin/music-on.png')],
  art: [require('../../assets/map-pin/art.png'), require('../../assets/map-pin/art-on.png')],
  nature: [require('../../assets/map-pin/nature.png'), require('../../assets/map-pin/nature-on.png')],
  science: [require('../../assets/map-pin/science.png'), require('../../assets/map-pin/science-on.png')],
  food: [require('../../assets/map-pin/food.png'), require('../../assets/map-pin/food-on.png')],
  travel: [require('../../assets/map-pin/travel.png'), require('../../assets/map-pin/travel-on.png')],
  humanities: [require('../../assets/map-pin/humanities.png'), require('../../assets/map-pin/humanities-on.png')],
  law: [require('../../assets/map-pin/law.png'), require('../../assets/map-pin/law-on.png')],
  media: [require('../../assets/map-pin/media.png'), require('../../assets/map-pin/media-on.png')],
  education: [require('../../assets/map-pin/education.png'), require('../../assets/map-pin/education-on.png')],
};

/**
 * 내 주변 지도 (앱). 아이폰·아이패드는 애플 지도라 키도 요금도 없다.
 * 웹은 이 지도 부품이 없어서 NearbyMap.web.tsx 가 대신 안내만 한다.
 *
 *   도서관   주제 색 동그라미 + 주제 아이콘. 고르면 커지고 테두리가 민트가 된다
 *   나       달곰이 얼굴. 위치가 바뀌면 따라 움직인다 (지도 기본 파란 점은 끈다)
 */
export interface NearbyMapHandle {
  /** 그 자리로 지도를 옮긴다. delta 가 작을수록 가까이 */
  focus: (c: Coordinates, delta?: number) => void;
  /** 확대 정도는 그대로 두고 가운데만 옮긴다 — 내 위치 따라가기 */
  center: (c: Coordinates) => void;
}

interface Props {
  libraries: Library[];
  user: Coordinates | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** 지도를 화면 끝까지 깔 때, 상태 표시줄·탭바에 가리지 않게 애플 로고·법적 고지를 안쪽으로 */
  padding?: { top: number; right: number; bottom: number; left: number };
  /** 사람이 손가락으로 지도를 끌었을 때 — 따라가기를 멈춘다 */
  onUserPan?: () => void;
  /** 검색한 장소 — 기본 빨간 핀 하나 (도서관 핀과 헷갈리지 않게 모양을 다르게) */
  spot?: (Coordinates & { name: string }) | null;
}

export const NearbyMap = forwardRef<NearbyMapHandle, Props>(function NearbyMap({ libraries, user, selectedId, onSelect, padding, onUserPan, spot }, ref) {
  const map = useRef<MapView>(null);
  /*
   * 지도 여백은 지도가 준비된 뒤에만 준다. 안드로이드 구글 지도는 준비 전에 여백이 바뀌면
   * (태블릿 위쪽 탭바 높이를 잰 직후처럼) GoogleMap 이 아직 없어 앱이 통째로 죽었다(NullPointerException).
   */
  const [ready, setReady] = useState(false);
  /*
   * 지도가 준비되기 전에 온 "여기로 옮겨" — 앱을 켜자마자 마지막 위치가 먼저 오면 옮기라는 말이 버려져서
   * 내 위치를 아는데도 전국 지도 그대로였다(좁은 폰에서 자주). 준비되면 그때 옮긴다.
   */
  const pending = useRef<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const readyRef = useRef(false);

  /*
   * 핀 모양은 한 번 찍어 고정한다(tracksViewChanges=false — 핀 127개를 계속 다시 그리면 무겁다).
   * 그런데 안드로이드는 주제 아이콘 그림이 다 그려지기 **전에** 찍어서 빈 동그라미만 남았다.
   * 그래서 처음(그리고 고른 핀이 바뀔 때) 잠깐은 다시 그리게 두었다가 고정한다. iOS 는 괜찮다.
   */
  const [settled, setSettled] = useState(Platform.OS !== 'android');
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    setSettled(false);
    const t = setTimeout(() => setSettled(true), 2500);
    return () => clearTimeout(t);
  }, [selectedId, user ? 1 : 0]);
  useImperativeHandle(ref, () => ({
    focus: (c, delta = 0.04) => {
      const region = { latitude: c.lat, longitude: c.lng, latitudeDelta: delta, longitudeDelta: delta };
      if (!readyRef.current) pending.current = region;
      else map.current?.animateToRegion(region, 450);
    },
    center: (c) => {
      if (!readyRef.current) {
        pending.current = { latitude: c.lat, longitude: c.lng, latitudeDelta: pending.current?.latitudeDelta ?? 0.04, longitudeDelta: pending.current?.longitudeDelta ?? 0.04 };
        return;
      }
      map.current?.animateCamera({ center: { latitude: c.lat, longitude: c.lng } }, { duration: 400 });
    },
  }));

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      mapPadding={ready ? padding : undefined}
      onMapReady={() => {
        readyRef.current = true;
        setReady(true);
        if (pending.current) {
          map.current?.animateToRegion(pending.current, 0);
          pending.current = null;
        }
      }}
      onPanDrag={onUserPan}
      initialRegion={{ latitude: KOREA_CENTER.lat, longitude: KOREA_CENTER.lng, latitudeDelta: 5.5, longitudeDelta: 5.5 }}
      showsUserLocation={false}
      showsPointsOfInterests={false}
      showsCompass={false}
      toolbarEnabled={false}
      // 앱의 화면 모드를 따른다 (밝게 고른 사람에게 어두운 지도가 뜨지 않게)
      userInterfaceStyle={currentScheme()}
    >
      {libraries.map((l) => {
        if (!l.coords) return null;
        const on = l.id === selectedId;
        const palette = categoryColors[l.categories[0]] ?? { bg: colors.surfaceAlt, fg: colors.textSub };
        const cat = CATEGORY_MAP[l.categories[0]] ?? { icon: 'library' };
        const androidPin = Platform.OS === 'android' ? ANDROID_PIN[l.categories[0]]?.[on ? 1 : 0] : undefined;
        return (
          <Marker
            // 고르면 다시 그려야 모양이 바뀐다 (그림을 고정해 두는 tracksViewChanges 때문)
            key={`${l.id}-${on ? 1 : 0}`}
            coordinate={{ latitude: l.coords.lat, longitude: l.coords.lng }}
            onPress={(e) => {
              e.stopPropagation();
              onSelect(l.id);
            }}
            tracksViewChanges={!settled}
            zIndex={on ? 500 : 1}
            accessibilityLabel={l.name}
            image={androidPin}
            anchor={androidPin ? { x: 0.5, y: 0.5 } : undefined}
          >
            {androidPin ? null : (
              <View style={[styles.pin, { backgroundColor: palette.bg }, on && styles.pinOn]}>
                <CategoryIcon category={cat} size={on ? 26 : 20} color={palette.fg} />
              </View>
            )}
          </Marker>
        );
      })}

      {spot ? (
        <Marker coordinate={{ latitude: spot.lat, longitude: spot.lng }} title={spot.name} zIndex={900} />
      ) : null}

      {user ? (
        <Marker
          coordinate={{ latitude: user.lat, longitude: user.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={999}
          tracksViewChanges={!settled}
          accessibilityLabel="me"
          image={Platform.OS === 'android' ? ANDROID_ME : undefined}
        >
          {Platform.OS === 'android' ? null : (
            <View style={styles.halo}>
              <View style={styles.me}>
                <Mascot pose="faceHappy" size={34} />
              </View>
            </View>
          )}
        </Marker>
      ) : null}
    </MapView>
  );
});

const styles = themedStyles(() => ({
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  pinOn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  halo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(79,166,149,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  me: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
}));
