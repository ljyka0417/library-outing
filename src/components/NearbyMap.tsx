import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { CategoryIcon } from './CategoryIcon';
import { Mascot } from './Mascot';
import { CATEGORY_MAP } from '@/data/categories';
import { KOREA_CENTER } from '@/utils/geo';
import { categoryColors, colors, currentScheme, themedStyles } from '@/theme';
import type { Coordinates, Library } from '@/types';

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
}

interface Props {
  libraries: Library[];
  user: Coordinates | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const NearbyMap = forwardRef<NearbyMapHandle, Props>(function NearbyMap({ libraries, user, selectedId, onSelect }, ref) {
  const map = useRef<MapView>(null);
  useImperativeHandle(ref, () => ({
    focus: (c, delta = 0.04) =>
      map.current?.animateToRegion({ latitude: c.lat, longitude: c.lng, latitudeDelta: delta, longitudeDelta: delta }, 450),
  }));

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
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
        return (
          <Marker
            // 고르면 다시 그려야 모양이 바뀐다 (그림을 고정해 두는 tracksViewChanges 때문)
            key={`${l.id}-${on ? 1 : 0}`}
            coordinate={{ latitude: l.coords.lat, longitude: l.coords.lng }}
            onPress={(e) => {
              e.stopPropagation();
              onSelect(l.id);
            }}
            tracksViewChanges={false}
            zIndex={on ? 500 : 1}
            accessibilityLabel={l.name}
          >
            <View style={[styles.pin, { backgroundColor: palette.bg }, on && styles.pinOn]}>
              <CategoryIcon category={cat} size={on ? 26 : 20} color={palette.fg} />
            </View>
          </Marker>
        );
      })}

      {user ? (
        <Marker
          coordinate={{ latitude: user.lat, longitude: user.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={999}
          tracksViewChanges={false}
          accessibilityLabel="me"
        >
          <View style={styles.halo}>
            <View style={styles.me}>
              <Mascot pose="faceHappy" size={34} />
            </View>
          </View>
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
