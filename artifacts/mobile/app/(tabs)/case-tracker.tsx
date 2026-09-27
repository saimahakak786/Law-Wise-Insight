import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';

// Import custom components
import Card from '../../components/Card';
import Button from '../../components/Button';

// Import your custom local court alarm sound asset
const courtAlarmAsset = require('../../attached_assets/court_alarm.mp3');

const STORAGE_KEY = '@lawwise_cause_list_matters';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const EVENT_TYPES = [
  { label: 'Hearing', icon: 'calendar', color: '#C9A84C' },
  { label: 'Written Statement / Counter', icon: 'file-text', color: '#EF4444' },
  { label: 'Limitation Expiry', icon: 'alert-circle', color: '#FB8C00' },
  { label: 'Peremptory Compliance', icon: 'check-square', color: '#8E24AA' },
];

export default function CauseListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { jurisdiction } = useApp();
  const router = useRouter();

  const [judgeName, setJudgeName] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [hearingDate, setHearingDate] = useState(''); // Format: DD-MM-YYYY
  const [selectedEventType, setSelectedEventType] = useState('Hearing');
  const [loading, setLoading] = useState(false);
  const [matters, setMatters] = useState<any[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Function to play local court alarm sound effect on demand
  const playCourtAlarmSound = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: playbackObject } = await Audio.Sound.createAsync(
        courtAlarmAsset,
        { shouldPlay: true, volume: 1.0 }
      );
      setSound(playbackObject);
    } catch (error) {
      console.log('Error playing local court alarm sound:', error);
    }
  };

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Load saved matters, setup notification channels, and handle notification taps on mount
  useEffect(() => {
    requestNotificationPermissions();
    loadStoredMatters();
    setupAndroidNotificationChannel();

    // Listen for notification taps to bring user into the app and navigate via router
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped with data:', data);
      
      // Play local court alarm sound when notification is tapped
      playCourtAlarmSound();

      // Navigate to the app screen when tapped
      try {
        router.push('/(tabs)');
      } catch (err) {
        console.log('Navigation routing error:', err);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  const setupAndroidNotificationChannel = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('cause-list-reminders', {
        name: 'Cause List & Deadline Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A84C',
        sound: 'default',
        enableVibrate: true,
      });
    }
  };

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

  const parseDateInput = (dateStr: string) => {
    const cleanStr = dateStr.trim();
    const parts = cleanStr.split(/[-/]/);
    
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (year.length === 4) {
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    }
    return new Date(dateStr);
  };

  const getDaysRemaining = (dateStr: string) => {
    const target = parseDateInput(dateStr);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAddHearing = async () => {
    if (!caseTitle.trim() || !hearingDate.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the Case Title and Target Date.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Play the local court alarm sound effect when saving a deadline
    playCourtAlarmSound();

    setLoading(true);

    try {
      const hearingDateTime = parseDateInput(hearingDate);
      if (isNaN(hearingDateTime.getTime())) {
        Alert.alert('Invalid Date', 'Please enter a valid date in DD-MM-YYYY format (e.g., 15-09-2026).');
        setLoading(false);
        return;
      }

      if (Platform.OS !== 'web') {
        try {
          const idealReminderTime = new Date(hearingDateTime.getTime() - 24 * 60 * 60 * 1000);
          const reminderTime = idealReminderTime.getTime() > Date.now()
            ? idealReminderTime
            : new Date(Date.now() + 5000);

          if (hearingDateTime.getTime() > Date.now()) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `⚖️ ${selectedEventType} Reminder`,
                body: `Case: ${caseTitle} ${itemNumber ? `(Item No. ${itemNumber})` : ''} — Due: ${hearingDate}`,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { caseTitle, hearingDate },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderTime,
                channelId: 'cause-list-reminders',
              },
            });
          }
        } catch (notifError) {
          console.log('Notification trigger error:', notifError);
        }
      }

      const newMatter = {
        id: Date.now().toString(),
        judgeName: judgeName.trim() || 'N/A',
        caseTitle,
        itemNumber: itemNumber || 'N/A',
        hearingDate,
        eventType: selectedEventType,
        status: 'Pending Call',
      };

      const updatedMatters = [newMatter, ...matters];
      setMatters(updatedMatters);
      await saveMattersToStorage(updatedMatters);

      setJudgeName('');
      setCaseTitle('');
      setItemNumber('');
      setHearingDate('');
      setSelectedEventType('Hearing');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `${selectedEventType} deadline tracked! Court alarm played and notification scheduled.`);
    } catch (error) {
      console.error('Error adding matter:', error);
      Alert.alert('Error', 'Could not save compliance entry.');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    const found = EVENT_TYPES.find(e => e.label === type);
    return found ? found.color : '#C9A84C';
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Feather name="calendar" size={22} color="#C9A84C" />
          <Text style={styles.screenTitle}>Cause List & Compliance</Text>
        </View>
        <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
          Track daily cause lists, written statements, affidavits, counter-filings, and limitation periods under {jurisdiction} law.
        </Text>
      </View>

      {/* Form Card */}
      <Card style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={styles.sectionHeaderLabel}>TRACK FILING DEADLINE & HEARING</Text>
        
        {/* Event Type Selector */}
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Deadline Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelectorScroll}>
          {EVENT_TYPES.map((type) => {
            const isSelected = selectedEventType === type.label;
            return (
              <TouchableOpacity
                key={type.label}
                style={[
                  styles.typeChip,
                  { borderColor: isSelected ? type.color : colors.border, backgroundColor: isSelected ? `${type.color}20` : colors.background }
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedEventType(type.label);
                }}
              >
                <Feather name={type.icon as any} size={14} color={isSelected ? type.color : colors.mutedForeground} />
                <Text style={[styles.typeChipText, { color: isSelected ? type.color : colors.mutedForeground }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Case Title / Number *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g., Suit 102/2026 or Sharma vs. Union"
            placeholderTextColor={colors.mutedForeground}
            value={caseTitle}
            onChangeText={setCaseTitle}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Judge / Forum Name (Optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g., Commercial Court / Justice Agrawal"
            placeholderTextColor={colors.mutedForeground}
            value={judgeName}
            onChangeText={setJudgeName}
          />
        </View>
        
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Item No. / Ref</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g., 24"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              value={itemNumber}
              onChangeText={setItemNumber}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1.2 }]}>
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Target Deadline Date *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="DD-MM-YYYY"
              placeholderTextColor={colors.mutedForeground}
              value={hearingDate}
              onChangeText={setHearingDate}
            />
          </View>
        </View>

        <Button
          title={loading ? "Saving Deadline..." : "Save Deadline & Set Reminder"}
          variant="primary"
          onPress={handleAddHearing}
          style={[loading && { opacity: 0.5 }, { marginTop: 4, marginVertical: 0, backgroundColor: '#C9A84C' }]}
        />
      </Card>

      {/* Tracked Matters Section */}
      <View style={styles.resultsHeaderRow}>
        <Text style={[styles.resultsHeader, { color: colors.foreground }]}>Active Deadlines & Cause List</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{matters.length}</Text>
        </View>
      </View>

      {matters.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="folder" size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No deadlines tracked yet. Schedule written statements, counter-affidavits, or hearing dates above to track preemptive timelines.</Text>
        </Card>
      ) : (
        matters.map((item) => {
          const typeColor = getEventTypeColor(item.eventType || 'Hearing');
          const daysLeft = getDaysRemaining(item.hearingDate);
          
          let urgencyColor = '#10B981'; // Green (Safe)
          let urgencyLabel = `${daysLeft} days left`;

          if (daysLeft < 0) {
            urgencyColor = '#EF4444';
            urgencyLabel = 'Overdue / Expired';
          } else if (daysLeft === 0) {
            urgencyColor = '#EF4444';
            urgencyLabel = '⚠️ Due Today!';
          } else if (daysLeft <= 7) {
            urgencyColor = '#EF4444'; // Critical
            urgencyLabel = `⚠️ ${daysLeft} days left (Critical)`;
          } else if (daysLeft <= 14) {
            urgencyColor = '#FB8C00'; // Warning
            urgencyLabel = `⚡ ${daysLeft} days left`;
          }

          return (
            <Card key={item.id} style={[styles.trackedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardRow}>
                <View style={[styles.badge, { backgroundColor: `${typeColor}20`, borderColor: `${typeColor}40` }]}>
                  <Text style={[styles.badgeText, { color: typeColor }]}>{item.eventType || 'Hearing'}</Text>
                </View>
                <View style={[styles.urgencyBadge, { backgroundColor: `${urgencyColor}18`, borderColor: `${urgencyColor}40` }]}>
                  <Text style={[styles.urgencyText, { color: urgencyColor }]}>{urgencyLabel}</Text>
                </View>
              </View>

              <Text style={[styles.caseTitle, { color: colors.foreground }]}>{item.caseTitle}</Text>
              
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>📅 Target: {item.hearingDate} • </Text>
                {item.itemNumber !== 'N/A' && (
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Item: {item.itemNumber} • </Text>
                )}
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Forum: {item.judgeName}</Text>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF' },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  formCard: { marginVertical: 0, marginBottom: 24, padding: 16, borderRadius: 12, borderWidth: 1 },
  sectionHeaderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C', letterSpacing: 1.2, marginBottom: 14 },
  typeSelectorScroll: { flexDirection: 'row', marginBottom: 14 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  typeChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 6 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  resultsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultsHeader: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  countBadge: { backgroundColor: '#C9A84C20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#C9A84C40' },
  countBadgeText: { color: '#C9A84C', fontSize: 12, fontFamily: 'Inter_700Bold' },
  emptyCard: { padding: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  trackedCard: { marginVertical: 0, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  urgencyText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  caseTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
});
