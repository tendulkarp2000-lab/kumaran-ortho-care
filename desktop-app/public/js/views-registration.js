/* Kumaran Ortho Care — OP Registration view */
(function () {
  let searchCache = null;

  function render(container) {
    container.innerHTML = '';
    container.appendChild(window.App.el('h2', { class: 'page-head', text: 'OP Registration' }));
    container.appendChild(window.App.el('p', { class: 'page-sub', text: 'புதிய நோயாளி பதிவு / Walk-in Patient Registration → Token → Queue' }));

    container.appendChild(window.App.el('div', { class: 'card' },
      window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">🔍</span> Search Existing Patient' }),
      window.App.el('div', { class: 'form-row' },
        window.App.el('div', { class: 'field' },
          window.App.el('label', { html: 'Mobile Number <span class="req">*</span>' }),
          window.App.el('input', { type: 'tel', id: 'reg-phone', class: 'input', placeholder: '10-digit mobile', maxlength: '10' })
        ),
        window.App.el('div', { class: 'field' },
          window.App.el('label', { text: 'OR' }),
          window.App.el('input', { type: 'text', id: 'reg-uhid', class: 'input', placeholder: 'UHID e.g. KOC-0001' })
        )
      ),
      window.App.el('div', { class: 'flex' },
        window.App.el('button', { class: 'btn btn-navy', id: 'reg-search', text: '🔍 Search' }),
        window.App.el('span', { class: 'small muted', id: 'reg-search-note', text: 'Already registered patients will show here' })
      ),
      window.App.el('div', { id: 'reg-search-result', class: 'mt12' })
    ));

    container.appendChild(window.App.el('div', { class: 'card mt16' },
      window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">🩺</span> New Patient Registration' }),
      window.App.el('div', { class: 'grid grid-2' },
        window.App.el('div', { class: 'field' }, window.App.el('label', { html: 'Full Name <span class="req">*</span>' }), window.App.el('input', { id: 'np-name', class: 'input', placeholder: 'Patient name' })),
        window.App.el('div', { class: 'field' }, window.App.el('label', { html: 'Mobile Number <span class="req">*</span>' }), window.App.el('input', { id: 'np-phone', type: 'tel', class: 'input', placeholder: '10-digit mobile', maxlength: '10' })),
        window.App.el('div', { class: 'field' }, window.App.el('label', { text: 'Age' }), window.App.el('input', { id: 'np-age', type: 'number', class: 'input', min: '0', max: '120', placeholder: 'e.g. 45' })),
        window.App.el('div', { class: 'field' },
          window.App.el('label', { text: 'Gender' }),
          window.App.el('select', { id: 'np-gender', class: 'input' },
            ['Male', 'Female', 'Other'].map((g) => window.App.el('option', { value: g, text: g }))
          )
        ),
        window.App.el('div', { class: 'field' },
          window.App.el('label', { text: 'Blood Group' }),
          window.App.el('select', { id: 'np-bg', class: 'input' },
            ['Unknown', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((g) => window.App.el('option', { value: g, text: g }))
          )
        ),
        window.App.el('div', { class: 'field' },
          window.App.el('label', { html: 'Doctor <span class="req">*</span>' }),
          window.App.el('select', { id: 'np-doctor', class: 'input' })
        ),
        window.App.el('div', { class: 'field' },
          window.App.el('label', { text: 'Time Slot' }),
          window.App.el('select', { id: 'np-slot', class: 'input' })
        ),
        window.App.el('div', { class: 'field', style: { gridColumn: '1 / -1' } },
          window.App.el('label', { text: 'Address' }),
          window.App.el('textarea', { id: 'np-addr', class: 'input', rows: '2', placeholder: 'Address' })
        )
      ),
      window.App.el('button', { class: 'btn btn-primary btn-lg', id: 'np-submit', style: { width: '100%' }, text: '✔ Register & Issue Token' })
    ));

    // Load doctors
    fetch('/api/doctors').then((r) => r.json()).then((d) => {
      const sel = document.getElementById('np-doctor');
      d.doctors.forEach((doc) => {
        sel.appendChild(window.App.el('option', { value: doc.id, text: doc.name + ' — ' + doc.spec }));
      });
    }).catch(() => {});

    // Load walk-in slot availability for today (show for info, auto-selected on register)
    loadWalkinSlotInfo();

    // Search
    document.getElementById('reg-search').onclick = doSearch;
    document.getElementById('reg-phone').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    document.getElementById('reg-uhid').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

    // New patient submit
    document.getElementById('np-submit').onclick = () => {
      const name = document.getElementById('np-name').value.trim();
      const phone = document.getElementById('np-phone').value.trim();
      if (!name) return window.App.toast('Enter patient name', 'error');
      if (phone.length !== 10) return window.App.toast('Enter a valid 10-digit mobile number', 'error');
      const payload = {
        name,
        phone,
        age: Number(document.getElementById('np-age').value) || 0,
        gender: document.getElementById('np-gender').value,
        bloodGroup: document.getElementById('np-bg').value,
        address: document.getElementById('np-addr').value.trim(),
      };
      const btn = document.getElementById('np-submit');
      btn.disabled = true; btn.textContent = 'Registering…';
      window.API.post('/api/patients', payload)
        .then((p) => registerToday(p.patient, btn))
        .catch((err) => { btn.disabled = false; btn.textContent = '✔ Register & Issue Token'; window.App.toast(err.message, 'error'); });
    };
  }

  async function doSearch() {
    const phone = document.getElementById('reg-phone').value.trim();
    const uhid = document.getElementById('reg-uhid').value.trim();
    const result = document.getElementById('reg-search-result');
    if (!phone && !uhid) return window.App.toast('Enter phone or UHID to search', 'error');
    result.innerHTML = window.App.spinnerHtml();
    try {
      let patient = null;
      if (uhid) {
        try {
          const r = await window.API.get('/api/patients/uhid/' + encodeURIComponent(uhid.toUpperCase()));
          patient = r.patient;
        } catch (e) { result.innerHTML = '<div class="empty">No patient found for UHID ' + window.App.esc(uhid) + '</div>'; return; }
      } else {
        const r = await window.API.get('/api/patients?phone=' + encodeURIComponent(phone));
        patient = r.patients[0] || null;
        if (!patient) { result.innerHTML = '<div class="empty">No patient found for this number.<br/><span class="small muted">Use the New Patient form below to register.</span></div>'; return; }
      }
      showSearched(patient, result);
    } catch (err) {
      result.innerHTML = '<div class="empty">Search failed: ' + window.App.esc(err.message) + '</div>';
    }
  }

  function showSearched(patient, result) {
    const card = window.App.el('div', { class: 'card', style: { background: '#F0FDF4', borderColor: '#86EFAC' } },
      window.App.el('div', { class: 'flex-between' },
        window.App.el('div', { html: window.App.patientInfoRow(patient) }),
        window.App.el('span', { class: 'chip chip-success', text: 'Registered' })
      ),
      window.App.el('div', { class: 'flex mt12', style: { gap: 10 } },
        window.App.el('button', { class: 'btn btn-gold', onclick: () => registerToday(patient, null), text: '🎟 Register for Today (Queue)' })
      )
    );
    result.innerHTML = '';
    result.appendChild(card);
  }

  async function loadWalkinSlotInfo() {
    try {
      const res = await window.API.get('/api/appointments/next-walkin-slot?date=' + new Date().toISOString().slice(0, 10));
      const note = document.getElementById('reg-search-note');
      if (note && res.slot) {
        note.textContent = '📍 Next Walk-in Slot: ' + res.slot + ' (' + res.walkinLeft + ' reserved spots left)';
      }
    } catch (e) {}
  }

  async function registerToday(patient, btn) {
    const prevText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Registering…'; }
    try {
      // Verify no existing appointment today
      const appts = await window.API.get('/api/appointments?patientId=' + patient.id);
      const todayStr = new Date().toISOString().slice(0, 10);
      const has = appts.appointments.find((a) => a.appointmentDate === todayStr && a.status !== 'Cancelled');
      if (has) {
        if (btn) { btn.disabled = false; btn.textContent = prevText; }
        showTokenCard(patient, has, true);
        window.App.toast('Already registered today — token #' + has.tokenNumber, 'gold');
        return;
      }

      // Auto-get best walk-in slot
      let slot = '09:00 AM';
      try {
        const nextRes = await window.API.get('/api/appointments/next-walkin-slot?date=' + todayStr);
        if (nextRes.slot) slot = nextRes.slot;
      } catch (e) {}

      const doctorId = Number(document.getElementById('np-doctor')?.value) || 1;
      const created = await window.API.post('/api/appointments', {
        patientId: patient.id,
        appointmentDate: todayStr,
        timeSlot: slot,
        notes: 'Walk-in counter registration',
        doctorId,
        bookingType: 'walkin',
      });
      if (btn) { btn.disabled = false; btn.textContent = '✔ Register & Issue Token'; }
      showTokenCard(patient, created.appointment, false);
      window.App.toast('Token #' + created.appointment.tokenNumber + ' issued (' + slot + ')', 'success');
      // clear form
      ['np-name', 'np-phone', 'np-age', 'np-addr', 'reg-phone', 'reg-uhid'].forEach((id) => {
        const f = document.getElementById(id); if (f) f.value = '';
      });
      window.App.refreshBadges();
      document.getElementById('reg-search-result').innerHTML = '';
      loadWalkinSlotInfo();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = prevText; }
      window.App.toast(err.message, 'error');
    }
  }

  function showTokenCard(patient, appt, existing) {
    const doctor = appt.doctorName || 'Dr. P.L. Vijayakumar';
    window.App.modal({
      title: existing ? 'Already Registered Today' : 'Registration Successful',
      wide: true,
      bodyHtml:
        '<div style="text-align:center;">' +
        '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:14px;padding:22px;margin-bottom:16px;">' +
        '<div style="color:#0369A1;font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:1px;">Token Number</div>' +
        '<div style="font-size:58px;font-weight:900;color:#1B3A6B;">#' + appt.tokenNumber + '</div>' +
        '<div class="small muted">' + window.App.fmtDate(appt.appointmentDate) + ' · ' + window.App.esc(appt.timeSlot) + '</div></div>' +
        window.App.esc(patient.name) + ' · UHID <b>' + window.App.esc(patient.uhid) + '</b><br/>' +
        '<span class="chip chip-info mt8" style="margin-top:8px;">👨‍⚕️ ' + window.App.esc(doctor) + '</span> ' +
        '<span class="chip chip-warning mt8" style="margin-top:8px;">In Queue — patiently waiting</span>' +
        '</div>',
      footer: [
        window.App.el('button', { class: 'btn btn-gold', onclick: () => { window.App.closeModal(); printToken(patient, appt, existing); }, text: '🖨 Print Token (A5 chit)' }),
        window.App.el('button', { class: 'btn btn-outline', onclick: () => { window.App.closeModal(); window.App.navigate('doctor'); }, text: 'Go to Doctor Queue →' }),
      ],
    });
  }

  function printToken(patient, appt, existing) {
    const doctor = appt.doctorName || 'Dr. P.L. Vijayakumar';
    const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const room = doctor.indexOf('Prakash') > -1 ? 'Consult Room 2' : (doctor.indexOf('Revathi') > -1 ? 'Consult Room 3' : 'Consult Room 1');
    const area = document.getElementById('print-area');
    area.innerHTML =
      '<div style="font-family:Segoe UI,Arial,sans-serif;color:#111;max-width:360px;margin:0 auto;padding:16px;">' +
      '<div style="text-align:center;border-bottom:3px solid #1B3A6B;padding-bottom:10px;margin-bottom:14px;">' +
      '<h2 style="margin:0;color:#1B3A6B;font-size:20px;">Kumaran Robotic Ortho Care</h2>' +
      '<p style="margin:2px 0;color:#555;font-size:11px;">Dr. P.L. Vijayakumar, MS Ortho</p>' +
      '<p style="margin:2px 0;color:#888;font-size:10px;">123 Srirangam Main Road, Trichy - 620006</p></div>' +
      '<div style="text-align:center;margin-bottom:12px;">' +
      '<div style="color:#0369A1;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:2px;">OP Token' + (existing ? ' (Re-issued)' : '') + '</div>' +
      '<div style="font-size:64px;font-weight:900;color:#1B3A6B;line-height:1;">#' + appt.tokenNumber + '</div></div>' +
      '<table style="width:100%;font-size:13px;margin-bottom:6px;">' +
      '<tr><td style="padding:3px 0;color:#555;">Name</td><td style="padding:3px 0;font-weight:700;">' + window.App.esc(patient.name) + '</td></tr>' +
      '<tr><td style="padding:3px 0;color:#555;">UHID</td><td style="padding:3px 0;font-weight:700;">' + window.App.esc(patient.uhid) + '</td></tr>' +
      '<tr><td style="padding:3px 0;color:#555;">Doctor</td><td style="padding:3px 0;font-weight:700;">' + window.App.esc(doctor) + '</td></tr>' +
      '<tr><td style="padding:3px 0;color:#555;">Room</td><td style="padding:3px 0;font-weight:700;">' + window.App.esc(room) + '</td></tr>' +
      '<tr><td style="padding:3px 0;color:#555;">Date</td><td style="padding:3px 0;font-weight:700;">' + window.App.fmtDate(appt.appointmentDate) + '</td></tr>' +
      '<tr><td style="padding:3px 0;color:#555;">Slot</td><td style="padding:3px 0;font-weight:700;">' + window.App.esc(appt.timeSlot) + '</td></tr>' +
      '<tr><td style="padding:3px 0;color:#555;">Issued</td><td style="padding:3px 0;">' + now + '</td></tr></table>' +
      '<div style="margin-top:16px;text-align:center;font-size:10px;color:#888;border-top:1px solid #ccc;padding-top:8px;">' +
      'Please wait until your token is called | உங்கள் எண்ணைக் காத்திருங்கள்</div>' +
      '</div>';
    const a5 = document.createElement('style');
    a5.id = 'a5-page';
    a5.textContent = '@page { size: A5 portrait; margin: 6mm; }';
    document.head.appendChild(a5);
    window.print();
    setTimeout(() => { const s = document.getElementById('a5-page'); if (s) s.remove(); }, 800);
  }

  window.App.registerView({
    key: 'registration',
    label: 'OP Registration',
    labelTa: 'OPD பதிவு',
    render,
  });
})();