import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
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

let globalCaughtError: string | null = null;

if ((global as any).ErrorUtils) {
  const defaultHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    globalCaughtError = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n\n${error?.stack ?? ''}`;
    if (defaultHandler) defaultHandler(error, isFatal);
  });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

let setupError: string | null = null;
try {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) setBaseUrl(`https://${domain}`);
} catch (e: any) {
  setupError = `setBaseUrl failed: ${e?.message ?? String(e)}`;
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

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

function ErrorScreen({ message }: { message: string }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#070D24' }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={{ color: '#FF6B6B', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        App Error
      </Text>
      <Text style={{ color: '#FFFFFF', fontSize: 13 }} selectable>
        {message}
      </Text>
    </ScrollView>
  );
}

export default function RootLayout() {
  const [caughtError, setCaughtError] = useState<string | null>(null);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (globalCaughtError) setCaughtError(globalCaughtError);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  if (setupError) {
    SplashScreen.hideAsync();
    return <ErrorScreen message={setupError} />;
  }

  if (fontError) {
    SplashScreen.hideAsync();
    return <ErrorScreen message={`Font load error: ${fontError.message}`} />;
  }

  if (caughtError) {
    return <ErrorScreen message={caughtError} />;
  }

  if (!publishableKey) {
    SplashScreen.hideAsync();
    return <ErrorScreen message="Missing Clerk publishable key (EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY was not set at build time)." />;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AppProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </AppProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
