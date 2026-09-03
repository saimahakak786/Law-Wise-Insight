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

// Import custom components for high-end look
import Card from '../components/Card';
import Button from '../components/Button';

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

  const [selectedType, setSelectedType] = useState('');
  const [details, setDetails] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [showDraft, setShowDraft] = useState(false);
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
      Alert.alert('Drafting Failed', 'Please check your connection and try again.');
    } finally {
      setIsDrafting(false);
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

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 20);

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

        {/* Action buttons after draft is complete using custom buttons */}
        {!isDrafting && draft ? (
          <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
            <Button
              title="Copy"
              variant="outline"
              onPress={handleCopy}
              style={styles.actionBtnCustom}
            />
            <Button
              title="Share"
              variant="outline"
              onPress={handleShare}
              style={styles.actionBtnCustom}
            />
            <Button
              title={saveDocument.isPending ? "Saving..." : "Save to Vault"}
              variant="primary"
              onPress={handleSaveToVault}
              style={[styles.actionBtnCustom, styles.primaryActionBtn]}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40 }}
      bottomOffset={20}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Text style={styles.screenTitle}>Draft Document</Text>
        <View style={{ width: 30 }} />
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>Document Type</Text>
      <View style={styles.docTypeGrid}>
        {DOC_TYPES.map((dt) => {
          const isSelected = selectedType === dt.id;
          return (
            <Card
              key={dt.id}
              onPress={() => setSelectedType(dt.id)}
              style={[
                styles.docTypeCard,
                { backgroundColor: colors.card, borderColor: isSelected ? '#C9A84C' : colors.border },
                isSelected && { backgroundColor: '#C9A84C20', borderColor: '#C9A84C' },
              ]}
            >
              <Feather name={dt.icon as any} size={20} color={isSelected ? '#C9A84C' : colors.mutedForeground} />
              <Text style={[styles.docTypeLabel, { color: isSelected ? '#C9A84C' : colors.foreground }]}>{dt.label}</Text>
            </Card>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>Details (Optional)</Text>
      <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
        Provide specific terms, parties, amounts, or requirements for your document
      </Text>
      <TextInput
        style={[styles.detailsInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        value={details}
        onChangeText={setDetails}
        placeholder="e.g. Landlord: John Smith, Tenant: Jane Doe, Rent: ₹25,000/month, Duration: 11 months..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      <View style={styles.infoRow}>
        <Feather name="globe" size={13} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{jurisdiction} Law • {language}</Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Button
          title="Generate Draft"
          variant="primary"
          onPress={handleDraft}
          style={[(!selectedType || isDrafting) && { opacity: 0.5 }]}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 24 },
  closeBtn: { padding: 4 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#FFFFFF' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 15, paddingHorizontal: 20, marginBottom: 12 },
  sublabel: { fontFamily: 'Inter_400Regular', fontSize: 13, paddingHorizontal: 20, marginBottom: 12, marginTop: -6 },
  docTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  docTypeCard: { width: '47%', marginVertical: 0, padding: 14, gap: 8 },
  docTypeLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16 },
  detailsInput: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, padding: 14, minHeight: 120, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 20 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  draftHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  draftHeaderTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF' },
  draftHeaderSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  draftText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24 },
  actionBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtnCustom: {
    flex: 1,
    marginVertical: 0,
    paddingVertical: 10,
  },
  primaryActionBtn: {
    backgroundColor: '#C9A84C',
  },
});
