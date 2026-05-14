import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import { selectAllSites, fetchSitesWithAnalytics } from '../../../src/store/slices/sitesSlice';
import { 
  createBudgetRequest, 
  classifyAmount, 
  selectBudgetClassification,
  clearClassification
} from '../../../src/store/slices/budgetSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';

import Toast from '../../../src/components/common/Toast';

const fmtInr = (n) => '\u20B9' + new Intl.NumberFormat('en-IN').format(Math.round(n));

export default function NewBudgetRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const me = useSelector(selectCurrentUser);
  const allSites = useSelector(selectAllSites);
  const classification = useSelector(selectBudgetClassification);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [siteId, setSiteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Filter sites for this supervisor (defensive)
  const mySites = allSites; // Backend usually scopes this, but we show what we have

  useEffect(() => {
    dispatch(fetchSitesWithAnalytics());
    return () => dispatch(clearClassification());
  }, [dispatch]);

  useEffect(() => {
    if (mySites.length > 0 && !siteId) {
      setSiteId(mySites[0].id);
    }
  }, [mySites, siteId]);

  // Debounced Classification
  useEffect(() => {
    const numericAmount = parseInt(amount.replace(/[^\d]/g, ''), 10) || 0;
    if (numericAmount <= 0) {
      dispatch(clearClassification());
      return;
    }

    const timer = setTimeout(() => {
      dispatch(classifyAmount(numericAmount * 100)); // Convert to paise
    }, 400);

    return () => clearTimeout(timer);
  }, [amount, dispatch]);

  const handleSave = async () => {
    const numericAmount = parseInt(amount.replace(/[^\d]/g, ''), 10) || 0;
    
    console.log('DEBUG: Submit attempt', { title, numericAmount, reason, siteId });

    if (!title.trim() || numericAmount <= 0 || !reason.trim()) {
      setToast({ message: 'Title, amount, and reason are required.', type: 'error' });
      return;
    }
    if (!siteId) {
      setToast({ message: 'Please pick a site.', type: 'error' });
      return;
    }

    setSaving(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const selectedSite = mySites.find(s => s.id === siteId);
    const payload = {
      title,
      amount_paise: numericAmount * 100,
      site_id: siteId,
      site_name: selectedSite?.name || 'Taramani Site',
      reason,
    };

    const resultAction = await dispatch(createBudgetRequest(payload));
    setSaving(false);

    console.log('DEBUG: Create Request Server Response:', JSON.stringify(resultAction.payload, null, 2));

    if (createBudgetRequest.fulfilled.match(resultAction)) {
      const res = resultAction.payload;
      
      // Clear form
      setTitle('');
      setAmount('');
      setReason('');
      dispatch(clearClassification());

      // Show success toast
      setToast({ 
        message: res.status === 'APPROVED' ? 'Request auto-approved ✓' : 'Request submitted successfully!', 
        type: 'success' 
      });

      // Redirect after toast visible
      setTimeout(() => {
        router.push('/(main)/(tabs)/budget');
      }, 2000);

    } else {
      setToast({ message: resultAction.payload || 'Failed to submit request.', type: 'error' });
    }
  };

  const getTierMeta = (tier) => {
    // Standardize to lowercase for comparison
    const t = (tier || '').toLowerCase();
    switch (t) {
      case 'auto_approve':
        return { label: 'Will auto-approve', tone: 'success', icon: 'checkmark-circle-outline' };
      case 'md_approval':
        return { label: 'Needs MD approval', tone: 'warning', icon: 'time-outline' };
      case 'customer_md_approval':
      case 'cmd_approval':
      case 'md_plus_customer_md': // Matches API log
        return { label: 'Needs Customer MD approval', tone: 'orange', icon: 'arrow-up-circle-outline' };
      default:
        return null;
    }
  };

  // The API returns { classification: '...' }
  const tierValue = classification?.classification || classification?.tier;
  const tierMeta = tierValue ? getTierMeta(tierValue) : null;
  const toneFg = tierMeta?.tone === 'success' ? theme.success : tierMeta?.tone === 'warning' ? theme.warning : (tierMeta?.tone === 'orange' ? '#ff8c00' : theme.danger);
  const toneBg = isDark 
    ? (tierMeta?.tone === 'success' ? 'rgba(52, 199, 89, 0.15)' : tierMeta?.tone === 'warning' ? 'rgba(255, 159, 10, 0.15)' : (tierMeta?.tone === 'orange' ? 'rgba(255, 140, 0, 0.15)' : 'rgba(255, 69, 58, 0.15)'))
    : (tierMeta?.tone === 'success' ? theme.successLight : tierMeta?.tone === 'warning' ? theme.warningLight : (tierMeta?.tone === 'orange' ? '#fff7ed' : theme.dangerLight));

  return (
    <RoleGuard action="write:raiseBudgetRequest">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onHide={() => setToast(null)} 
          />
        )}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>New Request</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeInDown.duration(500)}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Purpose of Spend *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Purchase of lift ropes"
                placeholderTextColor={isDark ? '#666' : '#999'}
                style={[styles.input, { color: theme.text, backgroundColor: isDark ? '#1C1C1E' : theme.inputBackground, borderColor: theme.border }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Amount (INR) *</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor={isDark ? '#666' : '#999'}
                style={[styles.input, { color: theme.text, backgroundColor: isDark ? '#1C1C1E' : theme.inputBackground, borderColor: theme.border, fontSize: 18, fontWeight: '700' }]}
              />

              {tierMeta && (
                <Animated.View 
                  entering={FadeInUp} 
                  layout={Layout.springify()}
                  style={[styles.classBanner, { backgroundColor: toneBg, borderColor: toneFg + '44' }]}
                >
                  <Ionicons name={tierMeta.icon} size={18} color={toneFg} />
                  <Text style={[styles.classText, { color: toneFg }]}>
                    {tierMeta.label}
                  </Text>
                </Animated.View>
              )}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Select Site *</Text>
              <View style={styles.sitesWrap}>
                {mySites.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      setSiteId(s.id);
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                    }}
                    style={[
                      styles.siteChip,
                      {
                        backgroundColor: siteId === s.id ? theme.primary : (isDark ? '#1C1C1E' : theme.inputBackground),
                        borderColor: siteId === s.id ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: siteId === s.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '700' }}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Justification / Reason *</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                placeholder="Why is this required?"
                placeholderTextColor={isDark ? '#666' : '#999'}
                style={[styles.input, styles.multi, { color: theme.text, backgroundColor: isDark ? '#1C1C1E' : theme.inputBackground, borderColor: theme.border }]}
              />

              <TouchableOpacity
                style={[
                  styles.saveBtn, 
                  { 
                    backgroundColor: isDark ? '#fff' : theme.primary, 
                    shadowColor: isDark ? '#fff' : theme.primary 
                  }
                ]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={isDark ? theme.primary : "#fff"} />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={18} color={isDark ? theme.primary : "#fff"} />
                    <Text style={[styles.saveText, { color: isDark ? theme.primary : "#fff" }]}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  body: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 60 },
  fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15 },
  multi: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  classBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  classText: { fontSize: 13, fontWeight: '700' },
  sitesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  siteChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  saveBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, 
    marginTop: 32, paddingVertical: 16, borderRadius: 16,
    elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
