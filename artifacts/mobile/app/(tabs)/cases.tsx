import React, { useState } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet,
  Modal, TextInput, ScrollView, ActivityIndicator,
  Platform, Alert, Share,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCases, useCreateCase, useUpdateCase, useDeleteCase,
  getGetCasesQueryKey,
} from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

type CaseStatus = 'active' | 'pending' | 'closed' | 'won' | 'lost';

const STATUS_COLORS: Record<CaseStatus, string> = {
  active: '#3B82F6',
  pending: '#F59E0B',
  closed: '#6B7280',
  won: '#22C55E',
  lost: '#EF4444',
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  closed: 'Closed',
  won: 'Won',
  lost: 'Lost',
};

const FILTER_OPTIONS: Array<CaseStatus | 'all'> = ['all', 'active', 'pending', 'closed', 'won', 'lost'];

type CasePriority = 'low' | 'medium' | 'high' | '';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

interface CaseItem {
  id: number;
  title: string;
  caseNumber?: string | null;
  court?: string | null;
  status: CaseStatus;
  description?: string | null;
  hearingDate?: string | null;
  priority?: CasePriority | null;
  nextAction?: string | null;
}

interface CaseFormData {
  title: string;
  caseNumber: string;
  court: string;
  status: CaseStatus;
  description: string;
  hearingDate: string;
  priority: CasePriority;
  nextAction: string;
}

const defaultForm: CaseFormData = {
  title: '',
  caseNumber: '',
  court: '',
  status: 'active',
  description: '',
  hearingDate: '',
  priority: '',
  nextAction: '',
};

const MOCK_FALLBACK_CASES: CaseItem[] = [
  {
    id: 1,
    title: 'Sharma vs. Apex Properties',
    caseNumber: 'CS/452/2026',
    court: 'Delhi High Court',
    status: 'active',
    description: 'Property dispute regarding commercial lease agreement covenant breaches.',
    hearingDate: '20 Oct 2026',
    priority: 'high',
    nextAction: 'File written statement response',
  },
  {
    id: 2,
    title: 'TechCorp IP Infringement',
    caseNumber: 'IPR/89/2026',
    court: 'Commercial Court, Mumbai',
    status: 'pending',
    description: 'Trademark infringement claim over brand logo and software trade secrets.',
    hearingDate: '05 Nov 2026',
    priority: 'medium',
    nextAction: 'Await replies on temporary injunction application',
  },
  {
    id: 3,
    title: 'Verma Employment Arbitration',
    caseNumber: 'ARB/12/2025',
    court: 'Arbitration Tribunal',
    status: 'won',
    description: 'Unlawful termination and severance dues settlement arbitration.',
    hearingDate: 'Completed',
    priority: 'low',
    nextAction: 'Execute final settlement award',
  },
];

