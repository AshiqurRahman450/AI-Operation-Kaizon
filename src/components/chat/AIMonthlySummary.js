import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const fmtInr = (n) => '\u20B9' + new Intl.NumberFormat('en-IN').format(Math.round(n));

/**
 * AI Monthly Summary card pinned at the top of the Ops group chat (Kairox §14).
 * System-posted; renders as a distinctive card with 6 key metrics.
 */
const AIMonthlySummary = ({ summary, period }) => {
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!summary) return null;

  const gradientColors = isDark
    ? ['rgba(16,163,127,0.15)', 'rgba(16,163,127,0.05)']
    : ['#ecfdf5', '#f0fdf8'];

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
      testID="ai-monthly-summary"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(16,163,127,0.1)' : '#ecfdf5',
            borderColor: isDark ? 'rgba(34,197,94,0.3)' : '#bbf7d0',
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.aiIconBg, { backgroundColor: isDark ? 'rgba(34,197,94,0.2)' : '#d1fae5' }]}>
            <Ionicons name="sparkles" size={14} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.success }]}>AI Monthly Summary</Text>
            <Text style={[styles.period, { color: theme.textSecondary }]}>{period}</Text>
          </View>
          <View style={[styles.aiBadge, { backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : '#d1fae5' }]}>
            <Ionicons name="hardware-chip-outline" size={10} color={theme.success} />
            <Text style={[styles.aiBadgeText, { color: theme.success }]}>AI</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.grid}>
          <Stat theme={theme} isDark={isDark} label="Issues Raised" value={summary.issues_raised} icon="alert-circle-outline" />
          <Stat theme={theme} isDark={isDark} label="Issues Closed" value={summary.issues_closed} icon="checkmark-circle-outline" tone="success" />
          <Stat theme={theme} isDark={isDark} label="Complaints" value={summary.complaints} icon="warning-outline" tone="warning" />
          <Stat theme={theme} isDark={isDark} label="Escalations" value={summary.escalations} icon="trending-up-outline" tone="danger" />
          <Stat theme={theme} isDark={isDark} label="Budget Spent" value={fmtInr(summary.budget_spent)} icon="wallet-outline" wide />
        </View>

        {/* Footer insights */}
        {summary.top_decision && (
          <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.footerRow}>
              <Ionicons name="flag-outline" size={12} color={theme.textSecondary} />
              <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Top Decision</Text>
            </View>
            <Text style={[styles.footerValue, { color: theme.text }]}>{summary.top_decision}</Text>
          </View>
        )}
        {summary.top_supervisor && (
          <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.footerRow}>
              <Ionicons name="person-outline" size={12} color={theme.textSecondary} />
              <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Top Supervisor</Text>
            </View>
            <Text style={[styles.footerValue, { color: theme.text }]}>{summary.top_supervisor}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const Stat = ({ theme, isDark, label, value, tone, wide, icon }) => {
  const tint = tone === 'success' ? theme.success
    : tone === 'warning' ? theme.warning
    : tone === 'danger' ? theme.danger
    : theme.primary;
  return (
    <View style={[styles.stat, wide && { flexBasis: '100%' }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={13} color={tint} style={{ opacity: 0.8 }} />
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardOuter: { marginVertical: 8, alignSelf: 'stretch' },
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  aiIconBg: {
    width: 30, height: 30, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  period: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  aiBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexBasis: '47%',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  footer: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  footerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  footerValue: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});

export default AIMonthlySummary;
