import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

export default function ClientIntakeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [clientName, setClientName] = useState('');
  const [opposingParty, setOpposingParty] = useState('');
  const [caseType, setCaseType] = useState('Civil Litigation');
  const [disputeSummary, setDisputeSummary] = useState('');
  
  const [isChecking, setIsChecking] = useState(false);
  const [intakeResult, setIntakeResult] = useState<{
    status: 'clear' | 'conflict' | null;
    message: string;
    engagementMemo: string;
  } | null>(null);

  const handleRunConflictCheckAndIntake = () => {
    if (!clientName.trim() || !opposingParty.trim() || !disputeSummary.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Incomplete Details', 'Please fill in the client name, opposing party, and dispute summary.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsChecking(true);
    setIntakeResult(null);

    // Simulate AI conflict database lookup & analysis
    setTimeout(() => {
      setIsChecking(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Simple mock rule: if opposing party contains "Apex" or "TechCorp", flag a conflict
      const hasConflict = opposingParty.toLowerCase().includes('apex') || opposingParty.toLowerCase().includes('techcorp');

      if (hasConflict) {
        setIntakeResult({
          status: 'conflict',
          message: `⚠️ Potential Conflict Detected: "${opposingParty}" exists in prior firm records (Matter #402 - Active/Previous Representation).`,
          engagementMemo: `[CONFLICT ALERT]\nRepresentation declined or requires explicit written waiver from both parties under ethical compliance guidelines.`
        });
      } else {
        setIntakeResult({
          status: 'clear',
          message: `✅ Conflict Check Passed: No prior records or conflicting representations found for "${opposingParty}".`,
          engagementMemo: `⚖️ [AI INTAKE SUMMARY & RETAINER DRAFT]
• Client: ${clientName}
• Opposing Party: ${opposingParty}
• Practice Area: ${caseType}
• Core Grievance: ${disputeSummary}
• Recommended Next Step: Issue formal legal notice / draft initial petition within 7 days.`
        });
      }
    }, 1200);
  };

  const handleSaveToIntakeVault = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Success', 'Client intake profile and conflict clearance certificate saved to secure vault.');
    router.back();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Client Intake & Conflict Check</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Info Banner */}
      <LinearGradient
        colors={['#1B2448', '#0F1635']}
        style={styles.banner}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Feather name="shield" size={24} color="#C9A84C" />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Automated Screening</Text>
          <Text style={styles.bannerSub}>Run instant conflict checks and organize prospective client intake records instantly.</Text>
        </View>
      </LinearGradient>

      {/* Form Fields */}
      <View style={styles.formSection}>
        <Text style={[styles.label, { color: colors.foreground }]}>Client Full Name / Entity</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="e.g., Rajesh Sharma / Apex Enterprises"
          placeholderTextColor={colors.mutedForeground}
          value={clientName}
          onChangeText={setClientName}
        />

        <Text style={[styles.label, { color: colors.foreground }]}>Opposing Party / Respondent</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="e.g., Standard Corporation Ltd."
          placeholderTextColor={colors.mutedForeground}
          value={opposingParty}
          onChangeText={setOpposingParty}
        />

        <Text style={[styles.label, { color: colors.foreground }]}>Practice Area / Case Type</Text>
        <View style={styles.chipRow}>
          {['Civil Litigation', 'Corporate Arbitration', 'IP & Trademark', 'Employment Dispute'].map((type) => (
            <Pressable
              key={type}
              style={[
                styles.chip,
                { 
                  backgroundColor: caseType === type ? '#C9A84C' : colors.card,
                  borderColor: caseType === type ? '#C9A84C' : (colors.border ?? '#C9A84C30')
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCaseType(type);
              }}
            >
              <Text style={[styles.chipText, { color: caseType === type ? '#070D24' : colors.foreground }]}>
                {type}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>Client Brief & Core Facts</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Summarize the client's problem, disputed amount, or grievance..."
          placeholderTextColor={colors.mutedForeground}
          value={disputeSummary}
          onChangeText={setDisputeSummary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Pressable
          style={styles.actionBtn}
          onPress={handleRunConflictCheckAndIntake}
        >
          <LinearGradient
            colors={['#C9A84C', '#E8C87A']}
            style={styles.gradientBtn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            {isChecking ? (
              <ActivityIndicator color="#070D24" size="small" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#070D24" />
                <Text style={styles.actionBtnText}>Run Conflict Check & Generate Intake</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      {/* Results Box */}
      {intakeResult && (
        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: intakeResult.status === 'conflict' ? '#EF4444' : '#10B981' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Feather 
              name={intakeResult.status === 'conflict' ? 'alert-triangle' : 'check-circle'} 
              size={18} 
              color={intakeResult.status === 'conflict' ? '#EF4444' : '#10B981'} 
            />
            <Text style={[styles.resultTitle, { color: intakeResult.status === 'conflict' ? '#EF4444' : '#10B981' }]}>
              {intakeResult.status === 'conflict' ? 'Conflict Warning Flagged' : 'Clear for Representation'}
            </Text>
          </View>
          <Text style={[styles.resultMsg, { color: colors.foreground }]}>{intakeResult.message}</Text>
          
          <View style={[styles.memoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.memoContent, { color: colors.foreground }]}>{intakeResult.engagementMemo}</Text>
          </View>

          {intakeResult.status === 'clear' && (
            <Pressable style={styles.saveVaultBtn} onPress={handleSaveToIntakeVault}>
              <Feather name="folder-plus" size={16} color="#070D24" />
              <Text style={styles.saveVaultBtnText}>Save Intake File to Vault</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  banner: {
    borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
  },
  bannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#FFFFFF' },
  bannerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#CBD5E1', marginTop: 2 },
  formSection: { gap: 12, marginBottom: 20 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 4 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 13 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 12, height: 100, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  actionBtn: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  gradientBtn: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#070D24' },
  resultCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginTop: 10, marginBottom: 30 },
  resultTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  resultMsg: { fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 12, lineHeight: 18 },
  memoBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 14 },
  memoContent: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  saveVaultBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  saveVaultBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#070D24' },
});
