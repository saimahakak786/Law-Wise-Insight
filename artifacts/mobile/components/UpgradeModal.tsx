import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

export default function UpgradeModal({ visible, onClose, onSubscribe }: UpgradeModalProps) {
  const handleSubscribePress = () => {
    HapticFeedback();
    onSubscribe();
  };

  const HapticFeedback = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Fallback if haptics aren't available on web
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#D4AF37" />
          </TouchableOpacity>

          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={36} color="#0A1128" />
          </View>

          <Text style={styles.title}>Unlock LawVise Pro</Text>
          <Text style={styles.subtitle}>
            Supercharge your legal practice with AI Case Matching, FIR Analysis, Voice Dictation, and Unlimited Drafts.
          </Text>

          {/* Pricing Box */}
          <View style={styles.pricingBox}>
            <Text style={styles.priceText}>₹299</Text>
            <Text style={styles.periodText}> / month</Text>
            <Text style={styles.globalText}>(Globally accessible ~ $3.50/mo)</Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresList}>
            <FeatureItem text="AI Case Matcher & Precedent Finder" />
            <FeatureItem text="FIR & Judgment Analyzer" />
            <FeatureItem text="Continuous Voice Dictation" />
            <FeatureItem text="Court Fees & Limitation Calculators" />
          </View>

          {/* CTA Button */}
          <TouchableOpacity style={styles.ctaButton} onPress={handleSubscribePress}>
            <Text style={styles.ctaButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color="#D4AF37" style={{ marginRight: 8 }} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0A1128', // Deep Navy
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 2,
    borderTopColor: '#D4AF37', // Gold accent
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D4AF37', // Gold
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  pricingBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 20,
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  periodText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  globalText: {
    fontSize: 11,
    color: '#A0AEC0',
    marginLeft: 8,
  },
  featuresList: {
    width: '100%',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  ctaButton: {
    backgroundColor: '#D4AF37',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: { ios: 0.3, android: 0.5 } as any,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonText: {
    color: '#0A1128',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
