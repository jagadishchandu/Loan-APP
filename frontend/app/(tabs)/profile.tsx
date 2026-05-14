import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Crown, LogOut, ChevronRight, Shield, Mail, Phone, Inbox, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../../lib/AuthContext';
import { confirm } from '../../lib/confirm';
import { colors, spacing, radii, type } from '../../constants/theme';

export default function Profile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const tierLabel = user?.subscription_tier === 'public' ? 'Public Pro' : user?.subscription_tier === 'private' ? 'Private Pro' : 'Free';

  const onLogout = async () => {
    if (loggingOut) return;
    const ok = await confirm({
      title: 'Sign out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign out',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (!ok) return;
    try {
      setLoggingOut(true);
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.contactRow}>
            <Mail size={14} color={colors.text.tertiary} />
            <Text style={styles.contactText}>{user?.email}</Text>
          </View>
          {user?.phone ? (
            <View style={styles.contactRow}>
              <Phone size={14} color={colors.text.tertiary} />
              <Text style={styles.contactText}>{user.phone}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity testID="open-subscription-button" style={styles.subCard} onPress={() => router.push('/subscription')}>
          <Crown size={26} color={colors.brand.accent} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text style={styles.subTitle}>{tierLabel}</Text>
            <Text style={styles.subSub}>{tierLabel === 'Free' ? 'Upgrade to unlock premium' : 'Manage your plan'}</Text>
          </View>
          <ChevronRight size={20} color={colors.text.tertiary} />
        </TouchableOpacity>

        <View style={styles.section}>
          <TouchableOpacity testID="profile-inbox-row" onPress={() => router.push('/inbox')}>
            <Row icon={<Inbox size={20} color={colors.text.secondary} strokeWidth={1.8} />} title="Inbox" sub="Incoming loan requests to acknowledge" />
          </TouchableOpacity>
          <TouchableOpacity testID="profile-backup-row" onPress={() => router.push('/backup')}>
            <Row icon={<ShieldCheck size={20} color={colors.text.secondary} strokeWidth={1.8} />} title="Encrypted backup" sub="Export or restore your private loans" />
          </TouchableOpacity>
          <Row icon={<Shield size={20} color={colors.text.secondary} strokeWidth={1.8} />} title="Privacy & data" sub="Learn how your data is stored" />
        </View>

        <TouchableOpacity testID="logout-button" style={styles.logoutBtn} onPress={onLogout}>
          <LogOut size={18} color={colors.status.overdue} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>LendSplit v1.0 MVP</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <View style={styles.row}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <ChevronRight size={18} color={colors.text.tertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.layout, paddingBottom: spacing.xxxl },
  title: { ...type.h1, marginBottom: spacing.lg },
  userCard: {
    backgroundColor: colors.ui.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand.public, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 28 },
  userName: { ...type.h3, marginBottom: spacing.xs },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  contactText: { ...type.body, color: colors.text.tertiary, fontSize: 13 },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#F0DEB6',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  subTitle: { ...type.bodyMed, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  subSub: { ...type.body, color: colors.text.secondary, fontSize: 13, marginTop: 2 },
  section: { backgroundColor: colors.ui.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.ui.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowTitle: { ...type.bodyMed, fontFamily: 'Manrope_600SemiBold' },
  rowSub: { ...type.body, color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.status.overdue,
  },
  logoutText: { color: colors.status.overdue, fontFamily: 'Manrope_700Bold', fontSize: 15 },
  version: { ...type.caption, textAlign: 'center', marginTop: spacing.xl, color: colors.text.tertiary },
});
