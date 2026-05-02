import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatOverdueText } from '../../utils/overdue';

const getStatusColor = (status) => {
  const colors = {
    OPEN: '#3b82f6',
    ASSIGNED: '#8b5cf6',
    IN_PROGRESS: '#eab308',
    RESOLVED_PENDING_REVIEW: '#f97316',
    COMPLETED: '#10a37f',
    REOPENED: '#ef4444',
    ESCALATED: '#dc2626',
  };
  return colors[status] || '#8e8ea0';
};

const IssueCard = ({ issue, onPress }) => {
  const { theme, isDark } = useTheme();

  const deadlineText = formatOverdueText(issue.deadline_at, issue.status);
  const statusColor = getStatusColor(issue.status);

  const formatTrackStatus = (statusStr) => {
    if (!statusStr) return '';
    return statusStr.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const thumbnailUri = issue.images && issue.images.length > 0 ? issue.images[0].image_url : null;

  // ── Per-theme card surface ──
  const cardBg = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e2e8f0';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: borderColor,
        }
      ]}
    >
      <View style={styles.contentContainer}>
        {/* ── Header: ID & Status ── */}
        <View style={styles.header}>
          <Text style={[styles.issueId, { color: theme.textSecondary }]}>
            ISSUE #{issue.id}
          </Text>
          <View style={styles.statusRow}>
            {issue.priority === 'high' && (
              <Ionicons name="alert-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
            )}
            <View style={[styles.cleanBadge, { backgroundColor: `${statusColor}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.cleanBadgeText, { color: statusColor }]}>
                {issue.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Body: Title & Meta ── */}
        <View style={styles.body}>
          <View style={styles.bodyLeft}>
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={2}
            >
              {issue.title}
            </Text>

            <View style={styles.details}>
              <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} /> {issue.site_name || 'Unknown'}
              </Text>
              <Text style={[styles.detailDot, { color: theme.textSecondary }]}>•</Text>
              <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                <Ionicons name="person-outline" size={12} /> {issue.supervisor_name || 'System'}
              </Text>
            </View>

            {issue.track_status && (
              <Text style={[styles.trackText, { color: statusColor }]}>
                ↳ {formatTrackStatus(issue.track_status)}
              </Text>
            )}
          </View>

          {/* Thumbnail */}
          {thumbnailUri && (
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          )}
        </View>

        {/* ── Footer ── */}
        <View style={[styles.footer, { borderTopColor: isDark ? '#333' : '#f1f5f9' }]}>
          <View style={styles.deadline}>
            <Ionicons name="calendar-clear-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.deadlineText, { color: theme.textSecondary }]}>
              {deadlineText}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  issueId: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cleanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cleanBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  bodyLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '400',
  },
  detailDot: {
    fontSize: 12,
    opacity: 0.5,
  },
  trackText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default IssueCard;