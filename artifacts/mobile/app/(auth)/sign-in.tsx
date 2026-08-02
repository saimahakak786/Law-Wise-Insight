import React, { useCallback, useEffect, useState } from 'react';
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

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

type ForgotStep = 'idle' | 'send_code' | 'reset_password' | 'sending' | 'resetting';

export default function SignInPage() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<ForgotStep>('idle');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const navigate = useCallback(
    ({ decorateUrl }: { session?: unknown; decorateUrl: (url: string) => string }) => {
      const url = decorateUrl('/');
      if (url.startsWith('http')) {
        // handled by Clerk
      } else {
        router.push(url as Href);
      }
    },
    [router]
  );

  const handleSignIn = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate });
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate });
    }
  };

  const handleGoogle = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: ({ decorateUrl }) => {
            router.push(decorateUrl('/') as Href);
          },
        });
      }
    } catch {
      // handled
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

  const handleSendResetEmail = async () => {
    if (!forgotEmail.trim()) { setForgotError('Please enter your email address.'); return; }
    setForgotError('');
    setForgotStep('sending');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: forgotEmail.trim() });
      setForgotStep('reset_password');
    } catch (e: any) {
      setForgotError(e?.errors?.[0]?.message ?? 'Failed to send reset email. Please try again.');
      setForgotStep('send_code');
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) { setForgotError('Please fill in both fields.'); return; }
    setForgotError('');
    setForgotStep('resetting');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode,
        password: newPassword,
      });
      if (result.status === 'complete' && result.createdSessionId) {
        router.push('/');
      } else {
        setForgotError('Password reset failed. Please try again.');
        setForgotStep('reset_password');
      }
    } catch (e: any) {
      setForgotError(e?.errors?.[0]?.message ?? 'Failed to reset password. Please check your code and try again.');
      setForgotStep('reset_password');
    }
  };

  if (signIn.status === 'needs_client_trust') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.title}>Verify Identity</Text>
        <Text style={styles.subtitle}>Enter the code sent to your email</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Enter verification code"
          placeholderTextColor="#8B9CC5"
          keyboardType="numeric"
          autoFocus
        />
        {errors.fields.code && (
          <Text style={styles.error}>{errors.fields.code.message}</Text>
        )}
        <Pressable
          style={[styles.primaryBtn, fetchStatus === 'fetching' && styles.disabled]}
          onPress={handleVerify}
          disabled={fetchStatus === 'fetching'}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#070D24" />
            : <Text style={styles.primaryBtnText}>Verify</Text>}
        </Pressable>
        <Pressable onPress={() => signIn.mfa.sendEmailCode()} style={styles.linkBtn}>
          <Text style={styles.linkText}>Resend code</Text>
        </Pressable>
      </View>
    );
  }

  // Forgot password: send code step
  if (forgotStep === 'send_code' || forgotStep === 'sending') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoRow}>
            <Feather name="shield" size={32} color="#C9A84C" />
            <Text style={styles.logoText}>LawVise</Text>
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a reset code</Text>

          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color="#8B9CC5" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              placeholder="Email address"
              placeholderTextColor="#8B9CC5"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
          {forgotError ? <Text style={styles.error}>{forgotError}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, (!forgotEmail.trim() || forgotStep === 'sending') && styles.disabled]}
            onPress={handleSendResetEmail}
            disabled={!forgotEmail.trim() || forgotStep === 'sending'}
          >
            {forgotStep === 'sending'
              ? <ActivityIndicator color="#070D24" />
              : <Text style={styles.primaryBtnText}>Send Reset Email</Text>}
          </Pressable>

          <Pressable onPress={() => { setForgotStep('idle'); setForgotError(''); }} style={styles.linkBtn}>
            <Text style={styles.linkText}>← Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Forgot password: enter code + new password step
  if (forgotStep === 'reset_password' || forgotStep === 'resetting') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoRow}>
            <Feather name="shield" size={32} color="#C9A84C" />
            <Text style={styles.logoText}>LawVise</Text>
          </View>
          <Text style={styles.title}>Enter New Password</Text>
          <Text style={styles.subtitle}>Check your email for the reset code</Text>

          <View style={styles.inputWrapper}>
            <Feather name="hash" size={18} color="#8B9CC5" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={resetCode}
              onChangeText={setResetCode}
              placeholder="Reset code"
              placeholderTextColor="#8B9CC5"
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color="#8B9CC5" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor="#8B9CC5"
              secureTextEntry={!showNewPassword}
            />
            <Pressable onPress={() => setShowNewPassword((v) => !v)} style={styles.eyeBtn}>
              <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={18} color="#8B9CC5" />
            </Pressable>
          </View>

          {forgotError ? <Text style={styles.error}>{forgotError}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, (!resetCode || !newPassword || forgotStep === 'resetting') && styles.disabled]}
            onPress={handleResetPassword}
            disabled={!resetCode || !newPassword || forgotStep === 'resetting'}
          >
            {forgotStep === 'resetting'
              ? <ActivityIndicator color="#070D24" />
              : <Text style={styles.primaryBtnText}>Reset Password</Text>}
          </Pressable>

          <Pressable onPress={() => { setForgotStep('idle'); setForgotError(''); }} style={styles.linkBtn}>
            <Text style={styles.linkText}>← Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <Feather name="shield" size={32} color="#C9A84C" />
          <Text style={styles.logoText}>LawVise</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your legal workspace</Text>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <Feather name="mail" size={18} color="#8B9CC5" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor="#8B9CC5"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {errors.fields.identifier && (
          <Text style={styles.error}>{errors.fields.identifier.message}</Text>
        )}

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Feather name="lock" size={18} color="#8B9CC5" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#8B9CC5"
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#8B9CC5" />
          </Pressable>
        </View>
        {errors.fields.password && (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        )}

        {/* Forgot Password link */}
        <Pressable
          onPress={() => { setForgotEmail(email); setForgotStep('send_code'); setForgotError(''); }}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        {/* Sign In Button */}
        <Pressable
          style={[styles.primaryBtn, (!email || !password || fetchStatus === 'fetching') && styles.disabled]}
          onPress={handleSignIn}
          disabled={!email || !password || fetchStatus === 'fetching'}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#070D24" />
            : <Text style={styles.primaryBtnText}>Sign In</Text>}
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google */}
        <Pressable style={styles.socialBtn} onPress={handleGoogle} disabled={googleLoading}>
          {googleLoading
            ? <ActivityIndicator color="#FFFFFF" size="small" />
            : (
              <>
                <Feather name="globe" size={20} color="#FFFFFF" />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </>
            )}
        </Pressable>

        {/* Sign up link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to LawVise? </Text>
          <Link href="/(auth)/sign-up">
            <Text style={styles.footerLink}>Create account</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070D24' },
  content: { paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoText: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#C9A84C', letterSpacing: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#8B9CC5', marginBottom: 32 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D3D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1B2448',
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#FFFFFF',
  },
  eyeBtn: { padding: 4 },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#EF4444', marginBottom: 8, marginTop: -4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#C9A84C' },
  primaryBtn: {
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#070D24' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1B2448' },
  dividerText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8B9CC5' },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1B2448',
    borderRadius: 12,
    height: 52,
    borderWidth: 1,
    borderColor: '#2A3A60',
    marginBottom: 12,
  },
  socialBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#8B9CC5' },
  footerLink: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#C9A84C' },
  linkBtn: { alignSelf: 'center', marginTop: 16 },
  linkText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#C9A84C' },
});
