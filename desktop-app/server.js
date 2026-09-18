const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function uid(prefix, s) {
  s[prefix] = (s[prefix] || 0) + 1;
  return s[prefix];
}

function isSameDay(dateStr, targetStr) {
  return dateStr === targetStr;
}

function saveStore() {
  if (saveStore.timer) clearTimeout(saveStore.timer);
  saveStore.timer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
    } catch (err) {
      console.error('[persist] failed:', err.message);
    }
  }, 150);
}

// ─── Staff Role Accounts & Permissions ─────────────────────────────────────

const STAFF_USERS = [
  { username: 'admin', password: 'admin123', name: 'Dr. P.L. Vijayakumar (Admin)', role: 'Admin', views: ['dashboard', 'registration', 'doctor', 'pharmacy', 'lab', 'radiology', 'billing', 'finance', 'staff'] },
  { username: 'doctor', password: 'doctor123', name: 'Dr. P.L. Vijayakumar', role: 'Doctor', views: ['dashboard', 'doctor'] },
  { username: 'reception', password: 'reception123', name: 'R. Kausalya (Reception)', role: 'Receptionist', views: ['dashboard', 'registration'] },
  { username: 'pharmacy', password: 'pharmacy123', name: 'M. Senthil (Pharmacist)', role: 'Pharmacist', views: ['dashboard', 'pharmacy'] },
  { username: 'lab', password: 'lab123', name: 'S. Lakshmi (Lab Tech)', role: 'Lab Technician', views: ['dashboard', 'lab'] },
  { username: 'radiology', password: 'radiology123', name: 'K. Anand (Radiographer)', role: 'Radiologist', views: ['dashboard', 'radiology'] },
];

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
  const user = STAFF_USERS.find((u) => u.username.toLowerCase() === String(username).toLowerCase() && u.password === String(password));
  if (!user) return res.status(401).json({ message: 'Invalid staff username or password' });

  const token = `KOC_TOKEN_${user.role.toUpperCase()}_${Date.now()}`;
  res.json({
    token,
    user: {
      username: user.username,
      name: user.name,
      role: user.role,
      views: user.views,
    },
  });
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth) return res.status(401).json({ message: 'Not authenticated' });
  const roleMatch = STAFF_USERS.find((u) => auth.includes(u.role.toUpperCase()));
  if (!roleMatch) return res.status(401).json({ message: 'Invalid session' });
  res.json({ user: { username: roleMatch.username, name: roleMatch.name, role: roleMatch.role, views: roleMatch.views } });
});

// ─── Time slots & catalogs ───────────────────────────────────────────────────

const SLOT_TIMES = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
];

const ONLINE_QUOTA = 3;  // online app bookings per slot
const WALKIN_QUOTA = 2;  // walk-in counter bookings per slot
const SLOT_CAPACITY = ONLINE_QUOTA + WALKIN_QUOTA; // 5 per 30-min slot
const AVG_CONSULT_MINUTES = 7;

const MEDICINES = [
  { name: 'Tab. Paracetamol 650mg', price: 6, unit: 'strip' },
  { name: 'Tab. Diclofenac 50mg', price: 12, unit: 'strip' },
  { name: 'Tab. Pantoprazole 40mg', price: 15, unit: 'strip' },
  { name: 'Tab. Calcium + Vitamin D3', price: 65, unit: 'strip' },
  { name: 'Tab. Aceclofenac 100mg', price: 14, unit: 'strip' },
  { name: 'Tab. Vitamin B-Complex', price: 22, unit: 'strip' },
  { name: 'Cap. Gabapentin 300mg', price: 45, unit: 'strip' },
  { name: 'Susp. Antacid 200ml', price: 85, unit: 'bottle' },
  { name: 'Inj. Diclofenac (IM)', price: 35, unit: 'ampule' },
  { name: 'Knee Cap (Medium)', price: 450, unit: 'pc' },
];

const LAB_TESTS = [
  { name: 'CBC (Complete Blood Count)', price: 350 },
  { name: 'ESR', price: 100 },
  { name: 'CRP', price: 150 },
  { name: 'HbA1c', price: 300 },
  { name: 'RA Factor', price: 250 },
  { name: 'Serum Uric Acid', price: 200 },
  { name: 'Vitamin D (25-OH)', price: 600 },
  { name: 'Blood Glucose (Fasting)', price: 80 },
];

const RADIOLOGY = [
  { modality: 'X-Ray', price: 800 },
  { modality: 'MRI', price: 3200 },
  { modality: 'CT', price: 2800 },
  { modality: 'Ultrasound', price: 450 },
];

const CONSULTATION_FEE = 500;

const DEFAULT_DOCTORS = [
  { id: 1, name: 'Dr. P.L. Vijayakumar', spec: 'MS Ortho — Robotic Joint Replacement Specialist' },
  { id: 2, name: 'Dr. Rajkumar', spec: 'MS Ortho — Trauma & Arthroscopy Specialist' },
  { id: 3, name: 'Dr. Revanth', spec: 'MS Ortho — Spine & Sports Injury Specialist' },
];

function getDoctors() {
  return (store && store.doctors && store.doctors.length) ? store.doctors : DEFAULT_DOCTORS;
}

function doctorNameById(id) {
  const list = getDoctors();
  const d = list.find((x) => x.id === Number(id));
  return d ? d.name : 'Dr. P.L. Vijayakumar';
}

function medicinePrice(name) {
  const m = MEDICINES.find((x) => x.name === name);
  return m ? m.price : 0;
}
function labPrice(name) {
  const t = LAB_TESTS.find((x) => x.name === name);
  return t ? t.price : 0;
}
function radiologyPrice(modality) {
  const r = RADIOLOGY.find((x) => x.modality === modality);
  return r ? r.price : 0;
}

// ─── Store ───────────────────────────────────────────────────────────────────

