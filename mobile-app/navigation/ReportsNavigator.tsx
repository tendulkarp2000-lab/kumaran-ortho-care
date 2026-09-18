import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LabReportDetailScreen from '../screens/reports/LabReportDetailScreen';
import RadiologyDetailScreen from '../screens/reports/RadiologyDetailScreen';
import PrescriptionDetailScreen from '../screens/prescriptions/PrescriptionDetailScreen';
import ReportsTabsScreen from '../screens/ReportsTabsScreen';

export type ReportsStackParamList = {
  ReportsTabs: undefined;
  LabReportDetail: { orderId: number };
  RadiologyDetail: { orderId: number };
  PrescriptionDetail: { prescriptionId: number };
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export default function ReportsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsTabs" component={ReportsTabsScreen} />
      <Stack.Screen name="LabReportDetail" component={LabReportDetailScreen} />
      <Stack.Screen name="RadiologyDetail" component={RadiologyDetailScreen} />
      <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
    </Stack.Navigator>
  );
}
