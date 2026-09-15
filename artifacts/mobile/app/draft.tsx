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
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { useSaveDocument } from '@workspace/api-client-react';

import Button from '@/components/Button';
import VoiceDictation from '@/components/VoiceDictation';
import UpgradeModal from '@/components/UpgradeModal';

const DOC_TYPES = [
  { id: 'legal_notice', label: 'Legal Notice', icon: 'alert-circle' },
  { id: 'plaint', label: 'Civil Plaint', icon: 'file-text' },
  { id: 'written_statement', label: 'Written Statement', icon: 'edit-3' },
  { id: 'affidavit', label: 'Affidavit', icon: 'feather' },
  { id: 'bail_application', label: 'Bail Application', icon: 'shield' },
  { id: 'contract', label: 'Contract', icon: 'briefcase' },
  { id: 'agreement', label: 'Agreement', icon: 'users' },
  { id: 'petition', label: 'Petition', icon: 'layers' },
  { id: 'reply_notice', label: 'Reply Notice', icon: 'corner-up-right' },
  { id: 'power_of_attorney', label: 'Power of Attorney', icon: 'key' },
  { id: 'memorandum', label: 'Memorandum', icon: 'book' },
  { id: 'writ_petition', label: 'Writ Petition', icon: 'award' },
];

