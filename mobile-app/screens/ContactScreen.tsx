import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/ui/Card';

interface ContactItem {
  icon: any;
  label: string;
  labelTa: string;
  value: string;
  action?: () => void;
  bg: string;
  color: string;
}

export default function ContactScreen() {
  const contactItems: ContactItem[] = [
    {
      icon: 'call',
      label: 'OPD Reception',
      labelTa: 'OPD வரவேற்பு',
      value: '+91 431 234 5678',
      action: () => Linking.openURL('tel:+914312345678'),
      bg: '#EFF6FF',
      color: '#1B3A6B',
    },
    {
      icon: 'call',
      label: 'Emergency',
      labelTa: 'அவசர நிலை',
      value: '+91 431 234 5679',
      action: () => Linking.openURL('tel:+914312345679'),
      bg: '#FEF2F2',
      color: '#DC2626',
    },
    {
      icon: 'logo-whatsapp',
      label: 'WhatsApp',
      labelTa: 'வாட்ஸ்அப்',
      value: '+91 98765 43210',
      action: () => Linking.openURL('https://wa.me/919876543210'),
      bg: '#F0FDF4',
      color: '#16A34A',
    },
    {
      icon: 'mail-outline',
      label: 'Email',
      labelTa: 'மின்னஞ்சல்',
      value: 'info@kumaranortho.in',
      action: () => Linking.openURL('mailto:info@kumaranortho.in'),
      bg: '#FFF7ED',
      color: '#D97706',
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📞 Contact Us</Text>
        <Text style={styles.headerSub}>தொடர்பு கொள்ள</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Hospital info */}
        <Card style={styles.hospitalCard}>
          <View style={styles.hospitalIcon}>
            <Ionicons name="medical" size={36} color="#1B3A6B" />
          </View>
          <Text style={styles.hospitalName}>Kumaran Robotic Ortho Care</Text>
          <Text style={styles.doctorName}>Dr. P.L. Vijayakumar, MS Ortho</Text>
          <Text style={styles.doctorSpec}>Robotic Joint Replacement Specialist</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.address}>123, Srirangam Main Road,{'\n'}Trichy - 620 006, Tamil Nadu</Text>
          </View>
        </Card>

        {/* Contact buttons */}
        <Text style={styles.sectionTitle}>தொடர்பு எண்கள் / Contact Numbers</Text>
        <Card style={styles.contactsCard}>
          {contactItems.map((item, idx) => (
            <React.Fragment key={idx}>
              <TouchableOpacity style={styles.contactItem} onPress={item.action} activeOpacity={0.75}>
                <View style={[styles.contactIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>{item.label}</Text>
                  <Text style={styles.contactLabelTa}>{item.labelTa}</Text>
                  <Text style={[styles.contactValue, { color: item.color }]}>{item.value}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
              {idx < contactItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </Card>

        {/* Map */}
        <Text style={styles.sectionTitle}>வழிகாட்டி / Directions</Text>
        <TouchableOpacity
          style={styles.mapCard}
          onPress={() => Linking.openURL('https://maps.google.com/?q=Kumaran+Ortho+Care+Trichy')}
          activeOpacity={0.85}
        >
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color="#FFFFFF" />
            <Text style={styles.mapText}>Google Maps-ல் திற</Text>
            <Text style={styles.mapTextSub}>Open in Google Maps</Text>
          </View>
        </TouchableOpacity>

        {/* Hours */}
        <Text style={styles.sectionTitle}>நேரம் / Opening Hours</Text>
        <Card style={styles.hoursCard}>
          {[
            { day: 'Monday – Saturday', dayTa: 'திங்கள் – சனி', time: '9:00 AM – 6:00 PM' },
            { day: 'Sunday', dayTa: 'ஞாயிறு', time: '10:00 AM – 1:00 PM' },
            { day: 'Emergency', dayTa: 'அவசர நிலை', time: '24 × 7' },
          ].map((h, idx) => (
            <View key={idx} style={[styles.hoursRow, idx !== 0 && styles.hoursBorder]}>
              <View>
                <Text style={styles.hoursDay}>{h.day}</Text>
                <Text style={styles.hoursDayTa}>{h.dayTa}</Text>
              </View>
              <Text style={[styles.hoursTime, h.day === 'Emergency' && styles.emergencyTime]}>
                {h.time}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { backgroundColor: '#1B3A6B', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  body: { padding: 16, gap: 8, paddingBottom: 40 },
  hospitalCard: { alignItems: 'center', gap: 4, padding: 20 },
  hospitalIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hospitalName: { fontSize: 16, fontWeight: '700', color: '#1B3A6B', textAlign: 'center' },
  doctorName: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
  doctorSpec: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  addressRow: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'flex-start' },
  address: { fontSize: 13, color: '#475569', lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 8 },
  contactsCard: { gap: 0, padding: 0, overflow: 'hidden' },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  contactIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  contactLabelTa: { fontSize: 11, color: '#94A3B8' },
  contactValue: { fontSize: 14, fontWeight: '500', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 },
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1B3A6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  mapPlaceholder: {
    backgroundColor: '#0891B2',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  mapTextSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  hoursCard: { gap: 0, padding: 0, overflow: 'hidden' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  hoursBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  hoursDay: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  hoursDayTa: { fontSize: 11, color: '#94A3B8' },
  hoursTime: { fontSize: 13, fontWeight: '600', color: '#0891B2' },
  emergencyTime: { color: '#DC2626' },
});
