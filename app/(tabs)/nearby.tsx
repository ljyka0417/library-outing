import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { TabScreen } from '@/components/TabScreen';
import { NearbyMap, type NearbyMapHandle } from '@/components/NearbyMap';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Mascot } from '@/components/Mascot';
import { CATEGORY_MAP } from '@/data/categories';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { useLayout, navKind } from '@/hooks/useLayout';
import { useT, type MessageKey } from '@/i18n';
import { libText } from '@/i18n/libraryText';
import { distanceMeters } from '@/utils/geo';
import { formatDistance, isOpenNow, walkingMinutes } from '@/utils/openingHours';
import { categoryColors, colors, radius, shadow, spacing, typography, themedStyles } from '@/theme';
import type { Coordinates, Library } from '@/types';

/**
 * 내 주변 — 지도 위에 나(달곰이)와 도서관 127곳, 아래에 가까운 순 카드.
 *
 * 위치는 이 화면을 보는 동안만 따라간다(다른 탭으로 가면 멈춘다 — 배터리). 위치는 기기 안에서만
 * 거리를 재는 데 쓰고 어디에도 보내지 않는다. 허락하지 않았으면 전국 지도와 "내 위치 켜기" 안내.
 *
 * 카드를 옆으로 넘기면 지도가 그 도서관으로 가고, 핀을 누르면 카드가 그 도서관으로 넘어간다.
 */
type Perm = 'unknown' | 'ask' | 'denied' | 'granted';
const LIBS = MOCK_LIBRARIES.filter((l) => l.coords);
/** 이 안이면 걸어서 몇 분, 밖이면 거리만 */
const WALKABLE = 3000;

