import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Check, X, Inbox } from 'lucide-react-native';
import { api, Loan } from '../lib/api';
import { colors, spacing, radii, type, formatINR } from '../constants/theme';

export default function IncomingLoans() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/loans/incoming');
      setLoans(r.data || []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const onAction = async (loanId: string, action: 'accept' | 'reject') => {
    setActingId(loanId);
    try {
      await api.post(`/loans/${loanId}/${action}`);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActingId(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="inbox-back-button" onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Inbox</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle}>Loan requests awaiting your acknowledgment</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand.public} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.public} />}
        >
          {loans.length === 0 ? (
            <View style={styles.empty} testID="inbox-empty-state">
              <Inbox size={48} color={colors.text.tertiary} strokeWidth={1.4} />
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySub}>When someone shares a loan with you, it will appear here for acknowledgment.</Text>
            </View>
          ) : (
            loans.map((l) => (
              <View key={l.loan_id} style={styles.card} testID={`incoming-card-${l.loan_id}`}>
                <Text style={styles.cardTitle}>{l.owner_name || 'Someone'} added a loan</Text>
                <Text style={styles.cardSub}>
                  {l.direction === 'lent' ? 'They lent you' : 'You lent them'} {formatINR(l.principal_amount)} @ {l.interest_rate}% p.a.
                </Text>
                <View style={styles.metricsRow}>
                  <Text style={styles.metricMute}>Monthly interest</Text>
                  <Text style={styles.metricValue}>{formatINR(l.monthly_interest)}</Text>
                </View>
                {l.due_date ? (
                  <View style={styles.metricsRow}>
                    <Text style={styles.metricMute}>Due date</Text>
                    <Text style={styles.metricValue}>{l.due_date}</Text>
                  </View>
                ) : null}
                {l.notes ? <Text style={styles.notes}>“{l.notes}”</Text> : null}

                <View style={styles.actions}>
                  <TouchableOpacity
                    testID={`reject-${l.loan_id}`}
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => onAction(l.loan_id, 'reject')}
                    disabled={actingId === l.loan_id}
                  >
                    <X size={18} color={colors.status.overdue} />
                    <Text style={[styles.actionText, { color: colors.status.overdue }]}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`accept-${l.loan_id}`}
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => onAction(l.loan_id, 'accept')}
                    disabled={actingId === l.loan_id}
                  >
                    {actingId === l.loan_id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Check size={18} color="#fff" />
                        <Text style={[styles.actionText, { color: '#fff' }]}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.layout, paddingVertical: spacing.md },
  title: { ...type.h3 },
  subtitle: { ...type.body, color: colors.text.tertiary, paddingHorizontal: spacing.layout, marginBottom: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.layout, paddingBottom: spacing.xxxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...type.h3, marginTop: spacing.md },
  emptySub: { ...type.body, color: colors.text.tertiary, textAlign: 'center', maxWidth: 260 },
  card: {
    backgroundColor: colors.ui.surface,
    borderWidth: 1,
    borderColor: colors.ui.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: { ...type.bodyMed, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  cardSub: { ...type.body, color: colors.text.secondary, marginTop: 4 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  metricMute: { ...type.body, color: colors.text.tertiary, fontSize: 13 },
  metricValue: { fontFamily: 'IBMPlexMono_700Bold', fontSize: 14, color: colors.text.primary },
  notes: { ...type.body, color: colors.text.secondary, fontStyle: 'italic', marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: 14, borderRadius: radii.pill },
  rejectBtn: { borderWidth: 1, borderColor: colors.status.overdue, backgroundColor: 'transparent' },
  acceptBtn: { backgroundColor: colors.brand.public },
  actionText: { fontFamily: 'Manrope_700Bold', fontSize: 14 },
});
