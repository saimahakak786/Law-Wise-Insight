import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function Card({ children, onPress, style }: CardProps) {
  const handlePress = () => {
    if (onPress) {
      // Gives a subtle tactile click vibration every time a user taps a feature card!
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={!onPress}
      style={[styles.card, style]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B', // Rich dark slate-navy
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C9A84C',   // Signature Gold Border
    padding: 16,
    marginVertical: 8,
    // Android Shadow/Elevation
    elevation: 4,
    // iOS Shadow
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
});
