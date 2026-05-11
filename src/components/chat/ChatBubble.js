import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Premium message bubble with entrance animation.
 * Left-aligned for messages from others, right-aligned for own messages.
 */
const ChatBubble = ({ text, isOwn, senderName, showSender, ts, tint }) => {
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isOwn ? 30 : -30)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 350, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, friction: 8, tension: 65, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 8, tension: 65, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const t = new Date(ts);
  const timeLabel = !isNaN(t)
    ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const bgOwn = tint || theme.primary;
  const bgOther = isDark ? '#1e2738' : '#f0f2f5';
  const textOwn = '#ffffff';
  const textOther = theme.text;

  return (
    <Animated.View
      style={[
        styles.wrap,
        isOwn ? styles.alignRight : styles.alignLeft,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {!isOwn && showSender && senderName && (
        <Text style={[styles.sender, { color: theme.primary }]}>{senderName}</Text>
      )}
      <View
        style={[
          styles.bubble,
          isOwn
            ? {
                backgroundColor: bgOwn,
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
                shadowColor: bgOwn,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }
            : {
                backgroundColor: bgOther,
                borderTopLeftRadius: 4,
                borderBottomLeftRadius: 4,
                borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
                borderColor: isDark ? 'transparent' : '#e2e5ea',
              },
        ]}
      >
        <Text style={[styles.text, { color: isOwn ? textOwn : textOther }]}>
          {text}
        </Text>
        {!!timeLabel && (
          <View style={styles.timeRow}>
            <Text
              style={[
                styles.time,
                { color: isOwn ? 'rgba(255,255,255,0.65)' : theme.textSecondary },
              ]}
            >
              {timeLabel}
            </Text>
            {isOwn && (
              <Ionicons
                name="checkmark-done"
                size={12}
                color="rgba(255,255,255,0.65)"
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginVertical: 3, maxWidth: '80%' },
  alignLeft: { alignSelf: 'flex-start' },
  alignRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  sender: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
    paddingHorizontal: 14,
    letterSpacing: 0.2,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
    maxWidth: '100%',
  },
  text: { fontSize: 14.5, lineHeight: 21, letterSpacing: 0.1 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  time: { fontSize: 10, fontWeight: '500' },
});

export default ChatBubble;
