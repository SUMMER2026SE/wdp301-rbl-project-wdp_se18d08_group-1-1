import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useToast } from '@/hooks/useToast';
import { vehiclesService } from '@/services/api/vehicles';
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
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!isValidNormalizedLicensePlate(normalizedPlate)) {
      setError('Vui lòng nhập biển số xe hợp lệ.');
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
      toast.showSuccess('Thêm xe thành công');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể thêm xe.');
    } finally {
      setLoading(false);
    }
  };

  const pickAndScanRegistrationCard = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Cần cấp quyền truy cập thư viện ảnh để tải lên cà vẹt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    
    if (!result.canceled && result.assets[0]?.base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setRegistrationCardImage(base64Image);
      
      // Auto scan
      setScanning(true);
      setError('');
      try {
        const scanRes = await vehiclesService.scanRegistrationCard(base64Image);
        if (scanRes.data) {
          const { nickname: scannedNick, brand: scannedBrand, model: scannedModel, licensePlate: scannedPlate, colorText, hexColor: scannedHex } = scanRes.data;
          
          if (scannedNick) setNickname(scannedNick);
          if (scannedBrand) setBrand(scannedBrand);
          if (scannedModel) setModel(scannedModel);
          if (scannedPlate) setLicensePlate(scannedPlate);
          if (colorText) setColor(colorText);
          if (scannedHex) setHexColor(scannedHex);
          
          toast.showSuccess('Đã trích xuất thông tin từ cà vẹt xe');
        }
      } catch (scanErr) {
        setError(scanErr instanceof Error ? scanErr.message : 'Lỗi khi quét thông tin bằng AI.');
      } finally {
        setScanning(false);
      }
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Thêm xe mới" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <TouchableOpacity activeOpacity={0.8} style={styles.scanButton} onPress={pickAndScanRegistrationCard} disabled={scanning}>
          {scanning ? (
            <ActivityIndicator color={COLORS.gold} />
          ) : (
            <>
              <Ionicons name={registrationCardImage ? "checkmark-circle" : "scan-outline"} size={24} color={registrationCardImage ? COLORS.success : COLORS.gold} />
              <Text style={styles.scanButtonText}>
                {registrationCardImage ? 'Đã tải lên cà vẹt xe (Tải lại)' : 'Quét tự động cà vẹt xe (AI)'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Biển số xe</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="VD: 51H12345"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                value={licensePlate}
                onChangeText={setLicensePlate}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Loại xe</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="car hoặc electric_car"
                placeholderTextColor={COLORS.textMuted}
                value={vehicleType}
                onChangeText={(val) => setVehicleType(val as VehicleType)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hãng xe</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="VD: TOYOTA"
                placeholderTextColor={COLORS.textMuted}
                value={brand}
                onChangeText={setBrand}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dòng xe</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="VD: VIOS"
                placeholderTextColor={COLORS.textMuted}
                value={model}
                onChangeText={setModel}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Màu sắc</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="VD: Trắng"
                placeholderTextColor={COLORS.textMuted}
                value={color}
                onChangeText={setColor}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chủ xe (Nickname)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Tên hoặc biệt danh"
                placeholderTextColor={COLORS.textMuted}
                value={nickname}
                onChangeText={setNickname}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mã màu Hex</Text>
            <View style={styles.inputWrap}>
              <View style={[styles.colorPreview, { backgroundColor: hexColor }]} />
              <TextInput
                style={styles.input}
                placeholder="#ffffff"
                placeholderTextColor={COLORS.textMuted}
                value={hexColor}
                onChangeText={setHexColor}
              />
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          activeOpacity={0.8} 
          style={[styles.primaryButton, (loading || scanning) && styles.disabled]} 
          onPress={handleSubmit}
          disabled={loading || scanning}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Thêm Xe</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  scroll: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.3)',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderStyle: 'dashed',
  },
  scanButtonText: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.round,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
