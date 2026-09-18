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
import { getPatientLabOrders } from '../../lib/api';
import { getStoredPatient } from '../../lib/storage';
import type { LabOrder } from '../../lib/api';

export default function LabReportListScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const patient = await getStoredPatient();
    if (!patient) return;
    try {
      const data = await getPatientLabOrders(patient.id);
      setOrders(data.sort((a, b) => b.orderedDate.localeCompare(a.orderedDate)));
    } catch {
      setOrders(DEMO_ORDERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <LoadingSpinner fullScreen message="சோதனை முடிவுகள் ஏற்றுகிறது…" />;

  return (
    <View style={styles.root}>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891B2" />}
        renderItem={({ item }) => {
          const testNames = item.testItems.map((t) => t.testName).join(', ');
          const hasAbnormal = item.testItems.some((t) => t.isAbnormal);
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('LabReportDetail', { orderId: item.id })}
              activeOpacity={0.8}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: item.status === 'Completed' ? '#F0FDF4' : '#FFF7ED' }]}>
                    <Ionicons
                      name="flask-outline"
                      size={22}
                      color={item.status === 'Completed' ? '#16A34A' : '#D97706'}
                    />
                  </View>
                  <View style={styles.info}>
                    <View style={styles.topRow}>
                      <Text style={styles.date}>{format(parseISO(item.orderedDate), 'dd MMM yyyy')}</Text>
                      <Badge label={item.status} variant={statusToBadgeVariant(item.status)} size="sm" />
                    </View>
                    <Text style={styles.tests} numberOfLines={2}>{testNames}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>{item.testItems.length} test{item.testItems.length !== 1 ? 's' : ''}</Text>
                      {hasAbnormal && (
                        <View style={styles.abnormalBadge}>
                          <Ionicons name="warning-outline" size={11} color="#DC2626" />
                          <Text style={styles.abnormalText}>Abnormal values</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="flask-outline" title="சோதனை முடிவுகள் இல்லை" subtitle="No lab reports on record." />
        }
      />
    </View>
  );
}

const DEMO_ORDERS: LabOrder[] = [
  {
    id: 1,
    patientId: 1,
    orderedDate: '2026-09-10',
    status: 'Completed',
    testItems: [
      { id: 1, testName: 'CBC (Complete Blood Count)', result: '14.2 g/dL', unit: 'g/dL', normalRange: '13.5-17.5', status: 'Completed', isAbnormal: false },
      { id: 2, testName: 'ESR', result: '38', unit: 'mm/hr', normalRange: '0-20', status: 'Completed', isAbnormal: true },
      { id: 3, testName: 'CRP', result: '12.4', unit: 'mg/L', normalRange: '<5', status: 'Completed', isAbnormal: true },
    ],
  },
  {
    id: 2,
    patientId: 1,
    orderedDate: '2026-09-13',
    status: 'Pending',
    testItems: [
      { id: 4, testName: 'HbA1c', result: undefined, unit: '%', normalRange: '<5.7', status: 'Pending', isAbnormal: false },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  date: { fontSize: 12, color: '#64748B' },
  tests: { fontSize: 14, fontWeight: '600', color: '#1E293B', lineHeight: 20, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontSize: 12, color: '#94A3B8' },
  abnormalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  abnormalText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
});
