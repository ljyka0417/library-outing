import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Mascot, type MascotPose } from '@/components/Mascot';
import { BuddyStage } from '@/components/BuddyStage';
import { BUDDY_BG, BUDDY_POSES, buddyName, buddyScenes, buddyTitle, sceneKey, sceneLibrary } from '@/data/buddy';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { useAppStore } from '@/store/useAppStore';
import { useLayout, centered } from '@/hooks/useLayout';
import { useT, type MessageKey } from '@/i18n';
import { colors, radius, spacing, typography, themedStyles } from '@/theme';

type Tab = 'pose' | 'bg' | 'name';

/**
 * 달곰이 꾸미기 — 모습(옷·소품)·배경·이름을 골라 "내 달곰이"를 만든다.
 *
 *  - 모습은 원본 캐릭터 시트의 그림 그대로. 새 그림을 지어내지 않는다.
 *  - 도서관에 다녀올수록("여기 다녀왔어요") 모습이 하나씩 열리고, 다녀온 도서관의 실사진을
 *    배경으로 쓸 수 있다. 칭호도 오른다. 앱 안의 나들이 기록이 꾸미기 재료가 되는 셈이다.
 *  - 저장하면 마이 화면 위쪽의 달곰이가 이 모습이 된다.
 */
export default function DressUpScreen() {
  const { t, lang } = useT();
  const router = useRouter();
  const layout = useLayout();
  const saved = useAppStore((s) => s.buddy);
  const setBuddy = useAppStore((s) => s.setBuddy);
  const visits = useAppStore((s) => s.visits);
  const visitedIds = [...new Set(visits.map((v) => v.libraryId))];
  const count = visits.length;

  const [tab, setTab] = useState<Tab>('pose');
  const [pose, setPose] = useState(BUDDY_POSES.find((p) => p.pose === saved.pose && p.need <= count)?.pose ?? 'hello');
  const [bg, setBg] = useState(saved.bg && (BUDDY_BG[saved.bg] || sceneLibrary(saved.bg)) ? saved.bg : 'mint');
  const [name, setName] = useState(saved.name);
  const [hint, setHint] = useState<string | null>(null);

  const scenes = buddyScenes(visitedIds);
  const sceneLib = sceneLibrary(bg);
  const sceneName = sceneLib ? MOCK_LIBRARIES.find((l) => l.id === sceneLib)?.name : undefined;
  const shown = buddyName(name, lang);

  const save = () => {
    setBuddy({ pose, bg, name: name.trim() });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: t('dress.title') }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingHorizontal: layout.gutter }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={centered(layout, true)}>
          {/* 달곰이 카드 — 무대 + 이름 + 칭호 */}
          <View style={styles.card}>
            <BuddyStage pose={pose} bg={bg} size={210} shape="card" bubble={t(`dress.say.${pose}` as MessageKey)} />
            <View style={styles.cardFoot}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{shown}</Text>
                <View style={styles.rank}>
                  <Ionicons name="ribbon" size={13} color={colors.primary} />
                  <Text style={styles.rankText}>{t(buddyTitle(count) as MessageKey)}</Text>
                </View>
              </View>
              <View style={styles.visitBox}>
                <Text style={styles.visitNum}>{count}</Text>
                <Text style={styles.visitLabel}>{t('dress.visits')}</Text>
              </View>
            </View>
            {sceneName ? <Text style={styles.credit}>{t('dress.sceneCredit', { name: sceneName })}</Text> : null}
          </View>

          {/* 탭 */}
          <View style={styles.tabs}>
            {(['pose', 'bg', 'name'] as Tab[]).map((k) => {
              const on = k === tab;
              return (
                <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>{t(`dress.tab.${k}` as MessageKey)}</Text>
                </Pressable>
              );
            })}
          </View>

          {hint ? (
            <View style={styles.hintBox}>
              <Ionicons name="lock-closed" size={14} color={colors.brown} />
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          ) : null}

          {tab === 'pose' ? (
            <View style={styles.grid}>
              {BUDDY_POSES.map((p) => {
                const open = p.need <= count;
                const on = p.pose === pose;
                return (
                  <Pressable
                    key={p.pose}
                    onPress={() => {
                      if (open) {
                        setPose(p.pose);
                        setHint(null);
                      } else setHint(t('dress.lockedPose', { n: String(p.need - count) }));
                    }}
                    style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: !open }}
                    accessibilityLabel={t(p.label as MessageKey)}
                  >
                    <View style={!open && styles.dim}>
                      <Mascot size={58} pose={p.pose as MascotPose} />
                    </View>
                    {!open ? (
                      <View style={styles.lock}>
                        <Ionicons name="lock-closed" size={12} color={colors.white} />
                        <Text style={styles.lockText}>{p.need}</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.itemText, on && styles.itemTextOn]} numberOfLines={1}>{t(p.label as MessageKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {tab === 'bg' ? (
            <>
              <Text style={styles.label}>{t('dress.bgColor')}</Text>
              <View style={styles.colors}>
                {Object.entries(BUDDY_BG).map(([key, v]) => {
                  const on = key === bg;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => {
                        setBg(key);
                        setHint(null);
                      }}
                      style={[styles.swatch, { backgroundColor: v.color, borderColor: on ? colors.primary : v.deep }]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={t(v.label as MessageKey)}
                    >
                      {on ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{t('dress.bgScene')}</Text>
              <Text style={styles.sub}>{t('dress.bgSceneSub')}</Text>
              <View style={styles.scenes}>
                {scenes.map((s) => {
                  const on = sceneKey(s.libraryId) === bg;
                  const libName = MOCK_LIBRARIES.find((l) => l.id === s.libraryId)?.name ?? '';
                  return (
                    <Pressable
                      key={s.libraryId}
                      onPress={() => {
                        if (s.open) {
                          setBg(sceneKey(s.libraryId));
                          setHint(null);
                        } else setHint(t('dress.lockedScene', { name: libName }));
                      }}
                      style={[styles.scene, on && styles.sceneOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on, disabled: !s.open }}
                      accessibilityLabel={libName}
                    >
                      <Image source={{ uri: s.uri }} style={[styles.sceneImg, !s.open && styles.dim]} />
                      {!s.open ? (
                        <View style={styles.sceneLock}>
                          <Ionicons name="lock-closed" size={16} color={colors.white} />
                        </View>
                      ) : null}
                      <Text style={styles.sceneName} numberOfLines={1}>{libName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {tab === 'name' ? (
            <>
              <TextInput
                value={name}
                onChangeText={(v) => setName(v.slice(0, 10))}
                placeholder={t('dress.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={10}
                returnKeyType="done"
              />
              <Text style={styles.sub}>{t('dress.nameHint')}</Text>
            </>
          ) : null}

          <Pressable onPress={save} style={({ pressed }) => [styles.save, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <Text style={styles.saveText}>{t('dress.save')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  card: {
    alignSelf: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  cardName: {
    ...typography.h3,
    color: colors.text,
  },
  rank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rankText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  visitBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  visitNum: {
    ...typography.h3,
    color: colors.primary,
  },
  visitLabel: {
    ...typography.tiny,
    color: colors.primary,
  },
  credit: {
    ...typography.tiny,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  tabOn: {
    backgroundColor: colors.surface,
  },
  tabText: {
    ...typography.captionBold,
    color: colors.textSub,
  },
  tabTextOn: {
    color: colors.primary,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brownSoft,
    marginBottom: spacing.md,
  },
  hintText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  item: {
    width: '23.5%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  itemOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  dim: {
    opacity: 0.35,
  },
  lock: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.brown,
  },
  lockText: {
    ...typography.tiny,
    color: colors.white,
    fontWeight: '700',
  },
  itemText: {
    ...typography.tiny,
    color: colors.textSub,
    marginTop: 2,
  },
  itemTextOn: {
    color: colors.primary,
    fontWeight: '700',
  },
  label: {
    ...typography.captionBold,
    color: colors.textSub,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sub: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: 4,
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  scenes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  scene: {
    width: '48.5%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  sceneOn: {
    borderColor: colors.primary,
  },
  sceneImg: {
    width: '100%',
    height: 84,
    backgroundColor: colors.surfaceAlt,
  },
  sceneLock: {
    position: 'absolute',
    top: 30,
    alignSelf: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40,30,20,0.6)',
  },
  sceneName: {
    ...typography.tiny,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  save: {
    marginTop: spacing.xxl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveText: {
    ...typography.bodyBold,
    color: colors.white,
  },
}));
