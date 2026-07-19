import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useApp } from '@/context/AppContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { fetch } from 'expo/fetch';
import * as Haptics from 'expo-haptics';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const SUGGESTIONS = [
  'What are my rights as a tenant?',
  'How do I file a consumer complaint?',
  'Explain bail procedure in India',
  'What is the limitation period for a cheque bounce case?',
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { jurisdiction, language } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const listRef = useRef<FlatList>(null);
  const streamingIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', isStreaming: true };
    streamingIdRef.current = assistantId;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    try {
      const token = await getToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const response = await fetch(`https://${domain}/api/lawvise/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history, jurisdiction, language }),
      });

      const reader = (response.body as any)?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              accumulated += data.content;
              const id = streamingIdRef.current;
              setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, content: accumulated } : m))
              );
            }
            if (data.done) break;
          } catch { /* skip */ }
        }
      }
    } catch {
      const id = streamingIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false } : m
        )
      );
    } finally {
      const id = streamingIdRef.current;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isStreaming: false } : m)));
      setIsStreaming(false);
      streamingIdRef.current = null;
    }
  }, [messages, isStreaming, getToken, jurisdiction, language]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Feather name="shield" size={14} color="#C9A84C" />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          !isUser && { backgroundColor: colors.card },
        ]}>
          {item.isStreaming && !item.content ? (
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color="#C9A84C" />
              <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Thinking...</Text>
            </View>
          ) : (
            <Text style={[styles.bubbleText, { color: isUser ? '#070D24' : colors.foreground }]}>
              {item.content}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const padTop = insets.top + (Platform.OS === 'web' ? 67 : 16);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: padTop, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.aiAvatarLarge}>
          <Feather name="shield" size={20} color="#C9A84C" />
        </View>
        <View>
          <Text style={styles.headerTitle}>LawVise AI</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Legal Assistant • {jurisdiction}</Text>
        </View>
        <View style={[styles.onlineDot]} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted={false}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && { flex: 1 },
        ]}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="shield" size={40} color="#C9A84C" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ask LawVise</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Get instant AI-powered legal guidance on your rights, laws, and legal procedures
            </Text>
            <View style={styles.suggestionsGrid}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => sendMessage(s)}
                >
                  <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={0}
        style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}
      >
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a legal question..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
          blurOnSubmit
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || isStreaming) && { opacity: 0.4 }]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
        >
          <Feather name="send" size={18} color="#070D24" />
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20,
    paddingBottom: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF' },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  aiAvatarLarge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C9A84C18', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#C9A84C40' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginLeft: 'auto' },
  messagesList: { padding: 16, gap: 12 },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgRowUser: { flexDirection: 'row-reverse' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#C9A84C18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 12 },
  userBubble: { backgroundColor: '#C9A84C', borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#C9A84C15', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  suggestionsGrid: { width: '100%', gap: 8, marginTop: 8 },
  suggestionChip: { borderRadius: 10, padding: 12, borderWidth: 1 },
  suggestionText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, fontFamily: 'Inter_400Regular', fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C9A84C', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
