import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface VoiceDictationProps {
  isProUser: boolean; // Pass user subscription status here
  onTranscriptionComplete: (text: string) => void;
  onUpgradePress: () => void; // Triggered when free user tries to use it
}

export default function VoiceDictation({ isProUser, onTranscriptionComplete, onUpgradePress }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleRecording = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If the user is on the Free tier, block dictation and prompt to upgrade!
    if (!isProUser) {
      onUpgradePress();
      return;
    }
    
    if (!isRecording) {
      setIsRecording(true);
    } else {
      setIsRecording(false);
      setIsProcessing(true);

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
        <Pressable
          style={[styles.micButton, isRecording && styles.recordingActive]}
          onPress={handleToggleRecording}
        >
          <Feather 
            name={isProUser ? (isRecording ? 'square' : 'mic') : 'lock'} 
            size={18} 
            color={isRecording ? '#FFFFFF' : '#070D24'} 
          />
          <Text style={[styles.micText, isRecording && { color: '#FFFFFF' }]}>
            {isProUser ? (isRecording ? 'Tap to Stop Dictation' : 'Voice Dictation (Pro)') : 'Voice Dictation (Locked)'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'flex-start',
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
