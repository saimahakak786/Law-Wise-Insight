import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useApp, JURISDICTIONS } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

export default function JurisdictionSelector() {
  const { jurisdiction, setJurisdiction } = useApp();
  const colors = useColors();

  const handleSelect = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJurisdiction(code);
  };

  return (
    <ScrollView horizontal showsHorizontalIndicator={false} contentContainerStyle={styles.container}>
      {Object.values(JURISDICTIONS).map((j) => {
        const isSelected = jurisdiction === j.code;
        return (
          <Pressable
            key={j.code}
            onPress={() => handleSelect(j.code)}
            style={[
              styles.badge,
              { backgroundColor: colors.card, borderColor: colors.border },
              isSelected && { backgroundColor: '#C9A84C20', borderColor: '#C9A84C' },
            ]}
          >
            <Text style={[styles.text, { color: colors.mutedForeground }, isSelected && styles.activeText]}>
              {j.name} ({j.currency})
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 8, paddingVertical: 8 },
  badge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  activeText: { color: '#C9A84C', fontFamily: 'Inter_600SemiBold' },
});
