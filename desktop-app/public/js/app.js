/* Kumaran Ortho Care — App shell & shared helpers */
(function () {
  const NAV_ICONS = {
    dashboard: '📊',
    registration: '🩺',
    doctor: '👨‍⚕️',
    pharmacy: '💊',
    lab: '🧪',
    radiology: '📷',
    billing: '💰',
    finance: '📉',
    staff: '👥',
  };

  const views = {};
  let activeView = null;

  function registerView(view) {
    views[view.key] = view;
  }

  function navigate(key) {
    if (!views[key]) return;
    activeView = key;
    const v = views[key];
    document.getElementById('page-title').textContent = v.label;
    document.getElementById('page-sub').textContent = v.labelTa;
    renderNav();
    const hint = document.getElementById('loadingHint');
    if (hint) hint.textContent = 'Loading…';
    const container = document.getElementById('contentView');
    container.innerHTML = '<div class="loading-hint"><div class="spinner"></div>Loading…</div>';
    closeDrawer();
    v.render(container);
    container.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  let currentStaff = JSON.parse(localStorage.getItem('koc_staff_user') || 'null');

  function renderNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    const allowed = currentStaff ? (currentStaff.views || []) : Object.keys(views);
    Object.keys(views).forEach((key) => {
      if (currentStaff && !allowed.includes(key)) return; // filter by role
      const v = views[key];
      const item = document.createElement('div');
      item.className = 'nav-item' + (activeView === key ? ' active' : '');
      item.innerHTML =
        '<span class="nav-ico">' + NAV_ICONS[key] + '</span>' +
        '<span>' + window.App.esc(v.label) + '</span>' +
        '<span class="nav-badge" data-badge="' + key + '" hidden></span>';
      item.onclick = () => navigate(key);
      nav.appendChild(item);
    });
  }

  async function refreshBadges() {
    for (const key of Object.keys(views)) {
      const v = views[key];
      if (!v.badge) continue;
      const badge = document.querySelector('[data-badge="' + key + '"]');
      if (!badge) continue;
      try {
        const count = await v.badge();
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : String(count);
          badge.hidden = false;
        } else {
          badge.hidden = true;
        }
      } catch (e) {
        badge.hidden = true;
      }
    }
  }

  /* ── DOM helpers ─────────────────────────────────────── */

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'onclick') node.onclick = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2), attrs[k]);
        } else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(node.style, attrs[k]);
        } else if (k === 'dataset') {
          Object.assign(node.dataset, attrs[k]);
        } else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) {
          node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
        }
      }
    }
    children.flat().forEach((c) => {
      if (c == null) return;
      if (c.nodeType) node.appendChild(c);
      else node.appendChild(document.createTextNode(String(c)));
    });
    return node;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function todayLabel() {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  function inr(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function chipMap(status) {
    const map = {
      Waiting: 'chip-warning', Scheduled: 'chip-info', Called: 'chip-purple',
      Completed: 'chip-success', Cancelled: 'chip-danger', 'No Show': 'chip-neutral',
      Pending: 'chip-warning', Processing: 'chip-info', Collected: 'chip-info',
      Paid: 'chip-success', Partial: 'chip-warning', Unpaid: 'chip-danger',
      Dispensed: 'chip-success', True: 'chip-success',
    };
    return map[status] || 'chip-neutral';
  }

  function chip(status) {
    return '<span class="chip ' + chipMap(status) + '">' + esc(status) + '</span>';
  }

  function avatar(name) {
    const initials = String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return '<div class="list-avatar">' + esc(initials) + '</div>';
  }

  function spinnerHtml() {
    return '<div class="loading-hint"><div class="spinner"></div>Loading…</div>';
  }

  function patientInfoRow(p) {
    if (!p) return '';
    const gender = p.gender || '—';
    const age = p.age ? p.age + ' yrs' : '—';
    return (
      '<div class="flex" style="gap:12px;">' + avatar(p.name) +
      '<div><div style="font-weight:700;font-size:14px;">' + esc(p.name) + '</div>' +
      '<div class="small muted">UHID ' + esc(p.uhid) + ' &nbsp;·&nbsp; ' + esc(gender) + ', ' + esc(age) +
      '<span style="margin-left:8px;background:#EFF6FF;color:#1B3A6B;padding:1px 8px;border-radius:10px;font-weight:600;">' +
      esc(p.bloodGroup || '—') + '</span></div></div></div>'
    );
  }

  /* ── Modal / Toast ───────────────────────────────────── */

  function modal(opts) {
    const root = document.getElementById('modal-root');
    root.innerHTML = '';
    const backdrop = el('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === backdrop && opts.sticky) return; if (e.target === backdrop) closeModal(); } });
    const m = el('div', { class: 'modal' + (opts.wide ? ' wide' : '') });
    const head = el('div', { class: 'modal-head' },
      el('h3', { text: opts.title }),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => closeModal(), text: '✕' })
    );
    const body = el('div', { class: 'modal-body' });
    if (opts.bodyNode) body.appendChild(opts.bodyNode);
    if (opts.bodyHtml) body.innerHTML = opts.bodyHtml;
    m.appendChild(head);
    m.appendChild(body);
    if (opts.footer) {
      m.appendChild(el('div', { class: 'modal-foot' }, opts.footer));
    }
    backdrop.appendChild(m);
    root.appendChild(backdrop);
    return { backdrop, body };
  }

  function closeModal() {
    const root = document.getElementById('modal-root');
    root.innerHTML = '';
  }

  function toast(msg, type) {
    const root = document.getElementById('toast-root');
    const t = el('div', { class: 'toast' + (type ? ' toast-' + type : ''), text: msg });
    root.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s';
      setTimeout(() => t.remove(), 320);
    }, 2600);
  }

  function confirmBox(msg, title) {
    return new Promise((resolve) => {
      let btnYes;
      const bodyNode = el('div', { html: '<p style="font-size:14px;">' + esc(msg) + '</p>' });
      const footer = [
        el('button', { class: 'btn btn-outline', onclick: () => { closeModal(); resolve(false); }, text: 'Cancel' }),
        (btnYes = el('button', { class: 'btn btn-danger', onclick: () => { closeModal(); resolve(true); }, text: 'Yes, continue' })),
      ];
      modal({ title: title || 'Confirm', bodyNode, footer });
    });
  }

  /* ── Print bill ─────────────────────────────────────── */

  function printBill(bill, patient) {
    const area = document.getElementById('print-area');
    const items = bill.billItems.map((it) =>
      '<tr><td>' + esc(it.description) + '</td><td class="pr-cat">' + esc(it.category) +
      '</td><td class="pr-num">' + it.quantity + '</td><td class="pr-num">' + inr(it.amount * it.quantity) + '</td></tr>'
    ).join('');
    const dueRow = bill.paymentStatus === 'Paid'
      ? '<div class="pr-paid">PAID — ' + esc(bill.paymentMode || '') + '</div>'
      : '<div class="pr-due">Balance Due: ' + inr(bill.totalAmount - bill.paidAmount) + '</div>';
    area.innerHTML =
      '<div style="font-family:Segoe UI,Arial,sans-serif;color:#111;max-width:720px;margin:0 auto;padding:20px;">' +
      '<div style="text-align:center;border-bottom:2px solid #1B3A6B;padding-bottom:10px;margin-bottom:14px;">' +
      '<img src="/assets/logo.png" style="max-width:380px;height:auto;margin-bottom:6px;" alt="Kumaran Ortho Robotic Centre"/><br/>' +
      '<p style="margin:2px 0;color:#1B3A6B;font-size:12px;font-weight:700;">Technology • Precision • Better Mobility</p>' +
      '<p style="margin:2px 0;color:#64748B;font-size:11px;">123 Srirangam Main Road, Trichy - 620006 | Ph: +91 431 234 5678</p></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:12px;">' +
      '<div><strong>Bill #' + bill.id + '</strong><br/><span style="font-size:12px;color:#555;">Date: ' + fmtDate(bill.billDate) + '</span></div>' +
      (patient ? '<div style="text-align:right;font-size:12px;color:#555;">' + esc(patient.name) + '<br/>UHID: ' + esc(patient.uhid) + '</div>' : '') +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
      '<thead><tr style="background:#1B3A6B;color:#fff;"><th style="padding:7px 10px;text-align:left;">Description</th>' +
      '<th style="padding:7px 10px;">Category</th><th style="padding:7px 10px;">Qty</th><th style="padding:7px 10px;text-align:right;">Amount</th></tr></thead>' +
      '<tbody>' + items + '</tbody></table>' +
      '<div style="margin-top:12px;text-align:right;font-size:15px;font-weight:700;">Total: ' + inr(bill.totalAmount) + '</div>' +
      '<div style="text-align:right;font-size:13px;color:#16A34A;font-weight:600;">Paid: ' + inr(bill.paidAmount) + '</div>' +
      '<div style="text-align:right;font-size:13px;font-weight:700;color:#DC2626;">' + dueRow + '</div>' +
      '<div style="margin-top:24px;text-align:center;font-size:11px;color:#888;border-top:1px solid #ccc;padding-top:8px;">' +
      'Kumaran Robotic Ortho Care — Your Health, Our Mission | உங்கள் ஆரோக்கியமே எங்கள் குறிக்கோள்</div>' +
      '</div>';
    window.print();
  }

  /* ── Clock etc ───────────────────────────────────────── */

  function startClock() {
    const clock = document.getElementById('clock');
    const update = () => {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    update();
    setInterval(update, 1000);
  }

  function setBadgeCount(key, count) {
    const badge = document.querySelector('[data-badge="' + key + '"]');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 99 ? '99+' : String(count); badge.hidden = false; }
    else badge.hidden = true;
  }

  function closeDrawer() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
  }

  function checkStaffAuth() {
    if (!currentStaff) {
      showStaffLogin();
    } else {
      updateStaffBadgeUI();
    }
  }

  function showStaffLogin() {
    const body = document.createElement('div');
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <h3 style="margin:0;color:#1B3A6B;font-size:18px;">Kumaran Ortho Care — Staff Login</h3>
        <p style="margin:4px 0;color:#64748B;font-size:12px;">Select your role or enter staff credentials</p>
      </div>

      <div class="field">
        <label>Quick Role Selection / வேகத் தேர்வு</label>
        <select class="input" id="staff-role-quick" onchange="fillQuickRole(this.value)">
          <option value="admin">👨‍⚕️ Admin / Chief Doctor (Full Access)</option>
          <option value="doctor">🩺 Doctor (Consultation & AI Viewer)</option>
          <option value="reception">📋 Receptionist (OP Registration & Tokens)</option>
          <option value="pharmacy">💊 Pharmacist (Inventory & Billing)</option>
          <option value="lab">🧪 Lab Technician (Test Results)</option>
          <option value="radiology">📷 Radiologist (X-Ray & Scans)</option>
        </select>
      </div>

      <div class="field">
        <label>Username</label>
        <input class="input" id="staff-user" value="admin" />
      </div>

      <div class="field">
        <label>Password</label>
        <input class="input" type="password" id="staff-pass" value="admin123" />
      </div>

      <div style="padding:10px;background:#EFF6FF;border-radius:10px;font-size:11px;color:#1E40AF;margin-top:10px;">
        🔑 <b>Default Credentials:</b><br/>
        • Admin: <code>admin</code> / <code>admin123</code><br/>
        • Doctor: <code>doctor</code> / <code>doctor123</code><br/>
        • Reception: <code>reception</code> / <code>reception123</code><br/>
        • Pharmacy: <code>pharmacy</code> / <code>pharmacy123</code>
      </div>
    `;

    modal({
      title: 'Hospital Staff Login',
      sticky: true,
      bodyNode: body,
      footer: [
        el('button', { class: 'btn btn-primary btn-lg', style: { width: '100%' }, onclick: () => doStaffLogin(), text: '🔐 Login to HMS' }),
      ],
    });

    window.fillQuickRole = function (role) {
      document.getElementById('staff-user').value = role;
      document.getElementById('staff-pass').value = role + '123';
    };
  }

  async function doStaffLogin() {
    const username = document.getElementById('staff-user').value.trim();
    const password = document.getElementById('staff-pass').value;

    try {
      const res = await window.API.post('/api/auth/login', { username, password });
      currentStaff = res.user;
      localStorage.setItem('koc_staff_user', JSON.stringify(res.user));
      localStorage.setItem('koc_staff_token', res.token);
      closeModal();
      toast('Welcome ' + res.user.name + ' (' + res.user.role + ')', 'success');
      updateStaffBadgeUI();
      renderNav();
      navigate(res.user.views[0] || 'dashboard');
    } catch (err) {
      toast(err.message || 'Login failed', 'error');
    }
  }

  function logoutStaff() {
    localStorage.removeItem('koc_staff_user');
    localStorage.removeItem('koc_staff_token');
    currentStaff = null;
    toast('Logged out successfully', 'gold');
    showStaffLogin();
  }

  function updateStaffBadgeUI() {
    let chip = document.getElementById('staff-role-chip');
    if (!chip && currentStaff) {
      chip = document.createElement('div');
      chip.id = 'staff-role-chip';
      chip.style.cssText = 'background:#EFF6FF;color:#1B3A6B;border:1px solid #DBEAFE;padding:4px 10px;border-radius:20px;font-weight:700;font-size:11.5px;display:flex;align-items:center;gap:6px;';
      const right = document.querySelector('.topbar-right');
      if (right) right.prepend(chip);
    }
    if (chip && currentStaff) {
      chip.innerHTML = '👤 ' + esc(currentStaff.name) + ' <span class="chip chip-info" style="font-size:10px;">' + esc(currentStaff.role) + '</span> <button class="btn btn-ghost btn-sm" onclick="window.App.logoutStaff()" style="padding:0 4px;color:#DC2626;">🔒 Logout</button>';
    }
  }

  /* ── Expose ─────────────────────────────────────────── */

  window.App = {
    registerView, navigate, refreshBadges, renderNav, checkStaffAuth, logoutStaff,
    el, esc, fmtDate, todayLabel, inr, chip, avatar, spinnerHtml, patientInfoRow,
    modal, closeModal, toast, confirmBox, printBill, setBadgeCount,
    get activeView() { return activeView; },
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('today-chip').textContent = todayLabel();
    startClock();
    renderNav();
    navigate('dashboard');
    refreshBadges();
    setInterval(refreshBadges, 20000);
    setTimeout(checkStaffAuth, 150);

    // sidebar drawer buttons
    document.getElementById('menu-btn').onclick = () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('drawer-overlay').classList.add('open');
    };
    document.getElementById('drawer-overlay').onclick = closeDrawer;

    const disp = document.createElement('button');
    disp.className = 'btn btn-outline btn-sm';
    disp.style.cssText = 'margin-top:8px;width:100%;';
    disp.innerHTML = '🖥 Open Display Board (TV)';
    disp.onclick = () => window.open('/display.html', '_blank');
    document.querySelector('.sidebar-footer').appendChild(disp);

    // server badge
    fetch('/api/health').then((r) => r.json()).then(() => {
      document.getElementById('server-badge').textContent = '● Server online';
    }).catch(() => {
      document.getElementById('server-badge').textContent = 'Server offline';
    });

    // clock refresh badges on focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshBadges();
        if (window.App.activeView && views[window.App.activeView] && views[window.App.activeView].reload) {
          views[window.App.activeView].reload();
        }
      }
    });
  });
})();