import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface AboutDeveloperModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutDeveloperModal({ visible, onClose }: AboutDeveloperModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>About Developer</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.closeBtn}
            >
              <Feather name="x" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Developer Details */}
          <View style={styles.body}>
            <View style={styles.iconContainer}>
              <Feather name="shield" size={24} color="#070D24" />
            </View>

            <Text style={styles.devTitle}>Advocate Saima Hakak</Text>
            <Text style={styles.devFirm}>Saima Hakak & Associates</Text>
            <Text style={styles.devSubtitle}>Multi-Jurisdictional Legal Intelligence</Text>

            <Text style={styles.description}>
              LawVise was envisioned, designed, and engineered under the direction of Advocate Saima Hakak (Saima Hakak & Associates). Built to empower legal professionals globally across US, UK, UAE, and Indian jurisdictions, combining state-of-the-art AI reasoning with airtight secure vault storage.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 13, 36, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#070D24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1B2448',
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2448',
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#131D3D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1B2448',
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  devTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  devFirm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#C9A84C',
    marginBottom: 4,
    textAlign: 'center',
  },
  devSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#8B9CC5',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#8B9CC5',
    textAlign: 'center',
    lineHeight: 22,
  },
});
