import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

interface Matter {
  id: string;
  title: string;
}

interface MatterModalProps {
  visible: boolean;
  onClose: () => void;
  activeMatter: Matter | null;
  onSelectMatter: (matter: Matter | null) => void;
}

const MOCK_MATTERS: Matter[] = [
  { id: 'matter_123', title: 'TechCorp v. DataSystems Litigation' },
  { id: 'matter_456', title: 'Acquisition Agreement - Apex Corp' },
  { id: 'matter_789', title: 'IP Patent Filing - BioHealth' },
];

export default function MatterModal({ visible, onClose, activeMatter, onSelectMatter }: MatterModalProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: '#C9A84C' }]}>
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Feather name="briefcase" size={18} color="#C9A84C" />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Firm Matter Workspace</Text>
            </View>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
            Select an active matter to tie research, drafts, and firm billing records together.
          </Text>

          {/* General Practice / Clear Option */}
          <Pressable 
            style={[
              styles.matterItem, 
              { borderBottomColor: colors.border },
              !activeMatter && { backgroundColor: 'rgba(201, 168, 76, 0.1)' }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSelectMatter(null);
              onClose();
            }}
          >
            <Feather name="folder" size={16} color={!activeMatter ? '#C9A84C' : colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.matterText, { color: !activeMatter ? '#C9A84C' : colors.foreground }]}>
                General Practice
              </Text>
              <Text style={[styles.matterSubText, { color: colors.mutedForeground }]}>No active matter assigned</Text>
            </View>
            {!activeMatter && <Feather name="check" size={16} color="#C9A84C" />}
          </Pressable>

          {/* Matter List */}
          <FlatList
            data={MOCK_MATTERS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = activeMatter?.id === item.id;
              return (
                <Pressable 
                  style={[
                    styles.matterItem, 
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: 'rgba(201, 168, 76, 0.1)' }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSelectMatter(item);
                    onClose();
                  }}
                >
                  <Feather name="briefcase" size={16} color={isSelected ? '#C9A84C' : colors.mutedForeground} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.matterText, { color: isSelected ? '#C9A84C' : colors.foreground }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.matterSubText, { color: colors.mutedForeground }]}>ID: {item.id}</Text>
                  </View>
                  {isSelected && <Feather name="check" size={16} color="#C9A84C" />}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContainer: { borderRadius: 16, borderWidth: 1, padding: 20, maxHeight: '65%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  modalSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 16 },
  matterItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, borderBottomWidth: 1 },
  matterText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  matterSubText: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
});
