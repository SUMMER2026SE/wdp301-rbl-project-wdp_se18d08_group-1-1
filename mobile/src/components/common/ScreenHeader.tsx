import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  type DimensionValue,
  type TextStyle,
  View,
} from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type HeaderAlign = 'left' | 'center';
type ProgressVariant = 'bar' | 'accent';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  accentColor?: string;
  backIcon?: IoniconName;
  headerIcon?: IoniconName;
  headerIconColor?: string;
  headerIconBackground?: string;
  titleAlign?: HeaderAlign;
  titleNumberOfLines?: number;
  subtitleNumberOfLines?: number;
  progress?: number;
  progressVariant?: ProgressVariant;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  accentColor = COLORS.gold,
  backIcon = 'chevron-back',
  headerIcon,
  headerIconColor = accentColor,
  headerIconBackground,
  titleAlign = 'left',
  titleNumberOfLines = 1,
  subtitleNumberOfLines = 2,
  progress,
  progressVariant,
}: ScreenHeaderProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const hasProgress = typeof progress === 'number' || progressVariant === 'accent';
  const progressWidth: DimensionValue = typeof progress === 'number'
    ? `${Math.max(0, Math.min(progress, 1)) * 100}%`
    : '100%';
  const textAlignStyle: TextStyle = { textAlign: titleAlign };
  const titleAlignItems = titleAlign === 'center' ? 'center' : 'flex-start';

  useEffect(() => {
    Animated.timing(entrance, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const animatePress = (toValue: number) => {
    Animated.spring(press, {
      damping: 15,
      mass: 0.6,
      stiffness: 260,
      toValue,
      useNativeDriver: true,
    }).start();
  };

  const buttonScale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });

  return (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.leftSlot, !onBack && styles.emptyLeftSlot]}>
        {onBack ? (
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.backButton}
              onPress={onBack}
              onPressIn={() => animatePress(1)}
              onPressOut={() => animatePress(0)}
            >
              <Ionicons name={backIcon} size={24} color={COLORS.textPrimary} />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      <View style={[styles.titleWrap, { alignItems: titleAlignItems }]}>
        <View style={styles.titleRow}>
          {headerIcon ? (
            <View
              style={[
                styles.headerIconWrap,
                { backgroundColor: headerIconBackground ?? `${headerIconColor}22` },
              ]}
            >
              <Ionicons name={headerIcon} size={17} color={headerIconColor} />
            </View>
          ) : null}
          <Text style={[styles.title, textAlignStyle]} numberOfLines={titleNumberOfLines}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, textAlignStyle]} numberOfLines={subtitleNumberOfLines}>
            {subtitle}
          </Text>
        ) : null}
        {hasProgress ? (
          <View style={[styles.progressTrack, progressVariant === 'accent' && styles.progressTrackAccent]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: accentColor, width: progressVariant === 'accent' ? '100%' : progressWidth },
              ]}
            />
          </View>
        ) : null}
      </View>

      {right ? <View style={styles.rightSlot}>{right}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
    paddingHorizontal: 24,
    paddingTop: SPACING.md,
  },
  leftSlot: {
    alignItems: 'flex-start',
    minWidth: 50,
  },
  emptyLeftSlot: {
    display: 'none',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    width: 50,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    maxWidth: '100%',
  },
  headerIconWrap: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  title: {
    color: COLORS.textPrimary,
    flexShrink: 1,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 4,
  },
  progressTrack: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.round,
    height: 3,
    marginTop: SPACING.sm,
    maxWidth: 220,
    overflow: 'hidden',
    width: '78%',
  },
  progressTrackAccent: {
    maxWidth: 180,
    width: 180,
  },
  progressFill: {
    borderRadius: RADIUS.round,
    height: 3,
  },
  rightSlot: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 50,
  },
});
