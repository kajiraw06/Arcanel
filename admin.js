/* ============================================================
   ARCANEL TECH — ADMIN BOOKING TRACKER
   Password: arcanel2026  (change it below in ADMIN_PASS)
   Data is stored in localStorage — no backend needed.
   ============================================================ */

const ADMIN_PASS   = 'arcanel2026'; // ← change your password here
const STORAGE_KEY  = 'arcanel_bookings';
const SESSION_KEY  = 'arcanel_admin_session';

// ─── State ───────────────────────────────────────────────────
let bookings    = [];
let editingId   = null;
let deleteId    = null;
let filterStatus = 'all';
let searchQuery  = '';

// ─── Elements ────────────────────────────────────────────────
const loginOverlay  = document.getElementById('loginOverlay');
const dashboard     = document.getElementById('dashboard');
const loginBtn      = document.getElementById('loginBtn');
const logoutBtn     = document.getElementById('logoutBtn');
const adminPass     = document.getElementById('adminPass');
const loginError    = document.getElementById('loginError');

const searchInput   = document.getElementById('searchInput');
const filterSelect  = document.getElementById('filterStatus');
const addBtn        = document.getElementById('addBtn');
const exportBtn     = document.getElementById('exportBtn');
const bookingsBody  = document.getElementById('bookingsBody');
const emptyState    = document.getElementById('emptyState');

const modalOverlay  = document.getElementById('modalOverlay');
const modalTitle    = document.getElementById('modalTitle');
const modalClose    = document.getElementById('modalClose');
const cancelModal   = document.getElementById('cancelModal');
const saveBtn       = document.getElementById('saveBtn');

const deleteOverlay = document.getElementById('deleteOverlay');
const deleteClose   = document.getElementById('deleteClose');
const cancelDelete  = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');

// Stats
const statTotal     = document.getElementById('statTotal');
const statPending   = document.getElementById('statPending');
const statProgress  = document.getElementById('statProgress');
const statDone      = document.getElementById('statDone');
const statCancelled = document.getElementById('statCancelled');

// Modal fields
const editId   = document.getElementById('editId');
const mName    = document.getElementById('m-name');
const mPhone   = document.getElementById('m-phone');
const mDevice  = document.getElementById('m-device');
const mService = document.getElementById('m-service');
const mDate    = document.getElementById('m-date');
const mTime    = document.getElementById('m-time');
const mSource  = document.getElementById('m-source');
const mStatus  = document.getElementById('m-status');
const mNotes   = document.getElementById('m-notes');

// ─── Auth ─────────────────────────────────────────────────────
function checkSession() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function showDashboard() {
  loginOverlay.style.display = 'none';
  dashboard.classList.add('active');
}

function showLogin() {
  loginOverlay.style.display = 'flex';
  dashboard.classList.remove('active');
}

loginBtn.addEventListener('click', () => {
  if (adminPass.value === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    loginError.textContent = '';
    adminPass.value = '';
    showDashboard();
    loadBookings();
    render();
  } else {
    loginError.textContent = 'Incorrect password. Try again.';
    adminPass.value = '';
    adminPass.focus();
  }
});

