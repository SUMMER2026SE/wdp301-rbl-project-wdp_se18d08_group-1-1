import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { vehiclesService } from '@/services/api/vehicles';
import { borderRadius, colors, spacing } from '@/theme';
import type { Vehicle } from '@/types/models';

type VehicleNavigation = {
  navigate: (route: 'AddVehicle' | 'EditVehicle', params?: { vehicleId: string }) => void;
};

export const VehicleListScreen = ({ navigation }: { navigation: VehicleNavigation }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vehiclesService.getMyVehicles();
      setVehicles(response.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="h1">Vehicles</AppText>
        <Button title="Add" onPress={() => navigation.navigate('AddVehicle')} />
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('EditVehicle', { vehicleId: item.id || item._id || '' })}>
              <Card style={styles.item}>
                <View style={styles.row}>
                  <AppText variant="h3">{item.licensePlate}</AppText>
                  {item.isDefault ? <AppText style={styles.defaultBadge}>Default</AppText> : null}
                </View>
                <AppText>{`${item.brand} ${item.model} - ${item.color}`}</AppText>
                <View style={styles.row}>
                  <AppText color={getStatusColor(item.status)} variant="caption">
                    {item.status || 'pending'}
                  </AppText>
                  <View style={[styles.swatch, { backgroundColor: item.hexColor || '#ffffff' }]} />
                </View>
                <AppText variant="caption">{item.modelUrl ? '3D model available' : item.vehicleType}</AppText>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  defaultBadge: {
    backgroundColor: colors.success.light,
    borderRadius: borderRadius.sm,
    color: colors.success.dark,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  swatch: {
    borderColor: colors.light.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    width: 20,
  },
});

const getStatusColor = (status?: string) => {
  if (status === 'approved') return colors.success.main;
  if (status === 'rejected') return colors.error.main;
  return colors.warning.dark;
};
