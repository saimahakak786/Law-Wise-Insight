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

const DOC_TYPES = [
  { id: 'Rent Agreement', icon: 'home' },
  { id: 'Employment Agreement', icon: 'briefcase' },
  { id: 'Partnership Agreement', icon: 'users' },
  { id: 'Sale Agreement', icon: 'shopping-cart' },
  { id: 'Lease Agreement', icon: 'key' },
  { id: 'Service Agreement', icon: 'tool' },
  { id: 'Non-Disclosure Agreement', icon: 'lock' },
  { id: 'Power of Attorney', icon: 'file-text' },
  { id: 'Legal Notice', icon: 'alert-circle' },
  { id: 'Will / Testament', icon: 'book' },
  { id: 'Affidavit', icon: 'feather' },
  { id: 'Memorandum of Understanding', icon: 'layers' },
];

export default function DraftScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { jurisdiction, language } = useApp();

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
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const response = await fetch(`https://${domain}/api/lawvise/draft`, {
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

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 20);

  if (showDraft) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.draftHeader, { paddingTop: padTop, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowDraft(false)} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#C9A84C" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.draftHeaderTitle}>{selectedType}</Text>
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
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Drafting your {selectedType}...</Text>
            </View>
          )}
          <Text style={[styles.draftText, { color: colors.foreground }]}>{draft}</Text>
        </ScrollView>
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
        {DOC_TYPES.map((dt) => (
          <Pressable
            key={dt.id}
            style={[
              styles.docTypeCard,
              { backgroundColor: colors.card, borderColor: selectedType === dt.id ? '#C9A84C' : colors.border },
              selectedType === dt.id && { backgroundColor: '#C9A84C15' },
            ]}
            onPress={() => setSelectedType(dt.id)}
          >
            <Feather name={dt.icon as any} size={20} color={selectedType === dt.id ? '#C9A84C' : colors.mutedForeground} />
            <Text style={[styles.docTypeLabel, { color: selectedType === dt.id ? '#C9A84C' : colors.foreground }]}>{dt.id}</Text>
          </Pressable>
        ))}
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

      <Pressable
        style={[styles.draftBtn, (!selectedType || isDrafting) && { opacity: 0.5 }]}
        onPress={handleDraft}
        disabled={!selectedType || isDrafting}
      >
        <Feather name="edit-3" size={20} color="#070D24" />
        <Text style={styles.draftBtnText}>Generate Draft</Text>
      </Pressable>
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
  docTypeCard: { width: '47%', borderRadius: 12, padding: 14, borderWidth: 1.5, gap: 8 },
  docTypeLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16 },
  detailsInput: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, padding: 14, minHeight: 120, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 20 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  draftBtn: { marginHorizontal: 20, backgroundColor: '#C9A84C', borderRadius: 14, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  draftBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#070D24' },
  draftHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  draftHeaderTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF' },
  draftHeaderSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  draftText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24 },
});
