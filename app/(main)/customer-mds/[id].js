import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import Avatar from '../../../src/components/common/Avatar';
import { fetchCustomerMDById } from '../../../src/services/api';

export default function CustomerMDDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [cmd, setCmd] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchCustomerMDById(id);
        if (res.success && res.cmd) {
          setCmd(res.cmd);
        }
      } catch (err) {
        console.error('Error loading customer MD detail:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleLink = async (url) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', "Can't open this link");
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!cmd) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Customer MD Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // Handle Statistics
  const budgetStatsObj = cmd.stats || {};
  const escalationsReceived = budgetStatsObj.escalations_received ?? budgetStatsObj.received ?? 0;
  const approvedCount = budgetStatsObj.approved ?? 0;
  const rejectedCount = budgetStatsObj.rejected ?? 0;
  const totalAmount = budgetStatsObj.total_approved_amount ?? budgetStatsObj.total_approved_amount_paise ? `£${((budgetStatsObj.total_approved_amount_paise||0)/100).toFixed(2)}` : (budgetStatsObj.total_approved_amount || '£0.00');

  const budgetStats = [
    { label: 'Escalations Received', value: escalationsReceived, icon: 'document-text-outline', color: '#6366f1' },
    { label: 'Approved', value: approvedCount, icon: 'checkmark-circle-outline', color: '#10b981' },
    { label: 'Rejected', value: rejectedCount, icon: 'close-circle-outline', color: '#ef4444' },
    { label: 'Total Approved', value: totalAmount, icon: 'cash-outline', color: '#f59e0b' },
  ];

  // Assigned Sites handling
  const assignedSites = Array.isArray(cmd.sites) 
    ? cmd.sites.map(s => typeof s === 'object' ? s : { id: s, name: `Site ${s}` })
    : [];

  // Premium Palette
  const bgColor = isDark ? '#111111' : '#f9fafb';
  const surfaceColor = isDark ? '#1c1c1c' : '#ffffff';
  const borderColor = isDark ? '#2e2e2e' : '#f1f5f9';
  const blueBadgeBg = isDark ? 'rgba(56,189,248,0.15)' : '#e0f2fe';
  const blueBadgeText = isDark ? '#38bdf8' : '#0284c7';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: surfaceColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Customer MD Profile</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={[styles.content, { backgroundColor: bgColor }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileSection, { backgroundColor: surfaceColor }]}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={cmd.avatar_url || cmd.avatar} name={cmd.name || 'CMD'} size="xlarge" />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{cmd.name || 'Customer MD'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: blueBadgeBg }]}>
            <Text style={[styles.roleText, { color: blueBadgeText }]}>CUSTOMER MD</Text>
          </View>
          {cmd.phone && <Text style={{ color: theme.textSecondary, marginTop: 6, fontWeight: '500' }}>{cmd.phone}</Text>}

          <View style={styles.contactActions}>
            {cmd.tel_link && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={() => handleLink(cmd.tel_link)}>
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {cmd.whatsapp_link && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25d366' }]} onPress={() => handleLink(cmd.whatsapp_link)}>
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="wallet-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>BUDGET APPROVAL STATS</Text>
          </View>
          <View style={styles.statsGrid}>
            {budgetStats.map((stat, index) => (
              <View key={index} style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={[styles.statIconWrap, { backgroundColor: stat.color + '15' }]}>
                  <Ionicons name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="business-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ASSIGNED SITES</Text>
          </View>
          <View style={[styles.infoContainer, { backgroundColor: surfaceColor, borderColor }]}>
            {assignedSites.length > 0 ? (
              assignedSites.map((site, index) => (
                <View key={site.id || index}>
                  <TouchableOpacity style={styles.siteRow} onPress={() => site.id && router.push({ pathname: '/(main)/site-detail', params: { id: site.id } })}>
                    <View style={[styles.siteIconCircle, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="location" size={18} color={theme.primary} />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={[styles.infoValue, { color: theme.text }]}>{site.name || 'Unknown Site'}</Text>
                      <Text style={styles.infoLabel}>{site.location || 'Active Site'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {index < assignedSites.length - 1 && <View style={[styles.separator, { backgroundColor: borderColor }]} />}
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No sites assigned.</Text>
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  content: { flex: 1 },
  profileSection: { alignItems: 'center', paddingTop: 30, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  avatarWrapper: { position: 'relative' },
  name: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 16, marginBottom: 8 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  contactActions: { flexDirection: 'row', gap: 16, marginTop: 20 },
  actionBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.0 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  infoContainer: { borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  siteRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  siteIconCircle: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  emptyText: { padding: 20, textAlign: 'center', fontSize: 13 },
  bottomPadding: { height: 60 },
});
