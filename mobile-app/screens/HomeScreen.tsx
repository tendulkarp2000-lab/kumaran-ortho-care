import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '../App';
import Card from '../components/ui/Card';
import QueueCard from '../components/QueueCard';
import { getQueueStatus } from '../lib/api';
import { getStoredPatient } from '../lib/storage';

type NavProp = BottomTabNavigationProp<TabParamList>;

const QUICK_ACTIONS = [
  { icon: 'calendar-outline', label: 'Book\nAppointment', labelTa: 'சந்திப்பு\nபதிவு', tab: 'Appointments', color: '#EFF6FF', iconColor: '#1B3A6B' },
  { icon: 'flask-outline', label: 'Lab\nReports', labelTa: 'சோதனை\nறிக்கைகள்', tab: 'Reports', color: '#F0FDF4', iconColor: '#059669' },
  { icon: 'scan-outline', label: 'My\nScans', labelTa: 'ஸ்கேன்கள்', tab: 'Reports', color: '#FFF7ED', iconColor: '#D97706' },
  { icon: 'receipt-outline', label: 'My\nBills', labelTa: 'பில்கள்', tab: 'Bills', color: '#FDF2F8', iconColor: '#9333EA' },
] as const;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [patient, setPatient] = useState<Awaited<ReturnType<typeof getStoredPatient>>>(null);
  const [queueStatus, setQueueStatus] = useState<Awaited<ReturnType<typeof getQueueStatus>> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    const p = await getStoredPatient();
    setPatient(p);
    if (p) {
      try {
        const qs = await getQueueStatus(p.id);
        setQueueStatus(qs);
      } catch {
        // silently fail — offline banner shown in QueueCard
      } finally {
        setQueueLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      intervalRef.current = setInterval(loadData, 30_000);
      return () => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const greetingText = () => {
    const h = new Date().getHours();
    if (h < 12) return 'காலை வணக்கம் / Good Morning';
    if (h < 17) return 'மதிய வணக்கம் / Good Afternoon';
    return 'மாலை வணக்கம் / Good Evening';
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greetingText()}</Text>
          <Text style={styles.patientName}>{patient?.name ?? '…'}</Text>
          <Text style={styles.uhid}>UHID: {patient?.uhid ?? '—'}</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="medical" size={32} color="#60CFEC" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891B2" />}
      >
        {/* Queue status */}
        <Text style={styles.sectionTitle}>🎟 இன்றைய நிலை / Today's Status</Text>
        <QueueCard status={queueStatus} loading={queueLoading} />

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>விரைவு செயல்கள் / Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              onPress={() => navigation.navigate(action.tab as any)}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon as any} size={28} color={action.iconColor} />
              <Text style={[styles.actionLabel, { color: action.iconColor }]}>
                {action.label}
              </Text>
              <Text style={styles.actionLabelTa}>{action.labelTa}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact */}
        <Text style={styles.sectionTitle}>📞 தொடர்பு / Contact</Text>
        <Card style={styles.contactCard}>
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>Kumaran Robotic Ortho Care</Text>
              <Text style={styles.contactAddr}>Trichy, Tamil Nadu</Text>
            </View>
          </View>
          <View style={styles.contactBtns}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#EFF6FF' }]}
              onPress={() => Linking.openURL('tel:+914312345678')}
            >
              <Ionicons name="call" size={18} color="#1B3A6B" />
              <Text style={[styles.contactBtnLabel, { color: '#1B3A6B' }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#F0FDF4' }]}
              onPress={() => Linking.openURL('https://wa.me/914312345678')}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
              <Text style={[styles.contactBtnLabel, { color: '#16A34A' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#FEF2F2' }]}
              onPress={() => Linking.openURL('https://maps.google.com/?q=Kumaran+Ortho+Care+Trichy')}
            >
              <Ionicons name="map" size={18} color="#DC2626" />
              <Text style={[styles.contactBtnLabel, { color: '#DC2626' }]}>Maps</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Hospital info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#0891B2" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>OPD Hours / நேரம்</Text>
              <Text style={styles.infoSub}>Mon–Sat: 9:00 AM – 6:00 PM</Text>
              <Text style={styles.infoSub}>Sunday: 10:00 AM – 1:00 PM</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: {
    backgroundColor: '#1B3A6B',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  patientName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  uhid: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  headerRight: { opacity: 0.7 },
  body: { paddingVertical: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 8,
  },
  actionCard: {
    width: '46%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    lineHeight: 18,
  },
  actionLabelTa: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  contactCard: { marginHorizontal: 16, marginBottom: 10, padding: 14 },
  contactRow: { marginBottom: 12 },
  contactInfo: {},
  contactName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  contactAddr: { fontSize: 12, color: '#64748B', marginTop: 2 },
  contactBtns: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  contactBtnLabel: { fontSize: 13, fontWeight: '600' },
  infoCard: { marginHorizontal: 16, marginBottom: 10, padding: 14 },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  infoSub: { fontSize: 12, color: '#64748B', lineHeight: 20 },
});
