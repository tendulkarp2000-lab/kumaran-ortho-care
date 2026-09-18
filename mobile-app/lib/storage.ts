import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SERVER_IP: 'server_ip',
  PATIENT_DATA: 'patient_data',
  AUTH_TOKEN: 'auth_token',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
} as const;

export const DEFAULT_SERVER_URL = 'http://localhost:3001';

// ─── Server IP ────────────────────────────────────────────────────────────────

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(KEYS.SERVER_IP);
    return saved ?? DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.SERVER_IP, url.trim());
}

// ─── Patient session ──────────────────────────────────────────────────────────

export interface StoredPatient {
  id: number;
  uhid: string;
  name: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  address: string;
}

export async function getStoredPatient(): Promise<StoredPatient | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PATIENT_DATA);
    return raw ? (JSON.parse(raw) as StoredPatient) : null;
  } catch {
    return null;
  }
}

export async function savePatient(patient: StoredPatient): Promise<void> {
  await AsyncStorage.setItem(KEYS.PATIENT_DATA, JSON.stringify(patient));
}

export async function clearPatient(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.PATIENT_DATA);
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.NOTIFICATIONS_ENABLED);
    return val !== 'false'; // default true
  } catch {
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIFICATIONS_ENABLED, String(enabled));
}
