import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors, currentScheme, radius, themedStyles } from '@/theme';
import type { Coordinates } from '@/types';

/**
 * 오늘의 나들이 — 코스 지도. 들르는 곳에 번호 핀(1 도서관 · 2 맛집 · 3 볼거리)과 그 차례대로 잇는 선.
 * 선은 길이 아니라 곧은 선이다(걷는 길 안내는 지도 앱으로 넘긴다).
 *
 * 핀은 지도 기본 핀에 제목을 단다 — 안드로이드는 핀 안에 그린 화면이 찍히지 않을 때가 있어
 * (NearbyMap 주석) 시연 화면에서 핀이 비어 보이지 않게.
 */
export function CourseMap({ stops }: { stops: { name: string; coords: Coordinates }[] }) {
  const map = useRef<MapView>(null);
  // 지도가 준비되기 전에 맞추면 안드로이드 구글 지도가 죽을 수 있다 (NearbyMap 주석)
  const ready = useRef(false);
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
            pinColor={i === 0 ? colors.primary : i === 1 ? '#E5A400' : '#C46B47'}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = themedStyles(() => ({
  box: { height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
}));
