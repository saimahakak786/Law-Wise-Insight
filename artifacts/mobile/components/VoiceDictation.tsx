import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useAuth } from '@clerk/expo';
import { checkProStatus } from '../services/purchases';
import { checkDictationLimit, incrementDictationCount } from '../services/usageLimits';

interface VoiceDictationProps {
  onTranscriptionComplete: (text: string) => void;
  onUpgradePress: () => void;
}

const MAX_RECORDING_DURATION_MS = 5 * 60 * 1000; // 5 Minutes max limit

export default function VoiceDictation({ onTranscriptionComplete, onUpgradePress }: VoiceDictationProps) {
  const { getToken } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [canUse, setCanUse] = useState(true);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  // Live Timer States
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkUserStatus();
    requestMicrophonePermission();

    return () => {
      cleanupTimers();
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const cleanupTimers = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
  };

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

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      setSecondsElapsed(0);

      // Start live visual counter (every 1 second)
      intervalTimerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);

      // Set 5-minute hard auto-stop timer
      recordingTimerRef.current = setTimeout(async () => {
        Alert.alert('Maximum Limit Reached', 'Voice dictation has automatically stopped at the 5-minute limit.');
        await stopAndUploadRecording();
      }, MAX_RECORDING_DURATION_MS);

    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start audio recording.');
      setIsRecording(false);
      cleanupTimers();
    }
  };

  const stopAndUploadRecording = async () => {
    if (!recording) return;

    cleanupTimers();
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

      const token = await getToken();

      // Send the audio file to your Render backend API endpoint
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'dictation.m4a',
      } as any);

      const response = await fetch('https://law-wise-insight.onrender.com/api/dictate', {
        method: 'POST',
        body: formData,
        headers: { 
          // NOTE: Do NOT set Content-Type here! React Native automatically assigns 
          // the correct multipart boundary when passing FormData without a manual header.
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setIsProcessing(false);

      if (response.ok) {
        onTranscriptionComplete(data.transcription);
      } else {
        Alert.alert('Error', data.error || 'Transcription failed.');
      }

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
          <Text style={styles.processingText}>Transcribing & Translating Audio...</Text>
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
                ? `Recording ${formatTime(secondsElapsed)} / 05:00` 
                : 'Voice Dictation (Max 5m)'}
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
