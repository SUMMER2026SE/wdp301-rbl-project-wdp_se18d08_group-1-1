import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/hooks/useToast';
import { vehiclesService } from '@/services/api/vehicles';
import { colors } from '@/theme';
import type { VehicleType } from '@/types/models';
import { isValidNormalizedLicensePlate, normalizeLicensePlate } from '@/utils/profileValidation';

export const AddVehicleScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const toast = useToast();
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [nickname, setNickname] = useState('');
  const [hexColor, setHexColor] = useState('#ffffff');
  const [registrationCardImage, setRegistrationCardImage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!isValidNormalizedLicensePlate(normalizedPlate)) {
      setError('Enter a valid license plate.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await vehiclesService.addVehicle({
        licensePlate: normalizedPlate,
        vehicleType,
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim(),
        nickname: nickname.trim(),
        hexColor,
        registrationCardImage,
      });
      toast.showSuccess('Vehicle added');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add vehicle.');
    } finally {
      setLoading(false);
    }
  };

  const pickRegistrationCard = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setRegistrationCardImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  return (
    <Screen scrollable>
      <AppText variant="h1">Add Vehicle</AppText>
      <Input autoCapitalize="characters" label="License plate" onChangeText={setLicensePlate} value={licensePlate} />
      <Input label="Vehicle type" onChangeText={(value) => setVehicleType(value as VehicleType)} placeholder="car or electric_car" value={vehicleType} />
      <Input label="Brand" onChangeText={setBrand} value={brand} />
      <Input label="Model" onChangeText={setModel} value={model} />
      <Input label="Color" onChangeText={setColor} value={color} />
      <Input label="Nickname" onChangeText={setNickname} value={nickname} />
      <Input label="Hex color" onChangeText={setHexColor} value={hexColor} />
      <Button title={registrationCardImage ? 'Registration Card Selected' : 'Upload Registration Card'} variant="outline" onPress={pickRegistrationCard} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Add Vehicle" onPress={handleSubmit} />
    </Screen>
  );
};
