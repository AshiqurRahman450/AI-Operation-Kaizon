/**
 * Mock: Multi-Group Chat Service.
 * Allows managers to create and manage multiple groups.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kairox:mock:multiGroupChat:v3';

const SEED_GROUPS = [
  {
    id: 'group-ops',
    name: 'Ops Team',
    description: 'Daily ops coordination between MD and all Supervisors',
    member_ids: [1, 2, 3, 4, 5, 11, 12], // Added ID 5 (Manager 2)
    pinned_ids: ['gm-4'],
    messages: [
      {
        id: 'gm-1',
        from: 4,
        type: 'text',
        text: 'Good morning team. Quick standup: 3 open escalations this week, all under review.',
        ts: '2026-04-22T09:00:00Z',
      },
      {
        id: 'gm-2',
        from: 1,
        type: 'text',
        text: 'Vepery is all green apart from the lift-rope budget (awaiting your call).',
        ts: '2026-04-22T09:03:00Z',
      },
      {
        id: 'gm-3',
        from: 2,
        type: 'text',
        text: 'Guindy new CCTV rollout starts Monday. Solver team briefed.',
        ts: '2026-04-22T09:05:00Z',
      },
      {
        id: 'gm-4',
        from: 4,
        type: 'text',
        text: '📌 DECISION: All weekly consumable budgets <= ₹10k are pre-approved. No need to raise individual cards.',
        ts: '2026-04-22T09:12:00Z',
      },
      {
        id: 'gm-5',
        from: 3,
        type: 'text',
        text: 'Noted, Vikram. Thanks — that saves us ~8 requests a week.',
        ts: '2026-04-22T09:15:00Z',
      },
      {
        id: 'gm-6',
        from: 0, // system
        type: 'ai_summary',
        period: 'April 2026 (so far)',
        summary: {
          issues_raised: 27,
          issues_closed: 19,
          complaints: 8,
          escalations: 3,
          budget_spent: 2150000,
          top_decision:
            'Weekly consumable budgets \u2264 \u20B910k pre-approved (GM-4).',
          top_supervisor: 'Rajesh Kumar (12 issues closed)',
        },
        ts: '2026-04-22T10:00:00Z',
      },
    ],
    created_at: '2026-04-22T08:00:00Z',
    updated_at: '2026-04-22T10:00:00Z',
  }
];

const loadAll = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    console.log('DEBUG: loadAll raw data:', raw);
    if (!raw) {
      console.log('DEBUG: No data found, setting SEED_GROUPS');
      await AsyncStorage.setItem(KEY, JSON.stringify(SEED_GROUPS));
      return JSON.parse(JSON.stringify(SEED_GROUPS));
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.log('DEBUG: Data is empty array, returning SEED_GROUPS');
      return JSON.parse(JSON.stringify(SEED_GROUPS));
    }
    return parsed;
  } catch (e) {
    console.error('DEBUG: loadAll error:', e);
    return JSON.parse(JSON.stringify(SEED_GROUPS));
  }
};

const saveAll = async (groups) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(groups));
  } catch (e) {
    console.error('Failed to save groups', e);
  }
};

export const getAllGroups = async (userId) => {
  console.log('DEBUG: getAllGroups for userId:', userId);
  const groups = await loadAll();
  console.log('DEBUG: Loaded groups count:', groups.length);
  if (!userId) return groups;
  // Filter groups where user is a member (loose equality for string/number match)
  const filtered = groups.filter(g => g.member_ids.some(id => String(id) === String(userId)));
  console.log('DEBUG: Filtered groups count:', filtered.length);
  return filtered;
};

export const getGroupById = async (groupId) => {
  const groups = await loadAll();
  return groups.find(g => g.id === groupId);
};

export const createGroup = async ({ name, description, memberIds, createdBy }) => {
  const groups = await loadAll();
  const newGroup = {
    id: `group-${Date.now()}`,
    name,
    description: description || '',
    member_ids: Array.from(new Set([...memberIds, createdBy])), // Ensure creator is in group
    pinned_ids: [],
    messages: [
      {
        id: `sys-${Date.now()}`,
        from: 0, // system
        type: 'text',
        text: `Group "${name}" created by ${createdBy}`, // Simplified for now
        ts: new Date().toISOString(),
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: createdBy
  };
  groups.push(newGroup);
  await saveAll(groups);
  return newGroup;
};

export const sendGroupMessage = async (groupId, fromUser, text) => {
  const groups = await loadAll();
  const groupIndex = groups.findIndex(g => g.id === groupId);
  if (groupIndex === -1) return { success: false, error: 'Group not found' };

  const msg = {
    id: `msg-${Date.now()}`,
    from: fromUser.id,
    type: 'text',
    text: text.trim(),
    ts: new Date().toISOString(),
  };

  groups[groupIndex].messages.push(msg);
  groups[groupIndex].updated_at = msg.ts;
  await saveAll(groups);
  return { success: true, message: msg, group: groups[groupIndex] };
};

export const togglePinMessage = async (groupId, actor, messageId) => {
  if (actor?.role !== 'manager') {
    return { success: false, error: 'Only MD can pin' };
  }
  const groups = await loadAll();
  const groupIndex = groups.findIndex(g => g.id === groupId);
  if (groupIndex === -1) return { success: false, error: 'Group not found' };

  const group = groups[groupIndex];
  const pinned = new Set(group.pinned_ids || []);
  if (pinned.has(messageId)) pinned.delete(messageId);
  else pinned.add(messageId);
  
  group.pinned_ids = Array.from(pinned);
  group.updated_at = new Date().toISOString();
  await saveAll(groups);
  return { success: true, group };
};

export const deleteGroup = async (groupId) => {
  console.log('DEBUG: Deleting group:', groupId);
  const groups = await loadAll();
  const filtered = groups.filter(g => g.id !== groupId);
  if (groups.length === filtered.length) {
    console.log('DEBUG: Group not found for deletion');
    return { success: false, error: 'Group not found' };
  }
  await saveAll(filtered);
  console.log('DEBUG: Group deleted successfully');
  return { success: true };
};

export const pollGroupMessages = async (groupId, sinceTs) => {
  const group = await getGroupById(groupId);
  if (!group) return { messages: [], pinned_ids: [] };
  
  const msgs = group.messages || [];
  if (!sinceTs) return { messages: msgs, pinned_ids: group.pinned_ids };
  
  return {
    messages: msgs.filter((m) => new Date(m.ts) > new Date(sinceTs)),
    pinned_ids: group.pinned_ids,
  };
};
