import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import Avatar from '../../../src/components/common/Avatar';
import { backToDashboard } from '../../../src/utils/navigation';
import { fetchCustomerMDs } from '../../../src/services/api';

/**
 * Customer MD directory (MD-only).
 * Reached from MD Dashboard → Customer's MD card.
 */
export default function CustomerMDCardRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const [customerMDs, setCustomerMDs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchCustomerMDs();
        if (res.success && Array.isArray(res.customerMDs)) {
          setCustomerMDs(res.customerMDs);
        }
      } catch (err) {
        console.error('Error loading Customer MDs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <RoleGuard action="view:customerMDCard">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="customermds-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Customer{'\u2019'}s MDs</Text>
          <View style={{ width: 22 }} />
        </View>
        <FlatList
          data={customerMDs}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const rawSites = item.sites;
            const sitesArr = Array.isArray(rawSites) ? rawSites : [];
            const siteNames = sitesArr.map(s => typeof s === 'object' ? s.name : s).filter(Boolean);
            const sitesLabel = siteNames.length > 0 
              ? (siteNames.slice(0, 2).join(' · ') + (siteNames.length > 2 ? ` +${siteNames.length - 2}` : ''))
              : 'No sites assigned';

            const pendingEscalations = item.stats?.pending_escalations ?? item.pending_escalations ?? 0;

            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                testID={`customermd-item-${item.id}`}
                onPress={() => router.push(`/customer-mds/${item.id}`)}
              >
                <Avatar name={item.name} uri={item.avatar_url || item.avatar} size={44} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.company || 'Customer MD'}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="business-outline" size={12} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {sitesLabel}
                    </Text>
                  </View>
                </View>
                {pendingEscalations > 0 ? (
                  <View style={[styles.badge, { backgroundColor: theme.errorLight || '#fee2e2' }]}>
                    <Text style={[styles.badgeText, { color: theme.error || '#ef4444' }]}>{pendingEscalations} pending</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingVertical: 12, paddingHorizontal: 16, gap: 10, paddingBottom: 80 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
