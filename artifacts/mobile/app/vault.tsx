import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, FlatList, Platform, Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp, StoredDocument } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedDocuments, activeMatter } = useApp();

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<StoredDocument | null>(null);

  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  // Filter documents by search text or active matter if desired
  const filteredDocs = savedDocuments.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          doc.content.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesSearch;
  });

  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Document content copied to clipboard.');
  };

  const handleShare = async (doc: StoredDocument) => {
    try {
      const filename = FileSystem.cacheDirectory + `${doc.documentType}_export.txt`;
      await FileSystem.writeAsStringAsync(filename, doc.content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filename);
    } catch {
      Alert.alert('Share Failed', 'Could not share the document.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: padTop, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Feather name="archive" size={22} color="#C9A84C" />
            <Text style={styles.screenTitle}>Firm Vault & Records</Text>
          </View>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            Secure repository of all saved research memos, drafts, and client filings.
          </Text>
        </View>

        {/* Active Matter Context Indicator */}
        {activeMatter && (
          <View style={[styles.matterNotice, { backgroundColor: colors.card, borderColor: '#C9A84C' }]}>
            <Feather name="briefcase" size={14} color="#C9A84C" />
            <Text style={[styles.matterNoticeText, { color: colors.foreground }]} numberOfLines={1}>
              Filtered to Active Matter: <Text style={{ fontFamily: 'Inter_700Bold' }}>{activeMatter.title}</Text>
            </Text>
          </View>
        )}

        {/* Search Bar */}
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search vault records..."
            placeholderTextColor={colors.mutedForeground}
            value={searchFilter}
            onChangeText={setSearchFilter}
          />
          {searchFilter ? (
            <Pressable onPress={() => setSearchFilter('')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        {/* Document Detail Viewer or List */}
        {selectedDoc ? (
          <View style={[styles.detailContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.detailHeader}>
              <Pressable 
                onPress={() => setSelectedDoc(null)} 
                style={styles.backBtn}
              >
                <Feather name="arrow-left" size={16} color="#C9A84C" />
                <Text style={styles.backBtnText}>Back to List</Text>
              </Pressable>
              <Text style={[styles.docTypeBadge, { color: '#C9A84C' }]}>{selectedDoc.documentType.toUpperCase()}</Text>
            </View>

            <Text style={[styles.detailTitle, { color: colors.foreground }]}>{selectedDoc.title}</Text>
            <Text style={[styles.detailDate, { color: colors.mutedForeground }]}>
              Saved on: {new Date(selectedDoc.createdAt).toLocaleString()}
            </Text>

            <ScrollView style={[styles.contentPreviewBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.contentText, { color: colors.foreground }]}>{selectedDoc.content}</Text>
            </ScrollView>

            <View style={styles.detailActionRow}>
              <Pressable style={styles.actionBtn} onPress={() => handleCopy(selectedDoc.content)}>
                <Feather name="copy" size={14} color="#C9A84C" />
                <Text style={styles.actionBtnText}>Copy</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleShare(selectedDoc)}>
                <Feather name="share-2" size={14} color="#C9A84C" />
                <Text style={styles.actionBtnText}>Share / Export</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View>
            <Text style={[styles.sectionHeaderLabel, { marginTop: 10, marginBottom: 10 }]}>
              SAVED RECORDS ({filteredDocs.length})
            </Text>

            {filteredDocs.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="folder-minus" size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No vault records found</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Save generated research or contracts from your workspace to see them here.
                </Text>
              </View>
            ) : (
              filteredDocs.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDoc(item);
                  }}
                >
                  <View style={styles.docCardHeader}>
                    <View style={styles.docIconBox}>
                      <Feather 
                        name={item.documentType === 'research' ? 'book-open' : 'file-text'} 
                        size={14} 
                        color="#C9A84C" 
                      />
                    </View>
                    <Text style={[styles.docTypeTag, { color: '#C9A84C' }]}>{item.documentType.toUpperCase()}</Text>
                    <Text style={[styles.docDate, { color: colors.mutedForeground }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <Text style={[styles.docTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  
                  <Text style={[styles.docSnippet, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {item.content}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF' },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  
  matterNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  matterNoticeText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 46, marginBottom: 20 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13 },

  sectionHeaderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C', letterSpacing: 1.2 },

  emptyBox: { borderRadius: 12, borderWidth: 1, padding: 30, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 4 },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center' },

  docCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  docCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  docIconBox: { width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(201, 168, 76, 0.15)', justifyContent: 'center', alignItems: 'center' },
  docTypeTag: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5, flex: 1 },
  docDate: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  docTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 4 },
  docSnippet: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },

  detailContainer: { borderRadius: 12, borderWidth: 1, padding: 16 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C9A84C' },
  docTypeBadge: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 4 },
  detailDate: { fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 16 },
  contentPreviewBox: { borderRadius: 8, borderWidth: 1, padding: 14, maxHeight: 350, marginBottom: 16 },
  contentText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 22 },
  detailActionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#C9A84C' },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C9A84C' },
});
