import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getQueueStatus, parseApiError } from '../lib/api';
import { getStoredPatient } from '../lib/storage';
import type { QueueStatus } from '../lib/api';

export default function QueueStatusScreen() {
  const [patient, setPatient] = useState<Awaited<ReturnType<typeof getStoredPatient>>>(null);
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const fetchStatus = useCallback(async () => {
    const p = await getStoredPatient();
    setPatient(p);
    if (!p) { setLoading(false); return; }
    try {
      const qs = await getQueueStatus(p.id);
      setStatus(qs);
      setError('');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchStatus();
      intervalRef.current = setInterval(fetchStatus, 15_000);
      return () => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [fetchStatus])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const progressPct =
    status && status.yourToken > 0
      ? Math.max(0, Math.min(1, status.currentToken / status.yourToken))
      : 0;

  if (loading) return <LoadingSpinner fullScreen message="Queue status loading…" />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎟 Queue Status</Text>
        <Text style={styles.headerSub}>வரிசை நிலை</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891B2" />}
      >
        {error ? (
          <Card style={styles.errorCard}>
            <Ionicons name="wifi-outline" size={32} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <Button label="மீண்டும் முயற்சி / Retry" onPress={fetchStatus} size="sm" style={{ marginTop: 12 }} />
          </Card>
        ) : !status || status.status === 'Not Found' ? (
          <Card style={styles.noApptCard}>
            <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
            <Text style={styles.noApptText}>இன்று சந்திப்பு இல்லை</Text>
            <Text style={styles.noApptSub}>No appointment scheduled for today</Text>
          </Card>
        ) : (
          <>
            {/* Current token being called */}
            <Card style={styles.currentCard}>
              <Text style={styles.currentLabel}>இப்போது அழைக்கப்படுகிறார்</Text>
              <Text style={styles.currentLabelEn}>Now Calling</Text>
              <Text style={styles.currentToken}>#{status.currentToken}</Text>
            </Card>

            {/* Your token */}
            <Animated.View style={{ transform: [{ scale: status.status === 'Called' ? pulseAnim : 1 }] }}>
              <Card style={[styles.yourCard, status.status === 'Called' && styles.calledCard]}>
                <Text style={styles.yourLabel}>உங்கள் டோக்கன் / Your Token</Text>
                <Text style={[styles.yourToken, status.status === 'Called' && styles.calledToken]}>
                  #{status.yourToken}
                </Text>
                <Badge
                  label={
                    status.status === 'Called' ? '📢 அழைக்கப்படுகிறீர்கள்! / You are being Called!' :
                    status.status === 'Completed' ? '✅ முடிந்தது / Completed' :
                    '⏳ காத்திருக்கிறீர்கள் / Waiting'
                  }
                  variant={
                    status.status === 'Called' ? 'purple' :
                    status.status === 'Completed' ? 'success' : 'warning'
                  }
                  style={{ alignSelf: 'center', marginTop: 8 }}
                />
              </Card>
            </Animated.View>

            {/* Progress */}
            <Card style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPct}>{Math.round(progressPct * 100)}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
              </View>
            </Card>

            {/* Stats */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Ionicons name="people-outline" size={24} color="#0891B2" />
                <Text style={styles.statValue}>{status.patientsAhead}</Text>
                <Text style={styles.statLabel}>
                  {status.patientsAhead === 0 ? 'நீங்கள் அடுத்தவர்!' : 'நோயாளிகள் முன்'}
                </Text>
                <Text style={styles.statLabelEn}>
                  {status.patientsAhead === 0 ? 'You are next!' : 'patients ahead'}
                </Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="time-outline" size={24} color="#D97706" />
                <Text style={[styles.statValue, { color: '#D97706' }]}>
                  {status.estimatedWaitMinutes > 0 ? `~${status.estimatedWaitMinutes}` : '<1'}
                </Text>
                <Text style={styles.statLabel}>சுமார் நிமிடங்கள்</Text>
                <Text style={styles.statLabelEn}>estimated min</Text>
              </Card>
            </View>

            <Text style={styles.refreshNote}>
              🔄 ஒவ்வொரு 15 விநாடியும் புதுப்பிக்கப்படுகிறது / Auto-refreshes every 15 seconds
            </Text>
          </>
        )}

        <Button
          label="புதுப்பி / Refresh Now"
          onPress={onRefresh}
          variant="outline"
          style={styles.refreshBtn}
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
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  errorCard: { alignItems: 'center', gap: 8, padding: 24 },
  errorText: { color: '#DC2626', textAlign: 'center', fontSize: 14 },
  noApptCard: { alignItems: 'center', gap: 8, padding: 32 },
  noApptText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  noApptSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  currentCard: {
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  currentLabel: { fontSize: 12, color: '#0369A1', fontWeight: '600' },
  currentLabelEn: { fontSize: 11, color: '#7DD3FC', marginBottom: 4 },
  currentToken: { fontSize: 56, fontWeight: '800', color: '#0891B2' },
  yourCard: { alignItems: 'center', padding: 24 },
  calledCard: { borderWidth: 2, borderColor: '#7C3AED', backgroundColor: '#FAF5FF' },
  yourLabel: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  yourToken: { fontSize: 72, fontWeight: '900', color: '#1B3A6B' },
  calledToken: { color: '#7C3AED' },
  progressCard: {},
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  progressPct: { fontSize: 13, fontWeight: '700', color: '#0891B2' },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#0891B2', borderRadius: 4 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 16, gap: 4 },
  statValue: { fontSize: 32, fontWeight: '800', color: '#1B3A6B' },
  statLabel: { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'center' },
  statLabelEn: { fontSize: 11, color: '#94A3B8', textAlign: 'center' },
  refreshNote: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  refreshBtn: { marginTop: 8 },
});
