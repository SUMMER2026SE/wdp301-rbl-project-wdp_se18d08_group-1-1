import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '../constants/theme';

interface CustomInputProps extends TextInputProps {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export default function CustomInput({
  icon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}: CustomInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        isFocused ? styles.containerFocused : styles.containerDefault,
        style as object,
      ]}
    >
      {icon && <View style={styles.iconLeft}>{icon}</View>}

      <TextInput
        style={styles.input}
        placeholderTextColor={COLORS.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />

      {rightIcon && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRightIconPress}
          style={styles.iconRight}
        >
          {rightIcon}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: COLORS.surface,
    height: 58,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  containerDefault: {
    borderColor: COLORS.border,
  },
  containerFocused: {
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  iconLeft: {
    marginRight: 12,
  },
  iconRight: {
    marginLeft: 10,
    padding: 2,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});
