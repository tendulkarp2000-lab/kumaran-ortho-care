import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import Button from '../components/ui/Button';
import { findPatientByPhone, findPatientByUhid, parseApiError } from '../lib/api';
import { savePatient } from '../lib/storage';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const DEMO_PATIENT = {
  id: 1,
  uhid: 'KOC-0001',
  name: 'Demo Patient',
  phone: '9876543210',
  age: 45,
  gender: 'Male' as const,
  bloodGroup: 'O+',
  address: 'Trichy, Tamil Nadu',
};

export default function LoginScreen({ navigation }: Props) {
  const [tab, setTab] = useState<'phone' | 'uhid'>('phone');
  const [phone, setPhone] = useState('');
  const [uhid, setUhid] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePhoneLogin() {
    if (phone.length !== 10) {
      Alert.alert('தவறான எண் / Invalid', '10 இலக்க மொபைல் எண் உள்ளிடுக.\nEnter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      const patient = await findPatientByPhone(phone);
      if (!patient) {
        Alert.alert(
          'கிடைக்கவில்லை / Not Found',
          'இந்த எண்ணில் பதிவு இல்லை.\nNo records found for this number.'
        );
        return;
      }
      await savePatient(patient);
      navigation.replace('MainApp');
    } catch (err) {
      Alert.alert('பிழை / Error', parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUhidLogin() {
    if (!uhid.trim()) {
      Alert.alert('தவறான UHID', 'UHID உள்ளிடுக / Enter your UHID');
      return;
    }
    setLoading(true);
    try {
      const patient = await findPatientByUhid(uhid.trim().toUpperCase());
      if (!patient) {
        Alert.alert('கிடைக்கவில்லை / Not Found', 'இந்த UHID-ல் பதிவு இல்லை.\nNo records found.');
        return;
      }
      await savePatient(patient);
      navigation.replace('MainApp');
    } catch (err) {
      Alert.alert('பிழை / Error', parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    await savePatient(DEMO_PATIENT);
    navigation.replace('MainApp');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <LinearGradient colors={['#1B3A6B', '#0F2550']} style={styles.header}>
        <Ionicons name="medical" size={36} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Kumaran Ortho Care</Text>
        <Text style={styles.headerSub}>Dr. P.L. Vijayakumar, MS Ortho</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>உள்நுழைக / Sign In</Text>
        <Text style={styles.subtitle}>உங்கள் பதிவுகளை அணுக Sign in to access your records</Text>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'phone' && styles.tabActive]}
            onPress={() => setTab('phone')}
          >
            <Text style={[styles.tabLabel, tab === 'phone' && styles.tabLabelActive]}>
              📱 Mobile Number
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'uhid' && styles.tabActive]}
            onPress={() => setTab('uhid')}
          >
            <Text style={[styles.tabLabel, tab === 'uhid' && styles.tabLabelActive]}>
              🪪 UHID
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'phone' ? (
          <>
            <Text style={styles.fieldLabel}>மொபைல் எண் / Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <Button
              label="பதிவுகளை தேடு / Find My Records"
              onPress={handlePhoneLogin}
              loading={loading}
              style={styles.btn}
            />
          </>
        ) : (
          <>
            <Text style={styles.fieldLabel}>UHID எண் / Patient ID</Text>
            <TextInput
              style={[styles.input, styles.uhidInput]}
              placeholder="e.g. KOC-0001"
              placeholderTextColor="#94A3B8"
              value={uhid}
              onChangeText={setUhid}
              autoCapitalize="characters"
            />
            <Button
              label="உள்நுழை / Login with UHID"
              onPress={handleUhidLogin}
              loading={loading}
              style={styles.btn}
            />
          </>
        )}

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>அல்லது / or</Text>
          <View style={styles.orLine} />
        </View>

        <Button
          label="Demo பயன்படுத்து / Use Demo"
          onPress={handleDemoLogin}
          variant="outline"
          style={styles.btn}
        />

        <Text style={styles.hint}>
          💡 Demo mode uses sample data — no server needed
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  body: {
    flexGrow: 1,
    backgroundColor: '#F0F4F8',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B3A6B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1B3A6B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  tabLabelActive: { color: '#1B3A6B', fontWeight: '700' },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16,
    overflow: 'hidden',
  },
  inputPrefix: {
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
  },
  uhidInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  btn: { width: '100%' },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  orText: { fontSize: 13, color: '#94A3B8' },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
