import { Share, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import QRCode from 'react-native-qrcode-svg';

import { AppText, Button, Card } from '@/components/common';
import { colors, spacing } from '@/theme';

interface QRCodeDisplayProps {
  bookingId: string;
  size?: number;
  showBrightnessControl?: boolean;
}

export const isValidBookingQrValue = (value: string) => /^[a-f\d]{24}$/i.test(value);

export const QRCodeDisplay = ({
  bookingId,
  size = 200,
  showBrightnessControl = true,
}: QRCodeDisplayProps) => {
  const [bright, setBright] = useState(false);

  return (
    <Card style={[styles.card, bright && styles.bright]}>
      <View style={styles.qrWrap}>
        <QRCode backgroundColor="white" color="black" ecl="M" size={size} value={bookingId} />
      </View>
      <AppText color={colors.light.text.secondary} style={styles.center} variant="caption">
        Ref: {bookingId}
      </AppText>
      {showBrightnessControl ? (
        <Button
          title={bright ? 'Normal Brightness' : 'Boost Brightness'}
          variant="outline"
          onPress={() => setBright((current) => !current)}
        />
      ) : null}
      <Button
        title="Share Booking"
        variant="ghost"
        onPress={() => Share.share({ message: `VALO booking: ${bookingId}` })}
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
