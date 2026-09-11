import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClerkProvider, useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
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

// Robust custom token cache using expo-secure-store to prevent bundling/runtime resolution issues
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('SecureStore get item error:', err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('SecureStore save item error:', err);
    }
  },
};

function RootLayoutNav() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, 
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: '#070D24' } 
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="draft" options={{ presentation: 'modal' }} />
      <Stack.Screen name="calculator" options={{ presentation: 'modal' }} />
      <Stack.Screen name="research" options={{ presentation: 'modal' }} />
      <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
    </Stack>
  );
}

// Inner component with timeout fallback so users never get stuck indefinitely on boot
function InitializingGate() {
  const { isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) {
        setTimedOut(true);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!isLoaded && !timedOut) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  if (timedOut && !isLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: '#FF6B6B', fontSize: 16, textAlign: 'center', marginBottom: 12, paddingHorizontal: 24 }}>
          Connection or initialization timed out.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#C9A84C', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={() => setTimedOut(false)}
        >
          <Text style={{ color: '#070D24', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
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
