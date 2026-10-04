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
      void Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 25 }, (pos) => {
        if (!alive) return;
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMe(c);
        // 처음 한 번만 내 자리로 — 그 뒤로는 사람이 지도를 옮겨 둔 대로 둔다
        if (!centeredOnce.current) {
          centeredOnce.current = true;
          map.current?.focus(c, 0.06);
        }
      }).then((s) => {
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
    const i = rows.findIndex((r) => r.lib.id === id);
    const lib = rows[i]?.lib;
    if (lib?.coords) map.current?.focus(lib.coords, 0.03);
    if (from === 'map' && i >= 0) list.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0 });
  };

  const showCards = perm === 'granted' ? !!me : true;

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
      />
      <TabScreen style={styles.mapWrap} overlay>

        {/* 위: 제목 + 내 위치로 */}
        <View style={[styles.top, { paddingHorizontal: layout.gutter }]} pointerEvents="box-none">
          <View style={styles.titlePill}>
            <Text style={styles.title}>{t('tab.nearby')}</Text>
            <Text style={styles.sub}>
              {me ? t('nearby.count', { n: nearCount }) : t('nearby.all', { n: LIBS.length })}
            </Text>
          </View>
          {me ? (
            <Pressable
              onPress={() => map.current?.focus(me, 0.04)}
              style={({ pressed }) => [styles.locate, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('nearby.locate')}
            >
              <Ionicons name="navigate" size={20} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        {/* 아래: 위치 안내 또는 가까운 순 카드 */}
        <View style={[styles.bottom, { paddingBottom: tabPad + spacing.sm }]} pointerEvents="box-none">
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
  locate: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
