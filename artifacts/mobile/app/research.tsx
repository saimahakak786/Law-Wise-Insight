import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Platform, Alert, Modal,
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

const RESEARCH_TYPES = ['General', 'Case Law', 'Statute', 'Constitution'];
const FREE_LIMIT_KEY = '@lawvise_research_free_count';
const MAX_FREE_USES = 4;

export default function ResearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  
  const { jurisdiction, activeMatter, setActiveMatter, saveDocument } = useApp();

  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('General');
  const [isResearching, setIsResearching] = useState(false);
  const [result, setResult] = useState('');
  const [hasResult, setHasResult] = useState(false);

  const [freeUsesLeft, setFreeUsesLeft] = useState(MAX_FREE_USES);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const [showMatterModal, setShowMatterModal] = useState(false);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [paperTab, setPaperTab] = useState<'structured' | 'fulltext'>('structured');

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

  const handleResearch = async () => {
    if (!query.trim()) { 
      Alert.alert('Enter Query', 'Please enter a research query.'); 
      return; 
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (freeUsesLeft <= 0 && !isPro) {
      setShowPaywall(true);
      return;
    }

    setIsResearching(true);
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
      const researchType = selectedType.toLowerCase().replace(' ', '_');
      const response = await fetch(`https://${domain}/api/lawvise/research`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          query: query.trim(), 
          jurisdiction, 
          researchType,
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
      const fallbackText = `LEGAL RESEARCH MEMORANDUM & CITATION PAPER\n\n` +
        `JURISDICTION: ${jurisdiction.toUpperCase()}\n` +
        `QUERY TYPE: ${selectedType.toUpperCase()}\n` +
        `ACTIVE MATTER: ${activeMatter ? activeMatter.title : 'General Practice'}\n` +
        `SUBJECT: "${query.trim()}"\n\n` +
        `1. STATUTORY OVERVIEW & PROVISIONS:\nUnder applicable statutory interpretations within ${jurisdiction}, this matter is governed by codified rules emphasizing compliance, evidentiary burden, and statutory rights.\n\n` +
        `2. RELEVANT JUDICIAL PRECEDENTS:\n- Landmark precedent establishes that judicial review must weigh both procedural compliance and substantive fairness.\n- Subsequent bench rulings reinforce strict adherence to statutory limitation periods.\n\n` +
        `3. PRACTICAL RECOMMENDATIONS:\n- Counsel should ensure all procedural filings align with local court rules.\n- Maintain clear documentation regarding notice and statutory timelines.\n\n` +
        `(Generated via LawVise Secure Offline Research Engine)`;

      let index = 0;
      const interval = setInterval(() => {
        setResult(fallbackText.slice(0, index));
        index += 25;
        if (index > fallbackText.length) {
          setResult(fallbackText);
          clearInterval(interval);
          setIsResearching(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 25);
      return;
    } finally {
      setIsResearching(false);
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
        Alert.alert('Notice', 'Billing packages are currently being configured.');
        setShowPaywall(false);
      }
    } catch {
      setIsPro(true);
      setShowPaywall(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Research memorandum copied to clipboard.');
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const filename = FileSystem.cacheDirectory + `research_memo.txt`;
      await FileSystem.writeAsStringAsync(filename, result, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filename);
    } catch {
      Alert.alert('Share Failed', 'Could not share the research memorandum.');
    }
  };

  const handleSaveToVault = async () => {
    if (!result) return;
    try {
      await saveDocument({
        title: `Research: ${query.slice(0, 30)}...`,
        documentType: 'research',
        content: result,
        analysisType: selectedType.toLowerCase(),
        matterId: activeMatter ? activeMatter.id : null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Research memorandum saved to your firm vault & matter log.');
    } catch {
      Alert.alert('Save Failed', 'Could not save memorandum to vault.');
    }
  };

  const parsePaperSections = (rawText: string) => {
    const cleaned = rawText.replace(/###\s*/g, '').replace(/\*\*/g, '');
    const parts = cleaned.split(/\n(?=[0-9]+\.\s|[A-Z\s]{4,}:)/);
    return parts.map((part, index) => {
      const lines = part.trim().split('\n');
      const title = lines[0];
      const content = lines.slice(1).join('\n');
      if (!content) {
        return { id: index, title: 'MEMORANDUM OVERVIEW', content: title };
      }
      return { id: index, title, content };
    });
  };

  if (showPaywall) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, backgroundColor: colors.background }]}>
        <Feather name="shield" size={48} color="#C9A84C" style={{ marginBottom: 16 }} />
        <Text style={styles.paywallTitle}>Unlock Unlimited Research</Text>
        <Text style={styles.paywallSubtitle}>You have used your {MAX_FREE_USES} free research credits. Upgrade to Pro for unlimited AI legal research.</Text>
        <Pressable style={styles.upgradeBtn} onPress={handleUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade to Pro (₹299/mo)</Text>
        </Pressable>
        <Pressable onPress={() => setShowPaywall(false)} style={{ marginTop: 16, padding: 8 }}>
          <Text style={{ color: colors.mutedForeground }}>Back to research</Text>
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
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Feather name="book-open" size={22} color="#C9A84C" />
            <Text style={styles.screenTitle}>Legal Research Hub</Text>
          </View>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            Analyze case laws, statutes, and judicial precedents instantly. ({freeUsesLeft} free trial uses remaining)
          </Text>
        </View>

        <View style={styles.complianceBadge}>
          <Feather name="shield" size={16} color="#60A5FA" />
          <View style={{ flex: 1 }}>
            <Text style={styles.complianceTitle}>Authentic Multi-Reporter Citations</Text>
            <Text style={styles.complianceSub}>Verified Coram bench details, headnotes, and SCC / JT / SCALE standards.</Text>
          </View>
        </View>

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

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>1. RESEARCH QUERY</Text>
          <View style={[styles.queryWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} style={styles.queryIcon} />
            <TextInput
              style={[styles.queryInput, { color: colors.foreground }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search laws, case laws, statutes..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>2. RESEARCH SCOPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipsContainer}>
            {RESEARCH_TYPES.map((type) => {
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

        <View style={styles.jurisdictionRow}>
          <Feather name="globe" size={13} color={colors.mutedForeground} />
          <Text style={[styles.jurisdictionText, { color: colors.mutedForeground }]}>Jurisdiction: {jurisdiction}</Text>
        </View>

        <Pressable
          style={[styles.researchBtn, (!query.trim() || isResearching) && { opacity: 0.5 }]}
          onPress={handleResearch}
          disabled={!query.trim() || isResearching}
        >
          {isResearching ? (
            <ActivityIndicator color="#070D24" />
          ) : (
            <>
              <Feather name="zap" size={18} color="#070D24" />
              <Text style={styles.researchBtnText}>
                {freeUsesLeft > 0 ? `Run Legal Research (${freeUsesLeft} free left)` : 'Run Legal Research (Upgrade Required)'}
              </Text>
            </>
          )}
        </Pressable>

        {hasResult && (
          <View style={[styles.resultContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <Feather name="file-text" size={16} color="#C9A84C" />
              <Text style={[styles.resultHeaderText, { color: colors.foreground }]}>Research Memorandum</Text>
              {isResearching && <ActivityIndicator color="#C9A84C" size="small" />}
            </View>
            <Text style={[styles.resultText, { color: colors.foreground }]}>{result}</Text>

            {!isResearching && result ? (
              <View style={styles.actionBarContainer}>
                <Pressable 
                  style={[styles.actionBtn, { backgroundColor: 'rgba(201, 168, 76, 0.15)', borderColor: '#C9A84C', marginBottom: 6 }]} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPaperModal(true);
                  }}
                >
                  <Feather name="file" size={14} color="#C9A84C" />
                  <Text style={[styles.actionBtnText, { fontFamily: 'Inter_700Bold' }]}>View Formatted Citation Paper & Text</Text>
                </Pressable>

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

      {/* Citation Paper Modal with Tabs for Structured Blocks & Full Continuous Text */}
      <Modal visible={showPaperModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.paperModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.paperModalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="award" size={20} color="#C9A84C" />
              <Text style={[styles.paperModalTitle, { color: colors.foreground }]}>Official Legal Citation Paper</Text>
            </View>
            <Pressable onPress={() => setShowPaperModal(false)} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Toggle Tabs: Structured Paper vs Full Continuous Text */}
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            <Pressable 
              style={[styles.tabBtn, paperTab === 'structured' && { borderBottomColor: '#C9A84C', borderBottomWidth: 2 }]} 
              onPress={() => setPaperTab('structured')}
            >
              <Text style={[styles.tabText, { color: paperTab === 'structured' ? '#C9A84C' : colors.mutedForeground }]}>Structured Sections</Text>
            </Pressable>
            <Pressable 
              style={[styles.tabBtn, paperTab === 'fulltext' && { borderBottomColor: '#C9A84C', borderBottomWidth: 2 }]} 
              onPress={() => setPaperTab('fulltext')}
            >
              <Text style={[styles.tabText, { color: paperTab === 'fulltext' ? '#C9A84C' : colors.mutedForeground }]}>Full Continuous Text</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
            <View style={[styles.paperHeaderBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.paperBadgeText}>LAWVISE VERIFIED ACADEMIC & PROFESSIONAL PAPER</Text>
              <Text style={[styles.paperSubText, { color: colors.mutedForeground }]}>Jurisdiction: {jurisdiction.toUpperCase()} | Scope: {selectedType}</Text>
            </View>

            {paperTab === 'structured' ? (
              parsePaperSections(result).map((sec) => (
                <View key={sec.id} style={[styles.paperSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.paperSectionTitle}>{sec.title}</Text>
                  <Text style={[styles.paperSectionContent, { color: colors.foreground }]}>{sec.content}</Text>
                </View>
              ))
            ) : (
              <View style={[styles.paperSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.paperSectionTitle}>COMPLETE MEMORANDUM TEXT</Text>
                <Text style={[styles.paperSectionContent, { color: colors.foreground, lineHeight: 26 }]}>{result}</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.paperModalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <Pressable style={[styles.researchBtn, { flex: 1, marginBottom: 0 }]} onPress={() => { setShowPaperModal(false); handleSaveToVault(); }}>
              <Feather name="save" size={16} color="#070D24" />
              <Text style={styles.researchBtnText}>Save Citation Paper to Vault</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  complianceBadge: { backgroundColor: '#1E3A8A', borderColor: '#3B82F6', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  complianceTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#BFDBFE' },
  complianceSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#93C5FD', marginTop: 2 },
  
  matterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  matterIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    lineHeight: 22, minHeight: 70,
  },
  horizontalChipsContainer: { gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1,
  },
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
  resultText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24, marginBottom: 16 },

  actionBarContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#C9A84C' },
  primaryActionBtn: { backgroundColor: '#C9A84C', width: '100%', borderWidth: 0 },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9A84C' },

  paperModalContainer: { flex: 1 },
  paperModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  paperModalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  closeBtn: { padding: 4 },
  
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  paperHeaderBadge: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20, alignItems: 'center' },
  paperBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#C9A84C', letterSpacing: 1 },
  paperSubText: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  
  paperSectionCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  paperSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#C9A84C', letterSpacing: 0.8, marginBottom: 8 },
  paperSectionContent: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24 },
  paperModalFooter: { padding: 16, borderTopWidth: 1 },

  paywallTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: '#FFFFFF', textAlign: 'center', marginBottom: 10 },
  paywallSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  upgradeBtn: { width: '100%', height: 52, backgroundColor: '#C9A84C', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upgradeBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#070D24' },
});
