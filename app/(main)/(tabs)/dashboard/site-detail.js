import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { PieChart, LineChart } from 'react-native-chart-kit';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectSiteById, fetchSitesWithAnalytics, selectSitesLoading } from '../../../../src/store/slices/sitesSlice';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import EmptyState from '../../../../src/components/common/EmptyState';
import Loader from '../../../../src/components/common/Loader';
import { fetchSiteBudgetSummary, fetchSiteBudgetHistory } from '../../../../src/services/api';

// ── ADDED REUSABLE IMPORTS ──
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SiteDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();
  const id = parseInt(params.id, 10);

  const site = useSelector(state => selectSiteById(state, id));
  const loading = useSelector(selectSitesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState(null);
  const [budgetHistory, setBudgetHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    
    setRefreshing(true);
    try {
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
      await Promise.allSettled([
        dispatch(fetchSitesWithAnalytics())
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [isOnline, dispatch]);

  // ── FETCH BUDGET SUMMARY ──
  const loadBudgetSummary = useCallback(async () => {
    if (!id) return;
    setBudgetLoading(true);
    const res = await fetchSiteBudgetSummary(id);
    if (res.success) {
      setBudgetSummary(res.data);
      setBudgetError(null);
    } else {
      setBudgetError(res.code === 403 ? 'Access denied for this site' : 'Could not load budget data');
    }
    setBudgetLoading(false);
  }, [id]);

  useEffect(() => {
    loadBudgetSummary();
  }, [loadBudgetSummary]);

  // ── FETCH BUDGET HISTORY ──
  const loadBudgetHistory = useCallback(async () => {
    if (!id) return;
    setHistoryLoading(true);
    const res = await fetchSiteBudgetHistory(id, 6);
    if (res.success) setBudgetHistory(res.data);
    setHistoryLoading(false);
  }, [id]);

  useEffect(() => {
    loadBudgetHistory();
  }, [loadBudgetHistory]);

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  const getHealthColor = health => {
    switch (health) {
      case 'Healthy': return '#10a37f';
      case 'Needs Attention': return '#f59e0b';
      case 'Critical': return '#ef4444';
      default: return theme.textSecondary;
    }
  };

  const chartData = useMemo(() => {
    if (!site?.analytics) return null;
    const a = site.analytics;
    const entries = [
      { label: 'Open', value: a.open_issues || 0, color: '#3b82f6' },
      { label: 'Assigned', value: a.assigned_issues || 0, color: '#8b5cf6' },
      { label: 'In Progress', value: a.in_progress_issues || 0, color: '#f59e0b' },
      { label: 'Completed', value: a.completed_issues || 0, color: '#10a37f' },
      { label: 'Reopened', value: a.reopened_issues || 0, color: '#ef4444' },
    ].filter(e => e.value > 0);

    if (entries.length === 0) return null;

    return entries.map(e => ({
      name: e.label,
      population: e.value,
      color: e.color,
      legendFontColor: theme.text,
      legendFontSize: 12,
    }));
  }, [site, theme.text]);

  // 📍 FIX: Added `!refreshing` to prevent Loader hijacking
  if (loading && !refreshing && !site) return <Loader message="Loading site details..." />;

  if (!site) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={theme.text} /></TouchableOpacity>
        </View>
        <EmptyState icon="business-outline" title="Site not found" message="The requested site data is unavailable." />
      </SafeAreaView>
    );
  }

  const analytics = site.analytics || {};
  const score = analytics.score ?? 100;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Site Overview</Text>
        
        {/* 📍 FIX: Added Web-only Refresh Button to Header */}
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        // 📍 FIX: Disables double spinner on web
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          )
        }
      >

        {/* ── SITE OVERVIEW & SCORE ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.siteName, { color: theme.text }]}>{site.name}</Text>
              <Text style={[styles.siteLocation, { color: theme.textSecondary }]}>{site.location}</Text>
            </View>
            <View style={[styles.healthBadge, { borderColor: getHealthColor(analytics.health), backgroundColor: getHealthColor(analytics.health) + '15' }]}>
              <Text style={[styles.healthText, { color: getHealthColor(analytics.health) }]}>
                {analytics.health || 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: getHealthColor(analytics.health) }]}>{score}</Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Site Score</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: theme.text }]}>{analytics.total_issues || 0}</Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Total Issues</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: (analytics.overdue_count || 0) > 0 ? '#ef4444' : theme.text }]}>
                {analytics.overdue_count || 0}
              </Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Overdue</Text>
            </View>
          </View>
        </View>

        {/* ── ISSUES CHART ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Issue Distribution</Text>
          {chartData ? (
            <View style={styles.chartContainer}>
              <PieChart
                data={chartData}
                width={SCREEN_WIDTH - 64}
                height={200}
                chartConfig={{ color: () => theme.text }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No issues recorded for this site yet.</Text>
          )}
        </View>

        {/* ── ASSIGNED SOLVERS ── */}
        {analytics.solvers && analytics.solvers.length > 0 && (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Assigned Solvers</Text>
            <View style={styles.solverList}>
              {analytics.solvers.map(solver => (
                <TouchableOpacity
                  key={solver.id}
                  style={[styles.solverChip, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}
                  activeOpacity={0.7}
                  onPress={() => router.push({
                    pathname: '/(main)/(tabs)/dashboard/solver-profile',
                    params: { id: solver.id }
                  })}
                >
                  <Avatar name={solver.name} size="small" />
                  <Text style={[styles.solverName, { color: theme.text }]} numberOfLines={1}>
                    {solver.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── RECENT COMPLAINTS PLACEHOLDER ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Complaints</Text>
          {(analytics.complaints_count || 0) > 0 ? (
             <View style={styles.placeholderBox}>
                <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                <Text style={{color: theme.textSecondary, marginLeft: 8}}>Complaint details are loaded in the Complaints screen.</Text>
             </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No complaints reported for this site.</Text>
          )}
        </View>

        {/* ── RECENT ISSUES PLACEHOLDER ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Issues</Text>
          {(analytics.total_issues || 0) > 0 ? (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push({ pathname: '/(main)/(tabs)/issues', params: { site_id: id } })}
            >
              <Text style={{color: '#3b82f6', fontWeight: '600'}}>View all issues for this site →</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent activity reported.</Text>
          )}
        </View>

        {/* ── BUDGET MTD SECTION ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>Budget — MTD Summary</Text>
            <View style={[styles.mtdBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff' }]}>
              <Text style={[styles.mtdBadgeText, { color: theme.primary }]}>This Month</Text>
            </View>
          </View>

          {budgetLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 16 }} />
          ) : budgetError ? (
            <View style={styles.budgetErrorBox}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, marginLeft: 8 }]}>{budgetError}</Text>
            </View>
          ) : (
            <View style={styles.budgetGrid}>
              <View style={[styles.budgetMetric, { backgroundColor: isDark ? 'rgba(234,179,8,0.08)' : '#fefce8', borderColor: isDark ? 'rgba(234,179,8,0.2)' : '#fef08a' }]}>
                <Ionicons name="time-outline" size={20} color="#ca8a04" />
                <Text style={[styles.budgetValue, { color: '#ca8a04' }]}>
                  ₹{((budgetSummary?.pending_spend || 0) / 100).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Pending</Text>
              </View>

              <View style={[styles.budgetMetric, { backgroundColor: isDark ? 'rgba(16,163,127,0.08)' : '#f0fdf4', borderColor: isDark ? 'rgba(16,163,127,0.2)' : '#bbf7d0' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#10a37f" />
                <Text style={[styles.budgetValue, { color: '#10a37f' }]}>
                  ₹{((budgetSummary?.approved_spend || 0) / 100).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Approved</Text>
              </View>

              <View style={[styles.budgetMetric, { backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2', borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#fecaca' }]}>
                <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                <Text style={[styles.budgetValue, { color: '#ef4444' }]}>
                  ₹{((budgetSummary?.rejected_spend || 0) / 100).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Rejected</Text>
              </View>

              <View style={[styles.budgetMetric, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff', borderColor: isDark ? 'rgba(59,130,246,0.2)' : '#bfdbfe' }]}>
                <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                <Text style={[styles.budgetValue, { color: theme.primary }]}>
                  {budgetSummary?.total_requests ?? '—'}
                </Text>
                <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Total Requests</Text>
              </View>
            </View>
          )}

          {budgetSummary?.ceiling && (
            <View style={[styles.ceilingRow, { borderTopColor: borderColor }]}>
              <Text style={[styles.ceilingLabel, { color: theme.textSecondary }]}>Monthly Ceiling</Text>
              <Text style={[styles.ceilingValue, { color: theme.text }]}>
                ₹{(budgetSummary.ceiling / 100).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </View>

        {/* ── BUDGET SPEND TREND CHART ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
              Spend Trend
            </Text>
            <View style={[styles.mtdBadge, { backgroundColor: isDark ? 'rgba(16,163,127,0.1)' : '#f0fdf4' }]}>
              <Text style={[styles.mtdBadgeText, { color: '#10a37f' }]}>Last 6 Months</Text>
            </View>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 16 }} />
          ) : budgetHistory && Array.isArray(budgetHistory) && budgetHistory.length > 0 ? (
            (() => {
              const labels = budgetHistory.map(d => d.month_label || d.month || '');
              const dataPoints = budgetHistory.map(d => Math.round((d.approved_spend || 0) / 100));
              const hasData = dataPoints.some(v => v > 0);
              return hasData ? (
                <LineChart
                  data={{
                    labels,
                    datasets: [{ data: dataPoints }],
                  }}
                  width={SCREEN_WIDTH - 64}
                  height={180}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  formatYLabel={(v) => {
                    const num = parseInt(v);
                    if (num >= 100000) return `${(num/100000).toFixed(1)}L`;
                    if (num >= 1000) return `${(num/1000).toFixed(0)}K`;
                    return `${num}`;
                  }}
                  chartConfig={{
                    backgroundColor: surfaceColor,
                    backgroundGradientFrom: surfaceColor,
                    backgroundGradientTo: surfaceColor,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(16, 163, 127, ${opacity})`,
                    labelColor: () => theme.textSecondary,
                    style: { borderRadius: 12 },
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#10a37f' },
                    propsForBackgroundLines: { stroke: isDark ? '#2a2a2a' : '#f0f0f0' },
                  }}
                  bezier
                  style={{ marginTop: 12, borderRadius: 12 }}
                />
              ) : (
                <Text style={[styles.emptyText, { color: theme.textSecondary, marginTop: 12 }]}>
                  No approved spend data for the last 6 months.
                </Text>
              );
            })()
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary, marginTop: 12 }]}>
              {budgetHistory === null ? 'Could not load spend history.' : 'No history data available.'}
            </Text>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Site Data..." color={theme.primary} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  content: { flex: 1 },
  card: { marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 16, borderWidth: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  siteName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  siteLocation: { fontSize: 14 },
  healthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  healthText: { fontSize: 12, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.1)' },
  scoreBox: { alignItems: 'center', flex: 1 },
  scoreValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  scoreLabel: { fontSize: 12, fontWeight: '500' },
  divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: 'rgba(0,0,0,0.1)' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  chartContainer: { alignItems: 'center' },
  solverList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  solverChip: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 12, borderRadius: 20, gap: 8 },
  solverName: { fontSize: 13, fontWeight: '600', maxWidth: 80 },
  placeholderBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' },
  viewAllButton: { padding: 12, alignItems: 'center' },
  emptyText: { fontSize: 13, fontStyle: 'italic' },
  bottomPadding: { height: 40 },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  mtdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  mtdBadgeText: { fontSize: 11, fontWeight: '700' },
  budgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  budgetMetric: {
    flex: 1, minWidth: '44%', alignItems: 'center', padding: 16,
    borderRadius: 14, borderWidth: 1, gap: 6,
  },
  budgetValue: { fontSize: 18, fontWeight: '800' },
  budgetLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  budgetErrorBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  ceilingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  ceilingLabel: { fontSize: 13, fontWeight: '600' },
  ceilingValue: { fontSize: 15, fontWeight: '800' },
});