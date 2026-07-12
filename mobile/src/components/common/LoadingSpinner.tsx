import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

export const LoadingSpinner = () => (
  <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={styles.container}>
    <ActivityIndicator color={colors.primary[500]} size="large" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
