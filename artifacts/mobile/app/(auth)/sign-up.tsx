import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Platform, ActivityIndicator, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useSignUp, useSSO, useClerk } from '@clerk/expo';
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
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export default function SignUpPage() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const clerk: any = useClerk();
  const { signUp } = useSignUp() as any;
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signUpError, setSignUpError] = useState('');

  const navigate = useCallback(
    ({ session, decorateUrl }: { session?: any; decorateUrl: (url: string) => string }) => {
      if (session?.currentTask) {
        Alert.alert('One more step', `Clerk needs an extra step: ${session.currentTask.key}`);
        return;
      }
      const url = decorateUrl('/(tabs)');
      if (!url.startsWith('http')) router.replace(url as Href);
    },
    [router]
  );

  const fail = (error: any, title = 'Sign Up Failed') => {
    const msg = error?.longMessage || error?.message || 'Something went wrong.';
    setSignUpError(msg);
    Alert.alert(title, msg);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleSignUp = async () => {
    if (!email || password.length < 8) return;
    setSignUpError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await signUp.password({ emailAddress: email.trim(), password });
      if (error) { fail(error); return; }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) { fail(sendError); return; }
      setStep('verify');
    } catch (e: any) {
      fail(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setSignUpError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) { fail(error, 'Verification Failed'); return; }
      if (signUp.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signUp.finalize({ navigate });
      } else {
        Alert.alert(
          'Almost done',
          `Sign-up status: ${signUp.status}. Missing: ${(signUp.missingFields ?? []).join(', ') || 'none'}`
        );
      }
    } catch (e: any) {
      fail(e, 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) fail(error, 'Could not resend');
      else Alert.alert('Sent', 'A new code is on its way.');
    } catch (e: any) {
      fail(e, 'Could not resend');
    }
  };

  const handlePasteOTP = async () => {
    const clip = await Clipboard.getStringAsync();
    const digits = clip.replace(/\D/g, '').slice(0, 6);
    if (digits) setCode(digits);
    else Alert.alert('Clipboard Empty', 'No valid code found on clipboard.');
  };

  const handleGoogle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    setSignUpError('');
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'lawvise' });
      const sso: any = await startSSOFlow({ strategy: 'oauth_google', redirectUrl });
      const ssoSignIn = sso?.signIn;
      const ssoSignUp = sso?.signUp;
      let sessionId: string | null = sso?.createdSessionId ?? null;

      if (!sessionId && ssoSignUp && ssoSignIn?.firstFactorVerification?.status === 'transferable') {
        const res: any = await ssoSignUp.create({ transfer: true });
        sessionId = res?.createdSessionId ?? ssoSignUp.createdSessionId ?? null;
      }
      if (!sessionId) sessionId = ssoSignIn?.createdSessionId || ssoSignUp?.createdSessionId || null;

      const activate = typeof sso?.setActive === 'function' ? sso.setActive : clerk?.setActive;
      if (sessionId && typeof activate === 'function') {
        await activate.call(sso?.setActive ? undefined : clerk, { session: sessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)' as Href);
        return;
      }

      throw new Error(
        `Google did not finish. signIn=${ssoSignIn?.status ?? 'none'}, signUp=${ssoSignUp?.status ?? 'none'}, ` +
        `missing=${(ssoSignUp?.missingFields ?? []).join(',') || 'none'}, session=${sessionId ? 'yes' : 'no'}, ` +
        `activate=${typeof activate}`
      );
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message || e?.message || JSON.stringify(e);
      if (msg && !msg.toLowerCase().includes('cancel')) {
        setSignUpError(msg);
        Alert.alert('Google Sign-Up Error', msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router, clerk]);

  if (step === 'verify') {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top + 40 }]}>
        <Feather name="mail" size={48} color="#C5A059" style={{ marginBottom: 24 }} />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>

        <Pressable onPress={handlePasteOTP} style={styles.pasteBtn}>
          <Feather name="clipboard" size={14} color="#C5A059" />
          <Text style={styles.pasteText}>Paste Code from Clipboard</Text>
        </Pressable>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor="#9CA3AF"
          autoFocus
        />

        {signUpError ? <Text style={styles.error}>{signUpError}</Text> : null}

        <View style={{ width: '100%', marginTop: 16 }}>
          <Button
            title={loading ? 'Verifying...' : 'Verify & Continue'}
            onPress={handleVerify}
            disabled={code.length < 6 || loading}
          />
        </View>

        <Pressable onPress={handleResend} style={{ marginTop: 16, padding: 8 }}>
          <Text style={styles.footerLink}>Resend code</Text>
        </Pressable>
        <Pressable onPress={() => setStep('form')} style={{ padding: 8 }}>
          <Text style={styles.footerText}>Back</Text>
        </Pressable>
      </View>
    );
  }

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

        <Text style={[styles.title, { textAlign: 'left' }]}>Create account</Text>
        <Text style={[styles.subtitle, { textAlign: 'left' }]}>Your AI-powered legal workspace</Text>

        <View style={styles.inputWrapper}>
          <Feather name="mail" size={18} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            value={email}
            onChangeText={setEmail}
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
            style={styles.inputField}
            value={password}
            onChangeText={setPassword}
            placeholder="Create password (min 8 chars)"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
          </Pressable>
        </View>
        {password.length > 0 && password.length < 8 && (
          <Text style={styles.error}>Password must be at least 8 characters</Text>
        )}

        {signUpError ? <Text style={styles.error}>{signUpError}</Text> : null}

        <Button
          title={loading ? 'Creating Account...' : 'Create Account'}
          onPress={handleSignUp}
          disabled={!email || password.length < 8 || loading}
          style={{ marginTop: 8 }}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.socialBtn} onPress={handleGoogle} disabled={googleLoading}>
          {googleLoading ? (
            <ActivityIndicator color="#1F2937" size="small" />
          ) : (
            <>
              <Feather name="globe" size={20} color="#1F2937" />
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href={'/sign-in' as Href}>
            <Text style={styles.footerLink}>Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAEFEE' },
  content: { paddingHorizontal: 24 },
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoText: { fontSize: 24, fontWeight: '700', color: '#0F172A', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#D8E2E0',
    marginBottom: 12, paddingHorizontal: 16, height: 52,
  },
  inputIcon: { marginRight: 10 },
  inputField: { flex: 1, fontSize: 15, color: '#1F2937' },
  eyeBtn: { padding: 4 },
  pasteBtn: {
    marginBottom: 16, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#FFFFFF',
    borderRadius: 8, borderWidth: 1, borderColor: '#D8E2E0',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pasteText: { color: '#C5A059', fontWeight: '600', fontSize: 13 },
  codeInput: {
    width: '100%', maxWidth: 320, height: 56, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#C5A059', backgroundColor: '#FFFFFF', textAlign: 'center',
    fontSize: 24, letterSpacing: 8, color: '#1F2937',
  },
  error: { fontSize: 13, color: '#EF4444', marginBottom: 8, marginTop: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#D8E2E0' },
  dividerText: { fontSize: 13, color: '#6B7280' },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, height: 52,
    borderWidth: 1, borderColor: '#D8E2E0', marginBottom: 16,
  },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, fontWeight: '600', color: '#C5A059' },
});
