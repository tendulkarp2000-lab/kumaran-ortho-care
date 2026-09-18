/* Kumaran Ortho Care — Clinical views: Doctor, Pharmacy, Lab, Radiology, Billing */
(function () {
  const DAYS = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', 'Ongoing'];
  const FREQS = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'At bedtime', 'As needed'];
  let CATALOG = { medicines: [], labTests: [], radiology: [], consultationFee: 500, doctors: [] };
  let activeDoctor = 0;
  fetch('/api/catalog').then((r) => r.json()).then((c) => { CATALOG = c; }).catch(() => {});

  function fmtRows(rows) {
    return rows || [];
  }

  /* ═══════════════════════════ DOCTOR ═══════════════════════════ */

  function doctorRender(container) {
    container.innerHTML = window.App.spinnerHtml();
    container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Doctor Module — Dr. Vijayakumar' }));
    container.appendChild(window.App.el('p', { class: 'page-sub', text: 'வரிசை → ஆலோசனை → நோய் கண்டறிதல் → பரிந்துரைகள் · Queue → Consultation → Diagnosis → Referrals' }));

    window.API.get('/api/queue/today').then((r) => {
      container.innerHTML = '';
      container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Doctor Module — Dr. Vijayakumar' }));
      container.appendChild(window.App.el('p', { class: 'page-sub', text: 'வரிசை → ஆலோசனை → நோய் கண்டறிதல் → பரிந்துரைகள்' }));

      const q = r.queue;
      const cur = q.filter((a) => a.status === 'Called');
      const curA = cur[0] || null;
      const banner = window.App.el('div', { class: 'queue-banner' + (curA ? ' pulse' : '') },
        window.App.el('div', { html:
          '<div class="small" style="color:#0369A1;font-weight:700;text-transform:uppercase;">Now Calling</div>' +
          '<div class="qb-token">#' + (curA ? curA.tokenNumber : '—') + '</div>' }),
        window.App.el('div', { style: { flex: 1 } },
          curA
            ? window.App.el('div', { html: 'Head to consultation for <b>' + window.App.esc(curA.patientName) + '</b>' +
                '<div class="small muted">' + window.App.esc(curA.doctorName || '') + ' · Token #' + curA.tokenNumber + '</div>' })
            : window.App.el('div', { class: 'small muted', text: 'No patient being called. Tap "Call Next" to bring in the next token.' }),
          window.App.el('div', { class: 'small muted' }, q.filter((x) => x.status === 'Waiting').length + ' waiting in queue')
        ),
        window.App.el('button', { class: 'btn btn-gold', onclick: () => callNext(), text: '📢 Call Next' })
      );
      container.appendChild(banner);

      // Doctor filter
      const doctors = CATALOG.doctors && CATALOG.doctors.length ? CATALOG.doctors : [{ id: 1, name: 'Dr. P.L. Vijayakumar', spec: '' }];
      const filterBar = window.App.el('div', { class: 'tabs mt8' },
        window.App.el('button', { class: 'tab' + (activeDoctor === 0 ? ' active' : ''), onclick: () => { activeDoctor = 0; window.App.navigate('doctor'); }, text: '👥 All Doctors' }),
        doctors.map((d) => window.App.el('button', {
          class: 'tab' + (activeDoctor === d.id ? ' active' : ''),
          onclick: () => { activeDoctor = d.id; window.App.navigate('doctor'); },
          html: '👨‍⚕️ ' + window.App.esc(d.name.replace('Dr. ', '')),
        }))
      );
      container.appendChild(filterBar);

      // Consultation table
      const card = window.App.el('div', { class: 'card' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">🎟</span> Today\'s OPD Queue' }),
        window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="doc-table"></table>' })
      );
      container.appendChild(card);
      fillDoctorTable(document.getElementById('doc-table'), q);

      // Consulted today
      const doneCard = window.App.el('div', { class: 'card mt16' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">✅</span> Completed Today' }),
        window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="doc-done"></table>' })
      );
      container.appendChild(doneCard);
      fillDoctorDone(document.getElementById('doc-done'), q);
    }).catch((e) => {
      container.innerHTML = '<div class="card empty">Failed to load queue<br/><span class="small muted">' + window.App.esc(e.message) + '</span></div>';
    });
  }

  function callNext() {
    window.API.get('/api/queue/today').then((r) => {
      let waiting = r.queue.filter((a) => a.status === 'Waiting').sort((a, b) => a.tokenNumber - b.tokenNumber);
      if (activeDoctor !== 0) {
        const mine = waiting.filter((a) => Number(a.doctorId) === Number(activeDoctor));
        if (mine.length) waiting = mine;
      }
      if (!waiting.length) return window.App.toast('No waiting patients' + (activeDoctor !== 0 ? ' for this doctor' : ''), 'gold');
      const target = waiting[0];
      window.API.post('/api/queue/' + target.id + '/call').then(() => {
        window.App.toast('Calling token #' + target.tokenNumber + ' — ' + target.patientName, 'gold');
        window.App.navigate('doctor');
        window.App.refreshBadges();
      }).catch((e) => window.App.toast(e.message, 'error'));
    });
  }

  function fillDoctorTable(tb, q) {
    const rows = (activeDoctor === 0 ? q : q.filter((a) => Number(a.doctorId) === Number(activeDoctor)))
      .filter((a) => a.status !== 'Completed');
    if (!rows.length) {
      tb.innerHTML = '<tbody><tr><td colspan="7" class="empty">Queue is clear 🎉</td></tr></tbody>';
      return;
    }
    tb.innerHTML =
      '<thead><tr><th>Token</th><th>Patient</th><th>UHID</th><th>Doctor</th><th>Slot</th><th>Status</th><th>Action</th></tr></thead>' +
      '<tbody>' + rows.map((a) =>
        '<tr>' +
        '<td><b>#' + a.tokenNumber + '</b></td>' +
        '<td>' + window.App.esc(a.patientName) + '</td>' +
        '<td class="mono small muted">' + window.App.esc(a.uhid || '') + '</td>' +
        '<td class="small">' + window.App.esc((a.doctorName || '').replace('Dr. ', '')) + '</td>' +
        '<td>' + window.App.esc(a.timeSlot) + '</td>' +
        '<td>' + window.App.chip(a.status) + '</td>' +
        '<td><div class="actions">' +
        (a.status === 'Called'
          ? '<button class="btn btn-primary btn-sm" data-open="' + a.id + '">👨‍⚕️ Consult</button>'
          : '<button class="btn btn-gold btn-sm" data-call="' + a.id + '">📢 Call</button>') +
        '<button class="btn btn-sm" style="background:#F1F5F9;color:#64748B;" data-noshow="' + a.id + '" title="Mark No Show">✗ No Show</button>' +
        '</div></td></tr>'
      ).join('') + '</tbody>';
    tb.querySelectorAll('[data-call]').forEach((b) => {
      b.onclick = () => {
        window.API.post('/api/queue/' + b.dataset.call + '/call')
          .then(() => { window.App.toast('Called — patient on the way', 'gold'); window.App.navigate('doctor'); window.App.refreshBadges(); })
          .catch((e) => window.App.toast(e.message, 'error'));
      };
    });
    tb.querySelectorAll('[data-open]').forEach((b) => {
      b.onclick = () => openConsultation(Number(b.dataset.open));
    });
    tb.querySelectorAll('[data-noshow]').forEach((b) => {
      b.onclick = async () => {
        const ok = await window.App.confirmBox('Mark this patient as No Show? They will be removed from today\'s queue.', 'No Show');
        if (!ok) return;
        window.API.post('/api/queue/' + b.dataset.noshow + '/noshow')
          .then(() => { window.App.toast('Marked as No Show', 'gold'); window.App.navigate('doctor'); window.App.refreshBadges(); })
          .catch((e) => window.App.toast(e.message, 'error'));
      };
    });
  }

  function fillDoctorDone(tb, q) {
    const rows = q.filter((a) => a.status === 'Completed');
    if (!rows.length) {
      tb.innerHTML = '<tbody><tr><td colspan="5" class="empty">No consultations completed yet today</td></tr></tbody>';
      return;
    }
    tb.innerHTML =
      '<thead><tr><th>Token</th><th>Patient</th><th>UHID</th><th>Slot</th><th>Slip</th></tr></thead>' +
      '<tbody>' + rows.map((a) =>
        '<tr><td>#' + a.tokenNumber + '</td><td>' + window.App.esc(a.patientName) + '</td>' +
        '<td class="mono small muted">' + window.App.esc(a.uhid || '') + '</td>' +
        '<td>' + window.App.esc(a.timeSlot) + '</td>' +
        '<td><button class="btn btn-outline btn-sm" data-card="' + a.id + '">🧾 Summary</button></td></tr>'
      ).join('') + '</tbody>';
    tb.querySelectorAll('[data-card]').forEach((b) => {
      b.onclick = () => openConsultCard(Number(b.dataset.card));
    });
  }

  /* ── Consultation modal ────────────────────────────────────── */

  function openConsultation(appointmentId) {
    window.App.closeModal();
    window.API.get('/api/queue/today').then((r) => {
      const appt = r.queue.find((a) => a.id === appointmentId);
      if (!appt) { window.App.navigate('doctor'); return; }
      Promise.all([
        window.API.get('/api/patients/' + appt.patientId),
        window.API.get('/api/consultations/history?patientId=' + appt.patientId),
      ]).then(([pRes, hRes]) => {
        buildConsultModal(appt, pRes.patient, hRes);
      }).catch((e) => window.App.toast(e.message, 'error'));
    });
  }

  function buildConsultModal(appt, patient, history) {
    const body = document.createElement('div');
    body.innerHTML =
      '<div style="border:1px solid #BFDBFE;background:#EFF6FF;border-radius:12px;padding:12px;margin-bottom:16px;">' +
      window.App.patientInfoRow(patient) +
      '<div class="small mt8" style="color:#1B3A6B;">Token #' + appt.tokenNumber + ' · ' + window.App.fmtDate(appt.appointmentDate) + ' · ' + window.App.esc(appt.timeSlot) + '</div></div>';

    // History fold
    const hist = [];
    (history.prescriptions || []).slice(0, 3).forEach((rx) => hist.push('📝 ' + window.App.fmtDate(rx.visitDate) + ' — ' + window.App.esc(rx.diagnosis)));
    (history.labOrders || []).slice(0, 3).forEach((o) => hist.push('🧪 ' + window.App.fmtDate(o.orderedDate) + ' — Lab (' + o.testItems.length + ' tests)'));
    (history.radiologyOrders || []).slice(0, 3).forEach((o) => hist.push('📷 ' + window.App.fmtDate(o.orderedDate) + ' — ' + window.App.esc(o.modalityType) + ' ' + window.App.esc(o.bodyPart)));
    if (hist.length) {
      body.innerHTML +=
        '<details style="margin-bottom:16px;"><summary style="cursor:pointer;font-weight:600;color:#1B3A6B;font-size:13px;">📂 Previous Records (' + hist.length + ')</summary>' +
        '<div class="card" style="margin-top:8px;padding:10px 12px;">' + hist.map((x) => '<div style="padding:3px 0;font-size:13px;">' + x + '</div>').join('') + '</div></details>';
    }

    // Reports ready for review (revisit after x-ray/lab)
    const review = buildReportsReview(history);
    if (review) body.appendChild(review);

    // Diagnosis & notes
    body.innerHTML +=
      '<div class="field"><label>Diagnosis <span class="req">*</span></label>' +
      '<input class="input" id="cx-dx" placeholder="e.g. Osteoarthritis — Right Knee" /></div>' +
      '<div class="field"><label>Clinical Notes</label>' +
      '<textarea class="input" id="cx-notes" rows="2" placeholder="Advice, rest, physio…"></textarea></div>';

    // Prescription builder
    body.appendChild(sectionTitle('💊 Prescribe Medicines'));
    const medRows = document.createElement('div');
    body.appendChild(medRows);
    body.appendChild(window.App.el('button', { class: 'btn btn-outline btn-sm', onclick: () => addMedRow(medRows), text: '+ Add Medicine' }));

    // Lab builder
    body.appendChild(sectionTitle('🧪 Lab Tests'));
    const labRows = document.createElement('div');
    body.appendChild(labRows);
    body.appendChild(window.App.el('button', { class: 'btn btn-outline btn-sm', onclick: () => addLabRow(labRows), text: '+ Add Lab Test' }));

    // Radiology builder
    body.appendChild(sectionTitle('📷 Radiology / X-Ray'));
    const radRows = document.createElement('div');
    body.appendChild(radRows);
    body.appendChild(window.App.el('button', { class: 'btn btn-outline btn-sm', onclick: () => addRadRow(radRows), text: '+ Add Scan' }));

    addMedRow(medRows);
    addLabRow(labRows);
    addRadRow(radRows);

    window.App.modal({
      title: 'Consultation — Token #' + appt.tokenNumber,
      wide: true,
      bodyNode: body,
      footer: [
        window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Cancel' }),
        window.App.el('button', { class: 'btn btn-primary btn-lg', id: 'cx-save', text: '✔ Save Consultation & Bill' }),
      ],
    });
    document.getElementById('cx-save').onclick = () => saveConsult(appt, medRows, labRows, radRows);
  }

  function sectionTitle(t) {
    const d = document.createElement('div');
    d.style.cssText = 'font-weight:700;color:#1B3A6B;font-size:13px;margin:18px 0 8px;';
    d.textContent = t;
    return d;
  }

  function buildReportsReview(history) {
    const items = [];
    (history.labOrders || []).forEach((o) => {
      const doneCount = o.testItems.filter((t) => t.status === 'Completed').length;
      if (doneCount) items.push({ kind: 'lab', order: o, label: '🧪 Lab #' + o.id + ' — ' + doneCount + ' result(s)' + (o.status === 'Completed' ? '' : ' (partial)'), sub: window.App.fmtDate(o.orderedDate) });
    });
    (history.radiologyOrders || []).forEach((o) => {
      if (o.status === 'Completed') items.push({ kind: 'rad', order: o, label: '📷 ' + o.modalityType + ' — ' + o.bodyPart, sub: window.App.fmtDate(o.orderedDate) });
    });
    if (!items.length) return null;
    return window.App.el('div', { class: 'card', style: { margin: '14px 0', padding: '10px 12px', background: '#FFFBEB', borderColor: '#FDE68A' } },
      window.App.el('div', { html: '<div style="font-weight:700;color:#92400E;font-size:13px;margin-bottom:6px;">📂 Reports Ready for Review (' + items.length + ')</div>' }),
      items.map((it) => window.App.el('div', { class: 'flex-between', style: { padding: '4px 0' } },
        window.App.el('div', { html: '<b>' + it.label + '</b><div class="small muted">' + it.sub + '</div>' }),
        window.App.el('button', { class: 'btn btn-outline btn-sm', onclick: () => viewReportDetails(it.order, it.kind), text: '👁 View' })
      ))
    );
  }

  function viewReportDetails(order, kind) {
    if (kind === 'lab') {
      const rows = order.testItems.map((t) =>
        '<tr><td>' + window.App.esc(t.testName) + '</td><td class="pr-num">' + window.App.esc(t.result || '—') + '</td>' +
        '<td class="small muted">' + window.App.esc(t.unit || '') + '</td><td class="small muted">' + window.App.esc(t.normalRange || '') + '</td>' +
        '<td>' + (t.isAbnormal ? '<span class="chip chip-danger">⚠ Abnormal</span>' : '<span class="chip chip-success">Normal</span>') + '</td></tr>'
      ).join('');
      window.App.modal({
        title: 'Lab Report — #' + order.id,
        wide: true,
        bodyHtml:
          '<p class="small muted">Ordered: ' + window.App.fmtDate(order.orderedDate) + ' · Status: ' + window.App.esc(order.status) + '</p>' +
          '<div class="divider"></div>' +
          '<table class="data"><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Ref Range</th><th>Flag</th></tr></thead><tbody>' + rows + '</tbody></table>',
        footer: [window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Close' })],
      });
    } else {
      const modalObj = window.App.modal({
        title: '🔬 Medical Viewer & Report — ' + order.modalityType + ' #' + order.id,
        wide: true,
        bodyHtml:
          '<div style="background:#0F172A;color:#fff;border-radius:14px;padding:16px;margin-bottom:14px;">' +
          '<div class="flex-between" style="margin-bottom:12px;">' +
          '<div><b>' + window.App.esc(order.bodyPart) + '</b><div style="font-size:12px;color:#94A3B8;">Ordered: ' + window.App.fmtDate(order.orderedDate) + ' · Modality: ' + window.App.esc(order.modalityType) + '</div></div>' +
          '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-sm btn-outline" id="rad-invert-btn" style="color:#60CFEC;border-color:#0891B2;">🌓 Invert Negative View</button>' +
          '<button class="btn btn-sm btn-gold" id="rad-ai-btn">🤖 AI Fracture & Joint Analysis</button>' +
          '</div></div>' +
          
          '<div style="position:relative;background:#000;border-radius:12px;overflow:hidden;text-align:center;min-height:300px;display:flex;align-items:center;justify-content:center;" id="xray-canvas-box">' +
          '<svg id="xray-img" viewBox="0 0 400 300" style="width:100%;max-height:340px;transition:filter 0.2s;">' +
          '<rect width="400" height="300" fill="#111827"/>' +
          '<!-- Simulated Knee X-Ray -->' +
          '<path d="M 170,30 Q 175,130 150,140 Q 140,145 130,145 L 270,145 Q 260,145 250,140 Q 225,130 230,30 Z" fill="#E2E8F0" opacity="0.85"/>' +
          '<path d="M 160,155 Q 170,160 175,270 L 225,270 Q 230,160 240,155 Z" fill="#CBD5E1" opacity="0.85"/>' +
          '<ellipse cx="200" cy="148" rx="35" ry="6" fill="#000" opacity="0.9"/>' +
          '<text x="200" y="285" fill="#64748B" font-size="12" text-anchor="middle">KUMARAN ROBOTIC ORTHO CARE · RADIOLOGY DICOM</text>' +
          '</svg>' +
          '<div id="ai-overlay-box" style="display:none;position:absolute;inset:0;pointer-events:none;">' +
          '<div style="position:absolute;left:32%;top:42%;width:36%;height:18%;border:2px dashed #EF4444;border-radius:8px;background:rgba(239,68,68,0.15);">' +
          '<span style="background:#EF4444;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;position:absolute;top:-10px;left:4px;">🎯 AI Alert: Joint Space Narrowing (94%)</span></div>' +
          '</div>' +
          '</div>' +

          '<div class="flex-between mt8" style="font-size:12px;color:#94A3B8;">' +
          '<span>Contrast Adjust: <input type="range" id="xray-contrast" min="50" max="200" value="100" style="vertical-align:middle;width:100px;"/></span>' +
          '<span>Zoom: <button class="btn btn-sm btn-ghost" id="zoom-in" style="color:#fff;">➕</button><button class="btn btn-sm btn-ghost" id="zoom-out" style="color:#fff;">➖</button></span>' +
          '</div></div>' +

          '<div class="field"><label>Findings</label><div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;font-size:13px;">' + window.App.esc(order.findings || 'No significant abnormality noted.') + '</div></div>' +
          '<div class="field"><label>Impression</label><div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;font-size:13px;font-weight:700;color:#1B3A6B;">' + window.App.esc(order.impression || 'Normal study.') + '</div></div>',
        footer: [window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Close' })],
      });

      // Attach Invert & AI event listeners
      let inverted = false;
      const svg = document.getElementById('xray-img');
      const contrast = document.getElementById('xray-contrast');
      document.getElementById('rad-invert-btn').onclick = () => {
        inverted = !inverted;
        svg.style.filter = (inverted ? 'invert(100%) ' : '') + 'contrast(' + contrast.value + '%)';
      };
      contrast.oninput = () => {
        svg.style.filter = (inverted ? 'invert(100%) ' : '') + 'contrast(' + contrast.value + '%)';
      };
      let aiOn = false;
      document.getElementById('rad-ai-btn').onclick = () => {
        aiOn = !aiOn;
        document.getElementById('ai-overlay-box').style.display = aiOn ? 'block' : 'none';
        window.App.toast(aiOn ? 'AI Joint Space & Fracture Analysis overlay active' : 'AI Analysis hidden', aiOn ? 'success' : 'gold');
      };
    }
  }

  function addMedRow(container) {
    const row = window.App.el('div', { class: 'row-item' },
      window.App.el('select', { class: 'input med-name' },
        CATALOG.medicines.map((m) => window.App.el('option', { value: m.name, text: m.name + ' (₹' + m.price + ')' }))
      ),
      window.App.el('select', { class: 'input', style: { maxWidth: 130 }, dataset: { cls: 'med-freq' } },
        FREQS.map((f) => window.App.el('option', { value: f, text: f }))
      ),
      window.App.el('select', { class: 'input', style: { maxWidth: 110 }, dataset: { cls: 'med-dur' } },
        DAYS.map((f) => window.App.el('option', { value: f, text: f }))
      ),
      window.App.el('button', { class: 'btn btn-danger btn-sm', text: '✕', onclick: () => row.remove() })
    );
    container.appendChild(row);
  }

  function medRowData(row) {
    return {
      name: row.querySelector('.med-name').value,
      frequency: row.querySelector('select[data-cls="med-freq"]').value,
      duration: row.querySelector('select[data-cls="med-dur"]').value,
    };
  }

  function addLabRow(container) {
    const row = window.App.el('div', { class: 'row-item' },
      window.App.el('select', { class: 'input lab-name' },
        CATALOG.labTests.map((t) => window.App.el('option', { value: t.name, text: t.name + ' (₹' + t.price + ')' }))
      ),
      window.App.el('button', { class: 'btn btn-danger btn-sm', text: '✕', onclick: () => row.remove() })
    );
    container.appendChild(row);
  }

  function addRadRow(container) {
    const row = window.App.el('div', { class: 'row-item' },
      window.App.el('select', { class: 'input rad-mod' },
        CATALOG.radiology.map((r) => window.App.el('option', { value: r.modality, text: r.modality + ' (₹' + r.price + ')' }))
      ),
      window.App.el('input', { class: 'input rad-part', placeholder: 'Body part e.g. Right Knee (AP & Lateral)' }),
      window.App.el('button', { class: 'btn btn-danger btn-sm', text: '✕', onclick: () => row.remove() })
    );
    container.appendChild(row);
  }

  function saveConsult(appt, medRows, labRows, radRows) {
    const diagnosis = document.getElementById('cx-dx').value.trim();
    if (!diagnosis) return window.App.toast('Enter a diagnosis', 'error');
    const notes = document.getElementById('cx-notes').value.trim();
    const medicines = Array.from(medRows.querySelectorAll('.row-item')).map(medRowData);
    const labTests = Array.from(labRows.querySelectorAll('.row-item')).map((r) => ({ name: r.querySelector('.lab-name').value }));
    const radiology = Array.from(radRows.querySelectorAll('.row-item')).map((r) => ({
      modality: r.querySelector('.rad-mod').value,
      bodyPart: r.querySelector('.rad-part').value.trim(),
    }));
    const btn = document.getElementById('cx-save');
    btn.disabled = true; btn.textContent = 'Saving…';
    window.API.post('/api/consultations/' + appt.id, { diagnosis, notes, medicines, labTests, radiology })
      .then((res) => {
        window.App.closeModal();
        window.App.toast('Consultation saved — bill #' + res.billId + ' created', 'success');
        if (res.prescriptionId) window.App.toast('Prescription issued', 'success');
        if (res.labOrderId) window.App.toast('Lab order created', 'success');
        if (res.radiologyOrderId) window.App.toast('Radiology order created', 'success');
        window.App.navigate('doctor');
        window.App.refreshBadges();
        openConsultCard(appt.id);
      })
      .catch((e) => {
        btn.disabled = false; btn.textContent = '✔ Save Consultation & Bill';
        window.App.toast(e.message, 'error');
      });
  }

  function openConsultCard(appointmentId) {
    window.App.closeModal();
    window.API.get('/api/queue/today').then((r) => {
      const appt = r.queue.find((a) => a.id === appointmentId);
      if (!appt) return;
      Promise.all([
        window.API.get('/api/patients/' + appt.patientId),
        window.API.get('/api/consultations/history?patientId=' + appt.patientId),
      ]).then(([pRes, hRes]) => {
        const p = pRes.patient;
        const rxs = (hRes.prescriptions || []).slice().sort((a, b) => b.visitDate.localeCompare(a.visitDate));
        const latestRx = rxs[0];
        window.App.modal({
          title: 'Consultation Summary — ' + p.name,
          wide: true,
          bodyHtml:
            window.App.patientInfoRow(p) +
            '<div class="small muted mt8">👨‍⚕️ ' + window.App.esc(appt.doctorName || 'Doctor') + ' · Token #' + appt.tokenNumber + '</div>' +
            '<div class="divider"></div>' +
            (latestRx
              ? '<p><b>Diagnosis:</b> ' + window.App.esc(latestRx.diagnosis) + '</p>' +
                (latestRx.notes ? '<p class="small muted">' + window.App.esc(latestRx.notes) + '</p>' : '')
              : '<p class="small muted">(No prescription recorded)</p>'),
          footer: [
            window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Close' }),
            window.App.el('button', { class: 'btn btn-gold', onclick: () => { window.App.closeModal(); printConsultSlip(appt, p, rxs); }, text: 'Print Report' }),
          ],
        });
      });
    });
  }

  function printConsultSlip(appt, p, rxs) {
    const latestRx = rxs[0];
    if (!latestRx) return window.App.toast('No prescription to print', 'error');
    const medRows = latestRx.medicines.map((m, i) =>
      '<tr><td>' + (i + 1) + '</td><td>' + window.App.esc(m.medicineName) + '</td><td>' + window.App.esc(m.dosage || '—') +
      '</td><td>' + window.App.esc(m.frequency || '—') + '</td><td>' + window.App.esc(m.duration || '—') +
      '</td><td>' + window.App.esc(m.instructions || '—') + '</td></tr>'
    ).join('');
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const area = document.getElementById('print-area');
    area.innerHTML =
      '<div style="font-family:Segoe UI,Arial,sans-serif;color:#111;max-width:700px;margin:0 auto;padding:20px;">' +
      '<div style="text-align:center;border-bottom:2px solid #1B3A6B;padding-bottom:10px;margin-bottom:14px;">' +
      '<h2 style="margin:0;color:#1B3A6B;">Kumaran Robotic Ortho Care</h2>' +
      '<p style="margin:2px 0;color:#555;font-size:12px;">Dr. P.L. Vijayakumar, MS Ortho — Robotic Joint Replacement Specialist</p>' +
      '<p style="margin:2px 0;color:#888;font-size:11px;">123 Srirangam Main Road, Trichy - 620006 | +91 431 234 5678</p></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:12px;">' +
      '<div><strong>Consultation Report</strong><br/><span style="font-size:12px;color:#555;">Date: ' + today + '</span></div>' +
      (p ? '<div style="text-align:right;font-size:12px;color:#555;">' + window.App.esc(p.name) + '<br/>UHID: ' + window.App.esc(p.uhid) +
        '<br/>' + window.App.esc(p.gender || '') + ', ' + (p.age || '—') + ' yrs</div>' : '') +
      '</div>' +
      '<div style="font-size:13px;margin-bottom:10px;">' +
      '<div><strong>Diagnosis:</strong> ' + window.App.esc(latestRx.diagnosis) + '</div>' +
      (latestRx.notes ? '<div class="small-muted"><strong>Notes:</strong> ' + window.App.esc(latestRx.notes) + '</div>' : '') +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
      '<thead><tr style="background:#1B3A6B;color:#fff;"><th style="padding:7px 10px;text-align:left;">#</th>' +
      '<th style="padding:7px 10px;text-align:left;">Medicine</th><th style="padding:7px 10px;">Dosage</th>' +
      '<th style="padding:7px 10px;">Frequency</th><th style="padding:7px 10px;">Duration</th>' +
      '<th style="padding:7px 10px;text-align:left;">Instructions</th></tr></thead>' +
      '<tbody>' + medRows + '</tbody></table>' +
      '<div style="margin-top:28px;display:flex;justify-content:space-between;font-size:13px;">' +
      '<div>Signature of Doctor</div><div style="text-align:right;">Dr. P.L. Vijayakumar<br/>MS Ortho, MNAMS</div></div>' +
      '<div style="margin-top:18px;text-align:center;font-size:11px;color:#888;border-top:1px solid #ccc;padding-top:8px;">' +
      'Kumaran Robotic Ortho Care — Your Health, Our Mission | உங்கள் ஆரோக்கியமே எங்கள் குறிக்கோள்</div>' +
      '</div>';
    window.print();
  }

  function consultBadge() {
    return window.API.get('/api/queue/today').then((r) => r.queue.filter((a) => a.status === 'Waiting' || a.status === 'Called').length);
  }

  /* ═══════════════════════════ PHARMACY ═══════════════════════════ */

  function pharmacyRender(container) {
    container.innerHTML = window.App.spinnerHtml();
    Promise.all([
      window.API.get('/api/pharmacy/pending'),
      window.API.get('/api/pharmacy/inventory'),
    ]).then(([r, invRes]) => {
      container.innerHTML = '';
      const topRow = window.App.el('div', { class: 'flex-between mb16' },
        window.App.el('div', { html: '<h2 class="page-head">Pharmacy — Inventory & Dispense</h2><p class="page-sub">மருந்துக் கடை · Prescription Dispense + OTC Direct Sales + Inventory Control</p>' }),
        window.App.el('button', { class: 'btn btn-gold btn-lg', onclick: () => openOTCSaleModal(invRes.inventory), text: '+ OTC Direct Sale (Walk-in)' })
      );
      container.appendChild(topRow);

      const pend = r.prescriptions.filter((p) => !p.dispensed);
      const done = r.prescriptions.filter((p) => p.dispensed);

      // Pending Prescriptions
      container.appendChild(window.App.el('div', { class: 'card' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">⏳</span> Prescriptions to Dispense (' + pend.length + ')' }),
        pend.length ? window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="ph-pend"></table>' }) :
          window.App.el('div', { class: 'empty', html: '<div class="empty-ico">✅</div>No prescriptions pending' })
      ));
      fillPharmacyPend(document.getElementById('ph-pend'), pend);

      // Pharmacy Inventory Stock Table
      const invCard = window.App.el('div', { class: 'card mt16' },
        window.App.el('div', { class: 'flex-between' },
          window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">📦</span> Pharmacy Inventory Stock & Expiry Control' }),
          window.App.el('button', { class: 'btn btn-primary btn-sm', onclick: () => openAddMedicineModal(), text: '+ Add New Medicine to Stock' })
        ),
        window.App.el('div', { class: 'table-wrap mt12', html:
          '<table class="data"><thead><tr><th>Medicine</th><th>Batch #</th><th>Expiry Date</th><th>Stock Qty</th><th>Selling Price</th><th>GST %</th></tr></thead><tbody>' +
          invRes.inventory.map((inv) => {
            const lowStock = inv.stockQty < 50;
            return '<tr><td><b>' + window.App.esc(inv.name) + '</b></td><td class="mono small">' + window.App.esc(inv.batchNo) + '</td><td class="small">' + window.App.esc(inv.expiryDate) + '</td>' +
              '<td>' + (lowStock ? '<span class="chip chip-danger">⚠ ' + inv.stockQty + ' left</span>' : '<span class="chip chip-success">' + inv.stockQty + ' in stock</span>') + '</td>' +
              '<td><b>' + window.App.inr(inv.sellingPrice) + '</b></td><td>' + inv.gstPercent + '% GST</td></tr>';
          }).join('') +
          '</tbody></table>'
        })
      );
      container.appendChild(invCard);

      // Dispensed History
      container.appendChild(window.App.el('div', { class: 'card mt16' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">✅</span> Dispensed History (' + done.length + ')' }),
        done.length ? window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="ph-done"></table>' }) :
          window.App.el('div', { class: 'empty', html: '<div class="empty-ico">📭</div>No dispensed prescriptions' })
      ));
      fillPharmacyDone(document.getElementById('ph-done'), done);
    }).catch((e) => container.innerHTML = '<div class="card empty">' + window.App.esc(e.message) + '</div>');
  }

  function openOTCSaleModal(inventory) {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><label>Customer Name</label><input class="input" id="otc-name" placeholder="Walk-in Customer / Patient Name" /></div>
      <div class="field"><label>Mobile Number</label><input class="input" type="tel" id="otc-phone" placeholder="10-digit mobile" maxlength="10" /></div>
      <div class="field"><label>Payment Mode</label><select class="input" id="otc-mode"><option>Cash</option><option>UPI</option><option>Card</option></select></div>
      <div style="font-weight:700;color:#1B3A6B;margin:12px 0 6px;">Medicines</div>
      <div id="otc-rows"></div>
      <button class="btn btn-outline btn-sm mt8" id="add-otc-row">+ Add Medicine Item</button>
    `;

    const otcRows = body.querySelector('#otc-rows');
    const addRow = () => {
      const row = window.App.el('div', { class: 'row-item' },
        window.App.el('select', { class: 'input otc-med' },
          inventory.map((i) => window.App.el('option', { value: i.name, dataset: { price: i.sellingPrice }, text: i.name + ' (₹' + i.sellingPrice + ')' }))
        ),
        window.App.el('input', { class: 'input otc-qty', type: 'number', value: '1', min: '1', style: { maxWidth: 90 } }),
        window.App.el('button', { class: 'btn btn-danger btn-sm', text: '✕', onclick: () => row.remove() })
      );
      otcRows.appendChild(row);
    };
    body.querySelector('#add-otc-row').onclick = addRow;
    addRow();

    window.App.modal({
      title: 'OTC Direct Pharmacy Sale',
      wide: true,
      bodyNode: body,
      footer: [
        window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Cancel' }),
        window.App.el('button', { class: 'btn btn-primary btn-lg', onclick: () => submitOTCSale(inventory), text: '✔ Complete OTC Sale & Print Bill' }),
      ],
    });
  }

  function submitOTCSale(inventory) {
    const patientName = document.getElementById('otc-name').value.trim() || 'Walk-in Customer';
    const phone = document.getElementById('otc-phone').value.trim();
    const paymentMode = document.getElementById('otc-mode').value;

    const items = Array.from(document.querySelectorAll('#modal-root .row-item')).map((row) => {
      const name = row.querySelector('.otc-med').value;
      const inv = inventory.find((x) => x.name === name);
      return {
        medicineName: name,
        price: inv ? inv.sellingPrice : 10,
        quantity: Number(row.querySelector('.otc-qty').value) || 1,
      };
    });

    if (!items.length) return window.App.toast('Add at least one item', 'error');

    window.API.post('/api/pharmacy/otc-sale', { patientName, phone, items, paymentMode })
      .then((res) => {
        window.App.closeModal();
        window.App.toast('OTC Pharmacy Bill #' + res.bill.id + ' generated', 'success');
        window.App.navigate('pharmacy');
        window.App.printBill(res.bill, { name: patientName, uhid: 'OTC-WALKIN' });
      })
      .catch((e) => window.App.toast(e.message, 'error'));
  }

  function openAddMedicineModal() {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><label>Medicine Name <span class="req">*</span></label>
        <input class="input" id="add-med-name" placeholder="e.g. Tab. Paracetamol 650mg" />
      </div>
      <div class="field"><label>Batch Number</label>
        <input class="input" id="add-med-batch" placeholder="e.g. BATCH-2026-10" />
      </div>
      <div class="field"><label>Expiry Date</label>
        <input class="input" type="date" id="add-med-expiry" value="2027-12-31" />
      </div>
      <div class="form-row">
        <div class="field"><label>Initial Stock Qty</label>
          <input class="input" type="number" id="add-med-qty" value="100" min="1" />
        </div>
        <div class="field"><label>Selling Price (₹) <span class="req">*</span></label>
          <input class="input" type="number" id="add-med-price" placeholder="e.g. 15" min="1" />
        </div>
        <div class="field"><label>GST %</label>
          <select class="input" id="add-med-gst">
            <option value="12">12% GST</option>
            <option value="18">18% GST</option>
            <option value="5">5% GST</option>
            <option value="0">0% (Exempted)</option>
          </select>
        </div>
      </div>
    `;

    window.App.modal({
      title: 'Add New Medicine / Restock Inventory',
      bodyNode: body,
      footer: [
        window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Cancel' }),
        window.App.el('button', { class: 'btn btn-primary btn-lg', onclick: () => submitAddMedicine(), text: '✔ Add Medicine to Stock' }),
      ],
    });
  }

  function submitAddMedicine() {
    const name = document.getElementById('add-med-name').value.trim();
    const batchNo = document.getElementById('add-med-batch').value.trim() || 'BATCH-01';
    const expiryDate = document.getElementById('add-med-expiry').value || '2027-12-31';
    const stockQty = Number(document.getElementById('add-med-qty').value) || 100;
    const sellingPrice = Number(document.getElementById('add-med-price').value) || 0;
    const gstPercent = Number(document.getElementById('add-med-gst').value) || 12;

    if (!name) return window.App.toast('Enter medicine name', 'error');
    if (sellingPrice <= 0) return window.App.toast('Enter a valid selling price', 'error');

    window.API.post('/api/pharmacy/inventory', { name, batchNo, expiryDate, stockQty, sellingPrice, gstPercent })
      .then((res) => {
        window.App.closeModal();
        window.App.toast(res.updated ? 'Stock updated for ' + name : name + ' added to inventory', 'success');
        window.App.navigate('pharmacy');
      })
      .catch((e) => window.App.toast(e.message, 'error'));
  }

  function fillPharmacyPend(tb, list) {
    if (!tb) return;
    tb.innerHTML =
      '<thead><tr><th>Rx #</th><th>Patient</th><th>UHID</th><th>Visit Date</th><th>Diagnosis</th><th>Medicines</th><th>Action</th></tr></thead>' +
      '<tbody>' + list.map((rx) => {
        const p = rx.patient || {};
        const total = rx.medicines.reduce((s, m) => s + (CATALOG.medicines.find((c) => c.name === m.medicineName)?.price || 0), 0);
        return '<tr>' +
          '<td>#' + rx.id + '</td>' +
          '<td>' + window.App.esc(p.name || '') + '</td>' +
          '<td class="mono small muted">' + window.App.esc(p.uhid || '') + '</td>' +
          '<td>' + window.App.fmtDate(rx.visitDate) + '</td>' +
          '<td>' + window.App.esc(rx.diagnosis) + '</td>' +
          '<td>' + rx.medicines.length + ' items</td>' +
          '<td><button class="btn btn-gold btn-sm" data-dispense="' + rx.id + '" data-total="' + total + '">💊 Dispense · ' + window.App.inr(total) + '</button></td>' +
          '</tr>';
      }).join('') + '</tbody>';
    tb.querySelectorAll('[data-dispense]').forEach((b) => {
      b.onclick = () => openDispense(Number(b.dataset.dispense), Number(b.dataset.total));
    });
  }

  function fillPharmacyDone(tb, list) {
    if (!tb) return;
    tb.innerHTML =
      '<thead><tr><th>Rx #</th><th>Patient</th><th>UHID</th><th>Visit Date</th><th>Diagnosis</th><th>Medicines</th></tr></thead>' +
      '<tbody>' + list.map((rx) => {
        const p = rx.patient || {};
        return '<tr><td>#' + rx.id + '</td><td>' + window.App.esc(p.name || '') + '</td>' +
          '<td class="mono small muted">' + window.App.esc(p.uhid || '') + '</td>' +
          '<td>' + window.App.fmtDate(rx.visitDate) + '</td>' +
          '<td>' + window.App.esc(rx.diagnosis) + '</td>' +
          '<td>' + rx.medicines.length + ' items · <span class="chip chip-success">Dispensed</span></td></tr>';
      }).join('') + '</tbody>';
  }

  function openDispense(rxId, total) {
    window.API.get('/api/prescriptions/' + rxId).then((r) => {
      const rx = r.prescription;
      const p = rx.patient ? rx.patient : null;
      const items = rx.medicines.map((m) => {
        const price = CATALOG.medicines.find((c) => c.name === m.medicineName)?.price || 0;
        return '<div class="rate-row" style="display:flex;justify-content:space-between;"><span>💊 ' + window.App.esc(m.medicineName) +
          '<div class="small muted">' + window.App.esc(m.dosage) + ' · ' + window.App.esc(m.frequency) + ' · ' + window.App.esc(m.duration) + '</div></span>' +
          '<b>' + window.App.inr(price) + '</b></div>';
      }).join('');
      window.App.modal({
        title: 'Dispense Rx #' + rx.id,
        bodyHtml:
          '<div style="border:1px solid #BFDBFE;background:#EFF6FF;border-radius:12px;padding:10px;margin-bottom:12px;"><b>' + window.App.esc(rx.patient?.name || '') + '</b> · UHID ' + (rx.patient?.uhid || '') + '</div>' +
          '<p class="small muted mb8">' + window.App.esc(rx.diagnosis) + ' · ' + window.App.fmtDate(rx.visitDate) + '</p>' +
          items +
          '<div class="divider"></div>' +
          '<div class="flex-between"><b>Total</b><b style="font-size:18px;color:#1B3A6B;">' + window.App.inr(total) + '</b></div>' +
          '<p class="small muted mt8">Confirming adds the medicine amount to the patient\'s bill.</p>',
        footer: [
          window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Cancel' }),
          window.App.el('button', { class: 'btn btn-primary', onclick: () => doDispense(rx.id, total), text: '✔ Confirm Dispense' }),
        ],
      });
    });
  }

  function doDispense(rxId, total) {
    window.API.post('/api/prescriptions/' + rxId + '/dispense', { amount: total })
      .then(() => {
        window.App.closeModal();
        window.App.toast('Dispensed — amount added to bill', 'success');
        window.App.navigate('pharmacy');
        window.App.refreshBadges();
      })
      .catch((e) => window.App.toast(e.message, 'error'));
  }

  function pharmacyBadge() {
    return window.API.get('/api/pharmacy/pending').then((r) => r.prescriptions.filter((p) => !p.dispensed).length);
  }

  /* ═══════════════════════════ LAB ═══════════════════════════ */

  function labRender(container) {
    container.innerHTML = window.App.spinnerHtml();
    container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Lab — Results Entry' }));
    container.appendChild(window.App.el('p', { class: 'page-sub', text: 'ஆய்வகம் · Orders → Results → Doctor notification' }));
    window.API.get('/api/lab/pending').then((r) => {
      const pending = r.orders.filter((o) => o.status !== 'Completed');
      const done = r.orders.filter((o) => o.status === 'Completed');
      container.innerHTML = '';
      container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Lab — Results Entry' }));
      container.appendChild(window.App.el('p', { class: 'page-sub', text: 'ஆய்வகம் · Orders → Results → Doctor notification' }));
      container.appendChild(window.App.el('div', { class: 'card' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">⏳</span> Pending Orders (' + pending.length + ')' }),
        pending.length ? window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="lab-pend"></table>' }) :
          window.App.el('div', { class: 'empty', html: '<div class="empty-ico">✅</div>No pending lab orders' })
      ));
      container.appendChild(window.App.el('div', { class: 'card mt16' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">📁</span> Completed Results (' + done.length + ')' }),
        done.length ? window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="lab-done"></table>' }) :
          window.App.el('div', { class: 'empty', html: '<div class="empty-ico">📭</div>No results yet' })
      ));
      fillLabPend(document.getElementById('lab-pend'), pending);
      fillLabDone(document.getElementById('lab-done'), done);
    }).catch((e) => container.innerHTML = '<div class="card empty">' + window.App.esc(e.message) + '</div>');
  }

  function fillLabPend(tb, list) {
    if (!tb) return;
    tb.innerHTML =
      '<thead><tr><th>Order</th><th>Patient</th><th>UHID</th><th>Date</th><th>Tests</th><th>Status</th><th>Action</th></tr></thead>' +
      '<tbody>' + list.map((o) => {
        const p = o.patient || {};
        return '<tr><td>#' + o.id + '</td><td>' + window.App.esc(p.name || '') + '</td>' +
          '<td class="mono small muted">' + window.App.esc(p.uhid || '') + '</td>' +
          '<td>' + window.App.fmtDate(o.orderedDate) + '</td>' +
          '<td>' + o.testItems.map((t) => window.App.esc(t.testName)).join(', ') + '</td>' +
          '<td>' + window.App.chip(o.status) + '</td>' +
          '<td><button class="btn btn-primary btn-sm" data-lab="' + o.id + '">🔬 Enter Results</button></td></tr>';
      }).join('') + '</tbody>';
    tb.querySelectorAll('[data-lab]').forEach((b) => {
      b.onclick = () => openLabResults(Number(b.dataset.lab));
    });
  }

  function fillLabDone(tb, list) {
    if (!tb) return;
    tb.innerHTML =
      '<thead><tr><th>Order</th><th>Patient</th><th>UHID</th><th>Date</th><th>Tests</th><th>Result</th></tr></thead>' +
      '<tbody>' + list.map((o) => {
        const p = o.patient || {};
        const abnormal = o.testItems.filter((t) => t.isAbnormal).length;
        return '<tr><td>#' + o.id + '</td><td>' + window.App.esc(p.name || '') + '</td>' +
          '<td class="mono small muted">' + window.App.esc(p.uhid || '') + '</td>' +
          '<td>' + window.App.fmtDate(o.orderedDate) + '</td>' +
          '<td>' + o.testItems.length + ' tests</td>' +
          '<td>' + (abnormal ? '<span class="chip chip-danger">⚠ ' + abnormal + ' abnormal</span>' : '<span class="chip chip-success">Normal</span>') + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function openLabResults(orderId) {
    window.API.get('/api/lab-orders/' + orderId).then((r) => {
      const order = r.order;
      const body = document.createElement('div');
      body.appendChild(window.App.el('div', { html:
        '<div style="border:1px solid #BFDBFE;background:#EFF6FF;border-radius:12px;padding:10px;margin-bottom:12px;"><b>' + window.App.esc(order.patient?.name || '') + '</b> · UHID ' + (order.patient?.uhid || '') + '</div>'
      }));
      const rows = document.createElement('div');
      order.testItems.forEach((t) => {
        rows.appendChild(window.App.el('div', { style: { borderBottom: '1px solid #F1F5F9', padding: '10px 0' } },
          window.App.el('div', { html: '<b>' + window.App.esc(t.testName) + '</b>' }),
          window.App.el('div', { class: 'form-row mt8' },
            window.App.el('div', { class: 'field' }, window.App.el('label', { text: 'Result' }), window.App.el('input', { class: 'input l-res', data: 'r', value: t.result || '', placeholder: 'e.g. 14.2' })),
            window.App.el('div', { class: 'field', style: { maxWidth: 100 } }, window.App.el('label', { text: 'Unit' }), window.App.el('input', { class: 'input l-unit', value: t.unit || '', placeholder: 'g/dL' })),
            window.App.el('div', { class: 'field' }, window.App.el('label', { text: 'Normal Range' }), window.App.el('input', { class: 'input l-normal', value: t.normalRange || '', placeholder: '13.5-17.5' })),
            window.App.el('div', { class: 'field', style: { maxWidth: 130 } },
              window.App.el('label', { text: 'Abnormal?' }),
              window.App.el('select', { class: 'input l-ab', html: '<option value="false">Normal</option><option value="true">Abnormal ⚠</option>' })
            )
          )
        ));
        rows.lastChild.querySelector('.l-ab').value = String(t.isAbnormal || false);
      });
      body.appendChild(rows);
      window.App.modal({
        title: 'Lab Results — Order #' + order.id,
        wide: true,
        bodyNode: body,
        footer: [
          window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Cancel' }),
          window.App.el('button', { class: 'btn btn-primary btn-lg', onclick: () => saveLabResults(order.id, order), text: '✔ Save Results' }),
        ],
      });
    });
  }

  function saveLabResults(orderId, order) {
    const results = [];
    document.querySelectorAll('#modal-root .l-res').forEach((inp, i) => {
      const item = order.testItems[i];
      if (!item) return;
      results.push({
        id: item.id,
        result: inp.value.trim() || null,
        unit: document.querySelectorAll('#modal-root .l-unit')[i].value.trim(),
        normalRange: document.querySelectorAll('#modal-root .l-normal')[i].value.trim(),
        isAbnormal: document.querySelectorAll('#modal-root .l-ab')[i].value === 'true',
      });
    });
    window.API.post('/api/lab-orders/' + orderId + '/results', { results })
      .then(() => {
        window.App.closeModal();
        window.App.toast('Results saved — doctor notified', 'success');
        window.App.navigate('lab');
        window.App.refreshBadges();
      })
      .catch((e) => window.App.toast(e.message, 'error'));
  }

  function labBadge() {
    return window.API.get('/api/lab/pending').then((r) => r.orders.filter((o) => o.status !== 'Completed').length);
  }

  /* ═══════════════════════════ RADIOLOGY ═══════════════════════════ */

  function radiologyRender(container) {
    container.innerHTML = window.App.spinnerHtml();
    container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Radiology — X-Ray & Scans' }));
    container.appendChild(window.App.el('p', { class: 'page-sub', text: 'கதிரியக்கவியல் · Orders → Images → Findings → Report' }));
    window.API.get('/api/radiology/pending').then((r) => {
      const pending = r.orders.filter((o) => o.status !== 'Completed');
      const done = r.orders.filter((o) => o.status === 'Completed');
      container.innerHTML = '';
      container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Radiology — X-Ray & Scans' }));
      container.appendChild(window.App.el('p', { class: 'page-sub', text: 'கதிரியக்கவியல் · Orders → Images → Findings → Report' }));
      container.appendChild(window.App.el('div', { class: 'card' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">⏳</span> Pending Scans (' + pending.length + ')' }),
        pending.length ? window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="rad-pend"></table>' }) :
          window.App.el('div', { class: 'empty', html: '<div class="empty-ico">✅</div>No pending scans' })
      ));
      container.appendChild(window.App.el('div', { class: 'card mt16' },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">📁</span> Completed Reports (' + done.length + ')' }),
        done.length ? window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="rad-done"></table>' }) :
          window.App.el('div', { class: 'empty', html: '<div class="empty-ico">📭</div>No reports yet' })
      ));
      fillRadPend(document.getElementById('rad-pend'), pending);
      fillRadDone(document.getElementById('rad-done'), done);
    }).catch((e) => container.innerHTML = '<div class="card empty">' + window.App.esc(e.message) + '</div>');
  }

  function fillRadPend(tb, list) {
    if (!tb) return;
    tb.innerHTML =
      '<thead><tr><th>Order</th><th>Patient</th><th>UHID</th><th>Modality</th><th>Body Part</th><th>Date</th><th>Action</th></tr></thead>' +
      '<tbody>' + list.map((o) => {
        const p = o.patient || {};
        return '<tr><td>#' + o.id + '</td><td>' + window.App.esc(p.name || '') + '</td>' +
          '<td class="mono small muted">' + window.App.esc(p.uhid || '') + '</td>' +
          '<td>' + window.App.esc(o.modalityType) + '</td>' +
          '<td>' + window.App.esc(o.bodyPart) + '</td>' +
          '<td>' + window.App.fmtDate(o.orderedDate) + '</td>' +
          '<td><button class="btn btn-primary btn-sm" data-rad="' + o.id + '">📝 Enter Report</button></td></tr>';
      }).join('') + '</tbody>';
    tb.querySelectorAll('[data-rad]').forEach((b) => {
      b.onclick = () => openRadReport(Number(b.dataset.rad));
    });
  }

  function fillRadDone(tb, list) {
    if (!tb) return;
    tb.innerHTML =
      '<thead><tr><th>Order</th><th>Patient</th><th>UHID</th><th>Modality</th><th>Body Part</th><th>Impression</th></tr></thead>' +
      '<tbody>' + list.map((o) => {
        const p = o.patient || {};
        return '<tr><td>#' + o.id + '</td><td>' + window.App.esc(p.name || '') + '</td>' +
          '<td class="mono small muted">' + window.App.esc(p.uhid || '') + '</td>' +
          '<td>' + window.App.esc(o.modalityType) + '</td>' +
          '<td>' + window.App.esc(o.bodyPart) + '</td>' +
          '<td class="small">' + window.App.esc(o.impression || o.findings || '—') + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function openRadReport(orderId) {
    window.API.get('/api/radiology-orders/' + orderId).then((r) => {
      const o = r.order;
      const body = document.createElement('div');
      body.appendChild(window.App.el('div', { html:
        '<div style="border:1px solid #BFDBFE;background:#EFF6FF;border-radius:12px;padding:10px;margin-bottom:12px;"><b>' + window.App.esc(o.patient?.name || '') + '</b> · UHID ' + (o.patient?.uhid || '') +
        '<div class="small">' + window.App.esc(o.modalityType) + ' — ' + window.App.esc(o.bodyPart) + '</div></div>'
      }));
      body.appendChild(window.App.el('div', { class: 'field' },
        window.App.el('label', { text: 'Findings' }),
        window.App.el('textarea', { class: 'input rad-find', rows: '4', placeholder: 'Describe radiological findings…', text: o.findings || '' })
      ));
      body.appendChild(window.App.el('div', { class: 'field' },
        window.App.el('label', { text: 'Impression' }),
        window.App.el('textarea', { class: 'input rad-imp', rows: '2', placeholder: 'e.g. Grade II Osteoarthritis of right knee', text: o.impression || '' })
      ));
      window.App.modal({
        title: 'Radiology Report — #' + o.id,
        wide: true,
        bodyNode: body,
        footer: [
          window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Cancel' }),
          window.App.el('button', { class: 'btn btn-primary btn-lg', onclick: () => saveRadReport(o.id), text: '✔ Finalize Report' }),
        ],
      });
    });
  }

  function saveRadReport(orderId) {
    const findings = document.querySelector('#modal-root .rad-find').value.trim();
    const impression = document.querySelector('#modal-root .rad-imp').value.trim();
    if (!findings && !impression) return window.App.toast('Enter findings or impression', 'error');
    window.API.patch('/api/radiology-orders/' + orderId, { findings, impression })
      .then(() => {
        window.App.closeModal();
        window.App.toast('Report finalized — doctor notified', 'success');
        window.App.navigate('radiology');
        window.App.refreshBadges();
      })
      .catch((e) => window.App.toast(e.message, 'error'));
  }

  function radiologyBadge() {
    return window.API.get('/api/radiology/pending').then((r) => r.orders.filter((o) => o.status !== 'Completed').length);
  }

  /* ═══════════════════════════ BILLING ═══════════════════════════ */

  function billingRender(container) {
    container.innerHTML = window.App.spinnerHtml();
    container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Billing & Payments' }));
    container.appendChild(window.App.el('p', { class: 'page-sub', text: 'பில்லிங் · Consultation + Medicine + Lab → Single bill → PDF' }));
    window.API.get('/api/billing/all').then((r) => {
      container.innerHTML = '';
      container.appendChild(window.App.el('h2', { class: 'page-head', text: 'Billing & Payments' }));
      container.appendChild(window.App.el('p', { class: 'page-sub', text: 'பில்லிங் · Consultation + Medicine + Lab → Single bill → PDF' }));
      const bills = r.bills;
      const filterBar = document.createElement('div');
      filterBar.className = 'tabs';
      ['All', 'Today', 'Unpaid', 'Paid'].forEach((f, i) => {
        const t = document.createElement('button');
        t.className = 'tab' + (i === 0 ? ' active' : '');
        t.textContent = f;
        t.onclick = () => {
          filterBar.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
          t.classList.add('active');
          fillBills(document.getElementById('bill-table'), bills, f);
        };
        filterBar.appendChild(t);
      });
      container.appendChild(filterBar);
      container.appendChild(window.App.el('div', { class: 'card' },
        window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="bill-table"></table>' })
      ));
      fillBills(document.getElementById('bill-table'), bills, 'All');

      const revenue = bills.reduce((s, b) => s + b.paidAmount, 0);
      const due = bills.filter((b) => b.paymentStatus !== 'Paid').reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0);
      container.appendChild(window.App.el('div', { class: 'grid grid-3 mt16' },
        window.App.el('div', { class: 'card stat-card' }, window.App.el('div', { html: '<div class="stat-value">' + window.App.inr(revenue) + '</div><div class="stat-label">Total Collected</div>' })),
        window.App.el('div', { class: 'card stat-card' }, window.App.el('div', { html: '<div class="stat-value" style="color:#DC2626;">' + window.App.inr(due) + '</div><div class="stat-label">Outstanding</div>' })),
        window.App.el('div', { class: 'card stat-card' }, window.App.el('div', { html: '<div class="stat-value">' + bills.length + '</div><div class="stat-label">Total Bills</div>' }))
      ));
    }).catch((e) => container.innerHTML = '<div class="card empty">' + window.App.esc(e.message) + '</div>');
  }

  function fillBills(tb, bills, filter) {
    const todayStr = new Date().toISOString().slice(0, 10);
    let list = bills.slice();
    if (filter === 'Today') list = list.filter((b) => b.today);
    if (filter === 'Unpaid') list = list.filter((b) => b.paymentStatus !== 'Paid');
    if (filter === 'Paid') list = list.filter((b) => b.paymentStatus === 'Paid');
    if (!list.length) {
      tb.innerHTML = '<tbody><tr><td colspan="7" class="empty">No bills found</td></tr></tbody>';
      return;
    }
    tb.innerHTML =
      '<thead><tr><th>Bill</th><th>Date</th><th>Patient</th><th>UHID</th><th>Items</th><th>Total</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>' +
      '<tbody>' + list.map((b) => {
        const due = b.totalAmount - b.paidAmount;
        return '<tr>' +
          '<td><b>#' + b.id + '</b></td>' +
          '<td>' + window.App.fmtDate(b.billDate) + (b.today ? ' <span class="chip chip-gold small" style="background:#FEF3C7;color:#92400E;">today</span>' : '') + '</td>' +
          '<td>' + window.App.esc(b.patient?.name || '—') + '</td>' +
          '<td class="mono small muted">' + window.App.esc(b.patient?.uhid || '') + '</td>' +
          '<td>' + b.billItems.length + '</td>' +
          '<td><b>' + window.App.inr(b.totalAmount) + '</b></td>' +
          '<td>' + (due > 0 ? '<span style="color:#DC2626;font-weight:700;">' + window.App.inr(due) + '</span>' : '<span class="muted-2">—</span>') + '</td>' +
          '<td>' + window.App.chip(b.paymentStatus) + '</td>' +
          '<td><div class="actions">' +
          '<button class="btn btn-outline btn-sm" data-view="' + b.id + '">👁 View</button>' +
          '<button class="btn btn-gold btn-sm" data-print="' + b.id + '">🖨 PDF</button>' +
          (due > 0 ? '<button class="btn btn-primary btn-sm" data-pay="' + b.id + '">💰 Pay</button>' : '') +
          '</div></td></tr>';
      }).join('') + '</tbody>';
    tb.querySelectorAll('[data-view]').forEach((x) => x.onclick = () => viewBill(Number(x.dataset.view), list));
    tb.querySelectorAll('[data-print]').forEach((x) => x.onclick = () => printBillById(Number(x.dataset.print)));
    tb.querySelectorAll('[data-pay]').forEach((x) => x.onclick = () => payBill(Number(x.dataset.pay)));
  }

  function printBillById(id) {
    window.API.get('/api/bills/' + id).then((r) => {
      window.App.printBill(r.bill, r.bill.patient || null);
    });
  }

  function viewBill(id, all) {
    Promise.all([window.API.get('/api/bills/' + id)]).then(([r]) => {
      const b = r.bill;
      const p = b.patient ? b.patient : (all.find((x) => x.id === id)?.patient || null);
      const items = b.billItems.map((it) =>
        '<tr><td>' + window.App.esc(it.description) + '</td><td>' + window.App.esc(it.category) + '</td><td>' + it.quantity + '</td><td>' + window.App.inr(it.amount * it.quantity) + '</td></tr>'
      ).join('');
      window.App.modal({
        title: 'Bill #' + b.id + (p ? ' — ' + p.name : ''),
        wide: true,
        bodyHtml:
          window.App.patientInfoRow(p) +
          '<div class="divider"></div>' +
          '<table class="data"><thead><tr><th>Description</th><th>Category</th><th>Qty</th><th>Amount</th></tr></thead><tbody>' + items + '</tbody></table>' +
          '<div class="flex-between mt12"><b>Total</b><b style="font-size:16px;">' + window.App.inr(b.totalAmount) + '</b></div>' +
          '<div class="flex-between"><b>Paid</b><b style="color:#16A34A;">' + window.App.inr(b.paidAmount) + '</b></div>' +
          (b.totalAmount - b.paidAmount > 0
            ? '<div class="flex-between"><b>Due</b><b style="color:#DC2626;">' + window.App.inr(b.totalAmount - b.paidAmount) + '</b></div>'
            : '') +
          '<div class="mt8">' + window.App.chip(b.paymentStatus) + (b.paymentMode ? ' <span class="small muted">via ' + window.App.esc(b.paymentMode) + '</span>' : '') + '</div>',
        footer: [
          window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Close' }),
          window.App.el('button', { class: 'btn btn-gold', onclick: () => { window.App.closeModal(); window.App.printBill(b, p); }, text: '🖨 Print / PDF' }),
          (b.totalAmount - b.paidAmount > 0)
            ? window.App.el('button', { class: 'btn btn-primary', onclick: () => { window.App.closeModal(); payBill(b.id); }, text: '💰 Add Payment' })
            : null,
        ].filter(Boolean),
      });
    });
  }

  function payBill(id) {
    window.API.get('/api/bills/' + id).then((r) => {
      const b = r.bill;
      const due = b.totalAmount - b.paidAmount;
      const body = document.createElement('div');
      body.innerHTML =
        '<p class="small muted">Due: <b style="color:#DC2626;">' + window.App.inr(due) + '</b></p>' +
        '<div class="field"><label>Amount</label><input class="input pay-amt" type="number" value="' + due + '" min="0" max="' + due + '" /></div>' +
        '<div class="field"><label>Payment Mode</label><select class="input pay-mode">' +
        ['Cash', 'UPI', 'Card', 'Insurance'].map((m) => '<option>' + m + '</option>').join('') + '</select></div>';
      window.App.modal({
        title: 'Record Payment — Bill #' + b.id,
        bodyNode: body,
        footer: [
          window.App.el('button', { class: 'btn btn-outline', onclick: () => window.App.closeModal(), text: 'Cancel' }),
          window.App.el('button', { class: 'btn btn-primary btn-lg', onclick: () => recordPayment(b.id, due), text: '✔ Record Payment' }),
        ],
      });
    });
  }

  function recordPayment(billId, due) {
    const amt = Number(document.querySelector('#modal-root .pay-amt').value) || 0;
    const mode = document.querySelector('#modal-root .pay-mode').value;
    if (amt <= 0) return window.App.toast('Enter a valid amount', 'error');
    window.API.post('/api/bills/' + billId + '/payment', { amount: amt, mode })
      .then(() => {
        window.App.closeModal();
        window.App.toast('Payment recorded', 'success');
        window.App.navigate('billing');
        window.App.refreshBadges();
      })
      .catch((e) => window.App.toast(e.message, 'error'));
  }

  function billingBadge() {
    return window.API.get('/api/billing/all').then((r) => r.bills.filter((b) => b.paymentStatus !== 'Paid').length);
  }

  window.App.registerView({
    key: 'doctor', label: 'Doctor Queue', labelTa: 'மருத்துவர்', render: doctorRender, badge: consultBadge, reload: doctorRender,
  });
  window.App.registerView({
    key: 'pharmacy', label: 'Pharmacy', labelTa: 'மருந்தகம்', render: pharmacyRender, badge: pharmacyBadge, reload: pharmacyRender,
  });
  window.App.registerView({
    key: 'lab', label: 'Lab', labelTa: 'ஆய்வகம்', render: labRender, badge: labBadge, reload: labRender,
  });
  window.App.registerView({
    key: 'radiology', label: 'Radiology', labelTa: 'கதிரியக்கவியல்', render: radiologyRender, badge: radiologyBadge, reload: radiologyRender,
  });
  window.App.registerView({
    key: 'billing', label: 'Billing', labelTa: 'பில்கள்', render: billingRender, badge: billingBadge, reload: billingRender,
  });
})();