import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import Card from '../../components/ui/Card';
import Badge, { statusToBadgeVariant } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import type { AppointmentsStackParamList } from '../../App';

type Route = RouteProp<AppointmentsStackParamList, 'AppointmentDetail'>;

const STATUS_TAMIL: Record<string, string> = {
  Scheduled: 'திட்டமிடப்பட்டது',
  Waiting: 'காத்திருக்கிறது',
  Called: 'அழைக்கப்படுகிறீர்கள்',
  Completed: 'முடிந்தது',
  Cancelled: 'ரத்து செய்யப்பட்டது',
  'No Show': 'வருகை இல்லை',
};

export default function AppointmentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { appointment } = route.params;

  if (!appointment) {
    return null;
  }

  const d = parseISO(appointment.appointmentDate);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <Text style={styles.headerSub}>சந்திப்பு விவரங்கள்</Text>
        </View>
        <Badge label={appointment.status} variant={statusToBadgeVariant(appointment.status)} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Token card */}
        <Card style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>டோக்கன் எண் / Token Number</Text>
          <Text style={styles.tokenValue}>#{appointment.tokenNumber}</Text>
        </Card>

        {/* Date & time */}
        <Text style={styles.sectionTitle}>சந்திப்பு விவரங்கள் / Appointment Details</Text>
        <Card style={styles.detailCard}>
          <View style={styles.detailRow}>
            <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar-outline" size={18} color="#1B3A6B" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>தேதி / Date</Text>
              <Text style={styles.detailValue}>{format(d, 'dd MMMM yyyy')}</Text>
              <Text style={styles.detailSub}>{format(d, 'EEEE')}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={[styles.iconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="time-outline" size={18} color="#16A34A" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>நேரம் / Time Slot</Text>
              <Text style={styles.detailValue}>{appointment.timeSlot}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={[styles.iconWrap, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="person-outline" size={18} color="#0891B2" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>நோயாளி / Patient</Text>
              <Text style={styles.detailValue}>{appointment.patientName || '—'}</Text>
            </View>
          </View>
          {appointment.notes ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={[styles.iconWrap, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="document-text-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>குறிப்புகள் / Notes</Text>
                  <Text style={styles.detailValue}>{appointment.notes}</Text>
                </View>
              </View>
            </>
          ) : null}
        </Card>

        {/* Status */}
        <Text style={styles.sectionTitle}>நிலை / Status</Text>
        <Card style={styles.statusCard}>
          <Ionicons
            name={
              appointment.status === 'Completed' ? 'checkmark-circle-outline' :
              appointment.status === 'Cancelled' ? 'close-circle-outline' :
              appointment.status === 'Called' ? 'megaphone-outline' : 'time-outline'
            }
            size={32}
            color={
              appointment.status === 'Completed' ? '#16A34A' :
              appointment.status === 'Cancelled' ? '#DC2626' :
              appointment.status === 'Called' ? '#7C3AED' : '#D97706'
            }
          />
          <Text style={styles.statusValue}>{appointment.status}</Text>
          <Text style={styles.statusTa}>{STATUS_TAMIL[appointment.status] ?? ''}</Text>
          {appointment.status === 'Waiting' || appointment.status === 'Scheduled' ? (
            <Text style={styles.statusHint}>
              வந்தவுடன் OPD வரவேற்பில் பதிவு செய்யவும்
              {'\n'}Please re-register at the OPD reception on arrival
            </Text>
          ) : null}
        </Card>

        <Button
          label="சந்திப்புகள் / Back to Appointments"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.backBtn}
        />
      </ScrollView>
    </View>
  );
}

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
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  tokenCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tokenLabel: { fontSize: 13, color: '#1D4ED8', fontWeight: '600', marginBottom: 4 },
  tokenValue: { fontSize: 56, fontWeight: '900', color: '#1B3A6B' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  detailCard: { gap: 0, padding: 0, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailInfo: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  detailSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 },
  statusCard: { alignItems: 'center', gap: 6, padding: 24 },
  statusValue: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  statusTa: { fontSize: 13, color: '#64748B' },
  statusHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  backBtn: { width: '100%' },
});