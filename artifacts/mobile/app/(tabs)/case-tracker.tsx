import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, FlatList } from 'react-native';

export default function CauseListScreen() {
  const [judgeName, setJudgeName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [itemNo, setItemNo] = useState('');
  
  // Initial sample cause list items
  const [causeList, setCauseList] = useState([
    { id: '1', judge: 'Hon. Justice R.K. Agrawal', case: 'Civil Suit 402/2024', item: 'Item No. 14', status: 'First Board' },
    { id: '2', judge: 'Hon. Justice S. Mukherjee', case: 'Criminal Writ 89/2025', item: 'Item No. 5', status: 'After Notice' },
  ]);

  const addHearing = () => {
    if (!judgeName || !caseNumber || !itemNo) return;
    
    const newItem = {
      id: Date.now().toString(),
      judge: judgeName,
      case: caseNumber,
      item: `Item No. ${itemNo}`,
      status: 'Pending Call',
    };

    setCauseList([newItem, ...causeList]);
    setJudgeName('');
    setCaseNumber('');
    setItemNo('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Cause List & Judge Tracker</Text>
      <Text style={styles.subTitle}>Organize your daily cause lists judge-wise and keep track of your item numbers.</Text>

      {/* Quick Add Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Add New Hearing</Text>
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
          value={caseNumber}
          onChangeText={setCaseNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="Item Number (e.g., 24)"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={itemNo}
          onChangeText={setItemNo}
        />
        <TouchableOpacity style={styles.addButton} onPress={addHearing}>
          <Text style={styles.addButtonText}>Add to Daily Cause List</Text>
        </TouchableOpacity>
      </View>

      {/* Cause List Feed */}
      <Text style={styles.sectionHeader}>Today's Tracked Matters ({causeList.length})</Text>
      {causeList.map((item) => (
        <View key={item.id} style={styles.listItem}>
          <View style={styles.itemHeaderRow}>
            <Text style={styles.itemBadge}>{item.item}</Text>
            <Text style={styles.statusBadge}>{item.status}</Text>
          </View>
          <Text style={styles.caseNumText}>{item.case}</Text>
          <Text style={styles.judgeText}>{item.judge}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 10 },
  subTitle: { fontSize: 14, color: '#666', marginBottom: 20, marginTop: 5 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    marginBottom: 25,
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  input: {
    backgroundColor: '#fdfdfd',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#0052cc',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    borderLeftWidth: 4,
    borderLeftColor: '#0052cc',
  },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemBadge: { backgroundColor: '#eef2ff', color: '#0052cc', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#fef3c7', color: '#92400e', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  caseNumText: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  judgeText: { fontSize: 13, color: '#555' },
});
