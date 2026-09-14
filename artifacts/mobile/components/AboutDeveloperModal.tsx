import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface AboutDeveloperModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutDeveloperModal({ visible, onClose }: AboutDeveloperModalProps) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          {/* Close Button */}
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>

          {/* Icon Badge */}
          <View style={[styles.iconWrap, { backgroundColor: '#C9A84C18', borderColor: '#C9A84C30' }]}>
            <Feather name="shield" size={24} color="#C9A84C" />
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>About Developer</Text>

          {/* Developer / Firm Details */}
          <View style={styles.profileSection}>
            <Text style={styles.expertName}>Advocate Saima Hakak</Text>
            <Text style={styles.firmName}>Saima Hakak & Associates</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Concise, High-Impact Professional Bio */}
          <Text style={[styles.bioText, { color: colors.mutedForeground }]}>
            Principal legal architect specializing in multi-jurisdictional AI compliance, legal intelligence, and secure vault systems across US, UK, UAE, and Indian frameworks.
          </Text>

          {/* Action Button */}
          <Pressable style={styles.actionButton} onPress={onClose}>
            <Text style={styles.actionButtonText}>Close</Text>
          </Pressable>

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
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  expertName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#C9A84C',
    textAlign: 'center',
    marginBottom: 4,
  },
  firmName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#8B9CC5',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    marginBottom: 16,
  },
  bioText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    width: '100%',
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#070D24',
  },
});
