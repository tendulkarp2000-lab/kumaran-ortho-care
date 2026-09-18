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
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { getPrescriptionById } from '../../lib/api';
import { generateAndSharePdf } from '../../lib/pdf';
import type { Prescription } from '../../lib/api';

const FREQ_TAMIL: Record<string, string> = {
  'Once daily': 'தினமும் ஒருமுறை',
  'Twice daily': 'தினமும் இருமுறை',
  'Three times daily': 'தினமும் மூன்றுமுறை',
  'Four times daily': 'தினமும் நான்குமுறை',
  'At bedtime': 'தூங்குவதற்கு முன்',
  'As needed': 'தேவைப்படும்போது',
};

export default function PrescriptionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { prescriptionId } = route.params;
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPrescriptionById(prescriptionId)
      .then(setPrescription)
      .catch(() => setPrescription(DEMO_PRESCRIPTION))
      .finally(() => setLoading(false));
  }, [prescriptionId]);

  if (loading) return <LoadingSpinner fullScreen message="மருந்துச் சீட்டு ஏற்றுகிறது…" />;
  if (!prescription) return null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>மருந்துச் சீட்டு / Prescription</Text>
          <Text style={styles.headerSub}>{format(parseISO(prescription.visitDate), 'dd MMM yyyy')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Rx Header */}
        <Card style={styles.rxHeader}>
          <View style={styles.rxTop}>
            <Text style={styles.rxMark}>℞</Text>
            <View style={styles.rxDoctorInfo}>
              <Text style={styles.doctorName}>Dr. P.L. Vijayakumar, MS Ortho</Text>
              <Text style={styles.doctorSpec}>Robotic Joint Replacement Specialist</Text>
              <Text style={styles.rxDate}>{format(parseISO(prescription.visitDate), 'dd MMMM yyyy')}</Text>
            </View>
          </View>
          <View style={styles.diagnosisRow}>
            <Text style={styles.diagnosisLabel}>நோய் நிலை / Diagnosis:</Text>
            <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
          </View>
          {prescription.notes ? (
            <Text style={styles.notes}>📝 {prescription.notes}</Text>
          ) : null}
        </Card>

        {/* Medicine list */}
        <Text style={styles.sectionTitle}>மருந்துகள் / Medicines ({prescription.medicines.length})</Text>
        {prescription.medicines.map((med, idx) => (
          <Card key={med.id} style={styles.medCard}>
            <View style={styles.medHeader}>
              <View style={styles.medNum}>
                <Text style={styles.medNumText}>{idx + 1}</Text>
              </View>
              <Text style={styles.medName}>{med.medicineName}</Text>
            </View>
            <View style={styles.medGrid}>
              <View style={styles.medDetail}>
                <Text style={styles.medDetailLabel}>அளவு / Dose</Text>
                <Text style={styles.medDetailValue}>{med.dosage}</Text>
              </View>
              <View style={styles.medDetail}>
                <Text style={styles.medDetailLabel}>அதிர்வெண் / Frequency</Text>
                <Text style={styles.medDetailValue}>{med.frequency}</Text>
                <Text style={styles.medDetailTa}>{FREQ_TAMIL[med.frequency] ?? ''}</Text>
              </View>
              <View style={styles.medDetail}>
                <Text style={styles.medDetailLabel}>காலம் / Duration</Text>
                <Text style={styles.medDetailValue}>{med.duration}</Text>
              </View>
            </View>
            {med.instructions ? (
              <View style={styles.instructionRow}>
                <Ionicons name="information-circle-outline" size={14} color="#D97706" />
                <Text style={styles.instruction}>{med.instructions}</Text>
              </View>
            ) : null}
          </Card>
        ))}

        <Button
          label="PDF பதிவிறக்கு / Download PDF"
          onPress={() => {
            const medRows = prescription.medicines.map(
              (med, idx) => `
                <div style="padding:10px 14px; margin-bottom:8px; background:#F8FAFC; border-radius:6px; border-left:3px solid #1B3A6B; font-family:sans-serif;">
                  <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                    <span style="background:#1B3A6B; color:#fff; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;">${idx + 1}</span>
                    <strong style="font-size:13px; color:#1E293B;">${med.medicineName}</strong>
                  </div>
                  <div style="display:flex; gap:12px; font-size:12px; color:#374151;">
                    <div><span style="color:#94A3B8; font-size:10px;">DOSE</span><br/>${med.dosage}</div>
                    <div><span style="color:#94A3B8; font-size:10px;">FREQUENCY</span><br/>${med.frequency}${FREQ_TAMIL[med.frequency] ? ` (${FREQ_TAMIL[med.frequency]})` : ''}</div>
                    <div><span style="color:#94A3B8; font-size:10px;">DURATION</span><br/>${med.duration}</div>
                  </div>
                  ${med.instructions ? `<p style="font-size:11px; color:#92400E; margin-top:6px;">Note: ${med.instructions}</p>` : ''}
                </div>`
            ).join('');
            const html = `
              <div style="font-family:sans-serif; margin-bottom:16px;">
                <p style="font-size:24px; font-weight:800; color:#1B3A6B; margin:0;">℞</p>
              </div>
              <p style="font-size:12px; color:#64748B; font-family:sans-serif;">Visit Date: ${format(parseISO(prescription.visitDate), 'dd MMMM yyyy')}</p>
              <div style="background:#F0F9FF; border-radius:6px; padding:10px; margin:10px 0 16px; font-family:sans-serif;">
                <p style="font-size:12px; color:#0369A1; font-weight:600; margin:0 0 2px;">Diagnosis / நோய் நிலை</p>
                <p style="font-size:14px; font-weight:600; color:#1E293B; margin:0;">${prescription.diagnosis}</p>
              </div>
              ${prescription.notes ? `<p style="font-size:12px; color:#64748B; font-style:italic; margin-bottom:12px; font-family:sans-serif;">Note: ${prescription.notes}</p>` : ''}
              <p style="font-size:14px; font-weight:700; color:#374151; margin-bottom:8px; font-family:sans-serif;">Medicines / மருந்துகள் (${prescription.medicines.length})</p>
              ${medRows}`;
            generateAndSharePdf(html, `Prescription_${prescription.id}.pdf`);
          }}
          variant="outline"
          style={styles.downloadBtn}
          icon={<Ionicons name="download-outline" size={16} color="#0891B2" />}
        />
      </ScrollView>
    </View>
  );
}

