import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors, currentScheme, radius, themedStyles } from '@/theme';
import type { Coordinates } from '@/types';

/**
 * 오늘의 나들이 — 코스 지도. 들르는 곳에 번호 핀(1 도서관 · 2 맛집 · 3 볼거리)과 그 차례대로 잇는 선.
 * 선은 길이 아니라 곧은 선이다(걷는 길 안내는 지도 앱으로 넘긴다).
 *
 * 핀은 번호 동그라미(1·2·3) — 목록 번호와 같아서 어느 핀이 어디인지 바로 안다. 눌러도 이름이 뜬다.
 */
export function CourseMap({ stops }: { stops: { name: string; coords: Coordinates }[] }) {
  const map = useRef<MapView>(null);
  // 지도가 준비되기 전에 맞추면 안드로이드 구글 지도가 죽을 수 있다 (NearbyMap 주석)
  const ready = useRef(false);
  /*
   * 번호 핀은 화면으로 그린다. 안드로이드는 핀 화면을 사진처럼 찍어 고정하는데, 그리기 전에 찍히면
   * 빈 동그라미가 된다(NearbyMap 의 그림 아이콘). 글자만 있으니 처음 잠깐 다시 그리게 두었다가 고정한다.
   */
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 1500);
    return () => clearTimeout(timer);
  }, []);
  const coords = stops.map((s) => ({ latitude: s.coords.lat, longitude: s.coords.lng }));
  const fit = () =>
    ready.current &&
    map.current?.fitToCoordinates(coords, { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: false });

  return (
    <View style={styles.box}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: coords[0].latitude, longitude: coords[0].longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        onMapReady={() => {
          ready.current = true;
          fit();
        }}
        onLayout={fit}
        showsPointsOfInterests={false}
        showsCompass={false}
        toolbarEnabled={false}
        userInterfaceStyle={currentScheme()}
      >
        {coords.length > 1 ? <Polyline coordinates={coords} strokeColor={colors.primary} strokeWidth={4} lineDashPattern={[8, 6]} /> : null}
        {stops.map((s, i) => (
          <Marker
            key={`${s.name}-${i}`}
            coordinate={coords[i]}
            title={`${i + 1}. ${s.name}`}
            // 동그라미 가운데가 그 자리 — 점선이 핀 꼬리에 가리지 않고 가운데로 이어진다
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={10 + i}
            tracksViewChanges={!settled}
          >
            <View collapsable={false} style={[styles.pin, { backgroundColor: PIN_COLORS[i] ?? colors.primary }]}>
              <Text style={styles.pinText}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

// 1 도서관 · 2 맛집 · 3 볼거리 — 목록의 번호와 같은 차례
const PIN_COLORS = ['#4FA695', '#E5A400', '#C46B47'];

const styles = themedStyles(() => ({
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 18 },
  box: { height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
}));
