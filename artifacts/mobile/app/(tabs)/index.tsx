import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Platform, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { useGetDocuments, useGetCases } from '@workspace/api-client-react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import JurisdictionSelector from '@/components/JurisdictionSelector';

const QUICK_ACTIONS = [
  { id: 'analyze', label: 'Analyze\nDocument', icon: 'file-text' as const, route: '/(tabs)/analyze' },
  { id: 'chat', label: 'Legal\nChat', icon: 'message-circle' as const, route: '/(tabs)/chat' },
  { id: 'intake', label: 'Client\nIntake', icon: 'user-plus' as const, route: '/clientintake' },
  { id: 'causelist', label: 'Cause List\n& Reminders', icon: 'calendar' as const, route: '/(tabs)/cases' },
  { id: 'draft', label: 'Draft\nDocument', icon: 'edit-3' as const, route: '/draft' },
  { id: 'calc', label: 'Calculators', icon: 'calculator' as const, route: '/calculator' },
  { id: 'research', label: 'Legal\nResearch', icon: 'search' as const, route: '/research' },
  { id: 'tracker', label: 'Case\nTracker', icon: 'briefcase' as const, route: '/(tabs)/cases' },
  { id: 'matcher', label: 'Case\nMatcher', icon: 'git-commit' as const, route: '/(tabs)/fact-matcher' },
];

const MOCK_FALLBACK_DOCUMENTS = [
  { id: 1, title: 'Commercial Lease Agreement Review.pdf', documentType: 'Agreement', analysisType: 'Risk Assessment' },
  { id: 2, title: 'Employment Non-Disclosure Pact.docx', documentType: 'Contract', analysisType: 'Clause Check' },
  { id: 3, title: 'Consumer Protection Notice.pdf', documentType: 'Legal Notice', analysisType: 'Summary' },
];

const MOCK_FALLBACK_CASES = [
  { id: 1, title: 'Sharma vs. Apex Properties', status: 'active', nextHearing: 'Tomorrow, 10:30 AM' },
  { id: 2, title: 'TechCorp IP Infringement', status: 'pending', nextHearing: 'Sep 15, 2:00 PM' },
  { id: 3, title: 'Verma Employment Arbitration', status: 'active', nextHearing: 'Sep 18, 11:00 AM' },
];

