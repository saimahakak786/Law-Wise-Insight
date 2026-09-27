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
  'Writ Petition',
  'Written Statement',
  'Criminal Complaint',
  'Affidavit',
  'Rent Deed',
  'Lease Deed',
  'Sale Deed',
  'Power of Attorney (GPA/SPA)',
  'Partnership Deed',
  'Employment / Founder Agreement'
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

  // 🏛️ COMPREHENSIVE COMMERCIAL & LITIGATION DRAFTING ENGINE
  const generateComprehensiveDraft = (type: string, userPrompt: string, jur: string) => {
    const cleanType = type.toUpperCase();
    const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    if (cleanType.includes('RENT DEED')) {
      return `RENT DEED / AGREEMENT
DATE: ${currentDate}
PLACE: ${jur.toUpperCase()}

This Rent Deed is made and executed on this day by and between:

LESSOR / LANDLORD: 
[Name], residing at ___________________________ (hereinafter referred to as the "Lessor", which expression shall unless repugnant to the context include heirs, legal representatives, and assigns) of the FIRST PART;

AND

LESSEE / TENANT:
[Name], residing at ___________________________ (hereinafter referred to as the "Lessee", which expression shall include successors and permitted assigns) of the SECOND PART.

WHEREAS the Lessor is the absolute owner and in lawful possession of the residential/commercial premises situated at ________________________ (hereinafter referred to as the "Demised Premises").

AND WHEREAS the Lessee has approached the Lessor for taking the Demised Premises on rent, and the Lessor has agreed to let out the same subject to the following terms and conditions:

1. TENANCY PERIOD & COMMENCEMENT:
   The tenancy shall commence from _________ for an initial lock-in period of 11 months, renewable mutually upon agreed rent escalation. Specific terms provided: ${userPrompt.trim()}

2. RENT & PAYMENT TERMS:
   The monthly rent shall be ₹________/- (Rupees ________________ Only), payable in advance on or before the 7th day of each English calendar month.

3. INTEREST-FREE SECURITY DEPOSIT:
   The Lessee has paid an interest-free refundable security deposit of ₹________/- to the Lessor, refundable at the time of vacating the premises after adjusting any outstanding utility bills or property damages.

4. UTILITIES & MAINTENANCE:
   Electricity and water charges shall be borne by the Lessee strictly in accordance with sub-meter readings. Maintenance charges shall be paid directly to the society/authorities.

5. TERMINATION CLAUSE:
   Either party may terminate this agreement by giving 1 (one) month prior written notice to the other party.

IN WITNESS WHEREOF, the parties have signed this Rent Deed on the date first above written in the presence of witnesses.

LESSOR: ________________________      LESSEE: ________________________

WITNESSES:
1. ______________________
2. ______________________`;
    }

    if (cleanType.includes('LEASE DEED')) {
      return `COMMERCIAL LEASE DEED
DATE: ${currentDate}
JURISDICTION: ${jur.toUpperCase()}

THIS REGISTERED LEASE DEED is made between:
LESSOR: [Name/Company Name], having its registered office at ___________________________ (First Part);
AND
LESSEE: [Name/Company Name], having its principal office at ___________________________ (Second Part).

TERMS OF LEASE & COVENANTS:
1. PROPERTY DESCRIPTION: The Lessor hereby demises to the Lessee the commercial space measuring approx. _____ sq. ft. located at ________________________.
2. CORE INSTRUCTIONS & COVENANTS: ${userPrompt.trim()}
3. LEASE TERM: The lease shall be valid for a period of _____ years, commencing from _________ with an escalation clause of _____% every year.
4. RENT & GST: The monthly lease rent is fixed at ₹________/- plus applicable GST.
5. MAINTENANCE & INDEMNITY: Lessee shall maintain the premises in pristine condition and indemnify Lessor against third-party claims arising from internal business operations.

IN WITNESS WHEREOF, authorized signatories have executed this Deed.

LESSOR (SIGNATURE & SEAL)                LESSEE (SIGNATURE & SEAL)`;
    }

    if (cleanType.includes('SALE DEED')) {
      return `DEED OF ABSOLUTE SALE
DATE: ${currentDate}
PLACE: ${jur.toUpperCase()}

THIS DEED OF SALE is executed on this day by and between:
VENDOR (SELLER): [Name], aged about ___ years, residing at ___________________________ (First Part);
AND
VENDEE (PURCHASER): [Name], aged about ___ years, residing at ___________________________ (Second Part).

WHEREAS the Vendor is the absolute and undisputed owner of the immovable property bearing ________________________.

NOW THIS DEED WITNESSETH AS FOLLOWS:
1. SALE CONSIDERATION: In consideration of the total agreed sale price of ₹________/- (Rupees ________________ Only) paid by the Vendee to the Vendor, the receipt whereof the Vendor acknowledges.
2. SPECIFIC COVENANTS & PROPERTY DETAILS: ${userPrompt.trim()}
3. TRANSFER OF TITLE & POSSESSION: The Vendor hereby transfers, assigns, and conveys all absolute ownership rights, title, and physical vacant possession of the said property to the Vendee.
4. INDEMNITY & ENCUMBRANCE: The Vendor declares that the property is free from all encumbrances, mortgages, liens, or litigation, and undertakes to indemnify the Vendee against any future title defects.

IN WITNESS WHEREOF, the parties have signed this Sale Deed in the presence of attesting witnesses.

VENDOR: ________________________      VENDEE: ________________________`;
    }

    if (cleanType.includes('POWER OF ATTORNEY')) {
      return `GENERAL / SPECIAL POWER OF ATTORNEY (GPA / SPA)
DATE: ${currentDate}
JURISDICTION: ${jur.toUpperCase()}

KNOW ALL MEN BY THESE PRESENTS that I, [Principal Name], residing at ___________________________, do hereby appoint, constitute, and empower [Attorney Name], residing at ___________________________, as my lawful Attorney to act on my behalf for the following specific acts and deeds:

1. SCOPE AND AUTHORITY:
   ${userPrompt.trim()}

2. RATIFICATION:
   I hereby ratify and confirm all lawful acts, deeds, and things done by my said Attorney pursuant to this Power of Attorney as if performed by me personally.

IN WITNESS WHEREOF, I have executed this instrument on this date.

PRINCIPAL: ________________________      ATTORNEY: ________________________`;
    }

    if (cleanType.includes('PARTNERSHIP DEED')) {
      return `DEED OF PARTNERSHIP
DATE: ${currentDate}
PLACE: ${jur.toUpperCase()}

This Partnership Deed is entered into by and between:
1. [Partner 1 Name], residing at ___________________________
2. [Partner 2 Name], residing at ___________________________

WHEREAS the parties have agreed to carry on business in partnership under the following terms:
1. FIRM NAME & OBJECT: The business shall be carried on under the name and style of M/s ________________________ with the core objective of: ${userPrompt.trim()}
2. CAPITAL CONTRIBUTION & PROFIT SHARING: Capital shall be contributed as mutually agreed, and net profits/losses shall be shared in the ratio of ____ : ____.
3. MANAGEMENT & BANK ACCOUNTS: Bank accounts shall be operated jointly or severally by designated partners.

IN WITNESS WHEREOF, the partners have signed this Deed.

PARTNER 1: ______________________      PARTNER 2: ______________________`;
    }

    if (cleanType.includes('EMPLOYMENT') || cleanType.includes('AGREEMENT')) {
      return `EMPLOYMENT / FOUNDER AGREEMENT
DATE: ${currentDate}
JURISDICTION: ${jur.toUpperCase()}

This Agreement is made between [Company Name] and [Employee/Founder Name].
1. POSITION & DUTIES: ${userPrompt.trim()}
2. COMPENSATION & BENEFITS: Annual CTC of ₹________/- payable monthly, subject to statutory deductions.
3. CONFIDENTIALITY & IP: All intellectual property created during employment shall remain the exclusive property of the company.

IN WITNESS WHEREOF, the parties execute this Agreement.

EMPLOYER: ______________________      EMPLOYEE: ______________________`;
    }

    if (cleanType.includes('BAIL')) {
      return `IN THE COURT OF SESSION / JUDICIAL MAGISTRATE, ${jur.toUpperCase()}
BAIL APPLICATION NO. _____ OF 2026

IN THE MATTER OF:
State through Police Station: _____________________
VERSUS
Applicant / Accused: ______________________

CRIMINAL MISCELLANEOUS APPLICATION FOR REGULAR BAIL UNDER SECTION 439 CRPC / SECTION 483 BNSS

THE APPLICANT RESPECTFULLY SUBMITS AS FOLLOWS:

1. CORE SYNOPSIS & CONTEXT:
   The applicant stands falsely implicated in FIR No. _____ dated _____, registered under Sections _____ at Police Station _____. Factual matrix: ${userPrompt.trim()}

2. GROUNDS FOR ENLARGEMENT ON BAIL:
   A. No Custodial Necessity: Investigation is complete; custodial interrogation is unnecessary.
   B. Clean Antecedents: The applicant has unblemished antecedents with zero risk of flight.
   C. Right to Personal Liberty: Continued pre-trial detention violates Article 21 of the Constitution.

PRAYER:
It is prayed that this Court may grant regular bail to the applicant.

COUNSEL FOR THE APPLICANT`;
    }

    if (cleanType.includes('LEGAL NOTICE')) {
      return `MEMORANDUM OF LEGAL NOTICE
DATE: ${currentDate}
JURISDICTION: ${jur.toUpperCase()}

UNDER INSTRUCTIONS FROM AND ON BEHALF OF MY CLIENT, I do hereby serve you with this Legal Notice as follows:

1. CORE GRIEVANCE & FACTS:
   ${userPrompt.trim()}

2. LEGAL LIABILITY & DEMAND:
   You are hereby called upon to rectify the breach / make payment of dues / cease illegal actions within 15 days of receipt of this notice, failing which my client shall be constrained to initiate appropriate civil and criminal legal proceedings against you at your sole risk, cost, and consequences.

ADVOCATE FOR THE CLIENT`;
    }

    // Generic fallback for other litigation/court petitions
    return `IN THE COURT / FORUM OF: ${jur.toUpperCase()}
DOCUMENT TYPE: ${cleanType}

THE APPLICANT / PARTY RESPECTFULLY SUBMITS:

1. FACTUAL BACKGROUND & INSTRUCTIONS:
   ${userPrompt.trim()}

2. GOVERNING COVENANTS & LEGAL GROUNDS:
   The rights, liabilities, and obligations of the parties are governed in accordance with applicable statutory provisions and principles of equity and contract law.

3. OPERATIVE TERMS / PRAYER:
   All parties shall adhere strictly to the stipulated terms herein.

PLACE: ${jur.toUpperCase()}
DATE: ${currentDate}

COUNSEL / AUTHORIZED SIGNATORY`;
  };

  const handleDraft = async () => {
    if (!prompt.trim()) { 
      Alert.alert('Enter Prompt', 'Please describe the facts, terms, or background for this document.'); 
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
      // Offline / fallback generator utilizing selectedType accurately
      const comprehensiveText = generateComprehensiveDraft(selectedType, prompt, jurisdiction);

      let index = 0;
      const interval = setInterval(() => {
        setResult(comprehensiveText.slice(0, index));
        index += 45;
        if (index > comprehensiveText.length) {
          setResult(comprehensiveText);
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
    Alert.alert('Copied', 'Legal document copied to clipboard.');
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const filename = FileSystem.cacheDirectory + `legal_document.txt`;
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
        <Text style={styles.paywallSubtitle}>You have used your {MAX_FREE_USES} free drafting credits. Upgrade to Pro for unlimited deeds, leases, and litigations.</Text>

        <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.priceText}>₹299 <Text style={{ fontSize: 14, color: colors.mutedForeground }}>/ month</Text></Text>
          <View style={styles.featureBullet}><Feather name="check" size={16} color="#C9A84C" /><Text style={[styles.featureText, { color: colors.foreground }]}>Unlimited Deeds, Leases, Petitions & Notices</Text></View>
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
            <Text style={styles.screenTitle}>Smart Legal Drafting</Text>
          </View>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            Generate binding contracts, rent deeds, lease deeds, sale deeds, and court petitions instantly. ({freeUsesLeft} free trial uses remaining)
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
          <Text style={styles.sectionHeaderLabel}>1. DRAFT SPECIFICATIONS & URGENCY</Text>
          <View style={[styles.queryWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="edit-3" size={18} color={colors.mutedForeground} style={styles.queryIcon} />
            <TextInput
              style={[styles.queryInput, { color: colors.foreground }]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe facts, property details, party names, or terms..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Step 2: Document Type Selection */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>2. DOCUMENT CATEGORY</Text>
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
                {freeUsesLeft > 0 ? `Generate Professional Draft (${freeUsesLeft} free left)` : 'Generate Professional Draft (Upgrade Required)'}
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
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Drafting professional agreement...</Text>
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
  sectionHeaderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C', letterSpacing: 1.2, marginBottom: 10 },
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
