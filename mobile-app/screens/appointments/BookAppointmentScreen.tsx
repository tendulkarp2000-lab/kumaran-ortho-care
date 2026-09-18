import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfToday, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getAvailableSlots, bookAppointment, parseApiError } from '../../lib/api';
import { getStoredPatient } from '../../lib/storage';
import type { TimeSlot } from '../../lib/api';

export default function BookAppointmentScreen() {
  const navigation = useNavigation<any>();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<{ token: number; date: string; time: string } | null>(null);

  const dateOptions = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));

  useEffect(() => {
    loadSlots();
    setSelectedSlot(null);
  }, [selectedDate]);

  async function loadSlots() {
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await getAvailableSlots(dateStr);
      setSlots(data);
    } catch {
      // server might not be reachable, show demo slots
      setSlots(DEMO_SLOTS);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleBook() {
    if (!selectedSlot) {
      Alert.alert('நேரம் தேர்வு செய்க / Select Time', 'Please select a time slot to continue.');
      return;
    }
    const patient = await getStoredPatient();
    if (!patient) return;
    setBooking(true);
    try {
      const appt = await bookAppointment({
        patientId: patient.id,
        appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
        timeSlot: selectedSlot,
      });
      setBooked({ token: appt.tokenNumber, date: format(selectedDate, 'dd MMM yyyy'), time: selectedSlot });
    } catch (err) {
      Alert.alert('பிழை / Error', parseApiError(err));
    } finally {
      setBooking(false);
    }
  }

  if (booked) {
    return (
      <View style={styles.successRoot}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#16A34A" />
        </View>
        <Text style={styles.successTitle}>சந்திப்பு உறுதிப்படுத்தப்பட்டது!</Text>
        <Text style={styles.successTitleEn}>Appointment Confirmed!</Text>
        <Card style={styles.successCard}>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>டோக்கன் / Token</Text>
            <Text style={styles.successToken}>#{booked.token}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>தேதி / Date</Text>
            <Text style={styles.successValue}>{booked.date}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>நேரம் / Time</Text>
            <Text style={styles.successValue}>{booked.time}</Text>
          </View>
        </Card>
        <Button
          label="முகப்பு / Go Home"
          onPress={() => navigation.navigate('Home')}
          style={styles.successBtn}
        />
        <Button
          label="மேலும் சந்திப்பு / Book Another"
          onPress={() => { setBooked(null); setSelectedSlot(null); }}
          variant="outline"
          style={{ marginTop: 10 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSub}>சந்திப்பு பதிவு</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Date picker */}
        <Text style={styles.sectionLabel}>தேதி தேர்வு / Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {dateOptions.map((date) => {
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isToday = format(date, 'yyyy-MM-dd') === format(startOfToday(), 'yyyy-MM-dd');
            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextActive]}>
                  {format(date, 'EEE')}
                </Text>
                <Text style={[styles.dateChipNum, isSelected && styles.dateChipNumActive]}>
                  {format(date, 'd')}
                </Text>
                {isToday && <Text style={styles.todayDot}>•</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time slots */}
        <Text style={styles.sectionLabel}>நேரம் தேர்வு / Select Time</Text>
        {slotsLoading ? (
          <LoadingSpinner message="நேர இடங்கள் ஏற்றுகிறது…" />
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => {
              const isSelected = selectedSlot === slot.time;
              return (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.slotChip,
                    isSelected && styles.slotChipActive,
                    !slot.available && styles.slotChipDisabled,
                  ]}
                  onPress={() => slot.available && setSelectedSlot(slot.time)}
                  disabled={!slot.available}
                >
                  <Text style={[styles.slotTime, isSelected && styles.slotTimeActive, !slot.available && styles.slotTimeDimmed]}>
                    {slot.time}
                  </Text>
                  <Text style={[styles.slotCount, !slot.available && styles.slotTimeDimmed]}>
                    {slot.available ? `${slot.count} left` : 'Full'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedSlot && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>சந்திப்பு விவரங்கள் / Appointment Summary</Text>
            <Text style={styles.summaryLine}>📅 {format(selectedDate, 'dd MMMM yyyy, EEEE')}</Text>
            <Text style={styles.summaryLine}>⏰ {selectedSlot}</Text>
          </Card>
        )}

        <Button
          label={selectedSlot ? 'சந்திப்பை உறுதிப்படுத்து / Confirm Appointment' : 'நேரம் தேர்வு செய்க / Select a Slot'}
          onPress={handleBook}
          loading={booking}
          disabled={!selectedSlot}
          style={styles.confirmBtn}
          size="lg"
        />
      </ScrollView>
    </View>
  );
}

const DEMO_SLOTS: TimeSlot[] = [
  { time: '09:00 AM', available: true, count: 3 },
  { time: '09:30 AM', available: true, count: 2 },
  { time: '10:00 AM', available: false, count: 0 },
  { time: '10:30 AM', available: true, count: 4 },
  { time: '11:00 AM', available: false, count: 0 },
  { time: '11:30 AM', available: true, count: 1 },
  { time: '12:00 PM', available: true, count: 5 },
  { time: '02:00 PM', available: true, count: 3 },
  { time: '02:30 PM', available: false, count: 0 },
  { time: '03:00 PM', available: true, count: 2 },
  { time: '03:30 PM', available: true, count: 4 },
  { time: '04:00 PM', available: true, count: 2 },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  successRoot: { flex: 1, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', padding: 24 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#065F46', textAlign: 'center' },
  successTitleEn: { fontSize: 15, color: '#34D399', marginBottom: 24, textAlign: 'center' },
  successCard: { width: '100%', marginBottom: 24, gap: 12 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  successLabel: { fontSize: 13, color: '#64748B' },
  successToken: { fontSize: 28, fontWeight: '800', color: '#1B3A6B' },
  successValue: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  successBtn: { width: '100%' },
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
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 4 },
  dateScroll: { marginBottom: 20 },
  dateChip: {
    width: 60,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dateChipActive: { backgroundColor: '#1B3A6B', borderColor: '#1B3A6B' },
  dateChipDay: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  dateChipNum: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  dateChipTextActive: { color: 'rgba(255,255,255,0.8)' },
  dateChipNumActive: { color: '#FFFFFF' },
  todayDot: { fontSize: 18, color: '#D97706', lineHeight: 14 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  slotChip: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  slotChipActive: { backgroundColor: '#0891B2', borderColor: '#0891B2' },
  slotChipDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  slotTime: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  slotTimeActive: { color: '#FFFFFF' },
  slotTimeDimmed: { color: '#CBD5E1' },
  slotCount: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  summaryCard: { marginBottom: 16, gap: 6, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#0369A1', marginBottom: 4 },
  summaryLine: { fontSize: 14, color: '#1E293B' },
  confirmBtn: { width: '100%' },
});