function emptyStore() {
  return {
    patients: [],
    appointments: [],
    prescriptions: [],
    labOrders: [],
    radiologyOrders: [],
    bills: [],
    pharmacyInventory: [],
    radiologyPositions: [
      'AP View (Anteroposterior)',
      'Lateral View',
      'PA View (Posteroanterior)',
      'Oblique View',
      'Skyline / Sunrise View (Patella)',
      'Weight-Bearing AP (Knee / Spine)',
      'Flexion & Extension Lateral (Spine)',
      'Axial View (Shoulder / Hip)',
    ],
    expenses: [],
    staff: [
      { id: 1, name: 'Dr. P.L. Vijayakumar', role: 'Chief Ortho Surgeon', phone: '9842412345', monthlySalary: 150000 },
      { id: 2, name: 'R. Kausalya', role: 'Head Nurse / Receptionist', phone: '9789012345', monthlySalary: 22000 },
      { id: 3, name: 'M. Senthil', role: 'Pharmacist', phone: '9678901234', monthlySalary: 25000 },
      { id: 4, name: 'K. Anand', role: 'Radiographer / X-Ray Tech', phone: '9567890123', monthlySalary: 24000 },
      { id: 5, name: 'S. Lakshmi', role: 'Lab Technician', phone: '9456789012', monthlySalary: 20000 },
      { id: 6, name: 'P. Murugan', role: 'Support & Housekeeping', phone: '9345678901', monthlySalary: 14000 },
    ],
    attendance: [],
    seq: { patient: 0, appointment: 0, prescription: 0, labOrder: 0, radiologyOrder: 0, bill: 0, expense: 0 },
    seededAt: todayStr(),
  };
}

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data && data.patients) return data;
    }
  } catch (err) {
    console.error('[load] corrupt store, reseeding:', err.message);
  }
  return emptyStore();
}

function seedStore() {
  const s = emptyStore();
  const today = todayStr();

  // Patients
  const p1 = { id: uid('patient', s.seq), uhid: 'KOC-0001', name: 'Demo Patient', phone: '9876543210', age: 45, gender: 'Male', bloodGroup: 'O+', address: 'Trichy, Tamil Nadu' };
  const p2 = { id: uid('patient', s.seq), uhid: 'KOC-0002', name: 'Arul Kumar', phone: '9765432101', age: 58, gender: 'Male', bloodGroup: 'B+', address: '4, Gandhi Nagar, Trichy' };
  const p3 = { id: uid('patient', s.seq), uhid: 'KOC-0003', name: 'Meena Ravi', phone: '9654321098', age: 52, gender: 'Female', bloodGroup: 'A+', address: '12, Woraiyur, Trichy' };
  const p4 = { id: uid('patient', s.seq), uhid: 'KOC-0004', name: 'Suresh Babu', phone: '9543210987', age: 63, gender: 'Male', bloodGroup: 'AB+', address: '7, Karur Road, Trichy' };
  s.patients.push(p1, p2, p3, p4);

  // Today's appointments (queue)
  function appt(patient, token, slot, status, doctorId) {
    return {
      id: uid('appointment', s.seq),
      patientId: patient.id,
      patientName: patient.name,
      tokenNumber: token,
      appointmentDate: today,
      timeSlot: token === 1 ? slot : slot,
      status,
      notes: '',
      doctorId: doctorId || 1,
      doctorName: doctorNameById(doctorId || 1),
    };
  }
  const a1 = appt(p2, 1, '09:00 AM', 'Waiting', 1);
  const a2 = appt(p1, 2, '09:30 AM', 'Waiting', 1);
  const a3 = appt(p3, 3, '10:00 AM', 'Called', 2); // now calling #3
  const a4 = appt(p4, 4, '10:30 AM', 'Waiting', 3);
  s.appointments.push(a1, a2, a3, a4);

  // Historic visits & reports for patient 1 (demo)
  const past = daysAgoStr(4);
  s.appointments.push({
    id: uid('appointment', s.seq), patientId: p1.id, patientName: p1.name,
    tokenNumber: 7, appointmentDate: past, timeSlot: '11:00 AM', status: 'Completed', notes: '',
    doctorId: 1, doctorName: doctorNameById(1),
  });
  s.prescriptions.push({
    id: uid('prescription', s.seq), patientId: p1.id, visitDate: past,
    diagnosis: 'Osteoarthritis - Right Knee',
    notes: 'Rest advised. Avoid weight bearing activities.',
    medicines: [
      { id: 1, medicineName: 'Tab. Diclofenac 50mg', dosage: '50mg', frequency: 'Twice daily', duration: '5 days', instructions: 'After food' },
      { id: 2, medicineName: 'Tab. Pantoprazole 40mg', dosage: '40mg', frequency: 'Once daily', duration: '5 days', instructions: 'Before food' },
    ],
    dispensed: true,
  });
  s.labOrders.push({
    id: uid('labOrder', s.seq), patientId: p1.id, orderedDate: past, status: 'Completed',
    testItems: [
      { id: 1, testName: 'CBC (Complete Blood Count)', result: '14.2', unit: 'g/dL', normalRange: '13.5-17.5', status: 'Completed', isAbnormal: false },
      { id: 2, testName: 'ESR', result: '38', unit: 'mm/hr', normalRange: '0-20', status: 'Completed', isAbnormal: true },
      { id: 3, testName: 'CRP', result: '12.4', unit: 'mg/L', normalRange: '<5', status: 'Completed', isAbnormal: true },
    ],
  });
  s.radiologyOrders.push({
    id: uid('radiologyOrder', s.seq), patientId: p1.id, orderedDate: past, modalityType: 'X-Ray',
    bodyPart: 'Right Knee (AP & Lateral)', status: 'Completed',
    findings: 'Mild joint space narrowing seen in the medial compartment. No fractures.',
    impression: 'Grade II Osteoarthritis of right knee',
  });
  s.bills.push({
    id: uid('bill', s.seq), patientId: p1.id, billDate: past, totalAmount: 2500, paidAmount: 2500,
    paymentStatus: 'Paid', paymentMode: 'UPI',
    billItems: [
      { id: 1, description: 'OPD Consultation - Dr. Vijayakumar', category: 'Consultation', amount: 500, quantity: 1 },
      { id: 2, description: 'X-Ray Right Knee (2 views)', category: 'Radiology', amount: 800, quantity: 1 },
      { id: 3, description: 'Lab Tests (CBC, ESR, CRP)', category: 'Lab', amount: 700, quantity: 1 },
      { id: 4, description: 'Medicines', category: 'Medicine', amount: 500, quantity: 1 },
    ],
  });

  // Seed Pharmacy Inventory (Batch, Expiry, Stock, Selling Price, GST)
  s.pharmacyInventory = [
    { id: 1, name: 'Tab. Paracetamol 650mg', batchNo: 'PCM-2026-08', expiryDate: '2027-12-31', stockQty: 450, purchasePrice: 3.5, sellingPrice: 6, gstPercent: 12 },
    { id: 2, name: 'Tab. Diclofenac 50mg', batchNo: 'DIC-2026-04', expiryDate: '2027-08-31', stockQty: 320, purchasePrice: 7.0, sellingPrice: 12, gstPercent: 12 },
    { id: 3, name: 'Tab. Pantoprazole 40mg', batchNo: 'PAN-2026-09', expiryDate: '2027-10-31', stockQty: 280, purchasePrice: 9.0, sellingPrice: 15, gstPercent: 12 },
    { id: 4, name: 'Tab. Calcium + Vitamin D3', batchNo: 'CAL-2026-01', expiryDate: '2028-01-31', stockQty: 180, purchasePrice: 42.0, sellingPrice: 65, gstPercent: 12 },
    { id: 5, name: 'Tab. Aceclofenac 100mg', batchNo: 'ACE-2026-05', expiryDate: '2027-09-30', stockQty: 210, purchasePrice: 8.5, sellingPrice: 14, gstPercent: 12 },
    { id: 6, name: 'Knee Cap (Medium)', batchNo: 'KNC-2026-02', expiryDate: '2030-01-01', stockQty: 45, purchasePrice: 280.0, sellingPrice: 450, gstPercent: 18 },
    { id: 7, name: 'Cap. Gabapentin 300mg', batchNo: 'GAB-2026-03', expiryDate: '2027-06-30', stockQty: 150, purchasePrice: 28.0, sellingPrice: 45, gstPercent: 12 },
    { id: 8, name: 'Inj. Diclofenac (IM)', batchNo: 'INJ-2026-11', expiryDate: '2027-05-31', stockQty: 90, purchasePrice: 20.0, sellingPrice: 35, gstPercent: 12 },
  ];

  // Seed Today's Expenses
  s.expenses = [
    { id: 1, date: today, category: 'Tea & Coffee (Staff & OPD)', amount: 240, paymentMode: 'Cash', voucherNo: 'V-001', notes: 'Daily tea vendor payment' },
    { id: 2, date: today, category: 'Cleaning & Bio-Waste Material', amount: 850, paymentMode: 'Cash', voucherNo: 'V-002', notes: 'Disinfectant & waste bags' },
  ];

  // Seed Today's Staff Attendance
  s.attendance = s.staff.map((st) => ({
    staffId: st.id,
    date: today,
    status: 'Present',
    checkInTime: '08:45 AM',
  }));

  return s;
}

