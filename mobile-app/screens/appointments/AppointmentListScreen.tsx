import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { format, parseISO, isFuture, isToday } from 'date-fns';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppointmentsStackParamList } from '../../App';
import AppointmentCard from '../../components/AppointmentCard';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getPatientAppointments } from '../../lib/api';
import { getStoredPatient } from '../../lib/storage';
import type { Appointment } from '../../lib/api';

type NavProp = NativeStackNavigationProp<AppointmentsStackParamList, 'AppointmentList'>;

export default function AppointmentListScreen() {
  const navigation = useNavigation<NavProp>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(true);

  const fetchAppointments = useCallback(async () => {
    const patient = await getStoredPatient();
    if (!patient) return;
    try {
      const data = await getPatientAppointments(patient.id);
      setAppointments(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAppointments();
    }, [fetchAppointments])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const filtered = appointments.filter((a) => {
    const d = parseISO(a.appointmentDate);
    const upcoming = isFuture(d) || isToday(d);
    return showUpcoming ? upcoming : !upcoming;
  });

  if (loading) return <LoadingSpinner fullScreen message="சந்திப்புகள் ஏற்றுகிறது…" />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📅 Appointments</Text>
          <Text style={styles.headerSub}>சந்திப்புகள்</Text>
        </View>
        <Button
          label="+ Book New"
          onPress={() => navigation.navigate('BookAppointment')}
          size="sm"
          style={styles.bookBtn}
        />
      </View>

      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggle, showUpcoming && styles.toggleActive]}
          onPress={() => setShowUpcoming(true)}
        >
          <Text style={[styles.toggleLabel, showUpcoming && styles.toggleLabelActive]}>
            Upcoming / வரவிருப்பவை
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggle, !showUpcoming && styles.toggleActive]}
          onPress={() => setShowUpcoming(false)}
        >
          <Text style={[styles.toggleLabel, !showUpcoming && styles.toggleLabelActive]}>
            Past / கடந்த
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891B2" />}
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            onPress={() => navigation.navigate('AppointmentDetail', { appointment: item })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={showUpcoming ? 'வரவிருக்கும் சந்திப்புகள் இல்லை' : 'கடந்த சந்திப்புகள் இல்லை'}
            subtitle={showUpcoming ? 'No upcoming appointments.\nTap "+ Book New" to schedule one.' : 'No past appointment records found.'}
          />
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  bookBtn: { backgroundColor: '#D97706' },
  toggleRow: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
  },
  toggle: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: '#FFFFFF', elevation: 2 },
  toggleLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  toggleLabelActive: { color: '#1B3A6B', fontWeight: '700' },
  list: { paddingBottom: 32 },
});
