import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useNavigation } from '@react-navigation/native';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {
  getStoredPatient,
  clearPatient,
  getServerUrl,
  setServerUrl,
  getNotificationsEnabled,
  setNotificationsEnabled,
} from '../../lib/storage';
import type { StoredPatient } from '../../lib/storage';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const [patient, setPatient] = useState<StoredPatient | null>(null);
  const [serverUrl, setServerUrlState] = useState('http://localhost:3001');
  const [editingServer, setEditingServer] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [notificationsOn, setNotificationsOn] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getStoredPatient().then(setPatient);
      getServerUrl().then(setServerUrlState);
      getNotificationsEnabled().then(setNotificationsOn);
    }, [])
  );

  async function handleLogout() {
    Alert.alert(
      'வெளியேறு / Logout',
      'நீங்கள் வெளியேற விரும்புகிறீர்களா?\nAre you sure you want to logout?',
      [
        { text: 'இல்லை / No', style: 'cancel' },
        {
          text: 'ஆம் / Yes',
          style: 'destructive',
          onPress: async () => {
            await clearPatient();
            const rootNav = navigation.getParent()?.getParent();
            rootNav?.reset({ index: 0, routes: [{ name: 'Login' } as never] });
          },
        },
      ]
    );
  }

  async function saveServerUrl() {
    await setServerUrl(tempUrl);
    setServerUrlState(tempUrl);
    setEditingServer(false);
    Alert.alert('சேமிக்கப்பட்டது / Saved', 'Server URL updated successfully.');
  }

  async function toggleNotifications(val: boolean) {
    setNotificationsOn(val);
    await setNotificationsEnabled(val);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.name}>{patient?.name ?? '…'}</Text>
        <Text style={styles.uhid}>UHID: {patient?.uhid ?? '—'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Patient info */}
        <Text style={styles.sectionTitle}>👤 Patient Information / நோயாளி தகவல்</Text>
        <Card style={styles.card}>
          <InfoRow label="பெயர் / Name" value={patient?.name ?? ''} />
          <View style={styles.divider} />
          <InfoRow label="வயது / Age" value={patient ? `${patient.age} years` : ''} />
          <View style={styles.divider} />
          <InfoRow label="பாலினம் / Gender" value={patient?.gender ?? ''} />
          <View style={styles.divider} />
          <InfoRow label="இரத்த வகை / Blood Group" value={patient?.bloodGroup ?? ''} />
          <View style={styles.divider} />
          <InfoRow label="மொபைல் / Phone" value={patient?.phone ?? ''} />
          <View style={styles.divider} />
          <InfoRow label="முகவரி / Address" value={patient?.address ?? ''} />
        </Card>

        {/* Notification settings */}
        <Text style={styles.sectionTitle}>🔔 Notifications / அறிவிப்புகள்</Text>
        <Card style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <Text style={styles.toggleSub}>Queue alerts & appointment reminders</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#CBD5E1', true: '#0891B2' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Server configuration */}
        <Text style={styles.sectionTitle}>⚙️ App Settings / அமைப்புகள்</Text>
        <Card style={styles.card}>
          <Text style={styles.settingLabel}>Hospital Server IP / சர்வர் முகவரி</Text>
          <Text style={styles.settingHint}>
            Connect to hospital WiFi and enter the server IP. Default: localhost:3001
          </Text>
          {editingServer ? (
            <View style={styles.serverEdit}>
              <TextInput
                style={styles.serverInput}
                value={tempUrl}
                onChangeText={setTempUrl}
                placeholder="http://192.168.1.x:3001"
                autoCapitalize="none"
                keyboardType="url"
              />
              <View style={styles.serverBtns}>
                <Button label="சேமி / Save" onPress={saveServerUrl} size="sm" style={{ flex: 1 }} />
                <Button
                  label="ரத்து / Cancel"
                  onPress={() => setEditingServer(false)}
                  variant="outline"
                  size="sm"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.serverDisplay}
              onPress={() => { setTempUrl(serverUrl); setEditingServer(true); }}
            >
              <Text style={styles.serverUrl}>{serverUrl}</Text>
              <Ionicons name="pencil-outline" size={16} color="#0891B2" />
            </TouchableOpacity>
          )}
        </Card>

        {/* App info */}
        <Card style={styles.appInfoCard}>
          <Text style={styles.appInfoTitle}>Kumaran Robotic Ortho Care</Text>
          <Text style={styles.appInfoSub}>Patient App v1.0.0</Text>
          <Text style={styles.appInfoSub}>Dr. P.L. Vijayakumar, MS Ortho</Text>
        </Card>

        <Button
          label="வெளியேறு / Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutBtn}
          icon={<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: {
    backgroundColor: '#1B3A6B',
    paddingTop: 50,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  name: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  uhid: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  body: { padding: 16, gap: 8, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 8 },
  card: { gap: 0 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'right', flex: 1, marginLeft: 16 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  toggleSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  settingHint: { fontSize: 12, color: '#94A3B8', marginBottom: 10, lineHeight: 18 },
  serverDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  serverUrl: { fontSize: 13, color: '#0891B2', fontWeight: '500', fontFamily: 'monospace' },
  serverEdit: { gap: 10 },
  serverInput: {
    borderWidth: 1,
    borderColor: '#0891B2',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  serverBtns: { flexDirection: 'row', gap: 10 },
  appInfoCard: { alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF' },
  appInfoTitle: { fontSize: 14, fontWeight: '700', color: '#1B3A6B' },
  appInfoSub: { fontSize: 12, color: '#64748B' },
  logoutBtn: { width: '100%', marginTop: 8 },
});
