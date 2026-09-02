import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';

const LIMITATION_CASE_TYPES = [
  'Money suit / debt recovery', 'Cheque bounce (Section 138 NI Act)',
  'Consumer complaint', 'Civil suit for damages', 'Property dispute',
  'Service matter', 'Criminal complaint', 'Motor accident claim',
  'Labour dispute', 'Writ petition', 'Appeal', 'Execution of decree',
];

const COURT_TYPES = ['District Court', 'High Court', 'Supreme Court', 'Consumer Forum', 'Labour Court', 'Tribunal'];
const COURT_CASE_TYPES = ['Civil suit', 'Appeal', 'Writ petition', 'Consumer complaint', 'Criminal case', 'Arbitration'];

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jurisdiction } = useApp();
  const { getToken } = useAuth();
  const [tab, setTab] = useState<'limitation' | 'courtfee'>('limitation');

  // Limitation state
  const [limCaseType, setLimCaseType] = useState('');
  const [limEventDate, setLimEventDate] = useState('');
  const [limitationPending, setLimitationPending] = useState(false);
  const [limResult, setLimResult] = useState<any>(null);
  const [limError, setLimError] = useState<string | null>(null);

  // Court fee state
  const [feeCourtType, setFeeCourtType] = useState('');
  const [feeCaseType, setFeeCaseType] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [courtFeePending, setCourtFeePending] = useState(false);
  const [feeResult, setFeeResult] = useState<any>(null);
  const [courtFeeError, setCourtFeeError] = useState<string | null>(null);

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 20);

  const handleLimitation = async () => {
    if (!limCaseType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLimitationPending(true);
    setLimError(null);
    try {
      const token = await getToken();
      const domain = 'https://law-wise-insight.onrender.com';

      const response = await fetch(`${domain}/api/lawwise/calculator/limitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          caseType: limCaseType,
          jurisdiction,
          eventDate: limEventDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error code ${response.status}`);
      }

      const result = await response.json();
      setLimResult(result);
    } catch (e: any) {
      setLimError(e?.message ?? 'Could not calculate limitation period. Please try again.');
      Alert.alert('Calculation Failed', e?.message ?? 'Could not calculate limitation period. Please try again.');
    } finally {
      setLimitationPending(false);
    }
  };

  const handleCourtFee = async () => {
    if (!feeCourtType || !feeCaseType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCourtFeePending(true);
    setCourtFeeError(null);
    try {
      const token = await getToken();
      const domain = 'https://law-wise-insight.onrender.com';

      const response = await fetch(`${domain}/api/lawwise/calculator/court-fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          courtType: feeCourtType,
          caseType: feeCaseType,
          jurisdiction,
          claimAmount: feeAmount ? parseFloat(feeAmount) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error code ${response.status}`);
      }

      const result = await response.json();
      setFeeResult(result);
    } catch (e: any) {
      setCourtFeeError(e?.message ?? 'Could not calculate court fee. Please try again.');
      Alert.alert('Calculation Failed', e?.message ?? 'Could not calculate court fee. Please try again.');
    } finally {
      setCourtFeePending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: padTop }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Text style={styles.title}>Legal Calculators</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card }]}>
        {[
          { id: 'limitation', label: 'Limitation Period', icon: 'clock' },
          { id: 'courtfee', label: 'Court Fee', icon: 'dollar-sign' },
        ].map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tab, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id as typeof tab)}
          >
            <Feather name={t.icon as any} size={15} color={tab === t.id ? '#C9A84C' : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: tab === t.id ? '#C9A84C' : colors.mutedForeground }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {tab === 'limitation' ? (
          <>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Calculate the time limit within which a legal action must be filed under {jurisdiction} law.
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>Case Type</Text>
            <View style={styles.optionsGrid}>
              {LIMITATION_CASE_TYPES.map((ct) => (
                <Pressable
                  key={ct}
                  style={[styles.optionChip, { backgroundColor: limCaseType === ct ? '#C9A84C20' : colors.card, borderColor: limCaseType === ct ? '#C9A84C' : colors.border }]}
                  onPress={() => setLimCaseType(ct)}
                >
                  <Text style={[styles.optionChipText, { color: limCaseType === ct ? '#C9A84C' : colors.foreground }]}>{ct}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Date of Cause of Action</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={limEventDate}
              onChangeText={setLimEventDate}
              placeholder="e.g. 01 Jan 2024 (optional)"
              placeholderTextColor={colors.mutedForeground}
            />

            <Pressable
              style={[styles.calcBtn, (!limCaseType || limitationPending) && { opacity: 0.5 }]}
              onPress={handleLimitation}
              disabled={!limCaseType || limitationPending}
            >
              {limitationPending
                ? <ActivityIndicator color="#070D24" />
                : <><Feather name="clock" size={18} color="#070D24" /><Text style={styles.calcBtnText}>Calculate</Text></>}
            </Pressable>

            {limError && (
              <Text style={styles.errorText}>
                {limError}
              </Text>
            )}

            {limResult && (
              <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
                <View style={styles.resultRow}>
                  <Feather name="clock" size={20} color="#C9A84C" />
                  <View>
                    <Text style={styles.resultMainValue}>{limResult.periodYears} {(limResult.periodYears as number) === 1 ? 'Year' : 'Years'}</Text>
                    <Text style={[styles.resultMainLabel, { color: colors.mutedForeground }]}>Limitation Period</Text>
                  </View>
                </View>
                {limResult.deadline && (
                  <View style={[styles.deadlineRow, { borderColor: '#EF4444' + '40', backgroundColor: '#EF444415' }]}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.deadlineText}>Deadline: {limResult.deadline}</Text>
                  </View>
                )}
                <Text style={[styles.resultDesc, { color: colors.foreground }]}>{limResult.description}</Text>
                {limResult.notes && (
                  <Text style={[styles.resultNotes, { color: colors.mutedForeground }]}>{limResult.notes}</Text>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Estimate court filing fees for your case under {jurisdiction} law.
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>Court Type</Text>
            <View style={styles.optionsGrid}>
              {COURT_TYPES.map((ct) => (
                <Pressable
                  key={ct}
                  style={[styles.optionChip, { backgroundColor: feeCourtType === ct ? '#C9A84C20' : colors.card, borderColor: feeCourtType === ct ? '#C9A84C' : colors.border }]}
                  onPress={() => setFeeCourtType(ct)}
                >
                  <Text style={[styles.optionChipText, { color: feeCourtType === ct ? '#C9A84C' : colors.foreground }]}>{ct}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Case Type</Text>
            <View style={styles.optionsGrid}>
              {COURT_CASE_TYPES.map((ct) => (
                <Pressable
                  key={ct}
                  style={[styles.optionChip, { backgroundColor: feeCaseType === ct ? '#C9A84C20' : colors.card, borderColor: feeCaseType === ct ? '#C9A84C' : colors.border }]}
                  onPress={() => setFeeCaseType(ct)}
                >
                  <Text style={[styles.optionChipText, { color: feeCaseType === ct ? '#C9A84C' : colors.foreground }]}>{ct}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Claim / Suit Value (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={feeAmount}
              onChangeText={setFeeAmount}
              placeholder="e.g. 500000 (leave blank if not applicable)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />

            <Pressable
              style={[styles.calcBtn, ((!feeCourtType || !feeCaseType) || courtFeePending) && { opacity: 0.5 }]}
              onPress={handleCourtFee}
              disabled={!feeCourtType || !feeCaseType || courtFeePending}
            >
              {courtFeePending
                ? <ActivityIndicator color="#070D24" />
                : <><Feather name="dollar-sign" size={18} color="#070D24" /><Text style={styles.calcBtnText}>Calculate Fee</Text></>}
            </Pressable>

            {courtFeeError && (
              <Text style={styles.errorText}>
                {courtFeeError}
              </Text>
            )}

            {feeResult && (
              <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
                <View style={styles.feeTotal}>
                  <Text style={[styles.feeTotalLabel, { color: colors.mutedForeground }]}>Total Court Fee</Text>
                  <Text style={styles.feeTotalValue}>₹{(feeResult.totalFee as number).toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.feeLine}>
                  <Text style={[styles.feeLineLabel, { color: colors.mutedForeground }]}>Base Fee</Text>
                  <Text style={[styles.feeLineValue, { color: colors.foreground }]}>₹{(feeResult.baseFee as number).toLocaleString('en-IN')}</Text>
                </View>
                {(feeResult.additionalFees as Array<{ name: string; amount: number }>)?.map((f, i) => (
                  <View key={i} style={styles.feeLine}>
                    <Text style={[styles.feeLineLabel, { color: colors.mutedForeground }]}>{f.name}</Text>
                    <Text style={[styles.feeLineValue, { color: colors.foreground }]}>₹{f.amount.toLocaleString('en-IN')}</Text>
                  </View>
                ))}
                <Text style={[styles.resultNotes, { color: colors.mutedForeground, marginTop: 10 }]}>{feeResult.description}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: { padding: 4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#FFFFFF' },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  activeTab: { backgroundColor: '#C9A84C18', borderWidth: 1, borderColor: '#C9A84C30' },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  sectionDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 20, lineHeight: 20 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 10 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  optionChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5 },
  optionChipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 20 },
  calcBtn: { backgroundColor: '#C9A84C', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  calcBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#070D24' },
  resultCard: { borderRadius: 16, padding: 18, gap: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultMainValue: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#C9A84C' },
  resultMainLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  deadlineText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#EF4444' },
  resultDesc: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  resultNotes: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  feeTotal: { alignItems: 'center', paddingVertical: 8 },
  feeTotalLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 4 },
  feeTotalValue: { fontFamily: 'Inter_700Bold', fontSize: 32, color: '#C9A84C' },
  divider: { height: 1, marginVertical: 8 },
  feeLine: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLineLabel: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  feeLineValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#EF4444', marginBottom: 12, marginTop: -12 },
});
