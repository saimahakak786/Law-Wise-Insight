import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClerkProvider, useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
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
import * as Notifications from 'expo-notifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

setBaseUrl('https://law-wise-insight.onrender.com');

// Clean, eye-friendly light theme constants (like ink on paper)
const APP_BACKGROUND = '#F8FAFC'; // Soft off-white / light paper tone
const TEXT_PRIMARY = '#0F172A';    // Deep charcoal / near-black ink text (zero strain)
const ACCENT_PRIMARY = '#1E3A8A';  // Professional deep legal blue

// Apply default dark ink text styling globally across React Native Text components
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.style = [{ color: TEXT_PRIMARY }, (Text as any).defaultProps.style];

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

// Configure Android Notification Channel with custom gavel sound and persistent visibility
async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('court-alerts', {
      name: 'Court Hearing Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'court_alarm', // Matches your sound filename without extension
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E3A8A',
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
      <Stack.Screen name="draft" options={{ presentation: 'modal' }} />
      <Stack.Screen name="calculator" options={{ presentation: 'modal' }} />
      <Stack.Screen name="research" options={{ presentation: 'modal' }} />
      <Stack.Screen name="vault" options={{ presentation: 'card' }} />
      <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
    </Stack>
  );
}

// Component to register the Clerk token getter with the API client
function TokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch (err) {
        console.error('Failed to retrieve Clerk token for API request:', err);
        return null;
      }
    });
  }, [getToken]);

  return null;
}

// Inner component with timeout fallback so users never get stuck indefinitely on boot
function InitializingGate() {
  const { isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setupNotificationChannel();

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
        <ActivityIndicator size="large" color={ACCENT_PRIMARY} />
      </View>
    );
  }

  if (timedOut && !isLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: '#DC2626', fontSize: 16, textAlign: 'center', marginBottom: 12, paddingHorizontal: 24 }}>
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

  return (
    <>
      <TokenSync />
      <RootLayoutNav />
    </>
  );
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_BACKGROUND, padding: 24 }}>
        <Text style={{ color: '#DC2626', fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
          Missing Clerk publishable key
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center' }}>
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
    backgroundColor: APP_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
