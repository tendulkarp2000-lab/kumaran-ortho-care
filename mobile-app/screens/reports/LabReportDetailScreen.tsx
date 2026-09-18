import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { getLabOrderById } from '../../lib/api';
import { generateAndSharePdf } from '../../lib/pdf';
import type { LabOrder } from '../../lib/api';

export default function LabReportDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLabOrderById(orderId)
      .then(setOrder)
      .catch(() => setOrder(DEMO_ORDER))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <LoadingSpinner fullScreen message="சோதனை முடிவுகள் ஏற்றுகிறது…" />;
  if (!order) return null;

  const abnormalCount = order.testItems.filter((t) => t.isAbnormal).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Lab Report</Text>
          <Text style={styles.headerSub}>{format(parseISO(order.orderedDate), 'dd MMM yyyy')}</Text>
        </View>
        <Badge label={order.status} variant={order.status === 'Completed' ? 'success' : 'warning'} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {abnormalCount > 0 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={18} color="#DC2626" />
            <Text style={styles.warningText}>
              {abnormalCount} abnormal value{abnormalCount > 1 ? 's' : ''} detected — please consult your doctor
            </Text>
          </View>
        )}

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>சோதனை விவரங்கள் / Test Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ஆர்டர் தேதி / Ordered</Text>
            <Text style={styles.infoValue}>{format(parseISO(order.orderedDate), 'dd MMM yyyy')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>நிலை / Status</Text>
            <Text style={styles.infoValue}>{order.status}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>சோதனைகள் / Tests</Text>
            <Text style={styles.infoValue}>{order.testItems.length}</Text>
          </View>
        </Card>

        {/* Results table */}
        <Text style={styles.sectionTitle}>முடிவுகள் / Results</Text>
        <Card style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Test</Text>
            <Text style={styles.th}>Result</Text>
            <Text style={styles.th}>Normal</Text>
          </View>
          {order.testItems.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                idx % 2 === 0 && styles.tableRowAlt,
                item.isAbnormal && styles.tableRowAbnormal,
              ]}
            >
              <View style={{ flex: 2 }}>
                <Text style={styles.testName}>{item.testName}</Text>
              </View>
              <View style={styles.resultCell}>
                {item.result ? (
                  <>
                    <Text style={[styles.result, item.isAbnormal && styles.resultAbnormal]}>
                      {item.result}
                    </Text>
                    <Text style={styles.unit}>{item.unit}</Text>
                  </>
                ) : (
                  <Text style={styles.pending}>Pending</Text>
                )}
                {item.isAbnormal && (
                  <Ionicons name="warning" size={12} color="#DC2626" />
                )}
              </View>
              <Text style={styles.normalRange}>{item.normalRange ?? '—'}</Text>
            </View>
          ))}
        </Card>

        <Button
          label="PDF பதிவிறக்கு / Download Report"
          onPress={() => {
            const rows = order.testItems.map(
              (item) => `
                <tr>
                  <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0; font-size:12px; color:#1E293B;">${item.testName}</td>
                  <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0; font-size:12px; color:#DC2626; font-weight:${item.isAbnormal ? 700 : 400}; text-align:center;">${item.result ?? 'Pending'} ${item.unit ?? ''}</td>
                  <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0; font-size:12px; color:#64748B; text-align:center;">${item.normalRange ?? '—'}</td>
                </tr>`
            ).join('');
            const html = `
              <h3 style="color:#1B3A6B; font-family:sans-serif; margin-bottom:4px;">Lab Report</h3>
              <p style="color:#64748B; font-family:sans-serif; font-size:12px;">Ordered: ${format(parseISO(order.orderedDate), 'dd MMMM yyyy')} | Status: ${order.status}</p>
              <table style="width:100%; border-collapse:collapse; font-family:sans-serif; margin-top:12px;">
                <thead>
                  <tr style="background:#1B3A6B; color:#fff;">
                    <th style="padding:8px 12px; text-align:left; font-size:11px;">Test</th>
                    <th style="padding:8px 12px; text-align:center; font-size:11px;">Result</th>
                    <th style="padding:8px 12px; text-align:center; font-size:11px;">Normal Range</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              ${order.testItems.some((t) => t.isAbnormal) ? '<p style="color:#DC2626; font-size:11px; font-family:sans-serif; margin-top:10px;">Abnormal values detected — please consult your doctor.</p>' : ''}`;
            generateAndSharePdf(html, `LabReport_${order.id}.pdf`);
          }}
          variant="outline"
          style={styles.downloadBtn}
          icon={<Ionicons name="download-outline" size={16} color="#0891B2" />}
        />
      </ScrollView>
    </View>
  );
}

const DEMO_ORDER: LabOrder = {
  id: 1,
  patientId: 1,
  orderedDate: '2026-09-10',
  status: 'Completed',
  testItems: [
    { id: 1, testName: 'CBC', result: '14.2 g/dL', unit: 'g/dL', normalRange: '13.5-17.5', status: 'Completed', isAbnormal: false },
    { id: 2, testName: 'ESR', result: '38', unit: 'mm/hr', normalRange: '0-20', status: 'Completed', isAbnormal: true },
    { id: 3, testName: 'CRP', result: '12.4', unit: 'mg/L', normalRange: '<5', status: 'Completed', isAbnormal: true },
  ],
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: {
    backgroundColor: '#1B3A6B',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  body: { padding: 16, paddingBottom: 40 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningText: { flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500', lineHeight: 18 },
  infoCard: { marginBottom: 16, gap: 10 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  tableCard: { padding: 0, overflow: 'hidden', marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1B3A6B',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: { flex: 1, color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRowAlt: { backgroundColor: '#F8FAFC' },
  tableRowAbnormal: { backgroundColor: '#FEF2F2' },
  testName: { fontSize: 12, color: '#374151', fontWeight: '500', lineHeight: 18 },
  resultCell: { flex: 1, alignItems: 'flex-start' },
  result: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  resultAbnormal: { color: '#DC2626' },
  unit: { fontSize: 10, color: '#94A3B8' },
  pending: { fontSize: 12, color: '#D97706', fontStyle: 'italic' },
  normalRange: { flex: 1, fontSize: 11, color: '#94A3B8' },
  downloadBtn: { width: '100%' },
});
