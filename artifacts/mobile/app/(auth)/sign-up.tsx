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
import { useSignUp, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Link, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

// Import custom components
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
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const otpInputRef = useRef<TextInput>(null);

  const navigate = useCallback(
    ({ decorateUrl }: { session?: unknown; decorateUrl: (url: string) => string }) => {
      const url = decorateUrl('/');
      if (!url.startsWith('http')) router.push(url as Href);
    },
    [router]
  );

  const handleSignUp = async () => {
    if (!email || password.length < 8) return;
    setSignUpError('');

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
      });
      if (result.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signUp.finalize({ navigate });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
    } catch (e: any) {
      const errorMessage = e?.errors?.[0]?.message || e?.message;
      if (errorMessage && !errorMessage.includes('cancel') && !errorMessage.includes('navigate') && !errorMessage.includes('Route')) {
        setSignUpError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleVerify = async () => {
    setSignUpError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signUp.attemptEmailAddressVerification({ code });
      if (signUp.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signUp.finalize({ navigate });
      }
    } catch (e: any) {
      const errorMessage = e?.errors?.[0]?.message || e?.message;
      if (errorMessage && !errorMessage.includes('cancel') && !errorMessage.includes('navigate') && !errorMessage.includes('Route')) {
        setSignUpError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handlePasteOTP = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      const digitsOnly = clipboardContent.replace(/\D/g, '').slice(0, 6);
      if (digitsOnly.length > 0) {
        setCode(digitsOnly);
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
    setSignUpError('');

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
        setSignUpError('Google sign-up was interrupted. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

  const handleResendCode = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleTogglePassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPassword((v) => !v);
  };

  // Verification step for email address
  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
    useEffect(() => {
      const sendInitialCode = async () => {
        try {
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        } catch {}
      };
      sendInitialCode();
    }, [signUp]);

    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Feather name="mail" size={48} color="#C5A059" style={{ marginBottom: 24 }} />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}<Text style={{ color: '#C5A059', fontWeight: '600' }}>{email}</Text>
        </Text>

        <Pressable onPress={handlePasteOTP} style={styles.pasteBtn}>
          <Feather name="clipboard" size={14} color="#C5A059" />
          <Text style={styles.pasteText}>Paste Code from Clipboard</Text>
        </Pressable>

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

        {signUpError ? <Text style={styles.error}>{signUpError}</Text> : null}
        {errors?.fields?.code && (
          <Text style={styles.error}>{errors.fields.code.message}</Text>
        )}
        
        <View style={{ width: '100%', marginTop: 16 }}>
          <Button
            title={fetchStatus === 'fetching' ? "Verifying..." : "Verify & Continue"}
            variant="primary"
            onPress={handleVerify}
            disabled={code.length < 6 || fetchStatus === 'fetching'}
            style={code.length < 6 || fetchStatus === 'fetching' ? styles.disabledBtn : undefined}
          />
        </View>

        <Pressable onPress={handleResendCode} style={styles.resendBtn}>
          <Text style={styles.resendText}>Resend code</Text>
        </Pressable>
        <View nativeID="clerk-captcha" />
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
        {/* Logo */}
        <View style={styles.logoRow}>
          <Feather name="shield" size={32} color="#C5A059" />
          <Text style={styles.logoText}>LawVise</Text>
        </View>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Your AI-powered legal workspace</Text>

        {/* Email */}
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
        {errors?.fields?.emailAddress && (
          <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>
        )}

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Feather name="lock" size={18} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={[styles.inputField, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Create password (min 8 chars)"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={handleTogglePassword} style={styles.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
          </Pressable>
        </View>
        {password.length > 0 && password.length < 8 && (
          <Text style={styles.error}>Password must be at least 8 characters</Text>
        )}
        {errors?.fields?.password && (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        )}

        {signUpError ? <Text style={styles.error}>{signUpError}</Text> : null}

        <Button
          title={fetchStatus === 'fetching' ? "Creating Account..." : "Create Account"}
          variant="primary"
          onPress={handleSignUp}
          disabled={!email || password.length < 8 || fetchStatus === 'fetching'}
          style={[(!email || password.length < 8 || fetchStatus === 'fetching') && styles.disabledBtn, { marginTop: 8 }]}
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

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={{ color: '#C5A059', fontWeight: '600' }}>Terms of Service</Text> and{' '}
          <Text style={{ color: '#C5A059', fontWeight: '600' }}>Privacy Policy</Text>
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={styles.footerLink}>Sign in</Text>
          </Link>
        </View>

        <View nativeID="clerk-captcha" />
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
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32, textAlign: 'center' },
  
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
  inputField: { flex: 1, fontSize: 15, color: '#1F2937' },
  
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  terms: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, fontWeight: '600', color: '#C5A059' },
  resendBtn: { alignSelf: 'center', marginTop: 16, padding: 8 },
  resendText: { fontSize: 14, color: '#C5A059', fontWeight: '600' },
});
