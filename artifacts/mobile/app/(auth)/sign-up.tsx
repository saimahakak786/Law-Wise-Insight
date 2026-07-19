import React, { useState } from 'react';
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
} from 'react-native';
import { useSignUp } from '@clerk/expo';
import { Link, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function SignUpPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');

  const navigate = ({ decorateUrl }: { session?: unknown; decorateUrl: (url: string) => string }) => {
    const url = decorateUrl('/');
    if (!url.startsWith('http')) router.push(url as Href);
  };

  const handleSignUp = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await signUp.password({ emailAddress: email, password });
    if (!error) await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') {
      await signUp.finalize({ navigate });
    }
  };

  // Verification step
  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Feather name="mail" size={48} color="#C9A84C" style={{ marginBottom: 24 }} />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}<Text style={{ color: '#C9A84C' }}>{email}</Text>
        </Text>
        <TextInput
          style={[styles.input, { marginTop: 8, textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          placeholderTextColor="#8B9CC5"
          keyboardType="numeric"
          maxLength={6}
          autoFocus
        />
        {errors.fields.code && (
          <Text style={styles.error}>{errors.fields.code.message}</Text>
        )}
        <Pressable
          style={[styles.primaryBtn, (!code || fetchStatus === 'fetching') && styles.disabled]}
          onPress={handleVerify}
          disabled={!code || fetchStatus === 'fetching'}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#070D24" />
            : <Text style={styles.primaryBtnText}>Verify & Continue</Text>}
        </Pressable>
        <Pressable
          onPress={() => signUp.verifications.sendEmailCode()}
          style={styles.resendBtn}
        >
          <Text style={styles.resendText}>Resend code</Text>
        </Pressable>
        {/* Required for Clerk bot protection */}
        <View nativeID="clerk-captcha" />
      </View>
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

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Your AI-powered legal workspace</Text>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <Feather name="mail" size={18} color="#8B9CC5" style={styles.inputIcon} />
          <TextInput
            style={[styles.inputField]}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor="#8B9CC5"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {errors.fields.emailAddress && (
          <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>
        )}

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Feather name="lock" size={18} color="#8B9CC5" style={styles.inputIcon} />
          <TextInput
            style={[styles.inputField, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Create password"
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

        <Pressable
          style={[styles.primaryBtn, (!email || !password || fetchStatus === 'fetching') && styles.disabled]}
          onPress={handleSignUp}
          disabled={!email || !password || fetchStatus === 'fetching'}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#070D24" />
            : <Text style={styles.primaryBtnText}>Create Account</Text>}
        </Pressable>

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={{ color: '#C9A84C' }}>Terms of Service</Text> and{' '}
          <Text style={{ color: '#C9A84C' }}>Privacy Policy</Text>
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={styles.footerLink}>Sign in</Text>
          </Link>
        </View>

        {/* Required for Clerk bot protection */}
        <View nativeID="clerk-captcha" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070D24' },
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  content: { paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoText: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#C9A84C', letterSpacing: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#8B9CC5', marginBottom: 32, textAlign: 'center' },
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
  inputField: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#FFFFFF' },
  input: {
    width: '100%',
    backgroundColor: '#131D3D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1B2448',
    paddingHorizontal: 16,
    height: 64,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  eyeBtn: { padding: 4 },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#EF4444', marginBottom: 8, marginTop: -4 },
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
  terms: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#8B9CC5', textAlign: 'center', marginTop: 16, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#8B9CC5' },
  footerLink: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#C9A84C' },
  resendBtn: { alignSelf: 'center', marginTop: 16, padding: 8 },
  resendText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#C9A84C' },
});
