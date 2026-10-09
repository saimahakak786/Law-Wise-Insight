import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Alert, Platform, TouchableOpacity, Modal, Pressable, Linking } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Import custom components
import Card from '../../components/Card';
import Button from '../../components/Button';

const STORAGE_KEY = '@lawwise_cause_list_matters';
const CASES_STORAGE_KEY = '@lawwise_cases_portfolio_v2';

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
  const [hearingDate, setHearingDate] = useState(''); // Format: DD-MM-YYYY or YYYY-MM-DD
  const [selectedEventType, setSelectedEventType] = useState('Hearing');
  const [loading, setLoading] = useState(false);
  const [matters, setMatters] = useState<any[]>([]);
  const [editingMatterId, setEditingMatterId] = useState<string | null>(null);
  
  // Case Portfolio Integration States
  const [portfolioCases, setPortfolioCases] = useState<any[]>([]);
  const [showCasePickerModal, setShowCasePickerModal] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    loadStoredMatters();
    loadPortfolioCases();
    setupAndroidNotificationChannel();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped with data:', data);

      try {
        router.push('/(tabs)/case-tracker');
      } catch (err) {
        console.log('Navigation routing error:', err);
      }
    });

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = response.notification.request.content.data;
        console.log('App opened from closed state via notification:', data);
        try {
          router.push('/(tabs)/case-tracker');
        } catch (err) {
          console.log('Cold start navigation error:', err);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  const setupAndroidNotificationChannel = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('court-alerts-v2', {
        name: 'Court & Hearing Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A84C',
        sound: 'default',
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

  const loadPortfolioCases = async () => {
    try {
      const savedCases = await AsyncStorage.getItem(CASES_STORAGE_KEY);
      if (savedCases) {
        setPortfolioCases(JSON.parse(savedCases));
      }
    } catch (e) {
      console.log('Failed to load portfolio cases', e);
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
      if (parts[0].length === 4) {
        return new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
      } else {
        const [day, month, year] = parts;
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

  const handleSelectCaseFromPortfolio = (c: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCaseTitle(c.title + (c.caseNumber ? ` (${c.caseNumber})` : ''));
    setJudgeName(c.court || '');
    if (c.hearingDate) {
      setHearingDate(c.hearingDate);
    }
    setShowCasePickerModal(false);
  };

  const handleEditMatter = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingMatterId(item.id);
    setCaseTitle(item.caseTitle);
    setJudgeName(item.judgeName === 'N/A' ? '' : item.judgeName);
    setItemNumber(item.itemNumber === 'N/A' ? '' : item.itemNumber);
    setHearingDate(item.hearingDate);
    setSelectedEventType(item.eventType || 'Hearing');
  };

  const handleWhatsAppShare = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = `⚖️ *Court Hearing & Compliance Update*\n\n*Case:* ${item.caseTitle}\n*Type:* ${item.eventType || 'Hearing'}\n*Date:* ${item.hearingDate}\n*Item No:* ${item.itemNumber}\n*Forum:* ${item.judgeName}\n\nPlease make a note of this schedule.\n\n*Sent via LawWise*`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
      }
    }).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    });
  };

  const handleSaveOrUpdateHearing = async () => {
    if (!caseTitle.trim() || !hearingDate.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the Case Title and Target Date.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const hearingDateTime = parseDateInput(hearingDate);
      if (isNaN(hearingDateTime.getTime())) {
        Alert.alert('Invalid Date', 'Please enter a valid date format (e.g., DD-MM-YYYY).');
        setLoading(false);
        return;
      }

      const matterId = editingMatterId ? editingMatterId : Date.now().toString();

      if (Platform.OS !== 'web') {
        try {
          if (editingMatterId) {
            await Notifications.cancelScheduledNotificationAsync(`reminder_${editingMatterId}`);
          }

          const timeUntilHearingMs = hearingDateTime.getTime() - Date.now();

          if (timeUntilHearingMs > 0) {
            let reminderTime: Date;
            let subTitle = `Due: ${hearingDate}`;

            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
            const TWO_HOURS = 2 * 60 * 60 * 1000;

            if (timeUntilHearingMs > TWENTY_FOUR_HOURS) {
              reminderTime = new Date(hearingDateTime.getTime() - TWENTY_FOUR_HOURS);
              subTitle = `Reminder: Hearing is tomorrow (${hearingDate})`;
            } 
            else if (timeUntilHearingMs > TWO_HOURS) {
              reminderTime = new Date(hearingDateTime.getTime() - TWO_HOURS);
              const hoursLeft = Math.round(timeUntilHearingMs / (1000 * 60 * 60));
              subTitle = `🚨 URGENT: Hearing is in ~${hoursLeft} hour(s)!`;
            } 
            else {
              reminderTime = new Date(Date.now() + 5000);
              const minutesLeft = Math.max(1, Math.round(timeUntilHearingMs / (1000 * 60)));
              subTitle = `🚨 CRITICAL: Hearing starting in ~${minutesLeft} minute(s)!`;
            }

            if (reminderTime.getTime() <= Date.now()) {
              reminderTime = new Date(Date.now() + 5000);
            }

            await Notifications.scheduleNotificationAsync({
              identifier: `reminder_${matterId}`,
              content: {
                title: `⚖️ URGENT: ${selectedEventType}`,
                body: `Case: ${caseTitle} ${itemNumber ? `(Item No. ${itemNumber})` : ''} — ${subTitle}`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: { caseTitle, hearingDate, matterId },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderTime,
                channelId: 'court-alerts-v2',
              },
            });
          }
        } catch (notifError) {
          console.log('Notification trigger error:', notifError);
        }
      }

      const matterData = {
        id: matterId,
        judgeName: judgeName.trim() || 'N/A',
        caseTitle: caseTitle.trim(),
        itemNumber: itemNumber.trim() || 'N/A',
        hearingDate: hearingDate.trim(),
        eventType: selectedEventType,
        status: 'Pending Call',
      };

      setMatters((prevMatters) => {
        let updatedMatters;
        if (editingMatterId) {
          updatedMatters = prevMatters.map(m => m.id === editingMatterId ? matterData : m);
        } else {
          updatedMatters = [matterData, ...prevMatters];
        }
        saveMattersToStorage(updatedMatters);
        return updatedMatters;
      });

      setJudgeName('');
      setCaseTitle('');
      setItemNumber('');
      setHearingDate('');
      setSelectedEventType('Hearing');
      setEditingMatterId(null);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', editingMatterId ? 'Deadline updated successfully!' : `${selectedEventType} deadline tracked and urgent reminder activated!`);
    } catch (error) {
      console.error('Error saving matter:', error);
      Alert.alert('Error', 'Could not save compliance entry.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatter = async (id: string, title: string) => {
    Alert.alert(
      'Remove Deadline',
      `Are you sure you want to remove "${title}" from your active cause list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              if (Platform.OS !== 'web') {
                await Notifications.cancelScheduledNotificationAsync(`reminder_${id}`);
              }
              setMatters((prevMatters) => {
                const filtered = prevMatters.filter(m => m.id !== id);
                saveMattersToStorage(filtered);
                return filtered;
              });
              if (editingMatterId === id) {
                setEditingMatterId(null);
                setCaseTitle('');
                setJudgeName('');
                setItemNumber('');
                setHearingDate('');
              }
            } catch (e) {
              console.log('Error deleting matter:', e);
            }
          },
        },
      ]
    );
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
      <Card style={[styles.formCard, { backgroundColor: colors.card, borderColor: editingMatterId ? '#C9A84C' : colors.border }]}>
        <View style={styles.formHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>
            {editingMatterId ? 'EDIT TRACKED DEADLINE' : 'TRACK FILING DEADLINE & HEARING'}
          </Text>
          <Pressable 
            style={styles.portfolioPickBtn} 
            onPress={() => {
              loadPortfolioCases();
              setShowCasePickerModal(true);
            }}
          >
            <Feather name="folder" size={13} color="#C9A84C" />
            <Text style={styles.portfolioPickBtnText}>Select from Cases</Text>
          </Pressable>
        </View>
        
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

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {editingMatterId && (
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setEditingMatterId(null);
                setCaseTitle('');
                setJudgeName('');
                setItemNumber('');
                setHearingDate('');
                setSelectedEventType('Hearing');
              }}
              style={{ flex: 1, marginTop: 4, marginVertical: 0 }}
            />
          )}
          <Button
            title={loading ? "Saving..." : editingMatterId ? "Update Deadline" : "Save Deadline & Set Reminder"}
            variant="primary"
            onPress={handleSaveOrUpdateHearing}
            style={[loading && { opacity: 0.5 }, { flex: editingMatterId ? 2 : 1, marginTop: 4, marginVertical: 0, backgroundColor: '#C9A84C' }]}
          />
        </View>
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
          
          let urgencyColor = '#10B981'; 
          let urgencyLabel = `${daysLeft} days left`;

          if (daysLeft < 0) {
            urgencyColor = '#EF4444';
            urgencyLabel = 'Overdue / Expired';
          } else if (daysLeft === 0) {
            urgencyColor = '#EF4444';
            urgencyLabel = '⚠️ Due Today!';
          } else if (daysLeft <= 7) {
            urgencyColor = '#EF4444';
            urgencyLabel = `⚠ ${daysLeft} days left (Critical)`;
          } else if (daysLeft <= 14) {
            urgencyColor = '#FB8C00';
            urgencyLabel = `⚡ ${daysLeft} days left`;
          }

          return (
            <Card key={item.id} style={[styles.trackedCard, { backgroundColor: colors.card, borderColor: editingMatterId === item.id ? '#C9A84C' : colors.border }]}>
              <View style={styles.cardRow}>
                <View style={[styles.badge, { backgroundColor: `${typeColor}20`, borderColor: `${typeColor}40` }]}>
                  <Text style={[styles.badgeText, { color: typeColor }]}>{item.eventType || 'Hearing'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.urgencyBadge, { backgroundColor: `${urgencyColor}18`, borderColor: `${urgencyColor}40` }]}>
                    <Text style={[styles.urgencyText, { color: urgencyColor }]}>{urgencyLabel}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleWhatsAppShare(item)} style={styles.actionBtn}>
                    <Feather name="share-2" size={14} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEditMatter(item)} style={styles.actionBtn}>
                    <Feather name="edit-2" size={14} color="#C9A84C" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteMatter(item.id, item.caseTitle)} style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Feather name="trash-2" size={14} color="#EF4444" />
                  </TouchableOpacity>
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

      {/* Case Portfolio Picker Modal */}
      <Modal visible={showCasePickerModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCasePickerModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCasePickerModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Case from Portfolio</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {portfolioCases.length === 0 ? (
              <View style={[styles.emptyCard, { borderColor: colors.border, marginTop: 40 }]}>
                <Feather name="folder-minus" size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>No stored cases found</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 4 }]}>Add cases in your Case Portfolio first to quickly pick them here.</Text>
              </View>
            ) : (
              portfolioCases.map((c) => (
                <Pressable 
                  key={c.id} 
                  style={[styles.portfolioCaseItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleSelectCaseFromPortfolio(c)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.portfolioCaseTitle, { color: colors.foreground }]} numberOfLines={1}>{c.title}</Text>
                    {c.caseNumber && <Text style={[styles.portfolioCaseSub, { color: '#C9A84C' }]}>#{c.caseNumber}</Text>}
                    {c.court && <Text style={[styles.portfolioCaseSub, { color: colors.mutedForeground }]}>{c.court}</Text>}
                    {c.hearingDate && <Text style={[styles.portfolioCaseSub, { color: colors.mutedForeground }]}>Hearing: {c.hearingDate}</Text>}
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeaderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C', letterSpacing: 1.2 },
  portfolioPickBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#C9A84C18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#C9A84C40' },
  portfolioPickBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C' },
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
  actionBtn: { padding: 6, backgroundColor: 'rgba(201, 168, 76, 0.15)', borderRadius: 6 },
  caseTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  modalCancel: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  modalContent: { padding: 20, gap: 10, paddingBottom: 60 },
  portfolioCaseItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1 },
  portfolioCaseTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 2 },
  portfolioCaseSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
});
