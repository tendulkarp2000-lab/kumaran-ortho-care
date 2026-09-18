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
import { getPatientBills } from '../../lib/api';
import { getStoredPatient } from '../../lib/storage';
import type { Bill } from '../../lib/api';

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function BillListScreen() {
  const navigation = useNavigation<any>();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const patient = await getStoredPatient();
    if (!patient) return;
    try {
      const data = await getPatientBills(patient.id);
      setBills(data.sort((a, b) => b.billDate.localeCompare(a.billDate)));
    } catch {
      setBills(DEMO_BILLS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <LoadingSpinner fullScreen message="பில்கள் ஏற்றுகிறது…" />;

  const totalDue = bills
    .filter((b) => b.paymentStatus !== 'Paid')
    .reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Bills</Text>
        <Text style={styles.headerSub}>பில்கள் / Payment Records</Text>
      </View>

      {totalDue > 0 && (
        <View style={styles.dueBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.dueText}>
            Pending amount: {formatINR(totalDue)} / நிலுவை தொகை
          </Text>
        </View>
      )}

      <FlatList
        data={bills}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891B2" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
            activeOpacity={0.8}
          >
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountText}>{formatINR(item.totalAmount)}</Text>
                </View>
                <View style={styles.info}>
                  <View style={styles.topRow}>
                    <Text style={styles.date}>{format(parseISO(item.billDate), 'dd MMM yyyy')}</Text>
                    <Badge
                      label={item.paymentStatus}
                      variant={statusToBadgeVariant(item.paymentStatus)}
                      size="sm"
                    />
                  </View>
                  <Text style={styles.itemCount}>
                    {item.billItems.length} item{item.billItems.length !== 1 ? 's' : ''}
                  </Text>
                  {item.paymentStatus !== 'Paid' && (
                    <Text style={styles.dueAmount}>
                      Due: {formatINR(item.totalAmount - item.paidAmount)}
                    </Text>
                  )}
                  {item.paymentMode && (
                    <Text style={styles.payMode}>💳 {item.paymentMode}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="பில்கள் இல்லை" subtitle="No billing records found." />
        }
      />
    </View>
  );
}

const DEMO_BILLS: Bill[] = [
  {
    id: 1,
    patientId: 1,
    billDate: '2026-09-10',
    totalAmount: 2500,
    paidAmount: 2500,
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    billItems: [
      { id: 1, description: 'OPD Consultation', category: 'Consultation', amount: 500, quantity: 1 },
      { id: 2, description: 'X-Ray Right Knee', category: 'Radiology', amount: 800, quantity: 1 },
      { id: 3, description: 'Lab (CBC, ESR, CRP)', category: 'Lab', amount: 700, quantity: 1 },
      { id: 4, description: 'Medicines', category: 'Medicine', amount: 500, quantity: 1 },
    ],
  },
  {
    id: 2,
    patientId: 1,
    billDate: '2026-09-13',
    totalAmount: 3200,
    paidAmount: 0,
    paymentStatus: 'Unpaid',
    billItems: [
      { id: 5, description: 'MRI Right Knee', category: 'Radiology', amount: 3200, quantity: 1 },
    ],
  },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { backgroundColor: '#1B3A6B', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  dueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  dueText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  list: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 10, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountBadge: {
    minWidth: 80,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  amountText: { fontSize: 16, fontWeight: '700', color: '#1B3A6B' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  date: { fontSize: 12, color: '#64748B' },
  itemCount: { fontSize: 13, color: '#475569', marginBottom: 2 },
  dueAmount: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  payMode: { fontSize: 12, color: '#94A3B8' },
});
