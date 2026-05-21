/* ============================================================
   ARCANEL TECH — REPAIR TICKET TRACKER (Supabase Edition)
   Password: arcanel2026  (change ADMIN_PASS below)
   ============================================================ */

const ADMIN_PASS  = 'arcanel2026';
const SESSION_KEY = 'arcanel_admin_session';

const SUPABASE_URL = 'https://kwgdjagjpqrkcyrehcyh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Z2RqYWdqcHFya2N5cmVoY3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNzk1NDUsImV4cCI6MjA5Mzk1NTU0NX0.DxmxvyMjlivZbnCmECZZxEP8lYAso33lRXFXdtcklH8';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Constants ───────────────────────────────────────────────
const STATUSES = [
  { key: 'received',      label: 'Received' },
  { key: 'diagnosing',    label: 'Diagnosing' },
  { key: 'waiting_parts', label: 'Waiting for Parts' },
  { key: 'in_repair',     label: 'In Repair' },
  { key: 'ready',         label: 'Ready for Pickup' },
  { key: 'delivered',     label: 'Delivered' },
  { key: 'cancelled',     label: 'Cancelled' },
];

const STATUS_CYCLE = STATUSES.map(s => s.key);
const ARCHIVED_STATUSES = ['delivered', 'cancelled'];

// ─── State ───────────────────────────────────────────────────
let bookings       = [];
let editingId      = null;
let deleteId       = null;
let viewingId      = null;
let filterStatus   = 'all';
let filterPriority = 'all';
let filterView     = 'active'; // 'active' | 'archive'
let searchQuery    = '';
let pinVisible     = false;

// ─── DOM Elements ─────────────────────────────────────────────
const loginOverlay   = document.getElementById('loginOverlay');
const dashboard      = document.getElementById('dashboard');
const loginBtn       = document.getElementById('loginBtn');
const logoutBtn      = document.getElementById('logoutBtn');
const adminPass      = document.getElementById('adminPass');
const loginError     = document.getElementById('loginError');

const searchInput    = document.getElementById('searchInput');
const addBtn         = document.getElementById('addBtn');
const exportBtn      = document.getElementById('exportBtn');
const ticketGrid     = document.getElementById('ticketGrid');
const emptyState     = document.getElementById('emptyState');
const selectAllRow   = document.getElementById('selectAllRow');
const selectAllChk   = document.getElementById('selectAllChk');
const selectAllCount = document.getElementById('selectAllCount');
const tabActive      = document.getElementById('tabActive');
const tabArchive     = document.getElementById('tabArchive');

// Stats
const statTotal      = document.getElementById('statTotal');
const statInRepair   = document.getElementById('statInRepair');
const statReady      = document.getElementById('statReady');
const statOverdue    = document.getElementById('statOverdue');
const statRevenue    = document.getElementById('statRevenue');

// View modal
const viewOverlay    = document.getElementById('viewOverlay');
const viewClose      = document.getElementById('viewClose');
const viewCloseBtn   = document.getElementById('viewCloseBtn');
const viewEditBtn    = document.getElementById('viewEditBtn');
const viewDeleteBtn  = document.getElementById('viewDeleteBtn');
const viewWaBtn      = document.getElementById('viewWaBtn');
const viewStatusSel  = document.getElementById('viewStatusSelect');
const addNoteForm    = document.getElementById('addNoteForm');
const noteInput      = document.getElementById('noteInput');
const vPinToggle     = document.getElementById('vPinToggle');

// Form modal
const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const modalClose     = document.getElementById('modalClose');
const cancelModal    = document.getElementById('cancelModal');
const saveBtn        = document.getElementById('saveBtn');
const pinToggleBtn   = document.getElementById('pinToggleBtn');

