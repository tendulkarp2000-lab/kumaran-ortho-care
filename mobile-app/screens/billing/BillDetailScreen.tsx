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
import Badge, { statusToBadgeVariant } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { getBillById } from '../../lib/api';
import { generateAndSharePdf } from '../../lib/pdf';
import type { Bill, BillItem } from '../../lib/api';

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const CATEGORY_ICON: Record<string, { icon: any; color: string }> = {
  Consultation: { icon: 'person-outline', color: '#1B3A6B' },
  Medicine: { icon: 'medical-outline', color: '#16A34A' },
  Lab: { icon: 'flask-outline', color: '#D97706' },
  Radiology: { icon: 'scan-outline', color: '#7C3AED' },
  Procedure: { icon: 'cut-outline', color: '#DC2626' },
  Other: { icon: 'ellipsis-horizontal-outline', color: '#64748B' },
};

function BillItemRow({ item }: { item: BillItem }) {
  const icon = CATEGORY_ICON[item.category] ?? CATEGORY_ICON.Other;
  return (
    <View style={styles.itemRow}>
      <View style={[styles.itemIcon, { backgroundColor: '#F8FAFC' }]}>
        <Ionicons name={icon.icon} size={16} color={icon.color} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.description}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      <View style={styles.itemRight}>
        {item.quantity > 1 && <Text style={styles.itemQty}>×{item.quantity}</Text>}
        <Text style={styles.itemAmount}>{formatINR(item.amount * item.quantity)}</Text>
      </View>
    </View>
  );
}

