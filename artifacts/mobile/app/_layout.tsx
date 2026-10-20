import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClerkProvider, useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { AppProvider } from '@/context/AppContext';
import Purchases from 'react-native-purchases';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// LawVise Eye-Soothing Light Theme Constants
const APP_BACKGROUND = '#F0F4F5'; 
const TEXT_PRIMARY = '#334155';    
const ACCENT_PRIMARY = '#CA9C36';  

// Replace with your Production Clerk Key if EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not injected
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_b3JpZW50ZWQtZWxlcGhhbnQtNDA5OC5jbGVyay5hY2NvdW50cy5kZXYk';

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

async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('court-alerts-v2', {
      name: 'Court Hearing Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'court_alarm',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CA9C36',
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

function RootLayoutNav() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, 
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: APP_BACKGROUND } 
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      
      <Stack.Screen 
        name="draft" 
        options={{ 
          headerShown: true, 
          title: 'Drafting Engine', 
          headerStyle: { backgroundColor: APP_BACKGROUND },
          headerTintColor: TEXT_PRIMARY,
          headerTitleStyle: { color: TEXT_PRIMARY, fontWeight: '700' },
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="calculator" 
        options={{ 
          headerShown: true, 
          title: 'Legal Calculator', 
          headerStyle: { backgroundColor: APP_BACKGROUND },
          headerTintColor: TEXT_PRIMARY,
          headerTitleStyle: { color: TEXT_PRIMARY, fontWeight: '700' },
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="research" 
        options={{ 
          headerShown: true, 
          title: 'Case Research', 
          headerStyle: { backgroundColor: APP_BACKGROUND },
          headerTintColor: TEXT_PRIMARY,
          headerTitleStyle: { color: TEXT_PRIMARY, fontWeight: '700' },
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="vault" 
        options={{ 
          headerShown: true, 
          title: 'Secure Vault', 
          headerStyle: { backgroundColor: APP_BACKGROUND },
          headerTintColor: TEXT_PRIMARY,
          headerTitleStyle: { color: TEXT_PRIMARY, fontWeight: '700' },
          presentation: 'card' 
        }} 
      />

      <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
    </Stack>
  );
}

function InitializingGate({ fontsLoaded, fontError }: { fontsLoaded: boolean; fontError: Error | null }) {
  const { isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setupNotificationChannel().catch(() => {});
    try {
      Purchases.configure({ apiKey: "goog_IVymTFIszZNpmPfSIZHqXBInlhR" });
    } catch (e) {
      console.error('Failed to initialize RevenueCat:', e);
    }
    const timer = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && (isLoaded || timedOut)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, isLoaded, timedOut]);

  if ((!fontsLoaded && !fontError) || (!isLoaded && !timedOut)) {
    return <View style={{ flex: 1, backgroundColor: APP_BACKGROUND }} />;
  }

  if (timedOut && !isLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: '#EF4444', fontSize: 16, textAlign: 'center', marginBottom: 12, paddingHorizontal: 24 }}>
          Connection or initialization timed out.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: ACCENT_PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={() => setTimedOut(false)}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Retry</Text>
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

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AppProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <InitializingGate fontsLoaded={fontsLoaded} fontError={fontError} />
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
    backgroundColor: APP_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
