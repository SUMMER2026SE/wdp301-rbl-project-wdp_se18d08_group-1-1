import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/common';
import { borderRadius, colors, spacing } from '@/theme';
import type { Service } from '@/types/booking.types';
import { formatCurrency } from '@/utils/formatters';

interface ServiceCardProps {
  service: Service;
  selected: boolean;
  onToggle: () => void;
  isFree?: boolean;
}

export const ServiceCard = ({ service, selected, onToggle, isFree = false }: ServiceCardProps) => (
  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onToggle}>
    <Card style={[styles.card, selected && styles.selected]}>
      {service.imageUrl || service.image ? (
        <Image source={{ uri: service.imageUrl || service.image }} style={styles.image} />
      ) : null}
      <View style={styles.content}>
        <AppText variant="h3">{service.name}</AppText>
        {service.description ? (
          <AppText color={colors.light.text.secondary} variant="body2">
            {service.description}
          </AppText>
        ) : null}
        <View style={styles.row}>
          <AppText color={isFree ? colors.success.main : colors.primary[600]} variant="body2">
            {isFree ? 'FREE' : formatCurrency(service.price)}
          </AppText>
          <AppText color={colors.light.text.secondary} variant="caption">
            {service.estimatedTimeMinutes || service.estimatedTime || 0} min
          </AppText>
        </View>
      </View>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <AppText color={colors.light.text.inverse}>✓</AppText> : null}
      </View>
    </Card>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  selected: {
    borderColor: colors.primary[500],
  },
  image: {
    borderRadius: borderRadius.md,
    height: 72,
    width: 72,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.light.border,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
});
