import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { vehiclesService } from '@/services/api/vehicles';
import { spacing } from '@/theme';
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
            <Card style={styles.item}>
              <AppText variant="h3">{item.licensePlate}</AppText>
              <AppText>{`${item.brand} ${item.model} - ${item.color}`}</AppText>
              <AppText variant="caption">{item.isDefault ? 'Default vehicle' : item.vehicleType}</AppText>
              <Button
                title="Edit"
                variant="outline"
                onPress={() => navigation.navigate('EditVehicle', { vehicleId: item.id || item._id || '' })}
              />
            </Card>
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
});