export default function NearbyScreen() {
  const router = useRouter();
  const { t, lang } = useT();
  const layout = useLayout();
  const tabPad = useTabBarPadding();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const map = useRef<NearbyMapHandle>(null);
  const list = useRef<FlatList<Row>>(null);

  const [perm, setPerm] = useState<Perm>('unknown');
  const [me, setMe] = useState<Coordinates | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const centeredOnce = useRef(false);
  /*
   * 내 위치 따라가기. 내 위치 단추를 누르면 켜지고, 그 뒤로 걸어가면 지도가 따라온다.
   * 지도를 손으로 끌거나 도서관을 고르면 멈춘다(보려던 곳을 빼앗지 않게). ref 는 위치 콜백이 읽는 값.
   */
  const [follow, setFollowState] = useState(false);
  const following = useRef(false);
  const setFollow = (on: boolean) => {
    following.current = on;
    setFollowState(on);
  };

  // 처음 들어왔을 때 이미 허락했는지
  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then((p) =>
      setPerm(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'denied')
    );
  }, []);

  // 보는 동안만 위치를 따라간다
  useFocusEffect(
    useCallback(() => {
      if (perm !== 'granted') return;
      let sub: Location.LocationSubscription | undefined;
      let alive = true;
      const got = (pos: Location.LocationObject | null) => {
        if (!alive || !pos) return;
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMe(c);
        // 처음 한 번만 내 자리로 — 그 뒤로는 사람이 지도를 옮겨 둔 대로 둔다
        // 우리나라 밖(해외·가상 폰 기본 위치 미국)이면 바다 한가운데로 가지 않고 전국 지도 그대로
        const inKorea = c.lat > 33 && c.lat < 39 && c.lng > 124 && c.lng < 132;
        if (following.current) {
          // 처음 따라가기를 켰을 때는 동네가 보이게 확대, 그 뒤로는 확대는 두고 가운데만
          if (!centeredOnce.current) map.current?.focus(c, 0.02);
          else map.current?.center(c);
          centeredOnce.current = true;
        } else if (!centeredOnce.current && inKorea) {
          centeredOnce.current = true;
          map.current?.focus(c, 0.06);
        }
      };
      /*
       * 따라가기는 위치가 **바뀔 때** 알려 준다. 가만히 있거나 실내라 새 위치가 늦으면 한참 아무것도
       * 안 와서 화면이 빈 채로 있었다(안드로이드 가상 폰에서 봤다). 마지막으로 알던 자리를 먼저 쓴다.
       */
      void Location.getLastKnownPositionAsync().then(got).catch(() => {});
      // 걸으며 따라가도 어색하지 않게 10m 마다 (이 화면을 보는 동안만 켜져 있다)
      void Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10 }, got).then((s) => {
        if (alive) sub = s;
        else s.remove();
      });
      return () => {
        alive = false;
        sub?.remove();
      };
    }, [perm])
  );

  const askPermission = async () => {
    const p = await Location.requestForegroundPermissionsAsync();
    setPerm(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'denied');
    return p.granted;
  };

  // 내 위치 단추 — 권한이 없으면 묻고(거절했으면 설정으로), 있으면 내 자리로 가서 따라가기
  const locateMe = async () => {
    if (perm === 'denied') return void Linking.openSettings();
    if (perm !== 'granted' && !(await askPermission())) return;
    setFollow(true);
    if (me) {
      map.current?.focus(me, 0.02);
      centeredOnce.current = true;
    } else {
      // 아직 위치를 모르면 다음에 잡히는 위치에서 확대한다 (got 이 처리)
      centeredOnce.current = false;
    }
  };

  // 가까운 순 (위치를 모르면 이름 순)
  const rows: Row[] = useMemo(() => {
    const withDist = LIBS.map((l) => ({ lib: l, dist: me ? distanceMeters(me, l.coords!) : null }));
    return me ? withDist.sort((a, b) => a.dist! - b.dist!) : withDist.sort((a, b) => a.lib.name.localeCompare(b.lib.name, 'ko'));
  }, [me]);
  const nearCount = me ? rows.filter((r) => r.dist! <= 5000).length : 0;

  // 카드 폭 — 폰은 다음 카드가 살짝 보이게, 태블릿은 고정 폭
  const cardW = Math.min(360, width - layout.gutter * 2 - 44);
  const gap = spacing.md;

  const select = (id: string, from: 'map' | 'list') => {
    setSelected(id);
    setFollow(false);
    const i = rows.findIndex((r) => r.lib.id === id);
    const lib = rows[i]?.lib;
    if (lib?.coords) map.current?.focus(lib.coords, 0.03);
    if (from === 'map' && i >= 0) list.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0 });
  };

  // 위치를 아직 모를 때도 카드는 보여 준다(이름 순) — 빈 지도만 덩그러니 남지 않게
  const showCards = true;

  /*
   * 지도는 화면 끝까지 — 상태 표시줄과 탭바 밑까지 깔고, 그 위에 유리 탭바·카드가 뜬다(애플 지도 앱 모양).
   * 그래서 지도는 TabScreen(안전 영역 틀) 바깥에 두고, 틀은 손가락을 지도로 흘려보낸다(overlay).
   * 애플 로고·법적 고지는 가리면 안 되므로 상태 표시줄·탭바만큼 안쪽으로.
   */
  const mapPadding = {
    top: insets.top,
    left: 0,
    right: 0,
    bottom: insets.bottom + (navKind(width) === 'bottom' ? 56 : 0),
  };

  return (
    <View style={styles.safe}>
      <NearbyMap
        ref={map}
        libraries={LIBS}
        user={me}
        selectedId={selected}
        onSelect={(id) => select(id, 'map')}
        padding={mapPadding}
        onUserPan={() => following.current && setFollow(false)}
      />
      <TabScreen style={styles.mapWrap} overlay>

        {/* 위: 제목 */}
        <View style={[styles.top, { paddingHorizontal: layout.gutter }]} pointerEvents="box-none">
          <View style={styles.titlePill}>
            <Text style={styles.title}>{t('tab.nearby')}</Text>
            <Text style={styles.sub}>
              {me ? t('nearby.count', { n: nearCount }) : t('nearby.all', { n: LIBS.length })}
            </Text>
          </View>
        </View>

        {/* 아래: 위치 안내 또는 가까운 순 카드 */}
        <View style={[styles.bottom, { paddingBottom: tabPad + spacing.sm }]} pointerEvents="box-none">
          {/* 내 위치 단추 — 카드 바로 위 오른쪽. 따라가는 중이면 민트로 채운다 */}
          <View style={[styles.locateRow, { paddingHorizontal: layout.gutter }]} pointerEvents="box-none">
            <Pressable
              onPress={() => void locateMe()}
              style={({ pressed }) => [styles.locate, follow && styles.locateOn, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel={t('nearby.locate')}
              accessibilityState={{ selected: follow }}
              hitSlop={6}
            >
              <Ionicons name={follow ? 'locate' : 'locate-outline'} size={24} color={follow ? colors.white : colors.text} />
            </Pressable>
          </View>
          {perm === 'ask' || perm === 'denied' ? (
            <View style={[styles.permCard, { marginHorizontal: layout.gutter }]}>
              <Mascot pose="map" size={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.permTitle}>{t(perm === 'ask' ? 'nearby.permTitle' : 'nearby.deniedTitle')}</Text>
                <Text style={styles.permBody}>{t(perm === 'ask' ? 'nearby.permBody' : 'nearby.deniedBody')}</Text>
                <Pressable
                  onPress={perm === 'ask' ? askPermission : () => void Linking.openSettings()}
                  style={({ pressed }) => [styles.permButton, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.permButtonText}>{t(perm === 'ask' ? 'nearby.permButton' : 'nearby.openSettings')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {showCards ? (
            <FlatList
              ref={list}
              data={rows}
              keyExtractor={(r) => r.lib.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardW + gap}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: layout.gutter, gap }}
              getItemLayout={(_, index) => ({ length: cardW + gap, offset: (cardW + gap) * index, index })}
              onMomentumScrollEnd={(e) => {
                const i = Math.round(e.nativeEvent.contentOffset.x / (cardW + gap));
                const r = rows[Math.max(0, Math.min(rows.length - 1, i))];
                if (r && r.lib.id !== selected) select(r.lib.id, 'list');
              }}
              initialNumToRender={6}
              renderItem={({ item }) => (
                <NearCard
                  row={item}
                  width={cardW}
                  selected={item.lib.id === selected}
                  lang={lang}
                  onPress={() => router.push(`/library/${item.lib.id}`)}
                  t={t}
                />
              )}
            />
          ) : null}
        </View>
      </TabScreen>
    </View>
  );
}

interface Row {
  lib: Library;
  dist: number | null;
}

function NearCard({
  row,
  width,
  selected,
  lang,
  onPress,
  t,
}: {
  row: Row;
  width: number;
  selected: boolean;
  lang: Parameters<typeof libText>[1];
  onPress: () => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  const { lib, dist } = row;
  const palette = categoryColors[lib.categories[0]] ?? { bg: colors.surfaceAlt, fg: colors.textSub };
  const cat = CATEGORY_MAP[lib.categories[0]] ?? { icon: 'library' };
  const open = isOpenNow(lib.hours);
  const how =
    dist === null
      ? libText(lib.region.sigungu ?? lib.region.sido, lang)
      : dist <= WALKABLE
        ? `${t('nearby.walk', { n: walkingMinutes(dist) })} · ${formatDistance(dist)}`
        : formatDistance(dist);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { width }, selected && styles.cardOn, pressed && { opacity: 0.85 }]}>
      <View style={[styles.cardIcon, { backgroundColor: palette.bg }]}>
        <CategoryIcon category={cat} size={30} color={palette.fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.cardName} numberOfLines={1}>
          {lib.name}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {how}
        </Text>
        {open !== null ? (
          <Text style={[styles.cardOpen, { color: open ? colors.open : colors.textMuted }]}>{t(open ? 'badge.open' : 'badge.closed')}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.background },
  mapWrap: { flex: 1 },
  top: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titlePill: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadow.card,
  },
  title: { ...typography.bodyBold, color: colors.text },
  sub: { ...typography.tiny, color: colors.textSub },
  locateRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  locateOn: { backgroundColor: colors.primary },
  locate: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: spacing.sm },
  permCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  permTitle: { ...typography.bodyBold, color: colors.text },
  permBody: { ...typography.caption, color: colors.textSub },
  permButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  permButtonText: { ...typography.captionBold, color: colors.white },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.card,
  },
  cardOn: { borderColor: colors.primary },
  cardIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardName: { ...typography.bodyBold, color: colors.text },
  cardSub: { ...typography.caption, color: colors.textSub },
  cardOpen: { ...typography.tiny, fontWeight: '700' },
}));