// Form fields
const editId         = document.getElementById('editId');
const mName          = document.getElementById('m-name');
const mPhone         = document.getElementById('m-phone');
const mEmail         = document.getElementById('m-email');
const mDeviceType    = document.getElementById('m-device-type');
const mDeviceBrand   = document.getElementById('m-device-brand');
const mDeviceModel   = document.getElementById('m-device-model');
const mDevicePin     = document.getElementById('m-device-pin');
const mService       = document.getElementById('m-service');
const mPriority      = document.getElementById('m-priority');
const mTechnician    = document.getElementById('m-technician');
const mStatus        = document.getElementById('m-status');
const mIssue         = document.getElementById('m-issue');
const mDate          = document.getElementById('m-date');
const mDueDate       = document.getElementById('m-due-date');
const mSource        = document.getElementById('m-source');
const mWarranty      = document.getElementById('m-warranty');
const mEstCost       = document.getElementById('m-estimated-cost');
const mPartsCost     = document.getElementById('m-parts-cost');
const mLaborCost     = document.getElementById('m-labor-cost');
const mFinalPrice    = document.getElementById('m-final-price');
const mNotes         = document.getElementById('m-notes');

// Delete modal
const deleteOverlay  = document.getElementById('deleteOverlay');
const deleteClose    = document.getElementById('deleteClose');
const cancelDelete   = document.getElementById('cancelDelete');
const confirmDelete  = document.getElementById('confirmDelete');

// ─── Auth ─────────────────────────────────────────────────────
loginBtn.addEventListener('click', () => {
  if (adminPass.value === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    loginError.textContent = '';
    adminPass.value = '';
    showDashboard();
  } else {
    loginError.textContent = 'Incorrect password. Try again.';
    adminPass.value = '';
    adminPass.focus();
  }
});
adminPass.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
logoutBtn.addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); showLogin(); });

function showDashboard() {
  loginOverlay.style.display = 'none';
  dashboard.classList.add('active');
  loadAndRender();
}
function showLogin() {
  loginOverlay.style.display = 'flex';
  dashboard.classList.remove('active');
}

// ─── Supabase CRUD ────────────────────────────────────────────
async function loadAndRender() {
  ticketGrid.innerHTML = '<p style="text-align:center;color:var(--text-3);padding:40px;">Loading…</p>';
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    ticketGrid.innerHTML = `<p style="text-align:center;color:#ef4444;padding:40px;">Failed to load: ${esc(error.message)}</p>`;
    return;
  }
  bookings = data || [];
  render();
}

async function insertTicket(fields) {
  const { error } = await db.from('bookings').insert(fields);
  if (error) { alert('Error saving ticket: ' + error.message); return false; }
  return true;
}

async function updateTicket(id, fields) {
  const { error } = await db.from('bookings').update(fields).eq('id', id);
  if (error) { alert('Error updating ticket: ' + error.message); return false; }
  return true;
}

async function deleteTicketDB(id) {
  const { error } = await db.from('bookings').delete().eq('id', id);
  if (error) { alert('Error deleting ticket: ' + error.message); return false; }
  return true;
}

// ─── State: selection ─────────────────────────────────────────
const selectedIds = new Set();

// ─── Render ───────────────────────────────────────────────────
function statusLabel(s) {
  return STATUSES.find(x => x.key === s)?.label || s;
}

function priorityLabel(p) {
  return { urgent: 'Urgent', normal: 'Normal', low: 'Low' }[p] || 'Normal';
}

const PRIORITY_COLORS = { urgent: '#ef4444', normal: '#6366f1', low: '#64748b' };

function filteredBookings() {
  return bookings.filter(b => {
    const isArchived   = ARCHIVED_STATUSES.includes(b.status);
    const matchView    = filterView === 'archive' ? isArchived : !isArchived;
    const matchStatus  = filterStatus === 'all' || b.status === filterStatus;
    const matchPriority = filterPriority === 'all' || (b.priority || 'normal') === filterPriority;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (b.name         || '').toLowerCase().includes(q) ||
      (b.phone        || '').toLowerCase().includes(q) ||
      (b.device_brand || '').toLowerCase().includes(q) ||
      (b.device_model || '').toLowerCase().includes(q) ||
      (b.device_type  || '').toLowerCase().includes(q) ||
      (b.device       || '').toLowerCase().includes(q) ||
      (b.technician   || '').toLowerCase().includes(q) ||
      (b.service      || '').toLowerCase().includes(q);
    return matchView && matchStatus && matchPriority && matchSearch;
  });
}

