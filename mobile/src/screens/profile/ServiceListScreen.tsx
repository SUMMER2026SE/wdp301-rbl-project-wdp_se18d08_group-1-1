import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { ProfileStackParamList } from '@/navigation/types';
import serviceService from '@/services/ServiceService';
import type { Service } from '@/types/booking.types';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Services'>;

const getServiceDuration = (service: Service) => service.estimatedTimeMinutes ?? service.estimatedTime ?? 0;

export const ServiceListScreen = ({ navigation }: Props) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadServices = useCallback(async () => {
    setError('');
    try {
      const response = await serviceService.getActiveServices();
      setServices(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách dịch vụ.');
      setServices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadServices();
  };

  const renderService = ({ item }: { item: Service }) => {
    const image = item.imageUrl || item.image;
    const duration = getServiceDuration(item);

    return (
      <View style={styles.serviceCard}>
        {image ? (
          <Image source={{ uri: image }} style={styles.serviceImage} />
        ) : (
          <View style={styles.serviceIcon}>
            <Ionicons name="sparkles-outline" size={26} color={COLORS.gold} />
          </View>
        )}
        <View style={styles.serviceBody}>
          <View style={styles.serviceTop}>
            <Text style={styles.serviceName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.servicePrice}>{formatCurrency(item.price)}</Text>
          </View>
          {item.description ? (
            <Text style={styles.serviceDescription} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{duration > 0 ? `${duration} phút` : 'Theo lịch'}</Text>
            </View>
            <View style={styles.metaPill}>
              <View style={styles.statusDot} />
              <Text style={styles.metaText}>Đang cung cấp</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader
        title="Dịch vụ"
        subtitle={`${services.length} dịch vụ`}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadServices} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={services}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          ListEmptyComponent={
            <EmptyState
              icon="sparkles-outline"
              title="Chưa có dịch vụ"
              message="Danh sách dịch vụ sẽ được cập nhật khi bãi xe mở thêm tiện ích."
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
          }
          renderItem={renderService}
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
  stateWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  serviceCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  serviceImage: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    height: 76,
    width: 76,
  },
  serviceIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: RADIUS.md,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  serviceBody: {
    flex: 1,
    gap: SPACING.sm,
  },
  serviceTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  serviceName: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    lineHeight: 22,
  },
  servicePrice: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
  },
  serviceDescription: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.round,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  statusDot: {
    backgroundColor: COLORS.success,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
});
