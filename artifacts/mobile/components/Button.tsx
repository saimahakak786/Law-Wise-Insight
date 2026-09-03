import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'outline';
}

export default function Button({ title, onPress, style, textStyle, variant = 'primary' }: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.outlineButton,
        style,
      ]}
    >
      <Text style={[styles.text, isPrimary ? styles.primaryText : styles.outlineText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    elevation: 3,
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: '#0F172A', // Deep Navy fill
    borderWidth: 1.5,
    borderColor: '#C9A84C',   // Gold Accent
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#C9A84C',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#C9A84C',
  },
});
