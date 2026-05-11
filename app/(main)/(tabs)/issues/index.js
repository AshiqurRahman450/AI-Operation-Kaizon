import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import {
  fetchIssues,
  selectAllIssues,
  selectIssuesLoading,
  selectIssuesLoadingMore,
  selectHasMoreIssues,
} from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import FilterModal from '../../../../src/components/modals/FilterModal';
import { useDebounce } from '../../../../src/hooks/useDebounce';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

// ── STATUS CONFIG ──
const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    icon: 'alert-circle-outline',
    color: '#374151',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#ef4444',
  },
  ASSIGNED: {
    label: 'Assigned',
    icon: 'person-outline',
    color: '#8b5cf6',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#8b5cf6',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: 'time-outline',
    color: '#d97706',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#eab308',
  },
  ESCALATED: {
    label: 'Escalated',
    icon: 'warning-outline',
    color: '#ef4444',
    bgColor: '#fee2e2',
    filled: true,
    borderColor: '#ef4444',
  },
  RESOLVED_PENDING_REVIEW: {
    label: 'Awaiting Review',
    icon: 'time-outline',
    color: '#d97706',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#f97316',
  },
  COMPLETED: {
    label: 'Fixed',
    icon: 'checkmark-circle-outline',
    color: '#374151',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#3b82f6',
  },
  REOPENED: {
    label: 'Not Fixed',
    icon: 'close-circle-outline',
    color: '#ef4444',
    bgColor: '#fee2e2',
    filled: true,
    borderColor: '#ef4444',
  },
};

// ── STATUS TABS ──
const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'ESCALATED', label: 'Escalated' },
  { key: 'COMPLETED', label: 'Fixed' },
  { key: 'REOPENED', label: 'Not Fixed' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED_PENDING_REVIEW', label: 'Awaiting Review' },
  { key: 'ASSIGNED', label: 'Assigned' },
];

// ── HELPERS ──
const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatId = (id) => {
  if (!id) return '';
  return `TK-${String(id).padStart(4, '0')}`;
};

// ── INLINE ISSUE CARD ──
const IssueCard = ({ issue, onPress, isDark, theme }) => {
  const getStatusColor = (status) => {
    const s = String(status).toUpperCase();
    if (s === 'OPEN') return { bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', text: '#d97706' };
    if (s === 'IN_PROGRESS' || s === 'ASSIGNED') return { bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe', text: '#2563eb' };
    if (s === 'COMPLETED' || s === 'FIXED') return { bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7', text: '#059669' };
    if (s === 'ESCALATED') return { bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', text: '#dc2626' };
    return { bg: isDark ? '#333' : '#f8fafc', text: theme.textSecondary || '#6b7280' };
  };

  const statusColor = getStatusColor(issue.status);
  const cardBgColor = isDark ? '#1c1c1c' : '#ffffff';
  const cardBorderColor = isDark ? '#2a2a2a' : '#f1f5f9';
  const primaryBlue = '#3b82f6';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: cardBgColor,
          borderColor: cardBorderColor,
        }
      ]}
      onPress={onPress}
    >
      <View style={[styles.healthBar, { backgroundColor: statusColor.text }]} />

      {/* Top Row: ID & Time */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardId, { color: theme.textSecondary }]}>{formatId(issue.id)}</Text>
        <View style={styles.timeWrap}>
          <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
            {getTimeAgo(issue.created_at)}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
        {issue.title || 'Untitled Issue'}
      </Text>

      {/* User Info & Status */}
      <View style={styles.userRow}>
        <View style={styles.userInfo}>
          {/* <Avatar
            name={issue.supervisor_name || issue.supervisor?.name || 'System User'}
            uri={issue.supervisor_avatar || (issue.id ? `https://i.pravatar.cc/150?u=${issue.id}` : null)}
            size="small"
          /> */}
          <View style={styles.userText}>
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {issue.supervisor_name || issue.supervisor?.name || 'System User'}
            </Text>
            <Text style={styles.userRole}>{issue.supervisor_role || 'Field Worker'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>{issue.status}</Text>
        </View>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: cardBorderColor }]} />

      {/* Location & Details */}
      <View style={styles.locationRow}>
        <View style={styles.locationLeft}>
          <Ionicons name="location-outline" size={16} color={primaryBlue} />
          <Text style={styles.locationText} numberOfLines={1}>
            {issue.site_name || issue.site?.name || 'Unknown Site'}
          </Text>
        </View>
        <Text style={styles.detailsText}>DETAILS {'>'}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── MAIN SCREEN ──