adminPass.addEventListener('keydown', e => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

// ─── Storage ──────────────────────────────────────────────────
function loadBookings() {
  try {
    bookings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    bookings = [];
  }
}

function saveBookings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Render ───────────────────────────────────────────────────
function statusLabel(s) {
  return { pending: 'Pending', confirmed: 'Confirmed', 'in-progress': 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }[s] || s;
}

function filtered() {
  return bookings.filter(b => {
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (b.name   || '').toLowerCase().includes(q) ||
      (b.device || '').toLowerCase().includes(q) ||
      (b.service|| '').toLowerCase().includes(q) ||
      (b.phone  || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
}

function renderStats() {
  const count = s => bookings.filter(b => b.status === s).length;
  statTotal.textContent     = bookings.length;
  statPending.textContent   = count('pending');
  statProgress.textContent  = count('in-progress');
  statDone.textContent      = count('completed');
  statCancelled.textContent = count('cancelled');
}

function renderTable() {
  const rows = filtered();
  bookingsBody.innerHTML = '';

  if (rows.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  rows.forEach((b, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-num">${i + 1}</td>
      <td class="td-name">${esc(b.name)}</td>
      <td class="td-phone"><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a></td>
      <td class="td-device">${esc(b.device)}</td>
      <td>${esc(b.service)}</td>
      <td style="white-space:nowrap">${esc(b.date) || '—'}</td>
      <td style="white-space:nowrap;font-size:0.8rem;color:var(--muted)">${esc(b.time) || '—'}</td>
      <td style="font-size:0.8rem;color:var(--muted)">${esc(b.source) || '—'}</td>
      <td>
        <span class="status-badge status-${esc(b.status)}" style="cursor:pointer;" data-id="${b.id}" title="Click to change status">
          ${statusLabel(b.status)}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" data-id="${b.id}">Edit</button>
          <button class="btn-del" data-id="${b.id}">Delete</button>
        </div>
      </td>
    `;
    bookingsBody.appendChild(tr);
  });

  // Status badge click — cycle through statuses
  bookingsBody.querySelectorAll('.status-badge').forEach(badge => {
    badge.addEventListener('click', () => cycleStatus(badge.dataset.id));
  });
  bookingsBody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEdit(btn.dataset.id));
  });
  bookingsBody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => openDelete(btn.dataset.id));
  });
}

function render() {
  renderStats();
  renderTable();
}

// ─── Status cycle ─────────────────────────────────────────────
const STATUS_CYCLE = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
function cycleStatus(id) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;
  const idx = STATUS_CYCLE.indexOf(b.status);
  b.status = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  saveBookings();
  render();
}

// ─── Add / Edit Modal ─────────────────────────────────────────
function openAdd() {
  editingId = null;
  editId.value = '';
  modalTitle.textContent = 'Add Booking';
  clearModal();
  // default date to today
  mDate.value = new Date().toISOString().split('T')[0];
  mSource.value = 'Website Form';
  mStatus.value = 'pending';
  modalOverlay.classList.add('open');
  mName.focus();
}

function openEdit(id) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;
  editingId = id;
  editId.value = id;
  modalTitle.textContent = 'Edit Booking';
  mName.value    = b.name    || '';
  mPhone.value   = b.phone   || '';
  mDevice.value  = b.device  || '';
  mService.value = b.service || '';
  mDate.value    = b.date    || '';
  mTime.value    = b.time    || '';
  mSource.value  = b.source  || 'Website Form';
  mStatus.value  = b.status  || 'pending';
  mNotes.value   = b.notes   || '';
  modalOverlay.classList.add('open');
  mName.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

function clearModal() {
  [mName, mPhone, mDevice, mDate, mNotes].forEach(el => el.value = '');
  mService.value = '';
  mTime.value    = '';
  mStatus.value  = 'pending';
  mSource.value  = 'Website Form';
}

saveBtn.addEventListener('click', () => {
  if (!mName.value.trim() || !mPhone.value.trim() || !mDevice.value.trim() || !mService.value) {
    alert('Please fill in Name, Phone, Device & Problem, and Service.');
    return;
  }

  if (editingId) {
    const b = bookings.find(x => x.id === editingId);
    if (b) {
      b.name    = mName.value.trim();
      b.phone   = mPhone.value.trim();
      b.device  = mDevice.value.trim();
      b.service = mService.value;
      b.date    = mDate.value;
      b.time    = mTime.value;
      b.source  = mSource.value;
      b.status  = mStatus.value;
      b.notes   = mNotes.value.trim();
    }
  } else {
    bookings.unshift({
      id:        genId(),
      name:      mName.value.trim(),
      phone:     mPhone.value.trim(),
      device:    mDevice.value.trim(),
      service:   mService.value,
      date:      mDate.value,
      time:      mTime.value,
      source:    mSource.value,
      status:    mStatus.value,
      notes:     mNotes.value.trim(),
      createdAt: new Date().toISOString()
    });
  }

  saveBookings();
  render();
  closeModal();
});

[modalClose, cancelModal].forEach(el => el.addEventListener('click', closeModal));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

// ─── Delete Modal ─────────────────────────────────────────────
function openDelete(id) {
  deleteId = id;
  deleteOverlay.classList.add('open');
}
function closeDelete() {
  deleteOverlay.classList.remove('open');
  deleteId = null;
}

confirmDelete.addEventListener('click', () => {
  bookings = bookings.filter(b => b.id !== deleteId);
  saveBookings();
  render();
  closeDelete();
});
[deleteClose, cancelDelete].forEach(el => el.addEventListener('click', closeDelete));
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) closeDelete(); });

// ─── Search & Filter ──────────────────────────────────────────
searchInput.addEventListener('input', e => {
  searchQuery = e.target.value;
  render();
});
filterSelect.addEventListener('change', e => {
  filterStatus = e.target.value;
  render();
});

// ─── Add button ───────────────────────────────────────────────
addBtn.addEventListener('click', openAdd);

// ─── Export CSV ───────────────────────────────────────────────
exportBtn.addEventListener('click', () => {
  if (bookings.length === 0) { alert('No bookings to export.'); return; }

  const headers = ['Name','Phone','Device & Problem','Service','Date','Time','Source','Status','Notes','Created At'];
  const rows = bookings.map(b => [
    b.name, b.phone, b.device, b.service, b.date, b.time, b.source, statusLabel(b.status), b.notes,
    b.createdAt ? new Date(b.createdAt).toLocaleString() : ''
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `arcanel-bookings-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ─── Escape helper ────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ─────────────────────────────────────────────────────
if (checkSession()) {
  loadBookings();
  showDashboard();
  render();
} else {
  showLogin();
}