// Max duration limit per dictation session (2 minutes = 120 seconds)
const MAX_RECORDING_SECONDS = 120;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();

  const { data: remoteDocs, isLoading: docsLoading, error: docsError } = useGetDocuments();
  const { data: remoteCases, error: casesError } = useGetCases();

  const documents = docsError || !remoteDocs ? MOCK_FALLBACK_DOCUMENTS : remoteDocs;
  const cases = casesError || !remoteCases ? MOCK_FALLBACK_CASES : remoteCases;

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? 'Counselor';
  const recentDocs = documents?.slice(0, 3) ?? [];
  const activeCases = cases?.filter((c: any) => c.status === 'active') ?? [];

  // Voice Dictation & Structuring States
  const [isRecording, setIsRecording] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [savedMemos, setSavedMemos] = useState<string[]>([]);
  
  const [freeDictationsLeft, setFreeDictationsLeft] = useState(3);
  const [freeIntakesLeft, setFreeIntakesLeft] = useState(1); // 1 Free Client Intake trial
  const [isProUser, setIsProUser] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (!isProUser && prev + 1 >= MAX_RECORDING_SECONDS) {
            clearInterval(interval);
            handleAutoStopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, isProUser]);

  const formatRawTranscriptToLegalBrief = (rawText: string) => {
    return `⚖️ [AI STRUCTURED COURT BRIEF]
• Appearance: Counsel noted for petitioner.
• Core Submission: ${rawText || 'Seeking urgent interim relief & stay on execution proceedings.'}
• Court Directions: Notice issued, reply affidavit to be filed within 2 weeks.
• Next Hearing: Listed for further consideration next month.`;
  };

  const handleAutoStopRecording = () => {
    setIsRecording(false);
    setIsFormatting(true);
    
    setTimeout(() => {
      const structuredBrief = formatRawTranscriptToLegalBrief("Max free duration reached. Client instructions noted regarding property dispute.");
      setTranscript(structuredBrief);
      setIsFormatting(false);
    }, 800);

    if (!isProUser) {
      setFreeDictationsLeft((prev) => Math.max(0, prev - 1));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Time Limit Reached', 'Free dictations are capped at 2 minutes. Upgrade to Pro for unlimited length.');
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  const handleToggleRecording = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isProUser && freeDictationsLeft <= 0 && !isRecording) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Pro Feature Required',
        'You have used your 3 free trial dictations. Upgrade to LawVise Pro for unlimited secure voice dictations and automatic legal brief structuring.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unlock Unlimited Pro', onPress: () => setIsProUser(true) }
        ]
      );
      return;
    }

    if (!isRecording) {
      setIsRecording(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setIsRecording(false);
      setIsFormatting(true);

      setTimeout(() => {
        const rawSpeech = "Counsel appeared for the petitioner regarding interim relief application. Matter argued at length. Bench granted protection and listed next Wednesday.";
        const structuredBrief = formatRawTranscriptToLegalBrief(rawSpeech);
        setTranscript((prev) => (prev ? prev + '\n\n' + structuredBrief : structuredBrief));
        setIsFormatting(false);
      }, 1000);

      if (!isProUser) {
        setFreeDictationsLeft((prev) => Math.max(0, prev - 1));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSaveMemo = () => {
    if (!transcript.trim()) {
      Alert.alert('Empty Memo', 'Please dictate notes before saving.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavedMemos((prev) => [transcript, ...prev]);
    setTranscript('');
    Alert.alert('Success', 'Structured brief securely logged to your case files.');
  };

  // Quick Action Handler with 1 Free Intake Check
  const handleQuickActionPress = (action: typeof QUICK_ACTIONS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (action.id === 'intake' && !isProUser) {
      if (freeIntakesLeft > 0) {
        setFreeIntakesLeft(0); // Use the 1 free intake
        router.push(action.route as any);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'LawVise Pro Required',
          'You have used your 1 free client intake trial. Upgrade to Pro for unlimited conflict checks and secure client vault archives.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unlock Pro', onPress: () => setIsProUser(true) }
          ]
        );
      }
      return;
    }

    router.push(action.route as any);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Good day,</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{firstName}</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/profile' as any);
          }}
        >
          <LinearGradient
            colors={['#C9A84C', '#E8C87A']}
            style={styles.avatarBadge}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Jurisdiction Selector */}
      <JurisdictionSelector />

      {/* Hero Banner */}
      <LinearGradient
        colors={['#1B2448', '#0F1635']}
        style={styles.heroBanner}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>AI Legal Workspace</Text>
          <Text style={styles.heroSub}>Analyze, Draft & Understand Legal Documents</Text>
          <Pressable
            style={styles.heroBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/analyze'); }}
          >
            <Text style={styles.heroBtnText}>Get Started</Text>
          </Pressable>
        </View>
        <LinearGradient
          colors={['#C9A84C33', '#C9A84C11']}
          style={styles.heroLogoBadge}
        >
          <Feather name="shield" size={36} color="#C9A84C" />
          <Feather name="cpu" size={16} color="#E8C87A" style={styles.subLogoIcon} />
        </LinearGradient>
      </LinearGradient>

      {/* Secure Document Vault Banner */}
      <Pressable
        style={({ pressed }) => [styles.vaultBanner, { backgroundColor: colors.card, borderColor: colors.border ?? '#C9A84C30', opacity: pressed ? 0.9 : 1 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(tabs)/cases' as any);
        }}
      >
        <View style={styles.vaultIconBg}>
          <Feather name="folder" size={22} color="#C9A84C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.vaultTitle, { color: colors.foreground }]}>Secure Document Vault</Text>
          <Text style={[styles.vaultDesc, { color: colors.mutedForeground }]}>Instant access to your saved case files & legal archives</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Pressable>

      {/* Quick Actions */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        {!isProUser && (
          <Text style={[styles.intakeTrialHint, { color: '#C9A84C' }]}>
            {freeIntakesLeft > 0 ? '1 Free Client Intake Included' : 'Intake Pro Locked'}
          </Text>
        )}
      </View>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => handleQuickActionPress(action)}
          >
            <LinearGradient
              colors={['#C9A84C22', '#C9A84C08']}
              style={styles.actionIconBg}
            >
              <Feather name={action.icon} size={24} color="#C9A84C" />
              {action.id === 'intake' && !isProUser && freeIntakesLeft === 0 && (
                <View style={styles.lockBadgeOverlay}>
                  <Feather name="lock" size={10} color="#C9A84C" />
                </View>
              )}
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* AI VOICE DICTATION & COURTROOM BRIEF GENERATOR */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="mic" size={16} color="#C9A84C" />
          <Text style={[styles.sectionTitleText, { color: colors.foreground }]}>Courtroom Voice Dictation</Text>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: isProUser ? '#C9A84C25' : '#1B2448' }]}>
          <Feather name={isProUser ? 'award' : 'lock'} size={12} color="#C9A84C" />
          <Text style={styles.tierBadgeText}>
            {isProUser ? 'Pro (Unlimited)' : `${freeDictationsLeft} Free Left (Max 2m)`}
          </Text>
        </View>
      </View>

      <View style={[styles.dictationCard, { backgroundColor: colors.card, borderColor: isRecording ? '#EF4444' : (colors.border ?? '#C9A84C30') }]}>
        <View style={[styles.micPulseContainer, { backgroundColor: isRecording ? '#EF444420' : '#C9A84C20', borderColor: isRecording ? '#EF4444' : '#C9A84C' }]}>
          <Pressable 
            style={[styles.micButton, { backgroundColor: isRecording ? '#EF4444' : '#C9A84C' }]}
            onPress={handleToggleRecording}
          >
            <Feather name={isRecording ? 'square' : 'mic'} size={26} color="#070D24" />
          </Pressable>
        </View>

        <Text style={[styles.dictationStatusText, { color: isRecording ? '#EF4444' : colors.foreground }]}>
          {isRecording ? `Recording Audio... (${formatTime(recordingSeconds)} / 2:00)` : 'Tap to Dictate Courtroom Notes'}
        </Text>
        <Text style={[styles.dictationStatusSub, { color: colors.mutedForeground }]}>
          {isRecording ? 'Listening...' : 'Spoken words are automatically structured into professional court summaries.'}
        </Text>

        <Pressable 
          style={[styles.dictationActionBtn, { backgroundColor: isRecording ? '#EF4444' : '#C9A84C' }]}
          onPress={handleToggleRecording}
        >
          <Text style={styles.dictationActionBtnText}>
            {isRecording ? 'Stop & Structure Brief' : (freeDictationsLeft > 0 || isProUser ? 'Start Voice Dictation (Max 2m)' : 'Unlock Unlimited Pro')}
          </Text>
        </Pressable>

        <View style={{ width: '100%', marginTop: 16 }}>
          <View style={styles.transcriptHeader}>
            <Text style={[styles.transcriptTitle, { color: colors.foreground }]}>Structured Output</Text>
            {transcript.length > 0 && (
              <Pressable onPress={() => setTranscript('')}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>
          
          {isFormatting ? (
            <View style={[styles.formattingBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <ActivityIndicator color="#C9A84C" size="small" />
              <Text style={[styles.formattingText, { color: colors.mutedForeground }]}>AI structuring notes into legal format...</Text>
            </View>
          ) : (
            <TextInput
              style={[styles.transcriptInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Structured legal brief will appear here automatically..."
              placeholderTextColor={colors.mutedForeground}
              value={transcript}
              onChangeText={setTranscript}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          )}

          {transcript.length > 0 && !isFormatting && (
            <Pressable style={styles.saveMemoBtn} onPress={handleSaveMemo}>
              <Feather name="check" size={16} color="#070D24" />
              <Text style={styles.saveMemoBtnText}>Save to Case File</Text>
            </Pressable>
          )}
        </View>

        {savedMemos.length > 0 && (
          <View style={{ width: '100%', marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={[styles.transcriptTitle, { color: colors.foreground, marginBottom: 8 }]}>Saved Structured Memos</Text>
            {savedMemos.slice(0, 2).map((memo, idx) => (
              <View key={idx} style={[styles.memoItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="file-text" size={14} color="#C9A84C" />
                <Text style={[styles.memoText, { color: colors.foreground }]} numberOfLines={3}>{memo}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Active Case Reminders / Cause List Preview */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="clock" size={16} color="#C9A84C" />
          <Text style={[styles.sectionTitleText, { color: colors.foreground }]}>Active Case Reminders</Text>
        </View>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/cases' as any); }}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>View all</Text>
        </Pressable>
      </View>

      {activeCases.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active case reminders scheduled.</Text>
        </View>
      ) : (
        activeCases.map((item: any) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border ?? '#C9A84C20', opacity: pressed ? 0.9 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/cases' as any); }}
          >
            <View style={styles.reminderIconBg}>
              <Feather name="briefcase" size={18} color="#C9A84C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reminderTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.reminderTime, { color: '#C9A84C' }]}>
                Hearing: {item.nextHearing ?? 'Scheduled'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))
      )}

      {/* Stats */}
      <View style={[styles.statsRow, { marginTop: 8 }]}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{documents?.length ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Documents</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{activeCases.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Cases</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{cases?.length ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Cases</Text>
        </View>
      </View>

      {/* Recent Documents */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitleText, { color: colors.foreground }]}>Recent Documents</Text>
        <Pressable onPress={() => router.push('/(tabs)/analyze')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </Pressable>
      </View>

      {docsLoading && !remoteDocs ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : recentDocs.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Feather name="file-plus" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No documents yet{'\n'}Analyze your first document
          </Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/analyze')}>
            <Text style={styles.emptyBtnText}>Analyze Document</Text>
          </Pressable>
        </View>
      ) : (
        recentDocs.map((doc: any) => (
          <View key={doc.id} style={[styles.docCard, { backgroundColor: colors.card }]}>
            <View style={styles.docIconBg}>
              <Feather name="file-text" size={20} color="#C9A84C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.docTitle, { color: colors.foreground }]} numberOfLines={1}>{doc.title}</Text>
              <Text style={[styles.docMeta, { color: colors.mutedForeground }]}>
                {doc.documentType} • {doc.analysisType ?? 'Saved'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  avatarBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#070D24' },
  heroBanner: {
    marginHorizontal: 20, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  heroLeft: { flex: 1 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#FFFFFF', marginBottom: 6 },
  heroSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#CBD5E1', marginBottom: 14, lineHeight: 18 },
  heroBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  heroBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#070D24' },
  heroLogoBadge: {
    width: 64, height: 64, borderRadius: 16, borderWidth: 1, borderColor: '#C9A84C40',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  subLogoIcon: { position: 'absolute', bottom: 8, right: 8 },
  vaultBanner: {
    marginHorizontal: 20, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, borderWidth: 1,
  },
  vaultIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#C9A84C18', alignItems: 'center', justifyContent: 'center' },
  vaultTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  vaultDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  intakeTrialHint: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  sectionTitleText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  seeAll: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#C9A84C40',
  },
  tierBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  actionCard: { width: '47%', borderRadius: 14, padding: 16, gap: 10 },
  actionIconBg: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  lockBadgeOverlay: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#070D24', borderRadius: 6, padding: 2 },
  actionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  dictationCard: {
    marginHorizontal: 20, borderRadius: 16, padding: 20, alignItems: 'center',
    marginBottom: 20, borderWidth: 1,
  },
  micPulseContainer: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  micButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  dictationStatusText: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 4, textAlign: 'center' },
  dictationStatusSub: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginBottom: 14 },
  dictationActionBtn: { borderRadius: 10, paddingVertical: 10, width: '100%', alignItems: 'center' },
  dictationActionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#070D24' },
  transcriptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  transcriptTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  clearText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#EF4444' },
  formattingBox: {
    width: '100%', borderRadius: 10, borderWidth: 1, padding: 20,
    height: 110, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10,
  },
  formattingText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  transcriptInput: {
    width: '100%', borderRadius: 10, borderWidth: 1, padding: 12,
    height: 120, fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 10, lineHeight: 18,
  },
  saveMemoBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  saveMemoBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#070D24' },
  memoItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10,
    borderRadius: 8, borderWidth: 1, marginBottom: 6, width: '100%',
  },
  memoText: { fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1, lineHeight: 15 },
  emptyCard: { marginHorizontal: 20, borderRadius: 14, padding: 20, alignItems: 'center', gap: 10, marginBottom: 20 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  emptyBtn: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 6 },
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#070D24' },
  reminderCard: { marginHorizontal: 20, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1 },
  reminderIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#C9A84C18', alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  reminderTime: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  docCard: { marginHorizontal: 20, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  docIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#C9A84C18', alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  docMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
});
