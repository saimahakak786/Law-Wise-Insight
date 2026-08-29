import React, { Component, ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Slot } from 'expo-router';
import { ClerkProvider } from '@clerk/clerk-expo';

const CLERK_PUBLISHABLE_KEY = "pk_test_b3JpZW50ZWQtZWxlcGhhbnQtNDA5OC5jbGVyay5hY2NvdW50cy5kZXYk";

class CrashBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Caught crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>💥 Caught Crash Error:</Text>
          <ScrollView style={styles.box}>
            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
            <Text style={styles.stackText}>{this.state.error?.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <CrashBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <Slot />
      </ClerkProvider>
    </CrashBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#cc0000', padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 15, marginTop: 40 },
  box: { flex: 1, backgroundColor: '#000', padding: 15, borderRadius: 8, width: '100%' },
  errorText: { color: '#ff5555', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  stackText: { color: '#aaa', fontSize: 12 },
});
