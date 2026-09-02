import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setBaseUrl } from '@workspace/api-client-react';
import { AppProvider } from '@/context/AppContext';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_b3JpZW50ZWQtZWxlcGhhbnQtNDA5OC5jbGVyay5hY2NvdW50cy5kZXYk';

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="draft" options={{ presentation: 'modal' }} />
      <Stack.Screen name="calculator" options={{ presentation: 'modal' }} />
      <Stack.Screen name="research" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

// Inner component to safely check Clerk's loading state and show a loader
function InitializingGate() {
  const { isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  return <RootLayoutNav />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!publishableKey) {
    SplashScreen.hideAsync();
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#070D24', padding: 24 }}>
        <Text style={{ color: '#FF6B6B', fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
          Missing Clerk publishable key
        </Text>
        <Text style={{ color: '#8B9CC5', fontSize: 13, textAlign: 'center' }}>
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY was not set at build time.
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AppProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <InitializingGate />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AppProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: '#070D24',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
