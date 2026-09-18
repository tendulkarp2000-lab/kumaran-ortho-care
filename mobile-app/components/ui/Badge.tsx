import React from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md';
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error:   { bg: '#FEE2E2', text: '#991B1B' },
  info:    { bg: '#DBEAFE', text: '#1E40AF' },
  neutral: { bg: '#F1F5F9', text: '#475569' },
  purple:  { bg: '#EDE9FE', text: '#5B21B6' },
};

export default function Badge({ label, variant = 'neutral', style, textStyle, size = 'md' }: BadgeProps) {
  const colors = VARIANT_STYLES[variant];
  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: colors.bg },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.text }, size === 'sm' && styles.labelSm, textStyle]}>
        {label}
      </Text>
    </View>
  );
}

export function statusToBadgeVariant(
  status: string
): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    Scheduled: 'info',
    Waiting: 'warning',
    Called: 'purple',
    Completed: 'success',
    Cancelled: 'error',
    'No Show': 'neutral',
    Pending: 'warning',
    Processing: 'info',
    Collected: 'info',
    Paid: 'success',
    Partial: 'warning',
    Unpaid: 'error',
  };
  return map[status] ?? 'neutral';
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  md: { paddingVertical: 4, paddingHorizontal: 10 },
  sm: { paddingVertical: 2, paddingHorizontal: 8 },
  label: { fontWeight: '600', fontSize: 12 },
  labelSm: { fontSize: 11 },
});