let store = loadStore();
if (!store.appointments || store.patients.length === 0 || store.seededAt !== todayStr() || !store.pharmacyInventory || !store.staff) {
  console.log('[seed] reseeding store with full enterprise demo data (' + todayStr() + ')');
  store = seedStore();
}

// Fallback safety
const defs = emptyStore();
store.pharmacyInventory = store.pharmacyInventory || defs.pharmacyInventory;
store.radiologyPositions = store.radiologyPositions || defs.radiologyPositions;
store.expenses = store.expenses || defs.expenses;
store.staff = store.staff || defs.staff;
store.attendance = store.attendance || defs.attendance;
store.seq = store.seq || defs.seq;
if (store.seq.expense === undefined) store.seq.expense = 0;
if (store.appointments) {
  store.appointments.forEach((a) => {
    if (!a.doctorName) {
      a.doctorId = a.doctorId || 1;
      a.doctorName = doctorNameById(a.doctorId);
    }
  });
}
saveStore();

// ─── Shared domain helpers ───────────────────────────────────────────────────

function findPatient(idOrUhidOrPhone) {
  return store.patients.find(
    (p) => p.id === Number(idOrUhidOrPhone) || p.uhid === idOrUhidOrPhone || p.phone === String(idOrUhidOrPhone)
  );
}

function todayAppointments() {
  return store.appointments
    .filter((a) => isSameDay(a.appointmentDate, todayStr()) && a.status !== 'Cancelled' && a.status !== 'No Show')
    .sort((a, b) => a.tokenNumber - b.tokenNumber);
}

function currentToken() {
  const today = todayAppointments();
  const called = today.filter((a) => a.status === 'Called');
  if (called.length) return called[called.length - 1].tokenNumber;
  const done = today.filter((a) => a.status === 'Completed').sort((a, b) => a.tokenNumber - b.tokenNumber);
  return done.length ? done[done.length - 1].tokenNumber : 0;
}

function queueStatusFor(patientId) {
  const today = todayAppointments();
  const mine = today.find((a) => a.patientId === patientId);
  if (!mine) return { currentToken: currentToken(), yourToken: 0, patientsAhead: 0, estimatedWaitMinutes: 0, status: 'Not Found' };
  const cur = currentToken();
  let ahead = 0;
  let status = mine.status;
  if (mine.status === 'Waiting' || mine.status === 'Scheduled') {
    ahead = today.filter((a) => a.tokenNumber < mine.tokenNumber && a.tokenNumber > cur && a.status === 'Waiting').length;
    if (ahead === 0 && mine.tokenNumber > cur) ahead = 1; // next up
  }
  return {
    currentToken: cur,
    yourToken: mine.tokenNumber,
    patientsAhead: status === 'Called' ? 0 : ahead,
    estimatedWaitMinutes: status === 'Called' ? 0 : ahead * AVG_CONSULT_MINUTES,
    status,
  };
}

// ─── Slot config: Hybrid Walk-in + Online ─────────────────────────────────────

