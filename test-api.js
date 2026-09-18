const http = require('http');

function req(path, method, body) {
  return new Promise((resolve, reject) => {
    const opts = { host: 'localhost', port: 3001, path, method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => { try { resolve({ status: resp.statusCode, data: JSON.parse(d) }); } catch(e) { resolve({ status: resp.statusCode, data: d }); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function runTests() {
  let ok = 0, fail = 0;
  const results = [];

  async function check(name, fn, validate) {
    try {
      const r = await fn();
      const valid = validate ? validate(r) : r.status < 400;
      if (valid) {
        results.push({ status: 'PASS', name, code: r.status });
        ok++;
      } else {
        results.push({ status: 'FAIL', name, code: r.status, detail: JSON.stringify(r.data).slice(0, 120) });
        fail++;
      }
    } catch(e) {
      results.push({ status: 'FAIL', name, error: e.message });
      fail++;
    }
  }

  // ── Core GET endpoints ──────────────────────────────────────────────
  await check('GET /api/health', () => req('/api/health'), r => r.data.ok === true);
  await check('GET /api/catalog', () => req('/api/catalog'), r => r.data.medicines && r.data.medicines.length > 0);
  await check('GET /api/doctors', () => req('/api/doctors'), r => r.data.doctors && r.data.doctors.length === 3);
  await check('GET /api/dashboard/stats', () => req('/api/dashboard/stats'), r => r.data.today && r.data.weekly);
  await check('GET /api/queue/today', () => req('/api/queue/today'), r => Array.isArray(r.data.queue));
  await check('GET /api/patients', () => req('/api/patients'), r => Array.isArray(r.data.patients));
  await check('GET /api/appointments/slots', () => req('/api/appointments/slots?date=' + new Date().toISOString().slice(0,10)), r => Array.isArray(r.data.slots));
  await check('GET /api/billing/all', () => req('/api/billing/all'), r => Array.isArray(r.data.bills));

  // ── 1. Pharmacy Inventory & OTC Billing ──────────────────────────────
  await check('GET /api/pharmacy/inventory', () => req('/api/pharmacy/inventory'), r => Array.isArray(r.data.inventory) && r.data.inventory.length >= 8);
  await check('POST /api/pharmacy/inventory (add drug)', () => req('/api/pharmacy/inventory', 'POST', { name: 'Cap. Amoxicillin 500mg', batchNo: 'AMX-2026', stockQty: 200, purchasePrice: 15, sellingPrice: 28, gstPercent: 12 }), r => r.data.item && r.data.item.name);
  await check('POST /api/pharmacy/otc-sale (direct sale)', () => req('/api/pharmacy/otc-sale', 'POST', { patientName: 'Walk-in OTC Test', phone: '9800011122', items: [{ medicineName: 'Tab. Paracetamol 650mg', price: 6, quantity: 2 }], paymentMode: 'Cash' }), r => r.data.bill && r.data.bill.totalAmount === 12);

  // ── 2. Dynamic Radiology Positions ─────────────────────────────────
  await check('GET /api/radiology/positions', () => req('/api/radiology/positions'), r => Array.isArray(r.data.positions) && r.data.positions.length >= 8);
  await check('POST /api/radiology/positions (add position)', () => req('/api/radiology/positions', 'POST', { position: 'Skyline View (Patella 45 Deg)' }), r => Array.isArray(r.data.positions) && r.data.positions.includes('Skyline View (Patella 45 Deg)'));

  // ── 3. Daily Expenses & Financial Day-End Closing ──────────────────
  await check('GET /api/expenses', () => req('/api/expenses'), r => Array.isArray(r.data.expenses));
  await check('POST /api/expenses (add voucher)', () => req('/api/expenses', 'POST', { category: 'Oxygen Refill', amount: 450, paymentMode: 'Cash', voucherNo: 'V-TEST-99', notes: 'Emergency ICU refill' }), r => r.data.expense && r.data.expense.amount === 450);
  await check('GET /api/finance/day-end', () => req('/api/finance/day-end'), r => r.data.totalCollected !== undefined && r.data.netCashInDrawer !== undefined);

  // ── 4. Staff HR, Attendance & Monthly Payroll ──────────────────────
  await check('GET /api/staff', () => req('/api/staff'), r => Array.isArray(r.data.staff) && r.data.staff.length >= 6);
  await check('GET /api/staff/attendance', () => req('/api/staff/attendance'), r => Array.isArray(r.data.attendance));
  await check('POST /api/staff/attendance', () => req('/api/staff/attendance', 'POST', { records: [{ staffId: 1, status: 'Present' }, { staffId: 2, status: 'Present' }] }), r => Array.isArray(r.data.attendance));
  await check('GET /api/staff/payroll', () => req('/api/staff/payroll'), r => Array.isArray(r.data.payroll) && r.data.payroll[0].netSalary > 0);

  // ── Print results ───────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('  KUMARAN ROBOTIC ORTHO CARE — ENTERPRISE API TEST RESULTS');
  console.log('  Tested: ' + new Date().toLocaleString('en-IN'));
  console.log('='.repeat(70));
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(icon + ' [' + (r.code || r.status) + '] ' + r.name + (r.detail ? '\n     └─ ' + r.detail : '') + (r.error ? '\n     └─ ' + r.error : ''));
  });
  console.log('='.repeat(70));
  console.log('  ✅ PASSED: ' + ok + '  |  ❌ FAILED: ' + fail + '  |  TOTAL: ' + (ok + fail));
  console.log('='.repeat(70) + '\n');
  process.exit(fail > 0 ? 1 : 0);
}

runTests();
