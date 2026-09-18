import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import LabReportListScreen from './reports/LabReportListScreen';
import RadiologyListScreen from './reports/RadiologyListScreen';
import PrescriptionListScreen from './prescriptions/PrescriptionListScreen';

type Tab = 'lab' | 'radiology' | 'prescriptions';

export default function ReportsTabsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('lab');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Reports & Prescriptions</Text>
        <Text style={styles.headerSub}>சோதனை முடிவுகள் மற்றும் மருந்துகள்</Text>
      </View>
      <View style={styles.tabRow}>
        {(
          [
            { key: 'lab', label: '🧪 Lab' },
            { key: 'radiology', label: '📷 Scans' },
            { key: 'prescriptions', label: '💊 Rx' },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabLabel, activeTab === key && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        {activeTab === 'lab' && <LabReportListScreen />}
        {activeTab === 'radiology' && <RadiologyListScreen />}
        {activeTab === 'prescriptions' && <PrescriptionListScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: {
    backgroundColor: '#1B3A6B',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    margin: 12,
    borderRadius: 10,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  tabLabelActive: { color: '#1B3A6B', fontWeight: '700' },
  content: { flex: 1 },
});
