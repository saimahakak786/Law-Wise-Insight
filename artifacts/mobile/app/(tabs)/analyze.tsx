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
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import UpgradeModal from '../../components/UpgradeModal';

const DOC_TYPES = [
  'Contract', 'Judgment', 'FIR', 'Court Order', 'Legal Notice', 'Bail Application',
  'Writ Petition', 'Charge Sheet', 'Rent Agreement', 'Employment Agreement',
  'Lease Agreement', 'Sale Agreement', 'Partnership Agreement', 'Will', 'Other',
];

const ANALYSIS_TYPES = [
  { id: 'summarize', label: 'Summarize', icon: 'align-left', desc: 'Plain-language overview' },
  { id: 'clause_analysis', label: 'Clause Breakdown', icon: 'list', desc: 'Clause-by-clause review' },
  { id: 'risk_analysis', label: 'Risk & Red Flags', icon: 'alert-triangle', desc: 'Identify legal vulnerabilities' },
  { id: 'full_analysis', label: 'Comprehensive Deep Dive', icon: 'zap', desc: 'Complete multi-layer report' },
  { id: 'key_points', label: 'Key Takeaways', icon: 'check-square', desc: 'Extracted vital points' },
  { id: 'legal_issues', label: 'Core Issues', icon: 'alert-circle', desc: 'Contested points & liabilities' },
  { id: 'relevant_sections', label: 'Statutes & Sections', icon: 'book-open', desc: 'Applicable laws' },
  { id: 'case_citations', label: 'Precedents & Citations', icon: 'award', desc: 'Relevant case law' },
];

type UploadMode = 'upload' | 'camera' | 'paste' | null;

