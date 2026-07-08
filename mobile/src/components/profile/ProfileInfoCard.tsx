import { StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/common';
import { colors, spacing } from '@/theme';

export const ProfileInfoCard = ({ rows }: { rows: Array<{ label: string; value?: string | null }> }) => (
  <Card style={styles.card}>
    {rows.map((row) => (
      <View key={row.label} style={styles.row}>
        <AppText color={colors.light.text.secondary}>{row.label}</AppText>
        <AppText>{row.value || 'Not set'}</AppText>
      </View>
    ))}
  </Card>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

