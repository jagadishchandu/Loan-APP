import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Upload, Download, Copy } from 'lucide-react-native';
import { useAuth } from '../lib/AuthContext';
import { exportEncryptedBackup, importEncryptedBackup } from '../lib/backup';
import { colors, spacing, radii, type } from '../constants/theme';

export default function Backup() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [passphrase, setPassphrase] = useState('');
  const [blob, setBlob] = useState('');
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    if (!user) return;
    if (passphrase.length < 6) {
      Alert.alert('Weak passphrase', 'Use at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const out = await exportEncryptedBackup(user.user_id, passphrase);
      setBlob(out);
      Alert.alert('Backup ready', 'Copy and store the text below somewhere safe (notes, cloud drive, password manager).');
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (!user) return;
    if (passphrase.length < 6) {
      Alert.alert('Missing passphrase', 'Enter the passphrase used at export time.');
      return;
    }
    if (!blob.trim()) {
      Alert.alert('No backup', 'Paste the backup text to restore.');
      return;
    }
    setBusy(true);
    try {
      const count = await importEncryptedBackup(user.user_id, blob.trim(), passphrase);
      Alert.alert('Restored', `${count} private loan${count === 1 ? '' : 's'} imported.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Import failed', e?.message || 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!blob) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(blob);
        Alert.alert('Copied', 'Backup string copied to clipboard.');
      } else {
        // RN clipboard is optional; not critical for MVP
        Alert.alert('Copy manually', 'Long-press the text to copy.');
      }
    } catch {
      Alert.alert('Copy failed', 'Please copy the text manually.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="backup-back-button" onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Encrypted backup</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.lockBadge}>
          <Lock size={28} color={colors.brand.public} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>Back up your private loans</Text>
        <Text style={styles.subtitle}>
          Private loans live only on this device. Use a passphrase to export an encrypted blob you can store anywhere and restore later.
        </Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            testID="backup-mode-export"
            style={[styles.tab, mode === 'export' && styles.tabActive]}
            onPress={() => setMode('export')}
          >
            <Text style={[styles.tabText, mode === 'export' && styles.tabTextActive]}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="backup-mode-import"
            style={[styles.tab, mode === 'import' && styles.tabActive]}
            onPress={() => setMode('import')}
          >
            <Text style={[styles.tabText, mode === 'import' && styles.tabTextActive]}>Restore</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Passphrase (min 6 chars)</Text>
        <TextInput
          testID="backup-passphrase-input"
          style={styles.input}
          placeholder="A strong passphrase"
          placeholderTextColor={colors.text.tertiary}
          value={passphrase}
          onChangeText={setPassphrase}
          secureTextEntry
        />

        {mode === 'import' && (
          <>
            <Text style={styles.label}>Backup text</Text>
            <TextInput
              testID="backup-blob-input"
              style={[styles.input, { minHeight: 140, textAlignVertical: 'top', paddingTop: spacing.md, fontFamily: 'IBMPlexMono_400Regular' }]}
              placeholder="lendsplit-v1:..."
              placeholderTextColor={colors.text.tertiary}
              value={blob}
              onChangeText={setBlob}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}

        <TouchableOpacity
          testID="backup-action-button"
          style={[styles.primaryBtn, { backgroundColor: colors.brand.public }]}
          onPress={mode === 'export' ? onExport : onImport}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {mode === 'export' ? <Download size={18} color="#fff" /> : <Upload size={18} color="#fff" />}
              <Text style={styles.primaryBtnText}>{mode === 'export' ? 'Export backup' : 'Restore backup'}</Text>
            </>
          )}
        </TouchableOpacity>

        {mode === 'export' && blob ? (
          <>
            <Text style={[styles.label, { marginTop: spacing.xl }]}>Your encrypted backup</Text>
            <View style={styles.blobBox}>
              <Text selectable style={styles.blobText}>{blob}</Text>
            </View>
            <TouchableOpacity testID="backup-copy-button" style={styles.copyBtn} onPress={onCopy}>
              <Copy size={16} color={colors.brand.public} />
              <Text style={styles.copyText}>Copy to clipboard</Text>
            </TouchableOpacity>
          </>
        ) : null}

        <Text style={styles.disclaimer}>
          {'\n'}🔒 AES-256-GCM with PBKDF2 (100k iterations).{'\n'}If you lose the passphrase, the data cannot be recovered.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.layout, paddingVertical: spacing.md },
  headerTitle: { ...type.h3 },
  scroll: { padding: spacing.layout, paddingBottom: spacing.xxxl },
  lockBadge: { alignSelf: 'flex-start', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.secondary, marginBottom: spacing.md },
  title: { ...type.h1, marginBottom: spacing.sm },
  subtitle: { ...type.body, color: colors.text.secondary, marginBottom: spacing.lg },
  toggle: { flexDirection: 'row', backgroundColor: colors.bg.secondary, borderRadius: radii.pill, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radii.pill },
  tabActive: { backgroundColor: colors.brand.public },
  tabText: { ...type.bodyMed, color: colors.text.secondary, fontFamily: 'Manrope_600SemiBold' },
  tabTextActive: { color: '#fff' },
  label: { ...type.caption, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.bg.secondary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontFamily: 'WorkSans_400Regular', fontSize: 15, color: colors.text.primary },
  primaryBtn: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, paddingVertical: 18, marginTop: spacing.lg },
  primaryBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 },
  blobBox: { backgroundColor: colors.bg.secondary, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.ui.border, maxHeight: 220 },
  blobText: { fontFamily: 'IBMPlexMono_400Regular', fontSize: 11, color: colors.text.primary },
  copyBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, padding: spacing.sm },
  copyText: { color: colors.brand.public, fontFamily: 'Manrope_600SemiBold' },
  disclaimer: { ...type.body, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.lg, fontSize: 12, lineHeight: 18 },
});
