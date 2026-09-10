import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Platform, ActivityIndicator,
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day,</Text>
          <Text style={styles.name}>{firstName}</Text>
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
        style={({ pressed }) => [styles.vaultBanner, { backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 }]}
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

      {/* Active Case Reminders / Cause List */}
      <View style={styles.sectionHeader}>
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
            style={({ pressed }) => [styles.reminderCard, { backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 }]}
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

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(action.route as any); }}
          >
            <LinearGradient
              colors={['#C9A84C22', '#C9A84C08']}
              style={styles.actionIconBg}
            >
              <Feather name={action.icon} size={24} color="#C9A84C" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
          </Pressable>
        ))}
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
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#8B9CC5' },
  name: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF' },
  avatarBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#070D24' },
  heroBanner: {
    marginHorizontal: 20, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  heroLeft: { flex: 1 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#FFFFFF', marginBottom: 6 },
  heroSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8B9CC5', marginBottom: 14, lineHeight: 18 },
  heroBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  heroBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#070D24' },
  heroLogoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C9A84C40',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  subLogoIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  vaultBanner: {
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C9A84C30',
  },
  vaultIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#C9A84C18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  vaultDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, paddingHorizontal: 20, marginBottom: 12 },
  sectionTitleText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  seeAll: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  actionCard: { width: '47%', borderRadius: 14, padding: 16, gap: 10 },
  actionIconBg: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  emptyCard: { marginHorizontal: 20, borderRadius: 14, padding: 20, alignItems: 'center', gap: 10, marginBottom: 20 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  emptyBtn: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 6 },
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#070D24' },
  reminderCard: { marginHorizontal: 20, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: '#C9A84C20' },
  reminderIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#C9A84C18', alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  reminderTime: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  docCard: { marginHorizontal: 20, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  docIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#C9A84C18', alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  docMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
});
