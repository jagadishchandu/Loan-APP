import { Alert, Platform } from 'react-native';

type ConfirmOpts = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

/**
 * Cross-platform confirm dialog.
 * On web, react-native's Alert.alert does NOT reliably invoke button
 * onPress callbacks, so we fall back to window.confirm. On native, we
 * use the standard Alert.alert with two buttons.
 *
 * Returns a Promise<boolean> – true if user confirmed, false otherwise.
 */
export function confirm(opts: ConfirmOpts): Promise<boolean> {
  const {
    title,
    message = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
    destructive = false,
  } = opts;

  if (Platform.OS === 'web') {
    // window.confirm doesn't support custom button labels; we still get a yes/no result.
    const text = message ? `${title}\n\n${message}` : title;
    // eslint-disable-next-line no-alert
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(text)
      : true;
    return Promise.resolve(!!ok);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
