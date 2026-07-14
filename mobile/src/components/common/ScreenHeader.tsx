import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  accentColor?: string;
  backIcon?: IoniconName;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  accentColor = COLORS.gold,
  backIcon = 'arrow-back',
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.leftSlot}>
        {onBack ? (
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.backButton}
            activeOpacity={0.75}
            onPress={onBack}
          >
            <Ionicons name={backIcon} size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: accentColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightSlot}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  leftSlot: {
    alignItems: 'flex-start',
    minWidth: 44,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  titleWrap: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  rightSlot: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
});
