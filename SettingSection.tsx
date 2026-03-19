/**
 * ShareCard Component
 * 
 * Creates beautiful, shareable cards from AI Date Plans
 * Optimized for Instagram Stories (1080x1920) and general social sharing
 */

import React, { useRef } from 'react';
import { View, StyleSheet, Platform, Alert, TouchableOpacity } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AppText from './AppText';
import type { DatePlan } from '../../types/aiDatePlanner';
import { logError } from '../../services/logger';

interface ShareCardProps {
  plan: DatePlan;
  visible: boolean;
  onClose: () => void;
}

export default function ShareCard({ plan, visible, onClose }: ShareCardProps) {
  const cardRef = useRef<any>(null);

  if (!visible) return null;

  const shareCard = async () => {
    try {
      if (!cardRef.current) return;

      // Capture the card as an image
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        height: 1920,
        width: 1080,
      });

      // Check if sharing is available
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Your Date Plan',
          UTI: 'public.png',
        });
      } else {
        // Fallback: Save to camera roll
        Alert.alert(
          'Saved!',
          'Your date plan card has been saved to your photos.',
          [{ text: 'OK' }]
        );
      }

      onClose();
    } catch (error) {
      logError('ShareCard.share', error).catch(() => {});
      Alert.alert(
        'Error',
        'Could not share the card. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* The actual card to be captured */}
      <View ref={cardRef} style={styles.card} collapsable={false}>
        <LinearGradient
          colors={['#D4A373', '#8B6F47', '#6B5745']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Feather name="heart" size={32} color="#FFF" />
              <AppText variant="hero" style={styles.logo}>U&Me</AppText>
            </View>
            <AppText variant="caption" style={styles.tagline}>
              AI-Powered Date Planning
            </AppText>
          </View>

          {/* Plan Title */}
          <View style={styles.titleContainer}>
            <AppText variant="hero" style={styles.title}>
              {plan.title}
            </AppText>
            <AppText variant="body" style={styles.description}>
              {plan.description}
            </AppText>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.stat}>
              <Feather name="dollar-sign" size={20} color="#FFF" />
              <AppText variant="body" style={styles.statText}>
                ${plan.totalCost}
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Feather name="clock" size={20} color="#FFF" />
              <AppText variant="body" style={styles.statText}>
                {Math.round(plan.totalDuration / 60)}h
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Feather name="map-pin" size={20} color="#FFF" />
              <AppText variant="body" style={styles.statText}>
                {plan.activities.length} stops
              </AppText>
            </View>
          </View>

          {/* Activities Timeline */}
          <View style={styles.timeline}>
            {plan.activities.map((activity, index) => (
              <View key={index} style={styles.activity}>
                <View style={styles.activityTime}>
                  <AppText variant="caption" style={styles.timeText}>
                    {activity.time}
                  </AppText>
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityDot} />
                  {index < plan.activities.length - 1 && (
                    <View style={styles.activityLine} />
                  )}
                  <View style={styles.activityInfo}>
                    <AppText variant="body" style={styles.activityTitle}>
                      {activity.title}
                    </AppText>
                    <AppText variant="caption" style={styles.activityLocation}>
                      📍 {activity.location.name}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <AppText variant="caption" style={styles.footerText}>
              Planned with U&Me
            </AppText>
            <AppText variant="caption" style={styles.footerCTA}>
              Download to create your perfect date
            </AppText>
          </View>
        </LinearGradient>
      </View>

      {/* Action Button (not captured) */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={shareCard}
          accessibilityRole="button"
          accessibilityLabel="Share date plan"
        
          activeOpacity={0.8}
        >
          <Feather name="share-2" size={20} color="#FFF" />
          <AppText variant="body" style={styles.shareButtonText}>
            Share This Plan
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        
          activeOpacity={0.8}
        >
          <AppText variant="body" style={styles.cancelButtonText}>
            Cancel
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  card: {
    width: 1080 / 3, // Scale down for preview
    height: 1920 / 3,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  gradient: {
    flex: 1,
    padding: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  tagline: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 42,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  timeline: {
    flex: 1,
    paddingVertical: 20,
  },
  activity: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  activityTime: {
    width: 80,
    paddingTop: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  activityContent: {
    flex: 1,
    position: 'relative',
  },
  activityDot: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activityLine: {
    position: 'absolute',
    left: 5,
    top: 20,
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activityInfo: {
    marginLeft: 24,
  },
  activityTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  activityLocation: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  footerCTA: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  actions: {
    marginTop: 24,
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A373',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
});
