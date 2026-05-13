import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { X, Plus } from 'lucide-react-native';
import { api, Payment } from '../../lib/api';
import { colors, spacing, radii, type, formatINR } from '../../constants/theme';

export default function PaymentsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const loanId = params.id as string;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/loans/${loanId}/payments`);
      setPayments(r.data || []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const addPayment = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    setAdding(true);
    try {
      await api.post(`/loans/${loanId}/payments`, { amount: amt, note: note.trim() || undefined });
      setAmount('');
      setNote('');
      await load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.detail || 'Try again');
    } finally {
      setAdding(false);
    }
  };

  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="payments-close-button" onPress={() => router.back()}>
          <X size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Repayments</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total repaid</Text>
            <Text style={styles.totalValue}>{formatINR(total)}</Text>
            <Text style={styles.totalSub}>{payments.length} payment{payments.length === 1 ? '' : 's'}</Text>
          </View>

          <Text style={styles.section}>Record a payment</Text>
          <TextInput
            testID="payment-amount-input"
            style={[styles.input, styles.amount]}
            placeholder="₹0"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            testID="payment-note-input"
            style={styles.input}
            placeholder="Note (optional)"
            placeholderTextColor={colors.text.tertiary}
            value={note}
            onChangeText={setNote}
          />
          <TouchableOpacity testID="payment-add-button" style={styles.addBtn} onPress={addPayment} disabled={adding}>
            {adding ? <ActivityIndicator color="#fff" /> : (
              <>
                <Plus size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add payment</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.section, { marginTop: spacing.xl }]}>History</Text>
          {loading ? (
            <ActivityIndicator color={colors.brand.public} />
          ) : payments.length === 0 ? (
            <Text style={styles.empty}>No payments yet.</Text>
          ) : (
            payments.map((p) => (
              <View key={p.payment_id} style={styles.row} testID={`payment-row-${p.payment_id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowAmt}>{formatINR(p.amount)}</Text>
                  <Text style={styles.rowMeta}>{new Date(p.paid_at).toLocaleDateString()}{p.note ? ` • ${p.note}` : ''}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.layout, paddingVertical: spacing.md },
  headerTitle: { ...type.h3 },
  scroll: { padding: spacing.layout, paddingBottom: spacing.xxxl },
  totalCard: { backgroundColor: colors.brand.public, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: 'WorkSans_500Medium', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  totalValue: { color: '#fff', fontFamily: 'IBMPlexMono_700Bold', fontSize: 36, marginTop: spacing.sm },
  totalSub: { color: 'rgba(255,255,255,0.85)', fontFamily: 'WorkSans_500Medium', marginTop: 4 },
  section: { ...type.caption, marginBottom: spacing.sm },
  input: { backgroundColor: colors.bg.secondary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontFamily: 'WorkSans_400Regular', fontSize: 15, color: colors.text.primary, marginBottom: spacing.sm },
  amount: { fontFamily: 'IBMPlexMono_700Bold', fontSize: 24, paddingVertical: spacing.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.brand.public, borderRadius: radii.pill, paddingVertical: 16, marginTop: spacing.sm },
  addBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15 },
  empty: { ...type.body, color: colors.text.tertiary, paddingVertical: spacing.md },
  row: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.ui.border },
  rowAmt: { fontFamily: 'IBMPlexMono_700Bold', fontSize: 18, color: colors.text.primary },
  rowMeta: { ...type.body, color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
});