function availableSlots(dateStr, type) {
  // type: 'online' | 'walkin' | undefined (shows total remaining)
  const isToday = dateStr === todayStr();
  const bySlot = {};
  SLOT_TIMES.forEach((t) => { bySlot[t] = { online: 0, walkin: 0, total: 0 }; });

  store.appointments
    .filter((a) => a.appointmentDate === dateStr && a.status !== 'Cancelled')
    .forEach((a) => {
      if (!bySlot[a.timeSlot]) bySlot[a.timeSlot] = { online: 0, walkin: 0, total: 0 };
      bySlot[a.timeSlot].total++;
      if (a.bookingType === 'online') bySlot[a.timeSlot].online++;
      else bySlot[a.timeSlot].walkin++;
    });

  return SLOT_TIMES.map((time, i) => {
    const s = bySlot[time] || { online: 0, walkin: 0, total: 0 };

    // Online: limited by ONLINE_QUOTA; Walk-in: limited by WALKIN_QUOTA
    const onlineLeft = Math.max(0, ONLINE_QUOTA - s.online);
    const walkinLeft = Math.max(0, WALKIN_QUOTA - s.walkin);
    const totalLeft = Math.max(0, SLOT_CAPACITY - s.total);

    let available = totalLeft > 0;
    let slotsLeft = type === 'online' ? onlineLeft : type === 'walkin' ? walkinLeft : totalLeft;
    if (type === 'online' && onlineLeft <= 0) available = false;
    if (type === 'walkin' && walkinLeft <= 0) available = false;

    // Past slots unavailable
    if (isToday) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const slotHour = parseInt(time.split(':')[0]) + (time.includes('PM') && !time.startsWith('12') ? 12 : 0);
      const slotMin = parseInt(time.split(':')[1]);
      const slotTotal = slotHour * 60 + slotMin;
      if (slotTotal + 30 <= nowMin) { available = false; slotsLeft = 0; }
    }

    return { time, available, count: slotsLeft, onlineLeft, walkinLeft, totalLeft };
  });
}

// Best next available slot for walk-in (auto-select)
function bestWalkinSlot(dateStr) {
  const slots = availableSlots(dateStr, 'walkin');
  const isToday = dateStr === todayStr();
  if (isToday) {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    // Find soonest future slot with walkin capacity
    const future = slots.filter((s) => {
      if (!s.available) return false;
      const h = parseInt(s.time.split(':')[0]) + (s.time.includes('PM') && !s.time.startsWith('12') ? 12 : 0);
      const m = parseInt(s.time.split(':')[1]);
      return h * 60 + m >= nowMin;
    });
    return future[0] || slots.find((s) => s.available) || null;
  }
  return slots.find((s) => s.available) || null;
}


function addBillItems(bill, items) {
  for (const it of items) {
    const nextId = (bill.billItems.length > 0 ? bill.billItems[bill.billItems.length - 1].id : 0) + 1;
    bill.billItems.push({ id: nextId, ...it });
  }
  bill.totalAmount = bill.billItems.reduce((sum, x) => sum + x.amount * x.quantity, 0);
}

function outstandingForPatient(patientId) {
  return store.bills
    .filter((b) => b.patientId === patientId && b.paymentStatus !== 'Paid')
    .reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);
}

// ─── API: Patient (mobile compatible) ────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/api/patients', (req, res) => {
  const q = (req.query.phone || '').toString();
  if (q) {
    const m = store.patients.filter((p) => p.phone.endsWith(q));
    return res.json({ patients: m });
  }
  res.json({ patients: store.patients });
});

app.get('/api/patients/uhid/:uhid', (req, res) => {
  const p = store.patients.find((x) => x.uhid.toUpperCase() === req.params.uhid.toUpperCase());
  if (!p) return res.status(404).json({ message: 'Patient not found' });
  res.json({ patient: p });
});

app.get('/api/patients/:id', (req, res) => {
  const p = store.patients.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ message: 'Patient not found' });
  res.json({ patient: p });
});

app.post('/api/patients', (req, res) => {
  const { name, phone, age, gender, bloodGroup, address } = req.body || {};
  if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });
  const existing = store.patients.find((p) => p.phone === phone);
  if (existing) return res.json({ patient: existing, existing: true });
  const patient = {
    id: uid('patient', store.seq),
    uhid: `KOC-${String(store.seq.patient).padStart(4, '0')}`,
    name, phone: String(phone), age: Number(age) || 0,
    gender: gender || 'Male', bloodGroup: bloodGroup || 'Unknown', address: address || '',
  };
  store.patients.push(patient);
  saveStore();
  res.status(201).json({ patient, existing: false });
});

app.patch('/api/patients/:id', (req, res) => {
  const p = store.patients.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ message: 'Patient not found' });
  Object.assign(p, req.body || {});
  saveStore();
  res.json({ patient: p });
});

app.delete('/api/patients/:id', (req, res) => {
  const id = Number(req.params.id);
  store.patients = store.patients.filter((x) => x.id !== id);
  // also clean appointments for deleted patient
  store.appointments = store.appointments.filter((a) => a.patientId !== id);
  saveStore();
  res.json({ message: 'Patient deleted successfully' });
});

// ─── API: Appointments (mobile compatible) ───────────────────────────────────

app.get('/api/appointments', (req, res) => {
  const pid = Number(req.query.patientId);
  const list = store.appointments.filter((a) => a.patientId === pid).sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
  res.json({ appointments: list });
});

app.get('/api/appointments/slots', (req, res) => {
  const type = req.query.type || 'total'; // 'online' | 'walkin' | 'total'
  res.json({
    slots: availableSlots(req.query.date, type === 'total' ? undefined : type),
    quotas: { onlinePerSlot: ONLINE_QUOTA, walkinPerSlot: WALKIN_QUOTA, totalPerSlot: SLOT_CAPACITY },
  });
});

// Auto-pick best walk-in slot (used by reception counter)
app.get('/api/appointments/next-walkin-slot', (req, res) => {
  const dateStr = req.query.date || todayStr();
  const best = bestWalkinSlot(dateStr);
  if (!best) return res.status(409).json({ message: 'No walk-in slots available. Please reschedule.' });
  res.json({ slot: best.time, walkinLeft: best.walkinLeft });
});

app.post('/api/appointments', (req, res) => {
  const { patientId, appointmentDate, timeSlot, notes, doctorId, bookingType } = req.body || {};
  const patient = store.patients.find((p) => p.id === Number(patientId));
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!appointmentDate || !timeSlot) return res.status(400).json({ message: 'Date and slot required' });
  const existing = store.appointments.find(
    (a) => a.patientId === patient.id && a.appointmentDate === appointmentDate && a.status !== 'Cancelled'
  );
  if (existing) return res.status(409).json({ message: 'Appointment already exists for this date' });
  const token = store.appointments.filter(
    (a) => a.appointmentDate === appointmentDate && a.status !== 'Cancelled'
  ).length + 1;
  const docId = Number(doctorId) || 1;
  const appt = {
    id: uid('appointment', store.seq),
    patientId: patient.id,
    patientName: patient.name,
    tokenNumber: token,
    appointmentDate,
    timeSlot,
    status: appointmentDate === todayStr() ? 'Waiting' : 'Scheduled',
    notes: notes || '',
    doctorId: docId,
    doctorName: doctorNameById(docId),
    bookingType: bookingType === 'online' ? 'online' : 'walkin', // 'online' | 'walkin'
  };
  store.appointments.push(appt);
  saveStore();
  res.status(201).json({ appointment: appt });
});

