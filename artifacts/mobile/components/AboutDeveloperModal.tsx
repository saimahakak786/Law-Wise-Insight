import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface DeveloperModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DeveloperModal({ visible, onClose }: DeveloperModalProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          {/* Close Icon Button */}
          <Pressable style={styles.closeIconBtn} onPress={onClose}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>

          {/* Minimalist Shield Icon */}
          <View style={styles.iconContainer}>
            <Feather name="shield" size={20} color="#C9A84C" />
          </View>

          <Text style={styles.modalTitle}>About Developer</Text>

          {/* High-Standard Compact Name Formatting */}
          <View style={styles.developerInfoBox}>
            <Text style={[styles.developerName, { color: colors.foreground }]}>
              Developed by <Text style={styles.highlightName}>Adv. Saima Hakak</Text>
            </Text>
            <Text style={[styles.firmSubText, { color: '#C9A84C' }]}>Saima Hakak & Associates</Text>
          </View>

          <Text style={[styles.developerBio, { color: colors.mutedForeground }]}>
            Principal legal architect specializing in multi-jurisdictional AI compliance, legal intelligence, and secure vault systems across US, UK, UAE, and Indian frameworks.
          </Text>

          <Pressable style={styles.actionButton} onPress={onClose}>
            <Text style={styles.actionButtonText}>Close</Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 13, 36, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  closeIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  developerInfoBox: {
    alignItems: 'center',
    marginBottom: 14,
  },
  developerName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  highlightName: {
    fontFamily: 'Inter_700Bold',
    color: '#C9A84C',
  },
  firmSubText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  developerBio: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    width: '100%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#070D24',
  },
});
