import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import * as Clipboard from 'expo-clipboard';

import Card from '../../components/Card';
import Button from '../../components/Button';
import { exportToChamberPDF } from '@/services/pdfExport';

const FREE_LIMIT_KEY = '@lawvise_factmatcher_free_count';
const MAX_FREE_USES = 7;

export default function FactMatcherScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { jurisdiction, language, saveDocument } = useApp();

  const [facts, setFacts] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const [freeUsesLeft, setFreeUsesLeft] = useState(MAX_FREE_USES);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    checkFreeUsage();
    checkProStatus();
  }, []);

  // -----------------------------------------
  // FREE USAGE
  // -----------------------------------------

  const checkFreeUsage = async () => {
    try {
      const val = await AsyncStorage.getItem(FREE_LIMIT_KEY);
      const usedCount = val ? parseInt(val, 10) || 0 : 0;

      setFreeUsesLeft(
        Math.max(0, MAX_FREE_USES - usedCount)
      );
    } catch {
      setFreeUsesLeft(MAX_FREE_USES);
    }
  };

  // -----------------------------------------
  // PRO STATUS
  // -----------------------------------------

  const checkProStatus = async () => {
    try {
      const isConfigured = await Purchases.isConfigured();

      if (isConfigured) {
        const customerInfo = await Purchases.getCustomerInfo();

        setIsPro(
          !!customerInfo?.entitlements?.active?.['pro']
        );
      }
    } catch {
      setIsPro(false);
    }
  };

  // -----------------------------------------
  // MATCH SCORE
  // -----------------------------------------

  const getMatchScore = (item: any) => {
    return item.matchScore ?? item.relevance ?? 'Not provided';
  };

  // -----------------------------------------
  // FACT MATCHER
  // -----------------------------------------

  const handleMatchCases = async () => {
    if (!facts.trim()) {
      Alert.alert(
        'Empty Facts',
        'Please enter case facts to match precedents.'
      );
      return;
    }

    if (loading) return;

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Medium
    );

    if (freeUsesLeft <= 0 && !isPro) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error(
          'Authentication expired. Please sign in again.'
        );
      }

      const domain =
        process.env.EXPO_PUBLIC_DOMAIN ||
        'law-wise-insight.onrender.com';

      const response = await fetch(
        `https://${domain}/api/lawvise/match`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            facts: facts.trim(),
            jurisdiction,
            language,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
          `Backend request failed (${response.status}).`
        );
      }

      const matches = Array.isArray(data)
        ? data
        : Array.isArray(data?.matches)
          ? data.matches
          : [];

      if (matches.length === 0) {
        setResults([]);

        Alert.alert(
          'No Matches Found',
          'The server did not return any matching precedents. Please revise your facts and try again.'
        );

        return;
      }

      setResults(matches);

      // Deduct a free credit only after successful results.
      if (!isPro) {
        try {
          const val = await AsyncStorage.getItem(FREE_LIMIT_KEY);

          const usedCount = val
            ? parseInt(val, 10) || 0
            : 0;

          const newCount = usedCount + 1;

          await AsyncStorage.setItem(
            FREE_LIMIT_KEY,
            newCount.toString()
          );

          setFreeUsesLeft(
            Math.max(0, MAX_FREE_USES - newCount)
          );
        } catch {
          Alert.alert(
            'Usage Notice',
            'Results were received, but your trial usage could not be saved on this device.'
          );
        }
      }

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

    } catch (error: any) {
      setResults([]);

      Alert.alert(
        'Fact Matcher Error',
        error?.message ||
        'Unable to match precedents. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------
  // COPY PRECEDENT
  // -----------------------------------------

  const handleCopy = async (item: any) => {
    await Clipboard.setStringAsync(
      `Case: ${item.title}\n` +
      `Citation: ${item.citation}\n` +
      `Principle: ${item.principle}`
    );

    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    Alert.alert(
      'Copied',
      'Precedent copied to clipboard.'
    );
  };

  // -----------------------------------------
  // SAVE TO VAULT
  // -----------------------------------------

  const handleSaveToVault = async (item: any) => {
    try {
      await saveDocument({
        title: item.title,
        documentType: 'Precedent Match',
        content:
          `Citation: ${item.citation}\n` +
          `Match Score: ${getMatchScore(item)}\n\n` +
          `Principle:\n${item.principle}\n\n` +
          `Facts Analyzed:\n${facts}`,
        analysisType: 'Fact Matcher',
        matterId: null,
      });

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      Alert.alert(
        'Saved',
        'Precedent saved to your Vault successfully.'
      );
    } catch {
      Alert.alert(
        'Error',
        'Failed to save to vault.'
      );
    }
  };

  // -----------------------------------------
  // EXPORT PDF
  // -----------------------------------------

  const handleExportPDF = async () => {
    if (results.length === 0) {
      Alert.alert(
        'No Results',
        'No precedents available to export.'
      );
      return;
    }

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Medium
    );

    const sections = [
      {
        heading: 'Analyzed Fact Scenario',
        content: facts,
      },

      ...results.map((item, index) => ({
        heading:
          `Precedent [${index + 1}] — ` +
          `${item.citation} (${getMatchScore(item)})`,

        content:
          `Title: ${item.title}\n\n` +
          `Legal Principle & Holding:\n${item.principle}`,
      })),
    ];

    await exportToChamberPDF({
      title: 'LawVise - Precedent Match Report',

      subtitle:
        `Jurisdiction: ${jurisdiction.toUpperCase()} | ` +
        `Total Matches: ${results.length}`,

      sections,

      footerNote:
        'LawVise Fact Matcher & Precedent Finder • Chamber-Grade Legal Report',
    });
  };

  // -----------------------------------------
  // PRO UPGRADE
  // -----------------------------------------

  const handleUpgrade = async () => {
    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    );

    try {
      const isConfigured = await Purchases.isConfigured();

      if (!isConfigured) {
        Alert.alert(
          'Billing Unavailable',
          'Purchases are not configured yet. Please try again later.'
        );
        return;
      }

      const offerings = await Purchases.getOfferings();

      const monthlyPackage = offerings.current?.monthly;

      if (!monthlyPackage) {
        Alert.alert(
          'Plan Unavailable',
          'The monthly Pro package is not currently available.'
        );
        return;
      }

      const { customerInfo } =
        await Purchases.purchasePackage(monthlyPackage);

      if (customerInfo.entitlements.active['pro']) {
        setIsPro(true);
        setShowPaywall(false);

        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        Alert.alert(
          'Success',
          'Welcome to LawVise Pro!'
        );
      } else {
        Alert.alert(
          'Purchase Not Confirmed',
          'The Pro entitlement was not activated. Please contact support if payment was deducted.'
        );
      }

    } catch (error: any) {
      if (error?.userCancelled) {
        return;
      }

      Alert.alert(
        'Purchase Failed',
        error?.message ||
        'Your purchase could not be completed. Please try again.'
      );
    }
  };

  // -----------------------------------------
  // SCREEN SPACING
  // -----------------------------------------

  const padTop =
    insets.top + (Platform.OS === 'web' ? 40 : 16);

  // -----------------------------------------
  // PAYWALL
  // -----------------------------------------

  if (showPaywall) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContainer,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Feather
          name="shield"
          size={48}
          color="#C9A84C"
          style={{ marginBottom: 16 }}
        />

        <Text style={styles.paywallTitle}>
          Unlock Unlimited Fact Matching
        </Text>

        <Text style={styles.paywallSubtitle}>
          You have used your {MAX_FREE_USES} free fact matcher
          credits. Upgrade to Pro for unlimited AI legal
          precedent analysis.
        </Text>

        <View
          style={[
            styles.priceCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={styles.priceText}>
            ₹299
            <Text
              style={{
                fontSize: 14,
                color: colors.mutedForeground,
              }}
            >
              {' '}/ month
            </Text>
          </Text>

          <View style={styles.featureBullet}>
            <Feather
              name="check"
              size={16}
              color="#C9A84C"
            />
            <Text
              style={[
                styles.featureText,
                { color: colors.foreground },
              ]}
            >
              Unlimited Fact Matcher & Precedent Finder
            </Text>
          </View>

          <View style={styles.featureBullet}>
            <Feather
              name="check"
              size={16}
              color="#C9A84C"
            />
            <Text
              style={[
                styles.featureText,
                { color: colors.foreground },
              ]}
            >
              Unlimited AI Drafting & Legal Research
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.upgradeBtn}
          onPress={handleUpgrade}
        >
          <Text style={styles.upgradeBtnText}>
            Upgrade to Pro (₹299/mo)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowPaywall(false)}
          style={{ marginTop: 16, padding: 8 }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: 'Inter_400Regular',
            }}
          >
            Back to fact matcher
          </Text>
        </Pressable>
      </View>
    );
  }

  // -----------------------------------------
  // MAIN SCREEN
  // -----------------------------------------

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        contentContainerStyle={{
          paddingTop: padTop,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Feather
              name="git-merge"
              size={22}
              color="#C9A84C"
            />

            <Text style={styles.screenTitle}>
              Fact Matcher & Precedents
            </Text>
          </View>

          <Text
            style={[
              styles.screenSub,
              { color: colors.mutedForeground },
            ]}
          >
            Input case scenarios to instantly discover matching
            case laws and legal principles under{' '}
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                color: '#C9A84C',
              }}
            >
              {jurisdiction}
            </Text>
            {' '}law. ({freeUsesLeft} free trial uses remaining)
          </Text>
        </View>

        {/* FACT INPUT */}

        <Card
          style={[
            styles.formCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={styles.sectionHeaderLabel}>
            CASE SCENARIO / FACTS ({jurisdiction})
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder={
              `Enter facts for ${jurisdiction} jurisdiction analysis...`
            }
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={facts}
            onChangeText={setFacts}
          />

          <Button
            title={
              loading
                ? 'Analyzing Precedents...'
                : freeUsesLeft > 0
                  ? `Find Matching Precedents (${freeUsesLeft} free left)`
                  : 'Find Matching Precedents (Upgrade Required)'
            }
            variant="primary"
            onPress={handleMatchCases}
            style={[
              loading && { opacity: 0.5 },
              {
                marginVertical: 0,
                backgroundColor: '#C9A84C',
              },
            ]}
          />
        </Card>

        {/* RESULTS HEADER */}

        <View style={styles.resultsHeaderRow}>
          <Text
            style={[
              styles.resultsHeader,
              { color: colors.foreground },
            ]}
          >
            Matched Precedents
          </Text>

          {results.length > 0 && (
            <Pressable
              style={styles.pdfExportBtn}
              onPress={handleExportPDF}
            >
              <Feather
                name="download"
                size={14}
                color="#C9A84C"
              />

              <Text style={styles.pdfExportText}>
                Export PDF
              </Text>
            </Pressable>
          )}
        </View>

        {/* LOADING */}

        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator
              size="large"
              color="#C9A84C"
            />

            <Text
              style={[
                styles.loaderText,
                { color: colors.mutedForeground },
              ]}
            >
              Searching {jurisdiction} Supreme Court &
              appellate databases...
            </Text>
          </View>
        )}

        {/* EMPTY RESULTS */}

        {!loading && results.length === 0 ? (
          <Card
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather
              name="search"
              size={24}
              color={colors.mutedForeground}
              style={{ marginBottom: 8 }}
            />

            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground },
              ]}
            >
              No precedents matched yet. Enter case facts above
              to run the search analysis.
            </Text>
          </Card>
        ) : (
          results.map((item, index) => (
            <Card
              key={item.id ?? item.citation ?? index}
              style={[
                styles.resultCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.citation || 'Citation not provided'}
                  </Text>
                </View>

                <Text style={styles.matchScore}>
                  {getMatchScore(item)}
                </Text>
              </View>

              <Text
                style={[
                  styles.caseTitle,
                  { color: colors.foreground },
                ]}
              >
                {item.title || 'Untitled Precedent'}
              </Text>

              <Text
                style={[
                  styles.principleText,
                  { color: colors.mutedForeground },
                ]}
              >
                {item.principle || 'No legal principle provided.'}
              </Text>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => handleCopy(item)}
                >
                  <Feather
                    name="copy"
                    size={14}
                    color="#C9A84C"
                  />

                  <Text style={styles.actionBtnText}>
                    Copy
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.actionBtn}
                  onPress={() => handleSaveToVault(item)}
                >
                  <Feather
                    name="bookmark"
                    size={14}
                    color="#C9A84C"
                  />

                  <Text style={styles.actionBtnText}>
                    Save to Vault
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// -----------------------------------------
// STYLES
// -----------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  headerContainer: {
    marginBottom: 20,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  screenTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },

  screenSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },

  formCard: {
    marginVertical: 0,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },

  sectionHeaderLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#C9A84C',
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 130,
    marginBottom: 16,
  },

  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  resultsHeader: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },

  pdfExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C9A84C20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9A84C40',
  },

  pdfExportText: {
    color: '#C9A84C',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },

  loaderText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },

  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },

  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  resultCard: {
    marginVertical: 0,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },

  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  badge: {
    backgroundColor: '#C9A84C20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C9A84C40',
  },

  badgeText: {
    color: '#C9A84C',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  matchScore: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'Inter_700Bold',
  },

  caseTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    marginBottom: 6,
  },

  principleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 168, 76, 0.15)',
    paddingTop: 12,
    marginTop: 4,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C9A84C15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },

  actionBtnText: {
    color: '#C9A84C',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  paywallTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },

  paywallSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  priceCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },

  priceText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#C9A84C',
    marginBottom: 16,
    textAlign: 'center',
  },

  featureBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  featureText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },

  upgradeBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  upgradeBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#070D24',
  },
});
