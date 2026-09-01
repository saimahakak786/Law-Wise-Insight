import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

export default function FactMatcherScreen() {
  const [facts, setFacts] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleMatchCases = () => {
    if (!facts.trim()) return;
    
    setLoading(true);
    setResults([]);

    setTimeout(() => {
      setResults([
        {
          id: '1',
          citation: '2023 SC 452',
          title: 'State of Maharashtra v. Anant Rao',
          principle: 'On the question of contractual breach and burden of proof, the primary onus remains on the plaintiff until a prima facie case is established.',
          relevance: '95% Match'
        },
        {
          id: '2',
          citation: '2021 (4) SCC 112',
          title: 'K.P. Sharma v. Corporation Bank',
          principle: 'Arbitration clauses do not bar consumer forum jurisdiction unless explicit waiver is demonstrated by conduct.',
          relevance: '82% Match'
        }
      ]);
      setLoading(false);
    }, 1200);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Fact-to-Case Matcher</Text>
      <Text style={styles.subTitle}>Paste case facts to discover matching precedents and legal principles.</Text>

      <TextInput
        style={styles.textInput}
        multiline
        placeholder="Enter case facts here..."
        placeholderTextColor="#888"
        value={facts}
        onChangeText={setFacts}
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleMatchCases}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Match Precedents</Text>
        )}
      </TouchableOpacity>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>Matched Precedents ({results.length})</Text>
          {results.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.relevance}</Text>
              </View>
              <Text style={styles.caseTitle}>{item.title}</Text>
              <Text style={styles.citation}>{item.citation}</Text>
              <Text style={styles.principleLabel}>Core Principle:</Text>
              <Text style={styles.principleText}>{item.principle}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 10 },
  subTitle: { fontSize: 14, color: '#666', marginBottom: 20, marginTop: 5 },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    height: 140,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#0052cc',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonDisabled: { backgroundColor: '#7097d1' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultsContainer: { marginTop: 25, marginBottom: 40 },
  resultsHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    elevation: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeText: { color: '#137333', fontSize: 12, fontWeight: 'bold' },
  caseTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  citation: { fontSize: 14, color: '#0052cc', fontWeight: '600', marginBottom: 8 },
  principleLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', marginTop: 4 },
  principleText: { fontSize: 14, color: '#444', marginTop: 2, lineHeight: 20 },
});