function isOverdue(b) {
  const due = b.due_date || b.dueDate;
  return due && new Date(due + 'T00:00:00') < new Date() && !ARCHIVED_STATUSES.includes(b.status);
}

function renderStats() {
  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  statTotal.textContent    = bookings.length;
  statInRepair.textContent = bookings.filter(b => ['diagnosing','waiting_parts','in_repair'].includes(b.status)).length;
  statReady.textContent    = bookings.filter(b => b.status === 'ready').length;
  statOverdue.textContent  = bookings.filter(b => isOverdue(b)).length;

  const revenue = bookings
    .filter(b => b.status === 'delivered' && new Date(b.updated_at || b.created_at) >= startOfMonth)
    .reduce((sum, b) => {
      const final = parseFloat(b.final_price);
      if (!isNaN(final) && final > 0) return sum + final;
      const auto = (parseFloat(b.parts_cost) || 0) + (parseFloat(b.labor_cost) || 0);
      if (auto > 0) return sum + auto;
      return sum + (parseFloat(b.estimated_cost) || 0);
    }, 0);
  statRevenue.textContent = '₱' + revenue.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const overdueCard = statOverdue.closest('.stat-card');
  overdueCard.classList.toggle('stat-overdue-active', parseInt(statOverdue.textContent) > 0);
}

