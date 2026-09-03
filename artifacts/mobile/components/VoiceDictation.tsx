import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface VoiceDictationProps {
  isProUser: boolean; // Pass user subscription status here
  onTranscriptionComplete: (text: string) => void;
  onUpgradePress: () => void; // Triggered when free trial runs out
}

export default function VoiceDictation({ isProUser, onTranscriptionComplete, onUpgradePress }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Track free trial usage (Starts at 1 free trial available)
  const [hasFreeTrial, setHasFreeTrial] = useState(true);

  const handleToggleRecording = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If free user has already used their 1 free trial, trigger paywall immediately
    if (!isProUser && !hasFreeTrial) {
      onUpgradePress();
      return;
    }
    
    if (!isRecording) {
      setIsRecording(true);
    } else {
      setIsRecording(false);
      setIsProcessing(true);

      // Consume the single free trial if not a Pro user
      if (!isProUser) {
        setHasFreeTrial(false);
      }

      setTimeout(() => {
        setIsProcessing(false);
        const transcribedText = " The opposing counsel failed to establish statutory compliance within the mandatory limitation window.";
        onTranscriptionComplete(transcribedText);
      }, 1200);
    }
  };

  return (
    <View style={styles.container}>
      {isProcessing ? (
        <View style={styles.processingRow}>
          <ActivityIndicator color="#C9A84C" size="small" />
          <Text style={styles.processingText}>Transcribing voice note to brief...</Text>
        </View>
      ) : (
        <View style={styles.wrapperRow}>
          <Pressable
            style={[styles.micButton, isRecording && styles.recordingActive]}
            onPress={handleToggleRecording}
          >
            <Feather 
              name={isRecording ? 'square' : 'mic'} 
              size={18} 
              color={isRecording ? '#FFFFFF' : '#070D24'} 
            />
            <Text style={[styles.micText, isRecording && { color: '#FFFFFF' }]}>
              {isRecording 
                ? 'Tap to Stop & Transcribe' 
                : isProUser 
                  ? 'Voice Dictation (Pro)' 
                  : hasFreeTrial 
                    ? 'Voice Dictation (1 Free Trial)' 
                    : 'Voice Dictation (Locked)'}
            </Text>
          </Pressable>

          {!isProUser && (
            <Pressable style={styles.upgradeBadge} onPress={onUpgradePress}>
              <Feather name="zap" size={12} color="#C9A84C" />
              <Text style={styles.upgradeBadgeText}>Pro Unlimited</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'flex-start',
  },
  wrapperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C9A84C',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    shadowColor: '#C9A84C',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordingActive: {
    backgroundColor: '#EF4444',
  },
  micText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#070D24',
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C9A84C18',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C9A84C40',
  },
  upgradeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#C9A84C',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#131D3D',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1B2448',
  },
  processingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#8B9CC5',
  },
});
