import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { isValidBookingQrValue } from '@/components/booking/QRCodeDisplay';
import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useBooking } from '@/hooks/useBooking';
import { useToast } from '@/hooks/useToast';
import type { BookingStackParamList } from '@/navigation/types';
import { colors } from '@/theme';

type Props = NativeStackScreenProps<BookingStackParamList, 'QRScanner'>;

export const QRScannerScreen = ({ navigation, route }: Props) => {
  const toast = useToast();
  const { checkInBooking, checkOutBooking, isLoading } = useBooking();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualId, setManualId] = useState(route.params.bookingId || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const processBookingId = async (bookingId: string) => {
    if (!isValidBookingQrValue(bookingId)) {
      setError('Invalid QR code. Please scan a valid booking QR code.');
      setScanned(false);
      return;
    }

    try {
      if (route.params.mode === 'check-in') {
        await checkInBooking(bookingId);
        toast.showSuccess('Check-in success');
      } else {
        await checkOutBooking(bookingId);
        toast.showSuccess('Check-out success');
      }
      navigation.goBack();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'QR action failed.');
      setScanned(false);
    }
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) {
      return;
    }
    setScanned(true);
    void processBookingId(data);
  };

  if (permission?.granted === false) {
    return (
      <Screen>
        <AppText variant="h1">Camera Permission</AppText>
        <AppText color={colors.error.main}>Camera permission is required to scan QR codes.</AppText>
        <Button title="Open Settings" onPress={() => Linking.openSettings()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="h1">{route.params.mode === 'check-in' ? 'Check-In' : 'Check-Out'} Scanner</AppText>
      <View style={styles.scanner}>
        {permission?.granted ? (
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <AppText>Requesting camera permission...</AppText>
        )}
        <View style={styles.viewfinder} />
      </View>
      {isLoading ? <AppText>Processing...</AppText> : null}
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Input label="Manual booking ID" onChangeText={setManualId} value={manualId} />
      <Button
        loading={isLoading}
        title="Submit Booking ID"
        onPress={() => {
          setScanned(true);
          void processBookingId(manualId.trim());
        }}
      />
      {scanned ? <Button title="Scan Again" variant="outline" onPress={() => setScanned(false)} /> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  scanner: {
    alignItems: 'center',
    backgroundColor: colors.neutral[900],
    borderRadius: 8,
    height: 320,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewfinder: {
    borderColor: colors.neutral.white,
    borderRadius: 8,
    borderWidth: 2,
    height: 220,
    width: 220,
  },
});
