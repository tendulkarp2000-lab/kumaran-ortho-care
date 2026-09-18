import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import Card from '../../components/ui/Card';
import Badge, { statusToBadgeVariant } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getPatientPrescriptions } from '../../lib/api';
import { getStoredPatient } from '../../lib/storage';
import type { Prescription } from '../../lib/api';

export default function PrescriptionListScreen() {
  const navigation = useNavigation<any>();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const patient = await getStoredPatient();
    if (!patient) return;
    try {
      const data = await getPatientPrescriptions(patient.id);
      setPrescriptions(data.sort((a, b) => b.visitDate.localeCompare(a.visitDate)));
    } catch {
      setPrescriptions(DEMO_PRESCRIPTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <LoadingSpinner fullScreen message="மருந்துச் சீட்டுகள் ஏற்றுகிறது…" />;

  return (
    <View style={styles.root}>
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891B2" />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: item.id })} activeOpacity={0.8}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="document-text-outline" size={22} color="#1B3A6B" />
                </View>
                <View style={styles.info}>
                  <Text style={styles.date}>{format(parseISO(item.visitDate), 'dd MMM yyyy')}</Text>
                  <Text style={styles.diagnosis} numberOfLines={1}>{item.diagnosis}</Text>
                  <Text style={styles.meta}>
                    💊 {item.medicines.length} medicine{item.medicines.length !== 1 ? 's' : ''} prescribed
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState icon="document-text-outline" title="மருந்துச் சீட்டுகள் இல்லை" subtitle="No prescriptions on record yet." />
        }
      />
    </View>
  );
}

const DEMO_PRESCRIPTIONS: Prescription[] = [
  {
    id: 1,
    patientId: 1,
    visitDate: '2026-09-10',
    diagnosis: 'Osteoarthritis - Right Knee',
    medicines: [
      { id: 1, medicineName: 'Tab. Diclofenac 50mg', dosage: '50mg', frequency: 'Twice daily', duration: '5 days', instructions: 'After food' },
      { id: 2, medicineName: 'Tab. Pantoprazole 40mg', dosage: '40mg', frequency: 'Once daily', duration: '5 days', instructions: 'Before food' },
    ],
  },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: {
    backgroundColor: '#1B3A6B',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  list: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 10, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  date: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  diagnosis: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  meta: { fontSize: 12, color: '#94A3B8' },
});
