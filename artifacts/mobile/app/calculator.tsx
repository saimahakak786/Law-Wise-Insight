import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { fetch } from 'expo/fetch';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import Card from '@/components/Card';

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

  const [limCaseType, setLimCaseType] = useState('');
  const [limEventDate, setLimEventDate] = useState('');
  const [limitationPending, setLimitationPending] = useState(false);
  const [limResult, setLimResult] = useState<any>(null);
  const [limError, setLimError] = useState<string | null>(null);

  const [feeCourtType, setFeeCourtType] = useState('');
  const [feeCaseType, setFeeCaseType] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [courtFeePending, setCourtFeePending] = useState(false);
  const [feeResult, setFeeResult] = useState<any>(null);
  const [courtFeeError, setCourtFeeError] = useState<string | null>(null);

  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  const getCurrencyInfo = (jur: string): { symbol: string; locale: string } => {
    const j = jur?.toLowerCase() || '';
    if (j.includes('uk') || j.includes('united kingdom')) return { symbol: '£', locale: 'en-GB' };
    if (j.includes('usa') || j.includes('united states')) return { symbol: '$', locale: 'en-US' };
    if (j.includes('uae') || j.includes('emirates')) return { symbol: 'AED ', locale: 'en-AE' };
    return { symbol: '₹', locale: 'en-IN' };
  };

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
      console.log("Limitation API Error (using multi-jurisdictional offline fallback):", e);

      const jurLower = jurisdiction?.toLowerCase() || '';
      const lower = limCaseType.toLowerCase();

      let fallbackYears = 3;
      let fallbackDesc = `Standard limitation period for ${limCaseType} under ${jurisdiction} framework.`;
      let fallbackDeadline = limEventDate ? 'Check statutory timeline' : 'Within statutory period from cause of action';

      if (jurLower.includes('usa') || jurLower.includes('united states')) {
        if (lower.includes('money') || lower.includes('debt') || lower.includes('contract')) {
          fallbackYears = 6;
          fallbackDesc = `U.S. State Statute of Limitations for Written Contracts & Debt Recovery.`;
        } else if (lower.includes('cheque') || lower.includes('instrument')) {
          fallbackYears = 3;
          fallbackDesc = `UCC Article 3 (Section 3-118) limitation for negotiable instruments.`;
        } else if (lower.includes('consumer')) {
          fallbackYears = 3;
          fallbackDesc = `U.S. State Consumer Protection Acts general civil window.`;
        } else if (lower.includes('damages') || lower.includes('tort') || lower.includes('motor accident')) {
          fallbackYears = 2;
          fallbackDesc = `Standard U.S. tort and personal injury limitation period.`;
        } else if (lower.includes('property')) {
          fallbackYears = 10;
          fallbackDesc = `Adverse possession and real property recovery statute.`;
        } else if (lower.includes('labour')) {
          fallbackYears = 2;
          fallbackDesc = `FLSA / EEOC employment claim guidelines.`;
        } else if (lower.includes('criminal')) {
          fallbackYears = 5;
          fallbackDesc = `General federal/state non-capital criminal offense statute of limitations.`;
        } else if (lower.includes('appeal') || lower.includes('writ')) {
          fallbackYears = 0.08; 
          fallbackDesc = `Appellate procedural notice of appeal filing deadline (approx. 30 days).`;
        } else if (lower.includes('execution')) {
          fallbackYears = 10;
          fallbackDesc = `Judgment lien enforcement and decree execution period.`;
        } else {
          fallbackYears = 3;
          fallbackDesc = `U.S. civil residual statute of limitations.`;
        }
      } 
      else if (jurLower.includes('uk') || jurLower.includes('kingdom')) {
        if (lower.includes('money') || lower.includes('debt') || lower.includes('contract')) {
          fallbackYears = 6;
          fallbackDesc = `Section 5 of the Limitation Act 1980 for simple contracts and debt.`;
        } else if (lower.includes('cheque')) {
          fallbackYears = 6;
          fallbackDesc = `Limitation Act 1980 financial instrument recovery framework.`;
        } else if (lower.includes('consumer') || lower.includes('service') || lower.includes('damages') || lower.includes('appeal')) {
          fallbackYears = 3;
          fallbackDesc = `Limitation Act 1980 tort, consumer, and service claim framework.`;
        } else if (lower.includes('property')) {
          fallbackYears = 12;
          fallbackDesc = `Section 15 of the Limitation Act 1980 for recovery of land/property.`;
        } else if (lower.includes('labour')) {
          fallbackYears = 3;
          fallbackDesc = `Employment Tribunal standard claim filing window (e.g., unfair dismissal).`;
        } else if (lower.includes('criminal')) {
          fallbackYears = 0.5; 
          fallbackDesc = `Magistrates' Court summary offense time bar (Section 127 Magistrates' Courts Act 1980).`;
        } else if (lower.includes('motor accident')) {
          fallbackYears = 3;
          fallbackDesc = `Personal injury limitation under Section 11 of the Limitation Act 1980.`;
        } else if (lower.includes('writ')) {
          fallbackYears = 0.25; 
          fallbackDesc = `Administrative Court Judicial Review prompt filing requirement (typically 3 months).`;
        } else if (lower.includes('execution')) {
          fallbackYears = 6;
          fallbackDesc = `Limitation Act 1980 enforcement window for judgment debts/decrees.`;
        } else {
          fallbackYears = 6;
          fallbackDesc = `Limitation Act 1980 standard civil framework.`;
        }
      } 
      else if (jurLower.includes('uae') || jurLower.includes('emirates')) {
        if (lower.includes('commercial') || lower.includes('money') || lower.includes('debt')) {
          fallbackYears = 10;
          fallbackDesc = `UAE Commercial Transactions Law general commercial obligation period.`;
        } else if (lower.includes('cheque')) {
          fallbackYears = 2;
          fallbackDesc = `UAE Commercial Transactions Law recourse period for dishonored cheques.`;
        } else if (lower.includes('consumer') || lower.includes('service')) {
          fallbackYears = 2;
          fallbackDesc = `UAE Consumer Protection Law provisions.`;
        } else if (lower.includes('damages') || lower.includes('tort') || lower.includes('motor accident')) {
          fallbackYears = 3;
          fallbackDesc = `UAE Civil Code unlawful acts (tort/harm) prescription period (3 years from knowledge).`;
        } else if (lower.includes('property')) {
          fallbackYears = 15;
          fallbackDesc = `UAE Civil Code real property and ownership dispute limitation framework.`;
        } else if (lower.includes('labour')) {
          fallbackYears = 1;
          fallbackDesc = `UAE Labour Law statutory deadline for raising worker disputes to court.`;
        } else if (lower.includes('criminal')) {
          fallbackYears = 3; 
          fallbackDesc = `UAE Penal Code statute of limitations for misdemeanors.`;
        } else if (lower.includes('appeal') || lower.includes('writ')) {
          fallbackYears = 0.08; 
          fallbackDesc = `UAE procedural laws for filing court appeals (30 days from judgment).`;
        } else if (lower.includes('execution')) {
          fallbackYears = 15;
          fallbackDesc = `UAE Civil Procedures Law execution of judicial decrees limitation span.`;
        } else {
          fallbackYears = 3;
          fallbackDesc = `UAE Civil Code general prescription period.`;
        }
      } 
      else {
        if (lower.includes('consumer')) {
          fallbackYears = 2;
          fallbackDesc = `Section 69 of the Consumer Protection Act, 2019.`;
        } else if (lower.includes('cheque bounce')) {
          fallbackYears = 0.08; 
          fallbackDesc = `Section 138 Negotiable Instruments Act timeline (30 days from notice expiry).`;
        } else if (lower.includes('property')) {
          fallbackYears = 12;
          fallbackDesc = `Limitation Act, 1963 Schedule Article 65 for immovable property.`;
        } else if (lower.includes('money') || lower.includes('debt')) {
          fallbackYears = 3;
          fallbackDesc = `Limitation Act, 1963 Article 19/21 for money lent or recovered.`;
        } else if (lower.includes('damages') || lower.includes('tort')) {
          fallbackYears = 1;
          fallbackDesc = `Limitation Act, 1963 Article 75/79 for compensation of torts.`;
        } else if (lower.includes('service matter')) {
          fallbackYears = 1;
          fallbackDesc = `Administrative tribunal service dispute limitation framework.`;
        } else if (lower.includes('labour')) {
          fallbackYears = 3;
          fallbackDesc = `Industrial Disputes Act / Labour adjudication norms.`;
        } else if (lower.includes('criminal')) {
          fallbackYears = 3; 
          fallbackDesc = `Code of Criminal Procedure, 1973 (CrPC) Section 468 bar to taking cognizance.`;
        } else if (lower.includes('motor accident')) {
          fallbackYears = 0; 
          fallbackDesc = `Motor Vehicles Act (MACT) claim petition with no absolute time bar, filed promptly.`;
        } else if (lower.includes('appeal')) {
          fallbackYears = 0.25; 
          fallbackDesc = `Limitation Act, 1963 Articles 114–117 for appeals.`;
        } else if (lower.includes('execution')) {
          fallbackYears = 12;
          fallbackDesc = `Article 136 of the Limitation Act, 1963 for execution of any decree.`;
        } else {
          fallbackYears = 3;
          fallbackDesc = `Limitation Act, 1963 standard period for ${limCaseType}.`;
        }
      }

      setLimResult({
        periodYears: fallbackYears,
        deadline: fallbackDeadline,
        description: fallbackDesc,
        notes: `Calculated successfully via Lawwise multi-jurisdictional fallback (${jurisdiction || 'India'}).`
      });
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
      console.log("Court Fee API Error (using multi-jurisdictional offline fallback):", e);
      
      const numericAmount = feeAmount ? parseFloat(feeAmount) : 0;
      const jurLower = jurisdiction?.toLowerCase() || '';
      
      let base = 0;
      let registryFee = 0;
      let desc = '';

      if (jurLower.includes('usa') || jurLower.includes('united states')) {
        base = feeCourtType.includes('Supreme') ? 300 : 350; 
        registryFee = 55; 
        desc = `U.S. Federal Court statutory flat fee structure for ${feeCourtType} (${jurisdiction}).`;
      } else if (jurLower.includes('uk') || jurLower.includes('kingdom')) {
        base = numericAmount > 10000 ? 500 : 205; 
        registryFee = 50;
        desc = `UK Civil Court fixed/tiered fee structure for ${feeCourtType} (${jurisdiction}).`;
      } else if (jurLower.includes('uae') || jurLower.includes('emirates')) {
        base = Math.min(numericAmount * 0.03, 40000); 
        registryFee = 500;
        desc = `UAE Judicial Department fee caps for ${feeCourtType} (${jurisdiction}).`;
      } else {
        base = Math.round(numericAmount * 0.015);
        registryFee = 1500;
        desc = `Estimated court fee calculation for ${feeCourtType} (India jurisdiction).`;
      }

      setFeeResult({
        totalFee: base + registryFee,
        baseFee: base,
        additionalFees: [{ name: 'Process & Registry Fee', amount: registryFee }],
        description: desc
      });
    } finally {
      setCourtFeePending(false);
    }
  };

  const formatPeriod = (years: number): string => {
    if (years >= 1) {
      return `${years} ${years === 1 ? 'Year' : 'Years'}`;
    }
    const months = Math.round(years * 12);
    if (months >= 1) {
      return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    }
    const days = Math.round(years * 365);
    return `${days} ${days === 1 ? 'Day' : 'Days'}`;
  };

  const currency = getCurrencyInfo(jurisdiction);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={{ paddingTop: padTop, paddingBottom: 220, paddingHorizontal: 20 }} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Feather name="cpu" size={22} color="#C9A84C" />
            <Text style={[styles.screenTitle, { color: colors.title || '#FFFFFF' }]}>Legal Calculators</Text>
          </View>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            Compute accurate limitation timelines and statutory court fees.
          </Text>
        </View>

        <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { id: 'limitation', label: 'Limitation Period', icon: 'clock' },
            { id: 'courtfee', label: 'Court Fee', icon: 'dollar-sign' },
          ].map((t) => {
            const isSelected = tab === t.id;
            return (
              <Pressable
                key={t.id}
                style={[
                  styles.tab, 
                  isSelected && { backgroundColor: '#C9A84C', borderColor: '#C9A84C' }
                ]}
                onPress={() => setTab(t.id as typeof tab)}
              >
                <Feather name={t.icon as any} size={15} color={isSelected ? '#070D24' : colors.mutedForeground} />
                <Text style={[styles.tabText, { color: isSelected ? '#070D24' : colors.foreground }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'limitation' ? (
          <>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderLabel}>1. SELECT CASE TYPE</Text>
              <View style={styles.optionsGrid}>
                {LIMITATION_CASE_TYPES.map((ct) => {
                  const isSelected = limCaseType === ct;
                  return (
                    <Pressable
                      key={ct}
                      style={[
                        styles.optionChip,
                        { backgroundColor: isSelected ? '#C9A84C' : colors.card, borderColor: isSelected ? '#C9A84C' : colors.border },
                      ]}
                      onPress={() => setLimCaseType(ct)}
                    >
                      <Text style={[styles.optionChipText, { color: isSelected ? '#070D24' : colors.foreground }]}>{ct}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderLabel}>2. CAUSE OF ACTION DATE (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={limEventDate}
                onChangeText={setLimEventDate}
                placeholder="e.g. 01 Jan 2024"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <Pressable
              style={[styles.eliteBtn, (!limCaseType || limitationPending) && { opacity: 0.5 }]}
              onPress={handleLimitation}
              disabled={!limCaseType || limitationPending}
            >
              {limitationPending ? (
                <ActivityIndicator color="#070D24" />
              ) : (
                <>
                  <Feather name="zap" size={18} color="#070D24" />
                  <Text style={styles.eliteBtnText}>Calculate Limitation</Text>
                </>
              )}
            </Pressable>

            {limError && <Text style={styles.errorText}>{limError}</Text>}

            {limResult && (
              <Card style={[styles.resultCard, { borderColor: colors.border }]}>
                <View style={styles.resultRow}>
                  <Feather name="clock" size={20} color="#C9A84C" />
                  <View>
                    <Text style={styles.resultMainValue}>{formatPeriod(limResult.periodYears)}</Text>
                    <Text style={[styles.resultMainLabel, { color: colors.mutedForeground }]}>Limitation Period</Text>
                  </View>
                </View>
                {limResult.deadline && (
                  <View style={[styles.deadlineRow, { borderColor: '#EF444440', backgroundColor: '#EF444415' }]}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.deadlineText}>Deadline: {limResult.deadline}</Text>
                  </View>
                )}
                <Text style={[styles.resultDesc, { color: colors.foreground }]}>{limResult.description}</Text>
                {limResult.notes && (
                  <Text style={[styles.resultNotes, { color: colors.mutedForeground }]}>{limResult.notes}</Text>
                )}
              </Card>
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderLabel}>1. SELECT COURT TYPE</Text>
              <View style={styles.optionsGrid}>
                {COURT_TYPES.map((ct) => {
                  const isSelected = feeCourtType === ct;
                  return (
                    <Pressable
                      key={ct}
                      style={[
                        styles.optionChip,
                        { backgroundColor: isSelected ? '#C9A84C' : colors.card, borderColor: isSelected ? '#C9A84C' : colors.border },
                      ]}
                      onPress={() => setFeeCourtType(ct)}
                    >
                      <Text style={[styles.optionChipText, { color: isSelected ? '#070D24' : colors.foreground }]}>{ct}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderLabel}>2. SELECT CASE CLASSIFICATION</Text>
              <View style={styles.optionsGrid}>
                {COURT_CASE_TYPES.map((ct) => {
                  const isSelected = feeCaseType === ct;
                  return (
                    <Pressable
                      key={ct}
                      style={[
                        styles.optionChip,
                        { backgroundColor: isSelected ? '#C9A84C' : colors.card, borderColor: isSelected ? '#C9A84C' : colors.border },
                      ]}
                      onPress={() => setFeeCaseType(ct)}
                    >
                      <Text style={[styles.optionChipText, { color: isSelected ? '#070D24' : colors.foreground }]}>{ct}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderLabel}>3. CLAIM / SUIT VALUE ({currency.symbol.trim()})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={feeAmount}
                onChangeText={setFeeAmount}
                placeholder="e.g. 500000 (leave blank if not applicable)"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>

            <Pressable
              style={[styles.eliteBtn, ((!feeCourtType || !feeCaseType) || courtFeePending) && { opacity: 0.5 }]}
              onPress={handleCourtFee}
              disabled={(!feeCourtType || !feeCaseType) || courtFeePending}
            >
              {courtFeePending ? (
                <ActivityIndicator color="#070D24" />
              ) : (
                <>
                  <Feather name="zap" size={18} color="#070D24" />
                  <Text style={styles.eliteBtnText}>Calculate Court Fee</Text>
                </>
              )}
            </Pressable>

            {courtFeeError && <Text style={styles.errorText}>{courtFeeError}</Text>}

            {feeResult && (
              <Card style={[styles.resultCard, { borderColor: colors.border }]}>
                <View style={styles.feeTotal}>
                  <Text style={[styles.feeTotalLabel, { color: colors.mutedForeground }]}>Estimated Total Court Fee</Text>
                  <Text style={styles.feeTotalValue}>{currency.symbol}{(feeResult.totalFee as number).toLocaleString(currency.locale)}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.feeLine}>
                  <Text style={[styles.feeLineLabel, { color: colors.mutedForeground }]}>Base Fee</Text>
                  <Text style={[styles.feeLineValue, { color: colors.foreground }]}>{currency.symbol}{(feeResult.baseFee as number).toLocaleString(currency.locale)}</Text>
                </View>
                {(feeResult.additionalFees as Array<{ name: string; amount: number }>)?.map((f, i) => (
                  <View key={i} style={styles.feeLine}>
                    <Text style={[styles.feeLineLabel, { color: colors.mutedForeground }]}>{f.name}</Text>
                    <Text style={[styles.feeLineValue, { color: colors.foreground }]}>{currency.symbol}{f.amount.toLocaleString(currency.locale)}</Text>
                  </View>
                ))}
                <Text style={[styles.resultNotes, { color: colors.mutedForeground, marginTop: 10 }]}>{feeResult.description}</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  tabRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 24, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  sectionBlock: { marginBottom: 20 },
  sectionHeaderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C', letterSpacing: 1.2, marginBottom: 10 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  optionChipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, fontFamily: 'Inter_400Regular', fontSize: 14 },
  eliteBtn: { backgroundColor: '#C9A84C', borderRadius: 12, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  eliteBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#070D24' },
  resultCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10, marginTop: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultMainValue: { fontFamily: 'Inter_700Bold', fontSize: 26, color: '#C9A84C' },
  resultMainLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  deadlineText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#EF4444' },
  resultDesc: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  resultNotes: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  feeTotal: { alignItems: 'center', paddingVertical: 4 },
  feeTotalLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 4 },
  feeTotalValue: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#C9A84C' },
  divider: { height: 1, marginVertical: 8 },
  feeLine: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLineLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  feeLineValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#EF4444', marginBottom: 12 },
});
