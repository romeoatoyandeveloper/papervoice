import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, fonts, radii } from '../theme';

interface Props {
  label: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'surface';
  paddingVertical?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** Full-width pill button — primary uses the accent ramp's hover/pressed steps. */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  paddingVertical = 17,
  fontSize = 17,
  style,
  textStyle,
  disabled,
  accessibilityLabel,
}: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { paddingVertical },
        primary
          ? { backgroundColor: pressed ? colors.accent700 : colors.accent }
          : { backgroundColor: pressed ? colors.neutral300 : colors.surface },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Text
        style={[
          primary
            ? { fontFamily: fonts.heading, color: colors.bg }
            : { fontFamily: fonts.body[600], color: colors.text },
          { fontSize },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