export default function BillDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { billId } = route.params;
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBillById(billId)
      .then(setBill)
      .catch(() => setBill(DEMO_BILL))
      .finally(() => setLoading(false));
  }, [billId]);

  if (loading) return <LoadingSpinner fullScreen message="பில் ஏற்றுகிறது…" />;
  if (!bill) return null;

  const byCategory = bill.billItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.amount * item.quantity;
    return acc;
  }, {});

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Bill #{bill.id}</Text>
          <Text style={styles.headerSub}>{format(parseISO(bill.billDate), 'dd MMM yyyy')}</Text>
        </View>
        <Badge label={bill.paymentStatus} variant={statusToBadgeVariant(bill.paymentStatus)} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Summary card */}
        <Card style={[styles.summaryCard, bill.paymentStatus === 'Unpaid' && styles.unpaidCard]}>
          <Text style={styles.summaryTitle}>Kumaran Robotic Ortho Care</Text>
          <Text style={styles.summaryDate}>{format(parseISO(bill.billDate), 'dd MMMM yyyy')}</Text>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Text style={styles.totalLabel}>மொத்தம் / Total</Text>
            <Text style={styles.totalAmount}>{formatINR(bill.totalAmount)}</Text>
          </View>
          {bill.paidAmount > 0 && (
            <View style={styles.amountRow}>
              <Text style={styles.paidLabel}>செலுத்தப்பட்டது / Paid</Text>
              <Text style={styles.paidAmount}>- {formatINR(bill.paidAmount)}</Text>
            </View>
          )}
          {bill.paymentStatus !== 'Paid' && (
            <View style={[styles.amountRow, styles.dueRow]}>
              <Text style={styles.dueLabel}>நிலுவை / Balance Due</Text>
              <Text style={styles.dueAmount}>{formatINR(bill.totalAmount - bill.paidAmount)}</Text>
            </View>
          )}
          {bill.paymentMode && (
            <View style={styles.payModeRow}>
              <Ionicons name="card-outline" size={14} color="#64748B" />
              <Text style={styles.payMode}>{bill.paymentMode}</Text>
            </View>
          )}
        </Card>

        {/* Category breakdown */}
        <Text style={styles.sectionTitle}>வகை பிரிப்பு / Category Breakdown</Text>
        <Card style={styles.breakdownCard}>
          {Object.entries(byCategory).map(([category, amount]) => {
            const icon = CATEGORY_ICON[category] ?? CATEGORY_ICON.Other;
            return (
              <View key={category} style={styles.breakdownRow}>
                <Ionicons name={icon.icon} size={16} color={icon.color} />
                <Text style={styles.breakdownCategory}>{category}</Text>
                <Text style={styles.breakdownAmount}>{formatINR(amount)}</Text>
              </View>
            );
          })}
        </Card>

        {/* Itemized */}
        <Text style={styles.sectionTitle}>விவரங்கள் / Itemized</Text>
        <Card style={styles.itemsCard}>
          {bill.billItems.map((item, idx) => (
            <React.Fragment key={item.id}>
              <BillItemRow item={item} />
              {idx < bill.billItems.length - 1 && <View style={styles.itemDivider} />}
            </React.Fragment>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalRowLabel}>மொத்தம் / Total</Text>
            <Text style={styles.totalRowAmount}>{formatINR(bill.totalAmount)}</Text>
          </View>
        </Card>

        <Button
          label="PDF பதிவிறக்கு / Download Bill"
          onPress={() => {
            const rows = bill.billItems.map(
              (item) => `
                <tr>
                  <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0; font-size:12px; color:#1E293B;">${item.description}</td>
                  <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0; font-size:12px; color:#64748B; text-align:center;">${item.category}</td>
                  <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0; font-size:12px; text-align:center; color:#64748B;">${item.quantity}</td>
                  <td style="padding:8px 12px; border-bottom:1px solid #E2E8F0; font-size:12px; font-weight:600; text-align:right; color:#1B3A6B;">₹${(item.amount * item.quantity).toLocaleString('en-IN')}</td>
                </tr>`
            ).join('');
            const html = `
              <h3 style="color:#1B3A6B; font-family:sans-serif; margin-bottom:4px;">Bill #${bill.id}</h3>
              <p style="color:#64748B; font-family:sans-serif; font-size:12px;">${format(parseISO(bill.billDate), 'dd MMMM yyyy')}</p>
              <table style="width:100%; border-collapse:collapse; font-family:sans-serif; margin-top:12px;">
                <thead>
                  <tr style="background:#1B3A6B; color:#fff;">
                    <th style="padding:8px 12px; text-align:left; font-size:11px;">Description</th>
                    <th style="padding:8px 12px; text-align:center; font-size:11px;">Category</th>
                    <th style="padding:8px 12px; text-align:center; font-size:11px;">Qty</th>
                    <th style="padding:8px 12px; text-align:right; font-size:11px;">Amount</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <div style="margin-top:12px; padding:12px; background:#EFF6FF; border-radius:8px; font-family:sans-serif;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-size:13px; font-weight:600; color:#374151;">Total / மொத்தம்</span>
                  <span style="font-size:15px; font-weight:700; color:#1B3A6B;">₹${bill.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                ${bill.paidAmount > 0 ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-size:13px; color:#16A34A;">Paid / செலுத்தப்பட்டது</span>
                  <span style="font-size:13px; color:#16A34A;">- ₹${bill.paidAmount.toLocaleString('en-IN')}</span>
                </div>` : ''}
                ${bill.paymentStatus !== 'Paid' ? `
                <div style="display:flex; justify-content:space-between; padding:8px; background:#FEF2F2; border-radius:6px; margin-top:6px;">
                  <span style="font-size:13px; font-weight:700; color:#DC2626;">Balance Due / நிலுவை</span>
                  <span style="font-size:15px; font-weight:800; color:#DC2626;">₹${(bill.totalAmount - bill.paidAmount).toLocaleString('en-IN')}</span>
                </div>` : ''}
                ${bill.paymentMode ? `<p style="font-size:11px; color:#64748B; margin-top:8px;">Payment Mode: ${bill.paymentMode}</p>` : ''}
              </div>`;
            generateAndSharePdf(html, `Bill_${bill.id}.pdf`);
          }}
          variant="outline"
          style={styles.downloadBtn}
          icon={<Ionicons name="download-outline" size={16} color="#0891B2" />}
        />
      </ScrollView>
    </View>
  );
}

const DEMO_BILL: Bill = {
  id: 1,
  patientId: 1,
  billDate: '2026-09-10',
  totalAmount: 2500,
  paidAmount: 2500,
  paymentStatus: 'Paid',
  paymentMode: 'UPI',
  billItems: [
    { id: 1, description: 'OPD Consultation - Dr. Vijayakumar', category: 'Consultation', amount: 500, quantity: 1 },
    { id: 2, description: 'X-Ray Right Knee (2 views)', category: 'Radiology', amount: 800, quantity: 1 },
    { id: 3, description: 'Lab Tests (CBC, ESR, CRP)', category: 'Lab', amount: 700, quantity: 1 },
    { id: 4, description: 'Medicines', category: 'Medicine', amount: 500, quantity: 1 },
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
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  summaryCard: {},
  unpaidCard: { borderWidth: 1.5, borderColor: '#FCA5A5' },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#1B3A6B', textAlign: 'center' },
  summaryDate: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 2, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#1B3A6B' },
  paidLabel: { fontSize: 13, color: '#64748B' },
  paidAmount: { fontSize: 14, fontWeight: '600', color: '#16A34A' },
  dueRow: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8, marginTop: 4 },
  dueLabel: { fontSize: 14, color: '#DC2626', fontWeight: '700' },
  dueAmount: { fontSize: 18, fontWeight: '800', color: '#DC2626' },
  payModeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  payMode: { fontSize: 13, color: '#64748B' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  breakdownCard: { gap: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownCategory: { flex: 1, fontSize: 14, color: '#374151' },
  breakdownAmount: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  itemsCard: { padding: 0, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  itemDivider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 12 },
  itemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  itemCategory: { fontSize: 11, color: '#94A3B8' },
  itemRight: { alignItems: 'flex-end' },
  itemQty: { fontSize: 11, color: '#94A3B8' },
  itemAmount: { fontSize: 14, fontWeight: '700', color: '#1B3A6B' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1B3A6B',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  totalRowLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  totalRowAmount: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  downloadBtn: { width: '100%' },
});