export default function IssuesTabScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const allIssues = useSelector(selectAllIssues);
  const loading = useSelector(selectIssuesLoading);
  const loadingMore = useSelector(selectIssuesLoadingMore);
  const hasMore = useSelector(selectHasMoreIssues);
  const isOnline = useSelector(selectIsOnline);

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({
    statuses: [],
    priorities: [],
    categories: [],
    site: null,
    dateRange: 'all',
    overdueOnly: false,
  });

  const debouncedSearch = useDebounce(searchText, 300);

  useEffect(() => {
    if (user) dispatch(fetchIssues({ reset: true }));
  }, [user, dispatch]);

  const realSites = useMemo(() => {
    if (!allIssues) return [];
    const uniqueSites = new Map();
    allIssues.forEach((issue) => {
      if (issue.site_id && issue.site_name) {
        uniqueSites.set(issue.site_id, { id: issue.site_id, name: issue.site_name });
      }
    });
    return Array.from(uniqueSites.values());
  }, [allIssues]);

  const filteredIssues = useMemo(() => {
    if (!allIssues || allIssues.length === 0) return [];
    return allIssues.filter((issue) => {
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const match =
          issue.title?.toLowerCase().includes(s) ||
          issue.description?.toLowerCase().includes(s) ||
          issue.id?.toString().includes(s) ||
          issue.site_name?.toLowerCase().includes(s);
        if (!match) return false;
      }
      if (appliedFilters.statuses?.length > 0 && !appliedFilters.statuses.includes(issue.status)) return false;
      if (appliedFilters.priorities?.length > 0 && !appliedFilters.priorities.includes(issue.priority)) return false;
      if (appliedFilters.site && issue.site_id !== appliedFilters.site) return false;
      if (appliedFilters.categories?.length > 0) {
        const match = appliedFilters.categories.some((cat) => {
          const c = cat.toLowerCase();
          return issue.title?.toLowerCase().includes(c) || issue.description?.toLowerCase().includes(c);
        });
        if (!match) return false;
      }
      if (appliedFilters.dateRange && appliedFilters.dateRange !== 'all') {
        if (!issue.created_at) return false;
        const issueDate = new Date(issue.created_at);
        const now = new Date();
        if (appliedFilters.dateRange === 'today' && issueDate.toDateString() !== now.toDateString()) return false;
        if (appliedFilters.dateRange === 'week' && issueDate < new Date(now - 7 * 864e5)) return false;
        if (appliedFilters.dateRange === 'month' && issueDate < new Date(now - 30 * 864e5)) return false;
        if (appliedFilters.dateRange === '3months' && issueDate < new Date(now - 90 * 864e5)) return false;
      }
      if (appliedFilters.overdueOnly) {
        if (issue.status === 'COMPLETED' || issue.status === 'RESOLVED_PENDING_REVIEW') return false;
        if (issue.deadline_at) { if (new Date(issue.deadline_at) >= new Date()) return false; }
        else return false;
      }
      return true;
    });
  }, [allIssues, debouncedSearch, appliedFilters]);

  // Apply active tab filter on top
  const tabFilteredIssues = useMemo(() => {
    if (activeTab === 'all') return filteredIssues;
    return filteredIssues.filter((issue) => issue.status === activeTab);
  }, [filteredIssues, activeTab]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) { setToastMessage("Can't refresh while offline"); setTimeout(() => setToastMessage(''), 3000); return; }
    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) { setToastMessage('Just refreshed. Wait a moment.'); setTimeout(() => setToastMessage(''), 3000); return; }
    setRefreshing(true);
    if (user) {
      try { await Promise.allSettled([dispatch(fetchIssues({ reset: true }))]); }
      finally { setLastRefresh(Date.now()); setRefreshing(false); }
    } else { setRefreshing(false); }
  }, [user, isOnline, lastRefresh, dispatch]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && isOnline) dispatch(fetchIssues({ reset: false }));
  };

  const handleIssuePress = (issue) =>
    router.push({ pathname: '/(main)/(tabs)/issues/issue-detail', params: { id: issue.id } });
  const handleApplyFilters = (filters) => setAppliedFilters(filters);
  const handleClearFilters = () => {
    setSearchText('');
    setActiveTab('all');
    setAppliedFilters({ statuses: [], priorities: [], categories: [], site: null, dateRange: 'all', overdueOnly: false });
  };

  const getActiveFilterCount = () => {
    let c = 0;
    if (appliedFilters.statuses.length > 0) c++;
    if (appliedFilters.priorities.length > 0) c++;
    if (appliedFilters.categories.length > 0) c++;
    if (appliedFilters.site) c++;
    if (appliedFilters.dateRange !== 'all') c++;
    if (appliedFilters.overdueOnly) c++;
    return c;
  };

  const activeFilterCount = getActiveFilterCount();
  const borderColor = isDark ? '#2e2e2e' : '#e5e7eb';
  const bgColor = isDark ? '#1a1a1a' : '#f9fafb';
  const cardAreaBg = isDark ? '#1a1a1a' : '#f9fafb';

  if (loading && allIssues.length === 0 && !refreshing) return <Loader message="Loading issues..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Field Issues</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="medium" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={tabFilteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <IssueCard issue={item} onPress={() => handleIssuePress(item)} isDark={isDark} theme={theme} />
        )}
        contentContainerStyle={[styles.listContent, { backgroundColor: cardAreaBg }]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={{ backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }}>
            {/* ── SEARCH BAR ── */}
            <View style={[styles.searchWrapper, { borderBottomColor: borderColor }]}>
              <View style={[styles.searchBar, { backgroundColor: isDark ? '#242424' : '#f3f4f6', borderColor }]}>
                <Ionicons name="search-outline" size={17} color={isDark ? '#6b7280' : '#9ca3af'} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search by ID, title, or site..."
                  placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText !== '' && (
                  <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 8 }}>
                    <Ionicons name="close-circle" size={16} color={isDark ? '#4b5563' : '#9ca3af'} />
                  </TouchableOpacity>
                )}
                
                <View style={[styles.searchDivider, { backgroundColor: isDark ? '#333' : '#e5e7eb' }]} />
                
                <TouchableOpacity
                  onPress={() => setShowFilterModal(true)}
                  style={styles.inlineFilterBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="funnel-outline"
                    size={17}
                    color={activeFilterCount > 0 ? theme.primary : isDark ? '#6b7280' : '#9ca3af'}
                  />
                  {activeFilterCount > 0 && (
                    <View style={styles.filterDotSmall}>
                      <Text style={styles.filterDotTextSmall}>{activeFilterCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ── STATUS TABS ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScroll}
              style={[styles.tabsContainer, { borderBottomColor: borderColor }]}
            >
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.7}
                    style={[
                      styles.tab,
                      isActive
                        ? { backgroundColor: '#2563eb' }
                        : { backgroundColor: 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: isActive ? '#ffffff' : isDark ? '#9ca3af' : '#6b7280' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {(activeFilterCount > 0 || searchText) && (
                <TouchableOpacity onPress={handleClearFilters} style={styles.clearTabBtn}>
                  <Text style={[styles.clearTabText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Clear All</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* ── RESULTS COUNT ── */}
            <View style={[styles.resultsRow, { backgroundColor: isDark ? '#1a1a1a' : '#f9fafb' }]}>
              <Text style={[styles.resultsText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                {tabFilteredIssues.length} issue{tabFilteredIssues.length !== 1 ? 's' : ''}
              </Text>
              {Platform.OS === 'web' && (
                <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                  <Ionicons name="refresh-outline" size={16} color={isDark ? '#6b7280' : '#9ca3af'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No issues found"
            message={
              activeFilterCount > 0 || searchText || activeTab !== 'all'
                ? 'Try adjusting your filters.'
                : 'There are no issues to display.'
            }
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
          )
        }
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={appliedFilters}
        sites={realSites}
      />

      <FullScreenSpinner visible={refreshing} message="Updating Issues..." color={theme.primary} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerFilterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  filterDotText: { color: '#fff', fontSize: 8, fontWeight: '800' },

  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 14,
    // Fix for web black focus outline
    ...Platform.select({
      web: { outlineWidth: 0 }
    })
  },
  searchDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
  inlineFilterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterDotSmall: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  filterDotTextSmall: { color: '#fff', fontSize: 7, fontWeight: '800' },

  // Tabs
  tabsContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  clearTabBtn: { paddingHorizontal: 8, paddingVertical: 7 },
  clearTabText: { fontSize: 13, fontWeight: '500' },

  // Results row
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultsText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card: {
    padding: 16,
    paddingLeft: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    marginHorizontal: 16,
    marginTop: 10,
  },
  healthBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardId: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate: { fontSize: 11 },

  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, letterSpacing: -0.2 },

  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userText: { justifyContent: 'center' },
  userName: { fontSize: 13, fontWeight: '700' },
  userRole: { fontSize: 11, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },

  cardDivider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },

  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  detailsText: { fontSize: 11, fontWeight: '700', color: '#3b82f6', letterSpacing: 0.5 },

  listContent: { paddingBottom: 30 },
  loadingFooter: { paddingVertical: 20, alignItems: 'center' },
});