export default function CasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: remoteCases, isLoading: remoteLoading, error: remoteError } = useGetCases();
  const createCase = useCreateCase();
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  const [localCases, setLocalCases] = useState<CaseItem[]>(MOCK_FALLBACK_CASES);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  const cases = (remoteError || !remoteCases || useLocalFallback) ? localCases : remoteCases;
  const isLoading = remoteLoading && !useLocalFallback && !remoteCases;

  const [filter, setFilter] = useState<CaseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CaseFormData>(defaultForm);

  // Filter by status tab & search query text (title, caseNumber, or court)
  const filtered = cases?.filter((c) => {
    const matchesStatus = filter === 'all' || c.status === filter;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;
    
    const matchesTitle = c.title?.toLowerCase().includes(query) ?? false;
    const matchesCaseNum = c.caseNumber?.toLowerCase().includes(query) ?? false;
    const matchesCourt = c.court?.toLowerCase().includes(query) ?? false;

    return matchesStatus && (matchesTitle || matchesCaseNum || matchesCourt);
  }) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCasesQueryKey() });

  const openAddModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (c: CaseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(c.id);
    setForm({
      title: c.title,
      caseNumber: c.caseNumber ?? '',
      court: c.court ?? '',
      status: c.status as CaseStatus,
      description: c.description ?? '',
      hearingDate: c.hearingDate ?? '',
      priority: (c.priority as CasePriority) ?? '',
      nextAction: c.nextAction ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload = {
      title: form.title,
      caseNumber: form.caseNumber || null,
      court: form.court || null,
      status: form.status,
      description: form.description || null,
      hearingDate: form.hearingDate || null,
      priority: form.priority || null,
      nextAction: form.nextAction || null,
    };

    try {
      if (editingId) {
        try {
          await updateCase.mutateAsync({ id: String(editingId), data: payload });
          invalidate();
        } catch {
          setLocalCases(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } : c));
          setUseLocalFallback(true);
        }
      } else {
        try {
          await createCase.mutateAsync({ data: payload });
          invalidate();
        } catch {
          const newCase: CaseItem = {
            id: Date.now(),
            ...payload,
          };
          setLocalCases(prev => [newCase, ...prev]);
          setUseLocalFallback(true);
        }
      }
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save case. Please try again.');
    }
  };

  const handleDelete = (id: number, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Case', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCase.mutateAsync({ id: String(id) });
            invalidate();
          } catch {
            setLocalCases(prev => prev.filter(c => c.id !== id));
            setUseLocalFallback(true);
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  // Export Portfolio Report via Native Share Sheet
  const handleExportPortfolio = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!cases || cases.length === 0) {
      Alert.alert('Empty Portfolio', 'No cases available to export.');
      return;
    }

    const reportText = `⚖️ LAWVISE CASE PORTFOLIO REPORT\nGenerated on ${new Date().toLocaleDateString()}\n\n` +
      cases.map((c, idx) => 
        `${idx + 1}. ${c.title}\n   Case No: ${c.caseNumber || 'N/A'}\n   Court: ${c.court || 'N/A'}\n   Status: ${STATUS_LABELS[c.status]}\n   Next Hearing: ${c.hearingDate || 'None'}\n   Next Action: ${c.nextAction || 'None'}\n`
      ).join('\n');

    try {
      await Share.share({
        message: reportText,
        title: 'LawVise Case Portfolio Report',
      });
    } catch {
      Alert.alert('Error', 'Could not export portfolio report.');
    }
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: padTop }]}>
        <View style={styles.titleRow}>
          <Feather name="briefcase" size={22} color="#C9A84C" />
          <Text style={styles.title}>Case Portfolio</Text>
        </View>
        <View style={styles.headerActionRow}>
          <Pressable style={styles.exportBtn} onPress={handleExportPortfolio}>
            <Feather name="share-2" size={18} color="#C9A84C" />
          </Pressable>
          <Pressable style={styles.addBtn} onPress={openAddModal}>
            <Feather name="plus" size={20} color="#070D24" />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.screenSub, { color: colors.mutedForeground, paddingHorizontal: 20 }]}>
        Track litigations, court hearing dates, and priority counsel action items.
      </Text>

      {/* Real-time Search Input Bar */}
      <View style={[styles.searchContainer, { paddingHorizontal: 20, marginBottom: 14 }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by title, case no, or court..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTER_OPTIONS.map((f) => {
          const isSelected = filter === f;
          return (
            <Pressable
              key={f}
              style={[
                styles.filterTab, 
                { backgroundColor: isSelected ? '#C9A84C' : colors.card, borderColor: isSelected ? '#C9A84C' : colors.border }
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(f);
              }}
            >
              <Text style={[styles.filterTabText, { color: isSelected ? '#070D24' : colors.mutedForeground }]}>
                {f === 'all' ? 'All' : STATUS_LABELS[f]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Cases List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>Loading case records...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <Feather name="folder-minus" size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No cases found</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                {searchQuery ? `No matches found for "${searchQuery}"` : 'Track your legal matters and upcoming schedule above.'}
              </Text>
              {searchQuery ? (
                <Pressable style={styles.emptyBtn} onPress={() => setSearchQuery('')}>
                  <Text style={styles.emptyBtnText}>Clear Search</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.emptyBtn} onPress={openAddModal}>
                  <Text style={styles.emptyBtnText}>Add First Case</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const hasUrgentHearing = item.hearingDate && !item.hearingDate.toLowerCase().includes('completed');
            return (
              <Pressable
                style={[styles.caseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onLongPress={() => handleDelete(item.id, item.title)}
                onPress={() => openEditModal(item)}
              >
                <View style={styles.caseCardLeft}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status as CaseStatus] ?? '#6B7280' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.caseTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                    {item.caseNumber && (
                      <Text style={[styles.caseMeta, { color: '#C9A84C', marginBottom: 2 }]}>#{item.caseNumber}</Text>
                    )}
                    {item.court && (
                      <View style={styles.caseMetaRow}>
                        <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.court}</Text>
                      </View>
                    )}
                    {item.hearingDate && (
                      <View style={styles.caseMetaRow}>
                        <Feather name="calendar" size={12} color={hasUrgentHearing ? '#EF4444' : '#C9A84C'} />
                        <Text style={[styles.metaText, { color: hasUrgentHearing ? '#EF4444' : '#C9A84C', fontFamily: hasUrgentHearing ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                          Next: {item.hearingDate} {hasUrgentHearing ? '⚠️' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status as CaseStatus] ?? '#6B7280') + '20', borderColor: (STATUS_COLORS[item.status as CaseStatus] ?? '#6B7280') + '40' }]}>
                  <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status as CaseStatus] ?? '#6B7280' }]}>
                    {STATUS_LABELS[item.status as CaseStatus]}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingId ? 'Edit Case Record' : 'New Case Record'}</Text>
            <Pressable onPress={handleSave} disabled={!form.title.trim() || createCase.isPending || updateCase.isPending}>
              <Text style={[styles.modalSave, { color: form.title.trim() ? '#C9A84C' : colors.mutedForeground }]}>
                {createCase.isPending || updateCase.isPending ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {[
              { key: 'title', label: 'Case Title / Parties *', placeholder: 'e.g. XYZ vs ABC' },
              { key: 'caseNumber', label: 'Case Number', placeholder: 'e.g. 123/2026' },
              { key: 'court', label: 'Court / Tribunal', placeholder: 'e.g. Delhi High Court' },
              { key: 'hearingDate', label: 'Next Hearing Date', placeholder: 'e.g. 15 Oct 2026' },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>{label}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={form[key as keyof CaseFormData] as string}
                  onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}

            <Text style={[styles.formLabel, { color: colors.foreground }]}>Status</Text>
            <View style={styles.statusGrid}>
              {(['active', 'pending', 'closed', 'won', 'lost'] as CaseStatus[]).map((s) => (
                <Pressable
                  key={s}
                  style={[styles.statusOption, { backgroundColor: form.status === s ? STATUS_COLORS[s] + '30' : colors.card, borderColor: form.status === s ? STATUS_COLORS[s] : colors.border }]}
                  onPress={() => setForm((p) => ({ ...p, status: s }))}
                >
                  <View style={[styles.statusOptionDot, { backgroundColor: STATUS_COLORS[s] }]} />
                  <Text style={[styles.statusOptionText, { color: form.status === s ? STATUS_COLORS[s] : colors.mutedForeground }]}>{STATUS_LABELS[s]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: colors.foreground }]}>Priority Level</Text>
            <View style={[styles.statusGrid, { marginBottom: 16 }]}>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <Pressable
                  key={p}
                  style={[styles.statusOption, { backgroundColor: form.priority === p ? PRIORITY_COLORS[p] + '30' : colors.card, borderColor: form.priority === p ? PRIORITY_COLORS[p] : colors.border }]}
                  onPress={() => setForm((prev) => ({ ...prev, priority: prev.priority === p ? '' : p }))}
                >
                  <View style={[styles.statusOptionDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                  <Text style={[styles.statusOptionText, { color: form.priority === p ? PRIORITY_COLORS[p] : colors.mutedForeground }]}>{PRIORITY_LABELS[p]}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Next Action Required</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.nextAction}
                onChangeText={(v) => setForm((p) => ({ ...p, nextAction: v }))}
                placeholder="Next step or preparation needed..."
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Case Summary / Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="Brief summary of the case particulars..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF' },
  headerActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, height: '100%' },
  clearSearchBtn: { padding: 4 },
  exportBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#C9A84C20', borderWidth: 1, borderColor: '#C9A84C40', alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#C9A84C', alignItems: 'center', justifyContent: 'center' },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 16, flexDirection: 'row' },
  filterTab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  filterTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  caseCard: { borderRadius: 12, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caseCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  caseTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 4 },
  caseMeta: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  caseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  statusBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1 },
  statusBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  loaderContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loaderText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  emptyCard: { padding: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginBottom: 4 },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#070D24' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  modalCancel: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  modalSave: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  modalContent: { padding: 20, gap: 12, paddingBottom: 60 },
  formField: { marginBottom: 4 },
  formLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 6 },
  formInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 46, fontFamily: 'Inter_400Regular', fontSize: 14 },
  formTextArea: { height: 100, paddingTop: 12 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  statusOptionDot: { width: 6, height: 6, borderRadius: 3 },
  statusOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