function ticketNum(b) {
  return String(b.id).slice(-4).toUpperCase();
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function deviceLabel(b) {
  const parts = [b.device_type, b.device_brand, b.device_model].filter(Boolean);
  return parts.length ? parts.join(' · ') : (b.device || '—');
}

function renderCards() {
  const rows = filteredBookings();
  ticketGrid.innerHTML = '';

  if (rows.length === 0) {
    emptyState.classList.add('visible');
    selectAllRow.style.display = 'none';
    return;
  }
  emptyState.classList.remove('visible');
  selectAllRow.style.display = '';
  selectAllCount.textContent = rows.length;
  selectAllChk.checked = rows.length > 0 && rows.every(b => selectedIds.has(String(b.id)));

  rows.forEach(b => {
    const overdue  = isOverdue(b);
    const priority = b.priority || 'normal';
    const prioColor = PRIORITY_COLORS[priority] || 'transparent';
    const isSelected = selectedIds.has(String(b.id));
    const device = [b.device_brand, b.device_model].filter(Boolean).join(' ')
                   + (b.device_type ? ` (${b.device_type})` : '') || (b.device || '—');
    const service = b.service || '';
    const issue   = b.issue_description || '';
    const dueDate = b.due_date || b.dueDate;
    const dateStr = b.date ? fmtDate(b.date) : (b.created_at ? fmtDate(b.created_at.slice(0,10)) : '—');

    const card = document.createElement('div');
    card.className = 'ticket-card'
      + (isSelected ? ' ticket-card-selected' : '')
      + (overdue    ? ' ticket-card-overdue'  : '');
    card.style.setProperty('--priority-color', prioColor);
    card.dataset.id = b.id;

    card.innerHTML = `
      <div class="ticket-card-header">
        <div class="ticket-card-header-left">
          <input type="checkbox" class="bulk-checkbox card-chk" data-id="${b.id}" ${isSelected ? 'checked' : ''}>
          <span class="ticket-card-id">#${esc(ticketNum(b))}</span>
          ${priority !== 'normal' ? `<span class="priority-badge priority-${esc(priority)}">${priorityLabel(priority)}</span>` : ''}
        </div>
        <span class="status-badge status-${esc(b.status)}">${statusLabel(b.status)}</span>
      </div>
      <div class="ticket-card-body">
        <div class="ticket-customer"><span class="tc-icon">👤</span><span>${esc(b.name)}</span></div>
        <div class="ticket-device"><span class="tc-icon">📱</span><span>${esc(device)}</span></div>
        ${b.phone    ? `<div class="ticket-phone"><span class="tc-icon">📞</span><span>${esc(b.phone)}</span></div>` : ''}
        ${b.technician ? `<div class="ticket-phone"><span class="tc-icon">🔧</span><span>${esc(b.technician)}</span></div>` : ''}
        ${service    ? `<div class="ticket-issue">${esc(service)}${issue ? ' — ' + esc(issue.slice(0,60)) + (issue.length > 60 ? '…' : '') : ''}</div>` : (issue ? `<div class="ticket-issue">${esc(issue.slice(0,80))}${issue.length > 80 ? '…' : ''}</div>` : '')}
        ${overdue    ? '<div class="ticket-overdue-tag">⚠ Overdue</div>' : ''}
      </div>
      <div class="ticket-card-footer">
        <span class="ticket-date">${dateStr}</span>
        <div class="ticket-actions">
          <button class="btn btn-ghost btn-xs card-btn-view" data-id="${b.id}">View</button>
          <button class="btn btn-ghost btn-xs card-btn-edit" data-id="${b.id}">Edit</button>
          <button class="btn-wa-xs card-btn-wa" data-id="${b.id}" title="WhatsApp">💬</button>
          <button class="btn-del-xs card-btn-del" data-id="${b.id}">🗑</button>
        </div>
      </div>
    `;
    ticketGrid.appendChild(card);
  });

  ticketGrid.querySelectorAll('.card-chk').forEach(chk => {
    chk.addEventListener('change', e => {
      e.stopPropagation();
      const id = String(chk.dataset.id);
      selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
      renderCards();
    });
  });
  ticketGrid.querySelectorAll('.card-btn-view').forEach(btn => btn.addEventListener('click', () => openView(btn.dataset.id)));
  ticketGrid.querySelectorAll('.card-btn-edit').forEach(btn => btn.addEventListener('click', () => openEdit(btn.dataset.id)));
  ticketGrid.querySelectorAll('.card-btn-wa').forEach(btn  => btn.addEventListener('click', () => sendWhatsApp(btn.dataset.id)));
  ticketGrid.querySelectorAll('.card-btn-del').forEach(btn => btn.addEventListener('click', () => openDelete(btn.dataset.id)));
}

function render() {
  renderStats();
  renderTabCounts();
  renderCards();
}

function renderTabCounts() {
  const activeCount  = bookings.filter(b => !ARCHIVED_STATUSES.includes(b.status)).length;
  const archiveCount = bookings.filter(b =>  ARCHIVED_STATUSES.includes(b.status)).length;
  document.getElementById('tabActiveCount').textContent  = activeCount;
  document.getElementById('tabArchiveCount').textContent = archiveCount;
}

function switchTab() {
  tabActive.classList.toggle('view-tab-active',  filterView === 'active');
  tabArchive.classList.toggle('view-tab-active', filterView === 'archive');
}

// ─── Status Cycle ─────────────────────────────────────────────
async function cycleStatus(id) {
  const b = bookings.find(x => String(x.id) === String(id));
  if (!b) return;
  const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(b.status) + 1) % STATUS_CYCLE.length];
  const ok   = await updateTicket(id, { status: next, updated_at: new Date().toISOString() });
  if (ok) { b.status = next; b.updated_at = new Date().toISOString(); render(); }
}

