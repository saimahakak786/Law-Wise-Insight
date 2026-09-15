import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
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
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.contentCard}>
          <View style={styles.iconContainer}>
            <Feather name="alert-triangle" size={32} color="#C9A84C" />
          </View>
          
          <Text style={styles.title}>Workspace Not Found</Text>
          
          <Text style={styles.subtitle}>
            The legal document or route you are trying to access doesn't exist or has been moved.
          </Text>

          <Link href="/" asChild>
            <View style={styles.buttonWrapper}>
              <Button
                title="Return to Dashboard"
                variant="primary"
                onPress={handlePressHome}
                style={styles.actionBtn}
              />
            </View>
          </Link>
        </View>
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
  contentCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0D1534',
    borderWidth: 1,
    borderColor: '#C9A84C30',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C9A84C15',
    borderWidth: 1,
    borderColor: '#C9A84C40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonWrapper: {
    width: '100%',
  },
  actionBtn: {
    backgroundColor: '#C9A84C',
    marginVertical: 0,
    height: 48,
    borderRadius: 12,
  },
});
