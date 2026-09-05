import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import custom button component
import Button from '@/components/Button';


export default function NotFoundScreen() {
  const handlePressHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Feather name="alert-triangle" size={54} color="#C9A84C" style={{ marginBottom: 20 }} />
        
        <Text style={styles.title}>Workspace Not Found</Text>
        <Text style={styles.subtitle}>
          The legal document or route you are trying to access doesn't exist or has been moved.
        </Text>

        <Link href="/" asChild>
          <View style={{ width: '100%', maxWidth: 280 }}>
            <Button
              title="Return to Dashboard"
              variant="primary"
              onPress={handlePressHome}
            />
          </View>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D24',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#8B9CC5',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
});
