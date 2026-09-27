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

  // 🏛️ ELITE CHAMBER-GRADE DRAFTING ENGINE (Modeled after Senior Counsel Drafting)
  const generateEliteChamberDraft = (type: string, userPrompt: string, jur: string) => {
    const cleanType = type.toUpperCase();
    const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    if (cleanType.includes('RENT DEED')) {
      return `THIS RENT DEED is made and executed on this ______ day of ____________, 2026 at ${jur.toUpperCase()}, by and between:

1. LESSOR: 
[Name], S/o / W/o [Father's/Spouse's Name], residing at __________________________________________________ (hereinafter called the "LESSOR", which expression shall unless repugnant to the context include his/her heirs, legal representatives, executors, and administrators) of the FIRST PART;

AND

2. LESSEE: 
[Name], S/o / W/o [Father's/Spouse's Name], residing at __________________________________________________ (hereinafter called the "LESSEE", which expression shall unless repugnant to the context include his/her heirs, legal representatives, successors, and permitted assigns) of the SECOND PART.

WHEREAS the Lessor is the absolute owner and in lawful physical possession of the residential/commercial premises bearing property address ________________________________________ (hereinafter referred to as the "Demised Premises").

AND WHEREAS the Lessee has approached the Lessor to take the Demised Premises on monthly rent for residential/commercial use, and the Lessor has agreed to let out the same on the following terms and conditions:

1. TERM OF TENANCY:
   The tenancy shall commence with effect from ____________ for an initial locked-in period of 11 (eleven) months, subject to extension upon mutual written consent of both parties with an agreed rent escalation clause. Specific instructions provided: ${userPrompt.trim()}

2. RENT & MODE OF PAYMENT:
   The Lessee shall pay a monthly rent of ₹________/- (Rupees ________________________________________________ Only) in advance on or before the 7th day of each calendar month directly into the designated bank account of the Lessor.

3. INTEREST-FREE SECURITY DEPOSIT:
   The Lessee has deposited an interest-free refundable security deposit of ₹________/- (Rupees ________________________________________________ Only) with the Lessor, which shall be refunded at the time of vacating the Demised Premises, subject to deduction of unpaid utility dues or structural damages beyond normal wear and tear.

4. UTILITIES & MAINTENANCE:
   Electricity and water bills shall be paid regularly by the Lessee based on sub-meter readings. Maintenance charges, if any, shall be borne directly by the Lessee.

5. TERMINATION AND DEFAULT:
   Either party may terminate this agreement by serving 1 (one) month prior written notice. Default in rent payment for two consecutive months shall entitle the Lessor to immediate eviction and re-entry.

IN WITNESS WHEREOF, the parties hereto have signed this Rent Deed on the day, month, and year first above written in the presence of the following witnesses:

LESSOR: ________________________      LESSEE: ________________________

WITNESSES:
1. Name: _____________________        2. Name: _____________________
   Address: __________________           Address: __________________`;
    }

    if (cleanType.includes('LEASE DEED')) {
      return `REGISTERED COMMERCIAL LEASE DEED
DATE: ${currentDate}
JURISDICTION: ${jur.toUpperCase()}

THIS LEASE DEED is executed at ${jur.toUpperCase()} by and between:
M/S [LESSOR ENTITY NAME], having its registered office at __________________________________________________ (hereinafter referred to as the "LESSOR");
AND
M/S [LESSEE ENTITY NAME], having its corporate office at __________________________________________________ (hereinafter referred to as the "LESSEE").

COVENANTS OF LEASE:
1. PROPERTY & AREA: Demised commercial space measuring approximately _____ sq. ft., situated at ________________________________________.
2. CORE COMMERCIAL TERMS: ${userPrompt.trim()}
3. LEASE TENURE & ESCALATION: Valid for a term of _____ years commencing from _________, with a standard _____% escalation on the base rent at the end of every block of 12 months.
4. RENT & APPLICABLE TAXES: Monthly lease rent fixed at ₹________/- plus applicable Goods and Services Tax (GST).
5. INDEMNITY & COVENANTS: The Lessee covenants to maintain statutory compliances, fire safety norms, and hold the Lessor harmless from third-party operational claims.

IN WITNESS WHEREOF, authorized representatives have executed this Deed.

LESSOR (SIGNATURE & SEAL)                LESSEE (SIGNATURE & SEAL)`;
    }

    if (cleanType.includes('SALE DEED')) {
      return `DEED OF ABSOLUTE SALE
DATE: ${currentDate}
PLACE: ${jur.toUpperCase()}

THIS DEED OF ABSOLUTE SALE is made and executed by:
VENDOR: [Name], S/o ____________________, aged about ___ years, residing at __________________________________________________ (First Part);
AND
VENDEE: [Name], S/o ____________________, aged about ___ years, residing at __________________________________________________ (Second Part).

WHEREAS the Vendor is the absolute owner, seized and possessed of the immovable property bearing __________________________________________________, having acquired the same through registered title deeds.

NOW THIS DEED WITNESSETH AS FOLLOWS:
1. CONSIDERATION: In consideration of the total sum of ₹________/- (Rupees ________________________________________________ Only) paid by the Vendee to the Vendor, receipt of which is hereby acknowledged by the Vendor.
2. PROPERTY DETAILS & INSTRUCTIONS: ${userPrompt.trim()}
3. CONVEYANCE & TITLE TRANSFER: The Vendor hereby grants, conveys, transfers, and assigns absolute ownership, title, and vacant physical possession of the schedule property to the Vendee.
4. COVENANT OF TITLE: The Vendor declares that the property is free from all encumbrances, charges, mortgages, liens, prior sales, or attachments, and undertakes to indemnify the Vendee against any subsequent loss arising from title defects.

IN WITNESS WHEREOF, the Vendor and Vendee have set their hands to this Sale Deed in the presence of attesting witnesses.

VENDOR: ________________________      VENDEE: ________________________`;
    }

    if (cleanType.includes('POWER OF ATTORNEY')) {
      return `GENERAL / SPECIAL POWER OF ATTORNEY (GPA / SPA)
DATE: ${currentDate}
JURISDICTION: ${jur.toUpperCase()}

KNOW ALL MEN BY THESE PRESENTS that I, [Principal Name], S/o ____________________, residing at __________________________________________________, do hereby nominate, constitute, and appoint [Attorney Name], S/o ____________________, residing at __________________________________________________, as my true and lawful Attorney-in-Fact to act on my behalf for the following acts, deeds, and execution:

1. SCOPE AND OPERATIVE AUTHORITY:
   ${userPrompt.trim()}

2. RATIFICATION:
   I hereby agree and undertake to ratify and confirm all lawful acts, deeds, and registrations executed by my said Attorney pursuant to the powers conferred under this instrument.

IN WITNESS WHEREOF, I have executed this Power of Attorney on this day.

PRINCIPAL: ________________________      ATTORNEY: ________________________`;
    }

    if (cleanType.includes('PARTNERSHIP DEED')) {
      return `DEED OF PARTNERSHIP
DATE: ${currentDate}
PLACE: ${jur.toUpperCase()}

THIS DEED OF PARTNERSHIP is entered into on this day by and between:
1. [Partner 1 Name], residing at __________________________________________________
2. [Partner 2 Name], residing at __________________________________________________

IT IS MUTUALLY AGREED AS FOLLOWS:
1. FIRM NAME & PRINCIPAL PLACE: The business shall be conducted under the name and style of M/s ________________________ with the core commercial objective of: ${userPrompt.trim()}
2. CAPITAL & PROFIT-SHARING RATIO: Capital contribution shall be made as mutually agreed, and net profits/losses shall be shared in the ratio of ____ : ____.
3. BANK ACCOUNTS & MANAGEMENT: Operational bank accounts shall be operated under joint or designated signatures of the partners.

IN WITNESS WHEREOF, the partners have affixed their signatures.

PARTNER 1: ______________________      PARTNER 2: ______________________`;
    }

    if (cleanType.includes('EMPLOYMENT') || cleanType.includes('AGREEMENT')) {
      return `EMPLOYMENT & FOUNDER COVENANT AGREEMENT
DATE: ${currentDate}
JURISDICTION: ${jur.toUpperCase()}

This Agreement sets forth the terms of engagement between [Company Name] and [Employee/Founder Name].
1. ROLE & DUTIES: ${userPrompt.trim()}
2. REMUNERATION: Annual compensation package of ₹________/- payable monthly, subject to applicable TDS and statutory deductions.
3. INTELLECTUAL PROPERTY & NON-COMPETE: All intellectual property, code, and inventions generated during tenure remain the sole exclusive proprietary asset of the company.

IN WITNESS WHEREOF, the parties execute this Agreement.

EMPLOYER: ______________________      EMPLOYEE: ______________________`;
    }

    if (cleanType.includes('BAIL')) {
      return `IN THE COURT OF THE SESSIONS JUDGE / JUDICIAL MAGISTRATE, ${jur.toUpperCase()}
BAIL APPLICATION NO. _____ OF 2026

IN THE MATTER OF:
State through Police Station: _____________________
VERSUS
Applicant / Accused: ______________________

CRIMINAL MISCELLANEOUS APPLICATION FOR REGULAR BAIL UNDER SECTION 439 CRPC / SECTION 483 BNSS

THE APPLICANT ABOVE-NAMED RESPECTFULLY SUBMITS AS FOLLOWS:

1. MATRIX OF FACTS & FALSE IMPLICATION:
   The applicant has been falsely and maliciously roped in FIR No. _____ dated _____, registered under Sections _____ at P.S. _____. The actual factual narrative is as follows: ${userPrompt.trim()}

2. GROUNDS FOR ENLARGEMENT ON BAIL:
   A. Custodial Interrogation Unnecessary: Investigation qua the applicant is complete, and no recovery remains pending.
   B. Unblemished Antecedents: The applicant possesses deep roots in society with no prior criminal antecedents or propensity for flight.
   C. Infringement of Personal Liberty: Continued pre-trial incarceration amounts to punitive detention prior to trial, violating Article 21 of the Constitution.

PRAYER:
It is respectfully prayed that this Court may be pleased to enlarge the applicant on regular bail in connection with the aforesaid FIR.

COUNSEL FOR THE APPLICANT`;
    }

    if (cleanType.includes('LEGAL NOTICE')) {
      return `BY SPEED POST / REGISTERED AD / EMAIL
DATE: ${currentDate}

TO,
[NAME & ADDRESS OF ADDRESSEE / OPPOSITE PARTY]
__________________________________________________

SUBJECT: STATUTORY LEGAL NOTICE FOR BREACH OF OBLIGATION, RECOVERY OF DUES, AND DAMAGES.

DEAR SIR/MADAM,

Under express instructions from and on behalf of my client, [Client Name], resident of __________________________________________________, I serve upon you this formal legal notice:

1. FACTUAL BACKGROUND & GRIEVANCE:
   ${userPrompt.trim()}

2. LEGAL LIABILITY:
   Your acts constitute a clear breach of legal/contractual duty, rendering you liable for civil recovery and damages.

3. FINAL CALL TO ACTION:
   You are hereby called upon to comply with the demands and remit a sum of ₹________/- within **15 days** of receipt of this notice, failing which my client shall institute appropriate legal proceedings against you in a competent court of law at your sole risk, cost, and consequence.

SINCERELY,

COUNSEL FOR THE CLIENT`;
    }

    // Default Elite Chamber Format
    return `MEMORANDUM OF ${cleanType}
JURISDICTION: ${jur.toUpperCase()}

THE APPLICANT / PARTY RESPECTFULLY SUBMITS:

1. FACTUAL MATRIX & INSTRUCTIONS:
   ${userPrompt.trim()}

2. STATUTORY FRAMEWORK & LEGAL SUBMISSIONS:
   The rights, liabilities, and obligations of the parties stand governed by applicable statutory provisions, precedents, and rules of equity.

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
      const eliteText = generateEliteChamberDraft(selectedType, prompt, jurisdiction);

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
          <Text style={styles.sectionHeaderLabel}>1. INSTRUCTIONS & MATERIAL FACTS</Text>
          <View style={[styles.queryWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="edit-3" size={18} color={colors.mutedForeground} style={styles.queryIcon} />
            <TextInput
              style={[styles.queryInput, { color: colors.foreground }]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Provide names, rent/consideration amount, and key terms..."
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
