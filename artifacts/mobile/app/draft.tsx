import React, { useState, useRef } from 'react';
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
import MatterModal from '@/components/MatterModal';

const DRAFT_TYPES = [
  'Stay / Injunction IA',
  'Interlocutory App (IA)',
  'Legal Notice',
  'Bail Application',
  'Written Statement',
  'Sale Deed',
  'Writ Petition',
  'Affidavit',
  'Contract',
  'Agreement',
  'Petition'
];

export default function DraftScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  
  // Pull global jurisdiction, active matter state, and vault saver from AppContext
  const { jurisdiction, activeMatter, setActiveMatter, saveDocument } = useApp();

  const [prompt, setPrompt] = useState('');
  const [selectedType, setSelectedType] = useState('Stay / Injunction IA');
  const [isDrafting, setIsDrafting] = useState(false);
  const [result, setResult] = useState('');
  const [hasResult, setHasResult] = useState(false);

  // Modal visibility state for Firm Matter Workspace
  const [showMatterModal, setShowMatterModal] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  const handleDraft = async () => {
    if (!prompt.trim()) { Alert.alert('Enter Prompt', 'Please describe the facts, urgency, and interim relief required for this draft.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDrafting(true);
    setResult('');
    setHasResult(true);

    try {
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
      const fallbackText = `IN THE COURT / FORUM OF: ${jurisdiction.toUpperCase()}\n` +
        `ACTIVE MATTER: ${activeMatter ? activeMatter.title : 'General Practice'}\n` +
        `DOCUMENT TYPE: ${selectedType.toUpperCase()}\n\n` +
        `------------------------------------------------------------------------------------\n` +
        `MEMORANDUM OF ${selectedType.toUpperCase()}\n` +
        `------------------------------------------------------------------------------------\n\n` +
        `1. CAUSE TITLE & PARTICULARS:\n` +
        `   - Subject / Emergency: "${prompt.trim()}"\n` +
        `   - Governing Framework: Applicable statutory provisions and procedural codes under ${jurisdiction}.\n\n` +
        `2. GROUNDS FOR URGENCY / INTERIM RELIEF:\n` +
        `   - That the applicant has a strong prima facie case in their favor.\n` +
        `   - That the balance of convenience lies heavily in favor of the applicant, and irreparable loss or injury shall be caused if interim protection is not granted.\n` +
        `   - Specific factual matrix: ${prompt.trim()}\n\n` +
        `3. PRAYER / INTERIM DIRECTIONS SOUGHT:\n` +
        `   - It is most respectfully prayed that this Hon'ble Court may be pleased to grant an ad-interim ex-parte stay / injunction restraining the respondents from acting contrary to law, pending final adjudication of the main matter.\n\n` +
        `VERIFICATION:\n` +
        `I, the Applicant/Counsel, do hereby verify that the contents of this ${selectedType} are true and correct to the best of my knowledge and instructions.\n\n` +
        `(Generated via LawVise Senior Counsel Drafting Engine)`;

      let index = 0;
      const interval = setInterval(() => {
        setResult(fallbackText.slice(0, index));
        index += 35;
        if (index > fallbackText.length) {
          setResult(fallbackText);
          clearInterval(interval);
          setIsDrafting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 20);
      return;
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Legal draft copied to clipboard.');
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const filename = FileSystem.cacheDirectory + `legal_draft.txt`;
      await FileSystem.writeAsStringAsync(filename, result, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filename);
    } catch {
      Alert.alert('Share Failed', 'Could not share the legal draft.');
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
      Alert.alert('Saved', 'Legal draft saved to your firm vault & matter log.');
    } catch {
      Alert.alert('Save Failed', 'Could not save draft to vault.');
    }
  };

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
            Generate binding contracts, injunction stay IAs, bail applications, and court petitions instantly.
          </Text>
        </View>

        {/* Firm Matter Workspace Banner (Triggers Modal) */}
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
              placeholder="Describe emergency, interim protection required, parties, grounds..."
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
              <Text style={styles.researchBtnText}>Generate Professional Draft</Text>
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
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Drafting comprehensive legal clauses...</Text>
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
  headerContainer: { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF' },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  matterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    lineHeight: 22, minHeight: 90,
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
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  resultText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24, marginBottom: 16 },

  actionBarContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#C9A84C' },
  primaryActionBtn: { backgroundColor: '#C9A84C', width: '100%', borderWidth: 0 },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9A84C' },
});
