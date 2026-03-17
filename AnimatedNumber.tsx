/**
 * SwipeableTaskItem
 * 
 * Task item with swipe gestures:
 * - Swipe right → Complete
 * - Swipe left → Delete
 */

import React, { useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import AppText from './AppText';
import Avatar from './Avatar';
import { useAppTheme } from '../theme/ThemeProvider';
import { tokens } from '../../config/tokens';
import { resolveColor } from '../../viewModels/resolveColor';

function SwipeableTaskItem({
  task,
  onComplete,
  onDelete,
  onPress,
  assignedUser,
  dotColorKey,
  overdueLabel,
}: { task: { text: string; completed?: boolean }; onComplete?: () => void; onDelete?: () => void; onPress?: () => void; assignedUser?: { name: string; color: string } | null; dotColorKey: string; overdueLabel?: string | null }) {
  const { theme } = useAppTheme();
  const swipeableRef = useRef<any>(null);

  // Right swipe action (Complete)
  const renderRightActions = (_progress: Animated.Value, dragX: Animated.Value) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={() => {
          swipeableRef.current?.close();
          onComplete?.();
        }}
        style={[styles.rightAction, { backgroundColor: theme.success }]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Feather name="check" size={24} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Left swipe action (Delete)
  const renderLeftActions = (_progress: Animated.Value, dragX: Animated.Value) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete?.();
        }}
        style={[styles.leftAction, { backgroundColor: theme.error }]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Feather name="trash-2" size={24} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      rightThreshold={40}
      leftThreshold={40}
    >
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.taskItem, { backgroundColor: theme.bg.card }]}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, { backgroundColor: resolveColor(dotColorKey, theme) }]} />
        
        <View style={styles.taskContent}>
          <AppText
            variant="body"
            style={[
              styles.taskText,
              task.completed && styles.completedText,
              task.completed && { color: theme.text.tertiary },
            ]}
            numberOfLines={1}
          >
            {task.text}
          </AppText>
          
          {overdueLabel && (
            <AppText style={[styles.overdueLabel, { color: theme.error }]}>
              {overdueLabel}
            </AppText>
          )}
        </View>

        {assignedUser && (
          <Avatar
            name={assignedUser.name}
            color={assignedUser.color}
            size={24}
            style={styles.avatar}
          />
        )}

        <Feather name="chevron-right" size={16} color={theme.text.tertiary} />
      </TouchableOpacity>
    </Swipeable>
  );
}

const MemoSwipeableTaskItem = React.memo(SwipeableTaskItem);
MemoSwipeableTaskItem.displayName = 'SwipeableTaskItem';

export default MemoSwipeableTaskItem;

const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: tokens.radius.xl,
    marginBottom: tokens.space.sm,
    ...tokens.shadow.sm,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 14,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  taskText: {
    flex: 1,
    fontSize: 15,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  overdueLabel: {
    fontSize: tokens.type.size.xs,
    fontWeight: tokens.type.weight.semi,
  },
  avatar: {
    marginLeft: tokens.space.md,
  },
  rightAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderTopRightRadius: tokens.radius.xl,
    borderBottomRightRadius: tokens.radius.xl,
    marginBottom: tokens.space.sm,
  },
  leftAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderTopLeftRadius: tokens.radius.xl,
    borderBottomLeftRadius: tokens.radius.xl,
    marginBottom: tokens.space.sm,
  },
});