// ─── Ticket Detail View ────────────────────────────────────────
function openView(id) {
  const b = bookings.find(x => String(x.id) === String(id));
  if (!b) return;
  viewingId  = b.id;
  pinVisible = false;

  document.getElementById('viewTicketNum').textContent = 'Ticket #' + ticketNum(b);

  const statusBadge = document.getElementById('viewStatusBadge');
  statusBadge.className = 'status-badge status-' + (b.status || 'received');
  statusBadge.textContent = statusLabel(b.status);

  const priority = b.priority || 'normal';
  const priBadge = document.getElementById('viewPriorityBadge');
  priBadge.className = 'priority-badge priority-' + priority;
  priBadge.textContent = priorityLabel(priority);

  document.getElementById('viewOverdueBadge').style.display = isOverdue(b) ? 'inline-block' : 'none';
  viewStatusSel.value = b.status || 'received';
  renderStatusProgress(b.status);

  // Customer
  document.getElementById('vName').textContent       = b.name       || '—';
  document.getElementById('vPhone').textContent      = b.phone      || '—';
  document.getElementById('vEmail').textContent      = b.email      || '—';
  document.getElementById('vTechnician').textContent = b.technician || '—';

  // Device
  document.getElementById('vDeviceType').textContent  = b.device_type  || '—';
  document.getElementById('vDeviceBrand').textContent = b.device_brand || '—';
  document.getElementById('vDeviceModel').textContent = b.device_model || (b.device || '—');
  document.getElementById('vWarranty').textContent    = b.warranty_days ? b.warranty_days + ' days' : '—';

  const pinRow = document.getElementById('vPinRow');
  if (b.device_pin) {
    pinRow.style.display = 'flex';
    document.getElementById('vPinText').textContent = '•'.repeat(b.device_pin.length);
    vPinToggle.textContent = '👁 Show';
  } else {
    pinRow.style.display = 'none';
  }

  // Repair
  document.getElementById('vService').textContent = b.service || '—';
  document.getElementById('vSource').textContent  = b.source  || '—';
  document.getElementById('vDate').textContent    = fmtDate(b.date) || '—';

  const due   = b.due_date || b.dueDate;
  const dueTd = document.getElementById('vDueDate');
  dueTd.textContent = due ? fmtDate(due) + (isOverdue(b) ? ' — OVERDUE' : '') : '—';
  dueTd.style.color = isOverdue(b) ? '#ef4444' : '';

  const issueRow = document.getElementById('vIssueRow');
  const issue    = b.issue_description || '';
  issueRow.style.display = issue ? 'block' : 'none';
  document.getElementById('vIssue').textContent = issue;

  const notesRow = document.getElementById('vNotesRow');
  notesRow.style.display = b.notes ? 'block' : 'none';
  document.getElementById('vNotes').textContent = b.notes || '';

  // Pricing
  const money = v => { const n = parseFloat(v); return isNaN(n) ? null : '₱' + n.toFixed(2); };
  document.getElementById('vEstimate').textContent = money(b.estimated_cost) || '—';
  document.getElementById('vParts').textContent    = money(b.parts_cost) || '—';
  document.getElementById('vLabor').textContent    = money(b.labor_cost) || '—';
  const autoTotal = (parseFloat(b.parts_cost) || 0) + (parseFloat(b.labor_cost) || 0);
  document.getElementById('vFinal').textContent    = money(b.final_price) || (autoTotal > 0 ? '₱' + autoTotal.toFixed(2) : '—');

  renderNotesList(b);
  noteInput.value = '';
  viewOverlay.classList.add('open');
}