app.patch('/api/appointments/:id', (req, res) => {
  const a = store.appointments.find((x) => x.id === Number(req.params.id));
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  const body = Object.assign({}, req.body || {});
  if (body.doctorId !== undefined) {
    const docId = Number(body.doctorId) || a.doctorId || 1;
    body.doctorId = docId;
    body.doctorName = doctorNameById(docId);
  }
  Object.assign(a, body);
  saveStore();
  res.json({ appointment: a });
});

// ─── API: Queue ──────────────────────────────────────────────────────────────

app.get('/api/queue/status', (req, res) => {
  res.json(queueStatusFor(Number(req.query.patientId)));
});

app.get('/api/queue/current', (req, res) => {
  res.json({ currentToken: currentToken() });
});

app.get('/api/queue/today', (req, res) => {
  const queue = todayAppointments().map((a) => {
    const p = store.patients.find((x) => x.id === a.patientId);
    return { ...a, uhid: p ? p.uhid : '' };
  });
  res.json({ queue });
});

app.post('/api/queue/:appointmentId/call', (req, res) => {
  const a = store.appointments.find((x) => x.id === Number(req.params.appointmentId));
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  a.status = 'Called';
  saveStore();
  res.json({ queue: todayAppointments(), currentToken: currentToken() });
});

app.post('/api/queue/:appointmentId/complete', (req, res) => {
  const a = store.appointments.find((x) => x.id === Number(req.params.appointmentId));
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  a.status = 'Completed';
  saveStore();
  res.json({ queue: todayAppointments(), currentToken: currentToken() });
});

app.post('/api/queue/:appointmentId/noshow', (req, res) => {
  const a = store.appointments.find((x) => x.id === Number(req.params.appointmentId));
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  a.status = 'No Show';
  saveStore();
  res.json({ queue: todayAppointments(), currentToken: currentToken() });
});

app.post('/api/appointments/:id/cancel', (req, res) => {
  const a = store.appointments.find((x) => x.id === Number(req.params.id));
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  a.status = 'Cancelled';
  saveStore();
  res.json({ appointment: a });
});

// ─── API: Doctor consultation ────────────────────────────────────────────────

app.get('/api/consultations/history', (req, res) => {
  const pid = Number(req.query.patientId);
  const rx = store.prescriptions.filter((p) => p.patientId === pid).sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  const lab = store.labOrders.filter((o) => o.patientId === pid).sort((a, b) => b.orderedDate.localeCompare(a.orderedDate));
  const rad = store.radiologyOrders.filter((o) => o.patientId === pid).sort((a, b) => b.orderedDate.localeCompare(a.orderedDate));
  res.json({ prescriptions: rx, labOrders: lab, radiologyOrders: rad });
});

app.post('/api/consultations/:appointmentId', (req, res) => {
  const { diagnosis, notes, medicines = [], labTests = [], radiology = [] } = req.body || {};
  const appt = store.appointments.find((x) => x.id === Number(req.params.appointmentId));
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  const patient = store.patients.find((p) => p.id === appt.patientId);
  if (!diagnosis) return res.status(400).json({ message: 'Diagnosis is required' });

  let prescriptionId = null;
  let labOrderId = null;
  let radiologyOrderId = null;

  if (medicines.length) {
    const meds = medicines.map((m, i) => ({
      id: i + 1,
      medicineName: m.name,
      dosage: m.dosage || '',
      frequency: m.frequency || 'Twice daily',
      duration: m.duration || '5 days',
      instructions: m.instructions || 'After food',
    }));
    const rx = {
      id: uid('prescription', store.seq),
      patientId: patient.id,
      visitDate: appt.appointmentDate,
      diagnosis,
      notes: notes || '',
      medicines: meds,
      dispensed: false,
    };
    store.prescriptions.push(rx);
    prescriptionId = rx.id;
  }

  if (labTests.length) {
    const tests = labTests.map((t) => ({
      id: Math.floor(Math.random() * 1e6),
      testName: t.name,
      result: null,
      unit: '',
      normalRange: '',
      status: 'Pending',
      isAbnormal: false,
    }));
    const order = { id: uid('labOrder', store.seq), patientId: patient.id, orderedDate: appt.appointmentDate, status: 'Pending', testItems: tests };
    store.labOrders.push(order);
    labOrderId = order.id;
  }

  if (radiology.length) {
    const scans = radiology.map((r) => ({
      id: Math.floor(Math.random() * 1e6),
      modalityType: r.modality,
      bodyPart: r.bodyPart || 'To be specified',
      status: 'Pending',
      findings: null,
      impression: null,
      imageUrl: null,
    }));
    radiology.forEach((r, i) => {
      if (!scans[i]) return;
      store.radiologyOrders.push({
        id: uid('radiologyOrder', store.seq),
        patientId: patient.id,
        orderedDate: appt.appointmentDate,
        modalityType: r.modality,
        bodyPart: r.bodyPart || 'To be specified',
        status: 'Pending',
        findings: null,
        impression: null,
        imageUrl: null,
      });
    });
    radiologyOrderId = store.radiologyOrders[store.radiologyOrders.length - 1].id;
  }

  appt.status = 'Completed';

  // Single bill: consultation + lab + radiology
  if (CONSULTATION_FEE > 0 || labTests.length || radiology.length) {
    const bill = {
      id: uid('bill', store.seq),
      patientId: patient.id,
      billDate: appt.appointmentDate,
      totalAmount: 0,
      paidAmount: 0,
      paymentStatus: 'Unpaid',
      paymentMode: null,
      billItems: [],
    };
    addBillItems(bill, [{ description: `OPD Consultation - ${appt.doctorName || 'Dr. P.L. Vijayakumar'}`, category: 'Consultation', amount: CONSULTATION_FEE, quantity: 1 }]);
    labTests.forEach((t) => {
      addBillItems(bill, [{ description: `Lab: ${t.name}`, category: 'Lab', amount: labPrice(t.name), quantity: Number(t.qty) || 1 }]);
    });
    radiology.forEach((r) => {
      addBillItems(bill, [{ description: `${r.modality}: ${r.bodyPart || 'Scan'}`, category: 'Radiology', amount: radiologyPrice(r.modality), quantity: 1 }]);
    });
    store.bills.push(bill);
  }

  saveStore();
  res.status(201).json({
    appointment: appt,
    prescriptionId,
    labOrderId,
    radiologyOrderId,
    billId: store.bills[store.bills.length - 1]?.id ?? null,
    queue: todayAppointments(),
  });
});

