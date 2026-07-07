import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/hooks/useToast';
import { vehiclesService } from '@/services/api/vehicles';
import { colors } from '@/theme';
import type { VehicleType } from '@/types/models';
import { isValidLicensePlate } from '@/utils/validation';

export const AddVehicleScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const toast = useToast();
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!isValidLicensePlate(licensePlate)) {
      setError('Enter a valid license plate.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await vehiclesService.addVehicle({
        licensePlate: licensePlate.trim().toUpperCase(),
        vehicleType,
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim(),
      });
      toast.showSuccess('Vehicle added');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add vehicle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <AppText variant="h1">Add Vehicle</AppText>
      <Input label="License plate" onChangeText={setLicensePlate} value={licensePlate} />
      <Input label="Vehicle type" onChangeText={(value) => setVehicleType(value as VehicleType)} value={vehicleType} />
      <Input label="Brand" onChangeText={setBrand} value={brand} />
      <Input label="Model" onChangeText={setModel} value={model} />
      <Input label="Color" onChangeText={setColor} value={color} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Add Vehicle" onPress={handleSubmit} />
    </Screen>
  );
};
