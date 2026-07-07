import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

import { AppText, Button, Input, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/hooks/useToast';
import type { ProfileStackParamList } from '@/navigation/types';
import { vehiclesService } from '@/services/api/vehicles';
import { colors } from '@/theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditVehicle'>;

export const EditVehicleScreen = ({ navigation, route }: Props) => {
  const toast = useToast();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const response = await vehiclesService.getVehicleById(route.params.vehicleId);
        if (response.data) {
          setBrand(response.data.brand);
          setModel(response.data.model);
          setColor(response.data.color);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadVehicle();
  }, [route.params.vehicleId]);

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await vehiclesService.updateVehicle(route.params.vehicleId, {
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim(),
      });
      toast.showSuccess('Vehicle updated');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Vehicle update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async () => {
    setSaving(true);
    try {
      await vehiclesService.setDefaultVehicle(route.params.vehicleId);
      toast.showSuccess('Default vehicle updated');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingSpinner />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="h1">Edit Vehicle</AppText>
      <Input label="Brand" onChangeText={setBrand} value={brand} />
      <Input label="Model" onChangeText={setModel} value={model} />
      <Input label="Color" onChangeText={setColor} value={color} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={saving} title="Save" onPress={handleSubmit} />
      <Button loading={saving} title="Set Default" variant="outline" onPress={handleSetDefault} />
    </Screen>
  );
};
