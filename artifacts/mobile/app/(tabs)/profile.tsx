import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Platform, Modal, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import custom components
import Card from '../components/Card';
import Button from '../components/Button';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { jurisdiction, setJurisdiction, language } = useApp();

  // State to control Modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signOut();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Sign Out Failed', 'Could not sign out. Please try again.');
    }
  };

  const handleJurisdictionChange = (newJurisdiction: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJurisdiction(newJurisdiction);
    Alert.alert('Jurisdiction Updated', `Default jurisdiction set to ${newJurisdiction}.`);
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 20);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Executive Profile</Text>
        <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>Manage your account credentials, legal jurisdictions, and preferences.</Text>

        {/* User Info Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.profileHeaderRow}>
            <View style={styles.avatarContainer}>
              <Feather name="user" size={28} color="#C9A84C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>
                {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Legal Practitioner'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
                {user?.primaryEmailAddress?.emailAddress ?? 'advocate@lawwise.com'}
              </Text>
            </View>
          </View>
          <View style={[styles.badgeRow, { borderColor: colors.border }]}>
            <Feather name="shield" size={14} color="#C9A84C" />
            <Text style={styles.badgeLabel}>Verified Enterprise Counsel</Text>
          </View>
        </Card>

        {/* Preferences Section */}
        <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Default Jurisdiction</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Select your primary jurisdiction for automated drafting & research.</Text>
        
        <View style={styles.jurisdictionRow}>
          {['Supreme Court', 'High Court', 'District Court'].map((j) => {
            const isSelected = jurisdiction === j;
            return (
              <Card
                key={j}
                onPress={() => handleJurisdictionChange(j)}
                style={[
                  styles.jurisdictionCard,
                  isSelected && { backgroundColor: '#C9A84C20', borderColor: '#C9A84C' }
                ]}
              >
                <Feather 
                  name={isSelected ? "check-circle" : "circle"} 
                  size={16} 
                  color={isSelected ? "#C9A84C" : colors.mutedForeground} 
                />
                <Text style={[styles.jurisdictionText, { color: isSelected ? '#C9A84C' : colors.foreground }]}>
                  {j}
                </Text>
              </Card>
            );
          })}
        </View>

        {/* App Settings info */}
        <Text style={[styles.sectionHeader, { color: colors.foreground, marginTop: 10 }]}>System Configuration</Text>
        
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <Feather name="globe" size={16} color="#C9A84C" />
              <Text style={[styles.infoLabel, { color: colors.foreground }]}>Active Language</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>{language ?? 'English'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <Feather name="cpu" size={16} color="#C9A84C" />
              <Text style={[styles.infoLabel, { color: colors.foreground }]}>Lyria AI Engine</Text>
            </View>
            <Text style={[styles.infoValue, { color: '#C9A84C' }]}>Connected v3.2</Text>
          </View>
        </Card>

        {/* Account & Compliance Action Links */}
        <Text style={[styles.sectionHeader, { color: colors.foreground, marginTop: 10 }]}>Account & Compliance</Text>
        <Card style={styles.infoCard}>
          <Pressable 
            style={styles.infoRow} 
            onPress={() => {
              Haptics.selectionAsync();
              setShowTermsModal(true);
            }}
          >
            <View style={styles.infoLabelRow}>
              <Feather name="shield" size={16} color="#C9A84C" />
              <Text style={[styles.infoLabel, { color: colors.foreground }]}>Privacy & Terms of Service</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable 
            style={styles.infoRow} 
            onPress={() => {
              Haptics.selectionAsync();
              setShowDevModal(true);
            }}
          >
            <View style={styles.infoLabelRow}>
              <Feather name="code" size={16} color="#C9A84C" />
              <Text style={[styles.infoLabel, { color: colors.foreground }]}>About Developer & System</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </Card>

        {/* Sign Out Button */}
        <View style={{ marginTop: 24 }}>
          <Button
            title="Sign Out of Session"
            variant="outline"
            onPress={handleSignOut}
            style={styles.signOutButton}
          />
        </View>
      </ScrollView>

      {/* Privacy & Terms Compliance Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Privacy & Legal Disclaimers</Text>
            <Pressable onPress={() => setShowTermsModal(false)} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.termsHeading, { color: '#C9A84C' }]}>1. Professional AI Legal Disclaimer</Text>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              LawVise is an AI-powered legal assistant designed to accelerate drafting, case analysis, and legal research. Content generated by LawVise does not constitute formal legal advice, structural representation, or create an attorney-client privilege. Licensed legal practitioners must review all outputs before court submission.
            </Text>

            <Text style={[styles.termsHeading, { color: '#C9A84C' }]}>2. Multi-Jurisdictional Compliance</Text>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              While LawVise adapts workflows across international jurisdictions (including US, UK, UAE, and India), local statutory updates and regional bar council regulations supersede automated templates. Verification by local qualified counsel is strongly advised.
            </Text>

            <Text style={[styles.termsHeading, { color: '#C9A84C' }]}>3. Data Privacy & Vault Security</Text>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              All documents stored in your Document Vault or analyzed through our secure endpoints comply with industrial data encryption standards. We do not use confidential client case files to train public foundational models.
            </Text>

            <View style={{ marginTop: 30 }}>
              <Button
                title="Acknowledge & Close"
                variant="primary"
                onPress={() => setShowTermsModal(false)}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Developer Details Modal */}
      <Modal
        visible={showDevModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDevModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.devModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.devModalHeader}>
              <Feather name="cpu" size={24} color="#C9A84C" />
              <Text style={[styles.devModalTitle, { color: colors.foreground }]}>Developer & System Details</Text>
              <Pressable onPress={() => setShowDevModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.devText, { color: colors.mutedForeground }]}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>LawVise Engine v1.0.0</Text>{"\n"}
              Engineered for global legal compliance across the US, UK, UAE, and India. Powered by high-performance multi-jurisdictional AI routing and secure cloud encryption architectures.
            </Text>

            <View style={[styles.devInfoBox, { borderColor: colors.border }]}>
              <Text style={[styles.devInfoText, { color: colors.foreground }]}>Lead Architect & Developer</Text>
              <Text style={[styles.devInfoValue, { color: '#C9A84C' }]}>Enterprise Legal Tech Division</Text>
            </View>

            <Pressable 
              style={styles.devCloseButton}
              onPress={() => setShowDevModal(false)}
            >
              <Text style={styles.devCloseButtonText}>Close Details</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, marginTop: 10 },
  subTitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 20, marginTop: 5 },
  sectionCard: { marginVertical: 0, marginBottom: 24, padding: 18 },
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#C9A84C20', borderWidth: 1, borderColor: '#C9A84C40', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  profileEmail: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  badgeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#C9A84C' },
  sectionHeader: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 4 },
  sectionSub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 12 },
  jurisdictionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  jurisdictionCard: { flex: 1, marginVertical: 0, padding: 12, alignItems: 'center', gap: 6 },
  jurisdictionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textAlign: 'center' },
  infoCard: { marginVertical: 0, marginBottom: 24, padding: 16, gap: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  divider: { height: 1, width: '100%' },
  signOutButton: { borderColor: '#EF444460', backgroundColor: '#EF444415' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  closeBtn: { padding: 4 },
  termsHeading: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginTop: 16, marginBottom: 6 },
  termsText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  devModalContent: { width: '100%', maxWidth: 360, borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  devModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  devModalTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, flex: 1 },
  devText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  devInfoBox: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  devInfoText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  devInfoValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  devCloseButton: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  devCloseButtonText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#070D24' },
});
