/* Kumaran Ortho Care — Dashboard view */
(function () {
  function render(container) {
    container.innerHTML = window.App.spinnerHtml();
    window.API.get('/api/dashboard/stats').then((data) => {
      renderDashboard(container, data);
      window.App.refreshBadges();
    }).catch((err) => {
      container.innerHTML = '<div class="card empty"><div class="empty-ico">⚠️</div>Failed to load dashboard<br/><span class="small muted">' + window.App.esc(err.message) + '</span></div>';
    });
  }

  function statCard(icon, label, value, sub, color, bg) {
    const c = document.createElement('div');
    c.className = 'card stat-card';
    c.innerHTML =
      '<div class="stat-ico" style="background:' + bg + ';color:' + color + ';">' + icon + '</div>' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="stat-label">' + window.App.esc(label) + '</div>' +
      (sub ? '<div class="stat-sub">' + window.App.esc(sub) + '</div>' : '');
    return c;
  }

  function renderDashboard(container, d) {
    const t = d.today;
    container.innerHTML = '';

    // Queue banner
    const banner = window.App.el('div', { class: 'queue-banner pulse' },
      window.App.el('div', { html: '<div class="small" style="color:#0369A1;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Now Calling · இப்போது அழைப்பு</div>' +
        '<div class="qb-token">#' + (t.currentToken || 0) + '</div>' }),
      window.App.el('div', { style: { flex: 1 } },
        window.App.el('div', { html: t.waiting + ' waiting · ' + t.called + ' called · ' + t.completed + ' completed today' }),
        window.App.el('div', { class: 'small muted' }, 'Waiting patients: ' + t.waiting)
      ),
      window.App.el('button', {
        class: 'btn btn-gold btn-sm',
        onclick: () => window.App.navigate('doctor'),
        text: 'Open Doctor Queue →',
      })
    );

    // Stats
    const stats = window.App.el('div', { class: 'grid grid-4' },
      statCard('🩺', "Today's Visits", t.registrations, 'Registrations · OPD', '#1B3A6B', '#EFF6FF'),
      statCard('⏳', 'Waiting', t.waiting, 'In queue', '#D97706', '#FFF7ED'),
      statCard('✅', 'Seen Today', t.completed, 'Completed consults', '#16A34A', '#F0FDF4'),
      statCard('💰', "Today's Revenue", window.App.inr(t.revenue), 'Collected today', '#0891B2', '#F0F9FF'),
    );

    // Pending
    const pending = window.App.el('div', { class: 'grid grid-4' },
      statCard('💊', 'Pharmacy Pending', d.pending.pharmacy, 'Rx to dispense', '#D97706', '#FFF7ED'),
      statCard('🧪', 'Lab Pending', d.pending.lab, 'Orders in progress', '#7C3AED', '#EDE9FE'),
      statCard('📷', 'Radiology Pending', d.pending.radiology, 'Scans pending', '#0891B2', '#F0F9FF'),
      statCard('🧾', 'Due Bills', d.pending.bills, 'Unpaid / partial', '#DC2626', '#FEF2F2'),
    );

    // Weekly chart
    const chartCard = window.App.el('div', { class: 'card' },
      window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">📈</span> Revenue — last 7 days' }),
      window.App.el('div', { class: 'bars' },
        d.weekly.map((w) => {
          const max = Math.max(1, ...d.weekly.map((x) => x.revenue));
          const h = Math.max(5, Math.round((w.revenue / max) * 100));
          const label = new Date(w.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
          return window.App.el('div', { class: 'bar-col' },
            window.App.el('div', { class: 'bar-val', text: window.App.inr(w.revenue) }),
            window.App.el('div', {
              class: 'bar' + (w.date === new Date().toISOString().slice(0, 10) ? ' bar-gold' : ''),
              style: { height: h + '%' },
            }),
            window.App.el('div', { class: 'bar-label', text: label })
          );
        })
      )
    );

    const left = window.App.el('div', { style: { flex: 1 } }, banner, stats, pending, chartCard);

    container.appendChild(window.App.el('div', { class: 'flex' },
      left,
      window.App.el('div', { class: 'card', style: { width: 340 } },
        window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">ℹ️</span> At a Glance' }),
        window.App.el('div', { html:
          '<div class="list-row">🕘 <b>OPD Hours</b> <span class="muted" style="margin-left:auto;">Mon–Sat 9AM–6PM</span></div>' +
          '<div class="list-row">🛌 <b>Sunday</b> <span class="muted" style="margin-left:auto;">10AM–1PM</span></div>' +
          '<div class="list-row">🚨 <b>Emergency</b> <span class="muted" style="margin-left:auto;">24×7</span></div>' +
          '<div class="list-row">👨‍⚕️ <b>Doctor</b> <span class="muted" style="margin-left:auto;">Dr. P.L. Vijayakumar</span></div>' +
          '<div class="list-row">🏥 <b>Spec</b> <span class="muted" style="margin-left:auto;">Robotic Joint Replacement</span></div>'
        })
      )
    ));

    container.appendChild(window.App.el('div', { class: 'card mt16' },
      window.App.el('div', { class: 'card-title', html: '<span class="card-title-ico">👥</span> Today\'s Queue Details' }),
      window.App.el('div', { class: 'table-wrap', html: '<table class="data" id="dash-queue"></table>' })
    ));
    window.API.get('/api/queue/today').then((res) => {
      const tb = document.getElementById('dash-queue');
      if (!tb) return;
      tb.innerHTML =
        '<thead><tr><th>Token</th><th>Patient</th><th>UHID</th><th>Slot</th><th>Status</th></tr></thead>' +
        '<tbody>' + res.queue.map((a) => {
          return '<tr><td><b>#' + a.tokenNumber + '</b></td><td>' +
            window.App.esc(a.patientName) + '</td><td class="mono small">' +
            window.App.esc(a.uhid || '') + '</td><td>' + window.App.esc(a.timeSlot) +
            '</td><td>' + window.App.chip(a.status) + '</td></tr>';
        }).join('') + '</tbody>';
    }).catch(() => {});
  }

  window.App.registerView({
    key: 'dashboard',
    label: 'Dashboard',
    labelTa: 'முகப்பு',
    render,
  });
})();