function renderStatusProgress(currentStatus) {
  const steps       = STATUSES.filter(s => s.key !== 'cancelled');
  const prog        = document.getElementById('viewStatusProgress');
  const idx         = steps.findIndex(s => s.key === currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  prog.innerHTML = steps.map((s, i) => {
    let cls = 'progress-step';
    if (isCancelled)  cls += ' progress-step--muted';
    else if (i < idx)  cls += ' progress-step--done';
    else if (i === idx) cls += ' progress-step--active';
    return `<div class="${cls}"><div class="progress-dot"></div><div class="progress-label">${s.label}</div></div>` +
           (i < steps.length - 1 ? '<div class="progress-line' + (i < idx && !isCancelled ? ' progress-line--done' : '') + '"></div>' : '');
  }).join('');

  if (isCancelled) prog.innerHTML += '<div class="progress-cancelled">Cancelled</div>';
}

function renderNotesList(b) {
  const list  = document.getElementById('vNotesList');
  const notes = Array.isArray(b.ticket_notes) ? b.ticket_notes : [];
  if (notes.length === 0) {
    list.innerHTML = '<p class="notes-empty">No notes yet.</p>';
    return;
  }
  list.innerHTML = notes.map(n => `
    <div class="note-item" data-note-id="${n.id}">
      <div class="note-dot"></div>
      <div class="note-body">
        <div class="note-text">${esc(n.text)}</div>
        <div class="note-meta">
          <span class="note-time">${fmtDateTime(n.createdAt)}</span>
          <button class="btn-del-note" data-note-id="${n.id}" title="Delete note">×</button>
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.btn-del-note').forEach(btn => {
    btn.addEventListener('click', () => deleteNote(viewingId, Number(btn.dataset.noteId)));
  });
}

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// PIN toggle in view
vPinToggle.addEventListener('click', () => {
  const b = bookings.find(x => String(x.id) === String(viewingId));
  if (!b?.device_pin) return;
  pinVisible = !pinVisible;
  document.getElementById('vPinText').textContent = pinVisible ? b.device_pin : '•'.repeat(b.device_pin.length);
  vPinToggle.textContent = pinVisible ? '🙈 Hide' : '👁 Show';
});

// Quick status change in view
viewStatusSel.addEventListener('change', async () => {
  const b = bookings.find(x => String(x.id) === String(viewingId));
  if (!b) return;
  const newStatus = viewStatusSel.value;
  const ok = await updateTicket(viewingId, { status: newStatus, updated_at: new Date().toISOString() });
  if (ok) {
    b.status     = newStatus;
    b.updated_at = new Date().toISOString();
    const badge = document.getElementById('viewStatusBadge');
    badge.className   = 'status-badge status-' + newStatus;
    badge.textContent = statusLabel(newStatus);
    document.getElementById('viewOverdueBadge').style.display = isOverdue(b) ? 'inline-block' : 'none';
    renderStatusProgress(newStatus);
    render();
  }
});

// Add note
addNoteForm.addEventListener('submit', async e => {
  e.preventDefault();
  const text = noteInput.value.trim();
  if (!text || !viewingId) return;
  const b     = bookings.find(x => String(x.id) === String(viewingId));
  if (!b) return;
  const notes = Array.isArray(b.ticket_notes) ? [...b.ticket_notes] : [];
  const note  = { id: Date.now(), text, createdAt: new Date().toISOString() };
  notes.push(note);
  const ok = await updateTicket(viewingId, { ticket_notes: notes, updated_at: new Date().toISOString() });
  if (ok) {
    b.ticket_notes = notes;
    b.updated_at   = new Date().toISOString();
    noteInput.value = '';
    renderNotesList(b);
  }
});

async function deleteNote(ticketId, noteId) {
  const b = bookings.find(x => String(x.id) === String(ticketId));
  if (!b) return;
  const notes = (Array.isArray(b.ticket_notes) ? b.ticket_notes : []).filter(n => n.id !== noteId);
  const ok = await updateTicket(ticketId, { ticket_notes: notes, updated_at: new Date().toISOString() });
  if (ok) { b.ticket_notes = notes; renderNotesList(b); }
}

[viewClose, viewCloseBtn].forEach(el => el.addEventListener('click', closeView));
viewOverlay.addEventListener('click', e => { if (e.target === viewOverlay) closeView(); });
function closeView() { viewOverlay.classList.remove('open'); pinVisible = false; }

viewEditBtn.addEventListener('click', () => {
  const id = viewingId;
  closeView();
  openEdit(id);
});

viewDeleteBtn.addEventListener('click', () => {
  const id = viewingId;
  closeView();
  openDelete(id);
});

viewWaBtn.addEventListener('click', () => sendWhatsApp(viewingId));

function sendWhatsApp(id) {
  const b = bookings.find(x => String(x.id) === String(id));
  if (!b?.phone) return;
  const phone  = b.phone.replace(/\D/g, '');
  const device = [b.device_brand, b.device_model].filter(Boolean).join(' ') || b.device || 'your device';
  const msg    = encodeURIComponent(
    `Hi ${b.name || 'there'}! Your repair update for ${device}: *${statusLabel(b.status)}*. Ticket #${ticketNum(b)}. — Arcanel Tech 🔧`
  );
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

// ─── Add / Edit Modal ─────────────────────────────────────────
function clearForm() {
  [mName, mPhone, mEmail, mDeviceBrand, mDeviceModel, mDevicePin, mTechnician,
   mIssue, mDate, mDueDate, mWarranty, mEstCost, mPartsCost, mLaborCost, mFinalPrice, mNotes].forEach(el => el.value = '');
  mDeviceType.value = '';
  mService.value    = '';
  mPriority.value   = 'normal';
  mStatus.value     = 'received';
  mSource.value     = 'Website Form';
  mDevicePin.type   = 'password';
  pinToggleBtn.textContent = '👁';
}

function openAdd() {
  editingId = null;
  editId.value = '';
  modalTitle.textContent = '🎫 New Repair Ticket';
  clearForm();
  mDate.value = new Date().toISOString().split('T')[0];
  modalOverlay.classList.add('open');
  mName.focus();
}

function openEdit(id) {
  const b = bookings.find(x => String(x.id) === String(id));
  if (!b) return;
  editingId      = b.id;
  editId.value   = b.id;
  modalTitle.textContent = '✏️ Edit Ticket';

  mName.value          = b.name              || '';
  mPhone.value         = b.phone             || '';
  mEmail.value         = b.email             || '';
  mDeviceType.value    = b.device_type       || '';
  mDeviceBrand.value   = b.device_brand      || '';
  mDeviceModel.value   = b.device_model      || '';
  mDevicePin.value     = b.device_pin        || '';
  mService.value       = b.service           || '';
  mPriority.value      = b.priority          || 'normal';
  mTechnician.value    = b.technician        || '';
  mStatus.value        = b.status            || 'received';
  mIssue.value         = b.issue_description || '';
  mDate.value          = b.date              || '';
  mDueDate.value       = b.due_date          || '';
  mSource.value        = b.source            || 'Website Form';
  mWarranty.value      = b.warranty_days     || '';
  mEstCost.value       = b.estimated_cost    || '';
  mPartsCost.value     = b.parts_cost        || '';
  mLaborCost.value     = b.labor_cost        || '';
  mFinalPrice.value    = b.final_price       || '';
  mNotes.value         = b.notes             || '';

  mDevicePin.type = 'password';
  pinToggleBtn.textContent = '👁';
  modalOverlay.classList.add('open');
  mName.focus();
}

pinToggleBtn.addEventListener('click', () => {
  mDevicePin.type = mDevicePin.type === 'password' ? 'text' : 'password';
  pinToggleBtn.textContent = mDevicePin.type === 'password' ? '👁' : '🙈';
});

saveBtn.addEventListener('click', async () => {
  if (!mName.value.trim() || !mPhone.value.trim() || !mDeviceType.value || !mService.value) {
    alert('Please fill in: Customer Name, Phone, Device Type, and Service.');
    return;
  }
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  const fields = {
    name:              mName.value.trim(),
    phone:             mPhone.value.trim(),
    email:             mEmail.value.trim()    || null,
    device_type:       mDeviceType.value,
    device_brand:      mDeviceBrand.value.trim()  || null,
    device_model:      mDeviceModel.value.trim()  || null,
    device_pin:        mDevicePin.value            || null,
    service:           mService.value,
    priority:          mPriority.value,
    technician:        mTechnician.value.trim()    || null,
    status:            mStatus.value,
    issue_description: mIssue.value.trim()         || null,
    date:              mDate.value                 || null,
    due_date:          mDueDate.value              || null,
    source:            mSource.value,
    warranty_days:     mWarranty.value  ? parseInt(mWarranty.value)     : null,
    estimated_cost:    mEstCost.value   ? parseFloat(mEstCost.value)    : null,
    parts_cost:        mPartsCost.value ? parseFloat(mPartsCost.value)  : null,
    labor_cost:        mLaborCost.value ? parseFloat(mLaborCost.value)  : null,
    final_price:       mFinalPrice.value? parseFloat(mFinalPrice.value) : null,
    notes:             mNotes.value.trim() || null,
    updated_at:        new Date().toISOString(),
  };

  let ok = false;
  if (editingId) {
    ok = await updateTicket(editingId, fields);
    if (ok) {
      const idx = bookings.findIndex(x => String(x.id) === String(editingId));
      if (idx !== -1) bookings[idx] = { ...bookings[idx], ...fields };
    }
  } else {
    ok = await insertTicket(fields);
    if (ok) await loadAndRender();
  }

  if (ok) { render(); closeFormModal(); }
  saveBtn.textContent = 'Save Ticket';
  saveBtn.disabled = false;
});

[modalClose, cancelModal].forEach(el => el.addEventListener('click', closeFormModal));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeFormModal(); });
function closeFormModal() { modalOverlay.classList.remove('open'); editingId = null; }