// ─── API: Prescriptions (mobile compatible + pharmacy) ───────────────────────

app.get('/api/prescriptions', (req, res) => {
  const pid = Number(req.query.patientId);
  const list = store.prescriptions.filter((p) => p.patientId === pid).sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  res.json({ prescriptions: list });
});

app.get('/api/prescriptions/:id', (req, res) => {
  const p = store.prescriptions.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ message: 'Prescription not found' });
  res.json({ prescription: p });
});

app.get('/api/pharmacy/pending', (req, res) => {
  const list = store.prescriptions
    .filter((p) => !p.dispensed)
    .map((p) => ({ ...p, patient: store.patients.find((x) => x.id === p.patientId) || null }))
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  res.json({ prescriptions: list });
});

app.post('/api/prescriptions/:id/dispense', (req, res) => {
  const rx = store.prescriptions.find((x) => x.id === Number(req.params.id));
  if (!rx) return res.status(404).json({ message: 'Prescription not found' });
  if (rx.dispensed) return res.status(409).json({ message: 'Already dispensed' });
  rx.dispensed = true;

  let bill = store.bills.find((b) => b.patientId === rx.patientId && b.billDate === rx.visitDate && b.paymentStatus !== 'Paid');
  if (!bill) {
    bill = {
      id: uid('bill', store.seq),
      patientId: rx.patientId,
      billDate: rx.visitDate,
      totalAmount: 0,
      paidAmount: 0,
      paymentStatus: 'Unpaid',
      paymentMode: null,
      billItems: [],
    };
    store.bills.push(bill);
  }
  addBillItems(bill, [{ description: 'Medicines', category: 'Medicine', amount: req.body.amount || 0, quantity: 1 }]);
  saveStore();

  res.json({ prescription: rx, bill });
});

// ─── API: Lab orders (mobile compatible + staff) ─────────────────────────────

app.get('/api/lab-orders', (req, res) => {
  const pid = Number(req.query.patientId);
  const list = store.labOrders.filter((o) => o.patientId === pid).sort((a, b) => b.orderedDate.localeCompare(a.orderedDate));
  res.json({ orders: list });
});

app.get('/api/lab-orders/:id', (req, res) => {
  const o = store.labOrders.find((x) => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ message: 'Order not found' });
  res.json({ order: o });
});

app.get('/api/lab/pending', (req, res) => {
  const list = store.labOrders
    .filter((o) => o.status !== 'Completed')
    .map((o) => ({ ...o, patient: store.patients.find((x) => x.id === o.patientId) || null }))
    .sort((a, b) => a.orderedDate.localeCompare(b.orderedDate));
  res.json({ orders: list });
});

app.patch('/api/lab-orders/:id', (req, res) => {
  const o = store.labOrders.find((x) => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ message: 'Order not found' });
  if (Array.isArray(req.body.testItems)) {
    o.testItems = req.body.testItems;
  }
  if (req.body.status) o.status = req.body.status;
  saveStore();
  res.json({ order: o });
});

app.post('/api/lab-orders/:id/results', (req, res) => {
  const o = store.labOrders.find((x) => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ message: 'Order not found' });
  const results = req.body.results || [];
  results.forEach((r) => {
    const item = o.testItems.find((t) => t.id === Number(r.id));
    if (!item) return;
    item.result = r.result ?? null;
    item.unit = r.unit ?? '';
    item.normalRange = r.normalRange ?? '';
    item.isAbnormal = Boolean(r.isAbnormal);
    item.status = r.result ? 'Completed' : 'Pending';
  });
  if (o.testItems.length && o.testItems.every((t) => t.status === 'Completed')) {
    o.status = 'Completed';
  } else {
    o.status = 'Processing';
  }
  saveStore();
  res.json({ order: o });
});

// ─── API: Radiology orders (mobile compatible + staff) ───────────────────────

app.get('/api/radiology-orders', (req, res) => {
  const pid = Number(req.query.patientId);
  const list = store.radiologyOrders.filter((o) => o.patientId === pid).sort((a, b) => b.orderedDate.localeCompare(a.orderedDate));
  res.json({ orders: list });
});

app.get('/api/radiology-orders/:id', (req, res) => {
  const o = store.radiologyOrders.find((x) => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ message: 'Order not found' });
  res.json({ order: o });
});

app.get('/api/radiology/pending', (req, res) => {
  const list = store.radiologyOrders
    .filter((o) => o.status !== 'Completed')
    .map((o) => ({ ...o, patient: store.patients.find((x) => x.id === o.patientId) || null }))
    .sort((a, b) => a.orderedDate.localeCompare(b.orderedDate));
  res.json({ orders: list });
});

app.patch('/api/radiology-orders/:id', (req, res) => {
  const o = store.radiologyOrders.find((x) => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ message: 'Order not found' });
  Object.assign(o, req.body || {});
  if (req.body.findings !== undefined || req.body.impression !== undefined) o.status = 'Completed';
  saveStore();
  res.json({ order: o });
});

// ─── API: Bills (mobile compatible + billing) ────────────────────────────────

app.get('/api/bills', (req, res) => {
  const pid = Number(req.query.patientId);
  const list = store.bills.filter((b) => b.patientId === pid).sort((a, b) => b.billDate.localeCompare(a.billDate));
  res.json({ bills: list });
});

app.get('/api/bills/:id', (req, res) => {
  const b = store.bills.find((x) => x.id === Number(req.params.id));
  if (!b) return res.status(404).json({ message: 'Bill not found' });
  res.json({ bill: b });
});

app.get('/api/billing/all', (req, res) => {
  const now = todayStr();
  const list = store.bills
    .map((b) => ({ ...b, patient: store.patients.find((x) => x.id === b.patientId) || null, today: b.billDate === now }))
    .sort((a, b) => (b.billDate + String(b.id)).localeCompare(a.billDate + String(a.id)));
  res.json({ bills: list });
});

