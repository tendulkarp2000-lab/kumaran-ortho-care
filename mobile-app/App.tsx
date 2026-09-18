import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import QueueStatusScreen from './screens/QueueStatusScreen';
import ContactScreen from './screens/ContactScreen';
import ProfileScreen from './screens/profile/ProfileScreen';

// Appointment screens
import AppointmentListScreen from './screens/appointments/AppointmentListScreen';
import BookAppointmentScreen from './screens/appointments/BookAppointmentScreen';
import AppointmentDetailScreen from './screens/appointments/AppointmentDetailScreen';

// Billing screens
import BillListScreen from './screens/billing/BillListScreen';
import BillDetailScreen from './screens/billing/BillDetailScreen';

// Reports navigator (Lab + Radiology + Prescriptions)
import ReportsNavigator from './navigation/ReportsNavigator';

// Storage
import { getStoredPatient } from './lib/storage';
import type { Appointment } from './lib/api';

// ─── Type declarations ────────────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainApp: undefined;
};

export type TabParamList = {
  Home: undefined;
  Appointments: undefined;
  Reports: undefined;
  Bills: undefined;
  Profile: undefined;
};

export type AppointmentsStackParamList = {
  AppointmentList: undefined;
  BookAppointment: undefined;
  AppointmentDetail: { appointment: Appointment };
};

export type BillsStackParamList = {
  BillList: undefined;
  BillDetail: { billId: number };
};

// ─── Navigators ───────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const AppointmentsStack = createNativeStackNavigator<AppointmentsStackParamList>();
const BillsStack = createNativeStackNavigator<BillsStackParamList>();

// ─── Notifications setup ──────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Nested Stacks ────────────────────────────────────────────────────────────

function AppointmentsNavigator() {
  return (
    <AppointmentsStack.Navigator screenOptions={{ headerShown: false }}>
      <AppointmentsStack.Screen name="AppointmentList" component={AppointmentListScreen} />
      <AppointmentsStack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <AppointmentsStack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
    </AppointmentsStack.Navigator>
  );
}

function BillsNavigator() {
  return (
    <BillsStack.Navigator screenOptions={{ headerShown: false }}>
      <BillsStack.Screen name="BillList" component={BillListScreen} />
      <BillsStack.Screen name="BillDetail" component={BillDetailScreen} />
    </BillsStack.Navigator>
  );
}

// ─── Tab Icon helper ──────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Appointments: { active: 'calendar', inactive: 'calendar-outline' },
  Reports: { active: 'document-text', inactive: 'document-text-outline' },
  Bills: { active: 'receipt', inactive: 'receipt-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = {
  Home: 'முகப்பு',
  Appointments: 'சந்திப்பு',
  Reports: 'அறிக்கை',
  Bills: 'பில்',
  Profile: 'சுயவிவரம்',
};

// ─── Main Tab App ─────────────────────────────────────────────────────────────

function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarActiveTintColor: '#0891B2',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 4,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsNavigator} />
      <Tab.Screen name="Reports" component={ReportsNavigator} />
      <Tab.Screen name="Bills" component={BillsNavigator} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    // Request notification permissions
    Notifications.requestPermissionsAsync().catch(() => {});

    // Determine if patient is already logged in
    getStoredPatient().then((patient) => {
      setInitialRoute(patient ? 'MainApp' : 'Splash');
    });
  }, []);

  if (initialRoute === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B3A6B' }}>
        <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
        <ActivityIndicator size="large" color="#60CFEC" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="MainApp" component={MainApp} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