// ─── Delete ───────────────────────────────────────────────────
function openDelete(id) { deleteId = id; deleteOverlay.classList.add('open'); }
function closeDeleteModal() { deleteOverlay.classList.remove('open'); deleteId = null; }

confirmDelete.addEventListener('click', async () => {
  const ok = await deleteTicketDB(deleteId);
  if (ok) {
    bookings = bookings.filter(b => String(b.id) !== String(deleteId));
    render();
    closeDeleteModal();
  }
});
[deleteClose, cancelDelete].forEach(el => el.addEventListener('click', closeDeleteModal));
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) closeDeleteModal(); });

// ─── Toolbar ──────────────────────────────────────────────────
searchInput.addEventListener('input', e => { searchQuery = e.target.value; render(); });
addBtn.addEventListener('click', openAdd);

// Select all
selectAllChk.addEventListener('change', () => {
  const rows = filteredBookings();
  if (selectAllChk.checked) rows.forEach(b => selectedIds.add(String(b.id)));
  else                       rows.forEach(b => selectedIds.delete(String(b.id)));
  renderCards();
});

// Tabs
tabActive.addEventListener('click',  () => { filterView = 'active';  switchTab(); render(); });
tabArchive.addEventListener('click', () => { filterView = 'archive'; switchTab(); render(); });

