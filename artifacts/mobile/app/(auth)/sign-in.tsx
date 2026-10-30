import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSignIn, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Link, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import Button from '../../components/Button';

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

type ForgotStep = 'idle' | 'send_code' | 'reset_password' | 'sending' | 'resetting';

export default function SignInPage() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { signIn, isLoaded, setActive } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signInError, setSignInError] = useState('');
  const otpInputRef = useRef<TextInput>(null);

  const [forgotStep, setForgotStep] = useState<ForgotStep>('idle');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const isMfaRequired =
    signIn?.status === 'needs_client_trust' || signIn?.status === 'needs_second_factor';

  const handleSignIn = async () => {
    if (!identifier || !password || !isLoaded || !signIn || !setActive) return;
    setSignInError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await signIn.create({
        identifier: identifier.trim(),
        password,
      });

      if (result.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)' as Href);
      } else {
        Alert.alert('Action Required', `Sign-in status: ${result.status}`);
      }
    } catch (e: any) {
      const errCode = e?.errors?.[0]?.code;
      const errorMessage = e?.errors?.[0]?.message || e?.message || 'Sign in failed.';

      if (errCode === 'form_identifier_not_found') {
        Alert.alert(
          'Account Not Found',
          'No account matches this email. Please create an account first.',
          [
            { text: 'Create Account', onPress: () => router.push('/sign-up' as Href) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        setSignInError(errorMessage);
        Alert.alert('Sign In Failed', errorMessage);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    setSignInError('');

    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'lawvise' });

      const { createdSessionId, setActive: setSSOActive, signIn: ssoSignIn, signUp: ssoSignUp } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      // Handle active session establishment robustly
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)' as Href);
        return;
      }

      if (setSSOActive && (ssoSignIn?.createdSessionId || ssoSignUp?.createdSessionId)) {
        await setSSOActive({ session: ssoSignIn?.createdSessionId || ssoSignUp?.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)' as Href);
        return;
      }

      // Fallback check if status is complete
      if (ssoSignIn?.status === 'complete' && ssoSignIn.createdSessionId) {
        await setActive({ session: ssoSignIn.createdSessionId });
        router.replace('/(tabs)' as Href);
        return;
      }

      if (ssoSignUp?.status === 'complete' && ssoSignUp.createdSessionId) {
        await setActive({ session: ssoSignUp.createdSessionId });
        router.replace('/(tabs)' as Href);
        return;
      }

      throw new Error('Could not establish session after Google authentication.');
    } catch (e: any) {
      const errorMessage = e?.errors?.[0]?.message || e?.message || JSON.stringify(e);
      if (errorMessage && !errorMessage.toLowerCase().includes('cancel')) {
        setSignInError(errorMessage);
        Alert.alert('Google Sign-In Error', errorMessage);
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router, setActive]);

  // (Retain your remaining handler methods for verify, reset, etc. below)
  
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <Feather name="shield" size={32} color="#C5A059" />
          <Text style={styles.logoText}>LawVise</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your legal workspace</Text>

        <View style={styles.inputWrapper}>
          <Feather name="mail" size={18} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Feather name="lock" size={18} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={[styles.inputField, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPassword((v) => !v); }} style={styles.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
          </Pressable>
        </View>

        {signInError ? <Text style={styles.error}>{signInError}</Text> : null}

        <Button
          title={loading ? "Signing In..." : "Sign In"}
          onPress={handleSignIn}
          disabled={!identifier || !password || loading || !isLoaded}
          style={{ marginTop: 4 }}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.socialBtn} onPress={handleGoogle} disabled={googleLoading}>
          {googleLoading
            ? <ActivityIndicator color="#1F2937" size="small" />
            : (
              <>
                <Feather name="globe" size={20} color="#1F2937" />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </>
            )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to LawVise? </Text>
          <Link href={'/sign-up' as Href}>
            <Text style={styles.footerLink}>Create account</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAEFEE' },
  content: { paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoText: { fontSize: 24, fontWeight: '700', color: '#0F172A', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2E0',
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  inputField: { flex: 1, fontSize: 15, color: '#1F2937' },
  eyeBtn: { padding: 4 },
  error: { fontSize: 13, color: '#EF4444', marginBottom: 8, marginTop: -4 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#D8E2E0' },
  dividerText: { fontSize: 13, color: '#6B7280' },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 52,
    borderWidth: 1,
    borderColor: '#D8E2E0',
    marginBottom: 12,
  },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, fontWeight: '600', color: '#C5A059' },
});
