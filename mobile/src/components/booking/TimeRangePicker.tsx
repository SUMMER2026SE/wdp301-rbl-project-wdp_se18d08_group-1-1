import { StyleSheet, View } from 'react-native';

import { AppText, Input } from '@/components/common';
import { colors, spacing } from '@/theme';
import { formatDuration, validateTimeRange } from '@/utils/bookingValidation';

interface TimeRangePickerProps {
  startTime: Date;
  endTime: Date;
  onStartTimeChange: (date: Date) => void;
  onEndTimeChange: (date: Date) => void;
  errorMessage?: string;
}

const toInputValue = (date: Date) => date.toISOString().slice(0, 16);

const parseInputValue = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const TimeRangePicker = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  errorMessage,
}: TimeRangePickerProps) => {
  const validation = validateTimeRange(startTime, endTime);
  const error = errorMessage || validation.error;

  return (
    <View style={styles.container}>
      <Input
        label="Start time"
        onChangeText={(value) => {
          const parsed = parseInputValue(value);
          if (parsed) {
            onStartTimeChange(parsed);
          }
        }}
        placeholder="YYYY-MM-DDTHH:mm"
        value={toInputValue(startTime)}
      />
      <Input
        label="End time"
        onChangeText={(value) => {
          const parsed = parseInputValue(value);
          if (parsed) {
            onEndTimeChange(parsed);
          }
        }}
        placeholder="YYYY-MM-DDTHH:mm"
        value={toInputValue(endTime)}
      />
      <AppText color={colors.light.text.secondary} variant="body2">
        Duration: {formatDuration(startTime, endTime)}
      </AppText>
      {error ? (
        <AppText color={colors.error.main} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});
