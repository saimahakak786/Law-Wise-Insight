import React from 'react';
import { StyleSheet, Text, View, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export default function AboutDeveloperModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          
          {/* Header with Close Button */}
          <View style={styles.headerRow}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>About Developer</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content to prevent clipping */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Shield / Icon Badge */}
            <View style={styles.iconContainer}>
              <Feather name="shield" size={28} color="#C9A84C" />
            </View>

            {/* Subdued intro text leading into your name */}
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
              LawVise was envisioned, designed, and engineered under the direction of legal expert
            </Text>

            {/* Prominent Name Placement in the middle */}
            <Text style={[styles.developerName, { color: colors.foreground }]}>
              Advocate Saima Hakak
            </Text>
            <Text style={styles.firmName}>
              Saima Hakak & Associates
            </Text>

            {/* Rest of the descriptive text */}
            <Text style={[styles.bodyText, { color: colors.mutedForeground, marginTop: 12 }]}>
              Multi-Jurisdictional Legal Intelligence. Built to empower legal professionals globally across US, UK, UAE, and Indian jurisdictions, combining state-of-the-art AI reasoning with airtight secure vault storage.
            </Text>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C9A84C20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C9A84C40',
  },
  developerName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  firmName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#C9A84C',
    textAlign: 'center',
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
