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
  Linking,
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

  const [expandedJudgments, setExpandedJudgments] =
    useState<string[]>([]);

  const [freeUsesLeft, setFreeUsesLeft] =
    useState(MAX_FREE_USES);

  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [serverMessage, setServerMessage] = useState('');

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
    const score = item.matchScore;

    if (
      score === null ||
      score === undefined ||
      !Number.isFinite(Number(score))
    ) {
      return 'Not provided';
    }

    return `${Number(score)}%`;
  };

  // -----------------------------------------
  // JUDGMENT EXPANSION
  // -----------------------------------------

  const getResultKey = (item: any, index: number) =>
    String(
      item.sourceRecordId ??
      item.citation ??
      index
    );

  const toggleJudgment = (item: any, index: number) => {
    const key = getResultKey(item, index);

    setExpandedJudgments((previous) =>
      previous.includes(key)
        ? previous.filter((value) => value !== key)
        : [...previous, key]
    );
  };

  // -----------------------------------------
  // OPEN ORIGINAL SOURCE
  // -----------------------------------------

  const openOriginalSource = async (url: string) => {
    if (!url) {
      Alert.alert(
        'Source Unavailable',
        'The original case URL was not provided.'
      );
      return;
    }

    try {
      const validUrl = new URL(url);

      if (
        validUrl.protocol !== 'https:' ||
        validUrl.hostname !== 'www.courtlistener.com' &&
        validUrl.hostname !== 'courtlistener.com'
      ) {
        throw new Error('Invalid case source URL.');
      }

      await Linking.openURL(validUrl.toString());
    } catch {
      Alert.alert(
        'Unable to Open Source',
        'The original case link could not be opened.'
      );
    }
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
    setServerMessage('');
    setExpandedJudgments([]);

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

      if (data?.message) {
        setServerMessage(data.message);
      }

      const matches = Array.isArray(data)
        ? data
        : Array.isArray(data?.matches)
          ? data.matches
          : [];

      if (data?.automatedSearchAvailable === false) {
        setResults([]);

        Alert.alert(
          'Automated Search Unavailable',
          data.message ||
          `Automated judgment retrieval is not connected for ${jurisdiction}.`
        );

        return;
      }

      if (matches.length === 0) {
        setResults([]);

        Alert.alert(
          'No Matches Found',
          data.message ||
          'No matching judgment texts were returned. Please revise your facts and try again.'
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
      `Case: ${item.title || ''}\n` +
      `Citation: ${item.citation || ''}\n` +
      `Court: ${item.court || ''}\n` +
      `Decision Date: ${item.date || ''}\n` +
      `AI Estimated Match: ${getMatchScore(item)}\n\n` +
      `Legal Principle:\n${item.principle || ''}`
    );

    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    Alert.alert(
      'Copied',
      'Precedent details copied to clipboard.'
    );
  };

  // -----------------------------------------
  // SAVE TO VAULT
  // -----------------------------------------

  const handleSaveToVault = async (item: any) => {
    try {
      await saveDocument({
        title: item.title || 'Untitled Precedent',

        documentType: 'Precedent Match',

        content:
          `Case: ${item.title || ''}\n` +
          `Citation: ${item.citation || ''}\n` +
          `Court: ${item.court || ''}\n` +
          `Decision Date: ${item.date || ''}\n` +
          `Original Source: ${item.caseUrl || ''}\n` +
          `Source Record ID: ${item.sourceRecordId || ''}\n` +
          `AI Estimated Match: ${getMatchScore(item)}\n\n` +
          `Legal Principle:\n${item.principle || ''}\n\n` +
          `Judgment Text:\n${item.judgmentText || 'Not retrieved'}\n\n` +
          `Facts Analyzed:\n${facts}`,

        analysisType: 'Fact Matcher',

        matterId: null,
      });

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      Alert.alert(
        'Saved',
        'Precedent and retrieved judgment text saved to your Vault.'
      );
    } catch {
      Alert.alert(
        'Error',
        'Failed to save to Vault.'
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
          `${item.citation || 'Citation unavailable'}`,

        content:
          `Title: ${item.title || ''}\n` +
          `Court: ${item.court || ''}\n` +
          `Decision Date: ${item.date || ''}\n` +
          `AI Estimated Match: ${getMatchScore(item)}\n` +
          `Original Source: ${item.caseUrl || ''}\n\n` +
          `Legal Principle & Factual Relevance:\n` +
          `${item.principle || ''}\n\n` +
          `Judgment Retrieval Status:\n` +
          `${item.judgmentTextStatus || 'Not specified'}\n\n` +
          `Judgment text is available separately in LawVise.`,
      })),
    ];

    await exportToChamberPDF({
      title: 'LawVise - Precedent Match Report',

      subtitle:
        `Jurisdiction: ${jurisdiction.toUpperCase()} | ` +
        `Total Matches: ${results.length}`,

      sections,

      footerNote:
        'LawVise Fact Matcher • AI match scores are estimates. Verify original judgments and subsequent treatment before relying on them.',
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
            Compare case facts with retrieved judgments and
            identify potentially relevant precedents under{' '}
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
                : freeUsesLeft > 0 || isPro
                  ? `Find Matching Precedents (${isPro ? 'Pro' : `${freeUsesLeft} free left`})`
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

        {/* SERVER MESSAGE */}

        {!!serverMessage && results.length > 0 && (
          <View style={styles.infoBox}>
            <Feather
              name="info"
              size={16}
              color="#C9A84C"
            />

            <Text style={styles.infoText}>
              {serverMessage}
            </Text>
          </View>
        )}

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
              Retrieving case records and judgment texts...
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
              to search available judgment records.
            </Text>
          </Card>
        ) : (
          results.map((item, index) => {
            const resultKey = getResultKey(item, index);

            const isExpanded =
              expandedJudgments.includes(resultKey);

            const hasJudgment =
              typeof item.judgmentText === 'string' &&
              item.judgmentText.trim().length > 0;

            return (
              <Card
                key={resultKey}
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* CITATION AND SCORE */}

                <View style={styles.cardRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.citation || 'Citation unavailable'}
                    </Text>
                  </View>

                  <View style={styles.scoreContainer}>
                    <Text style={styles.matchScore}>
                      {getMatchScore(item)}
                    </Text>

                    <Text style={styles.scoreCaption}>
                      AI ESTIMATE
                    </Text>
                  </View>
                </View>

                {/* CASE NAME */}

                <Text
                  style={[
                    styles.caseTitle,
                    { color: colors.foreground },
                  ]}
                >
                  {item.title || 'Untitled Precedent'}
                </Text>

                {/* CASE METADATA */}

                <View style={styles.metadataBox}>
                  <Text style={styles.metadataText}>
                    Court: {item.court || 'Not provided'}
                  </Text>

                  <Text style={styles.metadataText}>
                    Decision Date: {item.date || 'Not provided'}
                  </Text>

                  {!!item.docketNumber && (
                    <Text style={styles.metadataText}>
                      Docket Number: {item.docketNumber}
                    </Text>
                  )}

                  {!!item.sourceRecordId && (
                    <Text style={styles.metadataText}>
                      CourtListener Record ID: {item.sourceRecordId}
                    </Text>
                  )}
                </View>

                {/* LEGAL PRINCIPLE */}

                <Text style={styles.sectionTitle}>
                  Legal Principle & Factual Relevance
                </Text>

                <Text
                  style={[
                    styles.principleText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {item.principle ||
                    'No legal principle was returned.'}
                </Text>

                {/* JUDGMENT STATUS */}

                <View style={styles.judgmentStatus}>
                  <Feather
                    name={
                      hasJudgment
                        ? 'check-circle'
                        : 'alert-circle'
                    }
                    size={15}
                    color={
                      hasJudgment
                        ? '#16A34A'
                        : '#D97706'
                    }
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: hasJudgment
                          ? '#16A34A'
                          : '#D97706',
                      },
                    ]}
                  >
                    {hasJudgment
                      ? 'Judgment text retrieved'
                      : 'Full judgment text unavailable'}
                  </Text>
                </View>

                {/* FULL JUDGMENT */}

                {hasJudgment && (
                  <View style={styles.judgmentContainer}>
                    <Pressable
                      style={styles.judgmentToggle}
                      onPress={() =>
                        toggleJudgment(item, index)
                      }
                    >
                      <Feather
                        name="book-open"
                        size={16}
                        color="#C9A84C"
                      />

                      <Text style={styles.judgmentToggleText}>
                        {isExpanded
                          ? 'Hide Full Judgment'
                          : 'Read Full Judgment'}
                      </Text>

                      <Feather
                        name={
                          isExpanded
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={17}
                        color="#C9A84C"
                      />
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.judgmentTextBox}>
                        <Text style={styles.judgmentText}>
                          {item.judgmentText}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* SOURCE LINK */}

                <Pressable
                  style={styles.sourceButton}
                  onPress={() =>
                    openOriginalSource(item.caseUrl)
                  }
                >
                  <Feather
                    name="external-link"
                    size={15}
                    color="#C9A84C"
                  />

                  <Text style={styles.sourceButtonText}>
                    Open Original CourtListener Case
                  </Text>
                </Pressable>

                {/* ACTION BUTTONS */}

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

                {/* DISCLAIMER */}

                <Text style={styles.disclaimer}>
                  AI-generated relevance assessment. Verify the
                  original judgment, applicable law and subsequent
                  judicial treatment before relying on this result.
                </Text>
              </Card>
            );
          })
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
    lineHeight: 19,
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

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#C9A84C15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },

  infoText: {
    flex: 1,
    color: '#C9A84C',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },

  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },

  loaderText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
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
    marginBottom: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },

  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },

  badge: {
    flexShrink: 1,
    backgroundColor: '#C9A84C20',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C9A84C40',
  },

  badgeText: {
    color: '#C9A84C',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  scoreContainer: {
    alignItems: 'flex-end',
  },

  matchScore: {
    fontSize: 16,
    color: '#C9A84C',
    fontFamily: 'Inter_700Bold',
  },

  scoreCaption: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.7,
  },

  caseTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },

  metadataBox: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 8,
    padding: 11,
    gap: 6,
    marginBottom: 14,
  },

  metadataText: {
    color: '#94A3B8',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },

  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    color: '#C9A84C',
    fontSize: 13,
    marginBottom: 7,
  },

  principleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 12,
  },

  judgmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },

  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },

  judgmentContainer: {
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.35)',
    borderRadius: 9,
    overflow: 'hidden',
    marginBottom: 12,
  },

  judgmentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#C9A84C12',
    gap: 8,
  },

  judgmentToggleText: {
    flex: 1,
    color: '#C9A84C',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  judgmentTextBox: {
    padding: 12,
    maxHeight: 450,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  judgmentText: {
    color: '#CBD5E1',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 19,
  },

  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 6,
  },

  sourceButtonText: {
    color: '#C9A84C',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 6,
  },

  actionBtnText: {
    color: '#C9A84C',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  disclaimer: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 15,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
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
