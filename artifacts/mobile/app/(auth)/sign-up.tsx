import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSignUp } from '@clerk/expo';
import { Link, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import custom components
import Button from '../../components/Button';

export default function SignUpPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();

  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const otpInputRef = useRef<TextInput>(null);

  const navigate = ({ decorateUrl }: { session?: unknown; decorateUrl: (url: string) => string }) => {
    const url = decorateUrl('/');
    if (!url.startsWith('http')) router.push(url as Href);
  };

  const handleSignUp = async () => {
    if (!email || !phoneNumber || password.length < 8) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await signUp.create({
      emailAddress: email,
      phoneNumber: phoneNumber,
      password,
    });
    if (!error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Prepare verification for phone number via SMS code
      await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
    }
  };

  const handleVerify = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signUp.attemptPhoneNumberVerification({ code });
    if (signUp.status === 'complete') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signUp.finalize({ navigate });
    }
  };

  const handleResendCode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
  };

  const handleTogglePassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPassword((v) => !v);
  };

  // Verification step for phone number
  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('phone_number') &&
    signUp.missingFields.length === 0
  ) {
    useEffect(() => {
      const sendInitialCode = async () => {
        try {
          await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
        } catch {
          // Fallback handled silently or via UI
        }
      };
      sendInitialCode();
    }, [signUp]);

    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Feather name="phone" size={48} color="#C9A84C" style={{ marginBottom: 24 }} />
        <Text style={styles.title}>Verify your phone</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code via SMS to{'\n'}<Text style={{ color: '#C9A84C' }}>{phoneNumber}</Text>
        </Text>

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
            title={fetchStatus === 'fetching' ? "Verifying..." : "Verify & Continue"}
            variant="primary"
            onPress={handleVerify}
            disabled={code.length < 6 || fetchStatus === 'fetching'}
            style={code.length < 6 || fetchStatus === 'fetching' ? styles.disabledBtn : undefined}
          />
        </View>

        <Pressable
          onPress={handleResendCode}
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

        {/* Phone Number */}
        <View style={styles.inputWrapper}>
          <Feather name="phone" size={18} color="#8B9CC5" style={styles.inputIcon} />
          <TextInput
            style={[styles.inputField]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Phone number (e.g. +1234567890)"
            placeholderTextColor="#8B9CC5"
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {errors.fields.phoneNumber && (
          <Text style={styles.error}>{errors.fields.phoneNumber.message}</Text>
        )}

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Feather name="lock" size={18} color="#8B9CC5" style={styles.inputIcon} />
          <TextInput
            style={[styles.inputField, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Create password (min 8 chars)"
            placeholderTextColor="#8B9CC5"
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={handleTogglePassword} style={styles.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#8B9CC5" />
          </Pressable>
        </View>
        {password.length > 0 && password.length < 8 && (
          <Text style={styles.error}>Password must be at least 8 characters</Text>
        )}
        {errors.fields.password && (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        )}

        <Button
          title={fetchStatus === 'fetching' ? "Creating Account..." : "Create Account"}
          variant="primary"
          onPress={handleSignUp}
          disabled={!email || !phoneNumber || password.length < 8 || fetchStatus === 'fetching'}
          style={[(!email || !phoneNumber || password.length < 8 || fetchStatus === 'fetching') && styles.disabledBtn, { marginTop: 8 }]}
        />

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
  terms: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#8B9CC5', textAlign: 'center', marginTop: 16, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#8B9CC5' },
  footerLink: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#C9A84C' },
  resendBtn: { alignSelf: 'center', marginTop: 16, padding: 8 },
  resendText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#C9A84C' },
});
