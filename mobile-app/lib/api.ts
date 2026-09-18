import axios, { AxiosError } from 'axios';
import { getServerUrl } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Patient {
  id: number;
  uhid: string;
  name: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  address: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  tokenNumber: number;
  appointmentDate: string;
  timeSlot: string;
  status: 'Scheduled' | 'Waiting' | 'Called' | 'Completed' | 'Cancelled' | 'No Show';
  notes?: string;
}

export interface QueueStatus {
  currentToken: number;
  yourToken: number;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  status: 'Waiting' | 'Called' | 'Completed' | 'Not Found';
}

export interface Prescription {
  id: number;
  patientId: number;
  visitDate: string;
  diagnosis: string;
  notes?: string;
  medicines: PrescriptionMedicine[];
}

export interface PrescriptionMedicine {
  id: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface LabOrder {
  id: number;
  patientId: number;
  orderedDate: string;
  status: 'Pending' | 'Collected' | 'Processing' | 'Completed' | 'Cancelled';
  testItems: LabTestItem[];
}

export interface LabTestItem {
  id: number;
  testName: string;
  result?: string;
  unit?: string;
  normalRange?: string;
  status: 'Pending' | 'Completed';
  isAbnormal?: boolean;
}

export interface RadiologyOrder {
  id: number;
  patientId: number;
  orderedDate: string;
  modalityType: 'X-Ray' | 'MRI' | 'CT' | 'Ultrasound';
  bodyPart: string;
  status: 'Pending' | 'Completed';
  findings?: string;
  impression?: string;
  imageUrl?: string;
}

export interface Bill {
  id: number;
  patientId: number;
  billDate: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  paymentMode?: 'Cash' | 'Card' | 'UPI' | 'Insurance';
  billItems: BillItem[];
}

export interface BillItem {
  id: number;
  description: string;
  category: 'Consultation' | 'Medicine' | 'Lab' | 'Radiology' | 'Procedure' | 'Other';
  amount: number;
  quantity: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  count: number;
}

// ─── Axios instance (dynamic base URL) ───────────────────────────────────────

async function getClient() {
  const baseURL = await getServerUrl();
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Error normaliser ─────────────────────────────────────────────────────────

export function parseApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) return 'சர்வர் இணைப்பு இல்லை / Server not reachable';
    const msg = (err.response.data as { message?: string })?.message;
    return msg ?? `Error ${err.response.status}`;
  }
  return 'Unknown error occurred';
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export async function findPatientByPhone(phone: string): Promise<Patient | null> {
  const client = await getClient();
  const res = await client.get<{ patients: Patient[] }>(`/api/patients?phone=${phone}`);
  return res.data.patients?.[0] ?? null;
}

export async function findPatientByUhid(uhid: string): Promise<Patient | null> {
  const client = await getClient();
  const res = await client.get<{ patient: Patient }>(`/api/patients/uhid/${uhid}`);
  return res.data.patient ?? null;
}

export async function getPatientById(id: number): Promise<Patient> {
  const client = await getClient();
  const res = await client.get<{ patient: Patient }>(`/api/patients/${id}`);
  return res.data.patient;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getPatientAppointments(patientId: number): Promise<Appointment[]> {
  const client = await getClient();
  const res = await client.get<{ appointments: Appointment[] }>(
    `/api/appointments?patientId=${patientId}`
  );
  return res.data.appointments ?? [];
}

export async function getAvailableSlots(date: string): Promise<TimeSlot[]> {
  const client = await getClient();
  const res = await client.get<{ slots: TimeSlot[] }>(`/api/appointments/slots?date=${date}`);
  return res.data.slots ?? [];
}

export async function bookAppointment(payload: {
  patientId: number;
  appointmentDate: string;
  timeSlot: string;
  notes?: string;
}): Promise<Appointment> {
  const client = await getClient();
  const res = await client.post<{ appointment: Appointment }>('/api/appointments', payload);
  return res.data.appointment;
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export async function getQueueStatus(patientId: number, date?: string): Promise<QueueStatus> {
  const client = await getClient();
  const dateParam = date ?? new Date().toISOString().slice(0, 10);
  const res = await client.get<QueueStatus>(
    `/api/queue/status?patientId=${patientId}&date=${dateParam}`
  );
  return res.data;
}

export async function getCurrentQueueToken(): Promise<number> {
  const client = await getClient();
  const res = await client.get<{ currentToken: number }>('/api/queue/current');
  return res.data.currentToken ?? 0;
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export async function getPatientPrescriptions(patientId: number): Promise<Prescription[]> {
  const client = await getClient();
  const res = await client.get<{ prescriptions: Prescription[] }>(
    `/api/prescriptions?patientId=${patientId}`
  );
  return res.data.prescriptions ?? [];
}

export async function getPrescriptionById(id: number): Promise<Prescription> {
  const client = await getClient();
  const res = await client.get<{ prescription: Prescription }>(`/api/prescriptions/${id}`);
  return res.data.prescription;
}

// ─── Lab Reports ──────────────────────────────────────────────────────────────

export async function getPatientLabOrders(patientId: number): Promise<LabOrder[]> {
  const client = await getClient();
  const res = await client.get<{ orders: LabOrder[] }>(
    `/api/lab-orders?patientId=${patientId}`
  );
  return res.data.orders ?? [];
}

export async function getLabOrderById(id: number): Promise<LabOrder> {
  const client = await getClient();
  const res = await client.get<{ order: LabOrder }>(`/api/lab-orders/${id}`);
  return res.data.order;
}

// ─── Radiology ────────────────────────────────────────────────────────────────

export async function getPatientRadiologyOrders(patientId: number): Promise<RadiologyOrder[]> {
  const client = await getClient();
  const res = await client.get<{ orders: RadiologyOrder[] }>(
    `/api/radiology-orders?patientId=${patientId}`
  );
  return res.data.orders ?? [];
}

export async function getRadiologyOrderById(id: number): Promise<RadiologyOrder> {
  const client = await getClient();
  const res = await client.get<{ order: RadiologyOrder }>(`/api/radiology-orders/${id}`);
  return res.data.order;
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export async function getPatientBills(patientId: number): Promise<Bill[]> {
  const client = await getClient();
  const res = await client.get<{ bills: Bill[] }>(`/api/bills?patientId=${patientId}`);
  return res.data.bills ?? [];
}

export async function getBillById(id: number): Promise<Bill> {
  const client = await getClient();
  const res = await client.get<{ bill: Bill }>(`/api/bills/${id}`);
  return res.data.bill;
}
