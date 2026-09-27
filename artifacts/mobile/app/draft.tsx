import React, { useState, useRef, useEffect } from 'react';
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
import { fetch } from 'expo/fetch';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import MatterModal from '@/components/MatterModal';

const DRAFT_TYPES = [
  'Bail Application',
  'Stay / Injunction IA',
  'Legal Notice',
  'Civil Suit / Plaint',
  'Consumer Complaint',
  'Written Statement',
  'Arbitration Petition',
  'Writ Petition',
  'Criminal Complaint',
  'Affidavit',
  'Rent Deed',
  'Lease Deed',
  'Sale Deed',
  'Power of Attorney (GPA/SPA)',
  'Partnership Deed',
  'Employment / Founder Agreement'
];

const TONE_OPTIONS = ['Firm / Standard', 'Aggressive / Litigious', 'Neutral / Corporate'];

const CLAUSE_LIBRARY = [
  { name: 'Arbitration Clause', text: 'Any dispute, controversy, or claim arising out of or relating to this contract, including its formation or breach, shall be settled by arbitration in accordance with the Arbitration and Conciliation Act, 1996.' },
  { name: 'Indemnification', text: 'The Party of the Second Part shall indemnify, defend, and hold harmless the Party of the First Part against any losses, liabilities, claims, damages, or expenses arising out of breach of representations.' },
  { name: 'Force Majeure', text: 'Neither party shall be liable for any failure or delay in performance under this Agreement due to acts of God, war, pandemic, government restrictions, or other unforeseen circumstances beyond reasonable control.' },
  { name: 'Governing Jurisdiction', text: 'This Agreement shall be governed by and construed in accordance with the laws of India, and the courts at the designated jurisdiction shall have exclusive territorial jurisdiction.' }
];

const FREE_LIMIT_KEY = '@lawvise_draft_free_count';
const MAX_FREE_USES = 4;

