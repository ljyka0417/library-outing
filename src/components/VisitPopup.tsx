import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Mascot } from './Mascot';
import { MODAL_ORIENTATIONS } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { colors, radius, shadow, spacing, typography, themedStyles } from '@/theme';

interface Props {
  visible: boolean;
  /** 이번에 새로 기록했으면 true, 오늘 이미 기록돼 있었으면 false */
  fresh: boolean;
  libraryName: string;
  /** 지금까지 다녀온 서로 다른 도서관 수 */
  count: number;
  onClose: () => void;
}

/** 저절로 닫히기까지 (ms). 버튼을 눌러 바로 닫을 수도 있다 */
const AUTO_CLOSE = 2600;

/**
 * "여기 다녀왔어요" 를 눌렀을 때 뜨는 창.
 * 걷는 달곰이가 톡 튀어 오르고, 지금까지 몇 곳을 다녀왔는지 알려 준다.
 */
export function VisitPopup({ visible, fresh, libraryName, count, onClose }: Props) {
  const { t } = useT();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    const timer = setTimeout(onClose, AUTO_CLOSE);
    return () => clearTimeout(timer);
  }, [visible, pop, onClose]);

  const mascotStyle = {
    transform: [
      { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
      { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
    ],
  };
  const cardStyle = {
    opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={MODAL_ORIENTATIONS}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('visit.close')}>
        <Animated.View style={[styles.card, cardStyle]} accessibilityRole="alert">
          <Animated.View style={mascotStyle}>
            <Mascot pose="walk" size={112} />
          </Animated.View>
          <Text style={styles.title}>{fresh ? t('visit.title') : t('visit.againTitle')}</Text>
          <Text style={styles.body}>
            {fresh ? t('visit.body', { name: libraryName }) : t('visit.againBody', { name: libraryName })}
          </Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{t('visit.count', { n: String(count) })}</Text>
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
            <Text style={styles.buttonText}>{t('visit.ok')}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,26,22,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSub,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  countPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  countText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
}));
