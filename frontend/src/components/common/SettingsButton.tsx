import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../utils/theme';

interface Props {
  onPress: () => void;
}

export default function SettingsButton({ onPress }: Props) {
  return (
    <Pressable
      testID="open-settings"
      accessibilityRole="button"
      accessibilityLabel="설정"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>설정</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, color: colors.textMuted },
  pressed: { opacity: 0.55 },
});
