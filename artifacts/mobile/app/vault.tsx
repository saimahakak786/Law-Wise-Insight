import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, Platform, Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, StoredDocument } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

import UpgradeModal from '@/components/UpgradeModal';

const FREE_VAULT_LIMIT = 5;
const VAULT_STORAGE_KEY = '@lawwise_saved_documents';

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedDocuments, activeMatter } = useApp();

  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<StoredDocument | null>(null);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Paywall state for vault storage limit
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (savedDocuments) {
      setDocuments(savedDocuments);
    }
  }, [savedDocuments]);

  const padTop = insets.top + (Platform.OS === 'web' ? 40 : 16);

  const filteredDocs = documents.filter((doc) => {
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

  const handleDeleteDoc = (id: string, title: string) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete "${title}" from your vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const updated = documents.filter(d => d.id !== id);
            setDocuments(updated);
            if (selectedDoc?.id === id) {
              setSelectedDoc(null);
              setIsEditing(false);
            }
            try {
              await AsyncStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
              console.log('Failed to save documents after deletion', e);
            }
          },
        },
      ]
    );
  };

  const handleStartEdit = (doc: StoredDocument) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      Alert.alert('Missing Fields', 'Title and content cannot be empty.');
      return;
    }
    if (!selectedDoc) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updatedDocs = documents.map(d => {
      if (d.id === selectedDoc.id) {
        return { ...d, title: editTitle.trim(), content: editContent.trim() };
      }
      return d;
    });

    setDocuments(updatedDocs);
    const updatedSelected = { ...selectedDoc, title: editTitle.trim(), content: editContent.trim() };
    setSelectedDoc(updatedSelected);
    setIsEditing(false);

    try {
      await AsyncStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updatedDocs));
    } catch (e) {
      console.log('Failed to save edited document', e);
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

        {/* Free Tier Storage Notice Banner */}
        {!isPro && (
          <Pressable 
            style={[styles.storageBanner, { backgroundColor: colors.card, borderColor: '#C9A84C40' }]}
            onPress={() => {
              if (documents.length >= FREE_VAULT_LIMIT) setShowUpgradeModal(true);
            }}
          >
            <Feather name="shield" size={16} color="#C9A84C" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.storageBannerTitle, { color: colors.foreground }]}>
                Vault Storage: {documents.length} / {FREE_VAULT_LIMIT} Free Slots Used
              </Text>
              <Text style={[styles.storageBannerSub, { color: colors.mutedForeground }]}>
                {documents.length >= FREE_VAULT_LIMIT 
                  ? 'Free limit reached! Tap to upgrade for unlimited vault space.' 
                  : 'Upgrade to Pro for unlimited document archiving.'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#C9A84C" />
          </Pressable>
        )}

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

        {/* Document Detail Viewer or Edit Form or List */}
        {selectedDoc ? (
          <View style={[styles.detailContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.detailHeader}>
              <Pressable 
                onPress={() => {
                  setSelectedDoc(null);
                  setIsEditing(false);
                }} 
                style={styles.backBtn}
              >
                <Feather name="arrow-left" size={16} color="#C9A84C" />
                <Text style={styles.backBtnText}>Back to List</Text>
              </Pressable>
              <Text style={[styles.docTypeBadge, { color: '#C9A84C' }]}>{selectedDoc.documentType.toUpperCase()}</Text>
            </View>

            {isEditing ? (
              <View>
                <Text style={[styles.inputLabel, { color: colors.foreground }]}>Document Title *</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter title..."
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.inputLabel, { color: colors.foreground, marginTop: 12 }]}>Document Content *</Text>
                <TextInput
                  style={[styles.editContentInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  placeholder="Enter content..."
                  placeholderTextColor={colors.mutedForeground}
                />

                <View style={styles.editActionRow}>
                  <Pressable 
                    style={[styles.cancelBtn, { borderColor: colors.border }]} 
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveBtn} onPress={handleSaveEdit}>
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                <Text style={[styles.detailTitle, { color: colors.foreground }]}>{selectedDoc.title}</Text>
                <Text style={[styles.detailDate, { color: colors.mutedForeground }]}>
                  Saved on: {new Date(selectedDoc.createdAt).toLocaleString()}
                </Text>

                <ScrollView style={[styles.contentPreviewBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.contentText, { color: colors.foreground }]}>{selectedDoc.content}</Text>
                </ScrollView>

                <View style={styles.detailActionRow}>
                  <Pressable style={styles.actionBtn} onPress={() => handleStartEdit(selectedDoc)}>
                    <Feather name="edit-2" size={14} color="#C9A84C" />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleCopy(selectedDoc.content)}>
                    <Feather name="copy" size={14} color="#C9A84C" />
                    <Text style={styles.actionBtnText}>Copy</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleShare(selectedDoc)}>
                    <Feather name="share-2" size={14} color="#C9A84C" />
                    <Text style={styles.actionBtnText}>Export</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { borderColor: '#EF4444' }]} onPress={() => handleDeleteDoc(selectedDoc.id, selectedDoc.title)}>
                    <Feather name="trash-2" size={14} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            )}
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
                    
                    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                      <Pressable 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCopy(item.content);
                        }} 
                        style={styles.cardActionBtn}
                      >
                        <Feather name="copy" size={13} color="#C9A84C" />
                      </Pressable>
                      <Pressable 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShare(item);
                        }} 
                        style={styles.cardActionBtn}
                      >
                        <Feather name="share-2" size={13} color="#C9A84C" />
                      </Pressable>
                      <Pressable 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleStartEdit(item);
                        }} 
                        style={styles.cardActionBtn}
                      >
                        <Feather name="edit-2" size={13} color="#C9A84C" />
                      </Pressable>
                      <Pressable 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(item.id, item.title);
                        }} 
                        style={[styles.cardActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                      >
                        <Feather name="trash-2" size={13} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={[styles.docTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  
                  <Text style={[styles.docSnippet, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {item.content}
                  </Text>

                  <Text style={[styles.docDate, { color: colors.mutedForeground, marginTop: 6 }]}>
                    Saved on: {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Upgrade Modal for Vault Limit */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSubscribe={() => {
          setIsPro(true);
          setShowUpgradeModal(false);
          Alert.alert('Unlocked!', 'Your LawWise Pro session is active. Enjoy unlimited Vault storage.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  screenTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF' },
  screenSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  
  storageBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  storageBannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 2 },
  storageBannerSub: { fontFamily: 'Inter_400Regular', fontSize: 11 },

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
  cardActionBtn: { padding: 6, backgroundColor: 'rgba(201, 168, 76, 0.15)', borderRadius: 6 },

  detailContainer: { borderRadius: 12, borderWidth: 1, padding: 16 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C9A84C' },
  docTypeBadge: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 4 },
  detailDate: { fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 16 },
  contentPreviewBox: { borderRadius: 8, borderWidth: 1, padding: 14, maxHeight: 350, marginBottom: 16 },
  contentText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 22 },
  detailActionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#C9A84C' },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C9A84C' },

  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 6 },
  editInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, fontFamily: 'Inter_400Regular' },
  editContentInput: { borderWidth: 1, borderRadius: 10, padding: 12, height: 220, fontSize: 13, fontFamily: 'Inter_400Regular', textAlignVertical: 'top' },
  editActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  saveBtn: { flex: 2, backgroundColor: '#C9A84C', paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#000000' },
});
