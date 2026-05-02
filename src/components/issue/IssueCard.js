import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import StatusBadge from '../common/StatusBadge';
import { formatOverdueText, getDeadlineColor } from '../../utils/overdue';

// ── NEAT MINIMALIST STYLE ──

const IssueCard = ({ issue, onPress }) => {
  const { theme, isDark } = useTheme();

  const deadlineText = formatOverdueText(issue.deadline_at, issue.status);
  const deadlineColor = getDeadlineColor(issue.deadline_at, issue.status);

  const formatTrackStatus = (statusStr) => {
    if (!statusStr) return '';
    return statusStr.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const thumbnailUri = issue.images && issue.images.length > 0 ? issue.images[0].image_url : null;

  // ── Clean neutral card surface ──
  const cardBg = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const shadowColor = isDark ? '#000000' : '#000000';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: borderColor,
          borderWidth: 1,
          ...Platform.select({
            ios: {
              shadowColor: shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 8,
            },
            android: { elevation: isDark ? 4 : 2 },
          }),
        }
      ]}
    >
      {/* ── Content ── */}
      <View style={styles.contentContainer}>

        {/* ── Header: ID & Badges ── */}
        <View style={styles.header}>
          <View style={styles.idContainer}>
            <Text style={[styles.issueId, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }]}>
              #{issue.id}
            </Text>
            <StatusBadge status={issue.status} size="small" />
            <StatusBadge status={issue.priority} type="priority" size="small" />
          </View>
        </View>

        {/* ── Body: Title, Meta & Thumbnail ── */}
        <View style={styles.body}>
          <View style={styles.bodyLeft}>
            <Text
              style={[
                styles.title,
                { color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.87)' }
              ]}
              numberOfLines={2}
            >
              {issue.title}
            </Text>

            <View style={styles.details}>
              {/* Site Name */}
              <View style={styles.detailRow}>
                <Ionicons
                  name="location"
                  size={13}
                  color={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'}
                />
                <Text
                  style={[styles.detailText, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}
                  numberOfLines={1}
                >
                  {issue.site_name || 'Unknown Site'}
                </Text>
              </View>

              <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]} />

              {/* Raised By */}
              <View style={styles.detailRow}>
                <Ionicons
                  name="person"
                  size={13}
                  color={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'}
                />
                <Text
                  style={[styles.detailText, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}
                  numberOfLines={1}
                >
                  {issue.supervisor_name || 'System'}
                </Text>
              </View>
            </View>

            {/* Track Status Sub-badge */}
            {issue.track_status && (
              <View style={[
                styles.trackStatusContainer,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4',
                  borderColor: isDark ? '#333' : '#e5e5e5',
                }
              ]}>
                <View style={[styles.trackStatusDot, { backgroundColor: theme.primary }]} />
                <Text style={[
                  styles.trackStatusText,
                  { color: theme.textSecondary }
                ]}>
                  {formatTrackStatus(issue.track_status)}
                </Text>
              </View>
            )}
          </View>

          {/* Thumbnail */}
          {thumbnailUri && (
            <View style={[
              styles.thumbnailWrapper,
              {
                borderColor: borderColor,
              }
            ]}>
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={[
          styles.footer,
          {
            borderTopColor: isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.06)',
          }
        ]}>
          <View style={styles.deadline}>
            <Ionicons name="time-outline" size={14} color={deadlineColor} />
            <Text style={[styles.deadlineText, { color: deadlineColor }]}>
              {deadlineText}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <Text style={[styles.actionText, { color: theme.primary }]}>View Details</Text>
            <Ionicons name="arrow-forward" size={15} color={theme.primary} />
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },

  // ── Thin outer border layer is already applied to the card root ──
  // Removing absolute base surfaces to clean up the code
  contentContainer: {
    paddingLeft: 16,   // Restored normal padding
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  issueId: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  bodyLeft: {
    flex: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  trackStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  trackStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  trackStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.15,
  },

  // ── Thumbnail ──
  thumbnailWrapper: {
    borderRadius: 11,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 62,
    height: 62,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deadlineText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});

export default IssueCard;