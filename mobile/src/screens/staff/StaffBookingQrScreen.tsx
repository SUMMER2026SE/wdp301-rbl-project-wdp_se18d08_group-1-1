import { Ionicons } from '@expo/vector-icons';
import type { BarcodeScanningResult } from 'expo-camera';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
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
import type { StaffManagementStackParamList } from '@/navigation/StaffNavigator';
import {
  staffService,
  type StaffBookingQrAction,
  type StaffBookingQrResolution,
} from '@/services/api/staff';

type Props = NativeStackScreenProps<StaffManagementStackParamList, 'BookingScanner'>;
type Phase = 'scan' | 'detail' | 'capture' | 'confirm' | 'success';

const actionLabel = (action: StaffBookingQrAction) =>
  action === 'CHECK_IN' ? 'Check in vehicle' : 'Check out vehicle';

export function StaffBookingQrScreen({ navigation }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scan');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [resolution, setResolution] = useState<StaffBookingQrResolution | null>(null);
  const [selectedAction, setSelectedAction] = useState<StaffBookingQrAction | null>(null);
  const [evidenceUri, setEvidenceUri] = useState('');
  const [evidenceBase64, setEvidenceBase64] = useState('');
  const [reason, setReason] = useState('Kiosk unavailable');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const reset = () => {
    setPhase('scan');
    setBusy(false);
    setError('');
    setQrPayload('');
    setResolution(null);
    setSelectedAction(null);
    setEvidenceUri('');
    setEvidenceBase64('');
    setReason('Kiosk unavailable');
    setIdempotencyKey('');
  };

  const resolveQr = async (payload: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await staffService.resolveBookingQr(payload);
      if (!response.data?.booking) {
        throw new Error('Booking information was not returned.');
      }
      setQrPayload(payload);
      setResolution(response.data);
      setPhase('detail');
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'Unable to resolve this QR code.');
    } finally {
      setBusy(false);
    }
  };

  const handleQrScanned = ({ data }: BarcodeScanningResult) => {
    if (busy || phase !== 'scan') return;
    void resolveQr(data);
  };

  const startEvidenceCapture = (action: StaffBookingQrAction) => {
    setSelectedAction(action);
    setEvidenceUri('');
    setEvidenceBase64('');
    setError('');
    setIdempotencyKey(Crypto.randomUUID());
    setPhase('capture');
  };

  const captureEvidence = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    setError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        throw new Error('Unable to capture the vehicle photo.');
      }

      const processed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1280 } }],
        {
          base64: true,
          compress: 0.78,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );
      if (!processed.base64) {
        throw new Error('Unable to process the evidence photo.');
      }

      setEvidenceUri(processed.uri);
      setEvidenceBase64(`data:image/jpeg;base64,${processed.base64}`);
      setPhase('confirm');
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Unable to capture evidence.');
    } finally {
      setBusy(false);
    }
  };

  const submitTransition = async () => {
    const booking = resolution?.booking;
    if (
      !booking ||
      !selectedAction ||
      !evidenceBase64 ||
      !reason.trim() ||
      !idempotencyKey ||
      busy
    ) return;

    setBusy(true);
    setError('');
    try {
      await staffService.transitionBookingByQr(booking._id, {
        action: selectedAction,
        payload: qrPayload,
        evidenceImageBase64: evidenceBase64,
        idempotencyKey,
        reason: reason.trim(),
      });
      setPhase('success');
    } catch (transitionError) {
      setError(
        transitionError instanceof Error
          ? transitionError.message
          : 'Unable to update the booking.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (permission?.granted === false) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Booking QR" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={COLORS.error} />
          <Text style={styles.title}>Camera permission required</Text>
          <Text style={styles.helper}>
            Camera access is required to scan booking QR codes and photograph the vehicle.
          </Text>
          <ActionButton label="Open settings" onPress={() => Linking.openSettings()} />
        </View>
      </SafeAreaView>
    );
  }

  const booking = resolution?.booking;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader
        title="Booking QR"
        subtitle="Kiosk manual override"
        accentColor={COLORS.staffBlue}
        onBack={() => navigation.goBack()}
      />

      {phase === 'scan' ? (
        <View style={styles.content}>
          <View style={styles.cameraFrame}>
            {permission?.granted ? (
              <CameraView
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                facing="back"
                onBarcodeScanned={busy ? undefined : handleQrScanned}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <ActivityIndicator color={COLORS.staffBlue} size="large" />
            )}
            <View pointerEvents="none" style={styles.viewfinder} />
          </View>
          <Text style={styles.title}>Scan the customer's booking QR</Text>
          <Text style={styles.helper}>
            Scanning only opens the booking. No status changes happen until evidence is captured and confirmed.
          </Text>
          {busy ? <ActivityIndicator color={COLORS.staffBlue} /> : null}
          {error ? <ErrorMessage message={error} /> : null}
        </View>
      ) : null}

      {phase === 'detail' && booking ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.bookingCard}>
            <View style={styles.statusRow}>
              <Text style={styles.plate}>{booking.licensePlate}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{booking.status}</Text>
              </View>
            </View>
            <DetailRow label="Booking" value={booking._id} />
            <DetailRow
              label="Customer"
              value={booking.userId?.fullName || booking.userId?.email || 'Customer'}
            />
            <DetailRow
              label="Parking space"
              value={`${typeof booking.floorId === 'object' ? booking.floorId.name || 'Floor' : 'Floor'} / ${booking.parkingSlot}`}
            />
            <DetailRow
              label="Schedule"
              value={`${new Date(booking.scheduledStart).toLocaleString()} – ${new Date(booking.scheduledEnd).toLocaleString()}`}
            />
          </View>
          <Text style={styles.helper}>
            Verify the license plate before continuing. A clear vehicle photo is mandatory.
          </Text>
          {resolution.allowedActions.map((action) => (
            <ActionButton
              key={action}
              label={actionLabel(action)}
              onPress={() => startEvidenceCapture(action)}
            />
          ))}
          {resolution.allowedActions.length === 0 ? (
            <ErrorMessage message="No manual action is allowed for this booking status." />
          ) : null}
          <ActionButton label="Scan another QR" secondary onPress={reset} />
        </ScrollView>
      ) : null}

      {phase === 'capture' ? (
        <View style={styles.content}>
          <View style={styles.evidenceCamera}>
            {permission?.granted ? (
              <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />
            ) : (
              <ActivityIndicator color={COLORS.staffBlue} size="large" />
            )}
            <View pointerEvents="none" style={styles.plateGuide} />
          </View>
          <Text style={styles.title}>Photograph the vehicle</Text>
          <Text style={styles.helper}>
            Keep the license plate readable and include enough of the vehicle for operational evidence.
          </Text>
          {error ? <ErrorMessage message={error} /> : null}
          <ActionButton
            disabled={busy}
            label={busy ? 'Capturing…' : 'Capture evidence'}
            onPress={() => void captureEvidence()}
          />
          <ActionButton label="Back to booking" secondary onPress={() => setPhase('detail')} />
        </View>
      ) : null}

      {phase === 'confirm' && booking && selectedAction ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={{ uri: evidenceUri }} style={styles.preview} />
          <Text style={styles.title}>Confirm {actionLabel(selectedAction).toLowerCase()}</Text>
          <Text style={styles.helper}>
            {booking.licensePlate} · {booking.parkingSlot}
          </Text>
          <Text style={styles.inputLabel}>Override reason</Text>
          <TextInput
            maxLength={500}
            multiline
            placeholder="Why is staff performing this action?"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={reason}
            onChangeText={setReason}
          />
          {error ? <ErrorMessage message={error} /> : null}
          <ActionButton
            disabled={busy || !reason.trim()}
            label={busy ? 'Submitting…' : `Confirm ${actionLabel(selectedAction)}`}
            onPress={() => void submitTransition()}
          />
          <ActionButton label="Retake photo" secondary onPress={() => setPhase('capture')} />
        </ScrollView>
      ) : null}

      {phase === 'success' ? (
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={42} color={COLORS.textInverse} />
          </View>
          <Text style={styles.title}>Booking updated</Text>
          <Text style={styles.helper}>
            The customer has been notified and the evidence photo was saved to the parking session.
          </Text>
          <ActionButton label="Scan another booking" onPress={reset} />
          <ActionButton label="Back to bookings" secondary onPress={() => navigation.navigate('Bookings')} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  secondary = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.buttonSecondary, disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: COLORS.background, flex: 1 },
  content: { gap: SPACING.md, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  cameraFrame: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    height: 390,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  evidenceCamera: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    height: 430,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewfinder: {
    borderColor: COLORS.staffBlue,
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    height: 235,
    width: 235,
  },
  plateGuide: {
    borderColor: COLORS.gold,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    height: 120,
    width: '82%',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  helper: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  plate: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    letterSpacing: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(96,180,255,0.14)',
    borderColor: 'rgba(96,180,255,0.5)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  statusText: { color: COLORS.staffBlue, fontSize: FONT_SIZES.xs, fontWeight: '800' },
  detailRow: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  detailLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  detailValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  preview: {
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    width: '100%',
  },
  inputLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: COLORS.textPrimary,
    minHeight: 92,
    padding: SPACING.md,
    textAlignVertical: 'top',
  },
  errorBox: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderColor: 'rgba(255,77,77,0.3)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  errorText: { color: COLORS.error, flex: 1, fontSize: FONT_SIZES.sm },
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.staffBlue,
    borderRadius: RADIUS.md,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderColor: COLORS.borderLight,
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: '800' },
  buttonTextSecondary: { color: COLORS.textSecondary },
  successIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.round,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
});
