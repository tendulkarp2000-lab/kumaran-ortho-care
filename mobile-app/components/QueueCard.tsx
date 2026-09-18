import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './ui/Card';
import Badge from './ui/Badge';
import type { QueueStatus } from '../lib/api';

interface QueueCardProps {
  status: QueueStatus | null;
  loading?: boolean;
}

function waitLabel(mins: number): string {
  if (mins <= 0) return 'சீக்கிரம் / Soon';
  return `~${mins} நிமிடம் / ${mins} min`;
}

function positionLabel(ahead: number): string {
  if (ahead === 0) return 'நீங்கள் அடுத்தவர்! / You are next!';
  if (ahead === 1) return '1 நோயாளி முன் / 1 patient ahead';
  return `${ahead} நோயாளிகள் முன் / ${ahead} patients ahead`;
}

export default function QueueCard({ status, loading }: QueueCardProps) {
  if (loading || !status) {
    return (
      <Card style={styles.card}>
        <Text style={styles.loadingText}>Queue status loading… / ஏற்றுகிறது…</Text>
      </Card>
    );
  }

  if (status.status === 'Not Found') {
    return (
      <Card style={styles.card}>
        <Text style={styles.noAppt}>இன்று சந்திப்பு இல்லை</Text>
        <Text style={styles.noApptSub}>No appointment scheduled today</Text>
      </Card>
    );
  }

  const isCalled = status.status === 'Called';
  const isDone = status.status === 'Completed';

  return (
    <Card style={[styles.card, isCalled && styles.calledCard]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>உங்கள் டோக்கன் / Your Token</Text>
          <Text style={[styles.tokenNumber, isCalled && styles.calledToken]}>
            #{status.yourToken}
          </Text>
        </View>
        <Badge
          label={isCalled ? '📢 அழைக்கப்படுகிறீர்கள்!' : isDone ? '✅ முடிந்தது' : '⏳ காத்திருக்கிறீர்கள்'}
          variant={isCalled ? 'purple' : isDone ? 'success' : 'warning'}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={18} color="#0891B2" />
          <Text style={styles.statLabel}>{positionLabel(status.patientsAhead)}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={18} color="#D97706" />
          <Text style={styles.statLabel}>{waitLabel(status.estimatedWaitMinutes)}</Text>
        </View>
      </View>

      <View style={styles.currentRow}>
        <Text style={styles.currentLabel}>இப்போது அழைக்கப்படுகிறார் / Now Calling:</Text>
        <Text style={styles.currentToken}>#{status.currentToken}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12 },
  calledCard: { borderWidth: 2, borderColor: '#7C3AED' },
  loadingText: { color: '#94A3B8', textAlign: 'center', fontSize: 14 },
  noAppt: { fontSize: 15, fontWeight: '600', color: '#334155', textAlign: 'center' },
  noApptSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  tokenNumber: { fontSize: 48, fontWeight: '800', color: '#1B3A6B', lineHeight: 56 },
  calledToken: { color: '#7C3AED' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 13, color: '#475569', fontWeight: '500', flexShrink: 1 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F4F8', borderRadius: 8, padding: 10 },
  currentLabel: { fontSize: 13, color: '#64748B', flex: 1 },
  currentToken: { fontSize: 20, fontWeight: '700', color: '#0891B2' },
});
