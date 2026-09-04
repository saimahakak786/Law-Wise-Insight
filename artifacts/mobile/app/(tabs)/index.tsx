import React from 'react';
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
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { data: documents, isLoading: docsLoading } = useGetDocuments();
  const { data: cases } = useGetCases();

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? 'Counselor';
  const recentDocs = documents?.slice(0, 3) ?? [];
  const activeCases = cases?.filter(c => c.status === 'active').length ?? 0;

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
        <LinearGradient
          colors={['#C9A84C', '#E8C87A']}
          style={styles.avatarBadge}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
        </LinearGradient>
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
        <Feather name="shield" size={64} color="#C9A84C" style={{ opacity: 0.3 }} />
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{documents?.length ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Documents</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{activeCases}</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Documents</Text>
        <Pressable onPress={() => router.push('/(tabs)/analyze')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </Pressable>
      </View>

      {docsLoading ? (
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
        recentDocs.map((doc) => (
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  heroLeft: { flex: 1 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#FFFFFF', marginBottom: 6 },
  heroSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8B9CC5', marginBottom: 14, lineHeight: 18 },
  heroBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  heroBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#070D24' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, paddingHorizontal: 20, marginBottom: 12 },
  seeAll: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  actionCard: { width: '47%', borderRadius: 14, padding: 16, gap: 10 },
  actionIconBg: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  emptyCard: { marginHorizontal: 20, borderRadius: 14, padding: 28, alignItems: 'center', gap: 10 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 6 },
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#070D24' },
  docCard: { marginHorizontal: 20, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  docIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#C9A84C18', alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  docMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
});
