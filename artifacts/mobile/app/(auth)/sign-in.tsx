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
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

type ForgotStep = 'idle' | 'send_code' | 'reset_password' | 'sending' | 'resetting';

export default function SignInPage() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signInError, setSignInError] = useState('');
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
    setSignInError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await signIn.password({ emailAddress: identifier.trim(), password });
      
      if (signIn.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signIn.finalize({ navigate });
      }
    } catch (e: any) {
      const errorMessage = e?.errors?.[0]?.message || e?.message;
      // Filter out harmless route navigation or cancel noise to avoid false-alarm error boxes
      if (errorMessage && !errorMessage.includes('cancel') && !errorMessage.includes('navigate') && !errorMessage.includes('Route')) {
        setSignInError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleVerify = async () => {
    setSignInError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await signIn.mfa.verifyEmailCode({ code });

      if (signIn.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signIn.finalize({ navigate });
      }
    } catch (e: any) {
      const errorMessage = e?.errors?.[0]?.message || e?.message;
      if (errorMessage && !errorMessage.includes('cancel') && !errorMessage.includes('navigate')) {
        setSignInError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handlePasteOTP = async (isReset = false) => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      const digitsOnly = clipboardContent.replace(/\D/g, '').slice(0, 6);
      if (digitsOnly.length > 0) {
        if (isReset) {
          setResetCode(digitsOnly);
        } else {
          setCode(digitsOnly);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Clipboard Empty', 'No valid code found on clipboard.');
      }
    } catch (err) {
      console.log('Paste error', err);
    }
  };

  const handleGoogle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    setSignInError('');

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'lawwise' }),
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
    } catch (e: any) {
      const errorMessage = e?.errors?.[0]?.message || e?.message;
      if (errorMessage && !errorMessage.includes('cancel') && !errorMessage.includes('navigate')) {
        setSignInError('Google sign-in was interrupted. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

  const handleSendResetCode = async () => {
    if (!forgotIdentifier.trim()) { setForgotError('Please enter your email.'); return; }
    setForgotError('');
    setForgotStep('sending');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: forgotIdentifier.trim() });
      setForgotStep('reset_password');
    } catch (e: any) {
      const errorMessage = e?.errors?.[0]?.message || e?.message;
      setForgotError(errorMessage || 'Failed to send reset code. Please try again.');
      setForgotStep('send_code');
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) { setForgotError('Please fill in both fields.'); return; }
    if (newPassword.length < 6) { setForgotError('Password must be at least 6 characters.'); return; }
    setForgotError('');
    setForgotStep('resetting');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
        password: newPassword,
      });

      if (result.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signIn.finalize({ navigate });
      } else {
        setForgotError('Password reset incomplete. Please verify the code.');
        setForgotStep('reset_password');
      }
    } catch (e: any) {
      const errorMessage = e?.errors?.[0]?.message || e?.message;
      if (errorMessage && !errorMessage.includes('cancel') && !errorMessage.includes('navigate')) {
        setForgotError(errorMessage);
      }
      setForgotStep('reset_password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Verification State (MFA challenge)
  if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
    useEffect(() => {
      const sendInitialCode = async () => {
        try {
          await signIn.mfa.sendEmailCode();
        } catch {}
      };
      sendInitialCode();
    }, [signIn]);

    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Feather name="shield" size={48} color="#C5A059" style={{ marginBottom: 24 }} />
        <Text style={styles.title}>Verify Identity</Text>
        <Text style={styles.subtitle}>Enter the verification code sent to your email</Text>

        <Pressable onPress={() => handlePasteOTP(false)} style={styles.pasteBtn}>
          <Feather name="clipboard" size={14} color="#C5A059" />
          <Text style={styles.pasteText}>Paste Code from Clipboard</Text>
        </Pressable>

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

        {signInError ? <Text style={styles.error}>{signInError}</Text> : null}
        
        <View style={{ width: '100%', marginTop: 16 }}>
          <Button
            title={fetchStatus === 'fetching' ? "Verifying..." : "Verify Identity"}
            variant="primary"
            onPress={handleVerify}
            disabled={code.length < 6 || fetchStatus === 'fetching'}
            style={code.length < 6 || fetchStatus === 'fetching' ? styles.disabledBtn : undefined}
          />
        </View>

        <Pressable 
          onPress={async () => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
            try {
              await signIn.mfa.sendEmailCode();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
          }} 
          style={styles.linkBtn}
        >
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
            <Feather name="shield" size={32} color="#C5A059" />
            <Text style={styles.logoText}>LawVise</Text>
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to get a code</Text>

          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.inputField, { flex: 1 }]}
              value={forgotIdentifier}
              onChangeText={setForgotIdentifier}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
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
            <Feather name="shield" size={32} color="#C5A059" />
            <Text style={styles.logoText}>LawVise</Text>
          </View>
          <Text style={styles.title}>Enter New Password</Text>
          <Text style={styles.subtitle}>Check your email for the reset code</Text>

          <Pressable onPress={() => handlePasteOTP(true)} style={styles.pasteBtn}>
            <Feather name="clipboard" size={14} color="#C5A059" />
            <Text style={styles.pasteText}>Paste Code from Clipboard</Text>
          </Pressable>

          <View style={styles.inputWrapper}>
            <Feather name="hash" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.inputField, { flex: 1 }]}
              value={resetCode}
              onChangeText={setResetCode}
              placeholder="Reset code (6 digits)"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
          </View>

          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.inputField, { flex: 1 }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password (min 6 chars)"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showNewPassword}
            />
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowNewPassword((v) => !v); }} style={styles.eyeBtn}>
              <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
            </Pressable>
          </View>

          {forgotError ? <Text style={styles.error}>{forgotError}</Text> : null}

          <Button
            title={forgotStep === 'resetting' ? "Resetting..." : "Confirm & Reset Password"}
            variant="primary"
            onPress={handleResetPassword}
            disabled={!resetCode || newPassword.length < 6 || forgotStep === 'resetting'}
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

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForgotIdentifier(identifier); setForgotStep('send_code'); setForgotError(''); }}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        <Button
          title={fetchStatus === 'fetching' ? "Signing In..." : "Sign In"}
          variant="primary"
          onPress={handleSignIn}
          disabled={!identifier || !password || fetchStatus === 'fetching'}
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
          <Link href="/(auth)/sign-up">
            <Text style={styles.footerLink}>Create account</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAEFEE' },
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: { marginRight: 10 },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  
  pasteBtn: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8E2E0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  pasteText: { color: '#C5A059', fontWeight: '600', fontSize: 13 },

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
    borderColor: '#D8E2E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#C5A059',
  },
  otpBoxFilled: {
    borderColor: '#C5A059',
    backgroundColor: '#FAF8F5',
  },
  otpBoxText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },

  eyeBtn: { padding: 4 },
  error: { fontSize: 13, color: '#EF4444', marginBottom: 8, marginTop: -4 },
  disabledBtn: { opacity: 0.5 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { fontSize: 13, color: '#C5A059', fontWeight: '600' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, fontWeight: '600', color: '#C5A059' },
  linkBtn: { alignSelf: 'center', marginTop: 16 },
  linkText: { fontSize: 14, color: '#C5A059', fontWeight: '600' },
});