// Status chips
document.querySelectorAll('[data-status]').forEach(chip => {
  chip.addEventListener('click', () => {
    filterStatus = chip.dataset.status;
    document.querySelectorAll('[data-status]').forEach(c => c.classList.toggle('chip-active', c === chip));
    render();
  });
});

// Priority chips
document.querySelectorAll('[data-priority]').forEach(chip => {
  chip.addEventListener('click', () => {
    filterPriority = chip.dataset.priority;
    document.querySelectorAll('[data-priority]').forEach(c => c.classList.toggle('chip-active', c === chip));
    render();
  });
});

// ─── Export CSV ───────────────────────────────────────────────
exportBtn.addEventListener('click', () => {
  if (bookings.length === 0) { alert('No tickets to export.'); return; }
  const headers = [
    'Ticket #','Name','Phone','Email','Device Type','Brand','Model',
    'Service','Priority','Status','Technician','Issue',
    'Est. Cost','Parts Cost','Labor Cost','Final Price',
    'Drop-off Date','Due Date','Warranty Days','Source','Notes','Created At'
  ];
  const rows = bookings.map(b => [
    ticketNum(b), b.name, b.phone, b.email, b.device_type, b.device_brand, b.device_model,
    b.service, b.priority, statusLabel(b.status), b.technician, b.issue_description,
    b.estimated_cost, b.parts_cost, b.labor_cost, b.final_price,
    b.date, b.due_date, b.warranty_days, b.source, b.notes,
    b.created_at ? new Date(b.created_at).toLocaleString() : ''
  ].map(v => `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`));

  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `arcanel-tickets-${new Date().toISOString().slice(0, 10)}.csv`
  });
  a.click();
  URL.revokeObjectURL(url);
});

// ─── Keyboard shortcuts ───────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (viewOverlay.classList.contains('open'))   closeView();
    if (modalOverlay.classList.contains('open'))  closeFormModal();
    if (deleteOverlay.classList.contains('open')) closeDeleteModal();
  }
});

// ─── XSS helper ───────────────────────────────────────────────
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Init ─────────────────────────────────────────────────────
if (sessionStorage.getItem(SESSION_KEY) === 'true') {
  showDashboard();
} else {
  showLogin();
}
