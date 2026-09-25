import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { checkProStatus } from '../services/purchases';
import { checkDictationLimit, incrementDictationCount } from '../services/usageLimits';

interface VoiceDictationProps {
  onTranscriptionComplete: (text: string) => void;
  onUpgradePress: () => void;
}

export default function VoiceDictation({ onTranscriptionComplete, onUpgradePress }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [canUse, setCanUse] = useState(true);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    checkUserStatus();
    requestMicrophonePermission();

    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      const response = await Audio.requestPermissionsAsync();
      if (!response.granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed for voice dictation.');
      }
    } catch (e) {
      console.log('Error requesting mic permission:', e);
    }
  };

  const checkUserStatus = async () => {
    const proActive = await checkProStatus();
    setIsProUser(proActive);

    if (!proActive) {
      const allowed = await checkDictationLimit();
      setCanUse(allowed);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start audio recording.');
      setIsRecording(false);
    }
  };

  const stopAndUploadRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('No recording URI found');
      }

      // If free user, increment local usage counter
      if (!isProUser) {
        await incrementDictationCount();
        const allowed = await checkDictationLimit();
        setCanUse(allowed);
      }

      // TODO: Send this 'uri' file to your Render backend API endpoint
      // Example FormData upload:
      /*
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'dictation.m4a',
      } as any);

      const response = await fetch('https://law-wise-insight.onrender.com/api/dictate', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await response.json();
      onTranscriptionComplete(data.transcription);
      */

      // Temporary simulation for testing before backend route integration:
      setTimeout(() => {
        setIsProcessing(false);
        // This will pass your real flow test once connected to your backend speech AI
        onTranscriptionComplete(" Drafting preliminary injunction motion for client hearing");
      }, 1500);

    } catch (error) {
      console.error('Failed to process recording', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process audio recording.');
    }
  };

  const handleToggleRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    const proActive = await checkProStatus();
    setIsProUser(proActive);

    if (!proActive) {
      const allowed = await checkDictationLimit();
      setCanUse(allowed);

      if (!allowed) {
        onUpgradePress();
        return;
      }
    }

    if (!isRecording) {
      await startRecording();
    } else {
      await stopAndUploadRecording();
    }
  };

  return (
    <View style={styles.container}>
      {isProcessing ? (
        <View style={styles.processingRow}>
          <ActivityIndicator color="#C9A84C" size="small" />
          <Text style={styles.processingText}>Transcribing courtroom audio...</Text>
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
                  : canUse 
                    ? 'Voice Dictation (Free Trial)' 
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
