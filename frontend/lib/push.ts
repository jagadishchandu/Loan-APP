// Register Expo push notification token with backend (no-op on web).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';

export async function registerPushTokenIfAvailable(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    const perm = await Notifications.getPermissionsAsync();
    let status = perm.status;
    if (status !== 'granted') {
      const ask = await Notifications.requestPermissionsAsync();
      status = ask.status;
    }
    if (status !== 'granted') return null;
    const projectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId ||
      undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined as any);
    const token = tokenData?.data;
    if (token) {
      try {
        await api.post('/users/me/push-token', { expo_push_token: token });
      } catch {
        // Ignore if backend rejects (e.g., not authed yet)
      }
    }
    return token ?? null;
  } catch {
    return null;
  }
}