app.post('/api/bills/:id/payment', (req, res) => {
  const b = store.bills.find((x) => x.id === Number(req.params.id));
  if (!b) return res.status(404).json({ message: 'Bill not found' });
  const { amount, mode } = req.body || {};
  const amt = Number(amount) || 0;
  b.paidAmount = Math.min(b.totalAmount, b.paidAmount + amt);
  b.paymentMode = mode || b.paymentMode || 'Cash';
  b.paymentStatus = b.paidAmount >= b.totalAmount ? 'Paid' : 'Partial';
  saveStore();
  res.json({ bill: b });
});

// ─── API: Dashboard ──────────────────────────────────────────────────────────

app.get('/api/dashboard/stats', (req, res) => {
  const today = todayStr();
  const q = todayAppointments();

  const revenueToday = store.bills
    .filter((b) => b.billDate === today)
    .reduce((sum, b) => sum + b.paidAmount, 0);

  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgoStr(i);
    weekly.push({
      date: d,
      revenue: store.bills.filter((b) => b.billDate === d).reduce((s, b) => s + b.paidAmount, 0),
      visits: store.appointments.filter((a) => a.appointmentDate === d && a.status === 'Completed').length,
    });
  }

  res.json({
    today: {
      registrations: q.length,
      waiting: q.filter((a) => a.status === 'Waiting' || a.status === 'Scheduled').length,
      called: q.filter((a) => a.status === 'Called').length,
      completed: q.filter((a) => a.status === 'Completed').length,
      currentToken: currentToken(),
      revenue: revenueToday,
    },
    pending: {
      pharmacy: store.prescriptions.filter((p) => !p.dispensed).length,
      lab: store.labOrders.filter((o) => o.status !== 'Completed').length,
      radiology: store.radiologyOrders.filter((o) => o.status !== 'Completed').length,
      bills: store.bills.filter((b) => b.paymentStatus !== 'Paid').length,
    },
    weekly,
  });
});

// ─── API: Dev / misc ─────────────────────────────────────────────────────────

app.get('/api/catalog', (req, res) => {
  res.json({ medicines: MEDICINES, labTests: LAB_TESTS, radiology: RADIOLOGY, consultationFee: CONSULTATION_FEE, doctors: getDoctors() });
});

app.get('/api/doctors', (req, res) => {
  res.json({ doctors: getDoctors() });
});

app.post('/api/doctors', (req, res) => {
  const { name, spec } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Doctor name is required' });
  if (!store.doctors) store.doctors = DEFAULT_DOCTORS.slice();
  const nextId = (store.doctors.length ? store.doctors[store.doctors.length - 1].id : 0) + 1;
  const doc = { id: nextId, name, spec: spec || 'MS Ortho' };
  store.doctors.push(doc);
  saveStore();
  res.status(201).json({ doctor: doc, doctors: store.doctors });
});

app.delete('/api/doctors/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!store.doctors) store.doctors = DEFAULT_DOCTORS.slice();
  store.doctors = store.doctors.filter((d) => d.id !== id);
  saveStore();
  res.json({ doctors: store.doctors });
});

app.get('/api/queue/display', (req, res) => {
  const q = todayAppointments();
  const queued = q.filter((a) => a.status === 'Waiting' || a.status === 'Scheduled');
  const called = q.filter((a) => a.status === 'Called');
  const nowCalling = called[called.length - 1] || null;
  const done = q.filter((a) => a.status === 'Completed').sort((a, b) => a.tokenNumber - b.tokenNumber);
  const nextUp = queued.sort((a, b) => a.tokenNumber - b.tokenNumber)[0] || null;
  const waiting = q
    .filter((a) => a.status === 'Waiting' || a.status === 'Scheduled')
    .sort((a, b) => a.tokenNumber - b.tokenNumber);
  const displayRows = q.map((a) => {
    const p = store.patients.find((x) => x.id === a.patientId);
    return { ...a, uhid: p ? p.uhid : '', age: p ? p.age : null, gender: p ? p.gender : null };
  });
  res.json({
    nowCalling,
    nextUp,
    waiting,
    displayRows,
    currentToken: currentToken(),
    completedToday: done.length,
    waitingCount: waiting.length,
  });
});

app.post('/api/dev/reset', (req, res) => {
  store = seedStore();
  saveStore();
  res.json({ ok: true });
});

app.post('/api/dev/clean-all', (req, res) => {
  store = emptyStore();
  // Keep standard catalogs & staff list
  const seeded = seedStore();
  store.pharmacyInventory = seeded.pharmacyInventory;
  store.radiologyPositions = seeded.radiologyPositions;
  store.staff = seeded.staff;
  saveStore();
  console.log('[store] Cleaned all demo data — Ready for fresh real patients!');
  res.json({ ok: true, message: 'All sample data cleared. Ready for fresh patients!' });
});

app.get('/api/dev/network', (req, res) => {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  res.json({ ips, port: PORT });
});

// ─── API: Pharmacy Inventory & OTC Direct Billing ────────────────────────────

app.get('/api/pharmacy/inventory', (req, res) => {
  res.json({ inventory: store.pharmacyInventory || [] });
});

app.post('/api/pharmacy/inventory', (req, res) => {
  const { name, batchNo, expiryDate, stockQty, purchasePrice, sellingPrice, gstPercent } = req.body || {};
  if (!name || !sellingPrice) return res.status(400).json({ message: 'Name and selling price required' });
  const existing = (store.pharmacyInventory || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (stockQty) existing.stockQty += Number(stockQty);
    if (batchNo) existing.batchNo = batchNo;
    if (expiryDate) existing.expiryDate = expiryDate;
    if (sellingPrice) existing.sellingPrice = Number(sellingPrice);
    if (gstPercent) existing.gstPercent = Number(gstPercent);
    saveStore();
    return res.json({ item: existing, updated: true });
  }
  const nextId = (store.pharmacyInventory.length ? store.pharmacyInventory[store.pharmacyInventory.length - 1].id : 0) + 1;
  const item = {
    id: nextId,
    name,
    batchNo: batchNo || 'BATCH-01',
    expiryDate: expiryDate || '2027-12-31',
    stockQty: Number(stockQty) || 100,
    purchasePrice: Number(purchasePrice) || (sellingPrice * 0.7),
    sellingPrice: Number(sellingPrice),
    gstPercent: Number(gstPercent) || 12,
  };
  store.pharmacyInventory.push(item);
  saveStore();
  res.status(201).json({ item, updated: false });
});

