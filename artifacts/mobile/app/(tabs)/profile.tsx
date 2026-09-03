import React from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Platform } from 'react-native';
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
  const { jurisdiction, setJurisdiction, language, setLanguage } = useApp();

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
});
