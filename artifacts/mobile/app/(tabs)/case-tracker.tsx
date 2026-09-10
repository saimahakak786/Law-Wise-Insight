import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import custom components
import Card from '../../components/Card';
import Button from '../../components/Button';

const STORAGE_KEY = '@lawvise_cause_list_matters';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function CauseListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { jurisdiction } = useApp();

  const [judgeName, setJudgeName] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [hearingDate, setHearingDate] = useState(''); // Format: DD-MM-YYYY
  const [loading, setLoading] = useState(false);
  const [matters, setMatters] = useState<any[]>([]);

  // Load saved matters and request permissions on mount
  useEffect(() => {
    requestNotificationPermissions();
    loadStoredMatters();
  }, []);

  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
      }
    } catch {
      console.log('Notifications not supported on this environment');
    }
  };

  const loadStoredMatters = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMatters(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Failed to load stored matters', e);
    }
  };

  const saveMattersToStorage = async (updatedMatters: any[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMatters));
    } catch (e) {
      console.log('Failed to save matters', e);
    }
  };

  // Helper to parse DD-MM-YYYY or DD/MM/YYYY into a valid Date object
  const parseDateInput = (dateStr: string) => {
    const cleanStr = dateStr.trim();
    const parts = cleanStr.split(/[-/]/);
    
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // Reconstruct as YYYY-MM-DD for JavaScript Date object
      if (year.length === 4) {
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    }
    return new Date(dateStr); // Fallback standard parse
  };

  const handleAddHearing = async () => {
    if (!judgeName.trim() || !caseTitle.trim() || !hearingDate.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the Judge Name, Case Title, and Hearing Date.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const hearingDateTime = parseDateInput(hearingDate);
      if (isNaN(hearingDateTime.getTime())) {
        Alert.alert('Invalid Date', 'Please enter a valid date in DD-MM-YYYY format (e.g., 15-09-2026).');
        setLoading(false);
        return;
      }

      // Schedule notification for 24 hours before the hearing date with sound enabled
      if (Platform.OS !== 'web') {
        try {
          const reminderTime = new Date(hearingDateTime.getTime() - 24 * 60 * 60 * 1000);
          
          if (reminderTime.getTime() > Date.now()) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '⚖️ Hearing Reminder',
                body: `Tomorrow: Case ${caseTitle} (Item No. ${itemNumber || 'N/A'}) before ${judgeName}.`,
                sound: true, // Enables audio alert
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderTime,
              },
            });
          }
        } catch (notifError) {
          console.log('Notification trigger error:', notifError);
        }
      }

      const newMatter = {
        id: Date.now().toString(),
        judgeName,
        caseTitle,
        itemNumber: itemNumber || 'N/A',
        hearingDate,
        status: 'Pending Call',
      };

      const updatedMatters = [newMatter, ...matters];
      setMatters(updatedMatters);
      await saveMattersToStorage(updatedMatters);

      setJudgeName('');
      setCaseTitle('');
      setItemNumber('');
      setHearingDate('');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Hearing added! 24-hour sound reminder scheduled.');
    } catch (error) {
      console.error('Error adding hearing:', error);
      Alert.alert('Error', 'Could not save hearing entry.');
    } finally {
      setLoading(false);
    }
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 20);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cause List & Judge Tracker</Text>
      <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>Track daily cause lists, item numbers, and manage upcoming court schedules.</Text>

      <Card style={styles.formCard}>
        <Text style={[styles.formHeader, { color: colors.foreground }]}>Add New Hearing</Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Judge Name (e.g., Justice R.K. Agrawal)"
          placeholderTextColor={colors.mutedForeground}
          value={judgeName}
          onChangeText={setJudgeName}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Case Title / Number (e.g., Suit 102/2026)"
          placeholderTextColor={colors.mutedForeground}
          value={caseTitle}
          onChangeText={setCaseTitle}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Item Number (e.g., 24)"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          value={itemNumber}
          onChangeText={setItemNumber}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Hearing Date (DD-MM-YYYY)"
          placeholderTextColor={colors.mutedForeground}
          value={hearingDate}
          onChangeText={setHearingDate}
        />

        <Button
          title={loading ? "Saving..." : "Add to Cause List"}
          variant="primary"
          onPress={handleAddHearing}
          style={[loading && { opacity: 0.5 }, { marginTop: 4, marginVertical: 0 }]}
        />
      </Card>

      <Text style={[styles.resultsHeader, { color: colors.foreground }]}>Tracked Matters ({matters.length})</Text>
      {matters.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No hearings tracked yet. Add one above.</Text>
      ) : (
        matters.map((item) => (
          <Card key={item.id} style={styles.trackedCard}>
            <View style={styles.cardRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Item No. {item.itemNumber}</Text>
              </View>
              <Text style={styles.dateText}>📅 {item.hearingDate}</Text>
            </View>
            <Text style={[styles.caseTitle, { color: colors.foreground }]}>{item.caseTitle}</Text>
            <Text style={[styles.judgeText, { color: colors.mutedForeground }]}>Presiding: {item.judgeName}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, marginTop: 10 },
  subTitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 20, marginTop: 5 },
  formCard: { marginVertical: 0, marginBottom: 24, padding: 16 },
  formHeader: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  resultsHeader: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 12 },
  emptyText: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', marginBottom: 20 },
  trackedCard: { marginVertical: 0, marginBottom: 12, padding: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { backgroundColor: '#C9A84C20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#C9A84C40' },
  badgeText: { color: '#C9A84C', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  dateText: { fontSize: 13, color: '#C9A84C', fontFamily: 'Inter_600SemiBold' },
  caseTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 4 },
  judgeText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
