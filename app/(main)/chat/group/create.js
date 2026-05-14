import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { users as mockUsers } from '../../../../src/mocks/users';
import { createGroup } from '../../../../src/services/mocks/multiGroupChatMockService';
import RoleGuard from '../../../../src/components/navigation/RoleGuard';
import Avatar from '../../../../src/components/common/Avatar';

export default function CreateGroupScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const me = useSelector(selectCurrentUser);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out the current user and filter by search
  const availableUsers = mockUsers.filter(u => 
    u.id !== me?.id && 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    setLoading(true);
    try {
      const newGroup = await createGroup({
        name: name.trim(),
        description: description.trim(),
        memberIds: selectedUsers,
        createdBy: me?.id
      });
      router.replace(`/(main)/chat/group/${newGroup.id}`);
    } catch (error) {
      console.error('Failed to create group', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderBottomColor: isDark ? '#2a2a2a' : '#f0f0f0' }
        ]}
        onPress={() => toggleUser(item.id)}
      >
        <Avatar uri={item.avatar} name={item.name} size="medium" />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.userRole, { color: theme.textSecondary }]}>{item.role}</Text>
        </View>
        <View style={[
          styles.checkbox,
          { borderColor: isSelected ? theme.primary : (isDark ? '#444' : '#ccc'), backgroundColor: isSelected ? theme.primary : 'transparent' }
        ]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <RoleGuard roles={['manager']}>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111111' : '#f8f9fa' }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>New Group</Text>
          <TouchableOpacity 
            onPress={handleCreate} 
            disabled={loading || !name.trim() || selectedUsers.length === 0}
            style={[styles.createBtn, { opacity: (loading || !name.trim() || selectedUsers.length === 0) ? 0.5 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.createBtnText, { color: theme.primary }]}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <View style={styles.form}>
            <View style={[styles.inputGroup, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: isDark ? '#2a2a2a' : '#e0e0e0' }]}>
              <Ionicons name="people-outline" size={24} color={theme.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Group Name"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={[styles.inputGroup, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: isDark ? '#2a2a2a' : '#e0e0e0', marginTop: 12 }]}>
              <Ionicons name="information-circle-outline" size={24} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Description (Optional)"
                placeholderTextColor={theme.textSecondary}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <View style={styles.memberSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              SELECT MEMBERS ({selectedUsers.length})
            </Text>
            <View style={[styles.searchBar, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: isDark ? '#2a2a2a' : '#e0e0e0' }]}>
              <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search users..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <FlatList
              data={availableUsers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderUserItem}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  createBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  createBtnText: { fontSize: 16, fontWeight: '700' },
  form: { padding: 16 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16 },
  memberSection: { flex: 1, marginTop: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  listContent: { paddingBottom: 20 },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '600' },
  userRole: { fontSize: 13, opacity: 0.7, textTransform: 'capitalize' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