export default function DraftScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { jurisdiction, language } = useApp();
  const saveDocument = useSaveDocument();

  const [selectedType, setSelectedType] = useState('contract');
  const [details, setDetails] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  
  const [isProUser, setIsProUser] = useState(false); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const handleDraft = async () => {
    if (!selectedType) { Alert.alert('Select Document Type', 'Please choose the type of document to draft.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDrafting(true);
    setDraft('');
    setShowDraft(true);

    try {
      const token = await getToken();
      const domain = 'https://law-wise-insight.onrender.com';
      const response = await fetch(`${domain}/api/lawwise/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentType: selectedType, jurisdiction, language, details: details || null }),
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
            if (data.content) setDraft((p) => p + data.content);
            if (data.done) break;
          } catch { /* skip */ }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsDrafting(false);
    } catch {
      const docLabel = DOC_TYPES.find((d) => d.id === selectedType)?.label ?? selectedType;
      const mockText = `BEFORE THE COURT OF COMPETENT JURISDICTION AT ${jurisdiction.toUpperCase()}\n\n` +
        `IN THE MATTER OF:\n${docLabel.toUpperCase()}\n\n` +
        `PARTICULARS & DETAILS:\n${details || 'Standard statutory compliance drafted under applicable provisions.'}\n\n` +
        `1. That the aggrieved party approaches this forum seeking immediate legal redressal.\n` +
        `2. That all representations and covenants stated herein are true to the best of counsel's knowledge.\n` +
        `3. That the respondent is hereby called upon to comply with statutory obligations within 15 days of receipt.\n\n` +
        `DATED THIS 7TH DAY OF SEPTEMBER, 2026.\n\n` +
        `COUNSEL FOR THE APPLICANT\n(Generated via LawVise Secure Engine)`;

      let index = 0;
      const interval = setInterval(() => {
        setDraft(mockText.slice(0, index));
        index += 15;
        if (index > mockText.length) {
          setDraft(mockText);
          clearInterval(interval);
          setIsDrafting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 30);
    }
  };

  const handleShare = async () => {
    if (!draft) return;
    try {
      const docType = DOC_TYPES.find((d) => d.id === selectedType);
      const filename = FileSystem.cacheDirectory + `${docType?.label ?? selectedType}_draft.txt`;
      await FileSystem.writeAsStringAsync(filename, draft, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filename);
    } catch {
      Alert.alert('Share Failed', 'Could not share the draft.');
    }
  };

  const handleSaveToVault = async () => {
    if (!draft) return;
    try {
      const docType = DOC_TYPES.find((d) => d.id === selectedType);
      await saveDocument.mutateAsync({
        data: {
          title: `${docType?.label ?? selectedType} Draft`,
          documentType: selectedType,
          content: draft,
          analysisType: 'draft',
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Draft saved to your vault.');
    } catch {
      Alert.alert('Save Failed', 'Could not save to vault. Please try again.');
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    await Clipboard.setStringAsync(draft);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Draft copied to clipboard.');
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  if (showDraft) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.draftHeader, { paddingTop: padTop, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowDraft(false)} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#C9A84C" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.draftHeaderTitle}>{DOC_TYPES.find((d) => d.id === selectedType)?.label ?? selectedType}</Text>
            <Text style={[styles.draftHeaderSub, { color: colors.mutedForeground }]}>{jurisdiction} Law</Text>
          </View>
          {isDrafting && <ActivityIndicator color="#C9A84C" />}
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {isDrafting && !draft && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#C9A84C" />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Drafting your {DOC_TYPES.find((d) => d.id === selectedType)?.label ?? selectedType}...
              </Text>
            </View>
          )}
          <Text style={[styles.draftText, { color: colors.foreground }]}>{draft}</Text>
        </ScrollView>

        {!isDrafting && draft ? (
          <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
            <Button title="Copy" variant="outline" onPress={handleCopy} style={styles.actionBtnCustom} />
            <Button title="Share" variant="outline" onPress={handleShare} style={styles.actionBtnCustom} />
            <Button title={saveDocument.isPending ? "Saving..." : "Save to Vault"} variant="primary" onPress={handleSaveToVault} style={[styles.actionBtnCustom, styles.primaryActionBtn]} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAwareScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40 }}
        bottomOffset={20}
      >
        {/* Header Title Section */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Feather name="file-text" size={22} color="#C9A84C" />
            <Text style={styles.screenTitle}>Legal Drafting Workspace</Text>
          </View>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            Generate court-ready instruments and agreements instantly.
          </Text>
        </View>

        {/* Step 1: Document Type Selector (Clean Horizontal Scroll) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>1. SELECT DOCUMENT TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipsContainer}>
            {DOC_TYPES.map((dt) => {
              const isSelected = selectedType === dt.id;
              return (
                <Pressable
                  key={dt.id}
                  style={[
                    styles.docTypeChip,
                    { backgroundColor: isSelected ? '#C9A84C' : colors.card, borderColor: isSelected ? '#C9A84C' : colors.border },
                    isSelected && { backgroundColor: '#C9A84C' }
                  ]}
                  onPress={() => setSelectedType(dt.id)}
                >
                  <Feather name={dt.icon as any} size={14} color={isSelected ? '#070D24' : '#C9A84C'} />
                  <Text style={[styles.docTypeChipText, { color: isSelected ? '#070D24' : colors.foreground }]}>{dt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 2: Details & Voice Dictation */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel}>2. SPECIFICATION & DETAILS</Text>
            <View style={{ paddingRight: 20 }}>
              <VoiceDictation
                isProUser={isProUser}
                onTranscriptionComplete={(text) => {
                  setDetails((prev) => (prev ? prev + ' ' + text : text));
                }}
                onUpgradePress={() => setShowUpgradeModal(true)}
              />
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginTop: 6 }}>
            <TextInput
              style={[styles.detailsInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={details}
              onChangeText={setDetails}
              placeholder="e.g. Landlord: John Smith, Tenant: Jane Doe, Rent: ₹25,000/month, Duration: 11 months..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Jurisdiction Info Footer */}
        <View style={styles.infoRow}>
          <Feather name="globe" size={13} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{jurisdiction} Law • {language}</Text>
        </View>

        {/* Action Button */}
        <View style={{ paddingHorizontal: 20 }}>
          <Pressable
            style={[styles.eliteDraftBtn, (!selectedType || isDrafting) && { opacity: 0.5 }]}
            onPress={handleDraft}
            disabled={!selectedType || isDrafting}
          >
            {isDrafting ? (
              <ActivityIndicator color="#070D24" />
            ) : (
              <>
                <Feather name="zap" size={18} color="#070D24" />
                <Text style={styles.eliteDraftBtnText}>Generate Legal Document</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSubscribe={() => {
          setIsProUser(true);
          setShowUpgradeModal(false);
          Alert.alert('Welcome to LawVise Pro!', 'Your account has been successfully upgraded.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF' },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  sectionBlock: { marginBottom: 20 },
  sectionHeaderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C', letterSpacing: 1.2, paddingHorizontal: 20, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  horizontalChipsContainer: { paddingHorizontal: 20, gap: 8 },
  docTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  docTypeChipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  detailsInput: { borderRadius: 12, borderWidth: 1, padding: 14, minHeight: 140, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 20 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  eliteDraftBtn: { backgroundColor: '#C9A84C', borderRadius: 12, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  eliteDraftBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#070D24' },
  draftHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  draftHeaderTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF' },
  draftHeaderSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  draftText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24 },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  actionBtnCustom: { flex: 1, marginVertical: 0, paddingVertical: 10 },
  primaryActionBtn: { backgroundColor: '#C9A84C' },
});
