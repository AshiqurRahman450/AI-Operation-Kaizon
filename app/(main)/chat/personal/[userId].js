import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import ChatBubble from '../../../../src/components/chat/ChatBubble';
import BudgetCardMessage from '../../../../src/components/chat/BudgetCardMessage';
import {
  fetchPersonalMessages,
  openPersonalThread,
  sendPersonalChatMessage
} from '../../../../src/services/api';
import {
  getBudgetRequests,
} from '../../../../src/services/mocks/budgetMockService';

/**
 * Personal (1:1) chat screen (Kairox §7 + §8).
 * Fully integrated with real backend APIs.
 */
export default function PersonalChatRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const me = useSelector(selectCurrentUser);

  const [threadId, setThreadId] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBudgetPicker, setShowBudgetPicker] = useState(false);
  const [myBudgets, setMyBudgets] = useState([]);
  
  const listRef = useRef(null);

  // 1. Initialize Chat
  useEffect(() => {
    const initChat = async () => {
      if (!userId) return;
      setLoading(true);
      
      console.log(`--- CHAT FLOW: Opening thread with User ID: ${userId} ---`);
      const res = await openPersonalThread(userId);
      
      if (res.success && res.thread) {
        setThreadId(res.thread.id);
        setOtherUser(res.thread.other_user);
        
        console.log(`--- CHAT FLOW: Fetching messages for thread ${res.thread.id} ---`);
        const msgRes = await fetchPersonalMessages(res.thread.id);
        if (msgRes.success) {
          setMessages(msgRes.data.items || []);
        }
      } else {
        console.error('Failed to initialize thread:', res.error);
      }
      setLoading(false);
    };

    initChat();
  }, [userId]);

  // 2. Polling for new messages
  useEffect(() => {
    if (!threadId) return;
    const interval = setInterval(async () => {
      const res = await fetchPersonalMessages(threadId);
      if (res.success) {
        setMessages(res.data.items || []);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [threadId]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      setTimeout(() => {
        try { listRef.current.scrollToEnd({ animated: true }); } catch {}
      }, 80);
    }
  }, [messages.length]);

  const onSend = async () => {
    if (!text.trim() || sending || !threadId) return;
    setSending(true);
    
    const res = await sendPersonalChatMessage(threadId, text);
    if (res.success) {
      setText('');
      setMessages((prev) => [...prev, ...res.messages]);
    } else {
      Alert.alert('Error', 'Failed to send message.');
    }
    setSending(false);
  };

  const onAttachBudget = async () => {
    if (me?.role !== 'supervisor' && me?.role !== 'manager') {
      Alert.alert('Not allowed', 'Only Supervisors and MDs can attach budget cards.');
      return;
    }
    const list = await getBudgetRequests(me);
    setMyBudgets(list);
    setShowBudgetPicker(true);
  };

  const pickBudget = async (budget) => {
    setShowBudgetPicker(false);
    if (!threadId) return;
    const res = await sendPersonalChatMessage(threadId, `Budget Request: ${budget.title}`);
    if (res.success) {
      setMessages((prev) => [...prev, ...res.messages]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.text, marginTop: 12 }}>Connecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = otherUser?.name || 'Chat';
  const displayRole = otherUser?.role || 'Personal Conversation';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.userRole, { color: theme.textSecondary }]}>{displayRole}</Text>
        </View>

        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ChatBubble 
              text={item.body} 
              isOwn={item.sender?.id === me?.id} 
              ts={item.created_at} 
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                <Ionicons name="chatbubbles-outline" size={50} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Secure AI Kaizen Chat</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                This conversation is private. Start a conversation with {displayName}.
              </Text>
            </View>
          )}
        />

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          {(me?.role === 'supervisor' || me?.role === 'manager') && (
            <TouchableOpacity onPress={onAttachBudget} style={[styles.attachBtn, { borderColor: theme.border }]}>
              <Ionicons name="wallet-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            placeholder="Write a message..."
            placeholderTextColor={theme.textSecondary + '99'}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? theme.primary : isDark ? '#333' : '#e5e5e5' }]}
          >
            <Ionicons name="send" size={16} color={text.trim() ? '#fff' : theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Budget Picker Modal */}
      {showBudgetPicker && (
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity style={styles.pickerBackdropTouch} onPress={() => setShowBudgetPicker(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>Attach a budget request</Text>
              <TouchableOpacity onPress={() => setShowBudgetPicker(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {myBudgets.length === 0 ? (
              <Text style={{ color: theme.textSecondary, padding: 16 }}>No budget requests to attach.</Text>
            ) : (
              myBudgets.slice(0, 6).map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.pickerRow, { borderColor: theme.border }]}
                  onPress={() => pickBudget(b)}
                >
                  <Ionicons name="wallet-outline" size={16} color={theme.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.pickerRowTitle, { color: theme.text }]}>{b.title}</Text>
                    <Text style={[styles.pickerRowSub, { color: theme.textSecondary }]}>₹{b.amount}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, marginLeft: 10 },
  userName: { fontSize: 16, fontWeight: '700' },
  userRole: { fontSize: 12, opacity: 0.7 },
  menuBtn: { padding: 4 },
  listContent: { padding: 14, flexGrow: 1, paddingBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  emptySub: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  attachBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerBackdropTouch: { flex: 1 },
  pickerSheet: { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1, padding: 14, gap: 8, paddingBottom: 28 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pickerTitle: { fontSize: 15, fontWeight: '700' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1 },
  pickerRowTitle: { fontSize: 13, fontWeight: '700' },
  pickerRowSub: { fontSize: 11 },
});