app.post('/api/pharmacy/otc-sale', (req, res) => {
  const { patientName, phone, items = [], paymentMode = 'Cash' } = req.body || {};
  if (!items.length) return res.status(400).json({ message: 'No items in sale' });

  // Deduct inventory stock
  items.forEach((it) => {
    const inv = store.pharmacyInventory.find((x) => x.name === it.medicineName);
    if (inv) inv.stockQty = Math.max(0, inv.stockQty - (Number(it.quantity) || 1));
  });

  const totalAmount = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const billId = uid('bill', store.seq);
  const bill = {
    id: billId,
    patientId: 0,
    patientName: patientName || 'OTC Walk-in Customer',
    phone: phone || '',
    billDate: todayStr(),
    totalAmount,
    paidAmount: totalAmount,
    paymentStatus: 'Paid',
    paymentMode,
    billItems: items.map((it, idx) => ({
      id: idx + 1,
      description: it.medicineName + ' (OTC)',
      category: 'Medicine',
      amount: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
    })),
  };
  store.bills.push(bill);
  saveStore();
  res.status(201).json({ bill });
});

// ─── API: Dynamic Radiology Positions Catalog ─────────────────────────────────

app.get('/api/radiology/positions', (req, res) => {
  res.json({ positions: store.radiologyPositions || [] });
});

app.post('/api/radiology/positions', (req, res) => {
  const { position } = req.body || {};
  if (!position) return res.status(400).json({ message: 'Position name required' });
  if (!store.radiologyPositions.includes(position)) {
    store.radiologyPositions.push(position);
    saveStore();
  }
  res.json({ positions: store.radiologyPositions });
});

// ─── API: Daily Expenses & Day-End Financial Closure ─────────────────────────

app.get('/api/expenses', (req, res) => {
  const date = req.query.date || todayStr();
  const list = (store.expenses || []).filter((e) => e.date === date);
  res.json({ expenses: list });
});

app.post('/api/expenses', (req, res) => {
  const { category, amount, paymentMode, notes, voucherNo } = req.body || {};
  if (!category || !amount) return res.status(400).json({ message: 'Category and amount required' });
  const exp = {
    id: uid('expense', store.seq),
    date: todayStr(),
    category,
    amount: Number(amount) || 0,
    paymentMode: paymentMode || 'Cash',
    voucherNo: voucherNo || `V-${String(store.seq.expense).padStart(3, '0')}`,
    notes: notes || '',
  };
  store.expenses.push(exp);
  saveStore();
  res.status(201).json({ expense: exp });
});

app.get('/api/finance/day-end', (req, res) => {
  const date = req.query.date || todayStr();
  const dateBills = (store.bills || []).filter((b) => b.billDate === date);
  const dateExpenses = (store.expenses || []).filter((e) => e.date === date);

  const totalCollected = dateBills.reduce((s, b) => s + (b.paidAmount || 0), 0);
  const totalExpenses = dateExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const byMode = { Cash: 0, UPI: 0, Card: 0, Insurance: 0 };
  dateBills.forEach((b) => {
    const m = b.paymentMode || 'Cash';
    byMode[m] = (byMode[m] || 0) + (b.paidAmount || 0);
  });

  const netCashInDrawer = (byMode['Cash'] || 0) - totalExpenses;

  res.json({
    date,
    totalBillsCount: dateBills.length,
    totalCollected,
    totalExpenses,
    netCashInDrawer,
    collectionsByMode: byMode,
    expensesList: dateExpenses,
  });
});

// ─── API: Staff HR, Attendance & Payroll ──────────────────────────────────────

app.get('/api/staff', (req, res) => {
  res.json({ staff: store.staff || [] });
});

app.post('/api/staff', (req, res) => {
  const { name, role, phone, monthlySalary } = req.body || {};
  if (!name || !role) return res.status(400).json({ message: 'Name and role required' });
  const nextId = (store.staff.length ? store.staff[store.staff.length - 1].id : 0) + 1;
  const s = { id: nextId, name, role, phone: phone || '', monthlySalary: Number(monthlySalary) || 15000 };
  store.staff.push(s);
  saveStore();
  res.status(201).json({ staffMember: s });
});

app.get('/api/staff/attendance', (req, res) => {
  const date = req.query.date || todayStr();
  let att = (store.attendance || []).filter((a) => a.date === date);
  if (!att.length) {
    att = store.staff.map((s) => ({ staffId: s.id, date, status: 'Present', checkInTime: '09:00 AM' }));
  }
  res.json({ attendance: att, staff: store.staff });
});

app.post('/api/staff/attendance', (req, res) => {
  const { date = todayStr(), records = [] } = req.body || {};
  store.attendance = store.attendance.filter((a) => a.date !== date);
  records.forEach((r) => {
    store.attendance.push({
      staffId: Number(r.staffId),
      date,
      status: r.status || 'Present',
      checkInTime: r.checkInTime || '09:00 AM',
    });
  });
  saveStore();
  res.json({ attendance: store.attendance.filter((a) => a.date === date) });
});

app.get('/api/staff/payroll', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const payroll = store.staff.map((s) => {
    const monthAtt = (store.attendance || []).filter((a) => a.staffId === s.id && a.date.startsWith(month));
    const presentDays = monthAtt.filter((a) => a.status === 'Present').length;
    const leaveDays = monthAtt.filter((a) => a.status === 'Leave' || a.status === 'Absent').length;
    const workingDays = Math.max(1, monthAtt.length || 26);
    const calculatedSalary = Math.round((s.monthlySalary / 26) * Math.min(26, presentDays || 26));

    return {
      staffId: s.id,
      name: s.name,
      role: s.role,
      monthlySalary: s.monthlySalary,
      workingDays,
      presentDays: presentDays || 26,
      leaveDays,
      netSalary: calculatedSalary,
    };
  });
  res.json({ month, payroll });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  console.log('==============================================');
  console.log('  Kumaran Robotic Ortho Care - HMS Server');
  console.log('  Running on port', PORT);
  console.log('  Local:   http://localhost:' + PORT);
  ips.forEach((ip) => console.log('  Network: http://' + ip + ':' + PORT));
  console.log('  Mobile app Server URL: http://<this-ip>:' + PORT);
  console.log('==============================================');
});