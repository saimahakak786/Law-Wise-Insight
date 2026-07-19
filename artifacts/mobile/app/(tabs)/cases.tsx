import React, { useState } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet,
  Modal, TextInput, ScrollView, ActivityIndicator,
  Platform, Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCases, useCreateCase, useUpdateCase, useDeleteCase,
  getGetCasesQueryKey,
} from '@workspace/api-client-react';
import { LinearGradient } from 'expo-linear-gradient';
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

interface CaseFormData {
  title: string;
  caseNumber: string;
  court: string;
  status: CaseStatus;
  description: string;
  hearingDate: string;
}

const defaultForm: CaseFormData = {
  title: '',
  caseNumber: '',
  court: '',
  status: 'active',
  description: '',
  hearingDate: '',
};

export default function CasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: cases, isLoading } = useGetCases();
  const createCase = useCreateCase();
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  const [filter, setFilter] = useState<CaseStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CaseFormData>(defaultForm);

  const filtered = cases?.filter((c) => filter === 'all' || c.status === filter) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCasesQueryKey() });

  const openAddModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (c: typeof cases[0]) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      caseNumber: c.caseNumber ?? '',
      court: c.court ?? '',
      status: c.status as CaseStatus,
      description: c.description ?? '',
      hearingDate: c.hearingDate ?? '',
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
    };
    try {
      if (editingId) {
        await updateCase.mutateAsync({ id: String(editingId), data: payload });
      } else {
        await createCase.mutateAsync({ data: payload });
      }
      invalidate();
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save case. Please try again.');
    }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert('Delete Case', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteCase.mutateAsync({ id: String(id) });
          invalidate();
        },
      },
    ]);
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 16);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: padTop }]}>
        <Text style={styles.title}>Case Tracker</Text>
        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Feather name="plus" size={22} color="#070D24" />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTER_OPTIONS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterTab, { backgroundColor: filter === f ? '#C9A84C' : colors.card, borderColor: filter === f ? '#C9A84C' : colors.border }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, { color: filter === f ? '#070D24' : colors.mutedForeground }]}>
              {f === 'all' ? 'All' : STATUS_LABELS[f]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Cases List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="briefcase" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No cases yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Track your legal cases and hearing dates</Text>
              <Pressable style={styles.emptyBtn} onPress={openAddModal}>
                <Text style={styles.emptyBtnText}>Add First Case</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.caseCard, { backgroundColor: colors.card }]}
              onLongPress={() => handleDelete(item.id, item.title)}
              onPress={() => openEditModal(item)}
            >
              <View style={styles.caseCardLeft}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status as CaseStatus] ?? '#6B7280' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.caseTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                  {item.caseNumber && (
                    <Text style={[styles.caseMeta, { color: colors.mutedForeground }]}>#{item.caseNumber}</Text>
                  )}
                  {item.court && (
                    <View style={styles.caseMetaRow}>
                      <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.caseMeta, { color: colors.mutedForeground }]}>{item.court}</Text>
                    </View>
                  )}
                  {item.hearingDate && (
                    <View style={styles.caseMetaRow}>
                      <Feather name="calendar" size={11} color="#C9A84C" />
                      <Text style={[styles.caseMeta, { color: '#C9A84C' }]}>Next: {item.hearingDate}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status as CaseStatus] + '22' }]}>
                <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status as CaseStatus] ?? '#6B7280' }]}>
                  {STATUS_LABELS[item.status as CaseStatus]}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingId ? 'Edit Case' : 'New Case'}</Text>
            <Pressable onPress={handleSave} disabled={!form.title.trim()}>
              <Text style={[styles.modalSave, { color: form.title.trim() ? '#C9A84C' : colors.mutedForeground }]}>Save</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {[
              { key: 'title', label: 'Case Title *', placeholder: 'e.g. XYZ vs ABC' },
              { key: 'caseNumber', label: 'Case Number', placeholder: 'e.g. 123/2024' },
              { key: 'court', label: 'Court / Tribunal', placeholder: 'e.g. Delhi High Court' },
              { key: 'hearingDate', label: 'Next Hearing Date', placeholder: 'e.g. 15 Jan 2025' },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={form[key as keyof CaseFormData]}
                  onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}

            <Text style={[styles.formLabel, { color: colors.mutedForeground, paddingHorizontal: 0 }]}>Status</Text>
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

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="Brief description of the case..."
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#FFFFFF' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C9A84C', alignItems: 'center', justifyContent: 'center' },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 16, flexDirection: 'row' },
  filterTab: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  filterTabText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  caseCard: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caseCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  caseTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 4 },
  caseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  caseMeta: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  statusBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, marginTop: 40 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
  emptyBtn: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 8 },
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#070D24' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  modalCancel: { fontFamily: 'Inter_400Regular', fontSize: 16 },
  modalSave: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  modalContent: { padding: 20, gap: 8, paddingBottom: 60 },
  formField: { marginBottom: 12 },
  formLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 6 },
  formInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, height: 48, fontFamily: 'Inter_400Regular', fontSize: 15 },
  formTextArea: { height: 100, paddingTop: 12 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5 },
  statusOptionDot: { width: 8, height: 8, borderRadius: 4 },
  statusOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
