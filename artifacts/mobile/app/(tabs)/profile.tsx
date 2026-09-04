import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Platform, Alert, Modal,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser, useClerk } from '@clerk/expo';
import { useRouter } from 'expo-router';
import * as Haps from 'expo-haptics';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const firstName = user?.firstName ?? 'Counselor';
  const lastName = user?.lastName ?? '';
  const email = user?.emailAddresses?.[0]?.emailAddress ?? 'counsel@lawvise.com';

  const handleSignOut = async () => {
    Haps.impactAsync(Haps.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Account & Settings</Text>
      </View>

      {/* User Info Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{firstName} {lastName}</Text>
        <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{email}</Text>
      </View>

      {/* Professional Tier & Upgrade Card */}
      <View style={[styles.card, { borderColor: '#C9A84C40', backgroundColor: '#C9A84C10', borderWidth: 1 }]}>
        <View style={styles.profileHeaderRow}>
          <View style={[styles.avatarContainer, { backgroundColor: '#C9A84C30' }]}>
            <Feather name="award" size={24} color="#C9A84C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.foreground, textAlign: 'left', fontSize: 16 }]}>Professional Counsel Tier</Text>
            <Text style={[styles.profileEmail, { color: '#C9A84C', textAlign: 'left', marginTop: 2 }]}>Unlock Unlimited Vault & AI Drafting</Text>
          </View>
        </View>
        <Pressable 
          style={styles.upgradeButton}
          onPress={() => {
            Haptics.selectionAsync();
            setShowPaywallModal(true);
          }}
        >
          <Text style={styles.upgradeButtonText}>Upgrade / Select Plan</Text>
        </Pressable>
      </View>

      {/* Navigation Options */}
      <View style={[styles.card, { backgroundColor: colors.card, padding: 0, overflow: 'hidden' }]}>
        <Pressable
          style={styles.menuItem}
          onPress={() => { Haps.selectionAsync(); setShowTermsModal(true); }}
        >
          <Feather name="shield" size={18} color="#C9A84C" />
          <Text style={[styles.menuText, { color: colors.foreground }]}>Privacy Policy & Terms of Service</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Pressable
          style={styles.menuItem}
          onPress={() => { Haps.selectionAsync(); setShowAboutModal(true); }}
        >
          <Feather name="info" size={18} color="#C9A84C" />
          <Text style={[styles.menuText, { color: colors.foreground }]}>About Developer</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Sign Out */}
      <Pressable
        style={[styles.signOutBtn, { backgroundColor: colors.card }]}
        onPress={handleSignOut}
      >
        <Feather name="log-out" size={18} color="#EF4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      {/* Privacy Policy & Terms Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Privacy & Terms</Text>
            <Pressable onPress={() => setShowTermsModal(false)} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.termsHeading, { color: colors.foreground }]}>Privacy Policy</Text>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              LawVise respects your professional confidentiality. All documents analyzed or stored in your Secure Document Vault are encrypted using industry-standard protocols. We do not sell or share your legal data with third-party vendors.
            </Text>
            <Text style={[styles.termsHeading, { color: colors.foreground, marginTop: 20 }]}>Terms of Service</Text>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              LawVise provides AI-assisted legal research, drafting, and document analysis tools. Outputs generated by the platform are designed to assist legal practitioners and do not constitute formal legal counsel. Attorneys remain responsible for final filings and review.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* About Developer Modal */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>About Developer</Text>
            <Pressable onPress={() => setShowAboutModal(false)} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
            <View style={[styles.avatarLarge, { marginBottom: 16 }]}>
              <Feather name="code" size={32} color="#070D24" />
            </View>
            <Text style={[styles.profileName, { color: colors.foreground, fontSize: 18 }]}>LawVise Engineering</Text>
            <Text style={[styles.profileEmail, { color: '#C9A84C', marginTop: 4 }]}>Multi-Jurisdictional Legal Intelligence</Text>
            <Text style={[styles.termsText, { color: colors.mutedForeground, textAlign: 'center', marginTop: 20, lineHeight: 22 }]}>
              LawVise is engineered to empower legal professionals globally across US, UK, UAE, and Indian jurisdictions. Combining state-of-the-art AI reasoning with airtight secure vault storage, LawVise optimizes drafting, case analysis, and research workflows.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Subscription Paywall Modal with UPI, Cards, and Wallets */}
      <Modal
        visible={showPaywallModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywallModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Payment Method</Text>
            <Pressable onPress={() => setShowPaywallModal(false)} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              Choose your preferred billing method for LawVise Professional Access across US, UK, UAE, and India jurisdictions.
            </Text>

            {/* UPI Option */}
            <Pressable 
              style={[styles.paymentOptionCard, { backgroundColor: colors.card, borderColor: '#C9A84C' }]}
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert('UPI Gateway', 'Redirecting to secure UPI / Razorpay checkout...');
                setShowPaywallModal(false);
              }}
            >
              <Feather name="smartphone" size={22} color="#C9A84C" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.paymentTitle, { color: colors.foreground }]}>UPI & Domestic Wallets</Text>
                <Text style={[styles.paymentDesc, { color: colors.mutedForeground }]}>Google Pay, PhonePe, Paytm, BHIM</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>

            {/* Debit & Credit Cards Option */}
            <Pressable 
              style={[styles.paymentOptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert('Card Gateway', 'Redirecting to secure card processor (Debit & Credit cards supported)...');
                setShowPaywallModal(false);
              }}
            >
              <Feather name="credit-card" size={22} color="#C9A84C" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.paymentTitle, { color: colors.foreground }]}>Debit & Credit Cards</Text>
                <Text style={[styles.paymentDesc, { color: colors.mutedForeground }]}>Visa, MasterCard, RuPay, Maestro, Amex</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>

            {/* International Digital Wallets Option */}
            <Pressable 
              style={[styles.paymentOptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert('Digital Wallet', 'Connecting to Apple Pay / Google Pay checkout...');
                setShowPaywallModal(false);
              }}
            >
              <Feather name="shield" size={22} color="#C9A84C" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.paymentTitle, { color: colors.foreground }]}>Apple Pay & Google Pay</Text>
                <Text style={[styles.paymentDesc, { color: colors.mutedForeground }]}>One-touch secure biometric checkout</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  card: { marginHorizontal: 20, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  avatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#C9A84C', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarLargeText: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#070D24' },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 16, textAlign: 'center' },
  profileEmail: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', marginTop: 2 },
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', marginBottom: 14 },
  avatarContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upgradeButton: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, width: '100%', alignItems: 'center' },
  upgradeButtonText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#070D24' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, width: '100%', gap: 14 },
  menuText: { fontFamily: 'Inter_500Medium', fontSize: 14, flex: 1 },
  divider: { height: 1, width: '100%' },
  signOutBtn: { marginHorizontal: 20, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  signOutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#EF4444' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  closeBtn: { padding: 4 },
  termsHeading: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 8 },
  termsText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  paymentOptionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 14 },
  paymentTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  paymentDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
});
