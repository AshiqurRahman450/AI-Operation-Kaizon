import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fetchBudgetBurnRates, selectBudgetBurnRates, selectBudgetLoading } from '../../../src/store/slices/budgetSlice';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import { normaliseRole, ROLES } from '../../../src/utils/roles';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function BudgetAnalyticsScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const userRole = normaliseRole(user?.role);

  const burnRates = useSelector(selectBudgetBurnRates);
  const loading = useSelector(selectBudgetLoading);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    dispatch(fetchBudgetBurnRates());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchBudgetBurnRates());
    setRefreshing(false);
  };

  const fmtCurrency = (paise) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  const getStatusInfo = (ratio) => {
    if (ratio > 0.9) return { label: 'CRITICAL', color: theme.danger };
    if (ratio > 0.7) return { label: 'WARNING', color: theme.warning };
    return { label: 'ON-TRACK', color: theme.success };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Budget Analytics</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
          <Ionicons name="refresh" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        <Animated.View entering={FadeIn.duration(600)}>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Month-to-date (MTD) spend vs monthly ceiling per site.
          </Text>
        </Animated.View>

        {loading && burnRates.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : burnRates.length > 0 ? (
          burnRates.map((br, idx) => {
            const status = getStatusInfo(br.burn_ratio || 0);
            const pct = Math.min(br.burn_ratio || 0, 1.0);

            return (
              <Animated.View
                key={br.site_id || idx}
                entering={FadeInDown.delay(idx * 100).duration(500)}
                style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : theme.card, borderColor: theme.border }]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.siteName, { color: theme.text }]} numberOfLines={1}>
                    {br.site_name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>MTD Spend</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{fmtCurrency(br.mtd_spend)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Monthly Ceiling</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{fmtCurrency(br.monthly_ceiling)}</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={[styles.barTrack, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(pct * 100)}%`,
                        backgroundColor: status.color
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.pctText, { color: status.color }]}>
                  {Math.round((br.burn_ratio || 0) * 100)}% of monthly budget utilized
                </Text>
              </Animated.View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="stats-chart-outline" size={48} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No burn-rate data available yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 4 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionDesc: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  center: { marginTop: 100, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  siteName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '600' },
  barTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  pctText: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 16, fontWeight: '500' },
});
