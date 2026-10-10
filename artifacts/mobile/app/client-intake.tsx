import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://law-wise-insight.onrender.com';

export default function ClientIntakeScreen() {
  const navigation = useNavigation();
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [caseType, setCaseType] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [conflictReport, setConflictReport] = useState('');

  const handleSaveClient = async () => {
    if (!clientName || !phone) {
      Alert.alert('Error', 'Please enter at least Client Name and Phone number.');
      return;
    }

    setLoading(true);
    setConflictReport('');

    try {
      const token = global.authToken || ''; // Or retrieve your auth token securely
      const response = await fetch(`${API_URL}/api/lawvise/intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientName, phone, caseType, notes })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process client intake.');
      }

      setConflictReport(data.report);
      Alert.alert('Success', 'Client intake saved & Conflict Check completed!');
    } catch (err: any) {
      Alert.alert('Conflict Check Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Client Intake & Conflict Check</Text>

      <Text style={styles.label}>Client Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Mrs. Khalida Parveen"
        placeholderTextColor="#888"
        value={clientName}
        onChangeText={setClientName}
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. +91 9876543210"
        placeholderTextColor="#888"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Case Type / Matter</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Guardians and Wards Act"
        placeholderTextColor="#888"
        value={caseType}
        onChangeText={setCaseType}
      />

      <Text style={styles.label}>Intake Notes / Opposing Party Details</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter background facts and conflict details..."
        placeholderTextColor="#888"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={handleSaveClient} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>Save Client & Run Conflict Check</Text>
        )}
      </TouchableOpacity>

      {conflictReport ? (
        <View style={styles.reportContainer}>
          <Text style={styles.reportHeader}>⚖️ AI Conflict & Intake Report</Text>
          <Text style={styles.reportText}>{conflictReport}</Text>
        </View>
      ) : null}

      {navigation && navigation.canGoBack && navigation.canGoBack() && (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20, marginTop: 10 },
  label: { color: '#DAA520', fontSize: 14, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#1E1E1E', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#DAA520', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  reportContainer: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#DAA520', marginBottom: 20 },
  reportHeader: { color: '#DAA520', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  reportText: { color: '#ddd', fontSize: 14, lineHeight: 22 },
  backButton: { padding: 12, alignItems: 'center', marginBottom: 30 },
  backButtonText: { color: '#888', fontSize: 14 },
});
