import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, CheckCircle2, XCircle, Trash2, Wallet, Pencil } from 'lucide-react-native';
import { useAuth } from '../../lib/AuthContext';
import { api, Loan } from '../../lib/api';
import {
  getPrivateLoan,
  updatePrivateLoan,
  deletePrivateLoan,
  computeMetrics,
} from '../../lib/privateStorage';
import { confirm } from '../../lib/confirm';
import { colors, spacing, radii, type, formatINR } from '../../constants/theme';

export default function LoanDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const { user } = useAuth();
  const loanId = params.id as string;
  const mode = (params.mode as 'private' | 'public') || 'public';
  const accent = mode === 'private' ? colors.brand.private : colors.brand.public;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (mode === 'public') {
        const r = await api.get(`/loans/${loanId}`);
        setLoan(r.data);
      } else {
        const l = await getPrivateLoan(user.user_id, loanId);
        if (l) setLoan(computeMetrics(l) as unknown as Loan);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  }, [loanId, mode, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onEdit = () => {
    router.push(`/add-loan?edit=${loanId}&mode=${mode}`);
  };

  const updateStatus = async (status: 'settled' | 'closed') => {
    if (busyRef.current) return;
    const ok = await confirm({
      title: status === 'settled' ? 'Mark as settled?' : 'Close this loan?',
      message: status === 'settled'
        ? 'This marks the loan as fully repaid.'
        : 'Closing a loan archives it. You can still view it later.',
      confirmText: status === 'settled' ? 'Mark settled' : 'Close loan',
      cancelText: 'Cancel',
      destructive: status === 'closed',
    });
    if (!ok) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (mode === 'public') {
        await api.patch(`/loans/${loanId}`, { status });
      } else if (user) {
        await updatePrivateLoan(user.user_id, loanId, { status });
      }
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to update');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const reopen = async () => {
    if (busyRef.current) return;
    const ok = await confirm({
      title: 'Reopen loan?',
      message: 'This will mark the loan as active again.',
      confirmText: 'Reopen',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (mode === 'public') {
        await api.patch(`/loans/${loanId}`, { status: 'active' });
      } else if (user) {
        await updatePrivateLoan(user.user_id, loanId, { status: 'active' });
      }
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to update');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (busyRef.current) return;
    const ok = await confirm({
      title: 'Delete loan?',
      message: 'This will permanently remove the loan and any recorded payments. This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (!ok) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (mode === 'public') {
        await api.delete(`/loans/${loanId}`);
      } else if (user) {
        await deletePrivateLoan(user.user_id, loanId);
      }
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to delete');
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (loading || !loan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="loan-detail-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity testID="loan-edit-button" onPress={onEdit} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Pencil size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={[styles.modeBadge, { backgroundColor: accent }]}>
            <Text style={styles.modeBadgeText}>{loan.mode.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { backgroundColor: accent }]}>
          <Text style={styles.heroLabel}>Total due</Text>
          <Text style={styles.heroAmount} testID="loan-detail-total-due">{formatINR(loan.total_due)}</Text>
          <Text style={styles.heroSub}>
            {loan.direction === 'lent' ? 'Owed to you by' : 'You owe'} {loan.counterparty_name}
          </Text>
        </View>

        <View style={styles.metrics}>
          <Metric label="Principal" value={formatINR(loan.principal_amount)} />
          <Metric label="Interest rate" value={`${loan.interest_rate}% p.a.`} />
          <Metric label="Monthly interest" value={formatINR(loan.monthly_interest)} />
          <Metric label="Accrued interest" value={formatINR(loan.accrued_interest)} />
          <Metric label="Months elapsed" value={String(loan.months_elapsed)} />
          <Metric label="Status" value={loan.status.toUpperCase()} />
        </View>

        <Text style={styles.section}>Details</Text>
        <DetailRow label="Counterparty" value={loan.counterparty_name} />
        {loan.counterparty_email ? <DetailRow label="Email" value={loan.counterparty_email} /> : null}
        {loan.counterparty_phone ? <DetailRow label="Phone" value={loan.counterparty_phone} /> : null}
        <DetailRow label="Start date" value={loan.start_date} />
        {loan.due_date ? <DetailRow label="Due date" value={loan.due_date} /> : null}
        <DetailRow label="Reminder" value={loan.reminder_enabled ? `Day ${loan.reminder_day} monthly` : 'Off'} />
        {loan.notes ? <DetailRow label="Notes" value={loan.notes} /> : null}

        {/* Actions */}
        {loan.mode === 'public' && loan.status === 'active' && (
          <TouchableOpacity
            testID="loan-payments-button"
            style={[styles.paymentsBtn, { borderColor: accent }]}
            onPress={() => router.push(`/payments/${loan.loan_id}`)}
          >
            <Wallet size={18} color={accent} />
            <Text style={[styles.paymentsBtnText, { color: accent }]}>
              {loan.total_paid && loan.total_paid > 0
                ? `View repayments • ${'\u20B9'}${loan.total_paid.toLocaleString('en-IN')} paid`
                : 'Record a repayment'}
            </Text>
          </TouchableOpacity>
        )}

        {loan.status === 'active' && (
          <View style={styles.actions}>
            <TouchableOpacity
              testID="loan-settle-button"
              style={[styles.actionBtn, { backgroundColor: colors.status.settled }, busy && { opacity: 0.6 }]}
              onPress={() => updateStatus('settled')}
              disabled={busy}
            >
              <CheckCircle2 size={18} color="#fff" />
              <Text style={styles.actionText}>Mark settled</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="loan-close-button"
              style={[styles.actionBtn, { backgroundColor: colors.text.secondary }, busy && { opacity: 0.6 }]}
              onPress={() => updateStatus('closed')}
              disabled={busy}
            >
              <XCircle size={18} color="#fff" />
              <Text style={styles.actionText}>Close loan</Text>
            </TouchableOpacity>
          </View>
        )}

        {(loan.status === 'settled' || loan.status === 'closed') && (
          <TouchableOpacity
            testID="loan-reopen-button"
            style={[styles.actionBtn, { backgroundColor: accent, marginTop: spacing.lg }, busy && { opacity: 0.6 }]}
            onPress={reopen}
            disabled={busy}
          >
            <CheckCircle2 size={18} color="#fff" />
            <Text style={styles.actionText}>Reopen loan</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity testID="loan-delete-button" style={[styles.deleteBtn, busy && { opacity: 0.6 }]} onPress={onDelete} disabled={busy}>
          <Trash2 size={16} color={colors.status.overdue} />
          <Text style={styles.deleteText}>Delete loan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.layout,
    paddingVertical: spacing.md,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  modeBadgeText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1 },
  scroll: { padding: spacing.layout, paddingBottom: spacing.xxxl },
  hero: { padding: spacing.lg, borderRadius: radii.lg, marginBottom: spacing.md },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: 'WorkSans_500Medium', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  heroAmount: { color: '#fff', fontFamily: 'IBMPlexMono_700Bold', fontSize: 40, letterSpacing: -1, marginTop: spacing.sm },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontFamily: 'WorkSans_500Medium', marginTop: spacing.sm, fontSize: 14 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  metric: {
    flexBasis: '48%',
    backgroundColor: colors.ui.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  metricLabel: { ...type.caption, fontSize: 11 },
  metricValue: { fontFamily: 'IBMPlexMono_700Bold', fontSize: 16, marginTop: 4, color: colors.text.primary },
  section: { ...type.caption, marginTop: spacing.md, marginBottom: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  detailLabel: { ...type.body, color: colors.text.tertiary, fontSize: 13 },
  detailValue: { ...type.bodyMed, fontFamily: 'WorkSans_500Medium', maxWidth: '60%', textAlign: 'right' },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.pill,
  },
  actionText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  deleteText: { color: colors.status.overdue, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  paymentsBtn: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: spacing.md,
    backgroundColor: colors.ui.surface,
  },
  paymentsBtnText: { fontFamily: 'Manrope_700Bold', fontSize: 14 },
});
