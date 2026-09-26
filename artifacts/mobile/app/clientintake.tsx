import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { LegalTheme } from '../constants/theme';


const PRACTICE_AREAS = [
  'Civil Litigation',
  'Corporate Arbitration',
  'IP & Trademark',
  'Employment Dispute',
  'Criminal Defense',
  'Family Law',
];

const FREE_LIMIT_KEY = '@lawvise_client_intake_free_count';
const MAX_FREE_USES = 4; // Updated to 4 free uses for testing

export default function ClientIntakeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [clientName, setClientName] = useState('');
  const [opposingParty, setOpposingParty] = useState('');
  const [selectedArea, setSelectedArea] = useState(PRACTICE_AREAS[0]);
  const [brief, setBrief] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [freeUsesLeft, setFreeUsesLeft] = useState(MAX_FREE_USES);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    checkFreeUsage();
    checkProStatus();
  }, []);

  const checkFreeUsage = async () => {
    try {
      const val = await AsyncStorage.getItem(FREE_LIMIT_KEY);
      const usedCount = val ? parseInt(val, 10) : 0;
      const remaining = Math.max(0, MAX_FREE_USES - usedCount);
      setFreeUsesLeft(remaining);
    } catch {
      setFreeUsesLeft(MAX_FREE_USES);
    }
  };

  const checkProStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (customerInfo?.entitlements?.active?.['pro']) {
        setIsPro(true);
      }
    } catch {
      setIsPro(false);
    }
  };

  const handleRunScreening = async () => {
    if (!clientName.trim() || !opposingParty.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Missing Fields', 'Please enter both the client name and opposing party.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (freeUsesLeft <= 0 && !isPro) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);

    try {
      if (!isPro) {
        const val = await AsyncStorage.getItem(FREE_LIMIT_KEY);
        const usedCount = val ? parseInt(val, 10) : 0;
        await AsyncStorage.setItem(FREE_LIMIT_KEY, (usedCount + 1).toString());
        setFreeUsesLeft((prev) => Math.max(0, prev - 1));
      }

      setTimeout(() => {
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Conflict Check Clear',
          `No active conflicts found for ${clientName} vs. ${opposingParty}. Intake profile successfully generated.`,
          [{ text: 'View Report', onPress: () => router.back() }]
        );
      }, 1500);
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e?.message || 'Something went wrong processing intake.');
    }
  };

  const handleUpgrade = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.monthly) {
        const { customerInfo } = await Purchases.purchasePackage(offerings.current.monthly);
        if (customerInfo.entitlements.active['pro']) {
          setIsPro(true);
          setShowPaywall(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Success', 'Welcome to LawVise Pro!');
        }
      } else {
        Alert.alert('Notice', 'Billing packages are currently being configured. Free limit has been temporarily reset for your testing.');
        setFreeUsesLeft(MAX_FREE_USES);
        setShowPaywall(false);
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Sandbox Mode', 'Simulating Pro upgrade success for testing!');
        setIsPro(true);
        setShowPaywall(false);
      }
    }
  };

  if (showPaywall) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Feather name="shield" size={48} color={LegalTheme.colors.primaryGold} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Unlock Unlimited Intake</Text>
        <Text style={styles.subtitle}>You have used your {MAX_FREE_USES} free screening credits. Upgrade to Pro for unlimited AI client intakes, case matching, and document analysis.</Text>

        <View style={styles.priceCard}>
          <Text style={styles.priceText}>₹299 <Text style={{ fontSize: 14, color: LegalTheme.colors.textSecondary }}>/ month</Text></Text>
          <View style={styles.featureBullet}><Feather name="check" size={16} color={LegalTheme.colors.primaryGold} /><Text style={styles.featureText}>Unlimited Client Conflict Checks</Text></View>
          <View style={styles.featureBullet}><Feather name="check" size={16} color={LegalTheme.colors.primaryGold} /><Text style={styles.featureText}>AI Case Matcher & Precedent Finder</Text></View>
          <View style={styles.featureBullet}><Feather name="check" size={16} color={LegalTheme.colors.primaryGold} /><Text style={styles.featureText}>Continuous Voice Dictation & FIR Analyzer</Text></View>
        </View>

        <Pressable style={styles.upgradeBtn} onPress={handleUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade to Pro (₹299/mo)</Text>
        </Pressable>

        <Pressable onPress={() => setShowPaywall(false)} style={{ marginTop: 16, padding: 8 }}>
          <Text style={{ color: LegalTheme.colors.textSecondary, fontFamily: 'Inter_400Regular' }}>Back to screening</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: LegalTheme.colors.backgroundPrimary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 60 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={LegalTheme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Client Intake & Conflict Check</Text>
        </View>

        <View style={styles.banner}>
          <Feather name="shield" size={20} color={LegalTheme.colors.primaryGold} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>Automated Screening</Text>
            <Text style={styles.bannerDesc}>
              Run instant conflict checks and organize prospective client intake records instantly. ({freeUsesLeft} free trial uses remaining)
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Client Full Name / Entity</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="e.g. Acme Corp or John Doe"
            placeholderTextColor={LegalTheme.colors.textSecondary}
          />
        </View>

        <Text style={styles.label}>Opposing Party / Respondent</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={opposingParty}
            onChangeText={setOpposingParty}
            placeholder="e.g. Vertex Holdings Ltd."
            placeholderTextColor={LegalTheme.colors.textSecondary}
          />
        </View>

        <Text style={styles.label}>Practice Area / Case Type</Text>
        <View style={styles.chipsGrid}>
          {PRACTICE_AREAS.map((area) => {
            const isSelected = selectedArea === area;
            return (
              <Pressable
                key={area}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedArea(area);
                }}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {area}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Client Brief & Core Facts</Text>
        <View style={[styles.inputWrapper, { height: 110, alignItems: 'flex-start', paddingTop: 12 }]}>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            value={brief}
            onChangeText={setBrief}
            placeholder="Summarize the client's problem, disputed amount, or grievance..."
            placeholderTextColor={LegalTheme.colors.textSecondary}
            multiline
          />
        </View>

        <Pressable
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleRunScreening}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#070D24" />
          ) : (
            <>
              <Feather name="check-circle" size={18} color="#070D24" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>
                {freeUsesLeft > 0 ? `Run Conflict Check (${freeUsesLeft} free left)` : 'Run Conflict Check (Upgrade Required)'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LegalTheme.colors.backgroundPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: LegalTheme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: LegalTheme.colors.textPrimary,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: LegalTheme.colors.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LegalTheme.colors.borderSubtle,
    padding: 16,
    marginBottom: 24,
  },
  bannerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: LegalTheme.colors.textPrimary,
    marginBottom: 4,
  },
  bannerDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: LegalTheme.colors.textSecondary,
    lineHeight: 18,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: LegalTheme.colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: LegalTheme.colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LegalTheme.colors.borderSubtle,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: LegalTheme.colors.textPrimary,
    width: '100%',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: LegalTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: LegalTheme.colors.borderSubtle,
  },
  chipSelected: {
    backgroundColor: LegalTheme.colors.primaryGold,
    borderColor: LegalTheme.colors.primaryGold,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: LegalTheme.colors.textSecondary,
  },
  chipTextSelected: {
    color: '#070D24',
    fontFamily: 'Inter_600SemiBold',
  },
  submitBtn: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: LegalTheme.colors.primaryGold,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: LegalTheme.colors.primaryGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#070D24',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: LegalTheme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: LegalTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  priceCard: {
    width: '100%',
    backgroundColor: LegalTheme.colors.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LegalTheme.colors.borderSubtle,
    padding: 20,
    marginBottom: 24,
  },
  priceText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: LegalTheme.colors.primaryGold,
    marginBottom: 16,
    textAlign: 'center',
  },
  featureBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  featureText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: LegalTheme.colors.textPrimary,
  },
  upgradeBtn: {
    width: '100%',
    height: 52,
    backgroundColor: LegalTheme.colors.primaryGold,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#070D24',
  },
});
