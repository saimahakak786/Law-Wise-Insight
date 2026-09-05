import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

// Import custom components
import Card from '../../components/Card';
import Button from '../../components/Button';


export default function CauseListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { jurisdiction } = useApp();

  const [judgeName, setJudgeName] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [hearingDate, setHearingDate] = useState(''); // Format: YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const [matters, setMatters] = useState<any[]>([]);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
    }
  };

  const handleAddHearing = async () => {
    if (!judgeName.trim() || !caseTitle.trim() || !hearingDate.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the Judge Name, Case Title, and Hearing Date.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      // Calculate 1 day prior trigger date
      const hearingDateTime = new Date(hearingDate);
      if (isNaN(hearingDateTime.getTime())) {
        Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
        setLoading(false);
        return;
      }

      const reminderDate = new Date(hearingDateTime.getTime());
      reminderDate.setDate(reminderDate.getDate() - 1); // Exactly 1 day before
      reminderDate.setHours(9, 0, 0, 0); // Set reminder for 9:00 AM a day prior

      // Schedule local notification if date is in the future
      if (reminderDate.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚖️ Hearing Reminder Tomorrow!',
            body: `Case ${caseTitle} (Item No. ${itemNumber || 'N/A'}) before ${judgeName} is scheduled for tomorrow (${hearingDate}).`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
          },
        });
      }

      const newMatter = {
        id: Date.now().toString(),
        judgeName,
        caseTitle,
        itemNumber: itemNumber || 'N/A',
        hearingDate,
        status: 'Pending Call',
      };

      setMatters([newMatter, ...matters]);
      setJudgeName('');
      setCaseTitle('');
      setItemNumber('');
      setHearingDate('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Hearing added! A reminder has been set for 1 day prior (${reminderDate.toDateString()}).`);
    } catch (error) {
      console.error('Error adding hearing:', error);
      Alert.alert('Error', 'Could not schedule hearing reminder.');
    } finally {
      setLoading(false);
    }
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 20);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cause List & Judge Tracker</Text>
      <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>Track daily cause lists, item numbers, and get automated reminders 1 day prior.</Text>

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
          placeholder="Hearing Date (YYYY-MM-DD)"
          placeholderTextColor={colors.mutedForeground}
          value={hearingDate}
          onChangeText={setHearingDate}
        />

        <Button
          title={loading ? "Scheduling..." : "Add to Cause List & Set Reminder"}
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
