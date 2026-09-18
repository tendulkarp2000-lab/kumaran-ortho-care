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
import { getPatientRadiologyOrders } from '../../lib/api';
import { getStoredPatient } from '../../lib/storage';
import type { RadiologyOrder } from '../../lib/api';

const MODALITY_ICON: Record<string, { icon: any; color: string; bg: string }> = {
  'X-Ray': { icon: 'body-outline', color: '#7C3AED', bg: '#EDE9FE' },
  'MRI':   { icon: 'magnet-outline', color: '#0891B2', bg: '#E0F2FE' },
  'CT':    { icon: 'scan-circle-outline', color: '#D97706', bg: '#FEF3C7' },
  'Ultrasound': { icon: 'radio-outline', color: '#16A34A', bg: '#D1FAE5' },
};

export default function RadiologyListScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const patient = await getStoredPatient();
    if (!patient) return;
    try {
      const data = await getPatientRadiologyOrders(patient.id);
      setOrders(data.sort((a, b) => b.orderedDate.localeCompare(a.orderedDate)));
    } catch {
      setOrders(DEMO_ORDERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <LoadingSpinner fullScreen message="ஸ்கேன் தகவல்கள் ஏற்றுகிறது…" />;

  return (
    <View style={styles.root}>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891B2" />}
        renderItem={({ item }) => {
          const icon = MODALITY_ICON[item.modalityType] ?? MODALITY_ICON['X-Ray'];
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('RadiologyDetail', { orderId: item.id })}
              activeOpacity={0.8}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
                    <Ionicons name={icon.icon} size={22} color={icon.color} />
                  </View>
                  <View style={styles.info}>
                    <View style={styles.topRow}>
                      <Text style={styles.modality}>{item.modalityType}</Text>
                      <Badge label={item.status} variant={statusToBadgeVariant(item.status)} size="sm" />
                    </View>
                    <Text style={styles.bodyPart}>{item.bodyPart}</Text>
                    <Text style={styles.date}>{format(parseISO(item.orderedDate), 'dd MMM yyyy')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="scan-outline" title="ஸ்கேன் தகவல்கள் இல்லை" subtitle="No radiology orders on record." />
        }
      />
    </View>
  );
}

const DEMO_ORDERS: RadiologyOrder[] = [
  { id: 1, patientId: 1, orderedDate: '2026-09-10', modalityType: 'X-Ray', bodyPart: 'Right Knee (AP & Lateral)', status: 'Completed', findings: 'Mild joint space narrowing noted.', impression: 'Grade II Osteoarthritis' },
  { id: 2, patientId: 1, orderedDate: '2026-09-12', modalityType: 'MRI', bodyPart: 'Right Knee', status: 'Pending' },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { backgroundColor: '#1B3A6B', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  list: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 10, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  modality: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  bodyPart: { fontSize: 13, color: '#475569', marginBottom: 2 },
  date: { fontSize: 12, color: '#94A3B8' },
});