const DEMO_PRESCRIPTION: Prescription = {
  id: 1,
  patientId: 1,
  visitDate: '2026-09-10',
  diagnosis: 'Osteoarthritis - Right Knee',
  notes: 'Rest advised. Avoid weight bearing activities.',
  medicines: [
    { id: 1, medicineName: 'Tab. Diclofenac 50mg', dosage: '50mg', frequency: 'Twice daily', duration: '5 days', instructions: 'After food' },
    { id: 2, medicineName: 'Tab. Pantoprazole 40mg', dosage: '40mg', frequency: 'Once daily', duration: '5 days', instructions: 'Before food (empty stomach)' },
    { id: 3, medicineName: 'Knee Cap (Medium)', dosage: '1 unit', frequency: 'As needed', duration: 'Ongoing', instructions: 'Wear during walking' },
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
    gap: 16,
  },
  headerText: {},
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  body: { padding: 16, paddingBottom: 40 },
  rxHeader: { marginBottom: 16 },
  rxTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  rxMark: { fontSize: 36, fontWeight: '800', color: '#1B3A6B', lineHeight: 44 },
  rxDoctorInfo: { flex: 1 },
  doctorName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  doctorSpec: { fontSize: 12, color: '#64748B' },
  rxDate: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  diagnosisRow: { backgroundColor: '#F0F9FF', borderRadius: 8, padding: 10 },
  diagnosisLabel: { fontSize: 12, color: '#0369A1', fontWeight: '600', marginBottom: 2 },
  diagnosisText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  notes: { marginTop: 8, fontSize: 13, color: '#64748B', lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  medCard: { marginBottom: 10, padding: 14 },
  medHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  medNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1B3A6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medNumText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  medName: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1 },
  medGrid: { flexDirection: 'row', gap: 8 },
  medDetail: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8 },
  medDetailLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
  medDetailValue: { fontSize: 12, fontWeight: '600', color: '#374151' },
  medDetailTa: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  instruction: { fontSize: 12, color: '#92400E', flex: 1 },
  downloadBtn: { width: '100%', marginTop: 8 },
});
