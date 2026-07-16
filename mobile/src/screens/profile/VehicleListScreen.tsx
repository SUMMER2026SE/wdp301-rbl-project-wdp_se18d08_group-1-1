import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { ProfileStackParamList } from '@/navigation/types';
import { vehiclesService } from '@/services/api/vehicles';
import type { Vehicle } from '@/types/models';

type Props = NativeStackScreenProps<ProfileStackParamList, 'VehicleList'>;

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

const STATUS_COLORS: Record<string, string> = {
  approved: COLORS.success,
  pending: COLORS.warning,
  rejected: COLORS.error,
};

const getVehicleId = (vehicle: Vehicle) => vehicle.id || vehicle._id || '';

export const VehicleListScreen = ({ navigation }: Props) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadVehicles = useCallback(async () => {
    setError('');
    try {
      const response = await vehiclesService.getMyVehicles();
      setVehicles(response.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load vehicles.');
      setVehicles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadVehicles();
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => {
    const vehicleId = getVehicleId(item);
    const status = item.status || 'pending';
    const statusColor = STATUS_COLORS[status] ?? COLORS.textMuted;
    const description = [item.brand, item.model].filter(Boolean).join(' ') || item.vehicleType || 'Vehicle';

    return (
      <Pressable
        accessibilityRole="button"
        style={styles.vehicleCard}
        onPress={() => navigation.navigate('EditVehicle', { vehicleId })}
      >
        <View style={styles.vehicleIconWrap}>
          <Ionicons name={item.vehicleType === 'electric_car' ? 'flash-outline' : 'car-outline'} size={24} color={COLORS.gold} />
        </View>
        <View style={styles.vehicleBody}>
          <View style={styles.vehicleTop}>
            <Text style={styles.plate}>{item.licensePlate}</Text>
            {item.isDefault ? <Text style={styles.defaultBadge}>Default</Text> : null}
          </View>
          <Text style={styles.vehicleMeta} numberOfLines={1}>
            {description}{item.color ? ` - ${item.color}` : ''}
          </Text>
          <View style={styles.vehicleFooter}>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[status] ?? status}
              </Text>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: item.hexColor || '#ffffff' }]} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader
        title="My vehicles"
        subtitle={`${vehicles.length} vehicles`}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.75}
            style={styles.addButton}
            onPress={() => navigation.navigate('AddVehicle')}
          >
            <Ionicons name="add" size={20} color={COLORS.textInverse} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadVehicles} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={vehicles}
          keyExtractor={(item, index) => getVehicleId(item) || String(index)}
          ListEmptyComponent={
            <EmptyState
              icon="car-outline"
              title="No vehicles yet"
              message="Add a vehicle for faster booking and automatic check-in."
              actionLabel="Add vehicle"
              onAction={() => navigation.navigate('AddVehicle')}
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
          }
          renderItem={renderVehicle}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.round,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stateWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  vehicleCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  vehicleIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  vehicleBody: {
    flex: 1,
    gap: 6,
  },
  vehicleTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  plate: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    letterSpacing: 1,
  },
  defaultBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: RADIUS.round,
    color: COLORS.gold,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  vehicleMeta: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  vehicleFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  statusDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  colorSwatch: {
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    height: 22,
    width: 22,
  },
});
