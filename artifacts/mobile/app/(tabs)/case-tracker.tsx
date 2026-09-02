import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { fetch } from 'expo-fetch';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

export default function CauseListScreen() {
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.headerTitle}>Cause List & Judge Tracker</Text>
      <Text style={styles.subTitle}>Track daily cause lists, item numbers, and get automated reminders 1 day prior.</Text>

      <View style={styles.formCard}>
        <Text style={styles.formHeader}>Add New Hearing</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Judge Name (e.g., Justice R.K. Agrawal)"
          placeholderTextColor="#888"
          value={judgeName}
          onChangeText={setJudgeName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Case Title / Number (e.g., Suit 102/2026)"
          placeholderTextColor="#888"
          value={caseTitle}
          onChangeText={setCaseTitle}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Item Number (e.g., 24)"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={itemNumber}
          onChangeText={setItemNumber}
        />

        <TextInput
          style={styles.input}
          placeholder="Hearing Date (YYYY-MM-DD)"
          placeholderTextColor="#888"
          value={hearingDate}
          onChangeText={setHearingDate}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleAddHearing}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#070D24" />
          ) : (
            <>
              <Feather name="calendar" size={18} color="#070D24" style={{ marginRight: 6 }} />
              <Text style={styles.buttonText}>Add to Cause List & Set Reminder</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.resultsHeader}>Tracked Matters ({matters.length})</Text>
      {matters.length === 0 ? (
        <Text style={styles.emptyText}>No hearings tracked yet. Add one above.</Text>
      ) : (
        matters.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Item No. {item.itemNumber}</Text>
              </View>
              <Text style={styles.dateText}>📅 {item.hearingDate}</Text>
            </View>
            <Text style={styles.caseTitle}>{item.caseTitle}</Text>
            <Text style={styles.judgeText}>Presiding: {item.judgeName}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 10 },
  subTitle: { fontSize: 14, color: '#666', marginBottom: 20, marginTop: 5 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e1e4e8' },
  formHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#C9A84C',
    borderRadius: 8,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#070D24', fontSize: 15, fontWeight: 'bold' },
  resultsHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  emptyText: { color: '#888', fontStyle: 'italic', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { backgroundColor: '#e6f4ea', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { color: '#137333', fontSize: 12, fontWeight: 'bold' },
  dateText: { fontSize: 13, color: '#0052cc', fontWeight: '600' },
  caseTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  judgeText: { fontSize: 13, color: '#555' },
});