export default function DraftScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  
  const { jurisdiction, activeMatter, setActiveMatter, saveDocument } = useApp();

  const [prompt, setPrompt] = useState('');
  const [selectedType, setSelectedType] = useState('Rent Deed');
  const [selectedTone, setSelectedTone] = useState('Firm / Standard');
  const [showClauseDrawer, setShowClauseDrawer] = useState(false);

  const [isDrafting, setIsDrafting] = useState(false);
  const [result, setResult] = useState('');
  const [hasResult, setHasResult] = useState(false);

  const [freeUsesLeft, setFreeUsesLeft] = useState(MAX_FREE_USES);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showMatterModal, setShowMatterModal] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  useEffect(() => {
    checkFreeUsage();
    checkProStatus();
  }, []);

  const checkFreeUsage = async () => {
    try {
      const val = await AsyncStorage.getItem(FREE_LIMIT_KEY);
      const usedCount = val ? parseInt(val, 10) : 0;
      setFreeUsesLeft(Math.max(0, MAX_FREE_USES - usedCount));
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

  const handleInsertClause = (clauseText: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrompt((prev) => (prev ? `${prev}\n\n${clauseText}` : clauseText));
    setShowClauseDrawer(false);
  };

  // 🏛️ ELITE CHAMBER-GRADE DRAFTING ENGINE WITH TONE MODULATION
  const generateEliteChamberDraft = (type: string, userPrompt: string, jur: string, tone: string) => {
    const cleanType = type.toUpperCase();
    const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const toneNote = tone === 'Aggressive / Litigious' ? ' [ATTN: Drafted with high-intensity legal liabilities, strict statutory warnings, and immediate penal/legal action consequences]' : tone === 'Neutral / Corporate' ? ' [ATTN: Drafted with balanced commercial terms, risk mitigation, and fair dispute mechanisms]' : '';

    if (cleanType.includes('RENT DEED')) {
      return `THIS RENT DEED is made and executed on this ______ day of ____________, 2026 at ${jur.toUpperCase()}, by and between:

1. LESSOR: 
[Name], S/o / W/o [Father's/Spouse's Name], residing at __________________________________________________ (hereinafter called the "LESSOR", which expression shall unless repugnant to the context include his/her heirs, legal representatives, executors, and administrators) of the FIRST PART;

AND

2. LESSEE: 
[Name], S/o / W/o [Father's/Spouse's Name], residing at __________________________________________________ (hereinafter called the "LESSEE", which expression shall unless repugnant to the context include his/her heirs, legal representatives, successors, and permitted assigns) of the SECOND PART.

WHEREAS the Lessor is the absolute owner and in lawful physical possession of the residential/commercial premises bearing property address ________________________________________ (hereinafter referred to as the "Demised Premises").

AND WHEREAS the Lessee has approached the Lessor to take the Demised Premises on monthly rent, and the Lessor has agreed to let out the same on the following terms and conditions:${toneNote}

1. TERM OF TENANCY:
   The tenancy shall commence with effect from ____________ for an initial locked-in period of 11 (eleven) months, subject to extension upon mutual written consent. Specific instructions: ${userPrompt.trim()}

2. RENT & MODE OF PAYMENT:
   The Lessee shall pay a monthly rent of ₹________/- in advance on or before the 7th day of each calendar month.

3. SECURITY DEPOSIT & DEFAULT:
   Interest-free refundable security deposit of ₹________/- deposited with the Lessor. Default in rent payment for two consecutive months shall entitle the Lessor to immediate eviction and re-entry.

IN WITNESS WHEREOF, the parties hereto have signed this Rent Deed in the presence of witnesses:

LESSOR: ________________________      LESSEE: ________________________`;
    }

    if (cleanType.includes('LEGAL NOTICE')) {
      return `BY SPEED POST / REGISTERED AD / EMAIL
DATE: ${currentDate}

TO,
[NAME & ADDRESS OF ADDRESSEE / OPPOSITE PARTY]
__________________________________________________

SUBJECT: STATUTORY LEGAL NOTICE FOR BREACH OF OBLIGATION, RECOVERY, AND DAMAGES.${toneNote}

DEAR SIR/MADAM,

Under express instructions from and on behalf of my client, [Client Name], resident of __________________________________________________, I serve upon you this formal legal notice:

1. FACTUAL BACKGROUND & GRIEVANCE:
   ${userPrompt.trim()}

2. LEGAL LIABILITY & WARNING:
   Your acts constitute a clear breach of legal duty. You are hereby called upon to remit the full payable sum along with statutory compensation within **15 days** of receipt of this notice.

3. CONSEQUENCES OF NON-COMPLIANCE:
   Failing compliance, my client shall institute rigorous civil recovery and criminal proceedings against you in a competent court of law at your sole risk as to costs and consequences.

SINCERELY,

COUNSEL FOR THE CLIENT`;
    }

    if (cleanType.includes('CONSUMER COMPLAINT')) {
      return `IN THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, ${jur.toUpperCase()}
CONSUMER COMPLAINT NO. _____ OF 2026

IN THE MATTER OF:
[Complainant Name] ... COMPLAINANT
VERSUS
[Opposite Party / Manufacturer / Service Provider] ... OPPOSITE PARTY

COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019 FOR DEFICIENCY IN SERVICE AND UNFAIR TRADE PRACTICE.${toneNote}

THE COMPLAINANT RESPECTFULLY SUBMITS AS FOLLOWS:

1. FACTUAL MATRIX & GRIEVANCE:
   The Complainant purchased goods/services from the Opposite Party on [Date] for a total consideration of ₹________/-. Specific grievance details: ${userPrompt.trim()}

2. DEFICIENCY IN SERVICE & UNFAIR TRADE PRACTICE:
   The failure of the Opposite Party amounts to gross deficiency in service and unfair trade practice under Section 2(11) and 2(47) of the Consumer Protection Act, 2019, causing severe mental agony and financial loss.

PRAYER:
It is respectfully prayed that this Hon'ble Commission may direct the Opposite Party to refund ₹________/- with 18% interest, pay compensation of ₹________/- for harassment, and litigation costs.

PLACE: ${jur.toUpperCase()}
DATE: ${currentDate}

COUNSEL FOR COMPLAINANT`;
    }

    if (cleanType.includes('WRITTEN STATEMENT')) {
      return `IN THE COURT OF [CIVIL JUDGE / DISTRICT JUDGE], ${jur.toUpperCase()}
CIVIL SUIT NO. _____ OF 2026

IN THE MATTER OF:
[Plaintiff Name] ... PLAINTIFF
VERSUS
[Defendant Name] ... DEFENDANT

WRITTEN STATEMENT ON BEHALF OF THE DEFENDANT${toneNote}

PRELIMINARY OBJECTIONS:
1. Maintainability: The present suit is legally not maintainable and is liable to be dismissed.
2. Specific Defense Instructions: ${userPrompt.trim()}

PARA-WISE REPLY ON MERITS:
All adverse averments, allegations, and claims made in the plaint are categorically denied unless specifically admitted herein. The answering Defendant maintains clean records and committed no breach.

PRAYER:
Dismiss the suit with exemplary costs in favor of the Defendant.

PLACE: ${jur.toUpperCase()}
DATE: ${currentDate}

COUNSEL FOR THE DEFENDANT`;
    }

    if (cleanType.includes('ARBITRATION PETITION')) {
      return `IN THE HIGH COURT OF JUDICATURE AT ${jur.toUpperCase()}
ARBITRATION PETITION NO. _____ OF 2026

IN THE MATTER OF:
[Petitioner Company Name] ... PETITIONER
VERSUS
[Respondent Company Name] ... RESPONDENT

PETITION UNDER SECTION 11 / SECTION 9 OF THE ARBITRATION AND CONCILIATION ACT, 1996${toneNote}

THE PETITIONER RESPECTFULLY SUBMITS:
1. EXISTENCE OF ARBITRATION AGREEMENT: The parties executed an agreement dated [Date] containing an arbitration clause for seat at ${jur.toUpperCase()}. Dispute details: ${userPrompt.trim()}
2. INVOCATION & DEFAULT: The Petitioner invoked arbitration via notice, but Respondent failed to concur on arbitrator appointment within the statutory period.

PRAYER:
Appoint an independent Sole Arbitrator to adjudicate all pending commercial disputes.

COUNSEL FOR THE PETITIONER`;
    }

    // Default Chamber Format
    return `MEMORANDUM OF ${cleanType}
JURISDICTION: ${jur.toUpperCase()}
TONE / PROFILE: ${tone.toUpperCase()}

THE APPLICANT / PARTY RESPECTFULLY SUBMITS:

1. FACTUAL MATRIX & INSTRUCTIONS:
   ${userPrompt.trim()}

2. STATUTORY FRAMEWORK & LEGAL SUBMISSIONS:
   The rights, liabilities, and obligations of the parties stand governed by applicable statutory provisions and judicial precedents.

3. PRAYER / OPERATIVE CLAUSE:
   Appropriate reliefs or covenants as detailed herein shall bind all participating parties.

PLACE: ${jur.toUpperCase()}
DATE: ${currentDate}

COUNSEL / AUTHORIZED REPRESENTATIVE`;
  };

  const handleDraft = async () => {
    if (!prompt.trim()) { 
      Alert.alert('Enter Prompt', 'Please specify facts, terms, party names, or background.'); 
      return; 
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (freeUsesLeft <= 0 && !isPro) {
      setShowPaywall(true);
      return;
    }

    setIsDrafting(true);
    setResult('');
    setHasResult(true);

    try {
      if (!isPro) {
        const val = await AsyncStorage.getItem(FREE_LIMIT_KEY);
        const usedCount = val ? parseInt(val, 10) : 0;
        await AsyncStorage.setItem(FREE_LIMIT_KEY, (usedCount + 1).toString());
        setFreeUsesLeft((prev) => Math.max(0, prev - 1));
      }

      const token = await getToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN || 'law-wise-insight.onrender.com';
      const draftType = selectedType.toLowerCase();
      
      const response = await fetch(`https://${domain}/api/lawvise/draft`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          prompt: prompt.trim(), 
          jurisdiction, 
          draftType, 
          tone: selectedTone,
          matterId: activeMatter ? activeMatter.id : null 
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Network response failed or body missing');
      }

      const reader = (response.body as any)?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) setResult((p) => p + data.content);
            if (data.done) break;
          } catch { /* skip */ }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Elite Chamber Engine Fallback
      const eliteText = generateEliteChamberDraft(selectedType, prompt, jurisdiction, selectedTone);

      let index = 0;
      const interval = setInterval(() => {
        setResult(eliteText.slice(0, index));
        index += 45;
        if (index > eliteText.length) {
          setResult(eliteText);
          clearInterval(interval);
          setIsDrafting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 12);
      return;
    } finally {
      setIsDrafting(false);
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
    } catch {
      Alert.alert('Sandbox Mode', 'Simulating Pro upgrade success for testing!');
      setIsPro(true);
      setShowPaywall(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Elite legal draft copied to clipboard.');
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const filename = FileSystem.cacheDirectory + `chamber_draft.txt`;
      await FileSystem.writeAsStringAsync(filename, result, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filename);
    } catch {
      Alert.alert('Share Failed', 'Could not share the document.');
    }
  };

  const handleSaveToVault = async () => {
    if (!result) return;
    try {
      await saveDocument({
        title: `${selectedType}: ${prompt.slice(0, 25)}...`,
        documentType: selectedType.toLowerCase(),
        content: result,
        analysisType: 'drafting',
        matterId: activeMatter ? activeMatter.id : null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Document saved to your firm vault & matter log.');
    } catch {
      Alert.alert('Save Failed', 'Could not save to vault.');
    }
  };

  if (showPaywall) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, backgroundColor: colors.background }]}>
        <Feather name="shield" size={48} color="#C9A84C" style={{ marginBottom: 16 }} />
        <Text style={styles.paywallTitle}>Unlock Unlimited Drafting</Text>
        <Text style={styles.paywallSubtitle}>You have used your {MAX_FREE_USES} free drafting credits. Upgrade to Pro for unlimited senior counsel-grade deeds and petitions.</Text>

        <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.priceText}>₹299 <Text style={{ fontSize: 14, color: colors.mutedForeground }}>/ month</Text></Text>
          <View style={styles.featureBullet}><Feather name="check" size={16} color="#C9A84C" /><Text style={[styles.featureText, { color: colors.foreground }]}>Unlimited Chamber Deeds, Leases & Petitions</Text></View>
          <View style={styles.featureBullet}><Feather name="check" size={16} color="#C9A84C" /><Text style={[styles.featureText, { color: colors.foreground }]}>Advanced Legal Research & Precedent Finder</Text></View>
        </View>

        <Pressable style={styles.upgradeBtn} onPress={handleUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade to Pro (₹299/mo)</Text>
        </Pressable>

        <Pressable onPress={() => setShowPaywall(false)} style={{ marginTop: 16, padding: 8 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>Back to drafting</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        onContentSizeChange={() => hasResult && scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Feather name="file-text" size={22} color="#C9A84C" />
            <Text style={styles.screenTitle}>Chamber Draft Engine</Text>
          </View>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            Senior counsel-grade drafting for deeds, contracts, and court petitions. ({freeUsesLeft} free trial uses remaining)
          </Text>
        </View>

        {/* Firm Matter Workspace Banner */}
        <Pressable 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowMatterModal(true);
          }}
          style={[styles.matterBanner, { backgroundColor: colors.card, borderColor: '#C9A84C' }]}
        >
          <View style={styles.matterIconBox}>
            <Feather name="briefcase" size={16} color="#C9A84C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.matterLabel, { color: colors.mutedForeground }]}>FIRM MATTER WORKSPACE</Text>
            <Text style={[styles.matterName, { color: colors.foreground }]} numberOfLines={1}>
              {activeMatter ? activeMatter.title : 'General Practice (Tap to assign matter)'}
            </Text>
          </View>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </Pressable>

        {/* Step 1: Draft Instructions Input */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel}>1. INSTRUCTIONS & MATERIAL FACTS</Text>
            <Pressable 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowClauseDrawer(!showClauseDrawer);
              }}
              style={styles.clauseToggleBtn}
            >
              <Feather name="book-open" size={13} color="#C9A84C" />
              <Text style={styles.clauseToggleText}>Clause Library</Text>
            </Pressable>
          </View>

          {/* Clause Library Drawer */}
          {showClauseDrawer && (
            <View style={[styles.clauseDrawer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.clauseDrawerTitle, { color: colors.foreground }]}>Tap clause to insert into prompt:</Text>
              {CLAUSE_LIBRARY.map((item, idx) => (
                <Pressable 
                  key={idx} 
                  style={[styles.clauseItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleInsertClause(item.text)}
                >
                  <Text style={styles.clauseItemName}>{item.name}</Text>
                  <Text style={[styles.clauseItemSnippet, { color: colors.mutedForeground }]} numberOfLines={1}>{item.text}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={[styles.queryWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="edit-3" size={18} color={colors.mutedForeground} style={styles.queryIcon} />
            <TextInput
              style={[styles.queryInput, { color: colors.foreground }]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Provide names, amounts, grievance details, or specific clauses..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Step 2: Document Type Selection */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>2. DOCUMENT & DEED CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipsContainer}>
            {DRAFT_TYPES.map((type) => {
              const isSelected = selectedType === type;
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.chip,
                    { backgroundColor: isSelected ? '#C9A84C' : colors.card, borderColor: isSelected ? '#C9A84C' : colors.border },
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.chipText, { color: isSelected ? '#070D24' : colors.foreground }]}>{type}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 3: Tone & Rhetoric Selection */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>3. DRAFTING TONE & AGGRESSIVENESS</Text>
          <View style={styles.toneRow}>
            {TONE_OPTIONS.map((tone) => {
              const isSelected = selectedTone === tone;
              return (
                <Pressable
                  key={tone}
                  style={[
                    styles.toneChip,
                    { backgroundColor: isSelected ? 'rgba(201, 168, 76, 0.2)' : colors.card, borderColor: isSelected ? '#C9A84C' : colors.border },
                  ]}
                  onPress={() => setSelectedTone(tone)}
                >
                  <Text style={[styles.toneChipText, { color: isSelected ? '#C9A84C' : colors.mutedForeground }]}>{tone}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Jurisdiction Details */}
        <View style={styles.jurisdictionRow}>
          <Feather name="globe" size={13} color={colors.mutedForeground} />
          <Text style={[styles.jurisdictionText, { color: colors.mutedForeground }]}>Jurisdiction: {jurisdiction}</Text>
        </View>

        {/* Generate Button */}
        <Pressable
          style={[styles.researchBtn, (!prompt.trim() || isDrafting) && { opacity: 0.5 }]}
          onPress={handleDraft}
          disabled={!prompt.trim() || isDrafting}
        >
          {isDrafting ? (
            <ActivityIndicator color="#070D24" />
          ) : (
            <>
              <Feather name="cpu" size={18} color="#070D24" />
              <Text style={styles.researchBtnText}>
                {freeUsesLeft > 0 ? `Generate Chamber Draft (${freeUsesLeft} free left)` : 'Generate Chamber Draft (Upgrade Required)'}
              </Text>
            </>
          )}
        </Pressable>

        {/* Result Display Section & Action Bar */}
        {hasResult && (
          <View style={[styles.resultContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <Feather name="file-text" size={16} color="#C9A84C" />
              <Text style={[styles.resultHeaderText, { color: colors.foreground }]}>{selectedType} Output</Text>
              {isDrafting && <ActivityIndicator color="#C9A84C" size="small" />}
            </View>
            {isDrafting && !result ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#C9A84C" />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Crafting professional chamber document...</Text>
              </View>
            ) : null}
            <Text style={[styles.resultText, { color: colors.foreground }]}>{result}</Text>

            {/* Draft Action Bar */}
            {!isDrafting && result ? (
              <View style={styles.actionBarContainer}>
                <View style={styles.actionRow}>
                  <Pressable style={styles.actionBtn} onPress={handleCopy}>
                    <Feather name="copy" size={14} color="#C9A84C" />
                    <Text style={styles.actionBtnText}>Copy</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={handleShare}>
                    <Feather name="share-2" size={14} color="#C9A84C" />
                    <Text style={styles.actionBtnText}>Share</Text>
                  </Pressable>
                </View>
                <Pressable style={[styles.actionBtn, styles.primaryActionBtn]} onPress={handleSaveToVault}>
                  <Feather name="save" size={15} color="#070D24" />
                  <Text style={[styles.actionBtnText, { color: '#070D24', fontFamily: 'Inter_700Bold' }]}>Save to Vault</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Global Matter Selection Modal */}
      <MatterModal
        visible={showMatterModal}
        onClose={() => setShowMatterModal(false)}
        activeMatter={activeMatter}
        onSelectMatter={(matter) => setActiveMatter(matter)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  headerContainer: { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF' },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  matterBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    borderWidth: 1, padding: 12, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  matterIconBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  matterLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  matterName: { fontSize: 13, fontFamily: 'Inter_700Bold', marginTop: 1 },

  sectionBlock: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionHeaderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C', letterSpacing: 1.2 },
  clauseToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(201, 168, 76, 0.1)' },
  clauseToggleText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C' },

  clauseDrawer: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12 },
  clauseDrawerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 8 },
  clauseItem: { paddingVertical: 8, borderBottomWidth: 1 },
  clauseItemName: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#C9A84C' },
  clauseItemSnippet: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },

  queryWrapper: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    padding: 14, alignItems: 'flex-start',
  },
  queryIcon: { marginRight: 10, marginTop: 2 },
  queryInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14,
    lineHeight: 22, minHeight: 90,
  },
  horizontalChipsContainer: { gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },

  toneRow: { flexDirection: 'row', gap: 8 },
  toneChip: { flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  toneChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textAlign: 'center' },

  jurisdictionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  jurisdictionText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  researchBtn: {
    backgroundColor: '#C9A84C', borderRadius: 12, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24,
  },
  researchBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#070D24' },
  resultContainer: { borderRadius: 12, borderWidth: 1, padding: 16 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  resultHeaderText: { fontFamily: 'Inter_700Bold', fontSize: 15, flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  resultText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 22, marginBottom: 16 },

  actionBarContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#C9A84C' },
  primaryActionBtn: { backgroundColor: '#C9A84C', width: '100%', borderWidth: 0 },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9A84C' },

  paywallTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: '#FFFFFF', textAlign: 'center', marginBottom: 10 },
  paywallSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  priceCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 24 },
  priceText: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#C9A84C', marginBottom: 16, textAlign: 'center' },
  featureBullet: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  featureText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  upgradeBtn: { width: '100%', height: 52, backgroundColor: '#C9A84C', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upgradeBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#070D24' },
});
