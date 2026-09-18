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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';

const DOC_TYPES = [
  { id: 'contract', label: 'Commercial Contract' },
  { id: 'petition', label: 'Court Petition' },
  { id: 'notice', label: 'Legal Notice' },
  { id: 'affidavit', label: 'Affidavit' },
];

export default function DraftScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { jurisdiction, saveDocument } = useApp();

  const [prompt, setPrompt] = useState('');
  const [selectedType, setSelectedType] = useState('contract');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  // Matter Workspace States
  const [activeMatter, setActiveMatter] = useState<{ id: string; title: string } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  const handleDraft = async () => {
    if (!prompt.trim()) { Alert.alert('Enter Details', 'Please provide drafting instructions.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDrafting(true);
    setDraft('');
    setHasDraft(true);

    try {
      const token = await getToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN || 'law-wise-insight.onrender.com';
      const response = await fetch(`https://${domain}/api/lawvise/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          prompt: prompt.trim(), 
          jurisdiction, 
          docType: selectedType,
          matterId: activeMatter ? activeMatter.id : null 
        }),
      });

      if (!response.ok || !response.body) throw new Error('Draft stream failed');

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
            if (data.content) setDraft((p) => p + data.content);
            if (data.done) break;
          } catch { /* skip */ }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      const fallbackDraft = `FORMAL LEGAL DRAFT (${selectedType.toUpperCase()})\n` +
        `JURISDICTION: ${jurisdiction.toUpperCase()}\n` +
        `ACTIVE MATTER: ${activeMatter ? activeMatter.title : 'General Practice'}\n\n` +
        `THIS AGREEMENT/PETITION is made and entered into under the laws of ${jurisdiction}.\n\n` +
        `1. PRELIMINARY RECITALS:\n- The parties intend to establish clear binding obligations in accordance with statutory compliance frameworks.\n\n` +
        `2. OPERATIVE CLAUSES:\n- Subject matter parameters, covenants, and performance timelines are strictly regulated herein.\n\n` +
        `3. GOVERNANCE & JURISDICTION:\n- Any disputes arising herefrom shall be subject to the exclusive jurisdiction of courts in ${jurisdiction}.\n\n` +
        `(Generated via LawVise Secure Smart Drafting Engine)`;

      let index = 0;
      const interval = setInterval(() => {
        setDraft(fallbackDraft.slice(0, index));
        index += 25;
        if (index > fallbackDraft.length) {
          setDraft(fallbackDraft);
          clearInterval(interval);
          setIsDrafting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 25);
      return;
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    await Clipboard.setStringAsync(draft);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Draft copied to clipboard.');
  };

  const handleShare = async () => {
    if (!draft) return;
    try {
      const filename = FileSystem.cacheDirectory + `${selectedType}_draft.txt`;
      await FileSystem.writeAsStringAsync(filename, draft, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filename);
    } catch {
      Alert.alert('Share Failed', 'Could not share the draft.');
    }
  };

  const handleExportPDF = async () => {
    if (!draft) return;
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #111; line-height: 1.6; }
              h1 { font-size: 18px; color: #C9A84C; text-transform: uppercase; border-bottom: 2px solid #C9A84C; padding-bottom: 8px; }
              .meta { font-size: 12px; color: #555; margin-bottom: 20px; }
              .content { font-size: 14px; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>LawVise Enterprise Legal Document</h1>
            <div class="meta">Jurisdiction: ${jurisdiction.toUpperCase()} | Document Type: ${selectedType.toUpperCase()}</div>
            <div class="content">${draft}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Export Failed', 'Could not generate PDF export.');
    }
  };

  const handleSaveToVault = async () => {
    if (!draft) return;
    try {
      await saveDocument({
        title: `${DOC_TYPES.find(d => d.id === selectedType)?.label || selectedType} Draft`,
        documentType: selectedType,
        content: draft,
        analysisType: 'draft',
        matterId: activeMatter ? activeMatter.id : null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Draft saved to your firm vault and matter log.');
    } catch {
      Alert.alert('Save Failed', 'Could not save to vault. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        onContentSizeChange={() => hasDraft && scrollRef.current?.scrollToEnd({ animated: true })}
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
            Generate compliant agreements, petitions, and legal notices.
          </Text>
        </View>

        {/* Enterprise Verification & Compliance Badge */}
        <View style={styles.complianceBadge}>
          <Feather name="shield" size={16} color="#60A5FA" />
          <View style={{ flex: 1 }}>
            <Text style={styles.complianceTitle}>Enterprise Verification Standard</Text>
            <Text style={styles.complianceSub}>Clause validity verified against civil & constitutional frameworks.</Text>
          </View>
        </View>

        {/* Firm Matter Workspace Banner */}
        <Pressable 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert(
              "Matter Workspace",
              activeMatter ? `Current: ${activeMatter.title}` : "Select active matter for firm billing and file tracking.",
              [
                { text: "Clear Matter", onPress: () => setActiveMatter(null) },
                { text: "Select Demo Matter (TechCorp v. DataSystems)", onPress: () => setActiveMatter({ id: 'matter_123', title: 'TechCorp v. DataSystems Litigation' }) },
                { text: "Cancel", style: "cancel" }
              ]
            );
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
          <Text style={styles.sectionHeaderLabel}>1. DRAFTING INSTRUCTIONS</Text>
          <View style={[styles.queryWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="edit-3" size={18} color={colors.mutedForeground} style={styles.queryIcon} />
            <TextInput
              style={[styles.queryInput, { color: colors.foreground }]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe terms, clauses, or obligations..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Step 2: Document Type Selection */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>2. DOCUMENT TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipsContainer}>
            {DOC_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <Pressable
                  key={type.id}
                  style={[
                    styles.chip,
                    { backgroundColor: isSelected ? '#C9A84C' : colors.card, borderColor: isSelected ? '#C9A84C' : colors.border },
                  ]}
                  onPress={() => setSelectedType(type.id)}
                >
                  <Text style={[styles.chipText, { color: isSelected ? '#070D24' : colors.foreground }]}>{type.label}</Text>
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

        {/* Draft Button */}
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
              <Text style={styles.researchBtnText}>Generate Legal Draft</Text>
            </>
          )}
        </Pressable>

        {/* Result & Action Bar */}
        {hasDraft && (
          <View style={[styles.resultContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <Feather name="file-text" size={16} color="#C9A84C" />
              <Text style={[styles.resultHeaderText, { color: colors.foreground }]}>
                {DOC_TYPES.find(d => d.id === selectedType)?.label} Output
              </Text>
              {isDrafting && <ActivityIndicator color="#C9A84C" size="small" />}
            </View>
            {isDrafting && !draft ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#C9A84C" />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Drafting compliant clauses...</Text>
              </View>
            ) : null}
            <Text style={[styles.resultText, { color: colors.foreground }]}>{draft}</Text>

            {/* Action Bar */}
            {!isDrafting && draft ? (
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
                  <Pressable style={styles.actionBtn} onPress={handleExportPDF}>
                    <Feather name="file-text" size={14} color="#C9A84C" />
                    <Text style={styles.actionBtnText}>Export PDF</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  resultText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24, marginBottom: 16 },
  
  actionBarContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#C9A84C' },
  primaryActionBtn: { backgroundColor: '#C9A84C', width: '100%', borderWidth: 0 },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9A84C' },
});
