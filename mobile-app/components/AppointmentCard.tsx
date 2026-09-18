import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import Card from './ui/Card';
import Badge, { statusToBadgeVariant } from './ui/Badge';
import type { Appointment } from '../lib/api';

interface AppointmentCardProps {
  appointment: Appointment;
  onPress?: () => void;
}

export default function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const dateStr = format(parseISO(appointment.appointmentDate), 'dd MMM yyyy');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>
              {format(parseISO(appointment.appointmentDate), 'dd')}
            </Text>
            <Text style={styles.dateMonth}>
              {format(parseISO(appointment.appointmentDate), 'MMM')}
            </Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.patientName}>
              {appointment.patientName || 'Appointment'}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color="#64748B" />
              <Text style={styles.meta}>{appointment.timeSlot}</Text>
              <Ionicons name="ticket-outline" size={13} color="#64748B" style={styles.ml8} />
              <Text style={styles.meta}>Token #{appointment.tokenNumber}</Text>
            </View>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>

          <View style={styles.rightCol}>
            <Badge
              label={appointment.status}
              variant={statusToBadgeVariant(appointment.status)}
              size="sm"
            />
            {onPress && (
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={styles.chevron} />
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 10, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dateBadge: {
    width: 48,
    height: 56,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateDay: { fontSize: 20, fontWeight: '700', color: '#1B3A6B' },
  dateMonth: { fontSize: 11, fontWeight: '600', color: '#0891B2', textTransform: 'uppercase' },
  info: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  meta: { fontSize: 12, color: '#64748B', marginLeft: 4 },
  ml8: { marginLeft: 8 },
  dateText: { fontSize: 12, color: '#94A3B8' },
  rightCol: { alignItems: 'flex-end', gap: 8 },
  chevron: { marginTop: 4 },
});
