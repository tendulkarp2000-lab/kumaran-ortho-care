/* Kumaran Ortho Care — Admin Module: Day-End Finance, Expenses, HR Attendance, Payroll, Pharmacy Inventory */
(function () {
  /* ═══════════════════════════ DAY-END FINANCE & EXPENSES ═══════════════════════════ */

  function financeRender(container) {
    container.innerHTML = window.App.spinnerHtml();
    const todayStr = new Date().toISOString().slice(0, 10);
    Promise.all([
      window.API.get('/api/finance/day-end?date=' + todayStr),
      window.API.get('/api/expenses?date=' + todayStr),
    ]).then(([fRes, eRes]) => {
      renderFinance(container, fRes, eRes.expenses, todayStr);
    }).catch((err) => {
      container.innerHTML = '<div class="card empty">Failed to load finance data: ' + window.App.esc(err.message) + '</div>';
    });
  }

  function renderFinance(container, fData, expenses, dateStr) {
    container.innerHTML = '';
    container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Day-End Financial Closure & Expenses' }));
    container.appendChild(window.App.el('p', { class: 'page-sub', text: 'தினசரி கணக்கு முடித்தல் · Collections → Expenses → Cash in Drawer' }));

    // Summary Cards
    const cards = window.App.el('div', { class: 'grid grid-4' },
      window.App.el('div', { class: 'card stat-card' },
        window.App.el('div', { class: 'stat-value', style: { color: '#0891B2' }, text: window.App.inr(fData.totalCollected) }),
        window.App.el('div', { class: 'stat-label', text: 'Total OPD & Pharmacy Collections' }),
        window.App.el('div', { class: 'stat-sub', text: fData.totalBillsCount + ' total bill(s) today' })
      ),
      window.App.el('div', { class: 'card stat-card' },
        window.App.el('div', { class: 'stat-value', style: { color: '#DC2626' }, text: window.App.inr(fData.totalExpenses) }),
        window.App.el('div', { class: 'stat-label', text: 'Daily Expenses (Vouchers)' }),
        window.App.el('div', { class: 'stat-sub', text: expenses.length + ' expense entry(s)' })
      ),
      window.App.el('div', { class: 'card stat-card' },
        window.App.el('div', { class: 'stat-value', style: { color: '#16A34A' }, text: window.App.inr(fData.netCashInDrawer) }),
        window.App.el('div', { class: 'stat-label', text: 'Net Cash in Drawer (Cash Handover)' }),
        window.App.el('div', { class: 'stat-sub', text: 'Cash collected minus petty cash expenses' })
      ),
      window.App.el('div', { class: 'card stat-card' },
        window.App.el('div', { class: 'stat-value', style: { color: '#7C3AED' }, text: window.App.inr(fData.collectionsByMode.UPI || 0) }),
        window.App.el('div', { class: 'stat-label', text: 'UPI / Online Collections' }),
        window.App.el('div', { class: 'stat-sub', text: 'Direct bank transfer / GPay / PhonePe' })
      )
    );
    container.appendChild(cards);

    // Expense Entry Form & History
    const expCard = window.App.el('div', { class: 'card mt16' },
      window.App.el('div', { class: 'flex-between' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">🧾</span> Daily Expense Register' }),
        window.App.el('button', { class: 'btn btn-primary btn-sm', onclick: () => openAddExpenseModal(), text: '+ Add Expense Voucher' })
      ),
      expenses.length ? window.App.el('div', { class: 'table-wrap mt12', html:
        '<table class="data"><thead><tr><th>Voucher #</th><th>Category</th><th>Amount</th><th>Mode</th><th>Notes</th></tr></thead><tbody>' +
        expenses.map((e) => '<tr><td class="mono"><b>' + window.App.esc(e.voucherNo) + '</b></td><td>' + window.App.esc(e.category) + '</td><td style="color:#DC2626;font-weight:700;">' + window.App.inr(e.amount) + '</td><td><span class="chip chip-neutral">' + window.App.esc(e.paymentMode) + '</span></td><td class="small muted">' + window.App.esc(e.notes || '—') + '</td></tr>').join('') +
        '</tbody></table>'
      }) : window.App.el('div', { class: 'empty mt12', html: '<div class="empty-ico">☕</div>No expense vouchers recorded today' })
    );
    container.appendChild(expCard);

    // Print Day-End Closure Slip
    const printCard = window.App.el('div', { class: 'card mt16 flex-between' },
      window.App.el('div', { html: '<b>Day-End Cash Reconciliation Report</b><div class="small muted">Print complete financial closing summary for bank deposit & records</div>' }),
      window.App.el('button', { class: 'btn btn-gold', onclick: () => printDayEndClosure(fData, dateStr), text: '🖨 Print Day-End Report' })
    );
    container.appendChild(printCard);
  }

  function openAddExpenseModal() {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><label>Category <span class="req">*</span></label>
        <select class="input" id="exp-cat">
          <option>Tea & Coffee (Staff & OPD)</option>
          <option>Cleaning & Bio-Waste Material</option>
          <option>Oxygen Cylinder Refill</option>
          <option>Stationery & Printer Ink</option>
          <option>Equipment Maintenance & Repairs</option>
          <option>Petty Cash / Miscellaneous</option>
        </select>
      </div>
      <div class="field"><label>Amount (₹) <span class="req">*</span></label>
        <input class="input" type="number" id="exp-amt" placeholder="e.g. 250" />
      </div>
      <div class="field"><label>Payment Mode</label>
        <select class="input" id="exp-mode"><option>Cash</option><option>UPI</option><option>Card</option></select>
      </div>
      <div class="field"><label>Voucher / Bill No.</label>
        <input class="input" id="exp-voucher" placeholder="e.g. V-102" />
      </div>
      <div class="field"><label>Notes / Description</label>
        <textarea class="input" id="exp-notes" rows="2" placeholder="Details of expense..."></textarea>
      </div>
    `;

    window.App.modal({
      title: 'Add Daily Expense Voucher',
      bodyNode: body,
      footer: [
        window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Cancel' }),
        window.App.el('button', { class: 'btn btn-primary', onclick: () => submitExpense(), text: '✔ Save Expense' }),
      ],
    });
  }

  function submitExpense() {
    const category = document.getElementById('exp-cat').value;
    const amount = Number(document.getElementById('exp-amt').value) || 0;
    const paymentMode = document.getElementById('exp-mode').value;
    const voucherNo = document.getElementById('exp-voucher').value.trim();
    const notes = document.getElementById('exp-notes').value.trim();

    if (amount <= 0) return window.App.toast('Enter a valid amount', 'error');

    window.API.post('/api/expenses', { category, amount, paymentMode, voucherNo, notes })
      .then(() => {
        window.App.closeModal();
        window.App.toast('Expense voucher recorded', 'success');
        window.App.navigate('finance');
      })
      .catch((e) => window.App.toast(e.message, 'error'));
  }

  function printDayEndClosure(fData, dateStr) {
    const area = document.getElementById('print-area');
    const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    area.innerHTML = `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#111;max-width:650px;margin:0 auto;padding:20px;">
        <div style="text-align:center;border-bottom:2px solid #1B3A6B;padding-bottom:10px;margin-bottom:14px;">
          <h2 style="margin:0;color:#1B3A6B;">Kumaran Robotic Ortho Care</h2>
          <p style="margin:2px 0;color:#555;font-size:12px;">DAY-END FINANCIAL RECONCILIATION REPORT</p>
          <p style="margin:2px 0;color:#888;font-size:11px;">Date: ${window.App.fmtDate(dateStr)} | Generated: ${now}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
          <tr style="background:#EFF6FF;"><td style="padding:8px;">Total Bills Today</td><td style="padding:8px;font-weight:700;text-align:right;">${fData.totalBillsCount} bills</td></tr>
          <tr><td style="padding:8px;">Cash Collected</td><td style="padding:8px;font-weight:700;text-align:right;">${window.App.inr(fData.collectionsByMode.Cash || 0)}</td></tr>
          <tr style="background:#F8FAFC;"><td style="padding:8px;">UPI / GPay Collections</td><td style="padding:8px;font-weight:700;text-align:right;">${window.App.inr(fData.collectionsByMode.UPI || 0)}</td></tr>
          <tr><td style="padding:8px;">Card Collections</td><td style="padding:8px;font-weight:700;text-align:right;">${window.App.inr(fData.collectionsByMode.Card || 0)}</td></tr>
          <tr style="background:#EFF6FF;font-weight:700;"><td style="padding:8px;">GROSS REVENUE TODAY</td><td style="padding:8px;text-align:right;color:#0891B2;">${window.App.inr(fData.totalCollected)}</td></tr>
          <tr style="background:#FEF2F2;color:#DC2626;"><td style="padding:8px;">Less: Total Daily Expenses</td><td style="padding:8px;font-weight:700;text-align:right;">-${window.App.inr(fData.totalExpenses)}</td></tr>
          <tr style="background:#F0FDF4;font-size:15px;font-weight:800;color:#16A34A;"><td style="padding:10px;">NET CASH IN DRAWER TO HANDOVER</td><td style="padding:10px;text-align:right;">${window.App.inr(fData.netCashInDrawer)}</td></tr>
        </table>

        <div style="margin-top:30px;display:flex;justify-content:space-between;font-size:12px;">
          <div>Cashier Signature</div>
          <div>Manager Signature</div>
          <div>Doctor / Admin Signature</div>
        </div>
      </div>
    `;
    window.print();
  }

  /* ═══════════════════════════ STAFF HR & PAYROLL ═══════════════════════════ */

  function staffRender(container) {
    container.innerHTML = window.App.spinnerHtml();
    const todayStr = new Date().toISOString().slice(0, 10);
    Promise.all([
      window.API.get('/api/staff/attendance?date=' + todayStr),
      window.API.get('/api/staff/payroll'),
    ]).then(([attRes, payRes]) => {
      renderStaffHR(container, attRes.attendance, attRes.staff, payRes.payroll, todayStr);
    }).catch((err) => {
      container.innerHTML = '<div class="card empty">Failed to load staff data: ' + window.App.esc(err.message) + '</div>';
    });
  }

  function renderStaffHR(container, attendance, staff, payroll, dateStr) {
    container.innerHTML = '';
    container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Staff HR, Attendance & Payroll' }));
    container.appendChild(window.App.el('p', { class: 'page-sub', text: 'ஊழியர் வருகைப் பதிவு & மாதச் சம்பளம் · Staff Register → Attendance → Payroll' }));

    // Attendance Register Card
    const attCard = window.App.el('div', { class: 'card' },
      window.App.el('div', { class: 'flex-between' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">📋</span> Daily Attendance Register — ' + window.App.fmtDate(dateStr) }),
        window.App.el('button', { class: 'btn btn-primary btn-sm', onclick: () => saveAttendance(staff), text: '✔ Save Attendance' })
      ),
      window.App.el('div', { class: 'table-wrap mt12', html:
        '<table class="data" id="att-table"><thead><tr><th>Staff Name</th><th>Role</th><th>Phone</th><th>Status</th></tr></thead><tbody>' +
        staff.map((st) => {
          const rec = attendance.find((a) => a.staffId === st.id) || { status: 'Present' };
          return `<tr>
            <td><b>${window.App.esc(st.name)}</b></td>
            <td>${window.App.esc(st.role)}</td>
            <td class="small muted">${window.App.esc(st.phone)}</td>
            <td>
              <select class="input att-sel" data-staff="${st.id}" style="width:130px;padding:4px 8px;">
                <option value="Present" ${rec.status === 'Present' ? 'selected' : ''}>✅ Present</option>
                <option value="Absent" ${rec.status === 'Absent' ? 'selected' : ''}>❌ Absent</option>
                <option value="Leave" ${rec.status === 'Leave' ? 'selected' : ''}>🛌 On Leave</option>
              </select>
            </td>
          </tr>`;
        }).join('') +
        '</tbody></table>'
      })
    );
    container.appendChild(attCard);

    // Monthly Payroll Card
    const payCard = window.App.el('div', { class: 'card mt16' },
      window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">💰</span> Monthly Payroll Sheet (' + payroll.length + ' Staff)' }),
      window.App.el('div', { class: 'table-wrap mt12', html:
        '<table class="data"><thead><tr><th>Staff Name</th><th>Role</th><th>Monthly Salary</th><th>Days Worked</th><th>Net Calculated Pay</th><th>Payslip</th></tr></thead><tbody>' +
        payroll.map((p) => `<tr>
          <td><b>${window.App.esc(p.name)}</b></td>
          <td>${window.App.esc(p.role)}</td>
          <td>${window.App.inr(p.monthlySalary)}</td>
          <td><b>${p.presentDays} / ${p.workingDays} days</b></td>
          <td style="color:#16A34A;font-weight:700;">${window.App.inr(p.netSalary)}</td>
          <td><button class="btn btn-outline btn-sm" onclick='printPayslip(${JSON.stringify(p)})'>📄 Payslip</button></td>
        </tr>`).join('') +
        '</tbody></table>'
      })
    );
    container.appendChild(payCard);
  }

  function saveAttendance(staff) {
    const records = [];
    document.querySelectorAll('.att-sel').forEach((sel) => {
      records.push({
        staffId: Number(sel.dataset.staff),
        status: sel.value,
        checkInTime: '08:45 AM',
      });
    });
    const todayStr = new Date().toISOString().slice(0, 10);
    window.API.post('/api/staff/attendance', { date: todayStr, records })
      .then(() => {
        window.App.toast('Attendance register saved', 'success');
        window.App.navigate('staff');
      })
      .catch((e) => window.App.toast(e.message, 'error'));
  }

  window.printPayslip = function (p) {
    const area = document.getElementById('print-area');
    const monthStr = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    area.innerHTML = `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ccc;">
        <div style="text-align:center;border-bottom:2px solid #1B3A6B;padding-bottom:8px;margin-bottom:12px;">
          <h3 style="margin:0;color:#1B3A6B;">Kumaran Robotic Ortho Care</h3>
          <p style="margin:2px 0;font-size:12px;">SALARY PAYSLIP — ${monthStr}</p>
        </div>

        <table style="width:100%;font-size:13px;margin-bottom:14px;">
          <tr><td style="color:#555;">Staff Name:</td><td><b>${window.App.esc(p.name)}</b></td><td style="color:#555;">Designation:</td><td><b>${window.App.esc(p.role)}</b></td></tr>
          <tr><td style="color:#555;">Working Days:</td><td>${p.presentDays} / ${p.workingDays}</td><td style="color:#555;">Leave Taken:</td><td>${p.leaveDays} days</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
          <tr style="background:#1B3A6B;color:#fff;"><th style="padding:6px;text-align:left;">Earnings</th><th style="padding:6px;text-align:right;">Amount (₹)</th></tr>
          <tr><td style="padding:6px;">Basic Pay (${p.presentDays} days)</td><td style="padding:6px;text-align:right;">${window.App.inr(p.netSalary)}</td></tr>
          <tr style="background:#F0FDF4;font-weight:700;"><td style="padding:8px;">NET SALARY PAYABLE</td><td style="padding:8px;text-align:right;color:#16A34A;">${window.App.inr(p.netSalary)}</td></tr>
        </table>

        <div style="margin-top:30px;display:flex;justify-content:space-between;font-size:12px;">
          <div>Employee Signature</div>
          <div>Authorized Signature</div>
        </div>
      </div>
    `;
    window.print();
  };

  /* ── Register Navigation Views ─────────────────────────────── */

  window.App.registerView({
    key: 'finance', label: 'Day-End & Expenses', labelTa: 'கணக்கு & செலவு', render: financeRender,
  });

  window.App.registerView({
    key: 'staff', label: 'Staff HR & Payroll', labelTa: 'ஊழியர் & சம்பளம்', render: staffRender,
  });
})();
