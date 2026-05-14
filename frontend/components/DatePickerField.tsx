import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Calendar, X } from 'lucide-react-native';
import { colors, spacing, radii, type } from '../constants/theme';

// Lazy require – package isn't available in web bundles either, but we only
// call it on native paths. Wrapped in try/catch in case of any resolution
// issues in a web build.
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    DateTimePicker = null;
  }
}

type Props = {
  value: string | null | undefined; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  testID?: string;
  accent?: string;
  clearable?: boolean;
  onClear?: () => void;
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Expect YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export default function DatePickerField({
  value,
  onChange,
  placeholder = 'Select a date',
  minimumDate,
  maximumDate,
  testID,
  accent = colors.brand.public,
  clearable = false,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseISO(value || '') || new Date());

  // ---------------- WEB ----------------
  if (Platform.OS === 'web') {
    // Render a native HTML <input type="date"> styled to match the rest of the
    // form. React Native Web allows us to drop into React.createElement with a
    // raw HTML tag string.
    const inputStyle: any = {
      width: '100%',
      backgroundColor: colors.bg.secondary,
      borderRadius: radii.md,
      paddingLeft: 44,
      paddingRight: 12,
      paddingTop: 14,
      paddingBottom: 14,
      fontFamily: 'WorkSans_400Regular',
      fontSize: 15,
      color: colors.text.primary,
      border: 'none',
      outline: 'none',
      boxSizing: 'border-box',
      appearance: 'none',
      WebkitAppearance: 'none',
    };
    return (
      <View style={styles.webWrap}>
        <View style={styles.iconWrap} pointerEvents="none">
          <Calendar size={18} color={colors.text.tertiary} />
        </View>
        {React.createElement('input', {
          'data-testid': testID,
          type: 'date',
          value: value || '',
          min: minimumDate ? toISODate(minimumDate) : undefined,
          max: maximumDate ? toISODate(maximumDate) : undefined,
          placeholder,
          onChange: (e: any) => onChange(e.target.value),
          style: inputStyle,
        })}
        {clearable && value ? (
          <TouchableOpacity
            onPress={() => (onClear ? onClear() : onChange(''))}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // ---------------- NATIVE ----------------
  const handleNativeChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event?.type === 'set' && selected) {
        onChange(toISODate(selected));
      }
      return;
    }
    // iOS spinner – update temp date; user confirms via Done button
    if (selected) setTempDate(selected);
  };

  const confirmIOS = () => {
    onChange(toISODate(tempDate));
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        testID={testID}
        style={styles.nativeField}
        onPress={() => {
          setTempDate(parseISO(value || '') || new Date());
          setOpen(true);
        }}
        activeOpacity={0.7}
      >
        <Calendar size={18} color={colors.text.tertiary} />
        <Text style={[styles.fieldText, !value && { color: colors.text.tertiary }]}>
          {value ? value : placeholder}
        </Text>
        {clearable && value ? (
          <TouchableOpacity
            onPress={() => (onClear ? onClear() : onChange(''))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {open && DateTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseISO(value || '') || new Date()}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleNativeChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={styles.iosBackdrop}>
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={styles.iosCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={[styles.iosDone, { color: accent }]}>Done</Text>
                </TouchableOpacity>
              </View>
              {DateTimePicker ? (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={handleNativeChange}
                />
              ) : null}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  webWrap: {
    position: 'relative',
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  nativeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.sm,
    minHeight: 48,
  },
  fieldText: { ...type.body, fontSize: 15, color: colors.text.primary, flex: 1 },
  iosBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  iosSheet: { backgroundColor: '#fff', paddingBottom: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  iosCancel: { ...type.body, color: colors.text.secondary, fontSize: 15 },
  iosDone: { fontFamily: 'Manrope_700Bold', fontSize: 15 },
});
