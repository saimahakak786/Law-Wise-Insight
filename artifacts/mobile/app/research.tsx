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

const RESEARCH_TYPES = ['General', 'Case Law', 'Statute', 'Constitution'];

export default function ResearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { jurisdiction } = useApp();

  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('General');
  const [isResearching, setIsResearching] = useState(false);
  const [result, setResult] = useState('');
  const [hasResult, setHasResult] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 20);

  const handleResearch = async () => {
    if (!query.trim()) { Alert.alert('Enter Query', 'Please enter a research query.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsResearching(true);
    setResult('');
    setHasResult(true);

    try {
      const token = await getToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const researchType = selectedType.toLowerCase().replace(' ', '_');
      const response = await fetch(`https://${domain}/api/lawvise/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: query.trim(), jurisdiction, researchType }),
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
            if (data.content) setResult((p) => p + data.content);
            if (data.done) break;
          } catch { /* skip */ }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Research Failed', 'Please check your connection and try again.');
      setHasResult(false);
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: padTop, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#C9A84C" />
        </Pressable>
        <Text style={styles.headerTitle}>Legal Research</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        onContentSizeChange={() => hasResult && scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Query Input */}
        <Text style={[styles.label, { color: colors.foreground }]}>Research Query</Text>
        <View style={[styles.queryWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} style={styles.queryIcon} />
          <TextInput
            style={[styles.queryInput, { color: colors.foreground }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search Indian laws, case laws, statutes..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Research Type Chips */}
        <Text style={[styles.label, { color: colors.foreground }]}>Research Type</Text>
        <View style={styles.chipsRow}>
          {RESEARCH_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[
                styles.chip,
                { backgroundColor: selectedType === type ? '#C9A84C20' : colors.card, borderColor: selectedType === type ? '#C9A84C' : colors.border },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.chipText, { color: selectedType === type ? '#C9A84C' : colors.foreground }]}>{type}</Text>
            </Pressable>
          ))}
        </View>

        {/* Jurisdiction */}
        <View style={styles.jurisdictionRow}>
          <Feather name="globe" size={13} color={colors.mutedForeground} />
          <Text style={[styles.jurisdictionText, { color: colors.mutedForeground }]}>Jurisdiction: {jurisdiction}</Text>
        </View>

        {/* Research Button */}
        <Pressable
          style={[styles.researchBtn, (!query.trim() || isResearching) && { opacity: 0.5 }]}
          onPress={handleResearch}
          disabled={!query.trim() || isResearching}
        >
          {isResearching
            ? <ActivityIndicator color="#070D24" />
            : <>
                <Feather name="search" size={20} color="#070D24" />
                <Text style={styles.researchBtnText}>Research</Text>
              </>}
        </Pressable>

        {/* Result Display */}
        {hasResult && (
          <View style={[styles.resultContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <Feather name="book-open" size={16} color="#C9A84C" />
              <Text style={[styles.resultHeaderText, { color: colors.foreground }]}>Research Results</Text>
              {isResearching && <ActivityIndicator color="#C9A84C" size="small" />}
            </View>
            {isResearching && !result ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#C9A84C" />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Researching {selectedType.toLowerCase()}...</Text>
              </View>
            ) : null}
            <Text style={[styles.resultText, { color: colors.foreground }]}>{result}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#FFFFFF', flex: 1 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 10 },
  queryWrapper: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    padding: 12, marginBottom: 20, alignItems: 'flex-start',
  },
  queryIcon: { marginRight: 10, marginTop: 2 },
  queryInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15,
    lineHeight: 22, minHeight: 72,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5,
  },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  jurisdictionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  jurisdictionText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  researchBtn: {
    backgroundColor: '#C9A84C', borderRadius: 14, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24,
  },
  researchBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#070D24' },
  resultContainer: { borderRadius: 14, borderWidth: 1, padding: 16 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  resultHeaderText: { fontFamily: 'Inter_700Bold', fontSize: 15, flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  resultText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24 },
});
