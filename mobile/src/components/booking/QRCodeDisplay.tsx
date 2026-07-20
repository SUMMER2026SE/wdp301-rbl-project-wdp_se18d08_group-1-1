import { Share, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import QRCode from 'react-native-qrcode-svg';

import { AppText, Button, Card } from '@/components/common';
import { colors, spacing } from '@/theme';

interface QRCodeDisplayProps {
  bookingId: string;
  value?: string;
  size?: number;
  showBrightnessControl?: boolean;
  shareLabel?: string;
  shareButtonTitle?: string;
}

export const isValidBookingQrValue = (value: string) =>
  /^[a-f\d]{24}$/i.test(value) ||
  /^VALO_(BOOKING|MEMBERSHIP):[1-9]\d*:[a-f\d]{24}:[A-Za-z0-9_-]{20,}$/i.test(value);

export const QRCodeDisplay = ({
  bookingId,
  value,
  size = 200,
  showBrightnessControl = true,
  shareLabel = 'VALO booking',
  shareButtonTitle = 'Share booking',
}: QRCodeDisplayProps) => {
  const [bright, setBright] = useState(false);
  const qrValue = value ?? bookingId;

  return (
    <Card style={[styles.card, bright && styles.bright]}>
      <View style={styles.qrWrap}>
        <QRCode backgroundColor="white" color="black" ecl="M" size={size} value={qrValue} />
      </View>
      {displayReference ? (
        <AppText color={colors.light.text.secondary} style={styles.center} variant="caption">
          Ref: {displayReference}
        </AppText>
      ) : null}
      {showBrightnessControl ? (
        <Button
          title={bright ? 'Normal Brightness' : 'Boost Brightness'}
          variant="outline"
          onPress={() => setBright((current) => !current)}
        />
      ) : null}
      <Button
        title={shareButtonTitle}
        variant="ghost"
        onPress={() => Share.share({ message: `${shareLabel}: ${qrValue}` })}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
  },
  bright: {
    backgroundColor: colors.neutral.white,
  },
  center: {
    textAlign: 'center',
  },
  qrWrap: {
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
  },
});
