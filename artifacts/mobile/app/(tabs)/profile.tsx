import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  Platform, Alert, Modal,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser, useClerk } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { useGetDocuments, useGetCases } from '@workspace/api-client-react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const JURISDICTIONS = ['India', 'United States', 'United Kingdom', 'UAE', 'Canada', 'Australia', 'Singapore', 'Other'];
const LANGUAGES = ['English', 'Hindi', 'Urdu', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati'];

function SettingRow({ icon, label, value, onPress, danger }: {
  icon: string; label: string; value?: string; onPress: () => void; danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, { backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? '#EF444420' : '#C9A84C15' }]}>
        <Feather name={icon as any} size={18} color={danger ? '#EF4444' : '#C9A84C'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, { color: danger ? '#EF4444' : colors.foreground }]}>{label}</Text>
        {value && <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>}
      </View>
      {!danger && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </Pressable>
  );
}

function PickerModal({ visible, title, options, selected, onSelect, onClose, colors }: {
  visible: boolean; title: string; options: string[]; selected: string;
  onSelect: (v: string) => void; onClose: () => void; colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.foreground }]}>{title}</Text>
          <Pressable onPress={onClose}><Feather name="x" size={22} color={colors.mutedForeground} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.pickerOption, { backgroundColor: selected === opt ? '#C9A84C20' : colors.card, borderColor: selected === opt ? '#C9A84C' : colors.border }]}
              onPress={() => { onSelect(opt); onClose(); }}
            >
              <Text style={[styles.pickerOptionText, { color: selected === opt ? '#C9A84C' : colors.foreground }]}>{opt}</Text>
              {selected === opt && <Feather name="check" size={16} color="#C9A84C" />}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { jurisdiction, language, setJurisdiction, setLanguage } = useApp();
  const { data: documents } = useGetDocuments();
  const { data: cases } = useGetCases();

  const [showJurisModal, setShowJurisModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  const name = user?.fullName ?? user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';
  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await signOut();
        },
      },
    ]);
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 16);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.screenTitle}>Profile</Text>

      {/* User Card */}
      <LinearGradient
        colors={['#1B2448', '#0F1635']}
        style={styles.userCard}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{documents?.length ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Documents</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{cases?.length ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Cases</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <View style={[styles.freeBadge]}>
            <Text style={styles.freeBadgeText}>FREE</Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Plan</Text>
        </View>
      </View>

      {/* Upgrade Banner */}
      <LinearGradient
        colors={['#C9A84C', '#E8C87A']}
        style={styles.upgradeBanner}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <View>
          <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
          <Text style={styles.upgradeDesc}>Unlimited documents, AI drafting, OCR & more</Text>
        </View>
        <Feather name="zap" size={28} color="#070D24" />
      </LinearGradient>

      {/* Settings */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREFERENCES</Text>
      <View style={styles.settingsGroup}>
        <SettingRow icon="globe" label="Jurisdiction" value={jurisdiction} onPress={() => setShowJurisModal(true)} />
        <SettingRow icon="type" label="Language" value={language} onPress={() => setShowLangModal(true)} />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
      <View style={styles.settingsGroup}>
        <SettingRow icon="folder" label="Document Vault" value={`${documents?.length ?? 0} documents saved`} onPress={() => {}} />
        <SettingRow icon="briefcase" label="My Cases" value={`${cases?.length ?? 0} cases tracked`} onPress={() => {}} />
        <SettingRow icon="shield" label="Privacy & Terms" onPress={() => {}} />
        <SettingRow icon="log-out" label="Sign Out" onPress={handleSignOut} danger />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>LawVise v1.0.0 • AI-Powered Legal Workspace</Text>

      <PickerModal
        visible={showJurisModal}
        title="Select Jurisdiction"
        options={JURISDICTIONS}
        selected={jurisdiction}
        onSelect={setJurisdiction}
        onClose={() => setShowJurisModal(false)}
        colors={colors}
      />
      <PickerModal
        visible={showLangModal}
        title="Select Language"
        options={LANGUAGES}
        selected={language}
        onSelect={setLanguage}
        onClose={() => setShowLangModal(false)}
        colors={colors}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#FFFFFF', paddingHorizontal: 20, marginBottom: 20 },
  userCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#C9A84C', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#070D24' },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 17, color: '#FFFFFF', marginBottom: 3 },
  userEmail: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8B9CC5' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  statBox: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  freeBadge: { backgroundColor: '#1B2448', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: '#C9A84C40' },
  freeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#C9A84C' },
  upgradeBanner: { marginHorizontal: 20, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  upgradeTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#070D24', marginBottom: 3 },
  upgradeDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#070D2490' },
  sectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, paddingHorizontal: 20, marginBottom: 8, letterSpacing: 0.8 },
  settingsGroup: { marginHorizontal: 20, borderRadius: 14, overflow: 'hidden', marginBottom: 20, gap: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  settingIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  settingValue: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  version: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginTop: 8 },
  pickerContainer: { flex: 1 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  pickerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 10, borderWidth: 1.5 },
  pickerOptionText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
});