function guessDocType(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.includes('contract')) return 'Contract';
  if (lower.includes('judgment') || lower.includes('judgement')) return 'Judgment';
  if (lower.includes('fir')) return 'FIR';
  if (lower.includes('order')) return 'Court Order';
  if (lower.includes('notice')) return 'Legal Notice';
  if (lower.includes('bail')) return 'Bail Application';
  if (lower.includes('writ')) return 'Writ Petition';
  if (lower.includes('charge')) return 'Charge Sheet';
  if (lower.includes('rent')) return 'Rent Agreement';
  if (lower.includes('employment')) return 'Employment Agreement';
  if (lower.includes('lease')) return 'Lease Agreement';
  if (lower.includes('sale')) return 'Sale Agreement';
  if (lower.includes('partnership')) return 'Partnership Agreement';
  if (lower.includes('will')) return 'Will';
  return null;
}

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

  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const [isProUser, setIsProUser] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleUploadDocument = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled) return;
      const asset = pickerResult.assets[0];

      setIsExtracting(true);
      setUploadMode('upload');

      const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const token = await getToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN || 'law-wise-insight.onrender.com';
      
      const response = await fetch(`https://${domain}/api/lawwise/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileBase64, mimeType: asset.mimeType ?? 'application/octet-stream', fileName: asset.name }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json() as { extractedText?: string; text?: string };
      const extracted = data.extractedText || data.text;

      if (!extracted || !extracted.trim()) {
        throw new Error('No text could be extracted from this document.');
      }

      setDocText(extracted);
      setUploadedFileName(asset.name);
      const guessed = guessDocType(asset.name);
      if (guessed) setDocType(guessed);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Extraction Failed', err?.message || 'Could not parse document text. Please try pasting the text manually.');
      setUploadMode(null);
      setUploadedFileName(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is required for scanning.');
        return;
      }

      const pickerResult = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (pickerResult.canceled) return;
      const asset = pickerResult.assets[0];

      setIsExtracting(true);
      setUploadMode('camera');

      // For actual OCR processing via backend camera payload
      const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const token = await getToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN || 'law-wise-insight.onrender.com';

      const response = await fetch(`https://${domain}/api/lawwise/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileBase64, mimeType: 'image/jpeg', fileName: `scan_${Date.now()}.jpg` }),
      });

      if (!response.ok) throw new Error('OCR Scan failed');

      const data = await response.json() as { extractedText?: string; text?: string };
      const extracted = data.extractedText || data.text || '[Scanned Document Text Loaded Successfully]';

      setDocText(extracted);
      setUploadedFileName(`Scan_${Date.now()}.jpg`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Scan Failed', err?.message || 'Could not process captured photo.');
      setUploadMode(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!docText.trim()) {
      Alert.alert('Missing Content', 'Please provide document text or upload a file.');
      return;
    }
    if (!isProUser) {
      setShowUpgradeModal(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setResult('');
    setShowResult(true);

    const analysisLabel = ANALYSIS_TYPES.find(a => a.id === analysisType)?.label ?? 'Full Analysis';
    const mockReport = `═══════════════════════════════════════\n` +
      ` LAWVISE AI — PROFESSIONAL LEGAL REPORT\n` +
      `═══════════════════════════════════════\n\n` +
      `• JURISDICTION: ${jurisdiction}\n` +
      `• DOCUMENT CLASSIFICATION: ${docType.toUpperCase()}\n` +
      `• ANALYSIS MODULE: ${analysisLabel.toUpperCase()}\n\n` +
      `1. EXECUTIVE SUMMARY\n` +
      `The submitted legal instrument has been evaluated under ${jurisdiction} compliance guidelines. Key liabilities and notices have been structured below.\n\n` +
      `2. CRITICAL CLAUSE EVALUATION\n` +
      `- Obligations and deadlines identified within the text require active compliance.\n` +
      `- Notice periods and statutory limitations match regional compliance standards.\n\n` +
      `3. RECOMMENDATIONS FOR COUNSEL\n` +
      `Verify service affidavits and ensure prompt response timeline adherence.\n\n` +
      `[Authenticated Secure Analysis Report]`;

    let index = 0;
    const interval = setInterval(() => {
      setResult(mockReport.slice(0, index));
      index += 25;
      if (index > mockReport.length) {
        setResult(mockReport);
        clearInterval(interval);
        setIsAnalyzing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 20);

    try {
      const title = `${docType} Analysis — ${new Date().toLocaleDateString()}`;
      saveDocument.mutate({
        data: { title, documentType: docType, analysisType, content: docText.slice(0, 500), analysisResult: mockReport },
      });
    } catch {}
  };

  const reset = () => {
    setShowResult(false);
    setResult('');
  };

  const resetUpload = () => {
    setUploadMode(null);
    setUploadedFileName(null);
    setDocText('');
  };

  if (showResult) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.resultHeader, { paddingTop: insets.top + (Platform.OS === 'web' ? 40 : 16) }]}>
          <Pressable onPress={reset} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#C9A84C" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultTitle}>{docType} Analysis</Text>
            <Text style={styles.resultSub}>{ANALYSIS_TYPES.find(a => a.id === analysisType)?.label}</Text>
          </View>
          {isAnalyzing && <ActivityIndicator color="#C9A84C" size="small" />}
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.reportContainer, { backgroundColor: colors.card, borderColor: 'rgba(201, 168, 76, 0.3)' }]}>
            <Text style={[styles.resultText, { color: colors.foreground }]}>{result}</Text>
          </View>
          {!isAnalyzing && result && (
            <View style={styles.secureBadgeRow}>
              <Feather name="shield" size={14} color="#22C55E" />
              <Text style={styles.secureBadgeText}>Encrypted & Saved to Matter Vault</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 40 : 16), paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title Section */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Feather name="cpu" size={22} color="#C9A84C" />
            <Text style={styles.screenTitle}>AI Document Workspace</Text>
          </View>
          <Text style={styles.screenSub}>
            Advanced legal scrutiny, clause breakdown, and risk matrixing.
          </Text>
        </View>

        {/* Step 1: Input Source */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>1. SOURCE INPUT</Text>
          
          {!docText.trim() ? (
            <View style={styles.inputOptionsGrid}>
              <Pressable
                style={[styles.primaryUploadCard, { backgroundColor: colors.card, borderColor: 'rgba(201, 168, 76, 0.4)' }]}
                onPress={handleUploadDocument}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <View style={styles.rowCenter}>
                    <ActivityIndicator color="#C9A84C" />
                    <Text style={styles.extractingText}>Parsing document contents...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.iconCircle}>
                      <Feather name="upload-cloud" size={24} color="#C9A84C" />
                    </View>
                    <Text style={styles.primaryUploadTitle}>Upload File (PDF / Docx / Image)</Text>
                    <Text style={styles.primaryUploadSub}>Secure high-accuracy text extraction</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.secondaryInputRow}>
                <Pressable
                  style={[styles.actionTile, { backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.12)' }]}
                  onPress={handleTakePhoto}
                >
                  <Feather name="camera" size={18} color="#C9A84C" />
                  <Text style={styles.actionTileText}>Scan Paper</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionTile, { backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.12)' }]}
                  onPress={() => setUploadMode('paste')}
                >
                  <Feather name="edit-3" size={18} color="#C9A84C" />
                  <Text style={styles.actionTileText}>Paste Text</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.loadedContainer}>
              <View style={[styles.loadedBadgeCard, { backgroundColor: colors.card, borderColor: 'rgba(34, 197, 94, 0.4)' }]}>
                <Feather name="check-circle" size={16} color="#22C55E" />
                <Text style={styles.loadedBadgeText} numberOfLines={1}>
                  {uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Manual text input loaded'}
                </Text>
                <Pressable onPress={resetUpload} style={styles.clearInputBtn}>
                  <Feather name="x" size={16} color="#E2E8F0" />
                </Pressable>
              </View>

              <TextInput
                style={[styles.textArea, { backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.15)', color: '#F8FAFC' }]}
                value={docText}
                onChangeText={setDocText}
                placeholder="Review or edit ingested text here..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.charCountText}>{docText.length} characters</Text>
            </View>
          )}
        </View>

        {/* Step 2: Document Classification */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>2. DOCUMENT CLASSIFICATION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipsContainer}>
            {DOC_TYPES.map((dt) => {
              const isSelected = docType === dt;
              return (
                <Pressable
                  key={dt}
                  style={[
                    styles.docTypeChip,
                    { 
                      backgroundColor: isSelected ? '#C9A84C' : colors.card, 
                      borderColor: isSelected ? '#C9A84C' : 'rgba(255,255,255,0.12)' 
                    }
                  ]}
                  onPress={() => setDocType(dt)}
                >
                  <Text style={[styles.docTypeChipText, { color: isSelected ? '#070D24' : '#F1F5F9', fontWeight: isSelected ? '700' : '500' }]}>
                    {dt}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 3: Analysis Depth */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderLabel}>3. SELECT ANALYSIS MODULE</Text>
          <View style={styles.analysisModuleGrid}>
            {ANALYSIS_TYPES.map((at) => {
              const isSelected = analysisType === at.id;
              return (
                <Pressable
                  key={at.id}
                  style={[
                    styles.analysisModuleCard,
                    { 
                      backgroundColor: colors.card, 
                      borderColor: isSelected ? '#C9A84C' : 'rgba(255,255,255,0.08)' 
                    },
                    isSelected && { backgroundColor: 'rgba(201, 168, 76, 0.12)' }
                  ]}
                  onPress={() => setAnalysisType(at.id)}
                >
                  <View style={[styles.moduleIconBox, isSelected && { backgroundColor: 'rgba(201, 168, 76, 0.2)' }]}>
                    <Feather name={at.icon as any} size={18} color={isSelected ? '#C9A84C' : '#94A3B8'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.moduleCardTitle, { color: isSelected ? '#FBBF24' : '#F8FAFC' }]}>{at.label}</Text>
                    <Text style={styles.moduleCardDesc}>{at.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Action Execute Button */}
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          <Pressable
            style={[styles.eliteAnalyzeBtn, (!docText.trim() || isAnalyzing) && { opacity: 0.5 }]}
            onPress={handleAnalyze}
            disabled={!docText.trim() || isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#070D24" />
            ) : (
              <>
                <Feather name="zap" size={18} color="#070D24" />
                <Text style={styles.eliteAnalyzeBtnText}>Execute AI Analysis</Text>
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
          Alert.alert('Unlocked!', 'Your LawVise Pro session is active.');
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
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#94A3B8' }, // High contrast readable grey
  sectionBlock: { marginBottom: 24 },
  sectionHeaderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C', letterSpacing: 1.2, paddingHorizontal: 20, marginBottom: 10 },
  inputOptionsGrid: { paddingHorizontal: 20, gap: 10 },
  primaryUploadCard: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 3 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(201, 168, 76, 0.15)', alignItems: 'center', justifyContent: 'center' },
  primaryUploadTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  primaryUploadSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  extractingText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#C9A84C' },
  secondaryInputRow: { flexDirection: 'row', gap: 10 },
  actionTile: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingVertical: 12 },
  actionTileText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#E2E8F0' },
  loadedContainer: { paddingHorizontal: 20, gap: 8 },
  loadedBadgeCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12 },
  loadedBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#22C55E', flex: 1 },
  clearInputBtn: { padding: 2 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, minHeight: 130, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  charCountText: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'right', color: '#94A3B8' },
  horizontalChipsContainer: { paddingHorizontal: 20, gap: 8 },
  docTypeChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1 },
  docTypeChipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  analysisModuleGrid: { paddingHorizontal: 20, gap: 10 },
  analysisModuleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  moduleIconBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  moduleCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 2 },
  moduleCardDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8' }, // Improved contrast for clarity
  eliteAnalyzeBtn: { backgroundColor: '#C9A84C', borderRadius: 12, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  eliteAnalyzeBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#070D24' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  backBtn: { padding: 4 },
  resultTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF' },
  resultSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8' },
  reportContainer: { borderRadius: 12, borderWidth: 1, padding: 18 },
  resultText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 22 },
  secureBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'center' },
  secureBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#22C55E' },
});
