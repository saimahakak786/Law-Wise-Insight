import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { fetch } from 'expo/fetch';
import { useSaveDocument } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

const DOC_TYPES = [
  'Contract', 'Judgment', 'FIR', 'Court Order', 'Legal Notice', 'Bail Application',
  'Writ Petition', 'Charge Sheet', 'Rent Agreement', 'Employment Agreement',
  'Lease Agreement', 'Sale Agreement', 'Partnership Agreement', 'Will', 'Other',
];

const ANALYSIS_TYPES = [
  { id: 'summarize', label: 'Summarize', icon: 'align-left', desc: 'Plain-language overview' },
  { id: 'clause_analysis', label: 'Clause Analysis', icon: 'list', desc: 'Clause-by-clause breakdown' },
  { id: 'risk_analysis', label: 'Risk Analysis', icon: 'alert-triangle', desc: 'Identify risks & red flags' },
  { id: 'full_analysis', label: 'Full Analysis', icon: 'zap', desc: 'Comprehensive deep dive' },
];

export default function AnalyzeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { jurisdiction, language } = useApp();
  const saveDocument = useSaveDocument();

  const [docType, setDocType] = useState('Contract');
  const [analysisType, setAnalysisType] = useState('full_analysis');
  const [docText, setDocText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [showResult, setShowResult] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleAnalyze = async () => {
    if (!docText.trim()) {
      Alert.alert('Missing Content', 'Please paste or type your document text.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setResult('');
    setShowResult(true);

    try {
      const token = await getToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const response = await fetch(`https://${domain}/api/lawvise/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: docText,
          analysisType,
          documentType: docType,
          jurisdiction,
          language,
        }),
      });

      const reader = (response.body as any)?.getReader();
      if (!reader) throw new Error('No response stream');
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
            if (data.content) setResult((prev) => prev + data.content);
            if (data.done) break;
          } catch { /* skip */ }
        }
      }

      // Auto-save to vault
      const title = `${docType} Analysis — ${new Date().toLocaleDateString()}`;
      saveDocument.mutate({
        data: { title, documentType: docType, analysisType, content: docText.slice(0, 500), analysisResult: result },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Analysis Failed', 'Please check your connection and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setShowResult(false);
    setResult('');
  };

  if (showResult) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Result Header */}
        <View style={[styles.resultHeader, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), backgroundColor: colors.card }]}>
          <Pressable onPress={reset} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#C9A84C" />
          </Pressable>
          <View>
            <Text style={styles.resultTitle}>{docType}</Text>
            <Text style={styles.resultSub}>{ANALYSIS_TYPES.find(a => a.id === analysisType)?.label}</Text>
          </View>
          {isAnalyzing && <ActivityIndicator color="#C9A84C" size="small" />}
        </View>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {isAnalyzing && !result && (
            <View style={styles.streamingIndicator}>
              <ActivityIndicator color="#C9A84C" />
              <Text style={[styles.streamingText, { color: colors.mutedForeground }]}>Analyzing document...</Text>
            </View>
          )}
          <Text style={[styles.resultText, { color: colors.foreground }]}>{result}</Text>
          {!isAnalyzing && result && (
            <View style={[styles.savedBadge, { backgroundColor: colors.card }]}>
              <Feather name="check-circle" size={16} color="#22C55E" />
              <Text style={styles.savedText}>Saved to Document Vault</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      bottomOffset={20}
    >
      <Text style={styles.screenTitle}>Analyze Document</Text>
      <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
        Paste your legal document text below for AI analysis
      </Text>

      {/* Document Type */}
      <Text style={[styles.label, { color: colors.foreground }]}>Document Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {DOC_TYPES.map((dt) => (
          <Pressable
            key={dt}
            style={[styles.chip, { backgroundColor: docType === dt ? '#C9A84C' : colors.card, borderColor: docType === dt ? '#C9A84C' : colors.border }]}
            onPress={() => setDocType(dt)}
          >
            <Text style={[styles.chipText, { color: docType === dt ? '#070D24' : colors.mutedForeground }]}>{dt}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Analysis Type */}
      <Text style={[styles.label, { color: colors.foreground }]}>Analysis Type</Text>
      <View style={styles.analysisGrid}>
        {ANALYSIS_TYPES.map((at) => (
          <Pressable
            key={at.id}
            style={[
              styles.analysisCard,
              { backgroundColor: colors.card, borderColor: analysisType === at.id ? '#C9A84C' : colors.border },
              analysisType === at.id && { borderColor: '#C9A84C', backgroundColor: '#C9A84C15' },
            ]}
            onPress={() => setAnalysisType(at.id)}
          >
            <Feather name={at.icon as any} size={20} color={analysisType === at.id ? '#C9A84C' : colors.mutedForeground} />
            <Text style={[styles.analysisLabel, { color: analysisType === at.id ? '#C9A84C' : colors.foreground }]}>{at.label}</Text>
            <Text style={[styles.analysisDesc, { color: colors.mutedForeground }]}>{at.desc}</Text>
          </Pressable>
        ))}
      </View>

      {/* Document Text */}
      <Text style={[styles.label, { color: colors.foreground }]}>Document Content</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        value={docText}
        onChangeText={setDocText}
        placeholder="Paste your contract, judgment, FIR, court order, or any legal document text here..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={8}
        textAlignVertical="top"
      />
      <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{docText.length} characters</Text>

      {/* Analyze Button */}
      <Pressable
        style={[styles.analyzeBtn, (!docText.trim() || isAnalyzing) && { opacity: 0.5 }]}
        onPress={handleAnalyze}
        disabled={!docText.trim() || isAnalyzing}
      >
        {isAnalyzing ? (
          <ActivityIndicator color="#070D24" />
        ) : (
          <>
            <Feather name="zap" size={20} color="#070D24" />
            <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
          </>
        )}
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#FFFFFF', paddingHorizontal: 20, marginBottom: 6 },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 14, paddingHorizontal: 20, marginBottom: 24 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, paddingHorizontal: 20, marginBottom: 10 },
  chipsRow: { paddingHorizontal: 20, gap: 8, marginBottom: 24, flexDirection: 'row' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  analysisGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  analysisCard: { width: '47%', borderRadius: 12, padding: 14, borderWidth: 1.5, gap: 6 },
  analysisLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  analysisDesc: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  textArea: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, padding: 16, minHeight: 160, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22 },
  charCount: { fontFamily: 'Inter_400Regular', fontSize: 11, paddingHorizontal: 20, marginTop: 6, marginBottom: 20, textAlign: 'right' },
  analyzeBtn: {
    marginHorizontal: 20, backgroundColor: '#C9A84C', borderRadius: 14,
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  analyzeBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#070D24' },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1B2448',
  },
  backBtn: { padding: 4 },
  resultTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF' },
  resultSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8B9CC5' },
  streamingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  streamingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  resultText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 24 },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10,
    padding: 12, marginTop: 20,
  },
  savedText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#22C55E' },
});
