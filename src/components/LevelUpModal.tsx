import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE, SPACING, TYPOGRAPHY, RADIUS, SHADOW } from '../ui/theme/tokens';

interface LevelData {
  level: number;
  title: string;
}

interface Props {
  visible: boolean;
  levelData: LevelData | null;
  onClose: () => void;
}

export default function LevelUpModal({ visible, levelData, onClose }: Props): JSX.Element {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.7, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      scale.setValue(0.7);
      opacity.setValue(0);
      onClose();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <LinearGradient
            colors={[PALETTE.indigo600, PALETTE.purple600]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.levelUpLabel}>LEVEL UP!</Text>
            <Text style={styles.levelNum}>Level {levelData?.level ?? ''}</Text>
            <Text style={styles.title}>{levelData?.title ?? ''}</Text>
            <Text style={styles.subtitle}>
              You're getting better at staying connected.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleClose} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Keep going 🚀</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.lg,
  },
  gradient: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emoji: { fontSize: 56, marginBottom: SPACING.sm },
  levelUpLabel: {
    ...TYPOGRAPHY.label,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3,
  },
  levelNum: { ...TYPOGRAPHY.hero, color: PALETTE.white },
  title: { ...TYPOGRAPHY.heading, color: PALETTE.white, textAlign: 'center' },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  button: {
    marginTop: SPACING.xl,
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
  },
  buttonText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.indigo600 },
});
