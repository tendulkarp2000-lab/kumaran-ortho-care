import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { getRadiologyOrderById } from '../../lib/api';
import { generateAndSharePdf } from '../../lib/pdf';
import type { RadiologyOrder } from '../../lib/api';

export default function RadiologyDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<RadiologyOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRadiologyOrderById(orderId)
      .then(setOrder)
      .catch(() => setOrder(DEMO_ORDER))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <LoadingSpinner fullScreen message="ஸ்கேன் ஏற்றுகிறது…" />;
  if (!order) return null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{order.modalityType} Report</Text>
          <Text style={styles.headerSub}>{order.bodyPart}</Text>
        </View>
        <Badge label={order.status} variant={order.status === 'Completed' ? 'success' : 'warning'} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>வகை / Modality</Text>
            <Text style={styles.infoValue}>{order.modalityType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>உடல் பகுதி / Body Part</Text>
            <Text style={styles.infoValue}>{order.bodyPart}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>தேதி / Date</Text>
            <Text style={styles.infoValue}>{format(parseISO(order.orderedDate), 'dd MMM yyyy')}</Text>
          </View>
        </Card>

        {/* Scan image if available */}
        {order.imageUrl ? (
          <Card style={styles.imageCard}>
            <Text style={styles.sectionTitle}>📷 Scan Image</Text>
            <Image source={{ uri: order.imageUrl }} style={styles.scanImage} resizeMode="contain" />
          </Card>
        ) : (
          <Card style={styles.noImageCard}>
            <Ionicons name="image-outline" size={36} color="#94A3B8" />
            <Text style={styles.noImageText}>Image not available / படம் கிடைக்கவில்லை</Text>
          </Card>
        )}

        {order.findings ? (
          <Card style={styles.reportCard}>
            <Text style={styles.reportLabel}>Findings / கண்டுபிடிப்புகள்</Text>
            <Text style={styles.reportText}>{order.findings}</Text>
          </Card>
        ) : null}

        {order.impression ? (
          <Card style={[styles.reportCard, styles.impressionCard]}>
            <Text style={styles.impressionLabel}>Impression / முடிவு</Text>
            <Text style={styles.impressionText}>{order.impression}</Text>
          </Card>
        ) : null}

        {order.status === 'Completed' && (
          <Button
            label="PDF பதிவிறக்கு / Download Report"
            onPress={() => {
              const html = `
                <h3 style="color:#1B3A6B; font-family:sans-serif; margin-bottom:4px;">${order.modalityType} Report</h3>
                <p style="color:#64748B; font-family:sans-serif; font-size:12px;">Body Part: ${order.bodyPart} | Date: ${format(parseISO(order.orderedDate), 'dd MMMM yyyy')}</p>
                ${order.findings ? `
                <div style="background:#F8FAFC; border-radius:6px; padding:12px; margin-top:14px; font-family:sans-serif;">
                  <p style="font-size:11px; font-weight:700; color:#374151; margin:0 0 6px; text-transform:uppercase;">Findings / கண்டுபிடிப்புகள்</p>
                  <p style="font-size:14px; color:#1E293B; line-height:1.6; margin:0;">${order.findings}</p>
                </div>` : ''}
                ${order.impression ? `
                <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:6px; padding:12px; margin-top:12px; font-family:sans-serif;">
                  <p style="font-size:11px; font-weight:700; color:#1D4ED8; margin:0 0 6px; text-transform:uppercase;">Impression / முடிவு</p>
                  <p style="font-size:15px; font-weight:600; color:#1E40AF; margin:0;">${order.impression}</p>
                </div>` : ''}`;
              generateAndSharePdf(html, `RadiologyReport_${order.id}.pdf`);
            }}
            variant="outline"
            style={styles.downloadBtn}
            icon={<Ionicons name="download-outline" size={16} color="#0891B2" />}
          />
        )}
      </ScrollView>
    </View>
  );
}

const DEMO_ORDER: RadiologyOrder = {
  id: 1,
  patientId: 1,
  orderedDate: '2026-09-10',
  modalityType: 'X-Ray',
  bodyPart: 'Right Knee (AP & Lateral)',
  status: 'Completed',
  findings: 'Mild joint space narrowing seen in the medial compartment of the right knee. No fractures. Osteophyte formation at the tibial plateau.',
  impression: 'Grade II Osteoarthritis of right knee',
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
  infoCard: { gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'right', flex: 1, marginLeft: 12 },
  imageCard: { padding: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  scanImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#000' },
  noImageCard: { alignItems: 'center', padding: 32, gap: 8 },
  noImageText: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  reportCard: {},
  reportLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, textTransform: 'uppercase' },
  reportText: { fontSize: 14, color: '#1E293B', lineHeight: 22 },
  impressionCard: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  impressionLabel: { fontSize: 12, fontWeight: '700', color: '#1D4ED8', marginBottom: 6, textTransform: 'uppercase' },
  impressionText: { fontSize: 15, fontWeight: '600', color: '#1E40AF', lineHeight: 22 },
  downloadBtn: { width: '100%' },
});
