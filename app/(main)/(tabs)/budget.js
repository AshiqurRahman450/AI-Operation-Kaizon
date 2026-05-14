import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import {
  fetchBudgetRequests,
  fetchBudgetTotals,
  fetchBudgetBurnRates,
  selectBudgetRequests,
  selectBudgetTotals,
  selectBudgetBurnRates,
  selectBudgetLoading,
  selectBudgetLoadingMore,
  selectHasMoreBudgets
} from '../../../src/store/slices/budgetSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';
import { backToDashboard } from '../../../src/utils/navigation';
import { normaliseRole, ROLES, can } from '../../../src/utils/roles';
import { selectAllSites, fetchSitesWithAnalytics } from '../../../src/store/slices/sitesSlice';

const STATUS_META = {
  // Common UI statuses
  PENDING: { label: 'Pending', tone: 'warning', icon: 'time-outline' },
  APPROVED: { label: 'Approved', tone: 'success', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rejected', tone: 'danger', icon: 'close-circle-outline' },

  // API specific statuses (Matched exactly to Docs)
  pending_md: { label: 'Needs MD approval', tone: 'warning', icon: 'time-outline' },
  PENDING_MD: { label: 'Needs MD approval', tone: 'warning', icon: 'time-outline' },

  md_plus_customer_md: { label: 'Needs Customer MD approval', tone: 'orange', icon: 'arrow-up-circle-outline' },
  MD_PLUS_CUSTOMER_MD: { label: 'Needs Customer MD approval', tone: 'orange', icon: 'arrow-up-circle-outline' },

  auto_approve: { label: 'Will auto-approve', tone: 'success', icon: 'checkmark-circle-outline' },
  auto_approved: { label: 'Will auto-approve', tone: 'success', icon: 'checkmark-circle-outline' },
  AUTO_APPROVED: { label: 'Will auto-approve', tone: 'success', icon: 'checkmark-circle-outline' },

  ESCALATED_CUSTOMER_MD: { label: 'Needs Customer MD approval', tone: 'orange', icon: 'arrow-up-circle-outline' },
  CMD_APPROVED: { label: 'Will auto-approve', tone: 'success', icon: 'checkmark-done-circle-outline' },
  CMD_REJECTED: { label: 'Rejected', tone: 'danger', icon: 'close-circle-outline' },
};

const fmtCurrency = (n) => {
  if (n == null) return '—';
  const val = n / 100; // API returns paise
  return '\u20B9' + new Intl.NumberFormat('en-IN').format(Math.round(val));
};

export default function BudgetRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const userRole = normaliseRole(user?.role);

  const list = useSelector(selectBudgetRequests);
  const totals = useSelector(selectBudgetTotals);
  const burnRates = useSelector(selectBudgetBurnRates);
  const loading = useSelector(selectBudgetLoading);
  const loadingMore = useSelector(selectBudgetLoadingMore);
  const hasMore = useSelector(selectHasMoreBudgets);
  const allSites = useSelector(selectAllSites);

  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState(null);

  const loadData = useCallback((reset = true, status = activeStatus) => {
    dispatch(fetchBudgetRequests({ reset, status }));
    if (reset) {
      dispatch(fetchBudgetTotals());
      dispatch(fetchSitesWithAnalytics());
      if (userRole === ROLES.MANAGER || userRole === ROLES.SUPERVISOR) {
        dispatch(fetchBudgetBurnRates());
      }
    }
  }, [dispatch, userRole]); // Removed activeStatus from dependencies to avoid loop

  const openAnalytics = () => router.push('/budget/analytics');

  useEffect(() => {
    loadData(true, null);
  }, []); // Only run once on mount

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(false, activeStatus);
    }
  };

  const handleStatusChange = (status) => {
    if (activeStatus === status) return;
    setActiveStatus(status);
    loadData(true, status); // Manually trigger load with the NEW status
  };

  const title =
    userRole === ROLES.CUSTOMER_MD
      ? 'Escalated Approvals'
      : userRole === ROLES.MANAGER
        ? 'Budget Requests'
        : 'Budget List';

  const toneBg = (tone) => {
    if (tone === 'success') return isDark ? 'rgba(52, 199, 89, 0.15)' : theme.successLight;
    if (tone === 'warning') return isDark ? 'rgba(255, 159, 10, 0.15)' : theme.warningLight;
    if (tone === 'danger') return isDark ? 'rgba(255, 69, 58, 0.15)' : theme.dangerLight;
    return theme.inputBackground;
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {totals && (
        <View style={styles.totalsContainer}>
          <View style={styles.totalsRow}>
            <TotalCard
              theme={theme}
              label="Total"
              value={totals.total_requests || 0}
              icon="documents-outline"
              isDark={isDark}
              active={activeStatus === null}
              onPress={() => handleStatusChange(null)}
            />
            <TotalCard
              theme={theme}
              label="Pending"
              value={totals.pending_count || 0}
              icon="hourglass-outline"
              color={theme.warning}
              bg={toneBg('warning')}
              isDark={isDark}
              active={activeStatus === 'PENDING_MD'}
              onPress={() => handleStatusChange('PENDING_MD')}
            />
            <TotalCard
              theme={theme}
              label="Approved"
              value={totals.approved_count || totals.total_requests - totals.pending_count} 
              icon="checkmark-done-outline"
              color={theme.success}
              bg={toneBg('success')}
              isDark={isDark}
              active={activeStatus === 'APPROVED'}
              onPress={() => handleStatusChange('APPROVED')}
            />
          </View>
          <View style={styles.totalsRow}>
            <TotalCard
              theme={theme}
              label="Rejected"
              value={totals.rejected_count || 0}
              icon="close-circle-outline"
              color={theme.danger}
              bg={toneBg('danger')}
              isDark={isDark}
              active={activeStatus === 'REJECTED'}
              onPress={() => handleStatusChange('REJECTED')}
            />
            <TotalCard
              theme={theme}
              label="Escalated"
              value={totals.escalated_count || 0}
              icon="arrow-up-circle-outline"
              color="#5856D6"
              bg={isDark ? 'rgba(88, 86, 214, 0.15)' : '#F2F2F7'}
              isDark={isDark}
              active={activeStatus === 'ESCALATED_CUSTOMER_MD'}
              onPress={() => handleStatusChange('ESCALATED_CUSTOMER_MD')}
            />
            {/* Spacer for 2nd row to maintain layout */}
            <View style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {list.length > 0 && (
        <Text style={[styles.sectionHeader, { color: theme.textSecondary, marginHorizontal: 16, marginBottom: 8 }]}>
          Recent Requests
        </Text>
      )}
    </View>
  );

  const canCreate = can('write:raiseBudgetRequest', user?.role);

  return (
    <RoleGuard action="view:budget">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
          {userRole === ROLES.MANAGER ? (
            <TouchableOpacity onPress={openAnalytics} style={styles.iconBtn}>
              <Ionicons name="stats-chart-outline" size={22} color={theme.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {loading && !refreshing ? (
          <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item, index) => item.id || item.request_id || `req-${index}`}
            contentContainerStyle={styles.scroll}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <EmptyState
                icon="wallet-outline"
                title="No budget requests"
                message="Your spend requests will appear here."
              />
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? <ActivityIndicator style={{ padding: 20 }} color={theme.primary} /> : null
            }
            renderItem={({ item, index }) => (
              <BudgetCard
                item={item}
                theme={theme}
                isDark={isDark}
                index={index}
                allSites={allSites}
              />
            )}
          />
        )}

        {canCreate && (
          <FAB theme={theme} isDark={isDark} onPress={() => router.push('/budget/new')} />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const BudgetCard = ({ item, theme, isDark, index, allSites }) => {
  const router = useRouter();
  // Logic to match the preview tiers in the form
  const getDisplayMeta = (status, amount) => {
    const amountRupees = Number(amount || 0) / 100;

    // If it's pending MD but amount is high (>= 2L), show Customer MD label
    if (status === 'pending_md' || status === 'PENDING_MD') {
      if (amountRupees >= 200000) {
        return { label: 'Needs Customer MD approval', tone: 'orange', icon: 'arrow-up-circle-outline' };
      }
      return { label: 'Needs MD approval', tone: 'warning', icon: 'time-outline' };
    }

    return STATUS_META[status] || { label: status, tone: 'default', icon: 'help-circle-outline' };
  };

  const meta = getDisplayMeta(item.status, item.amount_paise || item.amount);

  const toneColor = (tone) => {
    if (tone === 'success') return theme.success;
    if (tone === 'warning') return theme.warning;
    if (tone === 'orange') return '#ff8c00'; // Vivid Orange
    if (tone === 'danger') return theme.danger;
    return theme.textSecondary;
  };

  const toneBg = (tone) => {
    if (tone === 'success') return isDark ? 'rgba(52, 199, 89, 0.15)' : theme.successLight;
    if (tone === 'warning') return isDark ? 'rgba(255, 159, 10, 0.15)' : theme.warningLight;
    if (tone === 'orange') return isDark ? 'rgba(255, 140, 0, 0.15)' : '#fff7ed';
    if (tone === 'danger') return isDark ? 'rgba(255, 69, 58, 0.15)' : theme.dangerLight;
    return theme.inputBackground;
  };
  const statusColor = {
    bg: toneBg(meta.tone),
    text: toneColor(meta.tone)
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/budget/${item.id}`)}
    >
      <Animated.View
        entering={FadeInRight.delay(index * 50).duration(400)}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1C1C1E' : theme.card,
            borderColor: theme.border,
            shadowColor: isDark ? '#000' : '#000',
            shadowOpacity: isDark ? 0.3 : 0.05,
          }
        ]}
      >
      <View style={[styles.healthBar, { backgroundColor: statusColor.text }]} />

      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.userAvatar, { backgroundColor: theme.inputBackground }]}>
            <Ionicons name="person" size={14} color={theme.textSecondary} />
          </View>
          <View style={styles.userText}>
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {item.supervisor_name || 'Supervisor'}
            </Text>
            {item.created_at && (
              <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                Created At: {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </Text>
            )}
            {item.updated_at && (
              <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                Updated At: {new Date(item.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
        {item.title || item.reason}
      </Text>

      <View style={styles.cardDivider} />

      <View style={styles.locationRow}>
        <View style={styles.locationLeft}>
          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.cardSite, { color: theme.textSecondary }]}>
            {(() => {
              // Try to find the site ID in various possible fields
              const sId = item.site?.id || item.site_id || item.siteId || item.location_id || item.locationId ||
                (typeof item.site === 'number' || (typeof item.site === 'string' && /^\d+$/.test(item.site)) ? item.site : null);

              // Try to find the site name directly in the item
              let name = item.site?.name ||
                item.site_name ||
                item.siteName ||
                item.location ||
                item.location_name ||
                (typeof item.site === 'string' && !/^\d+$/.test(item.site) ? item.site : null);

              // If name is "N/A" or "n/a", treat it as missing so we try the ID lookup
              if (name && (String(name).toUpperCase() === 'N/A' || String(name).toUpperCase() === 'UNDEFINED')) {
                name = null;
              }

              // If still no name, try to look it up in the allSites list if we have an ID
              if (!name && sId) {
                const foundSite = allSites.find(s => String(s.id || s._id || s.site_id) === String(sId));
                name = foundSite?.name || foundSite?.site_name;
              }



              return name || 'N/A';
            })()}
          </Text>
        </View>
        <Text style={[styles.cardAmount, { color: theme.text }]}>
          {fmtCurrency(item.amount_paise || item.amount)}
        </Text>
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const TotalCard = ({ theme, label, value, icon, color, bg, wide, isDark, active, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={[
      styles.totalCard,
      wide && { flex: 1.5 },
      {
        backgroundColor: bg || (isDark ? '#1C1C1E' : theme.card),
        borderColor: active ? (color || theme.primary) : theme.border,
        borderWidth: active ? 2 : 1
      },
    ]}
  >
    <View style={styles.totalIconWrap}>
      <Ionicons name={icon} size={14} color={color || theme.textSecondary} />
    </View>
    <Text style={[styles.totalValue, { color: color || theme.text }]}>{value}</Text>
    <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>{label}</Text>
  </TouchableOpacity>
);

const FAB = ({ theme, isDark, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={[styles.fabContainer, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[
          styles.fab,
          {
            backgroundColor: isDark ? '#fff' : theme.primary,
            shadowColor: isDark ? '#fff' : theme.primary
          }
        ]}
      >
        <Ionicons name="add" size={32} color={isDark ? theme.primary : '#fff'} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  scroll: { paddingBottom: 100 },
  listHeader: { paddingBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  totalsContainer: { padding: 16, gap: 10 },
  totalsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  totalCard: {
    flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, gap: 2, alignItems: 'flex-start',
  },
  totalIconWrap: { marginBottom: 4 },
  totalValue: { fontSize: 16, fontWeight: '800' },
  totalLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', opacity: 0.7 },
  card: {
    padding: 16,
    paddingLeft: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 10,
    elevation: 2,
  },
  healthBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userText: {
    justifyContent: 'center',
  },
  userName: { fontSize: 13, fontWeight: '700' },
  cardDate: { fontSize: 10, marginTop: 1 },
  userRole: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
    opacity: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardSite: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  burnSection: { marginHorizontal: 16, marginTop: 8, marginBottom: 20, gap: 10 },
  sectionHeader: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  burnCard: { padding: 14, borderRadius: 18, borderWidth: 1, gap: 8 },
  burnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  burnSite: { fontSize: 14, fontWeight: '700', flex: 1 },
  burnAmt: { fontSize: 11, fontWeight: '600' },
  burnTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  burnFill: { height: 8, borderRadius: 4 },
  burnPct: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  fabContainer: {
    position: 'absolute', bottom: 30, right: 20,
    zIndex: 100,
  },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10,
  },
});
