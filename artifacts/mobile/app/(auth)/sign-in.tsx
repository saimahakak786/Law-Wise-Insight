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
} from 'react-native';
import { useSignIn, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Link, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Button from '../../components/Button';

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

  const [authType, setAuthType] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<ForgotStep>('idle');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const navigate = useCallback(
    ({ decorateUrl }: { session?: unknown; decorateUrl: (url: string) => string }) => {
      const url = decorateUrl('/');
      if (!url.startsWith('http')) {
        router.push(url as Href);
      }
    },
    [router]
  );

  const handleSignIn = async () => {
    if (!identifier || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload = authType === 'email' 
      ? { emailAddress: identifier.trim(), password } 
      : { phoneNumber: identifier.trim(), password };

    const { error } = await signIn.password(payload);
    if (error) return;

    if (signIn.status === 'complete') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signIn.finalize({ navigate });
    }
  };

  const handleVerify = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (authType === 'email') {
      await signIn.mfa.verifyEmailCode({ code });
    } else {
      await signIn.mfa.verifyPhoneCode({ code });
    }

    if (signIn.status === 'complete') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signIn.finalize({ navigate });
    }
  };

  const handleGoogle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const handleSendResetCode = async () => {
    if (!forgotIdentifier.trim()) { setForgotError('Please enter your email or phone.'); return; }
    setForgotError('');
    setForgotStep('sending');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const strategy = forgotIdentifier.includes('@') ? 'reset_password_email_code' : 'reset_password_sms_code';
      await signIn.create({ strategy, identifier: forgotIdentifier.trim() });
      setForgotStep('reset_password');
    } catch (e: any) {
      setForgotError(e?.errors?.[0]?.message ?? 'Failed to send reset code. Please try again.');
      setForgotStep('send_code');
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) { setForgotError('Please fill in both fields.'); return; }
    setForgotError('');
    setForgotStep('resetting');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const strategy = forgotIdentifier.includes('@') ? 'reset_password_email_code' : 'reset_password_sms_code';
      const result = await signIn.attemptFirstFactor({
        strategy,
        code: resetCode,
        password: newPassword,
      });
      if (result.status === 'complete' && result.createdSessionId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push('/');
      } else {
        setForgotError('Password reset failed. Please check your code.');
        setForgotStep('reset_password');
      }
    } catch (e: any) {
      setForgotError(e?.errors?.[0]?.message ?? 'Failed to reset password.');
      setForgotStep('reset_password');
    }
  };

  // Verification State (e.g., needs_client_trust or MFA challenge)
  if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Feather name="shield" size={48} color="#C9A84C" style={{ marginBottom: 24 }} />
        <Text style={styles.title}>Verify Identity</Text>
        <Text style={styles.subtitle}>Enter the verification code sent to your {authType}</Text>

        {/* Segmented OTP Boxes Container */}
        <Pressable style={styles.otpContainer} onPress={() => otpInputRef.current?.focus()}>
          <TextInput
            ref={otpInputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
              setCode(cleaned);
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <View style={styles.boxesRow}>
            {Array(6).fill(0).map((_, index) => {
              const digit = code[index] || '';
              const isFocused = code.length === index;

              return (
                <View 
                  key={index} 
                  style={[
                    styles.otpBox, 
                    isFocused && styles.otpBoxActive,
                    digit !== '' && styles.otpBoxFilled
                  ]}
                >
                  <Text style={styles.otpBoxText}>{digit}</Text>
                </View>
              );
            })}
          </View>
        </Pressable>

        {errors.fields.code && (
          <Text style={styles.error}>{errors.fields.code.message}</Text>
        )}
        
        <View style={{ width: '100%', marginTop: 16 }}>
          <Button
            title={fetchStatus === 'fetching' ? "Verifying..." : "Verify Identity"}
            variant="primary"
            onPress={handleVerify}
            disabled={code.length < 6 || fetchStatus === 'fetching'}
            style={code.length < 6 || fetchStatus === 'fetching' ? styles.disabledBtn : undefined}
          />
        </View>

        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); authType === 'email' ? signIn.mfa.sendEmailCode() : signIn.mfa.sendPhoneCode(); }} style={styles.linkBtn}>
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
          <Text style={styles.subtitle}>Enter your email or phone number to get a code</Text>

          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color="#8B9CC5" style={styles.inputIcon} />
            <TextInput
              style={[styles.inputField, { flex: 1 }]}
              value={forgotIdentifier}
              onChangeText={setForgotIdentifier}
              placeholder="Email or Phone Number"
              placeholderTextColor="#8B9CC5"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
          {forgotError ? <Text style={styles.error}>{forgotError}</Text> : null}

          <Button
            title={forgotStep === 'sending' ? "Sending Code..." : "Send Reset Code"}
            variant="primary"
            onPress={handleSendResetCode}
            disabled={!forgotIdentifier.trim() || forgotStep === 'sending'}
            style={{ marginTop: 8 }}
          />

          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForgotStep('idle'); setForgotError(''); }} style={styles.linkBtn}>
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
          <Text style={styles.subtitle}>Check your messages for the reset code</Text>

          <View style={styles.inputWrapper}>
            <Feather name="hash" size={18} color="#8B9CC5" style={styles.inputIcon} />
            <TextInput
              style={[styles.inputField, { flex: 1 }]}
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
              style={[styles.inputField, { flex: 1 }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor="#8B9CC5"
              secureTextEntry={!showNewPassword}
            />
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowNewPassword((v) => !v); }} style={styles.eyeBtn}>
              <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={18} color="#8B9CC5" />
            </Pressable>
          </View>

          {forgotError ? <Text style={styles.error}>{forgotError}</Text> : null}

          <Button
            title={forgotStep === 'resetting' ? "Resetting..." : "Confirm & Reset Password"}
            variant="primary"
            onPress={handleResetPassword}
            disabled={!resetCode || !newPassword || forgotStep === 'resetting'}
            style={{ marginTop: 8 }}
          />

          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForgotStep('idle'); setForgotError(''); }} style={styles.linkBtn}>
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

        {/* Toggle Option Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, authType === 'email' && styles.activeTab]}
            onPress={() => { setAuthType('email'); setIdentifier(''); }}
          >
            <Feather name="mail" size={16} color={authType === 'email' ? '#070D24' : '#8B9CC5'} />
            <Text style={[styles.tabText, authType === 'email' && styles.activeTabText]}>Email</Text>
          </Pressable>

          <Pressable
            style={[styles.tab, authType === 'phone' && styles.activeTab]}
            onPress={() => { setAuthType('phone'); setIdentifier(''); }}
          >
            <Feather name="phone" size={16} color={authType === 'phone' ? '#070D24' : '#8B9CC5'} />
            <Text style={[styles.tabText, authType === 'phone' && styles.activeTabText]}>Phone Number</Text>
          </Pressable>
        </View>

        {/* Dynamic Identifier Input */}
        <View style={styles.inputWrapper}>
          <Feather name={authType === 'email' ? "mail" : "phone"} size={18} color="#8B9CC5" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={authType === 'email' ? "Email address" : "+1 (555) 000-0000"}
            placeholderTextColor="#8B9CC5"
            keyboardType={authType === 'email' ? "email-address" : "phone-pad"}
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
            style={[styles.inputField, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#8B9CC5"
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPassword((v) => !v); }} style={styles.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#8B9CC5" />
          </Pressable>
        </View>
        {errors.fields.password && (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        )}

        {/* Forgot Password link */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForgotIdentifier(identifier); setForgotStep('send_code'); setForgotError(''); }}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        {/* Sign In Button */}
        <Button
          title={fetchStatus === 'fetching' ? "Signing In..." : "Sign In"}
          variant="primary"
          onPress={handleSignIn}
          disabled={!identifier || !password || fetchStatus === 'fetching'}
          style={{ marginTop: 4 }}
        />

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
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  content: { paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoText: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#C9A84C', letterSpacing: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#8B9CC5', marginBottom: 24 },
  
  /* Tab Toggle Styles */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#131D3D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1B2448',
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#C9A84C',
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#8B9CC5',
  },
  activeTabText: {
    color: '#070D24',
  },

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
  inputField: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#FFFFFF',
  },
  
  /* OTP Segmented Box Styles */
  otpContainer: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
  },
  otpBox: {
    width: 45,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1B2448',
    backgroundColor: '#131D3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#C9A84C',
  },
  otpBoxFilled: {
    borderColor: '#C9A84C',
    backgroundColor: '#19244D',
  },
  otpBoxText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },

  eyeBtn: { padding: 4 },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#EF4444', marginBottom: 8, marginTop: -4 },
  disabledBtn: { opacity: 0.5 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#C9A84C' },
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
