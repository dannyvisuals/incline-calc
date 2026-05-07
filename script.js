/* ================================================================
   script.js — InclineWorks Admin Panel
   Part 1 of 2: Login, Tab Loader, Tab Switcher, Core Modules
   (Part 2 = file-2 Supabase modules appended below)
   ================================================================ */

/* ── Neutralise file-2 login system BEFORE it runs ─────────────
   file-2 uses loginOverlay / loginId / loginPass / doLogin().
   We stub them out so they silently no-op and never interfere
   with our card-based login.                                   */
window.doLogin      = function() {};   // stub — we use login() instead
window.doLogout     = function() {};   // stub
window.checkRemembered = function() { return false; };

/* Prevent file-2 DOMContentLoaded from adding login-active to body
   (it hides overflow and breaks our layout)                    */
const _origAddEventListener = document.addEventListener.bind(document);
document.addEventListener = function(type, fn, opts) {
  if (type === 'DOMContentLoaded') {
    const src = fn.toString();
    // Block file-2's login-active injector and its loginId.focus() call
    if (src.includes('login-active') || src.includes('loginId')) return;
  }
  return _origAddEventListener(type, fn, opts);
};


const TAB_PANELS = [
  { id: 'dashboard',   file: 'panel-dashboard.html'   },
  { id: 'task-order',  file: 'panel-task-order.html'  },
  { id: 'orders',      file: 'panel-orders.html'      },
  { id: 'outstanding', file: 'panel-outstanding.html' },
  { id: 'salary',      file: 'panel-salary.html'      },
  { id: 'reports',     file: 'panel-reports.html'     },
  { id: 'staff',       file: 'panel-staff.html'       },
  { id: 'tracker',     file: 'panel-tracker.html'     },
  { id: 'analysis',    file: 'panel-analysis.html'    },
  { id: 'inventory',   file: 'panel-inventory.html'   },
  { id: 'admin',       file: 'panel-admin.html'       },
];

const TAB_LABELS = {
  'dashboard':   'Admin Panel',     'task-order':  'New Task Order',
  'orders':      'Task Orders',     'outstanding': 'Loans & Balances',
  'salary':      'Staff Salary',    'reports':     'Staff Reports',
  'staff':       'Staff Management','tracker':     'Receipt Tracker',
  'analysis':    'Production Analysis',
  'inventory':   'Inventory',
};

async function loadAllPanels() {
  const container = document.getElementById('tab-panels-container');
  for (const { id, file } of TAB_PANELS) {
    try {
      const res = await fetch(file);
      const html = await res.text();
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      while (wrap.firstChild) container.appendChild(wrap.firstChild);
    } catch(e) { console.warn('Could not load ' + file, e); }
  }
}

/* ── LOGIN ── */
const SUPA_URL = 'https://qcwnowbztttkdpgznufo.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd25vd2J6dHR0a2RwZ3pudWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTM0OTQsImV4cCI6MjA4ODg4OTQ5NH0.8GpWJEFd427t6a0HoukYC0RGG1clM1UdjwKgzRMY72g';

// ── ADMIN CREDENTIALS — change these to update your login ──
const ADMIN_ID       = 'IW-ADM-001';  // Your admin ID number
const ADMIN_PASSWORD = 'admin123';    // Your admin password

function login(event) {
  if (event) event.preventDefault();
  const id   = document.getElementById('id-number').value.trim();
  const pass = document.getElementById('password').value;
  const msg  = document.getElementById('errorMsg');
  msg.innerText = '';

  if (document.getElementById('welcomeOverlay').classList.contains('active')) return;

  // Simple admin check — update ADMIN_ID and ADMIN_PASSWORD constants below to change credentials
  if (id === ADMIN_ID && pass === ADMIN_PASSWORD) {
    var _storedName = localStorage.getItem('incline_admin_name') || 'Gerald';
    showWelcome(_storedName);
  } else {
    msg.innerText = 'Invalid ID or password.';
  }
}

function showWelcome(staffName) {
  const overlay   = document.getElementById('welcomeOverlay');
  const loginCard = document.querySelector('.card');
  // Always read from localStorage so user changes persist
  const resolvedName = localStorage.getItem('incline_admin_name') || staffName || 'Gerald';
  window._loggedInName = resolvedName;
  var _wn1 = document.getElementById('welcome-name');
  if (_wn1) _wn1.textContent = resolvedName;
  var _wn2 = overlay ? overlay.querySelector('.green') : null;
  if (_wn2 && _wn2 !== _wn1) _wn2.textContent = resolvedName;
  overlay.classList.add('active');
  setTimeout(() => { loginCard.style.display = 'none'; }, 500);

  setTimeout(async () => {
    overlay.classList.remove('active');
    document.getElementById('sidenav').style.display   = 'flex';
    document.getElementById('workspace').style.display = 'flex';
    // Reset body from login-centering to full-screen app layout
    document.body.style.alignItems     = 'stretch';
    document.body.style.justifyContent = 'flex-start';
    document.body.style.padding        = '0';
    // Reset body from login-centering to full-screen app layout
    document.body.style.alignItems     = 'stretch';
    document.body.style.justifyContent = 'flex-start';
    document.body.style.padding        = '0';

    await loadAllPanels();
    initSidenav();
    hidePanels();
    switchTab('dashboard');
    updateGreeting();

    const od = document.getElementById('to-order-date');
    if (od) od.value = new Date().toISOString().split('T')[0];
    toUpdateReceipt();

    // Auto-connect Supabase so dashboard stats load immediately
    setTimeout(() => {
      if (typeof connectSupabase === 'function') connectSupabase();
    }, 200);

    setTimeout(wireFile2Events, 500);
  }, 3000);
}

function wireFile2Events() {
  if (typeof $ === 'undefined') return;
  window._setTaskPill = function(val, btn) {
    $('#filterStatus').val(val); $('.task-status-pill').removeClass('active'); $(btn).addClass('active');
    if (typeof renderOrdersTable === 'function') renderOrdersTable();
  };
  $('#filterSearch,#filterStatus').on('input change', ()=>{ if(typeof renderOrdersTable==='function') renderOrdersTable(); });
  $('#outstandingSearch,#outstandingSortBy,#outstandingFrom,#outstandingTo,#outstandingDateField').on('input change', ()=>{ if(typeof renderOutstandingTable==='function') renderOutstandingTable(); });
  $('#addDebtBtn').on('click', ()=>{ if(typeof addManualDebt==='function') addManualDebt(); });
  $('#savePricesBtn').on('click', ()=>{ if(typeof saveAllPrices==='function') saveAllPrices(); });
  $('#addCustomBtn').on('click', ()=>{ if(typeof addCustomService==='function') addCustomService(); });
  $('#closeModal').on('click', ()=>$('#viewModal').hide());
  $('#viewModal').on('click', function(e){ if($(e.target).is(this)) $(this).hide(); });
  $('#editDebtModal').on('click', function(e){ if($(e.target).is(this) && typeof closeEditDebt==='function') closeEditDebt(); });
  $('#reportStaffSearch,#reportTimeframe').on('input change', ()=>{ if(typeof renderStaffCards==='function') renderStaffCards(); });
  $('#srTimeframe').on('change', function(){ if(typeof renderStaffReport==='function'&&window._srStaffName) renderStaffReport(window._srStaffName); });
  $('#salarySearch').on('input', ()=>{ if(typeof _drawSalaryGrid==='function') _drawSalaryGrid(); });
  // Use event delegation for salary select/PDF buttons — panels load after wireFile2Events runs
  $(document).on('click', '#sal-grid-select-btn', ()=>{ if(typeof _toggleSalaryGridSelectMode==='function') _toggleSalaryGridSelectMode(); });
  $(document).on('click', '#sal-grid-pdf-btn', ()=>{ if(typeof _exportSelectedGridSalaryPDF==='function') _exportSelectedGridSalaryPDF(); });
  $('#adminSearch').on('input', function(){
    const q=$(this).val().trim().toLowerCase();
    $('#adminPriceList .pa-svc-row').each(function(){
      const name=($(this).data('name')||'').toLowerCase();
      $(this).toggle(!q||name.includes(q));
    });
    $('#adminPriceList .pa-cat-row').each(function(){
      const cat=$(this).data('cat');
      const anyVis=$('#adminPriceList .pa-svc-row[data-cat="'+cat+'"]').filter(function(){ return $(this).is(':visible'); }).length>0;
      $(this).toggle(!q||anyVis);
    });
  });
  $('#anx-time,#anx-staff,#anx-cat').on('change', ()=>{ if(typeof renderAnalysis==='function') renderAnalysis(); });
  // clientName/Phone bindings now on to-* fields
  $(document).on('click', e=>{ if(!$(e.target).closest('.staff-autocomplete-wrap').length) $('#staffAcList').removeClass('open'); });
// Autocomplete on the task-order form
$(document).on('input', '#to-name', function() { 
  if (typeof onStaffNameInput === 'function') onStaffNameInput(); 
});
$(document).on('keydown', '#to-name', function(e) { 
  if (typeof onStaffNameKeydown === 'function') onStaffNameKeydown(e); 
});
$(document).on('blur', '#to-name, #to-phone', function() { 
  if (typeof checkCustomerDebt === 'function') checkCustomerDebt(); 
});
  $('#debtCustomerPhone').on('input', function(){
    const v=$(this).val().replace(/\D/g,''); $(this).val(v);
    if(!v.length){$(this).css('border-color','');$('#debtPhoneError').hide();}
    else if(v.length===11){$(this).css('border-color','var(--green)');$('#debtPhoneError').hide();}
    else{$(this).css('border-color','var(--red)');$('#debtPhoneError').show();}
  });
  $('#edit-phone').on('input', function(){
    const v=$(this).val().replace(/\D/g,''); $(this).val(v);
    $(this).css('border-color',!v.length?'':v.length===11?'var(--green)':'var(--red)');
  });
  if (typeof populateLoanStaffDropdown === 'function') populateLoanStaffDropdown();
}

document.addEventListener('keydown', e=>{ 
  if (e.key === 'Enter') {
    const card = document.querySelector('.card');
    if (card && card.style.display !== 'none') login(e);
  }
});

/* ── MANUAL SUPABASE CONNECT — call this when you're ready ── */
function connectSupabase() {
  console.log('[IWI] Connecting Supabase...');
  if (typeof initFromSupabase === 'function') {
    initFromSupabase()
      .then(() => { if (typeof setupRealtimeSync === 'function') setupRealtimeSync(); })
      .catch(e => console.warn('initFromSupabase:', e));
  }
  if (typeof loadPricesFromSupabase === 'function') loadPricesFromSupabase();
  if (typeof refreshStaffFromSupabase === 'function') {
    refreshStaffFromSupabase().then(() => {
      if (typeof populateLoanStaffDropdown   === 'function') populateLoanStaffDropdown();
      if (typeof populateSalaryStaffDropdown === 'function') populateSalaryStaffDropdown();
    }).catch(() => {});
  }
  loadDashboardStats();
  console.log('[IWI] Supabase connected. Call connectSupabase() again to force refresh.');
}

/* ── TAB SWITCHING (overrides file-2 version) ── */
function hidePanels() {
  document.querySelectorAll('.tab-panel').forEach(p=>{ p.style.display='none'; });
}

function switchTab(tab) {
  hidePanels();
  const panel = document.getElementById('panel-'+tab);
  if (panel) {
    panel.style.display='flex';
    // Scroll the panel itself to top (panel has overflow-y:auto, not the window)
    panel.scrollTop = 0;
    // Also scroll any inner scrollable containers to top
    panel.querySelectorAll('[style*="overflow-y"]').forEach(el => { el.scrollTop = 0; });
  }
  // Also reset the workspace container scroll
  const wsContainer = document.getElementById('tab-panels-container');
  if (wsContainer) wsContainer.scrollTop = 0;
  // And the workspace itself
  const ws = document.getElementById('workspace');
  if (ws) ws.scrollTop = 0;

  document.querySelectorAll('.sidenav__item[data-tab]').forEach(el=>el.classList.remove('sidenav__item--active'));
  const ai = document.querySelector('.sidenav__item[data-tab="'+tab+'"]');
  if (ai) ai.classList.add('sidenav__item--active');
  const mod = document.getElementById('topbar-module-label');
  if (mod && TAB_LABELS[tab]) mod.textContent = TAB_LABELS[tab];

  const show = id=>{ const el=document.getElementById(id); if(el) el.style.display='block'; };
  const hide = id=>{ const el=document.getElementById(id); if(el) el.style.display='none';  };

  if (tab==='orders') {
    show('order-list-screen'); hide('staff-orders-screen'); hide('order-profile-screen');
    if(typeof renderOrdersTable==='function') renderOrdersTable();
    if(typeof _cacheStale==='function'&&_cacheStale('orders')&&typeof refreshOrdersFromSupabase==='function')
      refreshOrdersFromSupabase().then(()=>{ if(typeof renderOrdersTable==='function') renderOrdersTable(); }).catch(()=>{});
  }
  if (tab==='outstanding') {
    show('os-main'); hide('os-profile');
    if(typeof renderOutstandingTable==='function') renderOutstandingTable();
    if(typeof updateAlumniBadge==='function') updateAlumniBadge();
    if(typeof populateLoanStaffDropdown==='function') populateLoanStaffDropdown();
    if(typeof _cacheStale==='function'&&_cacheStale('loans')&&typeof refreshLoansFromSupabase==='function')
      refreshLoansFromSupabase().then(()=>{ if(typeof renderOutstandingTable==='function') renderOutstandingTable(); }).catch(()=>{});
  }
  if (tab==='reports')  { show('staff-cards-screen'); hide('staff-report-page'); if(typeof renderStaffCards==='function') renderStaffCards(); }
  if (tab==='salary')   { show('salary-main-screen'); hide('salary-profile-screen'); if(typeof _drawSalaryGrid==='function') _drawSalaryGrid(); }
  if (tab==='staff')    { if(typeof renderAdminStaffList==='function') renderAdminStaffList(); }
  if (tab==='analysis') { if(typeof renderAnalysis==='function') renderAnalysis(); }
  if (tab==='admin')    { if(typeof loadPricesFromSupabase==='function') loadPricesFromSupabase(); }
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function initSidenav() {
  document.querySelectorAll('.sidenav__item[data-tab]').forEach(item=>{
    item.addEventListener('click', function(){ switchTab(this.dataset.tab); });
  });
}

/* ── TOPBAR DATE + GREETING ── */
function updateTopbarDate() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}
updateTopbarDate();
setInterval(updateTopbarDate, 60000);

function updateGreeting() {
  const el = document.getElementById('greeting');
  if (!el) return;
  const h = new Date().getHours();
  const s = h>=5&&h<12?'Good morning':h>=12&&h<17?'Good afternoon':h>=17&&h<21?'Good evening':'Good night';
  const name = window._loggedInName || localStorage.getItem('incline_admin_name') || 'Gerald';
  el.innerHTML = s + ', <strong>' + name + '</strong>';
  // Update topbar avatar initial
  const av = document.getElementById('topbar-avatar');
  if (av) av.textContent = name.charAt(0).toUpperCase();
}
setInterval(updateGreeting, 60000);

// ══════════════════════════════════════════════════
// EYE TOGGLE — show/hide any password field
// ══════════════════════════════════════════════════
function togglePwdEye(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  var isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  // Swap icon
  var icon = btn ? btn.querySelector('i') : null;
  if (icon) {
    icon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  }
  // Keep focus on input
  inp.focus();
  // Move cursor to end
  var v = inp.value;
  inp.value = '';
  inp.value = v;
}

// ═══════════════════════════════════════════════════════
// ADMIN NAME — edit once, updates everywhere instantly
// ═══════════════════════════════════════════════════════
function saveAdminName() {
  var inp = document.getElementById('adminNameInput');
  if (!inp) return;
  var name = (inp.value || '').trim();
  if (!name) { showToast('Please enter a name'); return; }
  // Persist
  localStorage.setItem('incline_admin_name', name);
  window._loggedInName = name;
  // Update avatar initial
  var av = document.getElementById('topbar-avatar');
  if (av) av.textContent = name.charAt(0).toUpperCase();
  // Update welcome overlay span
  var wn = document.getElementById('welcome-name');
  if (wn) wn.textContent = name;
  // Update dashboard greeting
  updateGreeting();
  // Show tick
  var st = document.getElementById('adminNameStatus');
  if (st) { st.style.display = 'block'; setTimeout(function(){ st.style.display = 'none'; }, 2500); }
  showToast('Name updated to ' + name);
}

function _initAdminNameInput() {
  var inp = document.getElementById('adminNameInput');
  if (!inp) return;
  inp.value = localStorage.getItem('incline_admin_name') || window._loggedInName || 'Gerald';
}


/* ── DASHBOARD STATS — only called via connectSupabase() ── */


function fmt(n) {
  if(n>=1000000) return '₦'+(n/1000000).toFixed(1)+'M';
  if(n>=1000)    return '₦'+(n/1000).toFixed(0)+'K';
  return '₦'+n.toLocaleString();
}

async function loadDashboardStats() {
  try {
    const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    // Use _sbFetch (works with our existing API key setup)
    const orders = await _sbFetch('orders?select=subtotal,balance,status&order=created_at.desc').catch(()=>null);
    if (orders && Array.isArray(orders)) {
      const rev = orders.reduce((s,o)=>s+(parseFloat(o.subtotal)||0),0);
      set('stat-revenue', fmt(rev));
      set('stat-revenue-delta', orders.length+' total tasks');
      set('stat-orders', orders.length);
      set('stat-orders-delta', orders.filter(o=>o.status==='In Progress').length+' in progress · '+orders.filter(o=>o.status==='Cancelled').length+' cancelled');
    }
    const staff = await _sbFetch('staff?select=id').catch(()=>null);
    if (staff && Array.isArray(staff)) {
      set('stat-staff', staff.length);
      set('stat-staff-delta', 'Registered staff members');
    }
    const loans = await _sbFetch('loans?select=balance,status').catch(()=>null);
    if (loans && Array.isArray(loans)) {
      const active = loans.filter(l=>l.status!=='Paid');
      set('stat-loans', fmt(active.reduce((s,l)=>s+(parseFloat(l.balance)||0),0)));
      set('stat-loans-delta', active.length+' active loan'+(active.length!==1?'s':''));
    }
  } catch(e) { console.warn('Dashboard stats error:',e); }
}

/* ── TASK ORDER MODULE ── */
const TO_SERVICES=['Agbada (Sewing)','Agbada (Cutting)','Senator (Sewing)','Senator (Cutting)','Kaftan (Sewing)','Kaftan (Cutting)','English Suit (Sewing)','English Suit (Cutting)','Native Shirt (Sewing)','Native Shirt (Cutting)','Trouser (Sewing)','Trouser (Cutting)','Gown (Sewing)','Gown (Cutting)','Skirt (Sewing)','Skirt (Cutting)','Blouse (Sewing)','Blouse (Cutting)','Jumpsuit (Sewing)','Jumpsuit (Cutting)','Babban Riga (Sewing)','Babban Riga (Cutting)','Babaringa (Sewing)','Babaringa (Cutting)','Cap','Embroidery','Alteration','Other'];
let toServicePrices={}, toServiceRows=[], toStatus='In Progress';
// Receipt number starts from the next sequential number based on saved orders
let toReceiptNum = (function() {
  try {
    const orders = JSON.parse(localStorage.getItem('incline_orders')) || [];
    if (!orders.length) return 'REC-001';
    const nums = orders
      .map(o => o.receiptNumber)
      .filter(r => r && r.startsWith('REC-'))
      .map(r => parseInt(r.replace('REC-', '')) || 0);
    const next = nums.length ? Math.max(...nums) + 1 : orders.length + 1;
    return 'REC-' + String(next).padStart(3, '0');
  } catch(e) { return 'REC-001'; }
})();

function toUpdateReceipt(){
  const taskId=(document.getElementById('to-task-id')||{}).value||'';
  const label=taskId.length===6?taskId:toReceiptNum;
  const b=document.getElementById('to-receipt-badge'); if(b) b.textContent='Receipt #'+label;
  const i=document.getElementById('to-inv-receipt');   if(i) i.textContent='Receipt #'+label;
}
function toSetStatus(btn){
  document.querySelectorAll('.to-status-pill').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active'); toStatus=btn.dataset.status;
}
function toAddService(){
  const idx=toServiceRows.length;
  toServiceRows.push({id:idx,service:'',price:0,qty:1});
  const container=document.getElementById('to-services-list');
  const div=document.createElement('div');
  div.className='to-svc-row'; div.id='to-svc-'+idx;
  // Build options from live SERVICES array (synced with admin prices)
  const opts=SERVICES.map(s=>'<option value="'+s.name+'" data-price="'+s.price+'">'+s.name+' — ₦'+s.price.toLocaleString()+'</option>').join('');
  const optGroups={};
  SERVICES.forEach(s=>{
    if(!optGroups[s.cat]) optGroups[s.cat]=[];
    optGroups[s.cat].push('<option value="'+s.name+'" data-price="'+s.price+'">'+s.name+' — ₦'+s.price.toLocaleString()+'</option>');
  });
  const groupedOpts=Object.entries(optGroups).map(([cat,items])=>'<optgroup label="'+cat+'">'+items.join('')+'</optgroup>').join('');
  div.innerHTML='<select onchange="toServiceChange('+idx+',this)"><option value="">— Select Service —</option>'+groupedOpts+'</select>'
    +'<input type="number" min="1" value="1" oninput="toQtyChange('+idx+',this)" title="Quantity"/>'
    +'<span class="to-svc-subtotal" id="to-svc-sub-'+idx+'">₦0</span>'
    +'<button class="to-svc-remove" onclick="toRemoveService('+idx+')" title="Remove"><i class="fa-solid fa-xmark"></i></button>';
  container.appendChild(div); toCalc();
}
function toServiceChange(idx,sel){
  const name = sel.value;
  const opt = sel.options[sel.selectedIndex];
  const price = opt ? (parseFloat(opt.getAttribute('data-price')) || 0) : 0;
  toServiceRows[idx].service = name;
  toServiceRows[idx].price = price || (SERVICES.find(s=>s.name===name)||{price:0}).price || 0;
  toCalc();
}
function toQtyChange(idx,input){ toServiceRows[idx].qty=parseInt(input.value)||1; toCalc(); }
function toRemoveService(idx){ const el=document.getElementById('to-svc-'+idx); if(el) el.remove(); toServiceRows[idx]=null; toCalc(); }
function toCalc(){
  const active=toServiceRows.filter(Boolean); let subtotal=0,itemCount=0;
  active.forEach(row=>{ const sub=(row.price||0)*(row.qty||1); subtotal+=sub; if(row.service) itemCount++;
    const el=document.getElementById('to-svc-sub-'+row.id); if(el) el.textContent=sub>0?'₦'+sub.toLocaleString():'₦0'; });
  const deduction=parseFloat((document.getElementById('to-deduction')||{}).value)||0;
  const advance=parseFloat((document.getElementById('to-advance')||{}).value)||0;
  const total=Math.max(0,subtotal-deduction-advance);
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('to-inv-items',itemCount); set('to-inv-subtotal','₦'+subtotal.toLocaleString());
  set('to-inv-deduction','−₦'+deduction.toLocaleString()); set('to-inv-advance','−₦'+advance.toLocaleString()); set('to-inv-total','₦'+total.toLocaleString());
}
function toPrint(){
  // Read directly from the New Task Order (to-*) form fields
  const services = toServiceRows.filter(Boolean).filter(s => s.service);
  if (!services.length) {
    showToast('⚠️ Add at least one service before printing.');
    return;
  }

  const taskId   = (document.getElementById('to-task-id')       || {}).value || '';
  const recLabel = taskId.length === 6 ? taskId : toReceiptNum;
  const name     = (document.getElementById('to-name')          || {}).value || '—';
  const phone    = (document.getElementById('to-phone')         || {}).value || '—';
  const orderDate= (document.getElementById('to-order-date')    || {}).value || new Date().toLocaleDateString();
  const dueDate  = (document.getElementById('to-due-date')      || {}).value || '—';
  const bankName = (document.getElementById('to-bank-name')     || {}).value || 'Not provided';
  const bankAcct = (document.getElementById('to-bank-acct')     || {}).value || 'XXXXXXXXXX';
  const bankAcctN= (document.getElementById('to-bank-name-acct')|| {}).value || 'Not provided';
  const deduction= parseFloat((document.getElementById('to-deduction')||{}).value) || 0;
  const advance  = parseFloat((document.getElementById('to-advance')  ||{}).value) || 0;
  const subtotal = services.reduce((a, s) => a + (s.price * s.qty), 0);
  const total    = Math.max(0, subtotal - deduction - advance);

  // Populate thermal receipt
  $('#receipt-date').text(orderDate);
  $('#receipt-staff').text(toStatus || 'N/A');
  $('#receipt-task-id').text(taskId || '—');
  $('#receipt-number').text(recLabel);
  $('#receipt-customer-name').text(name);
  $('#receipt-customer-phone').text(phone);
  $('#receipt-due-date').text(dueDate);

  let itemsHtml = '';
  let itemCount = 0;
  services.forEach(function(s) {
    const lineTotal = (s.price || 0) * (s.qty || 1);
    itemsHtml += '<div class="thermal-item"><div class="thermal-item-name">' + s.service + '</div>'
      + '<div class="thermal-item-line"><span>' + (s.qty||1) + ' × ₦' + (s.price||0).toLocaleString() + '</span>'
      + '<span>₦' + lineTotal.toLocaleString() + '</span></div></div>';
    itemCount += (s.qty || 1);
  });
  $('#receipt-items-list').html(itemsHtml);
  $('#receipt-item-count').text(itemCount);
  $('#receipt-subtotal').text('₦' + subtotal.toLocaleString());

  if (deduction > 0) { $('#receipt-discount-row').show(); $('#receipt-discount').text('−₦' + deduction.toLocaleString()); }
  else { $('#receipt-discount-row').hide(); }
  if (advance > 0) { $('#receipt-advance-row').show(); $('#receipt-advance').text('₦' + advance.toLocaleString()); }
  else { $('#receipt-advance-row').hide(); }

  $('#receipt-total').text('₦' + total.toLocaleString());
  $('#receipt-balance').text('₦' + total.toLocaleString());
  $('#receipt-bank-name').text(bankName);
  $('#receipt-account-number').text(bankAcct);
  $('#receipt-account-name').text(bankAcctN);

  // Make receipt visible for printing, then print
  var receiptEl = document.getElementById('thermalReceipt');
  if (receiptEl) {
    receiptEl.style.visibility = 'visible';
    receiptEl.style.left = '0';
    receiptEl.style.zIndex = '99999';
  }
  setTimeout(function() {
    window.print();
    // Hide again after print dialog
    setTimeout(function() {
      if (receiptEl) {
        receiptEl.style.visibility = 'hidden';
        receiptEl.style.left = '-9999px';
        receiptEl.style.zIndex = '-1';
      }
    }, 500);
  }, 300);
}
function toClear(){
  // Show confirmation modal with blurred background
  var modal = document.getElementById('clearFormModal');
  if (modal) { modal.style.display = 'flex'; return; }
  _doClearForm(); // fallback if modal not present
}
function _doClearForm(){
  lockCalcStaffFields(false); // unlock fields locked by autofill selection
  ['to-name','to-phone','to-task-id','to-bank-name','to-bank-acct','to-bank-name-acct','to-notes','to-deduction','to-advance'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const list=document.getElementById('to-services-list'); if(list) list.innerHTML='';
  toServiceRows=[]; toStatus='In Progress';
  document.querySelectorAll('.to-status-pill').forEach(p=>p.classList.remove('active'));
  const prog=document.querySelector('.to-status-pill--progress'); if(prog) prog.classList.add('active');
  toReceiptNum=getNextReceiptNumber(); toUpdateReceipt(); toCalc();
}

/* ── INVENTORY HELPERS ── */
function filterTasks(filter){
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.querySelector('.filter-btn[onclick="filterTasks(\''+filter+'\')"]'); if(btn) btn.classList.add('active');
}
function closeModal(){ const m=document.getElementById('staff-modal'); if(m) m.style.display='none'; }
function deleteStaffTask(){ alert('Delete staff record — wire to Supabase.'); }
function editStaffTask()  { alert('Edit coming soon.'); }
function viewFullHistory(){
  // Close the modal and navigate to the staff's full order screen
  var modal = document.getElementById('staff-modal');
  if (modal) modal.style.display = 'none';
  // Get the name from the modal header
  var nameEl = document.getElementById('modal-name');
  if (nameEl && nameEl.textContent) {
    switchTab('orders');
    openStaffOrdersScreen(nameEl.textContent.trim());
  }
}


/* ================================================================
   PART 2 — File-2 Supabase modules (orders, loans, salary,
   staff, tracker, analysis, admin prices, realtime sync)
   NOTE: switchTab and doLogin from this file are intentionally
   shadowed by Part 1's versions above.
   ================================================================ */
/* =================================================================
   scripts.js  —  Incline Cal Admin Panel
   Auto-extracted: all inline <script> blocks preserved in order
   ================================================================= */

/* ─── Script Block 1 of 12 ─── */
// ════════════════════════════════════════════════════════════════════
//  VERSION CONTROL + AUTO-UPDATE SYSTEM
//  — Change APP_VERSION whenever you edit and redeploy this file.
//  — All connected users will silently get the new version within
//    60 seconds without losing any Supabase data.
// ════════════════════════════════════════════════════════════════════
var APP_VERSION = '2025-06-01-v1'; // <-- bump this string on every edit

// Keys we're allowed to wipe on version upgrade (only local caches,
// never Supabase data — that lives in the cloud and is always safe)
var CACHE_KEYS = [
  'incline_orders',
  'incline_manual_debts',
  'incline_prices_v2',
  'incline_staff_profiles',
  'incline_migrated_v1'
];

(function () {
  var stored = localStorage.getItem('incline_app_version');
  if (stored && stored !== APP_VERSION) {
    // New version deployed — wipe local caches so fresh data is pulled
    // from Supabase on next init. Auth is NOT wiped — user stays logged in.
    CACHE_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    localStorage.setItem('incline_app_version', APP_VERSION);
    // One clean reload to apply the new HTML/JS
    location.reload(true);
    return; // stop rest of script executing on old DOM
  }
  if (!stored) {
    localStorage.setItem('incline_app_version', APP_VERSION);
  }
})();

// ── Live version-check: poll every 60 s to detect when YOU redeploy ──
// Uses a HEAD request so it's ultra-lightweight (no body downloaded).
// If the server returns a different ETag/Last-Modified, all users see
// a subtle green toast and the page reloads cleanly.
var _versionCheckURL   = location.href.split('?')[0]; // bare URL, no query
var _versionCheckEtag  = null; // we'll populate this after first check
var _versionReloading  = false;

function _initVersionEtag() {
  fetch(_versionCheckURL, { method: 'HEAD', cache: 'no-store' })
    .then(function (r) {
      _versionCheckEtag = r.headers.get('etag') || r.headers.get('last-modified') || '';
    })
    .catch(function () {});
}

function _pollForNewVersion() {
  if (_versionReloading || document.hidden) return;
  fetch(_versionCheckURL, { method: 'HEAD', cache: 'no-store' })
    .then(function (r) {
      var tag = r.headers.get('etag') || r.headers.get('last-modified') || '';
      if (_versionCheckEtag && tag && tag !== _versionCheckEtag) {
        _versionReloading = true;
        _showUpdateBanner();
      }
    })
    .catch(function () {});
}

function _showUpdateBanner() {
  // Show a non-intrusive banner, then auto-reload in 4 s
  var banner = document.createElement('div');
  banner.id = 'incline-update-banner';
  banner.style.cssText = [
    'position:fixed','bottom:80px','left:50%','transform:translateX(-50%)',
    'background:linear-gradient(135deg,#059669,#10B981)',
    'color:#fff','padding:14px 26px','border-radius:50px',
    'font-family:DM Sans,sans-serif','font-size:13px','font-weight:700',
    'box-shadow:0 8px 32px rgba(16,185,129,0.45)','z-index:99999',
    'display:flex','align-items:center','gap:10px',
    'animation:fadeUp 0.35s ease'
  ].join(';');
  banner.innerHTML = '<span style="font-size:18px;">✨</span> New version available — updating now…';
  document.body && document.body.appendChild(banner);

  setTimeout(function () {
    CACHE_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    localStorage.setItem('incline_app_version', APP_VERSION);
    location.reload(true);
  }, 3500);
}

// Start polling after DOM is ready
window.addEventListener('load', function () {
  _initVersionEtag();
  setInterval(_pollForNewVersion, 60000); // check every 60 s
});

// Also check the moment the user switches back to this tab
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) _pollForNewVersion();
});

/* ─── Script Block 2 of 12 ─── */
const supa = supabase.createClient(SUPA_URL, SUPA_KEY);
const INCLINE_LETTERHEAD_B64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAC+A2ADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9CX+ZW/3aPu/L/F96gfM21v8AgVA+YNWRYz5lRV/4DuqVfl2tt/8A2abLuVdy/wDfNG3+7825qAG7WUrt/i+9Um7b/DRF837xl+Zlodd3zf7u6gBVX5Nu373/AKF/laG+X/gVCSc/+O0bVZ9rf71ADkXhvl/vbaB8z7tv3aEb5l/75o+VT/stQAN91F/vNt3U77yKv3aaqt/q/wCLd8v+9R93bu/3aAHbtqeZ/wB80qLt+X/gVJG20fN/u0R/N935v/iaAFdv3u3b8u2nP8vzK3y7v++aaW3Mvy/dSnI1ADnbiP8AhXdtamt/e/u/LTj8sS/7tNZto+Zfm+7QA+P+Jf7tL/F97bu+aoy22T/x2nheP9pf/HqABm+dV2/d/ip25dyrQ33t3y/MtCLuRW2/wruoAEO7c1OZuaarfIu3q3y05VXerbvur81AB/C22jd8ysy/L/F/8VTf+WSq3y/NTj/e/hoAX7o+7/vUbvl3f3aRt2V/3ttKfmx8v93cu371AAPmVl20Ftu3/aagfK+6hv8Ax1aAEmbbtVfvNT93lhf/AEGhl3bt1Crt+Zm+992gAVlXav8Aep+35fu0zu33f4aczfIrL/wJaAFTr/49Q7bW/wBmkT5ZfvUP82KABV3H738NDLuVfl/+yoRtzNu/2qP/AEFm3UACfd/3t1KP9373/oNIn3floX/e/wBr/gNAB/s7aX/lnupEXdS7lztoAC3O1fvUD73/ALLSN/e/i20rfKFb+8tACjrS9/wpv8St/s04Lz/wLdQAn8Py0qfMWpq/LuVv91aN38VADkb7v+1QOu1v722m7lV/moH3fm+9toAPuhV/ianL8v8A3ytN/jVqc331b/ZoAb/d/wBpad+X96mhdvyt/wABpw/i3f8AAaAB2/h/u/M1Ab/ZoVtzMv8AFt20i/eNACqv8P3qFb5Vamr8rbf++aEbaNu7+Hd81AEnfav8P8VDLt27f7tJS7vlVm+9QA3+DbTm/vf7tNTo27+H+KnK3zMrbfm+7QABeWX+981Ct87L/epqNuO2nH7u7/ZoAT+Ff96nUfdX/wAeoDfNQAn8C0JtU/8AAqVV2vto+6y0AFO+VWpo/u/xfdo+8qtu+9QAD5l3VInzNTfvfN/wKgfL/vNQAD7zN/dpw/vU0fxU773+6tAB/s0DrQm5k+b71Hbdu+WgA27f96gN96j+L726hem7/Z20AOG7NNf5WoLcUFt33qAF3f7P3aRV3GmuzbW2/eWnL1oAU9KX/wCJpn3grU5vm+9QAjfd/wCBUH+7QvzPuoLfe3f3aAA/L8tLuON1I/zNtb+7S/3f9mgBB92lZvkpE+UKtDdaABW5anf7NNPy/LQvWgBd3H+9Sdvxo+ZTto+63/AaAFPVqVf73/fNNZv/AEKlXp/tN92gBysuf+A0n3f+BNSJ03UJ8yfNQA4fMy0buduymq33vvfK1Sdv96gA+6q/3qb/ABUN8zLTm+ZvvfeoAb91acOtCt/8TQv8Tf3aAAfMv+9S/dTdSL8tL95dtAAPlanf7tN3f7NH3U+b/vqgDmd3O5vu/d/+yp3+y38VNX5v95aft53f3VZaAGfedPu/Lup+1cMrfwrSbdyr/d+9Sldw3bvmZVoARNsi7ZF/4DShtr7W+9/DR/00+9Tl+aVJP7tADSqxpuX733qd95N235W+am/M3+7Tk6L/AHWX/vmgA+XzdzfKy/xUOu37v8VG3522/dZdzLTm6bv9mgBfm3t8vy/doK+Z91fu7W/3qT721f8Avmhm2ru/vN8tAAm7YGWlhVcOq/d+9SL91lVv4t3/ANjTof8AZ/vUAIzMv7xfvfdWhvlVf9mjdx0/i205vuq391qAHJ/qV2/w0My7Gb5dqrTVXbBt3fxf+O0/dt3bv4vloARfup93ctPC/Lt/h3Uzb92npQAbtzNuX5vu05F+X/a+9Uf3m3bvu1JG23d/wLbQA3sr/wDAqcyqzbm6stDfL81Ab50b5fu/d/2qABdzFZFXdupzLu/76qONeG2//s09m+RV3UAIPmVm/hWlDfP97/ZpP93/AHttKvX/AD81AAfm+7/e2tQv3t3+9uo/utR2/u7aABPuLu+XbTn+UJTWb5trfdb5d1SL8yLQA1du7d/e/wDQqcdqrub+78tNi+/t/wCBU77rt/u0ACt8zL8v+zQv3m2/Nu+amjdsT+LatOHX71ACp+8b/PzUjqsjbf4d26hG2/N/s/LR93/gS7qAD+Bd33t1H3V3f7NN+bf838K05W+f/eXdQAr/AHVb/LUbdzbl/wB6hflCxq26iL+Jv4VoAHb+FdvyrQf4f/HqQ7mP3vl/u0qfe2/7Xy0AJ95dq/Ltp/8AGy/3vlpiN8nzfxNt3U9uv/j1ADe/+6tA+9uX/eoH8TL/AA0bf4t3zf5+WgAC/L/vLTmbj733vlprNTj91aABm+VdtG3duX/ao+7t20N03UAN27m3L/vU5v3aqtH/AALd81C7mTc33aAAfw/N/wDZUBfnZf71DdKP93+GgBq/cb+L+GgLz/e+ahvl2/71B+4zfd+WgBdysqs3/AaUdKa33tqrUg/4D92gAX+L+992mhmy1CNuoXod38LUAB3L/EvzN96nL97+78tNVm2ru+9u20tADt26KhPuu3+zR/d20D7tAAv/ANjQ23/x6j/ZpwbmgBv/ALNR/s0DtSp97d/FQAqfdb/app+YUo+9SJ8r/wANADun/AmpaYPmG2nfe+83+7QA7duRf4aXd8vzUn3vlWjdtagA3fNQ33N1AWgfcVf7vy0ANl+ahflRf9qjd83/AALbQn93+6zUAOP92j+LdTX60feX7tAAfl2/71O3f+O03+7/AL22nD5qAE/+Kp/dqjHzbf8Ax6nt95f92gBE+8v+7Qv3FofotOG3NADHpzLuXbSFvkpR0oAaPvN/vU5W/wBn+H5aON26k/h/4FQAfxf7VB+VVXd/FR82Vob727+792gAb7y/3d22nfe+Vf4aT/dpqfxf71ADv4OG/wB2nBeKav8AD/31Tty/98/KtADVXkt/wKnd/l/hWhf/ALKg/Kv3vmoAcfvLS/LUdSf3V3fNtoAYPl+8tOHWhfuUN2oASpPu0zd93/vmnfeVqACk+6P71G75vu0Haq0AcyPml2t/epV/eb/9laVfvfd+b+GiL5Xdd3zbvloAVGVt3+7Tk+X/AGv7tRD7nyt8y/xVOPvfd3bqAI9u1Nv+zTk+ZF/3aaitsZWb5lbctH3W+X7rNuoAd/rP3i/7zf7VDfMv935lWhWVQu1vvN/3zQjfL/47QAD7u373/wATTf8AZ+ZWVvlajduDL02/eob7it/Cv3aAHN97d/CvyrR821GVtzfxf7VCs21v95lofotADt21FX+JmpYlXLLt+8rNUQXc/wDwKpf4/vfdXdQAN97/AHfmpyN/8TTW++u1v9mheu1v7u5qAHQ/e+X73+1/FQ/3vl/vbv8Aeof5VX+Kh/lRW/76oAd95N38O6np8v8AtVEnzbv9lqe38O7/AHaABvvH/dp0TfL8397bTV/iX/gVO+792gBobci/N8zfeo3fL8u3d92hvu05vus33qAD+Lcv+8y08fe3My/LTF+Z2X+HdT1+9/u0AIV+b/ZZt1Kvyn+9/dpA339tBbd/FQAN95f++aVfm/z96kHzF/71KPlbb/e3UAI3zOv91Wp/y7vMZv8AdpN21lpPvHd8u1W3UACfeWpJv761HE235f4vmqQNuf71AAzbj/s/dprf3V+9toX7qrTt33v9qgBv977vzf8AjtPRvut/eXa1MdmZmX/gP+9T921VoAZ95NrfeWhPloP8P92jd83zfw0AC/Mqt/31Tvm2N2/ho27V2/8AAqaPutu/u0AO27ju3fdoPzNQdq7f9pqPvHd/FQAv93b/ABfNQv3dv8W6kXdsSl3fN/wGgA+8Fo+6Pvf7tMb5XXb/ABfep+75fu/7NACbfu/N/FupX6fNSNu2/M38K7ae3zf7VADfvIu7727dTvu7V/hb7v8As037w/3af/8AE0AM3fIv+9tanJ8ytQ3ahNqjdQADa25mb71O2ru6fxU1B/47Tvl3bqAGn5l2/wCzR22rt3UJ3oVtu7/vmgBvysq/726nbttG3d/D81Dfwr8tAAflXb/Fto+6q/3aB/6FQqr8zf7NAAv+d1O3c/e+9Td21tvy/L96nL8w/wDHqAD+FV3fxUtJ/u/epV/ioAR925f7tL/DuakbotL/AOy0AI3/AKCvzUrfd/z81H3v++aE77moAA3zCnBed396mhm2/wDAqd/u0AH3qE+638Py0iLwNtL937v+7QAH7yt/eo3f987qaflSnetAAnzL833qd/d/75pvf71OT727bQA3sv8AvUf8Bo+Xc395vmpw+ZKAG/wtQ23evzfL92gt93bTl+Y/7tAAi8KtAX/vmm/eztb+HdTv7rf3loAI+rfSgtQv3v8Ax6kb7lAC/Mo+X71JtVUVaVWX5m/4DR940AC7vkpT0oT7i76Fb5/vfw/LQAbvl+X+7SH5UWl+ZaRV4ZaABdys1DfeH+7Q3Wm/wbf71ADv73zf7VCf/ZUfeDUf6sbqAFX/AHacfmO5f+BU3d821f4ad/F/vfNQAD5qG+4y/wB6j+L/AIDQnzbmZqAD/Z+7/E1A+aj5vurQjf7NADh1/wCA0fxq1NWloAUdaVfuszUnf8adu+X/AMdoAQfKWoZWVaF+/uo/vbv4aAOb+9Lu/wCedL/e+b/ZX/4qkH322t975qA20M3935V+WgBqR/N8v+9UqNu+X+LbTPlVmVm/2afF8rbv71ABJ027tvy0FeF/3fu0bd275v4t1CfeZU/h+Zf92gAXdIflb7q7f95qarM0W7+H7tPHy7dtc9458eeEfhn4dfxV401JrDS4547dp1gkm/eSfdXbGrN/eoMp1I0480vhN5v4W3fK1Ob+H5q8Qf8AbM/Zzj+X/hPJ/wDwVXf/AMbpIv2zP2c927/hPJf/AAUXf/xusvaROL+2MF/z8R7dt+ZWX+L5qdJ8yL/dVl/4FXjC/tjfs54/5Hyf/e/si7/+N09f2xv2ccru8dT/APgou/8A43R7SJP9sYL/AJ+xPZEX/vr71OibLOv+1Xib/tmfs5x/8z5P/wCCi7/+N01P2zv2c1LN/wAJ9Ku7/qFXf/xuj2kR/wBsYL/n7E9vHzJ8v8P8VCfKzf3d22ud+H3xC8I/FDw6virwTqhv9LaeS3WdoJIv3ke3cu2RVb+KuQ+Iv7UHwJ+EvipvBvxE8dLpOrrbR3jWzafczfuZN21t0cbL/C38VVzHdTqRqR5onqYX5vvf7VA/ut838Ncdc/F74b2PwsX41XHiRV8FyWkd8up/Zpm3QySLEreXt8z5pGVdu2qfws+PXwh+NU+pW/wx8ZRa1Lo8cMl4i2s0DRLJuVW2zRru+ZW+ZaOY1O9/i8v+8v3qevzRK3+ztrhfit8avhn8E9N07WPid4mXRrPVLlrW0la1mn8yRV8xl/cq235aufDH4rfD/wCMnhuXxV8N/ES6vpcN21i9yttNDtmVY2Zdsiq33ZF/76qwOuXdl1b5qG+VdrfxNXnfxa/aC+D/AMEYoP8AhZXjiz0m6uo/MgsY0knu5Y/7ywwq0m3/AGm+WuI8Fftzfsw+Otag0HTfiQtheXTrDAmr2M1hHKzfdVZpF8tW/wB5lqOYD3tW/e7mX5fu05/4W/vfLWX4j8QaP4R8P6l4q8RXX2PS9FtJL6+n8tpPKhjXdI21fmbaqt92vO/h3+1d+z/8VvFVv4J8A/EBNU1y6ikmgtf7PuYdyxr5kjbpI1X5VVv4qsD1odVoHzf980N91Vrzf4qftGfBn4I6npuk/E7xkuiXWrW0l1ZxtZ3E/mQxssbNuhjbb8396gD0hW+8392hOn+981cToPxq+GPiT4ZXXxk0fxQl14NsYrqa51NbaZVWO3bbM3ltH5jbdrfw/NWb8Mf2kPgj8ZNZuPDfw18eQazqVnafbJbb7LcQMsKsqtIvnRru+Zl+7/eqOYD0hfmLL/s0v/s33a5L4m/FTwH8HfDS+MPiN4gXSNIa5js/tLQSTfvpN21dsas38Lfw1U+FHxq+GPxusL/UPhf4qTXLfS547W8kS2mg8qSRdyr++Vf4Vb7tAHcfeXbu+b71Cfd2t/8AtV4M/wC3Z+ynDM8M3xUVXhkaORf7Iv8A7yttZf8AVf3qP+G7P2Tfvf8AC1l/8E17/wDGaOaIHvf8Ui/xU4f3a8I1X9tj9mXQ7XS9Q1L4leVBrVr9usZP7KvW8+386SLzPlh+X95DMu1vm+WvVfAPj7wn8TPCVh468F6suo6FqSSNbXflSQ7ljkaOT5ZFVl2tG33lo5gOg+9R90f8BryXwB+1d+z/APFDxXa+CfAfxCg1TW76OaSC0+w3MLSLHH5knzSRqv3VZvvVufFH49fCP4KzaXH8UPGUWiPrSzNYrJazzeasPl+Z/qY227fMX7396gDvn+UBqd/Cv+1XJ/Df4neBfi94c/4S74d65/a+kfaZLP7WttNEvnR7fMXbIqt8u5fm215p45/bg/Zh+H+py6LqnxKTUb61by500ezmv1jb+JWkhVo93+61HMB7q3393+zQv/2NeWfCf9pz4H/Gy6bS/hz4+tb3U40aRtNuYpLS78tfvMsMyq0ir/Ft3ba6j4lfFb4f/B3w/B4q+JHiBdG0ua6WxjuWtppd0zKzKu2NWb7sbfNt/hoA6vd8v+98q/7NCfKvl/8AfNeCS/t4fsmxn/krSf8Agnv9v/omu/8Ahp8ePg38YHlh+G/xG0bXrq3j3S2kErR3Ma/3mhkVZNv+1t20cwHfMzZVvvUBd25f7tc7458feEfhn4XvfG3jrWF0vRNPaP7TdNFJJ5XmSLHH8sas33mVflX+Kua+GH7SHwR+M2tXXh34Z+Ootb1Kxtft08C2dzD5cKyLHu3SRqrfNIv/AH1QB6Pu+T/e+7/u0u7b8396vM/if+0l8Ffgzrdn4d+JXjiDSNSvLX7dFB9luJ2+z7mj3fuY22/Mrfe/u10fgD4n+Bfih4S/4T7wT4gS/wBA3zQtqEsE1tFuh/1jfvlX5V/ib7vytQB038C/N/FTl/ur/F81fP3if9vT9lXwvqL6XN8SH1SWFvLkl0rTp7uBW/67LH5bf7ys1ekfC342/Cr40abNqXwz8aWWtpa7ftMEW6O5tt33fMhkVZFX/a27aOYDu93/AMTSfeO7+8tIitI22ONm20q/e27dtWA75cbdv3mpp6/8BoVvm/2WpW/ioAR/vbtv8VOb5k/u7vlpaQf6pWoAB8y7t3y0fc2rTV2qv92nBaABerf7tA/2v92nf3WqhrerR+H9B1LxBNZ3t6mm2c141tYwNPczrHG0nlwxr80kjbdqr/E1AF3d8vzUbvu14JeftQax4Ph1G3+K3wluvD2r/wDCPQ+JNH0yz1mG/kvo5ruKyjtJm8uNba5+1XNtGy/NH+8Zlkby2r0T4S+Pte+ImnajJ4g8GpoN1pt4tr5tjqseqabfKyq3mW13GsazbW3RyLtVo5FZf7rVNgO3/hZd3zfeo+98q/71eKH9pBY/2ev+F8SeEVVm1NtNXSvt33m/tj+zd3neX/20+7/s/wC1WX42/amk8B/282qeD7C/XRdP8VakrafrSy+ZHo09lEsMjeV+5lm+1/NH83lNHt+bd8pYD6BXr/vLSDrXlOiftNfB/VJPHTX3jDS9Ls/AOq2+k6heXd2qxySTQxNG0f8AvSSSRKv3maGTata+q/tAfA3QdA0nxVrHxa8K2Wka5FJNpl5Lqcax3scbKsjR/N83lsyq237v8W2qA75f4v8AZpa4T4u/FS3+GHwf1z4tabpsXiGDS7GG+tIILxY471ZJI449syqy7W8xW3KrfLXNaL8dte0HxU3g/wCPnw/tfh3cTaVfa1p+pxa9HqWl3drZbWu1aby4WhkhjZZGVo9rR7mVvlapsB7BS/erzfQvj58N/E3iFbPQfGXhm/0S4it4bPU7bWI5GudQmu5LZbZYVX7rSRqqzbtsjN5a/drS8VfGr4T+B4bq68XfEbQdJisdQ/sm5a5ulXy7zyI5/IZfveYsMkcjL/CrKzbaoDtvWlH/ALLXB/Ff4qWPw3+DniD4wabYxeIbPR9K/ta2itrtVjvo22+XtmVWXa25W3bW+WubsPjh4s8L+L7Hwn8ePhzpngZNU0jUtYsdVtfEq6lZeTYRxyXa3DNBC1v5cMiybtrK21vmVqAPYKcv/wBlXM6/8SPh74V83/hJvG2iaSsNjb6lK19eRxLHazTLFDMzN8qxyTfu1b+9WH4d/aE+Bfi7V9J0Hwz8XvCmralrnmf2bZ2upxyT3PlsyyKq7t2793J8v3vlagD0H/4rbS+led+OPjh4H8I/Dy8+IWm6xp2txtoGqeINHtoLxV/teGwtmnm8mTa38Krub5tu6tCT4xfDHTdEuNa8ReNtG0hdLttPm1WO5u1X7DJdxrJbwyf9NJFb5Y/vN8rbfmWgDtP4v+A0D+9/wGvMX/aC+H83iXwvp+j61peo+HPEmg61rzeJYtQX7JaQ6Y1ssyyNt2r/AMfDbmZl8vy23LWho/x6+CeveEtX8eaT8UvDk+g+H2jXVb77Uscdk0m3y/O3fMvmbl8v/npu+XdU2A77+JloT/7KvFPEP7XHwX0W88KXVr410PUfDXiS81DT7vXotQ/cabcW1os6wyLt3NLJ5ka+X8rLu+7XYa98dPgz4V0nQ9e8SfFLwzp+m+JIvtGj3U+pRrFfQ/L++jbd80fzLuk+6u5dzLVAd3/DQOlcgPi18MZvHS/DG38eaJL4tZGk/sVLtWu9qwrLuaNfur5bLJu/iVqw/jN8VvE3w5m8G6P4L8BweK9c8aa1JotnZ3Or/wBmxRtHaT3LSNN5Un8Nu3y7f4qAPSz0pa8f8NftIeG4NN8Uf8Los7L4bav4N1e10fU7a91aO9tpJrm2jubb7PPGq+d5kLbvL8tZF2tuX+Kug1/9oT4F+FdL0nWvEHxa8L2dnr1n9u0qVtSjZb63+750O3/WLu+Xcv3amwHe070ryaz/AGhvDetfs13v7S3hnTXv9LtfDV14g/s37SqyboIWkktpJFVlWRWXy2+9taui8S/EpfDniL4b+H5tDllX4hXN1brP5u37B5OnS3m7bt/ebvJ8v+H726iwHb+tO/P+9XnmkftCfAvXLbWb7Sfi14VurXw/Etxqc6alH5dtC0nlrMzfd8rzPl8xfl3fLuoT9oT4EyPoccfxe8KM3ibcujf8TOP/AE7bM0X7v5vmXzlaNW+6zLtX5qoD0H1py/e/8eriLX41fCO+8Xal4DtfiR4el8Q6Ok0l9pi30fnwLCu6bcv96Nf9Yv3o/wCLbWhf/E74caXp1vq2peOtDtbG80r+3oLmW8jjjk03dEv2tWb/AJZbriH959394v8AeoA6cf8A2VH97615f4D/AGkvhH8SvidqXwt8D+LdO1e90/R7fWI7uzuo5YrlZJJY5I49v3mh8lWZvu7Zo6xvFPx0+IDeIfFFj8Jfgy3jTSfAtz9h1y8fXFsJ575Yo5ZrTTofKk+0yxxyR7vMaJWkby1Zm3UAe0s38X/AaP8AZrwzxP8AtYeDPBOpabb+MbaLSoNb1rR9HsEnvFW/g+22X2lpL20ZfMtGh+VWjbczblavVbHxx4P1SHRLjTfFGm3SeJFmbRmiuVZdQ8tWkk8n/nptVWZtv3dtAG5/u/w05eteRfH79oPRf2fIPBureJNEuL3SvE3iGPRb66gk2/2Xb/Z5JZL1l2t5iRrDuk+7tj3N/DWlefGuGP4j6v8AD+10nTl/sfUfD9i19eausC3K6nHPJ/o6+W3mSr5G1Yd37zd8rLtoA9LX5TR901xOi/HL4K+IfFV74M0P4p+G73XNP+0farGDUFaSJYP+Phv7u2P+Jl+Vfm3VX074/fA/WvDeqeLtJ+LXhW60PQ5YYdR1CPU4/ItGmZVh85t3yrIzKqs3yt/DQB338O6nj/8AZryrT/2jPhbJomr+MtW8deF7LwrY6ja6fp+rprCzrfNcW0c8atGq7o5W8xtsPzM0a+Z91q9D8M+JPDvjLQbLxR4T1y01fSNSTzrW+s5VlhnX7vysv+1uWgDSHb5aE+bd/vUf8BoX+FaADd8i7v4aF+X5aFXc1H8VADl+bdQn/ju6m/dp/f8ACgBF+ZfmpR0pPvblpQvy0AC/3f4mobpRtFH3R8tAHNj+L5vvfdpUb5vmpknVfl3bf/HqWGPy127mO3d8zUAIWbeqr/wKpY/mamH/AFSNu+Zmp6dd38K0AHbctN+67bfut83+7ThtjUUfeLbf96gB3/LRv96vn79umTb+z3eKv/QZ0/8A4D8zV7/90fN/wFv9mvn39ur/AJN8vN3/AEGdP/8AQmrKp8J5Odf7lU9D84iu6pYo/wCKhF+Wn7dtcJ+GVJS+Ek3+9G/2qPcKZ/FQZag/7w0xo9tTBf8AZpyx7ulWaqpyn6J/sGLt/Z8i/wCw1qH/ALTr41/4KQR7f2nJWb+Lw1pf/tWvtH9hRVj+AES/9RrUP/adfGf/AAUo2r+02/8A2LWl/wDtWuj7B+5ZJ72Cpeh774skZf8AgllZ/wDYq6f/AOnGKvlL9h74qL8L/wBo3w815deVpfijd4dvmZvl/wBI2/Z2b/duFh/4CzV9UeL5v+NV1l/2K+m/+nOKvzXT7Vu+2WrSo1uyss8f/LKT/lm27+Fty/8AjtEvsnrn6O/8FVfm+GngP/Z8S3C/+SjV0n/BM28t9P8A2bNc1C43eRZ+JtQuJdv91bS2Zv8Ax1a8n/bV+IEPxe/ZK+CnxIWRWuNY1ORr5V/5Z3kdpJHcL/3+jkr0j/gnrtX9knxyv93Vda/9N0FX9oD4a1Gbxt+0z8akka4SfxJ4+1hY4muXZYoFkb93Hu/hihjX+H+GOtj9pz9lnxN+zXf6HDrniCw8Qad4iim+zXlrA0O2aHb5kMkbbv4ZI2Vt3zbv4dtW/wBjVv8AjJ/4Wf8AYZVf/JaWv0v/AGh/2Y/A/wC0hp+g2PjTVtbsE8Py3FxbNpUsMbSNMsat5nmRyf8APNfu/wB6pjHmA8G+CvxK1j4hf8E5vG/9vXkt5f8AhnQdc0Fp5W3SSQw23mW+5v4mWGZY/wDtnXzD/wAE82/4yz8Kf9g/Vl/8kpK+39a+AfhH9nn9kn4seC/Buqatf2V9ourapI+pyRySLI1l5e1fLjVdu2Ff4a+Hv+CeXy/tZ+Ev+vHVv/SKWq+0B+vw/wBXX5wf8FVYf+LifDmT/qA6h/6Ux1+j5/1a7v71fnR/wVYVV8efDf8A7AOof+lMdOfwgdz8DmVf+CX/AIt/7BXib/0dJXxl+zf8Uv8AhTfxw8JeOprgxadb3y2ep/7Vjcfupt3+6reZ/vRrX2R8E/m/4JfeL9v8OmeJv/R0lfnE6tcRyqsbOix/vNv8K7tvzf8AAmX/AL6rOX2QP1M/4Kb/ALz9mZfmVlXxRpu1l+63yz1xP/BJpt3hL4hw/wB3xBpv/oiSuP8AjT8Sm+LH/BNrwhr11defqem+INN0PU2b732i2WWPc3+00fkyf9tK7f8A4JM2+3wr8Q/l3f8AE80v/wBJ5af2gPhTw14Vm8bfEuw8D2t9FZT+IPEK6XHcyozRxNNc+WsjKvzMq7q+u3/4JW/EDlW+NHhf/wAFVz/8VXy18MdSsdF/aC8KaxrF9BZWGn+NbW4u7meTy4oIVv1ZpGZvuqq7mr9d/wDhpr9nHLf8X28C/wDg8t//AIqlCMZAfnH+2T8BdU+Bvg34O+HdU1q11e4s9O1jS5b60gaGGTbe/aY12t83yrdsv/Aa+lv2U/GjeG/+CefiHxJ52H8M2PiSNG/uyfvJI/8Ax6ZaT/gp7o9rrHwU8F+MLFknisfEaqk6NuVobm0kZWVv7reTH/47XhXw58af2T/wTi+Kei+ZtluPF9vpsa/7Nz9ikb/x2GSn8MgPG/2S/ES+D/2mfhpqjSbIm1mPS5W/2bmNrb/2ste9/wDBVHVGb4l/D7R1b/jz0C8umX/rtc7f/aNfIKf2p4RufDXjjbsia+/tCxkX+JrS4j3f+PLX0r/wU41y31L9o2yjhkVorPwlYtH/ANtJrmX/ANBZaS2A7XV/GmrfCX/gmh4N0/QbqWyv/iFq91ayzxNtkW1muLmSba38O6O3jj/3ZGrwf9nH9lXxd+0td63/AGD4g03w/pfh9YY7m8u4JJt0027y444127vljZmbcu35f71e4ftjaHJ4Z/Yt/Z70Nl2Na/ZWkX/ppJpjSN/49I1d/wD8EqY/O8AfEhv+o5Yr/wCSzUcvvAfDnjzwX48/Zv8AjHdeG5NYS28S+EbqG8s9R0922tuVZbeePd821lZdyt/tK1feX7e3i6Pxx+xt4B8ceSsDeItV0XUmiX7sbTWE8jKv+yrM1fM3/BRGPyf2qfErf9QzSf8A0kjr2X9qybzP+Cd3wWbd/F4f/wDTdPVAeD/s4/sm61+0xo/iPVNF8dad4f8A+Edube1eK6sZJ/P86ORlZWVl2/6uvMfHnhXx9+zX8YrzQ11hLPxV4NvIbi11HT5W8tt0aywyRs21trKy7lb+8ytX1t/wTb+KHw18A+GfiHZ+PPH3h/w5Lfahps1omp6hDbNOqwyqzR+Yy7tu5f8AvqvnT9snx94Z+Jn7Q/jDxl4N1CK/0RltbO0vE/1dz9nto45JI/7y+YrbW/iWp6AfoJ+154oj8bfsMat4yjhWJde0rQdU8tfup59zbSbf+A7q+cf+CWu1fjj4q3MFX/hEpNzM21VX7XbV7f8AtEafdaD/AME5LPR76Noriz8NeGYZUZfmVlmtNy18K/BT4oyfC3RPibe6feeTq/iLwk3h3TWU7ZPMubuBZmX/AHYFmb/eVab35gNj46+LtY/aa/aU1S68Jq14/iLWYdB8PR/w/ZY2WC3b/ZVvmmb/AHmr6Z/b81aP4F/s9/Df9nXwPdPa6TqHmW99IjbWu7W0WNmVv+u1xMsjf3ttch/wTH+F+k+JPiP4j+JV9JA7+C7OG1061/iW4u1kXz9v91YY5I1/2pP9mu2/4Kr+CdUvvBfgX4gWdu72eg6jeabfSKv+qW5WNoWb+6u63Zf95l/vUo7cwHz7+zr+xT42/aO8Caj460nxhpPh+zt7yTTdPjvLaSVru4jVWk3Mrfu413Ku75m+98vy155+z/4y8UfBX9orwzfWtw9reWPiGPQ9VgR/llt5LjyLmFv7y/eZf9pVavoz/gn7+198P/hT4buvg78UtQ/sSzk1OTUtI1qRWa2jaZV8y3uGX/V/Mu5ZPu/M27bX1zpv7Hv7KeuapF8QNL+Hem39xfXn9sQanBq9zNHPM0nm+dGyzeWy+Z83y/LTjEDyr9of4k+KF8R+JrqbVoYNP8P6jqWm6fpt5qd7YWi/2dp1peySN9imhkku7lrvbG0kjLDHDujjaRmr6C+Cera8y+K/BOva9da83hHU7e1s9VuzuuZ7W5soLuOG4Zf9ZLD9oaNpPvMqxs3zM1XPFPwb0fxJr954q0/xBq3h/UdUW3XUmsUtJ4L5of8AUyTW93BND5sa/Ksyqsm3au5lVVXpPB/g3Q/Auj/2LocdwyyTyXl3dXc7T3N7dSNuknuJG+aSRm/i/wBlVXaqqq6AbfdW/vLTezf980qblRV/ipF+4zf7NWA7+L/PzU35sfN937tG3n733m3U5fvf71ADW+83+zTj0/4DSfx7f9nbSp8ystAAOn/AqzvE+peItJ8MavqnhDQV1rXLOxmm07TGnWBbu6WNvLjaRtqxqzbdzN/DWjt3D/x6qurw61caPew+GdQsrLVpIGWzuby2a5gim/haSFZI2kX/AGVZf96gD5Mf4N/F34lfDrxfp3xH+El1L468QDS9W1PWte1zTpLTWWsL+K5TQ4IbaSRrSyZVlVd3y7pN0m5mavYfgB4J1fwrr3jvxVc/Dy1+HujeKNQ0+bTfCsEtsfs32e2WKe7kW0ZreOSdtvyxs3ywxs3zNXEeFPjZ8YNJ1LxXrXxc8aeC38PeEfGMng1tP0Pwje/2lrN40EDW8dov2ub97JJcxqsPlyfLG3zL95erP7QFt4i8c+AvDfhO2ubePWtb1bRfEWm6xps1tqenyWulSXqR+VJtaNm/ctu+ZXjkXbQQePn9jLRB8AfLHwh8Nv8AFlda/tL+0v3P2n/kOfad32jdt3fY/wDa/wBn71S+M/2b/i5rlt45XS/D9rK+tW3xGWxVr6FfMbVb/T5bBfmb5fMjtpmbd/q9vzbd1fUel+LNBvPCUXji8uJdI0iSz+3Sy6zA1hJaQ7dzNcRzbWh2r95W+7XB6D+0BH8UPAurah8CbfQ/EPiyz1ebSYtKl1iFo7aNb9rb7fc+W25YPLjafav7xl2qvzNRzFnD698N/i1pvxL1Tx5Y/D9dbstL8e2fjixtY9Xto21KGbw+ul3EMayMqx3NtIvnK0jLHIv3ZFauBsNL+I3w7+PnhTxRc/CO21nW/FkvjzxRH4Vt9VtI5dJt7ptJiVVnkb7O0reXum2tt/0mba0m3a3q2k/GD42a1ofi3TFh+HqX3gvxQ2i6x4vllmh0C0sY7Jbma5aCSbzmlhkkW2khWbasnzNIqqy1geJP2lr7S/2covjZD4N0PVvHVxBrVvoEFqrNaahDZNK1xfwySbZv7Pa3tvtP3l3L5a7mZlZgDW134J+PIf2H2+B+l2tlqXi238PW9nHaRXKxWzXC3McrQRzSbVWNVVo1Ztvyqv3azfin8Pfjd+0Lb6rq3iD4c2fhCLQ/BnibS/D+lS67Be3eqatqti1srSSQ/uYII03L80hZmk3NtVa9Z8c/ETWvBvwL1n4qaf4f/tLUtL8Lya8mmqzKssy23m+X8vzbd3/AtteK+F/2qPHmuaDrem6Jqnw+8ZatJ4h8O+G9A8TaClwuhS3mq7vMjmjaWSRpLSONpJFjm+ZZI1/dtuoiB0nxD+BHirxVeayul2tnYJH8MNJ0XQZ1lVVtte06/kvLb5fvLHHIts277v3q89134A/FrTY/AHxEhtfEd94ojtvEF14ssfCXiG00u9i1TV7mC7ZoZ7lWhmgh8lbRl3K3lxwsu7btbpvGP7UPi/wV5vgDxXqvgTRfGGn+LJvDt94hv4rldF+zrpseoQ3Udss3nefLHNDEtt53+s8z94yqtexfCvxhqHjD4Y6X468UXHhxHuIJrie80bUFudNnhjkZVuYZm+7FJHGsm2T5o9zK3zK1AHnev/BHxPN+xPffAXQdJiGuv4ZXS4NPbVfPRJmkWTyftcix7lX7vmMq/d/h+WsPxn+yhcaB4g8U23wj0S1l0P4ieBNW8J302s6nNd3Gg3zQv9lngmuZJJ/s07SeXcQxs3zJDJt+Vq0vBH7RXxM+KFz8Ul+G/wAO7K6Xw/baLceCY9Qn+zNq9vetOv2243MvlwMsLTxx/LI0O3+KRal8J/HL4s+NvCHjL/hF9Q+HWr3fhHxHb6TL41ikkh8ONp7QRz3N75bTs0kltuaKSNbjazfN5i7WWgDkvE/wo+NfxW1CTWPEnwqsvD0UeieE9DWxu9ctL152sPEEF5eyN5beWsfkrJ5fzbm2/Mqs22up1P4G+M5vEGv6tZaDY5vvjdovjaGUXEKtJpNva2Ucs/3v9YrR3H7tvmb5v71eh/s8fEzWvix8NZ/F2sWul3Vxa6vqWl22oaKzf2frcdtM0a3tp5jMyxTbfl3M3zK3zMu1q8P+FX7ZHj7xlb6reSWngzxVcW/gXVPF0uieGlnjvtBvLRlWPTL9pJZFkklZmVWVY2Vom+Xay0AYE/wJ/aA1b4deHPhfdfDfTrCLwP4J8YeF4tV/t22kj1a6v7JoLSSGNfmjhZlXd5u1l8z7u1dzdDB8GPjh8N/Adr8N/Culza9o2l+JrPxMmuW19pn/AAkkkdxbTrewx3F6vkrew3TR7bttrNayeWrK0dSWX7W/jN/hh4/8W2WsfDjxe3hXTtDvoPEOgrcLo9rJf3KxTWt3G00km62j/fsyyLujb5ljZWWib9qrxpD8NNS8QR618N7qKz8dWvg+Px7E1x/wi/2ea2Wdr1o/OaT92zfZmX7Rt85lbzNu6gDktP8A2f8A9oSz0K8msfDOnNq//FcTRLr2q2mreb/atxps9ss0kitHNKy291GzSR+Ws0asytGy7oNX8B/EfwRf6v8AGr4gxajp1pb6v4OvtPj8eeK7W7lvJrC7vPMtru6tUa3sFb7WjQyfNCsix7mXd8v0x+z18StY+LnwusvG2uWumi4mvr6xW60rzPsGpR21zJAt7a+Z+8WCZY/MVW3N833m+9Wv8bPGGpfDn4P+MvHmj6Lb6te+H9FutQisblv3MrRx7v3n/TNfvMq/MyrtX5qAPmX4WN8TPG3iyb9oXwn8L9I8QW9j8R/EWofYdK8QWzRywz6Lp9ktxZXcyxw3LLJDMskisse5ZtrN/Fu+Efgv8aPhTDda5p/wx0TxfeeMvC+oaPeaMuswQW3h+a51W+vlt/MmVVmstuo+XN5K7t1su2NlZdvafB349ePvGvgzxnfeHdL8N/FFPDd1Z2Og6n4Q/wCJTp+pSTW6yTQstzNJ5K23mR+ZIrN8snyx+YrLWdrn7TXjCy+Cfwd8f3uoeC/CMvxKtlk1XxHr8E8mi6PN9jadYfLWWNt0zK0ce6ZVXy2+821aAKfw68A+Mv2X/C3jfXLrw2ni2/aLwjpOkfZZ1WfV2ttMstPk+ba0kKrN5zKsi/d/u7t1dt+0L8Ibn4wa78MdPm0+6vNB0HxVNqGuNaarJp8sVr/Zl3EsizQyRzf66SFdsbbtrNu+XdV3TfjRqlx+y3J+0FrXh+3s7+HwjdeIpLGN28iRoYZJI2jZvm8qby1Zd3zbZF3fNXj1p+1d40s/gj41+IVx8RPhtq/iHQ4NFWCxtfD+p2EenzX9zFEslxHdTeZcwMszNHJCqq3lttZqAO/8Q/BO2+Feq+AvFnwQ+HMWpReENX1bUNS0X+1dl7qDX9p5DXa3d3I3mXMe2Nd00i/u2kVWX5VrK+B/wR8deE/iDpvi7xXoGl2cVx4c8UNPBbXMdxHpN9q+uR3y2Uf8TLHDuVpFXazK235WWsLXv2oPFWk/C3TfFWn/ABG+GniDVtY8aQ+F/tlnoGqxW2mr9mlnmW4sGma7afbDuWNdu7zI/l/ir234XfEJvE3wXX4lah4u8MeJ9trfXjajoFrcW1hIsPmfu/JuJJJo2Xy9siyNuVlb5VoA4PR/hz8Rr79hq8+COoeFV07xhb+BbrwnBZtqFvJHc3Eds0EMizK3lrHI21l3bWVW+ZVrL8Q/sn6P4V8TfD7xf8Efh9oul6vo8GtR6rPeXkstsrT6LcwQLJDJI3mRNdyQqyqu7bu/hrj/AAH+2B441r4K+NfixqnjD4X6rqXh3wdH4ii8OaRY6jBc2V1MqtCtw1xJtmg3N5bNCu3cvytXoHgL4t/G/wCIngvUpPAPif4Y+OfEf9s6fprSaZp17p0Hh23mVnnu722u7j7RcKse1o44/K8zd8u5d20A8Y1b9nH4/eMNLv11zwrqxa4+Hc3hf7NrXiHSpo1vGv8ATZ2htra0WO3trLy7aZY1X5vlVWWP5d3tPi3wN8RNB+KXjnUPCfwn8OeNNF+IlnodrHLq95DFZaP9iVo2hu7eT95NbbW8+NYVZvM8xdq/LJXIal+1n400e2g8Haxqngax8RN4v1bw3/wlC2F7d6Pdw2FtBPLNbWUcn2iafzLmO28hZm2yRzNubbtr6J+FnibUPHXw18PeMNWm0Ge81SzW4ll0G6a506Vt3+st5G+Zo22q21vmXdtb5lagD540b4G/FS60Twp8F7zwbYWGkeCfEura5/wmzanDJ/aUNwt95Kx26/6Qs8329VuPMVV/dybWk3LXPa58D/j74+8CWvhPWfhTY6R/YPwkbwDF5uvWk66lqH2vS2aRfLb93BJDZSMrSbW/hZV+Xd6L8Vf2hPiJ4O1/4k3fhux8IJ4c+D+mafqmv22svMt/rK3ELTtHaSLIsdvthXy42kWbzJv3fy/eof8AaK+IN1qV98QNL07w0/wu0nxvY+B7iOSO4/tidp5ra2bUVk8zyVjjubuNfIaNmaOORvMVtq0Ad9Y+HvEmhftIa94otfC+/wAL694Q0nS4tSguYY47K4sLi9byZLdm8z5lu4/LaNWVdrbtvy1w8lh8dPhPrPxC0b4a/DOHxba+NtauvEnh/V/7ZtraLSb65hjWaG/hmZZGijmj85WgWRmVvL2qy1S8H/tEfETVtT8CeLPEml+FYPA/xO8S33hnQ7O0a4/tjT5IftP2eaeRm8mbzGtJFkjjjjaFpI/mb5q6P9on4mfEz4U6VeeMNBvPAejeGtJ037V5/iV5pJ9d1TdI0elW0cMkbQyMsfyzfvWZpFVY22s1AHCa/wDCH4zWvi678cXWhJ4q1G38beDfEErafc21pJqkdlo/2S9mhjkkWOHbcSMyxyMvy7ttY3w3i1Twx8VfiT4o8MadF4z8I/DXUJNL8IWOj3St/pXiC5trzU4lk+aNWtGZV2r92ORl+WvTfiX8aPi54D1HSNYm8L+FNN0jVLrR9P03w5qF3JJ4h8QXF35X2uO0WOTy4ZLb7Rt2tHJu8mRmaONlaluviX4y+GnxT0bwJ/whfgXSfD/iTxM2k6VoGn3Sx6/d27Kzza4tvG3l/ZvMWRpF27ljXzGk3fLQB1Xxh+H+oeNPFvwxkj0W31TRtD8Q311ryTtH5f2GbR760+aNv9YrSXEcbKu75ZP7teAeGv2Zfi94T8V6rp7zC/8ADem+NvCdx4f1V7uP7TD4d06C9X94rSeY0tstxDB/ek8tWXd81e//AB08afE7wbZRal4Lh8EaXotnZ3Woa14j8Y30kOn2XltGsNt5cLLJ5kzSN+8+7Gsf3ZGZVrzTx5+0h8WvDvwy8P8Axis/APhXQ/D99oGm6tLp3iXVZI9U1bULlWk/sfToY13faVjX5WkVvMaSNVjXbIygHhOiW+rfGLQvhp8AfCdj4Win0f4XeLNBtNf03Wra/gvlksILSO7aK33TWkE0nls3nqsnmSMvlt5bV6DB+zz8VPFWlavdat4F8WxXV1beE9LaPxj4q07UZZ4bLXIL25jhjtVWFbaOFZmVmbzJGZlWNf4vRPGOqfGT4a/EnSrP4e+FPhJZxfETxDDa21oui3cesS2qx+be3d7NDJHDuijWZvut8zRruZmrrR+0Sup/tK6X8C/DHh/7dpDWerf2nr7Pujj1K0jgdrKHa3zSRrcw+czfdaZY/vLIqgHnvxI+Fvxqs/HvibxN4R8L3lxpOseO4dWafQrnTI9cjsV8O21kstlNf/u7X/SI5I5m+Wbyd3l/K1eh/soeB/GXw5+Dy+F/H2kz6fq8ev65fNFPqEd/I0NzqM88cjXEf+sZlmXc21WZt3yrXsrt/DTP/ZaABl+Vaa25f+BUN95acv3KADnduo27lZqbu+ZVp33l2/3fmoAN3zrTv/Hqa/yhW/ioHWgBOy075qAvzqv8NO3f99fdoAaP4f8AvqkLcfLShflX+Kk+6tAHOSbmdZF/h/hpfuy/NQm5lVvuv/FQPm3f71AAn7tFj3fNSKu12jXd8zbl/wDiaerM29mprL5jbd23bQBJ91GX/aamhfkVW+9HTIZGk+8u1vm3VL3+9/B/DQAfeX5f96vL/wBo/wCFuufGL4T3/gvw7dWsGotc295A12zLHJ5LbvL3Kvy7t3ytXqG3/wCK214z+1v4t8SeBfg2/inwfrFxpeqWesWPlXMDfNtZm3K275WVl+8rfK1ZVPhPOzJ0o4WftvhPzp8XeB/Ffw91iXw74z0G60rUIfm8q5TbvX+9G33ZF/2l3LWEOnzV9s+Bv2lvhT8f9Di+G37RugafZX8n7u21P/V2zSN/y0WT71pJ/wAC8tv/AB2o7T/gnrYx+NGuL3x883g3/XRRxRbdQl/6Ys3+rVdv/LVfvf8APNfvVy8nN8J+U1MhWLlz4GXNF/gfJ3w/+Gfjj4qa0NB8DaHLezLtaedv3cFov96aT7sa/wDjzfwq1dT8ZP2bviV8Fwmpa1aw6pocir/xN9PVmiikb/lnMrLuh+b7rN8rfwt/DXuvxX/am8C/B/RH+E/7Nem6aj2bNHPqsCLJbW0n8TRs277TL/embcv+9/D5p8GP2yfG3gu5fw/8TvP8a+Gb5mW5W8ZZbuJZP9ZtaT/XRtub9zJ8v91lo5UbywGAw6+rVH7/AHPCYfmTdUwVm7V9i6r+yR8OPjUln49/Z28aadYaVqEv+nWM6ySRWn97y1X95FIv/PCT+98rKtXG+Bn7JvwCC3Pxh8ct4m1mP5v7MLbdzf8AXpAzSf8Af2TbRGEjiXD1aVTmlKKh3PRP2Evm+AMX/Yc1D/2SvjD/AIKXt5f7TL/9ixpf/tWv0Q+BHjzwj8RPACa94D8L/wDCPaHb3lxY2lj5EMO1Y9v7zy4/lXdu+781fnd/wUy/5OZ3f3vDOm/+hS10r+GfrmVwjRwsKcZc2h7p4o+b/glZZ/8AYq6f/wCnOKvk39mj4WzfFrwl8ZPD9jb+bqWn+EbfWtNVV+Zri2u1k2r/ALUkayR/9tK+tPEv/KK2zVf+hV0//wBOcdedf8Eq1ZfiX4+m2/d8OW/3v+vtf/iaEdx80SeP5Lz4GWfwrupncaX4s/t7T933VhntJIpl/wC/kcbf9tGr7r/4J7ru/ZN8dfL/AMxXWv8A03QV8bftV/C3/hT/AMd/E3hGzt/K0maf+1tIX+H7Hc/vI1X/AK5t5kf/AGzr7M/4J2QzXn7LHjSxhVmlutc1aFFX+JmsIFWphuB8afsczLH+078K/wDsOR/+k8lfsqGZlwqs1fiL+zH4o0fwf+0F8N/EniTUIrDTdP163a6uZ22xwKytHukb+FVZvmb+Gvrf/go98aLrT9S8A+Gfhn8Try1vYYr681VdA1ho/wB3J5C2/nNbyf7M21W/h+b+KnH3Yln17+0XCzfs/fElWVv+RT1b/wBJpK/NP/gnvD/xlf4Qb/pz1b/0glr6L/Zo1zxZ4o/YS+M2reLvEWrazO0WuQwXOo3klzIsa6ZH8qtIzNt3M3y/71fPP7At1Y6f+1N4SutQvrezgjsdU3S3MqxxqzWUu35molL3kB+uQb+7/dr85f8Agq5Iq+Ovhyv/AFAdQ/8ASmOv0Gl8XeD1/wCZw0H5f+orb/8AxVfnf/wVbmWTx58N/LZWVtB1Bl2t95ftMdaS+Eg7r4Ct5n/BMHxkrf8AQN8Uf+jGr5X/AGRfhrH8XvHHjT4c7V+0ax4F1RbNm/5Z3kc1tJbt/wB/ljr6i+Acm3/gmF41/wCwf4o/9GNXjf8AwTI+b9pa6/2fCuoN/wCRras2WeI6J4+utL+DPjD4P6ossSalr2l61bRMv+ourfzYrhW/usytH/35r7n/AOCTv/Iq/EP/ALDml/8AomavmH9vD4Y/8Kt/aK1uaxtfK0nxgq+IrHavyq0zMtzGv+7cLI3+7ItfTf8AwSck3eFPiGf+o9pf/oiWnH4gPgyz8N6l4w+Ikfg/R1g+365rzabaee/lx+dNctHHub+FdzV9ETf8Ez/2mGR41bwR8ysu7+3JP/jNeO/Cia3t/wBpDwhNdXEUEEfjqzZ5JXVVjVb9dzMzfdWv2dk8feAVZmbx54a+Zv8AoMW//wAcqYIlnz1+2j4Muv8Ahie/0W6VHvPCtnodw/lNuXzIJIopGVv7u1pK/Oew8XLb/s0a54NWTa954903UGXd96NdOu1/9CVa/Wj48Wtj46+AHxB03S7q3v4NQ8M6l5EttKs0ckkcEjLtZflb95HX4ftqEzWDeXI2xlWbZ/CzbW2/+hNTn8RR9C/H74d/2D+yx+z34kWHbJq1nrn2lv8AauLlbmH/AMhs1cX8fvEk3xW+KOh31vJ5s+peF/C+m/8AbZtOgVl/7+SNX2f+3B8PV0f9ijwLZrDtl8Cz6HDJ8v3Va0a2k/8AIki18Q/s3aH/AMJV+0P8NdDmVnS48Tae0it/zxhkWVv/AB2OkB9vf8FRtLj0n4NfDzS7dVWKx8Rtaoq/wrHYSKv/AKDU/wDwSlX/AIt78SP+w5Y/+kzVb/4KmwzXXwf8F3iqzRw+LJFdv7rSWku3/wBBaub/AOCV/i3w5Y6R8QvCGoa7ZWuq3V/Y6lbW086xyT26xPGzRq33trbd237u5av7QHhn/BRtf+MpvEP/AGCNH/8ASRa9Y/aob/jXd8GP97w//wCkE9eJft6eKdB8W/tP+LNQ8O6ta6lZ2ttp+ntc20yyRNNFbIsiqy/K21ty/wC8rV7r+1vZzWP/AAT2+DNvcRsjxt4fZlb/AGtOnb/2alH4gPkj4f8AwQ8efEL4beM/in4bj0+XRvAarJq8Us7LctG0fmboY9u1lVVZm+Zfu16H+xJ8L/h78XPj1YeG/iE08tnZ2c2rWenptWLULi3aNvs8zfe8vbuk2r97y2X7te/f8Eu9JsfEXwx+LnhnVI99lq19a6fcoy/ejmtJY5P/AB1mr5G+FvijUv2e/wBoHQ9W1hmin8E+JmsdVX+9DHM1tcr/AN+2kqeX3uYD9Mf2+W3fsn+O22/w6f8A+l8FfkVpVrfapqVrpOl2ct5e308dvbQRLuklmkbasar/ABMzNtr9fv2+I45v2S/Hk0MivE0ensjr91l+3wfNXxF/wTY+H+l+LP2i/wC3tYiSUeD9Hm1i0R1+X7U0kcEcn/AfOZl/2lWnKPvEoh/4J+fE5vhz+0bp2h6hN5Gm+NoJPD92rttVbrd5lszf7XnL5f8A22av1S8S+HdB8VaJf+G/E2k2uqaXqUTW95Z3cXmRTxt/Cy1+Pf7Wvg+6+DP7TPi2x0HNkq6nH4k0WSNdvlLcMtzHt/65ybl/7Z19S/tb/thfFLw/4A+EHxI+DfiK10mw8faRdXmoLJp9vc7bqPyN0e6ZW2+W0ky/L/doh7pRyXx+/wCCZOqaWt74o/Z91R9Ss490zeGdQf8A0mNf7ttcfdm/2Y5Nrf7TNXjH7G37Q3jD4D/FHSNBm1K6fwbr2pw6frGjzs3kwNNIsf2mONv9TLGzbm2/eVWVv9n7z/Yb/aEvPi58HLnXfid4+0q68UaPq90upGVreyaCz+VoZGjXaqx7d37zb/C3zfLX5neI7yx8YfHfUr7wv+9s9c8bSTaa0a/6yObUWaFl/wB5WWm/7oH7lOrRlo2+8reXSNuwrf3alu2/0mVv+mrf+hVBu+Zf++a1ID7o/wDHaavyhmb733qcP/Qaai7V27t22mWIfup93+9T1/i+X/Z/+yprr8qfN92nI21l+793bQA0N+8/2fu/7tOT5jQP4l/vU4df9qgCOneZt6UK3LN/s1ynxP1S+0P4ZeMda0m6a3vdN0DUrq2nX70U0dtIysv+6yrQB4948/ZfvvGnhrxrpc2saRPeax8SI/iFpEV5FM1lujt4IPsl2sbLJtkWOZWaNty+ZGy7tu2m/Dz9mnXPB/iLwv4wWz8DaHdaTr2paxdab4fguWg8ubSpLG3h+0TfvLiRWk8xpJPL+Vtqr8q1xvwb8fXGh+BF+KWueKP2idevNH8DzeJtQsfFWmtbaHeyR2XmyLHcSWiruZtzQ7ZP9r5q6jUP2sPH2g22sXmufAFrWLw/4f0/xlqDf8JVFI0eh3cjRxsu2D5r1Whm3Qf6vbH/AK77qsf3QPoTRtL1LVvClrpvxEt9H1HUbqzjj1eK0ikawmm2/vPLWbc3l7vu7vmrzTWfgL4h8I/CfXvBfwC8T2Ph/wASeINTuryXxDf2+2eGG5uWlnSNoFXa21mSNtv7vdu+981c/wCJf2pv7D+J7/C2+8PaTbLfX19otp9m8UW8muRyQ2ks8d3Jpyxt9ntpPJZY5JJPM+aNmj2ttrL/AGffi98XPGWrazLDodz4o0mPw94FvLOG71mGO7tlv7Lzbu4mbyI45JNrNNJt27mjVY1Xd8oB13hT4f8Ax68F/D3SvC/hi4+GOjP4dvV+zaPYQX7abqli0cizRXc0/mXEcvnSef56+YzSL+83bmrhtR/Ymi1zwD4pbWfGuoad458RWevQr/wjupXOm6Jaf2jM0/2RbddzSWyyrG0n8Uu1ty/dVfRPjx+0I3wZ8QaB4dt/Dem3914gtrq6gn1jX4dFspWt2jX7JDczRtHJeyeZ+7hZo1ZVZmkWuR8T/tq+EvDvxDn8G3WkabBaaXqel6Hq/wBr8R20OsQXl6sTf6PpnzNcwwfaIVmkWRfm87y1kWNmoA6/xT8GbzXv2c7z4Ex+LLt7q40BdJXV9TlkvZGmVVbdMzbWkj3Lt2/e8v5a4C++APxY8Ranq3xG1bWPAujeNFvPDt5oun6NbXLaOsmkXMs6tdtJtmkaZbmSHcqr5Uaxqvmba2/CH7S2seINZ0ibxJ8Mf+Ec8IeINa1jw7pviCfXI5fMvLD7XuaS3WNfLikWyuNrNJu3R/d+6zc1pH7UV1qGovrGn+C/EFxqXibSvC//AAjnhq51OCO2nm1WbUPssm7yd1uzW9p580jNJtjVVWPcrbgDdtf2f/ilb6tD8W4fEXg+X4k/8JRdeIrm0ltrn+xWhm06LT1tI5P+PhWjht4ZFn27vM8z93tau18LfAmz/wCFM+IfhX8QryK8XxpeatqGvLovmWUEbajPJPNb23zeZHEvmbfm+98zN95lrzvxt+2JcfDe503wr4u+Hul6D4xmtbzUL7TvEPi+00uyW1t5vKWS0u5o/wDSfPbc0K+XH8qt5nk7a1PCX7YWj+OvH+h+F/CvhNJbDWrPSb6OTUtcgsNUe3v7dZVubawm/wCPmCDcsc0kc25ZFkVY28ugCDw9+zH4y+G/iT4g+Kvhv8Wtei1LxBpWk2fh+fxBqM2rLBJaNI0i3cMnyyRtuWFdvzRxyTbdrVPpXwb+OGn3vi/4jaX4q8H6D4y8Uaho9w+j2NtNPoc9nYRyRtbXMkkazM06zN5k6xqy+XCqqyr83mni/wCNnxE8ZWHiPx9oeqeJRo3h/SI/EUmmaHqsOlx2em3Eki2EbSfZppru/njj89o2aO3jWaNdrMzNXVx/HrxJ4RvrTR/HNxquoat4N1DVo75rGe3todWt4/D8uqW63a+Wy+asa+W3k+WvnRrJt8tvLoI5j1D4Q/CPXvB/gzxlpPizVNLTUvHWr6hrF3BoEUkVhpbXMMcXk2yyfN8qx+Y0jKu6SSRtq7q8jsP2P/iNr3hbT/BPjnxT4K0mx8L+B9S8E6NfeGdOnW7vlu4YovPv/Obb5arD5jQRsytJIzeZXYw/tYataWUreJ/g3qOk6pqmj6PrXhfTotat7mXV11O7js7a3mbaq20v2iaHzN3mKsbbtzbWWuM+Lvx4+KXh3UVk8XeGfEHgb+yfCPjC61Cz0jU4Z4tQktoNPltruyu5INrNGs0yr5kP7uTzFaNl27gs2PFX7N/xa+IEOr+JPF2veANO8Rrpmi6XpFno+n3P9kyR6dqsWoK16sjeYyySQ+UscfyxRs21pN1V779n/wCMVxr/APwthL/4ff8ACbN4qt/EDaC0V3/YDQw6XNp6q023zmudszS+f5f3ljXb8u6umtf2nNWbxUdL1D4ZXFr4Ut/GUngOfxG+sRNJ/aSx743+yLHuaBvus25WVm+6y7mrgdN/4KBeCdWs7zUrHwvbXlrJpF5r2lRWPiW0u72WxtNslx9tto9zWUv2VmnWNvM3LG0bNHJ8tT7wHpXwo8D/ABK+FdzYaTcaf4fvYPGHiHWvEXiiTSoJILDRmmhj+zw2Ss27a0kaq25dzNJJJ8tdh8afhzdfFr4bat4FsdSt7C6vHtbq1nuYPPtvtFtcxTxrcQ7l8yJmhVZF3fMrNXmN3+2Z4BtdT8S6f/Yd6yeF/E9xod1P5q7ZLG2srm7udTjXb80ca2F3H5f8TQr83zfKaj+1prXg3w/dax4++COraReXGgx+JvD+nxazb3MmqWbXdtbSQyMqqtvcxte2zNC3mLtk+WT5W20B6N8KPhz420HxJ418fePrzQItb8ZR6fbyad4eWb7BbR2kMkccjSTKsk08nnNukZV/dxwx/N5e6uJj/Z9+IHhXwZ8HYfCWreE9X8QfC3Q5tDls9fgn/svUFuLeKKS4j8tWkhlVoflba37uSZfl3VQ8A/tAeN7n4/eKvhJ4l8Nyv4qvp9HltvCsGqxzweH9N+xJJe3slysaq0e6SL5du6SSZY1+VWZe0+BH7Qy/HTVNUs9P8GpptlYxSSRyrr1td3NsyztE1tqNpHtmsLv5d3kssi7d37zcu2ggteAvhL4m8C/AFfhTpfjS3svEC2t95Gr2mmRyWljeXNxLP+5tJty/ZoZJvLWFv+Waqvy1xEvwl/aC1jxJq/xW1LxZ4K0LxyujaXoejW2nW097pclvaXrXsy3bXCrJtnZmh/drugX5laRq626+PVxb+Ide+y/DfWb3wV4X1WbQ9a8VRXMLR2V1DD5lxJ9k/wBc1tDuWOSZfutu2xsqs1clf/tdSeGfDD+KvGXwZ8QaRa6p4ek8VeF4v7Rtp5tXsY5IFaNljb/RblY7u3k8lty7Wb95uVloLLWk/C747aJqniD4qWniPwZH478SazY3mo6OI520aXT7SyktI7X7W0bXMc/7xpftKx/eVY/L8uuw+F/wt8TeC/hz4l0W88UWdr4q8XanrGvXWoaZa7rTT9Qv2Zv9Ghm3eZHD+7/1n+sZWZl+bbXES/tQeKNL8Qapo/ij4F6ppMHhnX9J0PxDdrrtpPHZf2m0C2U0Kr80/wDx8R+cq7fL/haSvofbt+Vv4floA+ebf4QftCeIPEkvxC8U+OvB3h7xhovhKbwz4evNBs5LuCS4kuba5mu7uO4VdscjWkca2y7vLWaZlk3bduR4p+Cv7TXiaPxj4w0vxZ4H8N+L/G40fRb6LTb2/WCDQ7L7S0ixXflect3PJdNH5qxr5UPyq3mbZK+miv3f71OVdp2qvy1NwPnyw+C3xU0HSvh5r3hjQPhhouvfDGXUrHSNC06e9j0efS723SORfPaFpYZ1kjWTzPLk3fNu+aRmrqvg74V8dfCuPw98Mby107UtJm0/Wtc1zWLSCSGODWLnUVufIt1ZtvkN9rudq/e226s23dXrK9aF/vbaLgfNX7Rn7MOvfHDxa8/9k/Du40rVNKXR31fVdMkbWtEhZpFuGtWjXy7tmjkby1nZfIk/eLu3MtXLv9nnx5/bOoeB9P1Tw1F8MdY8cWfjqfzPP/taBreaC5bTo49vktHJc2kbef5issbSL5bNtavon+79aP7vy/7NUB8xeF/2UdVtvjfafEjxNo/w7gttG1y88QQanoenTQapq91MsscP2qNl8m28tZ2aRoWbz5I45G2/Nu9D+MPg340eKk1HQ/BV54G1Hw14g0WTSbvTfFFtJ/xLbpvMVr2HyY2+0q0cm1oJPLXdCu2RdzV633/3aB0/4FQB89eO/gD8XfEngyH4K2XjPw3qfgObSNH0uPU9Wt5F1zRPskcUcs1t5a7biWX7Os0ckkkbRTMzfvFVVrV8W/Cf4weNvHunf8JJrng658M6L4tt/FGna5HbSR6/bWsMnmx6VGqxrGq7t0LT+ZukhZlaNmZmr3JelNbtQB578WdL+MV9Np1x8MZPBupWDQXFrq/h/wAULJHaXfmbfJnWaGOSRWj2srQsvlyLI3zKyq1eN3/7O/xx0n4RWnwH8PeKPA/iPwvfeE4/Dt8/iK0lWTRrxvNWa9so44289dsyrHBNInk/Z4dsm3ctfU3f8KNq7qAPNNB+FuraT8WNJ8cXmtLfaT4d8Ex+F9KjnZpLtbhrlZLu5kbbt3SR21ou5W3blkrz/wAPfse2ngX4veAPGngv4keMV8PeE01qS50zU/EM1y3nXckUixwq0fzRSSLM1x5jbpG8v5vlr6L/AOAinL+lAD3bctL822o/vK1OX5l/8eoAG+Y0Bv4v+A0bfnXb/EtNj/1fzf7tAC0v3fm/ipvbd/d+9Tzt2tQAN827/ZpRupu7cv8AwKlH3220AIfu7af/AHv9pqbt/wDQfvU4bsbm+9QA1fusv+1St/s0u759v+zTQu5aAOeHzJtb726gNtZW/hoRvl/3f71A+U+X3X+L+9QA0dP/AEL/AHqkVdzruqP+7/ndTt33tv8Ad2/7u6gBp6qq7flb5v8AapyrtH/Av+BKtAbb8v8AF93d/wCzUM3H3f8AZoAc/wAybvu7dteJftl6BrXiL4C6laaDpN1qNxa31ndSxW0TSSLDGzeZJtX5mVd3/fNe2nqv+8u6vOvjx8Xpvgj4ATx1Ho6aokep2tnPbNL5bNHJu3Mrfwt8vy/w1EvhPOzKEKmFnGo9D8rSyqPvfK1eyfBr9rb4ifB+3t9BZk17w3DKrNp93I3nQR/xLbzf8s1/i2srL8v3fvV7r4n+E/wN/a40e48dfCHWrfw/4r2+ZeWzReWrSf8AT3br91m/57x7lb/ppXx18Qfht43+F+vv4d8caDNp1196Jm+aK5j/AOekMi/LIv8Au/8AAtrVx+9E/KvqmKymftcPLmj3PrXX/gv8DP2stLu/G/wR1q18O+LVXzr7TpE8mNpG/wCfm3X/AFbN/wA9Ytyt/ErNXyZ44+G3jb4Y66/h7xv4fuNLvV3NH5i7o51/56QyL8si/wC0tUvDWua54U1i38QeG9WutL1G1O6C6tZWjkT/AIF/d/2fu19geAv2qPhz8XdBX4a/tNeH7DbN8qav5W22aT+GRtvzW0n/AE0j+X/dWj4i/a4TNvdn7lT8D5C0PxL4g8O/ao9B13UdN+2ReTc/Y7qSHzo/7sm1l3LTdKsdU17VYtJ0PTbzUtRvJNsVtaRNNNK3+yq/M1fYV7+wV4HttWl8UXHxZ+zeA1RbpXdYfPWP+79p3eTs/uybf+A/xVm6x+098DvgLp0/hX9nHwPZ6pf7fLn1idWWGRv7zSt++uf/AByP+7Ry/wAwU8pnS/3qraJ77+yd4C8WfDX4M2nh7xlposNSmv7q+a281ZGhjl27VbbuVW+X7v8ADur5X/bs/Zv+OXxY+O6+LPh78PbzWdH/AOEfsbP7XFc28a+dG0u6PbJIrfLuX/vqvqX9kz4ieLvil8JX8XeNtSW91KbWryFWWKOJUhXy9saqq7dq7mrpdY8baxY/Gzw98O4bezbTdW0e61Cd2jbzVkjZtu1t23b8q/w1vGUeU/UcudKnhYez2PHr/wCDPxG1L/gn9b/Be38Nu3jJfDlrZ/2Y08KstxHexytH5m7y/uqzfe21xv7An7O/xi+CvjTxjq3xO8Gvolpqmi29rayNeW83myLcbmX9zI235f71fV3xQ8Tah4F+G/iDxdo8du97pNn9ogW5VmjZty/eVWXd96qvwf8AiZZ/FbwdFrTRpa6pat9n1WzX/lhcbf4d38LL8y//AGNP3eblOznjzcp8+/t8fs1+MvjVpvhXxZ8M9BXVPEeiyTafd2yzwwNLYyfvFbdMyr+7kVvl3f8ALZq6b9g/4U/ED4N/B7UvDPxG8Pto2qTeI7jUIoGuYZd0LW8Cq26NmX70bf8AfNem/HXx5rnw38Bv4m8Px2b3kd9Z2+27RpI/Lkk2t8qsvzV1viGPxI2g3S+D5tOi1fav2WTUlka2Vty7vM8v5vu7vu/xUXjzFc8eblPzr/aZ/wCCd/xCh8Z6p4y+BOm2ut6HrFzJePov2mOC70+SRt0kcfmMsc0W5m2/NuX7u1tu6vKfBP7A/wC1F4g1WLT5vhn/AMI/BJIqy32q3kEMEC/3mWORpG/4CrV+g/jbxp+0R4BstO1DVm+H11FqGp2+lxrbQXe5ZJmbazbmX5flrvvD9v8AtCR6zZr4mvPAB0lZ1+3LYxXfntD/ABeX5ny7v96oTUpcpMavNI5ew+BMPw5/Zb1n4G+CVbUrxvDWqWccr7YW1DUriGTdI25tq+ZJJ8u5vlXau75a/Or/AIYN/auZFWT4S7/97WLD/wCO1+nXxp8aeLPB8Hhm18F/2X9v8Qa5HpO7UomkhXzFba3ysrfe21Tms/2olX5dc+G3/gLd1UuX4QlV97lPzHv/ANgf9qqS2ljX4QpuZGXb/a+nf/Hq+iv21/2b/jZ8VE+E6+AfA8urt4d8Irpep7Ly3j+zXH7j93+8kXd91vmXcvy19qeB7f4kLZ3n/Cyrzw9cXjSr9lbRopI41h2/N5nmfxbq8+8beOPixJ8Yn+Gfw7bwzEkOix6s0mrwTN/FtZd0bf7v8P8Aeo5oxiHPGMeY8u+D3wP+KHhn9hDxV8Hde8LvZ+L9StNejtNNa6hZpGuP9T+8WRo13f7Tf71eZfsJ/sx/HT4P/HKfxh8RPAr6RpDaBeWK3LahbTfvpJIGVdsMjN/yzb+H+GvqWeb9qbT7d7xrP4eaysK7msbb7TDLP/sxs3y7q7f4Z+ONN+JXhS18Vabby2vmNJb3NpL80ltcRttkjb/P3WWnGXMEZxkeGft5/s7+Ivj18OdIuvAOkx3/AIt8M6h5lrB5scTXNnMqrcR+ZIyr8rLDJ8zf8s2/vVmf8E8Pgj8U/gb4d8Z2PxU8Lvoc2qatp91ZhruCfzY44XWRv3MjbdrMv3q9Mv8A48XHhn4+z/DXxNb2cXh6aK1htr5VZZILqaFWXzm3bfLZty/dXb/31XtUi7W+Zfu/eqlKMpDU4yPyI139hf8Aaoutb1S4h+Ec88FxeXEiN/adltaNpGZW/wBdWHdfsG/tVf8ARF3/APBjYf8Ax6v1W+GXxA1rxprPjnS9WtbOJPC/iCTSbRrZGVpIV3fNJuZtzfL/AA7a7htv3m24+8zN/DSiov3ioy5o8x4d+yX8OfEnw/8A2Z/DXw1+IGi/2TqlvFqFveWbSxyeXHNczsvzRsy/NHIrfK38Vfnt4e/YD/acXxFpdnqXw126XHqNvHc3K6rZMq2qzL5km3zd3+r3N/er9Avhd8fNW8dfE+/8M6lp9vb+H9UW8bwvdpEytdrbSbZNzbvm3Lub7q7dte26kupf2Vef2G1quo+RJ9ka6VmgWbb8vmbfm27vvbaUZRqEQnGXvI8y/an+GusfFT4BeN/AfhuxW61bULNZNMgZ1jWW4hnjljXc21V3eXt+aviv9kT9j349fDv9obwv44+I3gP+y9E0WO+me5bUbSfbM1tJHCu2ORm+9J/dr7A8f+LP2jvh74TuPFmsXXw8urWzeGN47W0u/MbzJFjXbuZV/i/vV0OlWv7SH9r2Emtah8O20vzY2vFtoLtZ2t93zeXu+Xdt/vUrx5uUFV97lsSfHn4M6H8evhbqnw31y6awa6aO60++RPMayvI/mjm2/wAS/Mysv8Ssy1+ZHi39g/8Aac8M6lLp8fwz/wCElt42/dX2j3UM8Mq/3lVmWRf91lWv08+LXjzWPAt54Nt9HtbOVPEXiO30m7+0qzbYZPvNHtZfm/76r0F2jtUeSaRUij3NJIzbVVV+8zU/dkOM4n5dfBX/AIJy/F7xdrlncfFjSYvBvhmGVWvIpLmGS/uY/wCKGGOFmWPd93zJGXb/AHWr60/bw+Dfjj4sfAvRvAvwl8Jrqd5puvWc0djFPDAsFnDBPH8rTMq7V3Rrt3V2ul/ED4wfFAS6x8KdI8P6R4XWWSG01XXlkkl1Da21pI4Y/ux7l/i/76/hW7oPxK8feHfGem+AfjBoekRPr3mR6RrWkSSfZrmZV+aGSOT5lb/vn7y/3t1JTiT7WJ4x/wAE9fgf8UPgj4a8daf8UPCraJcaxqdjcWaNdQT+bHHDIrN+5kbb8zL96vCf2uv2K/jZ40/aB8TeMvhb4DbV/D/iRbfUGnS+toVjumhVbiNlkkVt3mR+Z93/AJaV98fGHxZq3gP4aeIfF2hrbtf6XaedB9pj8yPd5ir8y7l3fe/vVB8F/idZ/FbwXBryxra6lbt9l1WzVv8Aj2ul+9/wFvvL/vf7LVXu/CV7SN+U8k8Z/Dn4yePP2Ck+F+reFZW+Ia6Rp+mz6dJeQbpWtLuL5vO8zy/mhhWT73/j1eZfsD/s2/Gz4L/E3xH4g+JngltG07UPDzWMErX1tP5k32mKTbthkZvuq3/fNfVnxe8ea58P7TwrJocNm7a14ls9JuftMbSbYZN27btZdrfLXoNwu0uv93dT93mKjKPNynxH+3/+y78RPjVrfhLxx8KfDaaxq1jazaTq8H2uGBvs+7zbeTdMyq21mmX+98y1yXw4/Y4+Knj79mfVPgf8XNF/4RTWfDOuNrngzU57mG5gXz4/39vJ9nkZljZt27/rsrLu8vbX1L8fvix4m+Hdtpun+A9Ns7/W7qK61KeK5jaRYrG2j3SSbVZfm/8AiWr0nwrrln4u8PaX4m01t1rqlpDeRf7KyLu2/wDAfu/8BqeaMpcoozjKXKfkbq37Bf7Umk3rWMnwjl1ZVbbHdaffW08Ei/3lZpFZV/3lWvoz9kn9gHxt4Z8eaR8UvjdDZ6bF4fnW+0zQYp1nnlul+aGS4aPdGscbfNtVmZmVd21fvfZfxl8aat8O/hhrnjDQYbWW902KFoluY2aH5po1+ZVZW/ib+KuvsLiS6sLW4kVVeSCORtv3dzKrf+zU4qPMLmjzcpO/+s+X/epoZcUbtxpvy4Zfl/2a2NQbrt/2qPvD+7Ttu5m+b7zUdvl/3VagA/2v+BU0ff8A9n7rUf3Vp21qAG/7f+1Tl+bcab/d/wB7/wAdo+b5f4agByf3l/4DWR4q8O2vi7wvrfhW+mlit9a0+602eWLb5kcc0bRsy7v4trVrhfl/8erlPip4NX4jfDHxb4D8xkbxBot5pqSK21o5pIWWORf9pZNrf8BqwPPNN/Z18T2/gy6+HetftCeN9Z8L3Xh648Ntp0+m6VEsdvJaNbK3mQ2yyM0atuXc23cq7t1b3iX9nnwr4stPEtnfa1q1uPFXg7T/AAXctF5e6KztJJ5I5o9y/wCtb7Q27d8vyr8tfLGk/F6TUvE/h/8AbO17VLiLw94VbSfBOrxeayxK02hyT3rMv3fMW/u4If8AtnW74a+NXxv+GWjL4C8N+E9S1fUfB2gaf4h16A+Gb3VP7X1TU1k1C5tnvY5Vj05EWTy43ZZPm3btscdAHt6/speH11+K/wD+FheI10m08Sah4qs9FSCyW3jvr1blZ2klWLz5/wDj8m8vzJG8tW2/NWp4K/Z9s/hvJ5ng34heI7BJNK8O6PPHstpPNj0iNYo5G3R/K01uvkybfl2szLtba1eUeBPGXxS8Cz+MPG9tqXh648GT/Gq60O60SazkOqeXf3sFt5y3XneWkkc08bLB5LK0at83zLt9/wDFbfFHw38JvEuqQ3Oh6l400+w1C+07yLOWOymaPzHtYmjaTzN3lrHG3zfe3Mv92gDI+MHwhuPixClvH8Qtb8PW82n3Gk6hZwW1te2V9azMrN5ltdxyQ+au393Mq7l3MvzK1YWifs06Z4X1aL/hDPiP4r0Pwy0+m3moaBaPCy3txZQQQRs120f2qNZI7a3WZY5FWXa33fMbd5Ro37YXjT4geNrrwj4D03REt/FWpaPa+Bby5gkm+02+1m1q4mVZF3eR5cirt2/Nt3bqz7P9t7xtJJHa/wDCI6R59x4XXTYP9Z+88fNIq/2Zt3f6hfMVmX/Wfe+ajlIPavFP7MPgnxd8Ep/gXqGtaymlyarcaxHqEDxx3sE01/LdyeWyrtVf9Imh+7/q5G/i+an+M/2c/DPijX9R8VafrmqaDqjQaCulT6fHDt0ibSZLlraaGORWVty3c0ckcisrR/L8teVXP7ZniDwXfadY+OtP0J/7B1LxFp/jaezSSNbT7Mty2keSrSNtku/szfK27d/Dt+WvRPEmveJ28PfAjUvHukac/iPXvE2mrqaWz3EEVhcSaddzzeUqyfN5fl+Xtm3r95tu7btCyrL+zPqX2yDxNpPxy8ZWHjCaC8sdX8Q+VaTy6la3MyytD9nmhaG1WFlX7P5Kr5W5vvbmrQ1j9mDTfEWr6RHqXxK8WXXhrR7nSdQXQ9Qa3v8A/StO8ryZY7ueNrq18xreFpvJkXzW8xvl8xt3k+nftRfGLwv4H8OfFTx5Y+FNS03xl4M1jxFY6PpVrNbS2VxZfZvs6yXMksnmRzfaV8z92vlfws235uv8Yal8WtL8dfDnwv8AEjxV4Q1C5Xx1ot1E/h7zrKfyZLTUvOhuLSSaRvIWS3Xy5d373a26NWjoAwvHH7L/AI00+TVvDOiab4vvfCuoLZxwN4X13TLKaW1tJ/PsoL23v49rNbM3lxywzbZIY41mj+X5un8N/s26t4m8MRWfxGuJdAnhvtaukS1vo9Q1G+bU7CWyubjUbnyVhknZbhmVYI1jj8uONdy1wvhL9oT4vWfwtuNS+Huk+C9N0HwT8ObHx1fW2ox3t7LdtcTX0jWUczXO6PdHbbvNk8xlZvusrfLv6h+098VLrx9rb+F/A1/eeGfD/ii38Ny2Mfhe7na7j3QR3Nz/AGusi29vJG0zMsTQtuWNVZt0i7Qg9L8Ufs4+E/FK2bXmva3bXGl+GdN8N6fd28sazWjWF3Hd217GzKy+es0MbfMrRtt2su1qwNe/ZP03xpY3/wDwnnxW8W+INU1TTdY0u71CfyIlWG/gtoGWC3jjWG3WOO2jZVjX5mkkaTczV5NdftxeMvDs8Vj4j8N6RLLpOgatY65JbRyR/wDFYQyXy2VhCrM22OZdMmba25m+0Q/N/e7K1+OHxytdPuvH2sy+D/8AhHfDPjKx8C6zo8Wnzfbr64a6trG7vbefztsTfablmhgaF90Ma7pNzUFnqUf7P/hdrR7WTVNReJvHq/EKRWWPa158v7hl2/6j/wAe/wBqsjwh+zXo/hW2fw7cePvE2s+ErfSLzQdM8NXjQLaWVjcL5bQtJHCs1z5cf7uNp2k8td38XzV4H48+P3xU0PQ/hv8AHrxla2GrWX/CTeJP7I8P6BZ3EHl29tZapbede3DSSbov3cM8jLGvlRxyNtkavRfH3xr+M3gDVtJbVta8Jnw9a6Rpuoal4mtfDl3faLd3E8rfaFuLi2nkm0iBYfJaGeWGaOTzPMZlVWVQDe8H/sZ/Cfwfc6TcNNqurrpvg288EzxahOrLfW9zPJLPcz7VVmnb7RcR7l2/LNJVlP2S9H1bS5bHxr8UvFviaW30q30HSLm+FpHJpenw3dtdtGvkwqs0sklpbLJPJukZY1+7827r/jF4r8aaX4n8C/Df4e6hpel6t44vL5f7Z1Oxa9isrW0tGnk8u3WSPzpZPlVd0iqq+Y3zba8xufjB8fNR/wCEy0/QvEPw0gvfhPoEOra/OtpcXdprt032t/Jhbz42sovLsmWRm81o5mkX5lh+YA9J8Q/AHwnrHjzUPibDq+o6f4mvNb03XINRtvL82za2tFtJLaNtu5oJ7fzI5o23f6zcu1lVlwfD37NE3h/xPfeNI/jF4svNeGh3Xh/RdVubWwkv9LtZpInZpJ/I8y/lXyYVja78zaqt/EzNXl//AA0R8dvFUTeMPB9x4P07Qbzxxo/g2x0zUdInmu411Owsp1uZpluY1ZoJL1f3axr5ixsu6P71e4fATxx4u8aeGNeh8dXGnXWt+F/FGreGbm80+1a2gvVtJtsc6wtJJ5bNGy7l8xvm3UAUrz9n+xvPFGrXkfxC8TWvhXxFqba1rXhO2aGOy1C+aFYpmaZY/tCwTbVaSBZPLkb/AGWZW5d/2Q9P1TQJfDfi74teK/EFrY6D/wAIz4ea7gtI20bT/OgkZV8uNftErLaW8bTTbm2x/wB5mZvoLy/u007aAPL/ABP8BdB8UX3jC8utc1GBvGWueH9cuVjWPbBJpTWzQxx7vvLJ9kXdu/vNtr1Jm3MzfxVGn/2NPoAd/F8v8NC/N8u7+GkX7zN/s05Ou7d975qAG7twZf8AgNHy7V/2aIt2Kbubdt/2aAHr91f733aNu0f7NIF/+KpT8v8A3zQAv/7NK3/2NH91KPvUAH8P/AaP4qNvNO+b+781ADfu7fu7mobbhVo+6275fu01d23/AMeoAP8Aa20D/WK1G3av3vmb5ac38K/3fmoAPvM67qP4Vamr/E1OH3dtADv41/u0d/7tCUq/7P8Au0AIqszMtNVdzM27+KnL1/3aF+5QAfeoX7q/99UKu1f/AB6kHyhaAHfe20fws1In91af/DQA1v7y/wAVH8Tf7VC7ttAX+KgDnG3MPm+6rf8AfVOP+s3feWhdrRMrf8CpqLubbQAI23y1/vU75c/71NDbRub7v3ac6/xfe3UAOVlbav3fmoT958y037vzbf8AZp27anmfeoAbu+bd/e+WvnX9vXc3wBl2/d/tyxZv/IlfRiq2Nu77rfe/vLVHVdN03WNPuNL1bT7e9s7hfJntrmJZYZV/usrfeqJR5onDj8N9ZoSpR6n47eHPEviDwjrVv4i8K6xdaXqVm26C5tJPLkX/AGf9pf8AZb5Wr7C+G37UXw4+NWiL8M/2k9A06J7j5YtTZPLtHk/hkZl+a0l/6aK23/dWrfxs/YP0+8a48SfBOZbO4+ZpNBupf3Un/XvM3+rb/pnJ8v8AtLXy94d+DvxQ8R+LpvAuk+B9VfXLVtt1aywND9m/2pmk2rGv+0zbW/h3Vx8soyPzOWHzDKqvseXmiz2T45fsaeJvh/HP4n+HElz4o8N7fOaJV8y9tI/vbmVf9cn/AE0j/wCBKv3q+cl+Ubv4a/Tj9m/4P+OPg/4SbRfGHjyXWWk2tBpsXzWmm/e3LDI37xv/AB1f7q/xVz/x1/Y98F/FJrjxF4VaDw34ok+aSVE/0K8b/ptGv3W/6aR/8CVq1lT93midmYcK1K9L61hlyy7H53Xeua1daRB4fuNYvZNLtZGkgsWuZGgiZvvMse7arVjP8pYV6VrnwG+Lmh+Novh7eeB9SfW7pm+yRQJ5kdyq/wDLSOb7rRr/ABNu+X+LbX1Z8D/2FvDvhxYPEfxgeHXtVXbJHpETbrC2b/po3/Ldv9n/AFf+9WUacpHiZfkuYY2ryTXw9zsf2ELeSH9nuzaSN087WNQkTcv+sXcqqy/3l+Wuo8SRr/w1H4Kb/qV9S/8AQpK9XtoYbWBLeGGOKKNfLSONdqxqv3VVf4Vry3xL837T/gj/AGvDGpf+hSVu1ypRP1ejhvq1CFH+U1/2gfm+CHjT/sFN/wCjI64jxRp998LYfDnx08K2cs9lJo1ja+LtPi/5b2vkxqtyq/8APSP5f/Hf9qu3/aE/5Id40+b5V0pv/RkddL4YjhvvA2h2txbpPBNotnHLFIu5ZI2t1VlZf4lZWqXHmkbzhzzueXftK6pp/iD4ILrGk3iXFlfX2mzQTx/dkjabcrV7bFt2ov3q+N/i3Z6p8JdG1L4R3Sz3HhfWr631Twvct832bbcK1xaM3+zu3L/31/E1fY9v9xP722ik+aTJoO83zHlX7Rsa/wDCN+FW3f8AM36X/wChNXr8rbpXX/bb/wBCryH9pHavhjwr/d/4S/S//Qmr1yVtsz/77VcfjZrT+OR4x+0rq0eix/D7Vpre4uEs/F9vM0VtF5k0irGzbY1/iZv7taNx+0Zofzf8W7+Ibf7vhyT/AOKrP/aJkjhvfhlJJIqKvjWzbczbdvy/3q9PXXtL3/8AIasv/AuP/wCKqPtsz+2w8LeIIfFWg2evW+n39kl4rMsGoWzQTx7W2/vI/wCH7teG+MfG3h/wD+1JLrXiRrxLWTwhDbq1taSTt5jTfL8sas38LfNX0DbX1rfBpLW6gn2/eZJVk2/9815XZR7f2rb2Rdys3guP/wBKFqprmUSqkeblHS/tNfDlVS38P2PiPW9Wk/49NOttHnjluW/uruX7v95v4a1/gJ4J13wX4Il/4Sq3S31fXNTutavLZG3LbNMy7Yf95VVf++v9mnfHLwrqfiDwrF4k8Ms6+JvCc/8AbGlSL95tvzSQ/wDAl/h/iZV/vV1HgDxlpvxC8H6b4w0vasGoQbpI93+omX5ZI/8AgLbqcd/eCN+f3jyO78D6N8RPjZ8UfCOuo32e+0DS8SKv7yCRVTy5l/2lb5v++l/irpvgv421iYX/AMLfH0mPF/hNVhkkZv8AkIWf/LG5j/vfLt3f7yt/E1V/Cjbf2nPH6/3tA0tv/RdO+OXg/Wphp3xU8Bw/8Vb4R/fRRqv/ACELH/ltbN/e+Vm2/wC8y/xLUcvL70SFHl99FD4D/wDI4fFz+H/is5P/AEFq1/2hfF194V+G17a6OzNrfiKSPQ9MRfvNNcfKzL/ux7v+Bba5b9mPxFY+Krr4jeKtNhlitdW8SreRRyfeVZId21v++qzPH9n4i+Lnx7tfDPhHxFFpEfw5s11CS+ktFuY49Qm27V8tvlZtu3733drUr+4HP+790s/FfwD/AMKz+Fvg3xF4Zh3Xvwtnt7rdH/y3t22rd/8Afxm3N/wKvdtL1Kz1jTbXVtPmWWzvoI7qCRf4o5FVl/8AHa8o1H4X/GrWNOutJ1T47Wc1nfQNb3MTeF7fbJHIu1l+9/d3Un7MetXy+DL/AOHOuN/xN/AuozaPOv8Aeh3M0Lf7v3lX/dpw91lUpcs+XlNL9p5t3wU1v+H9/Y/+lMdepR/NDEv+wv8A6DXlv7T2f+FKazu/572P/o+OvUovmjg/65r/AOg1cfjLj8bPF/2jf+Ql8L/+x2s67f4x3E1n8KPGV1CzK8eh321l/h/csv8A7NXFftG7ft/wv/7Hizr0jx74fm8WeDNe8M28ipLq2mXVnEzfdWSSNlXd/wAC21n1Zn9pmT8EYY7f4P8Agq3hXC/2DZt/31GrN/48zVyv7Ru2HSvA2pR/LPa+NNNaNv7u7zN1Sfs6+ONJ1L4caT4X1C6gsvEHheD+x9V0yeRY54JIW2qzRt821lVfmrH+LfiLSfH3xC8B/CvwzfQaleWuvQ65q/2SRZI7K3tlb/WMvyqzbm+X/d/vLTvGUC048h0/7TkO74HeNdv/AD5r/wClEdcXrum3nwdvfD3x08O20s2iahpWn2PjGxiX70flRrHeqv8AeX5d3/Af7zV3n7STLJ8C/GjN/wA+Kt/5GjrsNCsrHU/A2k6bqVql1Z3mi2sM8Ei7leNoFVlb/eWhx5pEuHNM8x/aKvrHUtE+G2pabdJcWd14x0u4gnibcssbKzKy/wDAa9hmbc7qvzNv/wDZq+PfHMOvfDXxH4Z+CupLPeaHb+LbHWPDV9I3zLatIyyW7f7Ucki/+Pf3lr6E+Onjpvh78Ndc161k26jNG1jpyr95rqb5Y9v+780n/AamE9ZEwqfE5HL/AA0jt/iN8VPHPxEuIVutJsV/4RHSlb5o5IY/muWX/ZZm/wDHqtfs6rceF4vFXwd1CZmn8F6nJ9h3/ek024ZpIW/9C/76Wsb4b/B340eCfB+naDpPxc07SYFj+0SWf/CPxztFNJ+8kVpGbdI25m+aqt/Y+NvhT8Y/Cnjzx14wstes/FDN4Zvru205bLyt3zW/mKrbW/efxf3VanHmj7woycbSsdf+1JN5fwH8Vt/0wt//AEoir0fSv+QXaf8AXlD/AOi1ry/9qttvwK8WLJ8vyW6/+TMVeh6ZrWk/2bZK2rWS/wCjQr/x8x/881/2q05o85qpfvTXVeWZm+981A+X5f8AgNV7fULG8fy7W+t52VdzLFKrN/47Vrv/AL3zVodInf8A4DSIu0bVX7vzf/Y07/x6mr91l/iX/wAeoAVOlL/F/s7qb91F3f7tOb5W/wDHaAGru/8AZaB95v8AeoZvLXdtpyr/AHvvVYB+X96nwq29WX/epi/d27v4q4/4zR+LLj4ReMIfArXH/CQNo1wun+R/rvM2/wDLP/ppt3bf9rbVUoRqVIxInL2cJSKKfCX4Fa74F134O2fh/Q73w3f6lNqWr6LBeb1+2SXP2mSSTbJ5kbecqtt3Lt2qq/L8tL42+Cnwq+JXiT+3/GHh1NR1CGCG1vFivriCO8t45GlhgvYYZFjuYlZmZY51kX5m+X5mr5K+FcOk6X4v+B2n/D7WbW/19m/4qOextY4J7aORmaS2uI1XzGVY1mjbzm+95bfer1/WZvF2pfHDxVoui+JNZ8M6ZqmtXi6nfaVbQLdy2eneHbF1jjmmhk2/6Rd/6zbu+VlX/Z6sdho4aaUZHLhMRKuuaSPVLP8AZ7+Ddn41/wCFgWvgtV1uTVZNed2vrloJdSk3f6XJbtJ5LTruby5Gj3R/w7dq11fg+z8G6TpX9h+Cryzls1km1DZBffa/muriSWSbczM22SZptv8AD95V+7tr5d8D/FrxbqSaJqHxI+LWvaL4mtdO8O3GleHrHT42XXYZtMiu727uIPL3SRySNdQySqyx232Xd8rfezfgg3jS8/4QjwDoviDU/DVnqFt4d0u8vtNtIY7lbO38MS6hcxrNJG23ddXsK7v+WbK23a26uM6j6T8MfA74VeC5PDcvhXwJp+mv4Ni1CHQjB5n+gx3sm+7WPc3/AC0b5m3bv9nbSwfBP4S288F5H4D01J4fE0njSORVkVl1yRdsl797/WMv/Af9mvlvT/jL8btTl8PWd145TTtRTStFm0KLUdQa1m16S4uX8yZ7KOwlbUdyrHBIsbReVtkk2ru8xdG6+KX7QDfEQ+A9P1jWPsbarqXwzivGtVZl1iS7a7j1Zm2/MsGlbf8AZZlZaA5j6P8AEXwO+DXiyfWW8ReANMvZfEmoWOraq0nmK15eWke22lk2svzRr8q/w1dk+GPw11LxVdeJJtFtbjxB9us9Ynf7ZM0kd1DBLbW03l+ZtXbDNNGvy7W3N95lr5bv/i18SpNJn1Lwz8SdWuvGl9putWuvaG1rbyw+ErhruO00z935W6GZZJI1/eM3nr50m3aq7eg0i88a/D39oXxNb6j4p1xfCLT2Ojz+KLm2jvdR1LUrXS2vYLKaOONVWBvtdw37ld0kkMcC+Xu+abhzH0AnwT+Fq6Tonh+bwTp0um+HdIutB020n3SRQafcxxx3EG1m/eRyRxxq3mbvu1neHf2f/g54Ont7zSvCiLeW+oW+qRXl5qN1d3P2i3hkgt286eVpGWOOeZVjZvLXzG2rXIfsq+PNY8ZWXiKz17x5ceLrrT/7PmfU4Lq2vdNlaaORma2mhihkh3eXuaymj8y23Ku5lkrxr9oC11668fXE2oa1pNvOuqsskWoFlkS3Vm8nb83+q8vyfu/eZmaubEYj2EOY9nJsrjmlb2cp8p9MJ8Ifgz4Z8JazoreGdPsPD+oaBD4d1NZbuSOJtHt1l8u3kkaT5Y1W4uPm3K37xtzVz9t4R/Zh+IXjCf4gafN4X1vV9Lkt9Uu5LTWmktlmt1VYb24tlm+zySRqqqs8kbMu1fm+Va8K8aax420v4IeFLf7OLq2afXdUs4pYGnhubi0gknsFaFl/fRRt5t2sPzeZ9iVfm+7XLXniRda1/wAezeGPHvirxVD4btNcs4JdXn+2x3On/wBh+XujZl2zNe3s3mLHH+78u1baqqtaQq+0hzHnY2n9UrypL3uU+ub/AOCPwh1a4u9VuPBOm3UmreIbPxhPL5kjefq0Cqtvd7t33lVV+Vf3bfNuVtzVX1P4PfBqLx7bfFDX9EsrfXHv4byOW51KaK0n1KOLbDctatJ9nku1jj+WVo2kVY/vfL8vlOn6t8VNOubbX9I8T63fC38ZXHhfTfDawQrp8tnBobO0bKsayfNdW7bZPM+XdtWubv8AxN/wkGj+DdSs/ivrPje/jnh1jWLS7sY2ttL1T+w9XkkjVo41WFty+W1o25o/Lj3f6z95XOc3tT6c0X4XfDW00vwsmg6DZNYeF2urzQWjnaWKD7ZHIs0iszMsiyR3E33ty7ZK5q4/Ze+BUqabanwIiWuk2sNhFapqF3HBPZxTNLFbXMKzeXcwRySM0cUyyLHu2qqr8teT+EfEvxUtNP0jxND4u1uX7L4q0Xwza+HktreHTpbWbQ7SSZWjWNW+a4kkZWVlWNvlXau5a5nwX8avi5/wi93461Lxx/a6+H9J03xN4o0qzu2v7mCSO9i+22nkrZQrZN9ma9X7I0kkm6GNl+6zNXOT7XlPpvxB8Gfhr4s0q40fXPDrzwXGsyeIvNTULmG5g1KRdslxb3EcizW7Mu5f3LKu1mXbtZq5vX/2Y/gDqGn6bb6p8PdOttN8P6d/Z8UUV3PaQNp6yNL5FyscircweY0kjLP5i7mkZvvNu8b0D4nfHWTQr6Hx74k1PQk8L39jpfinWo7GNfIj1O7+1/aY90bKv2aya2g8zayx/apJJFZo91aNv4h8aeNbyXSX+JviO78D2OneLbu11OG3t93iKxtPsCwedJ5W2SPzLi9i8yPy/OjhVt33mpc4c57tB8NfhzdQvdWvh2wlgvtctfF3mROzRy6pDHEtvdrtbb8qww7dvy/Kvy1s+HPDPh/wr/aS+HdNSy/trU7jWL7y2ZvPvLjb50zbm+Vm2r935a+Q/DPxB+IenfCjS7HxP47Pg7XrO70nT7nRbi8XTbKHSf7Mke08jU2tpo7dp9qytLMu1pIWtV8v7zei/F/VvHXjD9jB9c8N/wDCQy6pqmkafNqDT2yx6lNp7Tx/bW8u32r5jW/mN+727lZtu3dUc4e190+hLDXNJ1YStpOrWd79nk8uX7NcrL5bf3W2t8rVS1jxl4T8P3lrpviLxVo2l3V9/wAekF9qEMEs/wD1zWRlZv8AgNfmj+xZHrVx+0n4fuvhzqGnS6csk0PiCLTbaOBV0/7JtkaZYV2rB9o8vyVmbzt27+81dnfeJE1K08T+IPHPiAaL4j1a702GJZNHgvv7QuJr9otRa5+0W03nWlgqyWi20bKsS2jM0e6dZKUKvMuYiFbmXNyn6ILeWbXjab9sg+2LF9oa28xfOWPdt8zb97bu3Luqzt5WvkTw9eeMtPbw/ofhvV9Z0S1uP7L02zn8iOTULLR7jxPPHbwSSTRsyyLYeXG0cnzR/LuXctatx4713Tb4+G/iR8ZvE3hbw9o8nii307Xk8tb3Ury01Hy7WKSRoWW4kjgbdHAq7p2+8sm2ruac59OW2taLdXbWNnrFlPdL526CK5jaRfJkWOb5Vbd+7b5W/us22rTsv+7Xx3Hr3jbTbvUrfw7rWpaXNqGr6p/p0Wmxx3KNceMbGCSTbJG21mhmm/dt8vzbtvy/Knjrx58TvDOsTeDbr4jXth4Z0nX9cs18Q6zry6XPJJDbafPaW0l6tpOsjf6TdssbRr5vkqu5vL2sSmEp8p9i/K3/AHzRu+avivXfjh+0B4Pmt9Q1Ca91aLQbHTfF2sLbabIseoWuo2kFjDaQxyRrJGq3/wBpn8tlWRVVVZVX5a7LTvGHj7Q/F1r4d8RfFLV7rx7pvijRdBi8K7YfI1bR5ILb7XftCse5lZZL2drlW2xtCsfy7WVjnDnPqITWq3C2LXUX2pk85Yt6+Y0e5V3bfvbdzfe/2qlZa+KLXX/ilouo/Dbx1qvi7Xb+DXPBv9oeMtelhi+16Np81/YeZ9khWJVVFZV8xmVmjjaeZdzKu30r4T/EjWtQ+PGveFdW8dX3iCK4k1iSOC2uY2ttPjhuY1hjurKSBZrBljby45FkkjuV3SbvmWnzhGfMfRf91m/3adt/+KoVaP8AZrQ1Gj+9Tn6U1fvN83y/dpzfMv8AtUAD/MKalG75WX/aoXb92gBu7hlo27hu+8tDLuDNupytzt/2fmoAD91v92nD5WT/AHajRdpZm+7Ui/NQAD5vlpfmV6Z/C3+zUjNt3bqAEX5v+A0i7vM+7Rzu20L827/ZoAVVWgfc3Un8K/NSr1X/AGloAEX7y07t/u0wdae3zUANG3Z81OX5UWgdaSgDnX3M3+7/AOPUMu5du7azUP8Af+X+Khfl+Zvu/wANADWbaqt/wJflp38W3/Z+X/apvzfIu7+L5qlH39391aAGN8qq2771P27nZl/iX5qZ96Nf4dv/AI9Tkb97t/h3UAH3t3+zTfm3/wC1/DTtv3V+7WNrPjbwz4b8QeGvDetXzwal4uu5rHR4lgkk8+aGBp5FZlXbHtjjZtzbaANXy/mbav8AtVZ+X5mVfmZfvfxf7tRvHIq/6l1Xd97bWN4g8beHfC+u+GfC+tXjwan4wubiz0iJYJG8+a3t2nkVmVdse2ONm3NtoI5YyNhW+dtv92liblv7tMVW/iVvl+98tUNb1zS/C+j3/ibxFfRabpek20l5eXVy22OC3jXdJIzf3VXdQWa+7j/aamCPduqveapp+m+H7jxReSO2nWdm2oPJFFJMzQrH5m6ONVZpPl/hVdzfw1No95a65pVhrmnrO1nqFtHeRNLBJDJ5ciqy7o5FVlba33WVWX+KgiMYxHBvk+b/AHazrnwz4fuvENl4wuNLjfWNPtpLW2u9zbooZN26P7235t1VdJ8aeG/EHifxN4P0u8ll1bwfLZw6vE0DKsTXNv58O1m+WTdH83y/drF8DfF7wH8SPEvi/wAG+Edaa71fwLqC6Xrlq0EkbW1w27bt3f6xW8uT5l+X5WqbFnUa/o+k+JtFvPD+vWKXlhqEfk3Ns7Mqyx/3fl+apbGzt7Gzt9PsY1it7WKOGJP+ecartVf++a5L4c/FrwJ8XE8Qt8P9afVE8L61N4f1KVYJI1jvodvmKrMv7xfmX5l3K38NdmFkZlXy3Xbt/hosBjeKfBfhfxxYppfirQ7fUrWGdbiKOXd8siq21lZdrK3zVvoq/Ku35V+WnxQyYbdG67f9n7tcf8S/il4V+FNto0nia31u8vPEV9/Zulado+lXGo3t5MsbSt5dvCrMyxxxySM38KrSjEjlibviHwr4d8WWdvZ+ItLS9gs7mO+gWRmXy5o/uyLtZfu7q09zMzNu+9827+9T5lkVFZY32t/FtqlqOoWej6Xda1q1wtnYWNtJdXNzL8scUMa7pJGb+6qqzUcoaGN4y8B+EfiBp0Gm+MNBg1S3tX86KKVmVVk27d3ysv8Au1yC/s2/A9drf8K5075v+ms//wAcr0PSNW0/xBo+neINFulvNN1S2hvLO5jVvLnt5I1kjkX/AHlZWqaaRbW2nvrhXWK1Rpn2ozbVVdzbVX5mpckROEZfEY3g34e+C/h/b3Vr4L8PwaTFeOsk6xNI3mMq7Vb5mb+9WnF4X8Pr4mfxkump/bcln/Z7XnmNua33bvL27tv3v9mneG9Xs/FOhab4j0iO7ay1S2jvLb7TayQS+XIqsvmQyKskbbWXcrKrLWrDHI25ljdv+A0+VD5YkSSfOrL8vzLWX4b8I+GfBsN5a+F9JTToL65a8niikby2mb7zKrNtX+H7u37tagXa3zfe/wDQaY8nzru/hqiuUoQ+G/Dtr4ivPGFvpqJq+oW0drc3e5t0sMf3VZd235dq1d/2v7rbVrmtb8feG/D/AIt8M+B9WvJ4NW8XNeLpCeQzRytbQrLMrSfdjby/mVW+9tbb92ubtP2hvhLcaJ4/8SL4sX+z/hjfXGn+KJ2tpP8AQpoF3SKq7d033WVfL3bmVlWp5Q5Tq/Dvgvwv4PbUf+EZ0WDTv7UumvrpYt22Wb+9tZvl/wB1flp3hvwT4X8L3+rapoOjpZ3WvT/atQlV2ZrmTc3zNuZv+ejf99VpWl0t5awX0Ky+RcIskbNGyttZVZdyt8yt/s1k+JPHXh/wTceHrXxFNcRP4q1qHw/pmyBpPMvJo5JI1bb91dsMnzNRyxJ5YnSr/db5t1ZFh4L8N6X4m1Hxhp+jxW+r6tHHHfXaM26dV27dy7tv8K/NtrZEcjfwt/3zUnlt6H/vmnYqUTK8ReGdB8XaLL4f8Saal/YTNGzwOzKrMrbl+6yt97bWltVVSNfuqq7aSbzFl2+W6t/d21GnmM/ltG/y/wCzVDMrxD4V8P8Aih9ObXtLivG0m7W+sWkZv3Fwv3ZF2t96tdN38VOaGRk3NGyr/e20L0/4DUEcpxHjH4M/DH4gX39peLvBtle3u3b9qXdFOy/7UkbKzf8AAq0vBXw58C/D2GWz8E+F7LSUuP8AWtAu6SX+7ukbczf99V0Pf/Py1g2Pjrw3eePb34Zw3kreINN0i31y5g8ptq2c00kUbeZ91m8yGT5aIxj8QezXMbGu6Ho/ijRbzw74g09L3Tr6Py7m2kZlWVflbb8vzfe21Ygt7extYLGzhWK3t4lt4o1/5Zqq7VX/AL5Wsjwj428N+PIdWuPCt5LdJoetXnh++ZoGj8u+tWVbiNdy/Mqt/Evyt/DW80cn8Mb7vu7dtOwcpznifwX4X8XTWE3iTQ4L99JuVvLGSXcrQTf3lZf91f8AvmjxH4P8N+MHsG8SaTFqLaXdrfWfms22K4X7sm1W+Zv96tmZvJhnupt6pCjSSNt+6qruasjwN4u0H4g+EdF8c+FbqW60bxBYx6hp8skTRs9vIu5WZW+Zf92lyhyxNwfM1ZfiTwn4d8aaZ/YfijSYtRsllW4WKRmXbIv3WVlZWVvmqPxv4w8O/Dfwre+NPGV5LZaTYtCs8qwSTMrTTRxR/Kqs3+skVa23hkjZlaNv3bbW+WnYDI8S+G9D8XaPcaD4k02K/wBOulVZ7aVm2ybW3L935vvKtcSP2b/gXj5fhrpv/f2f/wCOV6QfMb5drfLTkVti7o2X/gNRKEZA4Rl8SOV8I/Cn4d+Ab2fUvBvhW10u5uIvs8skTSM0ke5W2/MzfxKtdbu+VvloZZI/9YrL/d3LQrKvzfe+WqilH4Sox5fhDb/7M1A+X5qP/Hq8p8d/tQ/Bz4c+IdR8M+ItY1e4u9Cijn1x9K0K91KDRI5F3K17LBEywbl+bazbtvzbdtWM9W7L/wABajd/8TVfStQ0/XtNs9a0O+gv9OvoI7q1u7aTzIZ4ZFVo5FZfvKy/NXK33xe8C2Pie/8ABrahez6zpepaTpd9bW2mzzeRcairNaMzLHt8tljZmk+7H/Ey0Adg33W/vU5fuN/31WD4J8aeHfiJ4Zg8WeEbx73Sbie4t0naCSLdJb3EkEy7WVW+WSGRf9rbXQeXJuXdG/8A3zQA3dxu205fvfN/F81ZOr+K/DmgatpOg6zqsdtqWufav7OtdjNJc/ZovNn8tVX/AJZxru/+yap/DGvWPirQ7DxJo8d6tnqUC3EC3lnNaTqrf89IZlWSNv8AZZVoA1EWFXaZYUSWRdsjqq7m/wB5qXzNw27vu0eSzLuWNtq/7NRBmb7qt8tEpSl8REYxiROqsVk2r8u5d38VOibaf96uG8X/ABs+GfgOfxND4w8SR6TH4P02x1TWLmeJvKghu5JY7aNWVf3ksjW8irGu5m+X5fmWsjwJ+0V8NfH/AInTwVY/8JHoviCe2kvLPTPEugXekz31uv3prVbmNfOVfl3bfmVfmZamxZ6qPLZlkZVZ1+638XzUx5Gb5lX+HbUYaT5cK3/fNTxwybVZo2Xd/s1QEW1WeSTy1Vm+8235mqwnyqq0bdsTzMvyxrub/ZWsbwN4w8P/ABG8JaR468H3j3uia5aLfWNy0Ekfmwt91tsiqy/8CWgDZiWOFdtvGkStIzfIu35m/iqG7t7W6/4+LeCXb91nRWqhN4o8Px+KIPA7apEuvXGnSatHp/zeY1nHNHE0/wDu+ZJGv+81X5WZdq+Wy/8AAaz5eb4hxqSh70TC8X+D/DvjjRW0PxNpv2yzWWO4i2yyQzQXEbbo5oZo2WSGVW+7JGysv8LVh+FfhD4X8N63B4k/tDxHrmqWqSR2d14g1651JrJZF2t9nWaRlhZl+VmVdzL8rNtrqta1jS/DOiah4m8RXyadpOk2k19eXU/ypBbwr5kkjf7KqrNVfSvFuhaxrkvh7TpLuW6h0621VnaymSBrefd5TLKy+Wzfu23Irbl3LuVd1ESfjleRvxttG37tCsqoyrGqbmZm2/xM1Hlso2srbv8Adpkm5VVWVlarGRO27P8A3zREvlszKqr5jbm2r/F/erB03xx4Z1jxlr3gHTb55dc8M21jeanbeRIqxR3ayNbssm3bJuWGT7v3dvzVvLu3L8rUCJv+mbfMrVIFVUWNflVV+7WTr3iLQfCdtBqHiTVINOt7q8tdNgefcvmXVxMsVvCv+1JIyqv+9Ws6zL/yzZdv3vlpjK08asm1o1ZW/hZflpj7mauHm+OXw1XxCfCsmsTLqS+LF8E+V9jk2/2s1l9sWHdt+79n+bzPu/w7t1d2IWk27Y2qeURUs7GztXlks7G3t2mbdK0USx+Y395tv3q5HXPgR8PfEGsXviHy/EGjXurMsmptoHiO/wBJj1Ftu3dcx2ssazSbVVfMZd21VXd8taWm/EvwRq11o0Gj6tJqI12/vtMsZ7O0mlt2urLzFuY5JFXbDtaGSPdIyqzLtVmauuKyfL8rf980uUZnaDoOh+FdGs/DfhnSbXTdLsY/JtrW2j8uOJf9lf8Ax7d/E1aI2sq+Yqt5bKy7v71NkWT7zRsq7tv3aN31qgHTNuXbuqu9vHMirJGrr8rbWXd92pj/ABf71G361IEQXbub+7Ug271by13Ku3dt+bb/AHa4v4pfGLwL8G7DSdQ8cTatt1zUP7L06DTNKuNQuZ7jyZJdqw26tJ/q45G+7/DUXw3+M3g/4rXV7a+FdL8W27afEs0ra14Xv9LjZWbaqxtdRRrI3+ytOMQO3f5juojhWN2ZY1VpPvMtZfirxZ4d8D6I/iTxZq0Wm6bHLb27XM+7ask00cUMfy/xNJJGq/7TLT9H8U6TrWua54esftf27w9PDb6gstlNHGsksSyr5cjLtmXay7mjZlVvlba1UBsL9ynfLn/gNNZZN23y2Vv92l8uTPzRt/3zQA2kO7dtrJ8UeKtH8GaWut6814to1xb2atbWc1y/mTzLFH+7hVm27mXc23aq/M21a2Gjk37drfe20AR/Nt2/8BpV2/8Aj1YHgjx14Z+JGgN4l8JX0l3py315prSyQSQstxbTyQTLtZVb5ZIZF3fxbflroNrbVba21f8AZoAFoDbW+7TvLb7rKy/8Brynxh+078IvBXjPVPh/qlx4ovde0OO1bUrbR/Cmp6ktt58ayQ+ZJbQSKrNH833qAPVB81Lu/irA8AePvBvxU8K2fjb4f65Hq+jXjSRpPGkkbLJG22SOSORVkjkVl2tGyqy1m/FH4seD/g/ollrnjJtSf+1NQj0nTbPTtNmv72+vJFZlhhghVpJJNscjf7qtQB2Xzfd+7QOteXW37SHwvuDpkc91rdlLqy6u1tBf6Hd2s23S4Vlvd0csasu2Nl2/3/4d1d34S8TaP468K6R408M3D3Wka9Y2+pWM7RNG0lvNGskbbW+ZdysrbWoA1t33m/hWjcy/99UNux8vH8NKfvUANp3UqtIv/j1KvSgATd/F95qd94Mq/epq/MKkHy7dv3qAGr8o/wDQaF6H/eoVfmo3bQ3+zQBzXzNuXt/n/wAdoVfur/nbR93a396gff8Al/hX5v8AaoAdu3blVf4du1qIvlf/AHV/i/ipq/7X3l3KtSK23du/ioAP4fl+Zd3/AI7R8u5fMX5Vba1H8H/Atu6h/mRlb5dv/j1IcZWkfPXwZ0H9qXTfjj4w1D4o63HdeBrhbj+zo/tMMkZbzl8jyI1+aNVj3K27b/wJvmrf+NjL/wAL3/ZxVv8Aoata2/8Agjua9kVeWqK50/T7yezvLzT7W4uNPkaa0llgWSS2Zl2s0bMv7tmVtvy7flas6cPZKx1Y3GPGTjPlS9D40+EkOvaF4S/Z0+J2j+LPFes+LfHraxY6v/aevXd3BqkK6ZqFzb27W8kjQqsc0FvtZVVvlbczMzVznhOTwVrHiL9nDxZo3xQ1bxH8QfEmn+INS8R2s/iGa9l/tJtBufOka0aRltJIbhpIFWOOPavy7W21912ui6Lbw2Fvb6Lp0UWl7msUjtI1W0ZlZW8lVX9221mX5dv3mqnbeD/Btjq8+uaf4P0K11K6na8nvINNhjnlmZWXzmkVdzNtkZd27dtZq1OQ+RPCvxqsdc8Mfs3aXpvxib+15vAevXniGW0vG1G5imt9B/4+Lu3jZpJpIbhZJFjkVmaSNtvzV5dd3UH/AAqX4ieB/EGu3+uX2sfCXUvEEWr6B8Q7nW9H1trTypP7RuLe4/0uwuWaRf3e5YZFkmjZW27V/QzTfBvg3R72XUtH8I6JYXdxO15LPbadDDJJcMu1pmZV3NIysys33trNWDqVr8H/AIT2L6heeH/D3hy38Uana6TO9ppEcf8AaF5cyeXDDN5Mf7xpGbbuk+X5m3UcwHzdZaHpep6t8Ur/AEXx94ol0b4f/CnQ9S8KpY+Kr1rSK4m0zUN12zLL+/k/crtaRmX/AIEq7eD+KnxHutb8Ca/run+INUXXfBHw68P3Uep6t8RZ9Fj0vUJtLju45tOsLaNpNRnmaSNmkuPlkkXy1barV9vpJ8K/Beq2Xw9/s/w/o15rWmXU0GnRWMcEU+n2m3zlbavlrFH9o+63y/vG2/xVwfhj4tfsp/Ejxtomm6TZ6Df6zeRSab4e1G+8IyQQXscatugsL24gWGZfL3fu4ZNrLu27loAyPgFfSap8YfjTqkkySz6hH4NupZFVfmaTQ42Zvl/vbq+ax4q1T4D/ABG+Knx08O6bcXUvibxt4w8BzxQRtJ5useTBd6LuVf71wtzBu/6eK+m4/wBrL9mHSLy/t9FvNRiljuW0+7l0zwTqjRySWzNB5fnQ2m2RY/LaNfmZVVdq/LWz8QPil8EfhrrS+FfF2mv9tuPL8SSW2n+E7nVNsjTMsd3ItrBJtlaSFtsjfNuj+98tAHyr4W0jw/8ACTwp4q+DMA1a4ku/i1b6DHbWfiFdAttVktvD1lLcR3+osvmQwSNHJIyxfvpZNqr95qn+F2qan4+uvCvw3vfHGpp4eX40a9oJi8PeMb27i/suPw+bv7BHqLeXcT23nM3zNtb5m2t8qtX0p4C+LH7OP7Qj3fhnwrp9r4lt9QVtYu49Q8HXMdldtGyx/aGkurZYZpFbau7czfL/ALNet2HhXw7p80Ulj4X0u3eF/OjeKxhjaORY/KVlZV+VvL/d7v7vy/do5gPknwN4suvAfjzwj4d1Tx5qNp4T8MfGHxl4Vin1jWJGjWzXSWltLSe4uJP3irJI3l+azN8q7fu1z2hJ4Q+LXxf8C+LdU12/8R6evxp8bWun3NtrV35LWMGmSXMUcPkyKvlrJGrLt+8u5f8AVsyt9m29v8N/HCeI/C/9g6TqkGm6r9n1yzu9IVoG1Dy45d0iyR+XM22SFvMXd/vblp2oy+BfCur+H9Fm0eysr7Wr64j0iO20r/l6W1Z5m8yOPbC3kxsvmMy7lXbu/ho5iD4W8DfE28u/iZ8IfG/g/WJmufHutal5zar8R31TWNds5LS7ljjvdJhRbGyjWZbdVjjbdEyxx7d26r+ir8NfF3wS0jxBrnxl8X6h8SfHng7xE3iTRINeubhtQvl06eW5hubRZGWwjtJo9sflxw7dqwtuWRlb7Vsfh74B029l1DT/AAH4cs7q4ulvpZ4NIt45JLpd224ZlXc0i7m/efe+ZqtWHhPwrpesXviLTfCukWWqaou2+1CDT4Y7m7X7376RV3Sf8CajmLPjz4NfEDwd8Of7Ghm+Itvp3heb9n/TdQsWvNfaS2bUFuLlrtoWmkZWmVpI1ZV+aNfLj2qqqtQ/Bix1D4happeveJvGXiu4/wCEb+BXhXxFZ20euXcUUmrSQ3267mWN186T93/y03K275t21dv143w7+HrWmnWbeAfDX2fSZ5LzT4v7It/LsriRtzTQrt2xyM3zMy7WatLT/D+h6eN2n6Hp1ruto7FvItI4/wDR493lw/Kv+rXc22P7q7m/vUcwHxZ8PNBn+Lui3TeOPGXjC4j0f4BeFNdtY7XxHe2i/wBqSW18329vJkVpJ/3Ktubcrbm3bvl20NY8fad4q8D+JvFHxr+MWt+Htc0f4P8Ah3XPBLW3iKfS2ubq70p5bm/hjheP7XPJeqsTblfau1dq7q+ofF3xu/Z9+EusXXhfxNqVhpt7a6dbrqSWPh+4uYtP0/5lhW7ktYZI7aDa0m1ZmVdrM33WrO+I/wCznH8WpnvtD+KV1pPhfWNFh0t9MtNKsr+CGxaPy2k0qaRW/s5prdvLaSHcrL5bbdyq1AHf/DK8u7z4WeCr7UbmWa5uPDmlzXEzuzSPI1tGzMzfeZmbd81eLfBPSf2qLX42+Nb74r6qsvgaRrj+yomlhkjZvOX7O0Cx/NGqw7lbdt+bb95vmr1y28efDvQfGFl8C9Lvp/7e03SreaPTYLG5ljtLNY2WHzrhY2hh3LC21ZJFZtvy1t614k8P+F7OC+8Satb6dBdXlvpsDzttWS6uJFjhhX/ppJIyqv8AvVlOHtJKR14bGfVoThZSueMftc6ongPwf4S+N8sMzp8MvF+n65e+Su6T+z7hXsrvb/2zu93/AAGvmq88Baz4U1L4bfB3U9Nmd/2jtJ8PXniXaP8Al+stUbVNW8z/AHra9kRv+ua1+gOqaXY6tZz6Xq2m297Z3Eflz21zAs0Mq/3Wjb5WX/erz65+N/wRHj3QPBupeILL/hJrzXL7w7osc+mSNJ/aFvHF9phhm8vbHtW4jjZtyq27bub5lq0ch836hrznTtb+IS/ELVl+OMPxTbw/p2gHXpf+Pf8AthYItMXTPM8lraTTv37SeT825pvM+WsLWtA8b3HgDwf8R/AutXmufETWvjjqmm6L/wAJPrNzPpdsttc6zFaRLEzMsccfl7vlXc33d23aq/aEmp/Ce3+MFv4UmtdF/wCFkzaDJq0Un9mK19/ZazeUzfafL3LH5jbfL8z/AIDXTDRdLVLeFdFsljt52uoI1tI9sUzbt0y/L8sn7xvmX5vmb+9VcwHw/rHjLWtD8B+BdX8DeLvGF3qnxM07VPhjr39q30jXun+Mrm5ibdNH922uYZP7RVVjVdsaw7fl21jaj8QPizqXw31/WV1/V7EfD6fw78IvEN9c6vcWEKtDqco1a/muVWRoGkh/s5Wu1jaSOOeRlr7qjfwfN4ovvDcOl2TazZpb69dx/wBnbdrTNJHDc+dt2tL+5kXdu8xVX+FWWtSXTdNjtrq1/suz8q+ZpLuL7MvlztIu1mkX+Lcv3t33qrmA+Dn8XXGg6D4m8C3ni61vtB1Lxn4f0nSNF8L/ABIu57azupraee5sLrxBewRyW9lMtvHI0cEkkyszRrt87bVHwFeal4+l0X4W3XjrUE8OH413WgtF4c8ZX97Gumr4ce7ksI9Rby7iaD7R5nXbtbd5f3VavuVvAfgf/hG28Hr4H8ProMjbm0j+yoPsTNu3f8e+3y/vf7P3q8xtPj3+zBo3jhPAtprWi2eqW+rx6Ss8GgzLYQaoq+Utt9vWH7LHOq/utvmbl/1f+zUxkB4Xouuab4J/aItdSm8ZT+KLe6+In/CL2dxpnjK7h1jS1Zfs0ej3+i3atHcWUW3d58X7xlVbjd95q+v/AIpWvja6+HviG3+Gd1Ba+KZLGRdLln27VuP+BfLu+9t3fLu27q0ofBvhNfEbeMF8J6MuvNF5P9q/2fD9t8vbt2/aNvmbdv8ADurU2yb/ALrVM48y5S6NT2U1O2x5V+zjpvxn0/4XWsPx1vPtHiX7TM3LRySpb/8ALNZmj+Vm+993+Fl/iry/xX4S8feKv2z/ABDH4B+Lt74BubX4aaK1xPbaLaal9qjbU77arLdKyrtZd3y/e3V9UXEkdray3lw2yK3RpJJNv3VVdzVxHhTx58NfHmrRah4Nvre/vtQ0Cx1qO8j0+SOSfSblpPszedJGu5WZZG8nduX7zKu6lCHs48peJr/Wajq2tc+LND1z+zdHb4XeKNcvvEmq6p8VPHU95Nc+J4/Buk6s1k8SzTX88EbSLtaVZI7a2+825m+WOtX4Def8dNR+EXgrxt461/UvD7WPj+GeLSfFF+sOoQ2WrWkVlHJcxtHcTxxxyL5ckjLIyrHu+8yt9qav4H8F65Zrp+ueC9D1G1+1/bvIutMhnj+1N96bay7fM/6afeq1p2g6Dpt59ssdB061uN0jebBaxxybpmVpm3Ku794yru/vbV3fdq+YxPiL4c6/pPjrSfB2h/H74r61pPh7T/hxqWoaLfTeJJ9Na+1KDV7u0muZJ45I2ubmC1htNqyNJ/rpG2tuavUvDeueJvC//BNTQvEXgW4u7fV9P+HNjJBd2abp7aPy41muI1/56RwtNIv+0tfRl34L8G6xZ2em6t4P0O9s9Pn+1Wdtc6bDJDbTfe8yFWXbG25vvL81O1vwtbar4OvfBmj6lfeGYLi0aztrrQpFtJ9P/uyQMq7Y2X+H5dv8O3bQLl5T4J+Md98NNLPxE8M/B34pX/ibwrb+BPDeoTwSeJ59atIL5vEdsvnLJNLIqyyQ+WzKrfxfdXdXTeNfGLR6R8Q/ibN8RtYg+NOgfEmTQ/D3h9dcmjX7OuoxQWGmLpXmeXNBc2jeYzNCzN50km75fl9Ll0r4Ofs6eMGuvjN4+vPFfiXxho/2GztovBK/Zl020uvOk22WmWzR7vtFwskkknzM3l7du2vYPBNx8NfiVNB8UtB8Lwz6jH5lnBq+o+HJLLUlVfvKrXMUdwsfzf7rUDPnC08SfEpfG+qfs86Feaze6p8K9V8QeNPPlnmkfVNNa28/QbSSVvmmVrnUfLaNm+ZdMZWrzj4LeJ/E0kHhrxJH8ZdE0a48UeB9e1DxTfWfjTVPEuqXci6c0jajJpjWnl2VzaXW1titH/y0gXzNq191f214PXx5ceFbeSzHittIh1S5iW22ztp/nSRRyNJt+aNZvMVV3fL83y/NTP7H8E+B/wC3PHEPh3SdJdoJL7V9Qs9MjWe5jhXzGaRoY/MmZfm+X5moA+dP2PNU0zSPHOq+A01E6jf3PhOx1p9Q0LxtP4h0DU4/O2fb/Luf9JsL2XzPmjZtsir8v+rr0H9qjQ/2idc8N6LD+z7qv2S5jvGbU1iuI4J5F2r5bLJJ8vlq27cv3m+X73zLXq3hPw74N0fTft3gnwvpOkWesLHfP/ZumR2Xn+Yu5ZJFVVbdtb+L5q3Ejk+X923zVlUhzrlOjCYn6rWVW17dzM8Nx69b+HtLh8UXVvcazHZwrqEtuu2KS68tfMaNf7rNu2188fBj4mfDD4RQ/GjQfi94v0Pw/rFl4917XdVg1S7jimvtNuystpcJHJ808b2vlxLs3fNH5de9WXxC8D6pe6Xpum+Ire9n1q71CxsfsySTRzXFkzLdx+Yq7VaNlZW3MvzKyruap9a8D+D/ABFqNlq3iTwboerX+mtus7q+0yGea2+bd+7kkVmj/wCA1cY8pjOXtJSkfEnxy8aeDta0y9tfBmj6j4NsPCfwzs9Y0zStd8ZTeE7bw79pjnltpLSyslaa9vf3ccbKzeXGyxx/KzNTNC8b+ILjx/b+JIfEV5Hf+JPEfwZ/tOeCfy2vVu9OlaaOTb95ZPm3L91q+49S8J+Gda1Kz1rWvC+kajqOnqy2d5dafDLPbK33vLkZdy/8Bp0Phfw7aokdv4Z0mBYfs7IqWMK+X5Pyw7dq/L5a/wCr/u/w7aok+EvgVq/hfQdF+FWr/D34lape+P8AWvibqWi6z4ej1+aeNtJkv75ruOTTPMaOGGGFVuVl8tWWRlbd+8pngiSxtPgh8GW1rxF438S+Jfiw91faguq/EKfR9NvlsIpdsd1et5kkEUKzR7YrZVado1aTd5bV916f4P8ACek6i2saT4V0Syv5Ivs7XVtp8MU7R7t3l+Yq7tu5t22o9T8E+Cdc0WLw3rng3QdR0i3dZItPutNhlto2X7rLCy7V+833V/vUcwHw18HbnRfFfjT4La/408WfbV0Pxz480PSLuPxVd3Nt5cCrJZWsN1NJHJdrubbG0i7pY1VWVl+WtP4QeIdD+I2ieHrP9or4wa9oelaf8KdJ1zQbpvFlxpLXd1JJdrqOptPHNG1zcw+TbL+8aRY1bdt/eV9leIbHwD4d8OXWueIPCunvpejyf208cWjrdyR3Ea/LcRwxxtI0q/LtaNWk+X5a8qsPj/8Asm/ELVNO+H9vpqavdaXfQ29pp118P9RaHTbqTa0f+usvLtG27W3N5fy/NQB4TpjeMPi74Z8XeIviP448a2eq6D8DtB8TW8Wn63d6Wqaw0OqOuoSQ28kf75lt4pNrfu/mbcrfLtx/FXxI1KPxBYfFbxN4/v8AX1tdN8GzXNloPi2fR9d8P3F1aW0kn2bTJF+xarFdyT+Y3yszeZJGv+r+X7+fR9LuJrq4uNJs3n1CJbe7ka2jaS5hXd+7kb/lov7xvlb5fmb+9XK+ONP+EPgvTf8Ahanjrw74csoPB9mskWtT6RHNLpduvyr5MixtJGq7vux0AfLnjpYdQeX9orV7Vp/Cln8crW81iWONpI7bQ9Hhl0mG7ZV/5ZQ3scly391W3fw11fjX49TN8ffh9Y6X4h+Dvjzw1q2p3UmlRaKj6h4j0a1XTJnuL1ZI5mhVW8to9yx/Msm2vpbUrjwz4L8J3+pXkNlpOg6XaXF5deXAscENuqtJM21V/u+Yzf3vmrivhDefA3Ur/W1+D/h3QdOvLVLG41f+ztBXT5Nt7brd23mN5Me5mhkWTb823+La1AHx78K/iBcN8U/g34k0HxRqFlb+Pv7YmvrvUPiHN4h1jV7P+zLmeGa90qOP7HaNHNHCyww/Msi+Sq/K1ehfsneJxovxO8M+HtU8S3Hie98WeGb6+j8RaF44uNY03xAsTRSNe6jp14v2jTLn5tq+Xtj3SSQ7flVV+rtP+HvgXRbmW80nwH4esLia7/tCSW20i3hkkuvm23DMq7vM+Zv3n3vmb+9VDwr/AMKvs/HPirwz4P0XRLDxRp6Wd94hWx0qO2lZbvzGt5JpljXzmby5G+823b81HMB4v8ab/wAJ6z8fNX8L/GT4l6t4M8LaP4Dh1nwz9m8QzaPDPfNcTre3fmRvH589usdoqxN5iqszN5beZXzz4G1XxHq/hj4T+BtSvdMTwnY/CHT9Y0q21Tx/e+D7e4vGnlW7u1uLOGRriWCOOBfLZlWJZPM2tur9C9Z8L+HfEgtV8ReG9L1f7DOt1afbrGOfyJl/5aR+YrbZP9pawfGeh/COHTNB8N+PPDPhRrC41OHTdD0/U9Mt5IWvpFZo4beNlZVkZY5G+Vfuq1HMB8QWmq+JIPEXhj4q3PiuLxF8SJPgNr194f1C0v7tota1S2u/LtJIbeZYftUjW7eY0fkfvJP3nlt8rUvgHxZ8SvDX9ja38K/FWhX+sa54A1zVp9Pi+I2o+LrvxBdQ6d5ttdtbTWiw2k8d4sat+8jVvOkhVW2rX3P4xl8D+H49H8Q+KtHtXk0+/t7HSrn+ymu5bS4uWWCPyfLjaSHduVWkXaqr95lWrmgeA/B/hnUb3UvDPg3RNIvNSk8y+udP06G2kuW3femaNVaRt396jmA+JvFGn/BfUP2edXbwz8aPFvijxH4u+EGsa9qen/8ACR3eqRahNb2kc7X92vmMtlJHcfu1jXylk8ySFo2VWWtDxV43vfC9pr+k/D74hata+DLfwN8PYZdTsdXmu/7I0u71a7g1O/hmaSTbItvuVp926NVVt37tdv1r4Jh+FeqP4j1X4e6PoCs2r3Wj69PY6ZHA099byeXcR3DeWrTMrbl3Nu+9/FXBX37Qf7L3wy1TU/CH2rTtLi0Vl0fWbnSvC88mk6W25v8ARLu7t4GtoNrTNujkkVVaRt23c1AHzz8btftfA1p8TPBPwH+KWuzeEofDHh3Urm6s/E1xqjaFrFxr0EEfkXcksskck9r5kjQ+Ztby1bb+8+b3L4R6BH8Of2nfHnwv8P6vr0/hxvB2i+IVs9W1a51BotQmu72CaWOS5kkkXzFij3KrbWZd1el+GB8IV1PVfhd4R0bw3BJp9vZ61qGk6fpUUNssNyz+RPtWPyZPMaCT5l3N+7Vv7tdgtjZx3r6h9hiW8kjWGSfyl81o1+ZVZvvbfmb5f9pqAPib9orVNW0fxh+0tc+Hde1HRNS/sr4awxahp87Q3Nt51/LHujkX7rbWb/e3bat/EjRpvhf4h+MPwx8M/GDWfCWgzeF/CurRah4h1zUb2G0vrvVbm2n8y63SXFpHcrFHDNNGyrH5jSfLtr7HuPDuh3kl1NeeH7CeW+WFbppbONmnWH5o/M3L+88tvmXd93+Gqniu68H+H9MuNY8XaXC9vqTWuk3LNpjXclytxMsUMMixxszReZN/F8q7mZtq7moIPgXxQfCOs+APEHg3xamq6TF4N+JHgi8vo7X4iT6zoFnb3t6sUklpf7o7iFWjWSSSGdt0TNHNH5e7dTf2h/iVpcMnxE8deCfEk9le+C/Etjo+j61q/wASJ7a9tpLeS2VrbTNGt1aO4gZfMZpblt0qyTSMzKq19+W3w/8AA+l6BceEdP8AAvh6z0G4ZvtOlQaVBHZS7tu7zIVXy23bV+8v8NQzfDz4f3F7Lqtx8P8Aw3LfXFouny3MmkwNLJaqu3yGk8vc0e35fL+7tX7tHMWfHmqtax/HCeQqrIv7TVv8qr97/ilK474e/EeLXfib8HvF/hrXtTgh+IHjC6s7u71n4lSahrWt6bNDd7o7nR4FWyso1ZYVVY2WSJlhVV3MzV+gH/CO+H/OW4/sHTfNW5W8WT7HHuW4WPy1m3bf9Zt+XzPvbflqhYfDj4e6bfXOpab8P/DNreXl3HfXNzBo8Ecst0rbo5mZY9zSKzblkb5lo5gPir4NXA8A+FPhfpXws1q+n1ef4g/ECHU9I/tie58+6t7TV2sra5ikkbb/AKm2k8ttu5v3zbmbc3SfC3xDolqfgF4s8BfFvW/Enj/x9c+X490658R3F99pt2sJ5dRlnspJGjtGtLqONV8uOLy/9X/FX2FaeG/DtrfSalZ+G9KgvJrlrySeKzhWV7hl8tpmZV3NIy/L5n3tvy14zqv7Un7IPw78aavZ33iLS9I8UXF1NY6lLaeE737TezQt+8jaaG2/0jay/wALNQB4t8EdN1Dw54R/Zd+LEfjnxjqXiP4h6n/Y/iOXVNfu7uDULGbTr6aOJreSRoV8lraHy2VVb5dzMzMzV9hePP8AhLm8Ga6vgNrceI/sM39lNc/6lbra3l7v9ndR4P1LwX408J6J4o8H2dndaDIn2rSJV01oFiX5l3RwyRq0LfeX7qt8zVvqu7+Fm/4DUzjzFUp+znGR5D+zHb/He38CXSfH+fzda/tGRrPzGgadbXav+sa3/d/6zzNv+ztr2Af7XzVyn/C0PA8lxp1tY64L1tW1q48O2z2cE08f9pQeZ58MjRqyx+W0Mis0m1dy7d26upG7arfN/wB80oQ5I2NMVX+sVHVty37HzP8Atq6hLpuo/BO6h+I2neA5Y/H0jL4j1KKCW20//iU3n7x452WNt27b8zL8zVXu/F3hPUvhN8Rl+In7b+k+NbOz0pdSXU/Ca2Gn6h4f8lvlnh+wStJIzTNbqscnyyMqx/N5jLX0frvhfw94ptks/FHhvS9Xto5POSLULGO5jjbbt3Ksisu75vvV5pq3iD9mH4cnxbNq+k+DvD6eD201telHh+KNYprj9/ZRr5cP+kS7lWRY490it5bbdzLVmB8h+I5Na+JH7N/jzxB+0hres2XxL0XxV4R/4SHQZbyXTbbQdN+22i280dvDL5axy289xPJK3/LbcvytAu3u/G+v6hqfjbxX4L8LfErxJbaBJ8Wvh74d0+50zxBcb4tNuNKg86OCfzGbbN8zM25t7N5jbm+avpPwR8Wvgb8Ztb1nw7oqwXWvNpsf9p6Vr3h6fT7+fTWZtrNBexRyTW25m+ba0e5v7zV3Vr4T8K2McVvY+E9ItYo2hkiji0+GNY2hXbCyqq/K0a/Kv91fu1Qz4x8YanffDnWviT8L7Tx94o0r4aab8QPB9rrF/Prl3Pc6Jouo2Hm3e2/mkae3gkuFt1aTzP3azSbWXdWVqPjnw/4X1f4qJ8M/jHrOpeCvCvi34ZrFey+Jbi/tNKt5tRb7fDHcySN/o3/PTdIy8tGzbV2r9Y/F7w1oXiLT7LwlH47ufA/iHxRqMf8AZl9p8cXn6hcW0Lu0E0MitHdxeRHL5kMysrRr/DtWvKPA138Efg3pt9qfjjxhqni3V/ipqMmhyRTeDZE+3rpivA1tBpVrbfu7SFWkZnaNlbzPM8xlZakg4b4u/F6bUviD8X18CfEqe6sNJ1X4X2cTaVqrSQWklxq8kd3GrQttVpI9scir95flas648Tt4Z/aFbxTqXjW68V2t58Tm0O2vtB8dXNpqWltJc/Zo9Fu/D90vkzWkbNtaSBfMaNftCt/FX1t4F034X+IPCVhqngfwroa6DfRRtaxxaKttG0cMzNH+5aNWVY5PMZdy/Kzbl+9urW/4QXwW3if/AITb/hC9D/4SHy/L/tf+zIft+3bt2/aNvmfd+X71VzFnw34L8MN4N+Gfhv4u6F4s8VW2uT/HKbR9ia1cjT10258Tz2s9p9k3+Q0citJIzNG0nmNu3fKqrh6D4w+J+seIn8eal428O6J48X4kto7LqXxC1MXMEK6l5Eej/wDCOw2kkLQyW21V+ZmbzFuGkX5tv3frGo/DTQ2n8M6pHo0U+m2M3iyTSo7NZJo7eGbdJerbqrMzLM33lXc0n3fmqTS/DvgHxFead8UNN8J6RPql9YxzWusy6RHHqP2eSPcq+ZJGs0f7tvutt2/d20cwHin7JXhX+0tb+I3xT1rxR4m1bWI/H/izw/ZxX2tXMtlYafDqbbYIbVm8lfmXdu27l3bVZV+WuWk0T4663+0r+0dffAj4kaF4e1awtPC//Eu1XQlvItQuP7LZoVaYyr9nX7y7tsn3t38NfWdlY2djG8On2MFqkztNIsESxrJI3zNI237zN95m+9TrbT9Pt7u41C10+3iurzb9pnjgVZJ9q7Y/MZfmbavyru+7U8wH5/P4ijj+Gvwu0Lwnrt1FY+NvGPiK4+KH/CUeJpPDkr+LFj8yTTr29soGa03TLM0cMccfmrDCu75vmbZ+Go/H0nwq07xf4uj8QadpfxsutH0j+xPF+qX8en2P9kTzyWX9otHbNdtDcRfLOvmMsbeV5zfvFr71vvCHhHVbTUbHVPCei3ttrEiyalFc2EU0d7IqqqtMrLtkZdq/M277tLb+GfDen2Nhp+m+HdLtbXSfm0+CCzjjjtG+Zd0Kqu2P7zfd2/eb+9RzC5T4Qh1vVfEXizwzc+INWu9Qmj1X412UT3lw0zR28P7uOFWbd8iRqqqv3VWsfU9WNn8PPAupHxxDf2Ph/wCDnhm+/wCEeg8e3fhPVNEb7IzHUtOZl+yX8km1V2zbvLaFY2/1m1v0Ig8N+H43Vo9B01WVpmVls412tN/rv4fvSfxf3v4qh1LwL4H1hdO/tbwT4evV0fb/AGctzpUE32Lb93ydy/u/4fu7aOYY/wAH6xH4k8H6D4kt471ItW0q1vo01CJY7lVmhWRfOVflWT5vmX+9urYpCzZ+b71B6UAJ91vl+9QnShv/AGanr8tADV3bak+9/s01flXdQvzUACN8vWhvu05PlFDfdZaAOYX/AFrf7S05fmfa3zbt1cp/wtT4Ytt/4uR4V+9/0GLb/wCOU/8A4Wh8M2f/AJKN4X/8HMH/AMcqOaJyfXcN/PE6b7zK275vvf8A2NSM3zuv8O1Vrlf+FofDPbt/4WJ4X/8ABxB/8cp3/Czvhuy7f+FheGfu7f8AkLwf/HKOaI/rtD+eJ1D/AMLNtoP3dv3t21q5j/hZXw5bb/xcLwzt3f8AQXg/+KqRviR8O2VV/wCFgeGv9n/ib2//AMco5oh9dw/88ToV+bf937vy0K25W2/3mrmv+FlfDf8A6KF4ZVf+wvB/8VTR8TPhvu/5KF4Z/wDBzb/N/wCRKOaIfXcP/PE6n/aX/e20bvn6/wANcx/ws74b7v8AkoXhn5v+ovB8v/j1OX4lfDdvl/4WF4Z/8HNv/wDHKOaIfXaH88Tx/Wbf9qxf2pbKfRZYm+FbeT5qs1v5C2/k/vty/wCu8/zN23b/ALP8O6rX7aFvqV38MPClro+opp+ozfEfwpHZ3j23nrbTNqCeXI0O5fMVW+bbuXd93dXrqfEj4b/eb4ieF/8AwcW//wAcqnqfjj4O6lDFb6x408FXsUM8d1El3qVpKsc0bbo5l3N8sit8yt/D/DWVKCh1O7GZzh8XGEfdXKraHz14w0zxp4b/AGjPCh+NnjlPiHpk3w98aM1rpHhddPufsqx2n2iFY455POkkX5VX5drf71ZXgvxtH4Mh+C9joXxc8GfGT4b6lr+i6b4b0TVbGBfE2ibl8u2nimt22yyWke7zPMhVlVZF3bvmr6Sm+IHwbm1WDWpvHHgmXUbNJIba8k1O0aeCOTb5ixybtyq21dyr97atYOlXH7Nei+J7jxhoM3wv07Xrjd5+q2badDdybvvbpl/eNu/i+atOeJwfXMP/ADnhf7NuveMrHwXE1j+1d8PvDWjL4t16aXwzqGj2kl7HH/bV20kbXEl7HIrSfMyt5a7VkX722vb/AILbfFXxJ+KXxQj3Nb3mvQ+E9Mf+FrPSIWjmZW/u/bbi/X/tnSp4b/ZRvLx7660H4PT3Mz/aHne00ppJJGbd5jNt3M275t1dnpXjP4RaHZLpuj+MPB2nWqvJIsFtqdtHGrSSNJI21W+80kjMzfxMzNV86H9dofzxPlTwZJqkn7GHwH0PR/FWt6CniDx5p+h3d3pF5JaXLWdxqt6s0KyR/Mu5f8/LXOftF+OL3wcPiNfeBvF3iuGX4WtpOi6dqOr/ABGk09dPuo4YJPJt9OXzJNXkm8795Ne/6zcyq22PdX2NH4p+ClvaWemQ+JvAkVnYyrcWltHeWSxW0yszLJGu7bGyszNuX5tzVma3e/s5a3qr+ItauPhnqOrTWzWT312+nyztbsu1oWkbczR7WZdv3ajniS8Zhv50eAeMvEfi7xT8SLzwTH8Q/FGm6bqPx6tdBkbTNVmgkj0v/hGFnks4ZFbdDE0m5tse3azNIu1trVV0Txd4r8M+MrT4faf448Sz6TovxV8XeH7VbzV57mc6fD4Wku4baaaRmkuI4riZpI/MZmXav91a+jk8UfA2O5S7XxJ4ASeO6W+jlW8svMW6WPyln3bv9Z5f7vzPvbfl+7Sr4q+Bv2lrz/hJvAHntcyXzS/bLLzPtEkflyTbt27zGj/dtJ95l+X7tHPEPr2H/nifLnhy++JHgTwP8GvH3grxt4w8S+LfiB8NNe1DULXWNZn1ODUNQt9FjvLJo7aZmjjkjm2qvlqrMrN5m5mZq2PhD4g8Hp8cPg1afD/4++I/GZ8UeENW1jxLYXniibUo3uPs0DR3csLSMttK0jTL5Sqqr5fyxrtbd9J3HiL4IXekQ6Xb+OPB+nR2dnNY6fPp+q2lvPpcckXlt9kkVv3DbfutHt27V/u15N8Nfhr8MvBPjyw8feJP2iPDHia/0WzvLPTfLg0nS23Xfl+fc3slu269u2WGNfNbb/E23c26q5kH12h/PE6X9p+H4/TeAbWP9nxmXWmv4/tnlSRLP9l2t/qmm+X/AFm3d/Ft/wCBV6b8PR4wTwNoEfxAkt38Sf2dbrqzW+3y2utq+Zt2/L97+78v92q7fE74Yr/zUjwr/wCDm2/+OUD4pfDHK/8AFyPCv/g4tv8A45WcVFT5rndPOaFTDqh7unU8C8a6hZab8UPivq3w3+M+g+Bdct4bVvFvhfx7Y20+jeII1sI1hvY23pcRwNB+4aSNmXdG26P+95V8QfipD4s+GtxrPgnT9a8Kf8In8K9J1q206PxtJ4a0vwpNc20stq1tFb/vtTnZY41VZF8nbHHH8rSNX1v4in/Zw8bXdne+Nrj4Y+ILrT/+POfU30+7kg+bd+7aTcy/N/dp2uXf7OPiPWLTxF4kuvhnqmqWEDW9pfX0thcTwRt96OOST5lX5m+VarnicP12h/PE+OPG2s+INC1b4s/Fjwt4g1eDX9U0f4cW+paj/b81tBaWuqL/AKbcbm8yG32r8sc3lt9mWSRo1X5qj8Y6PqWraPqPhXxl4sWDw9ofxG8BzW2m2fxGvdaudEku7vy7nztRaOGRY5I/LmjVpGaGTdIrR7lr7Lh8SfAW1trqzs/EHw+ggvrSOxuYo7qyWOe1jj8uOGRd3zRxxsyrG3yqvyrWXaR/sx6f4VuPAdn/AMKtt/DN47SXOixNpy2ErMyszNb/AOrZtyr8zL/CtPniP65hv54njdt448WaD8Vbj9n6+8Va35HhXxRdfEK81WW6kklk8Fx2322G3aZmZpI/ts32Rtzf6uDbXmPjDwTrlx4f+EXirT7Fn8YL4K8VfFiKNV/eNqn9p6Xq/l/8C3NB/utX014M074Z2PjPxT458afGDwZ4mvfEVjH4ftrbfZW1tp+hwyTSR2Xl+bJ525p5Gkkb/WbV+VVXbXoa+L/g6JrO6XxZ4JWextms7WVb+08y2t227oY23fLG3lx7lX5W8tf7tOM4i+u0P54nxvf/ABG0m6+Kmv8A7VEmsa1Y6b4n+HfiybRb7TLeN7+00Wyu9Ls7SSCOf935jTfaZ18z5V+0bm+7WL4p8deOfBsfxL8J6L4q1fw9/wAW2s9aS2j+I8/ia9sr7+2LaBbtrll22s8kczbo4WaNl2t/EtfbUOt/AyC3trWHWvACQW1nJpttFHcWSxxWcm3zLaNd3ywttXdGvyttX5ayLG0/Zn0PT/7N0e1+FlhaKkkPkQLp0cflyNHJIu1f4WaONmX+Jo1b+FaJTiV9cofzo+d/jvc+JPhz4h8bfDbwb8R/GtjY2ei+A2tbuXXrq5u4Jr3xPPFczxzTMzeZJG21v4dqrHt2rtrn/ix4g8cfDbxP41+D/gvxdrknhdvG3g+znl1rxbdwSWFnqOnXMtxD/a8izXFpFPcWsEfmfNt85lXb5lfV+peKvgfq13Lfap4k8A3lzcLDHLLc31lLJIsMnmwqzM3zLHJ+8X+63zL81R6j4o+BerR6lDqniT4fXq61HHDqa3N5ZTLfRqu2Nbjc375V/hVt22p54k/XKH85w/7JGpeJJIPHnh/VvFFhq2neH/EcdrpltbeI7rxDJpW62jkmspNRuIIWuFWRvMX/AFjR+c0bNuWvDH8Z+G/Avwz1XxD8N/iX4b8WeAv+EokbUPg544022XWbbUJNVZprS2aOTzlnW6ZpYY5Y5F+626vrjwx4p+CvhbSINB8L+KvAujaXa/LBZ6ffWUEEW75m2xxsqrVeab9nO48Tp44uLr4Zv4jh2smss9g1+v8A28f6z7v+1VRnEr67Q/nieC678WrvTPD3ijQL74jy23iJv2hrPRrOzk1Ty71dNbVLFvs8abvMWBrdpPlX935bN/C1Y3gXxQ8eoaD4z0z4xeIdZ8eXfxtvvCM/h6XxDNcwf2L/AGrcxy2jWDSNGscNmv2lZfL3LtX5tu1a+lbvVf2ebjXX8U3WpfDafW5ljjfUpZ7BruRY2Vo1aZv3jbWVWX5vlZVrlfhVof7P/wALPtF/Z+NPAeoa7canqmof23LPYR36x3t7LdtbecreZ5atMy/e+7T50H12h/PE+f8A4TeKN3gv4PeLdJ+MviTxR428Z6rq+keKNIvfEc19HJpcdrfNKsllJIy2/wBkaC2ZZVVW3N8zN5lcjp/xI+Inh74MWFj4W8SX9nYL8NPhfazv/arWEGl2t7d3MV7crPtkW0aSNY42uVjZo1ZW/wCWa19RfBHwn8Afgr4P03Q7Pxp8PL7WbWzksbzX43soLu+haaSTbJIrNIyru27WZvurXfWfib4C29rLaWviD4exQ3FmumyxJdWSxyWse7y7dlVvmiXc22P7q7m+X5qXtIh9dofzxPj6+1Dx3Z6L4r8B2/xW0HRtNh8VeHYbPQ5fiNqupK0k1vcyXOkyeIFto5rSO5WGGaP9421o2jZo1mVa+hP2SfFX/CSfDC/td3iH7R4f8S6ho9zFrGuR621tJG0bfZ7fUY/+Pu2j85Vjkk3SfeVm3LXYwv8As02/hObwLayfDCDw1cMzS6Mh05bCRm2szNbr+7Ztyr/D/DWho/i74L+F9KtdD8N+LPBGk6bZrttrOx1C0gggX/ZjjZVX7zUpTjII42gvtxPOfAsX7U8P7SfiKbxhc2v/AAq/ypv7OVWg8vb8vkLCq/vll/56bvl+9/0zr6A8z5a5J/ip8M/4fiN4X/8ABzbf/HKF+K3wxVF2/Ebwrn/sMwf/AByogow6nXjM1oYtp3irLoeNfGaz8fat+1f8Nbb4d+NdN8M6ovgbxI0l9faP/aUbQ/a9P3R+T5sPzM235t38P3fmrm/jtrOuN4l8J/C/xh4muvEPiOy8M33iDV5bfxQ3gXQmh8/yo724mgaS6ZodrKsEbMq/NI33lr3ibxz8HbjV7fXJPGngx9RtYpLWC8bU7Rp4oZGVpI1k3blVmWPcq/e2r/dqjr9z+zx40udOvvGWofDjXLjSpfO0+XUprC5ktJP70TSM23+H7v8AdrXnRyfXMN/Oj48+Ed94d+LHiHwT4g+Mnxn1vRLq4+BVvfPqNt4mm0me8mh1W9ja5mnjkjaZoVXzNrfKzfNIrba2/CWo+OviL4c8afEXx1448XW+s+F/gfoviGztbTV7mxgXVJ7DVG+3yQQsq+YywxybWXbubdt+Vdv1Ne237MOo2UGn6pF8K7y1t5VmignXTpI4pPMkk3KrfKreZNJJ/vSM38TVvTeNfgvcNezXHizwO76lAtrfO1/aM11CqsqwzfN+8jXzJPlb5fmb+9RzoPrtD+eJ8v6P4i8PeJm8YeKfi/8AG3xR4R1bwPp/hP8A4RprDWZo3gtZ9MtJ/tcdkreXqMl3dzTwt50c27b5a7WWsK9+Jl5qHxm8I+LvDvibxBBa698WW8Mvc6v47aOe8sfPntLiwt/D9uvk29pH5fyzTMtx8scjfNItfVV9q37O+patpevalqnw2vNT0NVXSryeewkn09V+6tvI3zQ/8B21Es/7NTareeIPM+F39pajLHcXl5nTvPuZo2WSOSST7zMrKrKzfMrLuo50T9dofzxPkTwZ4i134T+APD0Xwd8R6tc6v/aHxZuJdJfV59R87ULJLlrJZreR23OvlwyeWy/M0jSNuaRmbV8Y+MIfA/hZbr4J/HLxL4rfxF8JPFHiDxLLP4om1KS2uLbTo5bTVl3SN9ila6kaHbH5atu27f3fy/WUPiX4D6fqT61p+ufD211Ga5kvHvILqyjnkuJFWOSZpFbc0jKu1m+8yrtqjpmo/s66NBqsGl33wzsIteZm1VLaXTol1Ddu3faFX/Xbtzfe3feao54lfXKH88T5v8XTeJvhrJqPh3T/ANoDxHpC+LPhBH4gvNc8Tavc3cVlqy6jZQfa1bazWSyLdtCzQKqxq0ciqvl7q9V/ZO8TTTal4+8B6hHr1rqPh+50+6ksbrxd/wAJRp1tHcwybWstRk/0jbJ5LSNDP80bbWX5ZK9Jm8U/BC+fzLzxV4Dnkazk03dLfWUjfY5Nu63+Zv8AVNtXdH91tq/LTfCmt/APwLpjaL4J1z4e+HrBpWma10q6srSFpG+83lxsq7v9qr50H12h/PE7/wDiavA/2lYf2ppNd8Jyfs+vbrpyzN/ays0HyyeYu37R53zeRt3bvL+b73+zXrH/AAs34Z4/5KN4W/8ABxbf/HKd/wALO+Gn/RRvC3/g5t//AI5WU1Ga5bnVg81oYWpz+6/U6OHzI0Vm/wBYq/Nt/vV8d+JvGdr4Dh/a/wDFV9rWvaXFba/ocP2zQ3hjv4mm0mxhXyZJv3cTbpFXzm/1as0n8NfTrfE/4Z7Nv/CxvC//AIOLb/45WRJ4r+Csq6ksnijwK661/wAhFWvrJlvv3fl/6R8377938vzbvlXbVRnGJzSx1CUubmifC3irxt4m8Dw/GLwj4f8AEjeHlj+Ey68un6Z8Sr3xRNZaguoxxLctdXCq1vO0c3zRwttZfLb+Ja6v9pbS5Phjb/GH4e6L4k8R6po2qfCS18SXNrrWtXGo+ZqS6x9ma5Vrhm8lpI22sse2P5V+X5a+ptLH7M+i2KaXpK/Cyyso0khW2tv7OjiWORlaSPavy7ZGjj3L/FtXd92ta/8AFfwT1Z5ZNU8TeBL15oPscrXN7ZStJb7vM8ltzfMm75tv3d3zUc8RfXaH88T5m1HxN4i8T/D/AOInw4+K99c2fxY8XeL9H8I6voC3zSWFto9/dxRwf2VH/FbNYNcM0u3zGmjuPM+6qq34hTajpfj343af4V8Rat4cfUvid8NdF+16RctbXEVvcW9lHIsbL935ZGXb93b8u3bX1DL4n+CF5rNr4lvvE3gK41exj8u01CW7spLqBfm+WOVm3KvzN91v4mqefxZ8CriSe4uvEfgGWW5uYbyd5LuyZpriHb5M0jbvmePau1m+Zdq7dtXzoPrtD+eJ8teP9Q1b4Z+JviR8J9L+InirTfh/H4v8A2upahea9c3Nzoml6qsq37R39xI01vHNJDbqzeZ+786Rl27q5y/v/Dnw0+KPxTb4efEnUZdB03xt8LLG81CXX5rtdPtZLyX7TaSXckjSNAu5lZZJGVVkaNvu7a+yb3xj8Cr9NUXUfFHgK6XWolt9T8+8spPt0KqyrHcbm/fKqsy7W3ferChuP2ZdP0O88L6bN8LLPRtQtls7vToG06O2ubdd22OSNflkVfMk+Vl/ib+9Rzon67Q/nPnX4pfEC98Y+OvjJovhP41adY2Fr4m8D6XawXOvXNppt60ltPJc6X9ts9zWDTtHtaaPb+8j8tm+auOe58L+L7H4eaD4qn8WaC/g7432uj38F549k1Oz0/7Tpc8/lWWqxSRtNF8sbL5rNNE000e5Vk219bW8v7MttoNx4VtZvhZFo19BHa3OmodOW2nhj3eXHJD91lXc21WX5dzVbsh+zVH4Xj8EQyfDFfDkTrNHo6nT/sSyK25ZFg/1e7d827bU88SvrlD+dHzJptp4kt/Bmt/Fib4ieNLzW9Q+OsfhVEm125+yW2kr4rii+yQ2/meWsbKrK3y7tsjR/wCr+Wsnxf8AEyZvGNr8UPDHiLWLQyfFm10GHUtb+IjQ3M9quqLaXWn2/h+3T7PHZLGsq7p2Wby/3zfMy19nP4n+CYtPsLeIfAv2Zrv+0PIa8tPL+1eZ5n2jbu2+b5n7zzPvbvm+9WVcTfs1T6jqWuXLfC59R1gKuo3T/wBntLe7WVl86Rvmk+ZVb5t33VqudC+t0P5zm/2V9sOg/E1YWVW/4Wz4u2s38Lfba8u/Z4+LnwZ+HP7Id54f+MWv6JZX3hX+3LHx1oepzxNe3F813O08ckEjbpmn3Lt+VvM8xVr6HtviP8HtPSaOx8eeCrVbidriVYNVtI/Mmk+aSRtrfM7fxN95q5nVZP2Y9e8TW/jTXJvhZqPiCz2+Rqt2+nTXcW37u2Zv3i7f4fm+Wo54j+u0P54nyt8YfGOreG9W+Iet/C/TrzwdYXXhb4ZaZLFLP/ZMuiaPc3d9HNHJMqyfYtsbLE0qq3lbmZfmWry+Ldb+Hmh/EbwlfeKLmw0S+k8M6fp2g+GPiRca1f6XqV/cyR7f7Yv7eNbC2u44/mZpGaLa0ke3zFr64bxh8Drya/u7rxd4Enn1a3W2vne/sma7hXdthmbd+8RfMk+Vty/M396qelj9mTSfDN14J0n/AIVdZ+Hr5ma60iAafHZTs23c0kC/u5Pur95f4Vq+dE/XKH88T46m8VeMNJ0741fDzRfGF54ctdK1H4f/AGO10Xx7d+IZNEuL3V1gu1h1G5VZFkkjWPzIvmjVv725lrvPHtxrHwi8UfE/4feCvGviuPR9M1/4Z3dql3r13eT2z6jqrQ3yrPNI03lzpCvmR7trbm+Xa22vpLT7v9m/R7NLHSZ/hlZWkcUUKwWzafCixxyebGu1fl2rIzSKv8LfMvzVY1Dxl8Er+ae4vvFPgO4numt2nlnvbKSSVoG3QszM3zeW3zR7vut93bRzxK+t0P5j5T1OPxBa+GfGPxsX4ieNJPEeifHVtB0xDr939gt9LbxBBaSWX2TzPs7RNHNN/rI2ZflVWVVVawfGnjS2/sHxD481z44+JNG+LEPxXh8OxeHIvE81tHHpq61FFDYLpyusbQNYbbjzfL3SMzM0jKzLX2GfE/wRmtJbFvE3gJrWe8/tCWD7ZZNHJdeYsn2hl3bWl8xVk8z725d33q8P8Q/B/wCH3irx3LrniT9pTw3qXh6bXbfXH025t9Lk1T9zcLcw2H9q7/O+wrcRxssO3cqqsfmbaOdB9bofzo+r5V23EqqvyrJXiH7T9t+0vcaXoH/DOs8UUi3cn9qBfs6zsvy+T/x8fL5X+s8zb833f4d1ekL8T/hqzMzfEbwtuZv+gxbf/HKl/wCFnfDPH/JRvC//AIOLf/4qs5qM1a50YXM6GFqKreL9Ta0tdSXTbNdaaE3/AJEf2toN3lNNtXzPL3fw7t1eNfGadW/ab/ZsEkhX/iZ+KlVt3/UFkr0k/FH4YKn/ACUXwtu/7DFt/wDHKp3HxB+D13eWuoXXjjwVPdaezNaTy6naNJbNIu2Ty2Zt0e5flbb95aqLjExnjqEpc3NE+J73xx8VdW1vxD8Qp/GOjaJ4w034kzaHaPqnxFv4PscMeo+RBpLeHYbSSGaOaDb825pJPO8/zF2/Lu2ni+70H49QeItc8Y6p4p03WviXceH7PV/D3ju4hubLzrh7aPRb/wAO3SrH5EP3Wltl8zbGtwrfNur6hutT/Z3uvFUXjq41L4aS+I7dPLi1mSewa/jXbt2rcf6xfl+X71MTUP2d4/FLeOI9S+GieI2Ty21lZbD7ey7du37R/rPu/L96q54k/XaH88T5W+B62PglPh7ovg/xXq6vqXx68R6brlm2u3N0zW8K6v5MVxHJK23csccjKy/vGVZG3N81WfgvL4q0rwZ+zt8XV+IHjPWfEnjnxbeaDrI1PxDdXNleae0WptHB9mkkaFfLa1hZZFXzNwZmZq+pLTWf2fbPVJdatdW+HFvf3V5/aE91FPYLPJdbWj89pF+ZptrMvmfe2sy7vmrUsvF/wOtrfT7O38S+AorXSZvtFjAl3ZLHaSfN+8hVW2xt+8k+ZdrfM396n7SJP12h/PE+PfCvjDR7rRvgT4zm+O/iW5+KnjT4gafb+MtCbxNPtf8AfS/a7KbTPM8u1itpFWNVWOP5dqtu3V0N7e6RbS/Cz9pTxrMkfgrxJ8WNW8Tare3S/wCjWcMtpPp/h+7nb7scUcdvZssjfLG0ytXaaL8J/hvH4z0jxB41/aY8N+KdO0DV11y0gnttMt9SvbqNZFtW1PUY5PMvVgWVtq7Y9zKu7dtr3CHxv8FYdITw1D4v8DppEdstnHp639p9mW3Vdqw+Vu2+Xt+Xbt20+eIfXKH88Tzr41/Gv4dJcavc/C2y07xp8VNC8CeINa0PUNJhi1JdJhjgVlW4kjb5VnmWPy4/m8xo2r5w8GeK/HmjQaVqmlfEGwx4k+H/AIg1LV/+LoX3iW71lo9MaWPUY7drSOPTpY7jb80ckS7ZGjVWZVr7E8Naz+zr4DhmtfAup/Dbw5DdSeZPHpE1haLKy/dZlj27mqholz+zV4dutUvPDtx8MdLm1zcupvYvp0DXyt95Zmj2+Yv3vvbqnnQfXaH88T5isfh74asJP2SfHfjf4g+L7678S3H9ravqeseLr1Y2upPD8k6+XumWOFWkWOPbHt8xd0bblkbdT+HOlR/Eb4u/AXxF4y1/xHqWpf278SofPOvXse6Oy1GVoFVY5l2qqssbKv8ArI1jjk3Rqq19d6n4j+AetaRaaHrGt/D2/wBO0+SGSzs7m6spoLZof9W0cbNtjaP+Hb93+GpLfxV8ELSa2urXxL4EgmtHuJLaWK7slkhadt1w0bK3ytI3zSMv3v4t1HOivrlD+eJ8hfBHxLJ8VE+GnhT44fFfxJp3hy4+HF1r1lcjxRc6TJq+rLq08VxJNexzRyTNbW627LG0m1VkZtvy1c8W/ETRvHFstl4X+JXjHxXp3hfwFb6l/buteOJPBVsnnSXPk6m32aL7Tf3Mi2/3mj8lVjj+80zNX07rUv7NXiLRrXwx4guPhlqWjWMnmWmn3j6fNbQN/ejib5Y2+ZvurVvUL/8AZt1/UNL1bXrr4Zajf6GqpplzdPYTS2Kr91YWb5o1X/Z20RmifrlD+eJ8kaNrX9reJNE+Luv+NdVi8Zal+y/JrcF2utzwNPqixyCSSOFZFjZlXdK0artWRfO2rIu6ul0LWtH8f33iOL46fGzxF4UTwt8PvC+q+GpIPFFxo7eXc6V5t3q37uSP7bL9qWSNmm8xV8tVZf3nzfTv9q/s5tFp0Rvfhu0ekxTW9gu+w22Ucy7Zo4f+eaurMrKu3dubdTNd1P8AZt8SJpq+JL34Z6ouj7f7O+3SWE/2Lbt2+T5m7y9u1fu7fu0+aJX1zD/zny14Jt/HHx21ieb4peOfG+lz2/wT8O+Ip9P0bWrnSY11i4a+3XbR27R7Zf3at5f+r3N8yttXbx3ibx/428T+D/B/jrxB8QL7XJLX4UaHrup6Xp3jybwrrGl3EkcjzaxBuVbTUWk8v7srMqtDt2/vNrfbc3j/AOCx1C41NvG/gj7ZeQLa3Nz/AGjaebPCu7bHI27c0a+ZJ8rfL8zf3qwtTf8AZh16HSrbWpPhVqEGh7f7KS5/s6VbHbt+W3Vv9T91fu7fu0udE/XaH88TvvBOuW/ibwboPiSz+2eRq2lWt9F9siWKfbNCsi+dGvyrJ83zL/erbVeV/wB2uRT4q/DH/opHhb/wcW3/AMcqxH8U/hdj/kpHhb/wcQf/AByp5olLGUP50dPt+9/s0bvmauZPxS+GOP8AkpHhf/wc2/8A8VTW+KHww/6KN4XX/uMQf/HKfNEX13D/AM50/wB5veg9GrlD8Vfhfn/kpHhb/wAHFt/8cpf+FpfDFv8Amo3hf/wcQf8AxylzRF9dofzxOrT71H95a5dfij8Mfl/4uN4X/wDBxB/8cp6/E74Z9P8AhYnhf/wbQf8AxVHNEr67Q/nidPu9qPSuY/4Wd8Nv+ih+Gf8Awbwf/FUo+J3w127W+Inhj/wbwf8AxVHNEPrlD+eJ03+FA+5/ermP+FofDP8A6KJ4Z/8ABvb/APxVO/4Wf8NcfL8QvDLf9xaD/wCOU+aIfW6H86Pi/wD4YB8N43f8LoX/AMFkP/x+m/8ADAPh35v+LzJ97b/yCo//AI/XsB/Zmlx/yN8P3v8AoH//AGynp+zRJn/kbYcf9g//AO2V8x9cxf8Az6/8mPnf7Bw//Pv8TyBv+Cfvh3C/8XoT5v7umR//AB+mj/gn74d/h+NC/e/6BkP/AMfr2P8A4Zml2K3/AAl8P/gv/wDtlC/syyfN/wAVdD/4L/8A7ZVfXMX/AM+v/Jg/sHD/APPv8Tx//hgHw6o/5LMnzf8AUMh/+P0N+wH4bb/mtCf+CyH/AOP166f2ZJcbm8Xwnb/1D/8A7ZTh+zVMGZh4uh+X/qH/AP2yp+uYz/n1/wCTB/YeH/59/ieOn/gn/wCG2H/Jao/7v/IKh/8Aj9Qn/gnz4bb/AJrUn3v+gZD/APH69q/4Znk2bv8AhLYcYxj+z/8A7ZSf8MvS4/5G+H/wAP8A8co+vYr/AJ9r7w/sSj/z7/E8XH/BPnw397/hdSMv/YKj/wDj9Txf8E/fDa/81oT73/QKh/8Aj9ewf8MwMq/8jhH8rf8AQP8A/tlSJ+zE/wB7/hMIv7v/ACDv/tlH1zGf8+v/ACYP7Eo/8+/xPJR+wH4Z24/4XRF/4LIf/j9Nf9gPwvs/5LQn/gsh/wDj9eun9meYBceL4f8AwX//AGylP7NDsP8AkbYfu/8AQP8A/tlH1zGf8+v/ACYP7Dof8+/xPEpP+CffhnO7/hdifM3y/wDEsh/+P00/8E+fDP8AD8ak/u/8gyH/AOP17S37LkjD/kcYfvf9A3/7ZTE/Zcl+b/isYf8AwX//AGyo/tDF/wDPtfeV/YVD+T8Tx23/AOCfPhlTu/4XUn/gqh/+P1dT/gn/AOG2/wCa1Rf+CqH/AOP165/wy4UTjxhH8v8A1D//ALZSp+zHMjMV8Yw/3f8AkG//AGyr+uYz/n1/5MH9h0P+ff4nk4/4J++Gdu7/AIXVF/4Kof8A4/UFx/wT58Nyfd+NSf8Agsh/+P17IP2YLpk/5HGD5f8ApwP/AMcpp/ZhmJbPjCEfTT//ALZR9cxf/Pr/AMmJ/sHD/wDPv8TxL/h3r4Z+9/wupf8AwWQ//H6P+Hevhdv+a1L/AOCqH/4/Xtkv7LkjFSfGMPy/9Q3/AO2VEP2Wpdzf8VjD/wCC3/7ZU/X8V/z7X3lf2FQ/k/E8jt/+CfPhnG3/AIXYv/gqh/8Aj9TP/wAE9/DezcvxqT/wVQ//AB+vW4v2XpcL/wAVhD8v/UN/+2VYP7MUjbs+L4f/AAW//bKr65jP+fX/AJMT/YOH/wCff4niy/8ABPXw7s+b41L/ALP/ABKof/j9MX/gnn4b3f8AJaE/8FUf/wAfr2v/AIZXnYZ/4TKD5W2/8g8//HKaP2V5hyPGMGf+wef/AI5R9cxn/Pr/AMmD+w6H/Pv8Tx5P+Cffh1VX/i9UW3/sFQ//AB+mS/8ABPvw2y7f+F2Rf+CqH/4/XsX/AAy9Lj/kcYfl/wCob/8AbKj/AOGXXZt3/CYxf3f+Qd/9sqZYzGf8+l/4EH9h4f8A59/ieLn/AIJ6+GW+b/hdif8AAdMh/wDj9NX/AIJ4+G8/L8ak/wDBVD/8fr2n/hlc8f8AFYxfK3/QO/8AtlSx/ssEFj/wmMWNv/QO/wDtlEcZjP8An1/5MP8AsKh/J+J4/D/wT18MqnzfGpf/AAVQ/wDx+n/8O9/DLDcvxqX/AMFUP/x+vYW/Zadvl/4TKL5f+od/9sp6fswyLu/4rGL/AMF3/wBsqvrmM/59f+TD/sOh/wA+/wATxuP/AIJ6+Gf4vjUrf9wqH/4/UVx/wTz8MyD/AJLYv/gqh/8Aj9ezv+zBJt/5HGL/AMF3/wBspP8Ahlecs3/FZQf+C8//ABypeMxn/Pr/AMmJ/sHD/wDPv8Tw/wD4d1+F/wCL42L/AOCqH/4/R/w7r8Lt/wA1sX/wVQ//AB+va/8AhlV8bv8AhNIvlO3/AJB3/wBsp6fsruo2/wDCZxf+C7/7ZR9exn/Ppf8AgRX9iUv5PxPG4/8Agnf4ZVf+S3J/4Kof/j9WB/wTx8L7P+S3J/4Kof8A4/Xr3/DLUm3/AJHGH/wW/wD2yn/8Mvyr/wAzhD/d/wCQd/8AbKr65jP+fX/kwf2Hh/8An3+J4xcf8E7/AAuy/wDJbk/8FUP/AMfqB/8Agnb4V/6Lcn/gqh/+P17Y37LbNuX/AITGL73/AEDv/tlRt+yqRux40j/8F3/2yh4zGf8APpf+BB/YdD/n3+J4u3/BPPwvt+X42L/4Kof/AI/Vi2/4J5+GVX/kti/+CqH/AOP16/8A8MrMu3/is4v/AAXf/bKlX9lxk3Y8Yxf+C7/7ZUxxmM/59f8AkxP9g4f/AJ9/ieSf8O8/DX/RaV/8FcP/AMfqC5/4J4+F2T/ktiL/ANwqH/4/XtH/AAy9LsX/AIrGH5f+od/9spsn7LcvzZ8ZQj6ab/8AbKr65jP+fS/8CD+w8P8A8+/xPCm/4J2+F/8Aotif+CqH/wCP0L/wTt8K/wDRbF/8FUP/AMfr2xv2VGYbv+Ezi+X/AKh3/wBsoX9lZkJJ8ZxEf9g7/wC2VH9oYz/n2vvK/sSl/J+J41F/wTt8Lq3zfGxW/wC4VD/8fq0n/BPXwzsZV+NSf+CqH/4/XsA/ZXf/AKHKL5f+od/9sqQfstuCzDxlF93/AKB3/wBsq/rmM/59f+TE/wBg4f8A59/ieNJ/wTx8Nt9741L/AOCqH/4/Th/wTz8NKPl+Ni/+CqH/AOP17L/wy2//AEOUXy/9Q7/7ZR/wy2/3v+Eyi+7/ANA7/wC2UvrmM/59L/wIP7Cw3/Pv8TxqT/gnr4axu/4XV/5TIf8A4/Vd/wDgnv4ZX/mti/8Agsh/+P17W37LLsG/4rKL5ev/ABLuv/kSq/8AwyvJlv8Ais4vl/6h3/2yj65jP+fS/wDAg/sHD/8APv8AE8Xb/gnj4Xb/AJrgn/gsh/8Aj9A/4J1+F2/5rdH/AOCyH/4/XtY/ZWbb/wAjnF/4Lv8A7ZT1/ZbZWbHjGL/wXf8A2yl9cxn/AD6X/gRX9hUP5PxPGYv+Cd/hlU/5LYn/AILIf/j9Sf8ADvHwzu3f8LqT/wAFUP8A8fr2L/hlp9v/ACOUX/gu/wDtlOT9l6X5m/4TOL+7/wAg7/7ZR9cxn/Ppf+BB/YdD/n3+J5Cv/BPPw1/0WmNv+4VD/wDH6Y//AAT18NbP+S1R/wDgqh/+P17Ef2XpwNw8ZQ/L/wBQ3/7ZUX/DLsxZs+M4v/Bd/wDbKPrmM/59L/wIn+wsP/z7/E8Tf/gnb4ZZmb/hdif+CqH/AOP0f8O7fDP3v+F3J/4Kof8A4/Xtrfspuw/5HSP/AMF3/wBsqIfsqvz/AMVnF/4Lv/tlT9dx3/Ppf+BD/sKh/J+J4v8A8O7vDP8A0WxP/BZD/wDH6lh/4J1+F88fGxf/AAWQ/wDx+vZh+yszL/yOcXy/9Q7/AO2VOn7LboW2+Movu/8AQO/+2VSxmN/59L/wIX9g4f8A59/ieOL/AME8fDSlf+L1L/4LIf8A4/U3/DvPw23/ADWlf/BZF/8AH69gH7Lb/wDQ5Rfe/wCgd/8AbKd/wy0zZz4yj/8ABd/9so+uYz/n0v8AwIP7Bw//AD7/ABPF5P8Agnn4aYbf+F2L/wCCuH/4/VN/+Cdfhdvm/wCF2L/4Kof/AI/Xtb/ssMy/8jmn/gu/+2UD9lb7zf8ACZp/4Lv/ALZU/XMZ/wA+v/Jg/sHD/wDPv8TxNf8AgnT4Z/6LYv8A4Kof/j9W4P8AgnX4aX/mta/8C0qL/wCP17Cn7Km1T/xWafL/ANQ7/wC2VMP2W2Vvl8Yxf+C7/wC2VUcZjP8An1/5MV/YFD+T8Tx5v+CdnhhvvfGuP/wVxf8Ax+mSf8E7/DCpt/4XbGv/AHDIv/j9ey/8Mtuq8eMovlb/AKB3/wBspjfssvIW/wCKyi+X/qHf/bKr65jP+fX/AJML+wsP/wA+/wATw9v+CdfhXP8AyXCL/wAFkP8A8fpR/wAE6fC7f81wi/8ABZD/APH69tb9lU/9DlF8v/UO/wDtlKn7KzLu/wCKzi/8F3/2yo+uY7/n0v8AwIf9hUP5PxPHof8AgnX4aVP+S2xt/wBwuL/4/Tx/wTw8NY3f8Lrj/wDBXF/8fr2U/stOE48ZRfL/ANQ7/wC2Un/DLsv/AEOMP/gt/wDtlV9cxn/Ppf8AgRP9g4f/AJ9/ieLTf8E8fDX3f+F2R/8AAdKh/wDj9VH/AOCdfhdj/wAlsX/wVQ//AB+vbn/Zakb5v+Ezi+X/AKh3/wBsoH7K7M3/ACOcf/gu/wDtlH1zGf8APpf+BAsjof8APv8AE8RT/gnT4ZVvl+NifN/1Cof/AI/VqP8A4Jz+Gdv/ACWxP+BaVF/8fr2aD9lhgNx8Zxf+C7/7ZVkfstvz/wAVlF8v/UO/+2UfXMZ/z6X/AIEH9g4f/n3+J4t/w7q8ML9741x/+CqL/wCP0N/wTv8ADG3/AJLXH/4K4f8A4/Xs8v7LbsP+Ryj/APBd/wDbKh/4ZZk3N/xWcX/gu/8AtlKWMxn/AD6X/gRX9h4f/n3+J423/BO/ww33vjXH/wCCqL/4/Tf+Hdfhhv8Amtcf/gqh/wDj9eyD9lmTb/yOcX93/kHf/bKkH7K7/e/4TOL/AMF3/wBspfXcb/z6X/gRP9g4f/n3+J4o/wDwTl8Mt/zWyP8A8FUP/wAfqP8A4dy+F1P/ACW5P/BZD/8AH69y/wCGVmx/yOUX/gu/+2Uh/ZVPP/FZRfL/ANQ7/wC2VX1zGf8APpf+BB/YlH/n3+J4d/w7n8L/APRbl/8ABZD/APH6twf8E7fDCr8vxrj/APBZF/8AH69k/wCGUt3/ADOUXy/9Qz/7ZTov2WHU/wDI5xf+C7/7ZR9cxn/Ppf8AgQ/7Cof8+/xPHf8Ah3f4c/6LZH/4LIv/AI/Tj/wTy8O7f+S2x/8Agri/+P17J/wy2+P+Ryi/8F3/ANsqNv2WpG+YeM4h/wBw7/7ZRLGYz/n0v/Ahf2Fhv+ff4nik/wDwTv8ADUnX43J/4LIf/j9Q/wDDufwu3/NcE/8ABZD/APH69qP7Kch6+M4fl/6hv/2ynp+yrJ8zf8JnD/4Lf/tlT9dx3/Ppf+BB/YOH/wCff4niqf8ABOXwz/0W5G/7hUP/AMfp5/4Jy+F/+i3L/wCCyH/4/XtZ/ZXdANvjKHnr/wAS3/7ZTf8AhlaT5m/4TKH/AMFv/wBsqvrmM/59L/wIr+w8P/z7/E8R/wCHcvhjd/yW5f8AwVQ//H6fF/wTt8NR4YfG5f8AwVQ//H69pb9lUtu/4rOP/wAF3/2ykH7KY/6HOP8A8F3/ANspfXcb/wA+l/4ET/YOH/59/ieRJ/wT08NY/wCS2xf+CyL/AOP08/8ABPTw4f8Amtcf/gsi/wDj9euj9liRBx4zi+X/AKh3/wBsqRf2XG+b/is0/wDBd/8AbKf1zGf8+l/4EH9hYf8A59/ieLTf8E7vDEn/ADW2P/wWRf8Ax+qx/wCCc/hfH/Jbk/8ABZD/APH69wb9lhv+hyi/8F3/ANspT+yqTnHjKL/wXf8A2yl9cxn/AD6X/gQf2Dh/+ff4nhyf8E5/DOf+S4J/4LIf/j9WU/4J4eGlH/JbYv8AwWRf/H69k/4ZWf8A6HKL/wAF3/2ynr+ys2f+Rzi/8F3/ANsp/XsZ/wA+l/4EH9g0P5PxPHP+HeHhxuvxti/8FUX/AMfpp/4J3eGm/wCa2x/+CyL/AOP17P8A8Msvnd/wmcXy/wDUO/8AtlC/srv83/FZxf8Agu/+2U/rmM/59f8Akwf2Dh/+ff4nip/4J0+Gun/C7Y//AAVRf/H6B/wTr8NY/wCS3Rf+CqL/AOP17U37KzMOfGcX/gu/+2Ui/srybm/4rOL/AMF3/wBso+uYz/n1/wCTE/2Dh/8An3+J4yP+CeHhxf8AmtsX/gqi/wDj9O/4d3+G/wDot0H/AIK4/wD4/Xsbfsss3/M4xfL/ANQ7/wC2Uf8ADLDfe/4TKH/wW/8A2yj65jP+fX/kw/7Bw/8Az7/E8b/4d4eG/wDot8H/AIKo/wD4/Sf8O7vDn/Rb4P8AwVRf/H69n/4ZWf8A6HKL/wAF3/2yl/4ZWb/oc4vl/wCod/8AbKX1zGf8+l/4EH9hYf8A59/ieM/8O8NAX/mt8H/gqj/+P1LD/wAE9/D0Pzf8Ltgz/wBgqP8A+P169/wym3/Q6Rf+Cwf/ABynN+ykzK3/ABWqf+C7/wC2UfXMZ/z6X/gQ45Hh/wDn3+J//9k=";


// ── Plain fetch helpers — avoids DataCloneError from Supabase client's Headers object ──
async function _sbFetch(path, opts) {
  const url = SUPA_URL + '/rest/v1/' + path;
  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
    'Prefer': opts && opts.prefer ? opts.prefer : 'return=representation'
  };
  const res = await fetch(url, { method: opts && opts.method || 'GET', headers, body: opts && opts.body ? JSON.stringify(opts.body) : undefined });
  if (!res.ok) { const t = await res.text(); throw new Error(t); }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await res.json();
  return null;
}

async function sbGetStaff() {
  const data = await _sbFetch('staff?select=*&order=created_at.desc');
  return Array.isArray(data) ? data : [];
}
async function sbAddStaff(profile) {
  const data = await _sbFetch('staff', { method: 'POST', body: profile, prefer: 'return=representation' });
  return Array.isArray(data) ? data[0] : data;
}
async function sbDeleteStaff(id) {
  await _sbFetch('staff?id=eq.' + id, { method: 'DELETE', prefer: 'return=minimal' });
}
async function sbUpdateStaffPhoto(id, photo) {
  await _sbFetch('staff?id=eq.' + id, { method: 'PATCH', body: { photo }, prefer: 'return=minimal' });
}
async function sbGetOrders(staffId) {
  const path = 'orders?select=*&order=created_at.desc' + (staffId ? '&staff_id=eq.' + staffId : '');
  try { const data = await _sbFetch(path); return Array.isArray(data) ? data : []; } catch(e) { return []; }
}
async function sbSaveOrder(order) {
  const data = await _sbFetch('orders', { method: 'POST', body: order, prefer: 'return=representation' });
  return Array.isArray(data) ? data[0] : data;
}

// ── PRICES ──
async function sbGetPrices() {
  try { const data = await _sbFetch('prices?select=*&order=cat.asc,name.asc'); return Array.isArray(data) ? data : []; } catch(e) { return null; }
}
async function sbSavePrices(services) {
  const rows = services.map(s => ({ name: s.name, cat: s.cat, price: s.price, custom: s.custom || false }));
  await _sbFetch('prices?on_conflict=name', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
}
async function sbDeletePrice(name) {
  await _sbFetch('prices?name=eq.' + encodeURIComponent(name), { method: 'DELETE', prefer: 'return=minimal' });
}

// ── LOANS ──
async function sbGetLoans() {
  try { const data = await _sbFetch('loans?select=*&order=created_at.desc'); return Array.isArray(data) ? data : []; } catch(e) { return null; }
}
async function sbSaveLoan(loan) {
  const row = {
    id: Number(loan.id), client_name: loan.clientName, client_phone: loan.clientPhone || '',
    staff_id: loan.staffId || '',
    amount: loan.amount || 0, balance: loan.balance || 0, status: loan.status || 'Outstanding',
    collected_date: loan.collectedDate || '', due_date: loan.dueDate || '',
    notes: loan.notes || '', payments: loan.payments || []
  };
  await _sbFetch('loans?on_conflict=id', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' });
}
async function sbDeleteLoan(id) {
  await _sbFetch('loans?id=eq.' + Number(id), { method: 'DELETE', prefer: 'return=minimal' });
}
async function sbUpdateLoan(loan) {
  try {
    await _sbFetch('loans?id=eq.' + Number(loan.id), { method: 'PATCH', prefer: 'return=minimal', body: {
      balance: loan.balance, status: loan.status, amount: loan.amount || 0,
      payments: loan.payments || [], client_name: loan.clientName,
      staff_id: loan.staffId || '',
      client_phone: loan.clientPhone || '', notes: loan.notes || '',
      collected_date: loan.collectedDate || '', due_date: loan.dueDate || ''
    }});
  } catch(e) { await sbSaveLoan(loan); }
}

// ── SALARY ──
async function sbGetSalaries(staffId) {
  try {
    const path = 'salaries?select=*&order=date_paid.desc,time_paid.desc' + (staffId ? '&staff_id=eq.' + staffId : '');
    const data = await _sbFetch(path);
    return Array.isArray(data) ? data : [];
  } catch(e) { return []; }
}
async function sbAddSalary(entry) {
  const data = await _sbFetch('salaries', { method: 'POST', body: entry, prefer: 'return=representation' });
  return Array.isArray(data) ? data[0] : data;
}
async function sbUpdateSalary(id, entry) {
  await _sbFetch('salaries?id=eq.' + id, { method: 'PATCH', body: entry, prefer: 'return=minimal' });
}
async function sbDeleteSalary(id) {
  await _sbFetch('salaries?id=eq.' + id, { method: 'DELETE', prefer: 'return=minimal' });
}

/* ─── Script Block 3 of 12 ─── */
// If jQuery failed to load (offline), show friendly message
window.addEventListener('load', function(){
  if (typeof jQuery === 'undefined') {
    document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#121212;color:#F0EAD6;font-family:Arial,sans-serif;text-align:center;gap:20px"><div style="font-size:48px">✂️</div><div style="font-size:22px;color:#10B981;font-weight:bold">INCLINE CAL</div><div style="font-size:15px;color:#888;max-width:340px;line-height:1.7">Please connect to the internet <strong>once</strong> to load the app.<br/>After that, it will work offline forever.</div></div>';
    return;
  }
});

// ADMIN PASSWORD PROTECTION
// ── Auth handled by login page overlay ──
// ── Cross-tab sync: when localStorage changes in another tab (e.g. another
//    admin device edits a price), mirror it into this tab immediately ──
window.addEventListener('storage', function (e) {
  if (!e.key || !e.key.startsWith('incline_')) return;
  // If the app version changed (another tab just upgraded), reload this tab too
  if (e.key === 'incline_app_version' && e.newValue && e.newValue !== APP_VERSION) {
    location.reload(true);
    return;
  }
  // Re-render whichever tab is currently visible
  if (typeof $ !== 'undefined' && typeof renderOrdersTable === 'function') {
    var active = ($('.sidenav__item--active').data('tab') || document.querySelector('.tab-panel[style*="flex"]')?.id?.replace('panel-',''));
    if      (active === 'orders')      renderOrdersTable();
    else if (active === 'outstanding') { renderOutstandingTable(); updateAlumniBadge(); }
    else if (active === 'reports')     renderStaffCards();
    else if (active === 'staff')       renderAdminStaffList();
    else if (active === 'salary')      _drawSalaryGrid();
  }
});

// Always require login on every page load / refresh
localStorage.removeItem('incline_admin_auth');
localStorage.removeItem('incline_remember');
sessionStorage.removeItem('incline_admin_auth');
// Hide scrollbar until logged in
document.addEventListener('DOMContentLoaded', function(){ document.body.classList.add('login-active'); });

function checkRemembered() {
  return false;
}

function doLogout() {
  sessionStorage.removeItem('incline_admin_auth');
  // Reload the page to return to the card-based login
  location.reload();
}


function toggleLoginField(inputId, btnId) {
  var inp = document.getElementById(inputId);
  var btn = document.getElementById(btnId);
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.style.color = 'rgba(16,185,129,0.8)';
    btn.innerHTML = '<i class="fas fa-eye-slash" style="font-size:18px;"></i>';
  } else {
    inp.type = 'password';
    btn.style.color = 'rgba(255,255,255,0.35)';
    btn.innerHTML = '<i class="fas fa-eye" style="font-size:18px;"></i>';
  }
}

function doLogin() {
  // Neutralised — app uses card-based login() instead
}

/* ─── Script Block 4 of 12 ─── */
window.addEventListener('load', function() {
  function ls(src) { var s = document.createElement('script'); s.src = src; s.async = true; document.head.appendChild(s); }
  ls('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  ls('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  setTimeout(function(){ ls('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'); }, 2000);
});

/* ─── Script Block 5 of 12 ─── */
var _vstamp = document.getElementById('login-version-stamp');
      if (_vstamp) _vstamp.textContent = 'v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '—');

/* ─── Script Block 6 of 12 ─── */
var _hv = document.getElementById('header-version-badge');
    if (_hv) _hv.textContent = typeof APP_VERSION !== 'undefined' ? 'v'+APP_VERSION : '';

/* ─── Script Block 7 of 12 ─── */
const DEFAULT_SERVICES = [
  // ── CUTTING FEES (S/N 1-20 from official Inclineworks International price list) ──
 {cat:"Cutting Fee",name:"Coverall — Cutting",price:300},
  {cat:"Cutting Fee",name:"Custom Measurement (S,M,L,XL,XXL...) — Cutting",price:350},
  {cat:"Cutting Fee",name:"Cook Apron — Cutting",price:270},
  {cat:"Cutting Fee",name:"Cook Uniform — Cutting",price:450},
  {cat:"Cutting Fee",name:"Cook Cap — Cutting",price:300},
  {cat:"Cutting Fee",name:"Combat Jacket — Cutting",price:300},
  {cat:"Cutting Fee",name:"Fire Hood — Cutting",price:450},
  {cat:"Cutting Fee",name:"Lab Coat (With Measurement) — Cutting",price:450},
  {cat:"Cutting Fee",name:"Life Jacket — Cutting",price:300},
  {cat:"Cutting Fee",name:"Shirt / Trouser — Cutting",price:350},
  {cat:"Cutting Fee",name:"Supervisor's Wear — Cutting",price:450},
  {cat:"Cutting Fee",name:"School Cardigan — Cutting",price:350},
  {cat:"Cutting Fee",name:"Sportswear — Cutting",price:270},
  {cat:"Cutting Fee",name:"School Uniform — Cutting",price:300},
  {cat:"Cutting Fee",name:"Tappers Bag — Cutting",price:300},
  {cat:"Cutting Fee",name:"Tools Bag (Large) — Cutting",price:300},
  {cat:"Cutting Fee",name:"Tool Bag (Small) — Cutting",price:300},
  {cat:"Cutting Fee",name:"Vest — Cutting",price:150},
  {cat:"Cutting Fee",name:"Welders Hood — Cutting",price:600},
  {cat:"Cutting Fee",name:"ETC — Cutting",price:0},


  {cat:"Sewing Fee",name:"Cook Uniform — Sewing",price:1500},
  {cat:"Sewing Fee",name:"Cook Cap — Sewing",price:400},
  {cat:"Sewing Fee",name:"Cook Apron — Sewing",price:500},
  {cat:"Sewing Fee",name:"Coverall — Sewing",price:1300},
  {cat:"Sewing Fee",name:"Custom Measurement (General) — Sewing",price:1200},
  {cat:"Sewing Fee",name:"Combat Jacket — Sewing",price:1200},
  {cat:"Sewing Fee",name:"Fire Hood — Sewing",price:600},
  {cat:"Sewing Fee",name:"Lab Coat (With Measurement) — Sewing",price:500},
  {cat:"Sewing Fee",name:"Life Jacket — Sewing",price:1200},
  {cat:"Sewing Fee",name:"Shirt / Trouser — Sewing",price:1500},
  {cat:"Sewing Fee",name:"Supervisor's Wear — Sewing",price:2000},
  {cat:"Sewing Fee",name:"School Cardigan — Sewing",price:900},
  {cat:"Sewing Fee",name:"Sportswear — Sewing",price:800},
  {cat:"Sewing Fee",name:"School Uniform — Sewing",price:700},
  {cat:"Sewing Fee",name:"Tappers Bag — Sewing",price:900},
  {cat:"Sewing Fee",name:"Tools Bag (Large) — Sewing",price:1700},
  {cat:"Sewing Fee",name:"Tool Bag (Small) — Sewing",price:1000},
  {cat:"Sewing Fee",name:"Vest — Sewing",price:400},
  {cat:"Sewing Fee",name:"Welders Hood — Sewing",price:800},
  {cat:"Sewing Fee",name:"ETC — Sewing",price:0},
];


function getPrices() {
  try {
    const saved = JSON.parse(localStorage.getItem('incline_prices_v2'));
    if (saved) {
      const map = {};
      saved.forEach(s => { map[s.name] = s.price; });
      return DEFAULT_SERVICES.map(d => ({ ...d, price: map[d.name] ?? d.price }));
    }
  } catch(e) {}
  return DEFAULT_SERVICES.map(d => ({...d}));
}

let SERVICES = getPrices();
let orderStatus = "Pending";

// ══ ADMIN RELOAD ══
// ── Load all data from Supabase (global so reload can call it) ──
async function refreshStaffFromSupabase() {
  let list;
  try {
    list = await sbGetStaff();
  } catch(e) {
    // Network / Supabase error — keep existing local cache untouched
    console.warn('Staff fetch failed, keeping cache:', e.message);
    return;
  }
  // Only update cache when Supabase actually returned records.
  // An empty result on a site with staff means something went wrong — don't wipe.
  if (!list || list.length === 0) return;

  const normalized = list.map(s => {
    if (s.photo) _photoCache[String(s.id)] = s.photo;  // photos live in memory
    return {
      id: s.id, name: s.name, staffId: s.staff_id,
      phone: s.phone, position: s.position, dept: s.department,
      gender: s.gender || '',
      bankName: s.bank_name, accountNumber: s.account_number,
      accountName: s.account_name, addedAt: s.created_at,
      dob: s.date_of_birth || '', age: s.age || '',
      residence: s.residence || '', state: s.state_of_origin || '',
      lga: s.lga || '', startDate: s.start_date || ''
    };
  });
  saveStaffProfiles(normalized);
}

async function initFromSupabase() {
  try {
    // Staff MUST be fetched and saved first — orders cleanup depends on it
    await refreshStaffFromSupabase();

    // Now fetch the rest in parallel (prices, orders, loans)
    const [prices] = await Promise.all([
      sbGetPrices(),
      refreshOrdersFromSupabase(),
      refreshLoansFromSupabase()
    ]);

    if (prices && prices.length) {
      SERVICES = prices.map(p => ({ name: p.name, cat: p.cat, price: p.price, custom: p.custom || false }));
      localStorage.setItem('incline_prices_v2', JSON.stringify(SERVICES));
    }

    // NOTE: orders are CLIENT orders, not staff records — do NOT filter by staff name
    // Orders remain intact regardless of staff changes
  } catch(e) {
    console.error('Supabase init failed, using localStorage cache:', e);
  } finally {
    // Mark all data as freshly fetched so tab switches don't re-fetch immediately
    var _now = Date.now();
    _lastFetch.staff = _now; _lastFetch.orders = _now;
    _lastFetch.loans = _now; _lastFetch.prices = _now;
    renderAdminPanel();
    renderOrdersTable();
    renderAdminStaffList(false);
    if (typeof populateLoanStaffDropdown === 'function') populateLoanStaffDropdown();
    updateAlumniBadge();
    // Refresh receipt number now that orders are loaded from Supabase
    toReceiptNum = getNextReceiptNumber();
    toUpdateReceipt();
    _appReady = true;
  }
}

// Guard: prevents the reload button from firing before init is complete
var _appReady = false;

async function reloadAdminData() {
  // If app hasn't finished initialising yet, silently ignore
  if (!_appReady) return;

  const btn = document.getElementById('adminReloadBtn');
  if (btn) { btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none'; }

  try {
    // Each fetch wrapped independently — one failure won't kill the rest
    const [prices] = await Promise.all([
      sbGetPrices().catch(function(e){ console.warn('Prices fetch failed:', e); return null; }),
      refreshStaffFromSupabase().catch(function(e){ console.warn('Staff fetch failed:', e); }),
      refreshOrdersFromSupabase().catch(function(e){ console.warn('Orders fetch failed:', e); }),
      refreshLoansFromSupabase().catch(function(e){ console.warn('Loans fetch failed:', e); })
    ]);

    if (prices && prices.length) {
      SERVICES = prices.map(p => ({ name: p.name, cat: p.cat, price: p.price, custom: p.custom || false }));
      localStorage.setItem('incline_prices_v2', JSON.stringify(SERVICES));
    }

    // orders are client records — not filtered by staff

    // Re-render the active tab
    const activeTab = ($('.sidenav__item--active').data('tab') || document.querySelector('.tab-panel[style*="flex"]')?.id?.replace('panel-',''));
    if (activeTab === 'orders')           renderOrdersTable();
    else if (activeTab === 'outstanding') { renderOutstandingTable(); updateAlumniBadge(); populateLoanStaffDropdown(); }
    else if (activeTab === 'reports')     renderStaffCards();
    else if (activeTab === 'staff')       renderAdminStaffList();
    else if (activeTab === 'admin')       renderAdminPanel();
    else if (activeTab === 'salary')      renderSalaryTab();

    updateAlumniBadge();
    var _now2 = Date.now();
    _lastFetch.staff = _now2; _lastFetch.orders = _now2;
    _lastFetch.loans = _now2; _lastFetch.prices = _now2; _lastFetch.salaries = _now2;
    showToast('↻ Refreshed!');
  } catch(e) {
    console.error('Reload error:', e);
    showToast('⚠️ Refresh failed — check connection');
  } finally {
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = ''; }
  }
}

// Auto-sync disabled — UI updates via Supabase Realtime INSERT subscriptions only
var _autoSyncBusy = false;

// ── REALTIME SYNC: updates the UI the moment Supabase data changes ──
// Called once after login so changes from any device appear instantly.
var _realtimeChannel = null;
function setupRealtimeSync() {
  // Tear down any existing subscription first (e.g. after re-login)
  if (_realtimeChannel) {
    supa.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }

  // Helper: flash the logo and re-render the active tab silently
  var _rtBusy = false;
  async function onRemoteChange(table) {
    if (_rtBusy) return;
    _rtBusy = true;
    try {
      // Refresh only the changed table
      if (table === 'orders') {
        await refreshOrdersFromSupabase();
      } else if (table === 'staff') {
        await refreshStaffFromSupabase();
      } else if (table === 'loans') {
        await refreshLoansFromSupabase();
      } else if (table === 'prices') {
        const prices = await sbGetPrices();
        if (prices && prices.length) {
          SERVICES = prices.map(p => ({ name: p.name, cat: p.cat, price: p.price, custom: p.custom || false }));
          localStorage.setItem('incline_prices_v2', JSON.stringify(SERVICES));
        }
      }

      // Re-render whichever tab is visible right now
      const activeTab = ($('.sidenav__item--active').data('tab') || document.querySelector('.tab-panel[style*="flex"]')?.id?.replace('panel-',''));
      if      (activeTab === 'orders')      renderOrdersTable();
      else if (activeTab === 'outstanding') { renderOutstandingTable(); updateAlumniBadge(); populateLoanStaffDropdown(); }
      else if (activeTab === 'reports')     renderStaffCards();
      else if (activeTab === 'staff')       renderAdminStaffList();
      else if (activeTab === 'admin')       renderAdminPanel();
      updateAlumniBadge();

      // Visual flash on the logo so the admin sees a live update happened
      var btn = document.getElementById('adminReloadBtn');
      if (btn) {
        btn.classList.remove('reload-flash');
        void btn.offsetWidth; // force reflow to restart animation
        btn.classList.add('reload-flash');
      }
    } catch(e) {
      console.warn('Realtime re-render error:', e);
    } finally {
      _rtBusy = false;
    }
  }

  _realtimeChannel = supa
    .channel('admin-realtime-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
        function() { onRemoteChange('orders'); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' },
        function() { onRemoteChange('staff'); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' },
        function() { onRemoteChange('loans'); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prices' },
        function() { onRemoteChange('prices'); })
    .subscribe(function(status) {
      var dot   = document.getElementById('liveDot');
      var label = document.getElementById('liveLabel');
      if (status === 'SUBSCRIBED') {
        if (dot)   { dot.style.background = '#10B981'; }
        if (label) { label.style.color = '#10B981'; label.textContent = '● LIVE'; }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (dot)   { dot.style.background = '#F59E0B'; }
        if (label) { label.style.color = '#F59E0B'; label.style.fontSize = '9px'; label.textContent = '● SYNCING'; }
        // Auto-retry after 5s
        setTimeout(function() { setupRealtimeSync(); }, 5000);
      }
      // CONNECTING / other states — keep showing green (optimistic)
    });

  // Browser online/offline fallback indicator
  window.addEventListener('online', function () {
    var dot   = document.getElementById('liveDot');
    var label = document.getElementById('liveLabel');
    if (dot)   { dot.style.background = '#10B981'; }
    if (label) { label.style.color = '#10B981'; label.textContent = '● LIVE'; }
    // Remove offline banner if present
    var ob = document.getElementById('incline-offline-bar');
    if (ob) ob.remove();
    setupRealtimeSync();
    // Re-pull fresh data as soon as connection is restored
    if (typeof _appReady !== 'undefined' && _appReady) {
      initFromSupabase().catch(function(){});
    }
  });

  window.addEventListener('offline', function () {
    var dot   = document.getElementById('liveDot');
    var label = document.getElementById('liveLabel');
    if (dot)   { dot.style.background = '#F59E0B'; }
    if (label) { label.style.color = '#F59E0B'; label.textContent = '● OFFLINE'; }
    // Show persistent offline banner
    if (!document.getElementById('incline-offline-bar')) {
      var bar = document.createElement('div');
      bar.id = 'incline-offline-bar';
      bar.style.cssText = [
        'position:fixed','bottom:0','left:0','right:0',
        'background:rgba(245,158,11,0.95)',
        'color:#000','text-align:center',
        'padding:10px 16px','font-size:13px','font-weight:700',
        'font-family:DM Sans,sans-serif',
        'z-index:999999','letter-spacing:0.3px',
        'backdrop-filter:blur(8px)'
      ].join(';');
      bar.innerHTML = '⚠️  You\'re offline — data shown is from your local cache. Changes will sync when reconnected.';
      document.body && document.body.appendChild(bar);
    }
  });
}


$(function(){
  // Login overlay hidden — we use our own card-based login
  var _od2=document.getElementById('to-order-date');if(_od2)_od2.value=new Date().toISOString().slice(0,10);
  addServiceRow();
  // Show next receipt number in header
  const _initRec = getNextReceiptNumber();
  $('#calcHeaderReceiptNo, #summaryReceiptNo').text('Receipt ' + _initRec);

  // ── One-time migration: push existing localStorage data to Supabase ──
  async function migrateLocalToSupabase() {
    if (localStorage.getItem('incline_migrated_v1')) return;
    console.log('Running one-time migration to Supabase...');
    try {
      // Migrate orders
      const localOrders = getOrders();
      if (localOrders.length) {
        for (const o of localOrders) {
          const row = {
            staff_id: o.staffId || 'admin', staff_name: o.clientName,
            receipt_number: o.receiptNumber, client_name: o.clientName,
            client_phone: o.clientPhone, order_date: o.orderDate,
            due_date: o.dueDate, status: o.status, services: o.services,
            subtotal: o.subtotal, discount: o.discount || 0,
            deposit: o.deposit || 0, balance: o.balance,
            task_id: o.taskId, bank_name: o.bankName,
            account_number: o.accountNumber, account_name: o.accountName,
            notes: o.notes || ''
          };
          await _sbFetch('orders', { method: 'POST', body: row, prefer: 'return=minimal' }).catch(() => {});
        }
        console.log('Orders migrated:', localOrders.length);
      }
      // Migrate loans
      const localLoans = getManualDebts();
      if (localLoans.length) {
        for (const l of localLoans) {
          await sbSaveLoan(l).catch(() => {});
        }
        console.log('Loans migrated:', localLoans.length);
      }
      // Migrate prices
      const localPrices = JSON.parse(localStorage.getItem('incline_prices_v2') || '[]');
      if (localPrices.length) {
        await sbSavePrices(localPrices).catch(() => {});
        console.log('Prices migrated:', localPrices.length);
      }
      localStorage.setItem('incline_migrated_v1', 'true');
      console.log('Migration complete.');
    } catch(e) {
      console.error('Migration error:', e);
    }
  }

  migrateLocalToSupabase().then(() => initFromSupabase()).then(() => {
    setupRealtimeSync();
    // Safety: if tab-orders shows empty but orders exist, auto-recover
    setTimeout(function() {
      const orders = getOrders();
      const staff  = getStaffProfiles();
      if (orders.length > 0 && staff.length > 0) {
        const tbl = document.getElementById('ordersTable');
        if (tbl && (tbl.innerHTML.includes('No task found') || tbl.innerHTML.trim() === '')) {
          console.warn('[Incline] Orders exist but table is empty — forcing re-render without staff filter');
          renderOrdersTableUnfiltered();
        }
      }
    }, 3000);
  });

  $('.tab').on('click', function(){ switchTab($(this).data('tab')); });
  $('#statusRow').on('click', '.status-btn', function(){
    $('.status-btn').removeClass('active'); $(this).addClass('active');
    orderStatus = $(this).data('status');
  });
  $('#addServiceBtn').on('click', addServiceRow);
  // old calc bindings removed

  $('#clearBtn').on('click', clearForm);
  $('#exportCsvBtn').on('click', exportCSV);
  $('#saveOrderBtn').on('click', saveOrder);
  $('#filterSearch, #filterStatus').on('input change', renderOrdersTable);

  // Pill-button helper for task status filter
  window._setTaskPill = function(val, btn) {
    $('#filterStatus').val(val);
    $('.task-status-pill').removeClass('active');
    $(btn).addClass('active');
    renderOrdersTable();
  };
  $('#closeModal').on('click', () => $('#viewModal').hide());
  $('#viewModal').on('click', function(e){ if($(e.target).is(this)) $(this).hide(); });
  $('#savePricesBtn').on('click', saveAllPrices);

  // Outstanding balances tab
  $('#outstandingSearch, #outstandingSortBy, #outstandingFrom, #outstandingTo, #outstandingDateField').on('input change', renderOutstandingTable);
  $('#addDebtBtn').on('click', addManualDebt);

  // ── Calculator phone (11 digits) ──
  $('#clientPhone').on('input', function(){
    const v = $(this).val().replace(/\D/g,''); $(this).val(v);
    if (!v.length) { $(this).css('border-color',''); $('#clientPhoneError').hide(); }
    else if (v.length === 11) { $(this).css('border-color','var(--green)'); $('#clientPhoneError').hide(); }
    else { $(this).css('border-color','var(--red)'); $('#clientPhoneError').show(); }
  });

  // ── Calculator account number (10 digits) ──
  $('#staffAccountNumber').on('input', function(){
    const v = $(this).val().replace(/\D/g,''); $(this).val(v);
    if (!v.length) { $(this).css('border-color',''); $('#accountNumberError').hide(); }
    else if (v.length === 10) { $(this).css('border-color','var(--green)'); $('#accountNumberError').hide(); }
    else { $(this).css('border-color','var(--red)'); $('#accountNumberError').show(); }
  });

  // ── Loan section phone (11 digits) ──
  $('#debtCustomerPhone').on('input', function(){
    const v = $(this).val().replace(/\D/g,''); $(this).val(v);
    if (!v.length) { $(this).css('border-color',''); $('#debtPhoneError').hide(); }
    else if (v.length === 11) { $(this).css('border-color','var(--green)'); $('#debtPhoneError').hide(); }
    else { $(this).css('border-color','var(--red)'); $('#debtPhoneError').show(); }
  });

  // ── Edit modal phone (11 digits) ──
  $('#edit-phone').on('input', function(){
    const v = $(this).val().replace(/\D/g,''); $(this).val(v);
    $(this).css('border-color', !v.length ? '' : v.length===11 ? 'var(--green)' : 'var(--red)');
  });

  // Close edit modal on backdrop click
  $('#editDebtModal').on('click', function(e){ if($(e.target).is(this)) closeEditDebt(); });
  
  // Staff reports tab
  $('#reportStaffSearch, #reportTimeframe').on('input change', renderStaffCards);
  $('#srTimeframe').on('change', function(){ renderStaffReport(_srStaffName); });
  
  // AUTO-DEDUCTION: Check for previous debt when customer name/phone changes
  $('#clientName, #clientPhone').on('blur', checkCustomerDebt);

  // ── Staff name autocomplete ──
  $('#clientName').on('input', onStaffNameInput);
  $(document).on('click', function(e) {
    if (!$(e.target).closest('.staff-autocomplete-wrap').length) {
      $('#staffAcList').removeClass('open');
    }
  });
  $('#clientName').on('keydown', onStaffNameKeydown);

  // Add custom service
  $('#addCustomBtn').on('click', addCustomService);
  $('#customName').on('keypress', function(e){ if(e.which===13) addCustomService(); });
  $('#adminSearch').on('input', function(){
    const q = $(this).val().trim().toLowerCase();
    // Only filter SERVICE rows (pa-svc-row), not category headers
    $('#adminPriceList .pa-svc-row').each(function(){
      const name = ($(this).data('name') || '').toLowerCase();
      $(this).toggle(!q || name.includes(q));
    });
    // Show/hide category header rows based on whether any service in that cat is visible
    $('#adminPriceList .pa-cat-row').each(function(){
      const cat = $(this).data('cat');
      const anyVisible = $(`#adminPriceList .pa-svc-row[data-cat="${cat}"]`).filter(function(){
        return $(this).is(':visible');
      }).length > 0;
      $(this).toggle(!q || anyVisible);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// RECEIPT TRACKER
// ════════════════════════════════════════════════════════════════════

// ── TRACKER MODE ─────────────────────────────────────────────────
var _trackerMode = 'order';

function setTrackerMode(mode) {
  _trackerMode = mode;
  var ob = document.getElementById('trkModeOrder');
  var lb = document.getElementById('trkModeLoan');
  var inp = document.getElementById('trackerInput');
  var hint = document.getElementById('trk-hint-text');
  ob.classList.toggle('active', mode === 'order');
  lb.classList.toggle('active', mode === 'loan');
  if (mode === 'order') {
    inp.placeholder = 'Enter Receipt No. e.g. REC-001';
    if (hint) hint.textContent = 'Enter a receipt number or task ID to look up a record';
  } else {
    inp.placeholder = 'Enter staff name or loan ID';
    if (hint) hint.textContent = 'Search by staff name or loan ID';
  }
  $('#trackerResult').html('');
  inp.focus();
}

function clearTracker() {
  $('#trackerInput').val('').focus();
  $('#trackerResult').html('');
}

function runTracker() {
  if (_trackerMode === 'loan') {
    trackLoan();
  } else {
    trackReceipt();
  }
}

// ── LOAN TRACKER ─────────────────────────────────────────────────
function trackLoan() {
  var q = ($('#trackerInput').val() || '').trim().toLowerCase();
  if (!q) { showToast('⚠️ Enter a staff name or loan ID'); return; }

  var allLoans = getManualDebts();
  var matches = allLoans.filter(function(d) {
    return String(d.id).toLowerCase().includes(q) ||
           (d.clientName || '').toLowerCase().includes(q) ||
           (d.staffId    || '').toLowerCase().includes(q);
  });

  if (!matches.length) {
    $('#trackerResult').html(
      '<div style="max-width:480px;margin:0 auto;background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);border-radius:12px;padding:30px;text-align:center;">' +
      '<div style="font-size:36px;margin-bottom:12px;">❌</div>' +
      '<div style="font-size:16px;font-weight:600;color:var(--red);">No Loan Found</div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-top:6px;">No loan found for: <strong>' + $('#trackerInput').val().trim() + '</strong></div>' +
      '</div>'
    );
    return;
  }

  var html = '<div style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:16px;">';

  matches.forEach(function(debt) {
    var isPaid     = debt.balance <= 0 || debt.status === 'Paid';
    var statusCol  = isPaid ? 'var(--green)' : 'var(--red)';
    var loanDate   = debt.collectedDate
      ? new Date(debt.collectedDate).toLocaleDateString('en-GB')
      : (debt.date ? new Date(debt.date).toLocaleDateString('en-GB') : '—');
    var dueDateStr = debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('en-GB') : '—';
    var isOverdue  = !isPaid && debt.dueDate && new Date(debt.dueDate) < new Date();
    var txns       = debt.payments || [];
    var totalPaid  = txns.filter(function(t){ return t.type==='debit'; })
                        .reduce(function(s,t){ return s+(t.amount||0); }, 0);

    // Safe single-quoted id for onclick attributes — UUIDs only contain hex + hyphens, safe in single quotes
    var sid = String(debt.id).replace(/'/g, '');

    // Payment history rows
    var txHtml = '';
    if (txns.length) {
      txHtml += '<div style="margin-top:14px;">';
      txHtml += '<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;">Payment History</div>';
      txns.slice().reverse().forEach(function(t) {
        var isDebit = t.type === 'debit';
        var tDate   = t.date ? new Date(t.date).toLocaleDateString('en-GB') : '—';
        var amtStr  = '₦' + (t.amount||0).toLocaleString();
        txHtml +=
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--surface3);font-size:12px;">' +
          '<div>' +
          '<div style="font-weight:600;color:var(--text);">' + (t.note || (isDebit ? 'Repayment' : 'Loan Issued')) + '</div>' +
          '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">' + tDate + '</div>' +
          '</div>' +
          '<div style="font-weight:700;font-size:13px;color:' + (isDebit ? 'var(--red)' : 'var(--green)') + ';">' +
          (isDebit ? '−' : '+') + amtStr +
          '</div></div>';
      });
      txHtml += '</div>';
    }

    // Action buttons — id passed directly via single-quoted string
    var actionBtns = '';
    if (!isPaid) {
      actionBtns =
        '<div style="display:grid;grid-template-columns:2fr 2fr 1fr;gap:8px;padding:0 18px 18px;">' +
        '<button class="btn btn-gold" style="padding:12px 8px;font-size:13px;font-weight:700;" ' +
          'onclick="trackerLoanPay(\'' + sid + '\')">💳 Record Payment</button>' +
        '<button style="padding:12px 8px;font-size:13px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.3);' +
          'color:#25D366;border-radius:50px;cursor:pointer;font-family:inherit;font-weight:600;" ' +
          'onclick="trackerLoanPDF(\'' + sid + '\')">📄 Export PDF</button>' +
        '<button class="btn btn-ghost" style="padding:12px 8px;font-size:13px;color:var(--red);border-color:rgba(224,82,82,0.3);" ' +
          'onclick="trackerLoanDelete(\'' + sid + '\')">🗑</button>' +
        '</div>';
    } else {
      actionBtns =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 18px 18px;">' +
        '<button style="padding:12px 8px;font-size:13px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.3);' +
          'color:#25D366;border-radius:50px;cursor:pointer;font-family:inherit;font-weight:600;" ' +
          'onclick="trackerLoanPDF(\'' + sid + '\')">📄 Export PDF</button>' +
        '<button class="btn btn-ghost" style="padding:12px 8px;font-size:13px;color:var(--red);border-color:rgba(224,82,82,0.3);" ' +
          'onclick="trackerLoanDelete(\'' + sid + '\')">🗑 Delete</button>' +
        '</div>';
    }

    html +=
      '<div style="background:var(--surface);border:1px solid rgba(16,185,129,0.3);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.3);">' +

      // Header
      '<div style="background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.04));padding:18px 22px;border-bottom:1px solid var(--surface3);display:flex;justify-content:space-between;align-items:center;">' +
      '<div>' +
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:2.5px;color:rgba(16,185,129,0.7);margin-bottom:4px;">💸 Loan Record</div>' +
      '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:700;color:var(--text);">' + debt.clientName + '</div>' +
      (debt.staffId ? '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">ID: ' + debt.staffId + '</div>' : '') +
      (debt.clientPhone ? '<div style="font-size:11px;color:var(--text-muted);margin-top:1px;">📞 ' + debt.clientPhone + '</div>' : '') +
      '</div>' +
      '<span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;border:1px solid ' + statusCol + ';color:' + statusCol + ';background:rgba(0,0,0,0.15);">' + (isPaid ? 'PAID ✓' : 'OUTSTANDING') + '</span>' +
      '</div>' +

      // Figures grid
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--surface3);">' +
      '<div style="background:var(--surface);padding:12px 16px;">' +
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:3px;">Loan Amount</div>' +
      '<div style="font-size:16px;font-weight:700;color:var(--text);font-family:\'Cormorant Garamond\',serif;">₦' + (debt.originalAmount||debt.amount||0).toLocaleString() + '</div>' +
      '</div>' +
      '<div style="background:var(--surface);padding:12px 16px;">' +
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:3px;">Total Repaid</div>' +
      '<div style="font-size:16px;font-weight:700;color:var(--green);font-family:\'Cormorant Garamond\',serif;">₦' + totalPaid.toLocaleString() + '</div>' +
      '</div>' +
      '<div style="background:var(--surface);padding:12px 16px;">' +
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:3px;">Balance</div>' +
      '<div style="font-size:16px;font-weight:700;font-family:\'Cormorant Garamond\',serif;color:' + (isPaid ? 'var(--green)' : 'var(--red)') + ';">₦' + (debt.balance||0).toLocaleString() + '</div>' +
      '</div>' +
      '</div>' +

      // Dates
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--surface3);">' +
      '<div style="background:var(--surface2);padding:10px 16px;">' +
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:3px;">Loan Date</div>' +
      '<div style="font-size:13px;font-weight:600;color:var(--text);">' + loanDate + '</div>' +
      '</div>' +
      '<div style="background:var(--surface2);padding:10px 16px;">' +
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:3px;">Due Date</div>' +
      '<div style="font-size:13px;font-weight:600;color:' + (isOverdue ? 'var(--red)' : 'var(--text)') + ';">' + dueDateStr + (isOverdue ? ' ⚠' : '') + '</div>' +
      '</div>' +
      '</div>' +

      // Payment history + notes
      '<div style="padding:4px 18px 6px;">' +
      txHtml +
      (debt.notes ? '<div style="margin-top:10px;font-size:12px;color:var(--text-muted);font-style:italic;padding-bottom:8px;">Note: ' + debt.notes + '</div>' : '') +
      '</div>' +

      actionBtns +
      '</div>';
  });

  html += '</div>';
  $('#trackerResult').html(html);
}

// ── Loan tracker helpers — id passed directly, no globals ────────

function trackerLoanPay(id) {
  var debts = getManualDebts();
  var debt  = debts.find(function(d) { return String(d.id) === String(id); });
  if (!debt) { showToast('⚠️ Loan not found'); return; }
  if (debt.balance <= 0) { showToast('✅ This loan is already fully paid'); return; }
  // Use 'trk-loan' type so confirmPayment knows to refresh the tracker after
  _pvId = debt.id;
  openPaymentModal('trk-loan', debt.id, debt.clientName, debt.balance);
}

function trackerLoanPDF(id) {
  var debts = getManualDebts();
  var debt  = debts.find(function(d) { return String(d.id) === String(id); });
  if (!debt) { showToast('⚠️ Loan not found'); return; }
  // Set _pvId and _pdfDebt then show password modal — same path as Outstanding tab
  _pvId = debt.id;
  window._pdfDebt = debt;
  $('#pdfPassInput').val('');
  $('#pdfPassError').hide().text('');
  var saved = localStorage.getItem('incline_pdf_password');
  $('#pdfPassModalTitle').text(saved ? 'Enter PDF Password' : 'Set PDF Password');
  $('#pdfPassModalDesc').text(saved
    ? 'Enter your password to encrypt and generate the PDF.'
    : 'No password set yet. Create one now — it will be saved for future use.');
  document.getElementById('pdfPasswordModal').style.display = 'flex';
  setTimeout(function() { document.getElementById('pdfPassInput').focus(); }, 100);
}

async function trackerLoanDelete(id) {
  var debts = getManualDebts();
  var debt  = debts.find(function(d) { return String(d.id) === String(id); });
  if (!debt) { showToast('⚠️ Loan not found'); return; }
  var _dld = await showConfirm({
    title: 'Delete Loan Record?',
    body: 'This will permanently remove <strong>' + debt.clientName + '</strong>\'s loan record.<br/>This cannot be undone.',
    okText: 'Delete', icon: '\uD83D\uDDD1'
  });
  if (!_dld) return;

  // Remove locally
  localStorage.setItem('incline_manual_debts',
    JSON.stringify(debts.filter(function(d) { return String(d.id) !== String(id); }))
  );

  // Sync to Supabase — try both string and numeric id
  _sbFetch('loans?id=eq.' + String(debt.id), { method: 'DELETE', prefer: 'return=minimal' })
    .then(function(res) {
      if (res.error) {
        return _sbFetch('loans?id=eq.' + Number(debt.id), { method: 'DELETE', prefer: 'return=minimal' });
      }
    })
    .catch(function(e) { console.error('Loan delete sync:', e); });

  renderOutstandingTable();
  updateAlumniBadge();
  $('#trackerResult').html('');
  $('#trackerInput').val('').focus();
  showToast('🗑 Loan record deleted');
}


function trackReceipt() {
  const inputId = $('#trackerInput').val().trim();
  if (!inputId) { showToast('⚠️ Enter a Receipt ID'); return; }

  const orders = getOrders();
  const inputUpper = inputId.trim().toUpperCase();
  const order = orders.find(o =>
    (o.receiptNumber && o.receiptNumber.toUpperCase() === inputUpper) ||
    String(o.id) === inputId.trim()
  );

  if (!order) {
    $('#trackerResult').html(`
      <div style="max-width:480px;margin:0 auto;background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);border-radius:12px;padding:30px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">❌</div>
        <div style="font-size:16px;font-weight:600;color:var(--red);">Receipt Not Found</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:6px;">No order matches: <strong>${inputId}</strong></div>
      </div>
    `);
    return;
  }

  _opId = order.id;

  const statusColors = {'Pending':'#60a5fa','In Progress':'#60a5fa','Ready':'var(--green)','Delivered':'var(--text-muted)','Cancelled':'var(--red)'};
  const statusColor = statusColors[order.status] || 'var(--text-muted)';
  window._trkId = order.id;

  const servicesHtml = (order.services || []).map(s =>
    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--surface3);font-size:13px;">
      <span style="color:var(--text);">${s.name} × ${s.qty}</span>
      <span style="color:var(--gold);font-weight:600;">₦${s.price.toLocaleString()}</span>
    </div>`
  ).join('');

  const dateStr = order.orderDate || (order.date ? new Date(order.date).toLocaleDateString('en-GB') : '—');

  $('#trackerResult').html(`
    <div style="max-width:520px;margin:0 auto 32px;">
      <div style="background:var(--surface);border:1px solid rgba(16,185,129,0.3);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.3);">

        <div style="background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.04));padding:20px 24px;border-bottom:1px solid var(--surface3);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:2.5px;color:rgba(16,185,129,0.7);margin-bottom:5px;">✅ Receipt Found</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:var(--text);">${order.receiptNumber || '#'+order.id}</div>
            ${order.taskId ? `<div style="font-size:11px;color:var(--text-muted);margin-top:3px;">Task: ${order.taskId}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <span style="display:inline-block;background:rgba(16,185,129,0.08);color:${statusColor};border:1px solid ${statusColor};padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;">${order.status}</span>
            <div style="font-size:10px;color:var(--text-muted);margin-top:6px;">${dateStr}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--surface3);">
          <div style="background:var(--surface);padding:14px 18px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;">Staff</div>
            <div style="font-size:14px;font-weight:600;color:var(--text);">${order.clientName}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${order.clientPhone || ''}</div>
          </div>
          <div style="background:var(--surface);padding:14px 18px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;">Due Date</div>
            <div style="font-size:14px;font-weight:600;color:var(--text);">${order.dueDate || '—'}</div>
            ${order.staffId ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">ID: ${order.staffId}</div>` : ''}
          </div>
        </div>

        <div style="padding:16px 20px 0;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;">Services</div>
          ${servicesHtml || '<div style="font-size:13px;color:var(--text-muted);">No services recorded</div>'}
        </div>

        <div style="margin:12px 20px;background:var(--surface2);border-radius:10px;padding:12px 16px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;"><span style="color:var(--text-muted);">Subtotal</span><span style="color:var(--text);">₦${order.subtotal.toLocaleString()}</span></div>
          ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;"><span style="color:var(--text-muted);">Loan Deduction</span><span style="color:var(--red);">−₦${order.discount.toLocaleString()}</span></div>` : ''}
          ${order.deposit > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;"><span style="color:var(--text-muted);">Advance Paid</span><span style="color:var(--green);">₦${order.deposit.toLocaleString()}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;padding-top:10px;margin-top:6px;border-top:1px solid var(--surface3);font-family:'Cormorant Garamond',serif;">
            <span style="color:var(--text-muted);">Balance</span>
            <span style="color:var(--gold);">₦${order.balance.toLocaleString()}</span>
          </div>
        </div>

        <div style="padding:4px 20px 14px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;">Update Status</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${['Pending','In Progress','Ready','Delivered','Cancelled'].map(s =>
              `<button onclick=\"trackerUpdateStatus('${s}')\"
                style="padding:5px 12px;border-radius:20px;border:1px solid ${order.status===s?'var(--gold)':'var(--surface3)'};
                background:${order.status===s?'rgba(16,185,129,0.15)':'transparent'};
                color:${order.status===s?'var(--gold)':'var(--text-muted)'};
                cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;transition:all 0.15s;">${s}</button>`
            ).join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 2fr 1fr;gap:8px;padding:0 20px 20px;">
          <button class="btn btn-gold" style="padding:13px 8px;font-size:13px;font-weight:700;" onclick="trackerPrint()">🖨 Print Receipt</button>
          <button style="padding:13px 8px;font-size:13px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.3);color:#25D366;border-radius:50px;cursor:pointer;font-family:inherit;font-weight:600;" onclick="trackerShare()">📤 Share</button>
          <button class="btn btn-ghost" style="padding:13px 8px;font-size:13px;color:var(--red);border-color:rgba(224,82,82,0.3);" onclick="trackerDelete()">🗑</button>
        </div>

      </div>
    </div>
  `);
}

function trackerPrint() {
  var id = window._trkId;
  if (!id) { showToast('⚠️ No order loaded'); return; }
  _opId = id;
  reprintReceipt(id);
}

function trackerShare() {
  var id = window._trkId;
  if (!id) { showToast('⚠️ No order loaded'); return; }
  _opId = id;
  setTimeout(function() { opShareWhatsApp(); }, 40);
}

function trackerUpdateStatus(newStatus) {
  var id = window._trkId;
  if (!id) return;
  const orders = getOrders();
  const order = orders.find(o => String(o.id) === String(id));
  if (!order) return;
  order.status = newStatus;
  localStorage.setItem('incline_orders', JSON.stringify(orders));
  _sbFetch('orders?id=eq.' + String(id), { method: 'PATCH', body: { status: newStatus }, prefer: 'return=minimal' }).catch(e => console.error('Status sync:', e));
  renderOrdersTable();
  showToast('✅ Status updated to ' + newStatus);
  trackReceipt();
}

async function trackerDelete() {
  var id = window._trkId;
  if (!id) return;
  const orders = getOrders();
  const order = orders.find(o => String(o.id) === String(id));
  if (!order) return;
  var _dod = await showConfirm({
    title: 'Delete Task?',
    body: 'Delete <strong>' + (order.receiptNumber || '#'+id) + '</strong> for <strong>' + order.clientName + '</strong>.<br/>This cannot be undone.',
    okText: 'Delete', icon: '\uD83D\uDDD1'
  });
  if (!_dod) return;
  localStorage.setItem('incline_orders', JSON.stringify(orders.filter(o => String(o.id) !== String(id))));
  _sbFetch('orders?id=eq.' + String(id), { method: 'DELETE', prefer: 'return=minimal' }).catch(e => console.error('Delete sync:', e));
  renderOrdersTable();
  window._trkId = null;
  $('#trackerResult').html('');
  $('#trackerInput').val('').focus();
  showToast('🗑 Task deleted');
}

function reprintReceipt(orderId) {
  // Use loose == to handle numeric vs string id mismatch from Supabase vs localStorage
  const order = getOrders().find(o => String(o.id) === String(orderId) || o.receiptNumber === orderId);
  if (!order) { showToast('⚠️ Order not found'); return; }

  // Populate receipt fields from saved order data
  $('#receipt-date').text(order.orderDate || new Date(order.date).toLocaleDateString());
  $('#receipt-staff').text(order.staffId || 'N/A');
  $('#receipt-task-id').text(order.taskId || '—');
  $('#receipt-number').text(order.receiptNumber || order.id);
  $('#receipt-customer-name').text(order.clientName);
  $('#receipt-customer-phone').text(order.clientPhone || '—');
  $('#receipt-due-date').text(order.dueDate || '—');

  let itemsHtml = '';
  (order.services || []).forEach(s => {
    itemsHtml += `
      <div class="thermal-item">
        <div class="thermal-item-name">${s.name}</div>
        <div class="thermal-item-line">
          <span>${s.qty} × ₦${(s.unitPrice||0).toLocaleString()}</span>
          <span>₦${s.price.toLocaleString()}</span>
        </div>
      </div>`;
  });
  $('#receipt-items-list').html(itemsHtml);
  $('#receipt-item-count').text((order.services||[]).reduce((a,s)=>a+s.qty,0));
  $('#receipt-subtotal').text('₦' + order.subtotal.toLocaleString());

  if (order.discount > 0) { $('#receipt-discount-row').show(); $('#receipt-discount').text('−₦' + order.discount.toLocaleString()); }
  else { $('#receipt-discount-row').hide(); }

  if (order.deposit > 0) { $('#receipt-advance-row').show(); $('#receipt-advance').text('₦' + order.deposit.toLocaleString()); }
  else { $('#receipt-advance-row').hide(); }

  $('#receipt-total').text('₦' + Math.max(0, order.subtotal - order.discount - order.deposit).toLocaleString());
  $('#receipt-balance').text('₦' + order.balance.toLocaleString());
  $('#receipt-bank-name').text(order.bankName || 'Not provided');
  $('#receipt-account-number').text(order.accountNumber || 'XXXXXXXXXX');
  $('#receipt-account-name').text(order.accountName || 'Not provided');

  // Show thermal receipt, then print, then hide
  var receiptEl = document.getElementById('thermalReceipt');
  if (receiptEl) {
    receiptEl.style.visibility = 'visible';
    receiptEl.style.left = '0';
    receiptEl.style.zIndex = '99999';
  }
  setTimeout(function() {
    window.print();
    setTimeout(function() {
      if (receiptEl) {
        receiptEl.style.visibility = 'hidden';
        receiptEl.style.left = '-9999px';
        receiptEl.style.zIndex = '-1';
      }
    }, 500);
  }, 300);
}

// ── Cache timestamps — track when each data type was last fetched from Supabase ──
var _lastFetch = { staff: 0, orders: 0, loans: 0, salaries: 0, prices: 0 };
var _CACHE_TTL = 3 * 60 * 1000; // 3 minutes — re-fetch at most every 3 min

function _cacheStale(key) {
  return (Date.now() - (_lastFetch[key] || 0)) > _CACHE_TTL;
}

function switchTab(tab) {
  $('.tab').removeClass('active'); $(`.tab[data-tab="${tab}"]`).addClass('active');
  $('.tab-content').removeClass('active'); $(`#tab-${tab}`).addClass('active');

  // ── Always reset ALL sub-screens to their default (main) view ──
  $('#order-list-screen').show();
  $('#staff-orders-screen').hide();
  $('#order-profile-screen').hide();
  $('#os-main').show();
  $('#os-profile').hide();
  $('#staff-report-page').hide();
  if (document.getElementById('salary-main-screen'))
    document.getElementById('salary-main-screen').style.display = 'block';
  if (document.getElementById('salary-profile-screen'))
    document.getElementById('salary-profile-screen').style.display = 'none';

  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;

  // ── INSTANT render from cache, then silently refresh if stale ──
  if (tab === 'orders') {
    renderOrdersTable(); // always instant from localStorage
    if (_cacheStale('orders')) {
      refreshOrdersFromSupabase().then(function(){ _lastFetch.orders = Date.now(); renderOrdersTable(); }).catch(function(){});
    }
  }
  if (tab === 'outstanding') {
    renderOutstandingTable(); updateAlumniBadge(); populateLoanStaffDropdown();
    if (_cacheStale('loans')) {
      refreshLoansFromSupabase().then(function(){ _lastFetch.loans = Date.now(); renderOutstandingTable(); updateAlumniBadge(); }).catch(function(){});
    }
  }
  if (tab === 'reports') {
    renderStaffCards(); // renders from localStorage cache instantly
    if (_cacheStale('orders') || _cacheStale('staff')) {
      Promise.all([
        _cacheStale('staff') ? refreshStaffFromSupabase().then(function(){ _lastFetch.staff = Date.now(); }) : Promise.resolve(),
        _cacheStale('orders') ? refreshOrdersFromSupabase().then(function(){ _lastFetch.orders = Date.now(); }) : Promise.resolve()
      ]).then(function(){ renderStaffCards(); }).catch(function(){});
    }
  }
  if (tab === 'staff') {
    // Render instantly from cache first, then refresh if stale
    _renderAdminStaffListFromCache();
    if (_cacheStale('staff')) {
      sbGetStaff().then(function(list) {
        if (!list || !list.length) return;
        list.forEach(function(s){ if (s.photo) _photoCache[String(s.id)] = s.photo; });
        var staffList = list.map(function(s){ return { id:s.id, name:s.name, staffId:s.staff_id, phone:s.phone, position:s.position, dept:s.department, gender:s.gender||'', bankName:s.bank_name, accountNumber:s.account_number, accountName:s.account_name, addedAt:s.created_at, dob:s.date_of_birth||'', age:s.age||'', residence:s.residence||'', state:s.state_of_origin||'', lga:s.lga||'', startDate:s.start_date||'', bio:s.bio||'', password:s.password||'', nokName:s.nok_name||'', nokPhone:s.nok_phone||'', guarantorName:s.guarantor_name||'', guarantorPhone:s.guarantor_phone||'', location:s.location||'' }; });
        saveStaffProfiles(staffList);
        _lastFetch.staff = Date.now();
        renderAdminStaffList();
      }).catch(function(){});
    }
  }
  if (tab === 'salary') {
    _renderSalaryFromCache(); // instant
    if (_cacheStale('salaries') || _cacheStale('staff')) {
      renderSalaryTab(); // background refresh
    }
  }
  if (tab === 'analysis') renderAnalysis();
}

// Instant render of staff list from localStorage/memory cache — no network
function _renderAdminStaffListFromCache() {
  var cached = getStaffProfiles();
  if (!cached.length) { renderAdminStaffList(); return; } // no cache — must fetch
  var $el = $('#adminStaffList');
  var sorted = cached.slice().sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
  var allOrders = getOrders();
  var html = '';
  sorted.forEach(function(s) {
    var initials = (s.name||'?').split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
    var photo = getStaffPhoto(String(s.id));
    var avatarHtml = photo ? '<img src="'+photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>' : initials;
    var orderCount = allOrders.filter(function(o){ return (o.staff_id||o.staffId) === s.staffId; }).length;

    function cell(label, val) {
      var v = val ? '<span class="staff-info-val">'+val+'</span>' : '<span class="staff-info-val muted">—</span>';
      return '<div class="staff-info-cell"><div class="staff-info-label">'+label+'</div>'+v+'</div>';
    }
    var dobFmt = '—'; try { if(s.dob) dobFmt = new Date(s.dob+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); } catch(e){}
    var startFmt = '—'; try { if(s.startDate) startFmt = new Date(s.startDate+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); } catch(e){}

    html += '<div class="admin-staff-wrap" id="staff-wrap-'+s.id+'">'+
      '<div class="admin-staff-row" onclick="toggleStaffExpand(\''+s.id+'\')">'+
        '<div class="admin-staff-thumb">'+avatarHtml+'</div>'+
        '<div style="flex:1;min-width:0;">'+
          '<div style="font-size:14px;font-weight:600;color:var(--text);">'+s.name+'</div>'+
          '<div style="font-size:11px;color:var(--text-muted);">'+(s.staffId||'—')+' · '+(s.position||'—')+(s.dept?' · '+s.dept:'')+(s.gender?' · '+s.gender:'')+'</div>'+
        '</div>'+
        '<div style="font-size:11px;color:var(--text-muted);text-align:right;margin-right:12px;">'+
          '<div style="color:var(--gold);font-weight:600;">'+orderCount+' orders</div>'+
          '<div>'+(s.phone||'No phone')+'</div>'+
        '</div>'+
        '<div style="display:flex;gap:6px;align-items:center;" onclick="event.stopPropagation()">'+
          '<button class="tbl-btn" onclick="openEditStaff(\''+s.id+'\')" style="color:var(--gold);border-color:rgba(16,185,129,0.3);">✏️ Edit</button>'+
          '<button class="tbl-btn danger" onclick="deleteStaff(\''+s.id+'\')">🗑</button>'+
        '</div>'+
        '<span class="staff-row-chevron">▼</span>'+
      '</div>'+
      '<div class="staff-expand-panel">'+
        '<div class="staff-expand-inner">'+
          cell('Full Name', s.name)+
          cell('Staff ID', s.staffId)+
          cell('Phone', s.phone)+
          cell('Position', s.position)+
          cell('Department', s.dept)+
          cell('Gender', s.gender)+
          cell('Date of Birth', dobFmt)+
          cell('Age', s.age ? s.age+' yrs' : '')+
          cell('Start Date', startFmt)+
          cell('LGA', s.lga)+
          cell('State of Origin', s.state)+
          cell('Residence', s.residence)+
          cell('Bank Name', s.bankName)+
          cell('Account Name', s.accountName)+
          cell('Account Number', s.accountNumber)+
          cell('Next of Kin', s.nokName ? s.nokName + (s.nokPhone ? ' · ' + s.nokPhone : '') : '')+
          cell('Guarantor', s.guarantorName ? s.guarantorName + (s.guarantorPhone ? ' · ' + s.guarantorPhone : '') : '')+
          cell('Location', s.location)+
          (s.bio ? '<div class="staff-expand-bio">📝 '+s.bio+'</div>' : '')+
        '</div>'+
      '</div>'+
    '</div>';
  });
  $el.html(html || '<div class="empty-state" style="padding:40px 0;"><div class="icon">👥</div><p>No staff added yet.</p></div>');
  $('#staffCountBadge').text(sorted.length + ' member' + (sorted.length !== 1 ? 's' : ''));
}

// Instant render of salary grid from localStorage/memory cache — no network
function _renderSalaryFromCache() {
  var staff = getStaffProfiles();
  if (!staff.length) return;
  var grid = document.getElementById('salaryStaffGrid');
  var strip = document.getElementById('salary-summary-strip');
  if (!grid) return;
  var allSalaries = _allSalariesCache || [];
  var search = (document.getElementById('salarySearch')||{}).value || '';
  search = search.toLowerCase();
  var filtered = staff.filter(function(s){ return !search || (s.name||'').toLowerCase().includes(search) || (s.staffId||'').toLowerCase().includes(search); }).sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
  var grandTotal = allSalaries.reduce(function(t,e){ return t+(e.amount||0); },0);
  var _nowC = new Date();
  var _ymC  = _nowC.getFullYear() + '-' + String(_nowC.getMonth()+1).padStart(2,'0');
  var _monthLblC = _nowC.toLocaleString('en-GB',{month:'long',year:'numeric'}).toUpperCase();
  var thisMonth  = allSalaries.filter(function(e){ return e.date_paid && e.date_paid.slice(0,7)===_ymC; });
  var monthTotal = thisMonth.reduce(function(t,e){ return t+(e.amount||0); },0);
  if (strip) strip.innerHTML = '<div class="sal-stat-box"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(16,185,129,0.7);margin-bottom:6px;">All-Time Paid</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:700;color:var(--green);">₦'+grandTotal.toLocaleString()+'</div></div><div class="sal-stat-box"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(16,185,129,0.7);margin-bottom:6px;">'+_monthLblC+'</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:700;color:var(--gold);">₦'+monthTotal.toLocaleString()+'</div><div style="font-size:9px;color:var(--text-muted);margin-top:3px;">'+thisMonth.length+' payment'+(thisMonth.length!==1?'s':'')+' this month</div></div><div class="sal-stat-box"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(16,185,129,0.7);margin-bottom:6px;">Staff Count</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:700;color:var(--text);">'+staff.length+'</div></div>';
  grid.innerHTML = filtered.map(function(s){
    var entries = allSalaries.filter(function(e){ return e.staff_id === s.staffId; });
    var totalPaid = entries.reduce(function(sum,e){ return sum+(e.amount||0); },0);
    var last = entries[0]; var lastDate = last ? last.date_paid : null;
    var photoSrc = getStaffPhoto(String(s.id)) || s.photo || null;
    var initials = (s.name||'?').split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
    var avatarInner = photoSrc ? '<img src="'+photoSrc+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>' : '<span style="font-size:15px;font-weight:700;color:var(--gold);font-family:\'Cormorant Garamond\',serif;">'+initials+'</span>';
    return '<div class="sal-card sal-selectable-card" id="sal-card-'+s.staffId+'" onclick="_salCardClick(event,\''+s.staffId+'\')"><div style="position:relative;"><div class="sal-card-cb-wrap" id="sal-cb-wrap-'+s.staffId+'"><i class="fas fa-check sal-card-cb" data-staffid="'+s.staffId+'" data-checked="false" style="font-size:13px;color:#10b981;"></i></div><div style="display:flex;align-items:center;gap:13px;margin-bottom:14px;padding-top:2px;"><div class="sal-avatar">'+avatarInner+'</div><div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:15px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(s.name||'—')+'</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'+(s.staffId||'')+' · '+(s.position||'—')+'</div></div><div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700;color:var(--green);white-space:nowrap;">'+entries.length+' paid</div></div><div style="height:1px;background:rgba(255,255,255,0.05);margin-bottom:14px;"></div><div style="display:flex;justify-content:space-between;align-items:flex-end;"><div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px;">Total Paid</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:700;color:var(--green);">₦'+totalPaid.toLocaleString()+'</div></div><div style="text-align:right;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px;">Last Payment</div><div style="font-size:12px;color:'+(lastDate?'var(--text)':'var(--text-muted)')+';">'+(lastDate||'None yet')+'</div></div></div></div></div>';
  }).join('');
  if (_salaryGridSelectMode) grid.classList.add('sal-grid-select-active');
}

function addCustomService() {
  const name = $('#customName').val().trim();
  const cat  = $('#customCat').val();
  const price = parseFloat($('#customPrice').val()) || 0;

  if (!name) { showToast('⚠️ Enter a service name.'); return; }
  if (SERVICES.find(s => s.name.toLowerCase() === name.toLowerCase())) {
    showToast('⚠️ That service already exists.'); return;
  }

  SERVICES.push({ cat, name, price, custom: true });
  localStorage.setItem('incline_prices_v2', JSON.stringify(SERVICES));
  sbSavePrices(SERVICES).catch(e => console.error('Custom price sync failed:', e));

  // Refresh admin list and task-order dropdowns
  renderAdminPanel();
  document.querySelectorAll('#to-services-list .to-svc-select').forEach(function(sel){
    var cur = sel.value;
    sel.innerHTML = buildOptions(cur);
  });

  $('#customName').val('');
  $('#customPrice').val('');
  showToast('Service added!');
  $('#adminSaveStatus').text('Saved at ' + new Date().toLocaleTimeString());
}

function renderAdminPanel() {
  // Pre-fill the admin name input every time this panel opens
  setTimeout(_initAdminNameInput, 50);
  // Always fall back to defaults if SERVICES is empty
  if (!SERVICES || !SERVICES.length) SERVICES = getPrices();
  const $list = $('#adminPriceList').empty();
  const cats = [...new Set(SERVICES.map(s => s.cat))];

  cats.forEach(cat => {
    const items = SERVICES.filter(s => s.cat === cat);
    const icon = cat === 'Cutting Fee' ? '✂' : cat === 'Sewing Fee' ? '🪡' : '★';

    $list.append(`
      <tr class="pa-cat-row price-row" data-cat="${cat}">
        <td colspan="3">
          <div class="pa-cat-inner">
            <div class="pa-cat-icon">${icon}</div>
            <div class="pa-cat-title">${cat}</div>
            <div class="pa-cat-badge">${items.length} services</div>
          </div>
        </td>
      </tr>`);

    items.forEach((svc, i) => {
      const shortName = svc.name.replace(/ — (Cutting|Sewing)$/, '');
      const deleteBtn = svc.custom
        ? `<button class="pa-del" onclick="deleteCustomService('${svc.name}')">✕</button>`
        : '';
      $list.append(`
        <tr class="pa-svc-row ${i % 2 === 0 ? '' : 'pa-alt'} price-row" data-name="${svc.name}" data-cat="${svc.cat}">
          <td class="pa-svc-name">${shortName}${svc.custom ? '<span class="pa-svc-badge">custom</span>' : ''}</td>
          <td class="pa-price-cell">
            <div class="pa-price-inner">
              <span class="pa-naira">₦</span>
              <input type="number" class="pa-inp admin-price-input" data-name="${svc.name}" value="${svc.price}" min="0"/>
            </div>
          </td>
          <td class="pa-del-cell">${deleteBtn}</td>
        </tr>`);
    });
  });
}

async function deleteCustomService(name) {
  var _dcs = await showConfirm({
    title: 'Remove Service?',
    body: 'Remove <strong>' + name + '</strong> from your price list?',
    okText: 'Remove', icon: '\uD83D\uDDD1'
  });
  if (!_dcs) return;
  SERVICES = SERVICES.filter(s => s.name !== name);
  localStorage.setItem('incline_prices_v2', JSON.stringify(SERVICES));
  sbDeletePrice(name).catch(e => console.error('Price delete sync failed:', e));
  renderAdminPanel();
  $('#servicesContainer .svc-row').each(function(){
    const sel = $(this).find('.svc-select');
    const cur = sel.val();
    sel.html(buildOptions(cur));
  });
  showToast('🗑 "' + name + '" removed.');
}

function saveAllPrices() {
  $('.admin-price-input').each(function(){
    const name = $(this).data('name');
    const price = parseFloat($(this).val()) || 0;
    const svc = SERVICES.find(s => s.name === name);
    if (svc) svc.price = price;
  });
  localStorage.setItem('incline_prices_v2', JSON.stringify(SERVICES));
  sbSavePrices(SERVICES).catch(e => console.error('Prices sync failed:', e));
  // Trigger storage event for staff pages (if on same device)
  window.dispatchEvent(new Event('incline_prices_updated'));
  // Refresh task-order service dropdowns (to-services-list uses toServiceRows)
  // Re-render any open service rows in the task-order panel
  document.querySelectorAll('#to-services-list .to-svc-select').forEach(function(sel){
    var cur = sel.value;
    sel.innerHTML = buildOptions(cur);
  });
  if (typeof toCalc === 'function') toCalc();
  $('#adminSaveStatus').text('Saved at ' + new Date().toLocaleTimeString());
  showToast('✅ Prices saved! Staff calculators will update.');
}

function buildOptions(selected) {
  let html = '<option value="">— Select Service —</option>';
  let lastCat = '';
  SERVICES.forEach(s => {
    if (s.cat !== lastCat) {
      if (lastCat) html += '</optgroup>';
      html += `<optgroup label="📂 ${s.cat}">`;
      lastCat = s.cat;
    }
    const sel = selected === s.name ? 'selected' : '';
    html += `<option value="${s.name}" data-price="${s.price}" ${sel}>${s.name} — ₦${s.price.toLocaleString()}</option>`;
  });
  if (lastCat) html += '</optgroup>';
  return html;
}

function triggerRowCalc(row) {
  const name = row.find('.svc-select').val();
  const svc = SERVICES.find(s => s.name === name);
  const qty = parseInt(row.find('.svc-qty').val()) || 0;
  const total = svc ? svc.price * qty : 0;
  row.find('.price-display').text('₦' + total.toLocaleString());
}

function addServiceRow() {
  const row = $(`
    <div class="calc-svc-row">
      <select class="svc-select">${buildOptions('')}</select>
      <input type="number" class="svc-qty" value="1" min="1" max="9999"/>
      <div class="price-display calc-svc-price">₦0</div>
      <button class="calc-svc-remove remove-btn" title="Remove">✕</button>
    </div>
  `);
  row.find('.svc-select, .svc-qty').on('change input', () => { triggerRowCalc(row); calcTotals(); });
  row.find('.remove-btn').on('click', () => { row.remove(); calcTotals(); });
  $('#servicesContainer').append(row);
  calcTotals();
}

function calcTotals() {
  let subtotal = 0, items = 0;
  $('#servicesContainer .calc-svc-row').each(function(){
    const name = $(this).find('.svc-select').val();
    const qty = parseInt($(this).find('.svc-qty').val()) || 0;
    const svc = SERVICES.find(s => s.name === name);
    const price = svc ? svc.price * qty : 0;
    $(this).find('.price-display').text('₦' + price.toLocaleString());
    subtotal += price; if (name && qty) items += qty;
  });
  const discount = parseFloat($('#discountAmt').val()) || 0;
  const deposit = parseFloat($('#depositPaid').val()) || 0;
  const balance = Math.max(0, subtotal - discount - deposit);
  $('#sumItems').text(items);
  $('#sumSubtotal').text('₦' + subtotal.toLocaleString());
  $('#sumDeduction').text(discount > 0 ? '−₦' + discount.toLocaleString() : '−₦0');
  $('#sumAdvancepaid').text(deposit > 0 ? '−₦' + deposit.toLocaleString() : '−₦0');
  $('#sumTotal').text('₦' + balance.toLocaleString());
}

function getNextReceiptNumber() {
  const orders = getOrders();
  if (!orders.length) return 'REC-001';
  // Find highest existing receipt number
  const nums = orders
    .map(o => o.receiptNumber)
    .filter(r => r && r.startsWith('REC-'))
    .map(r => parseInt(r.replace('REC-', '')) || 0);
  const next = nums.length ? Math.max(...nums) + 1 : orders.length + 1;
  return 'REC-' + String(next).padStart(3, '0');
}

function collectForm() {
  // Read from to-* IDs (panel-task-order.html) + toServiceRows
  const services = toServiceRows.filter(Boolean).filter(r => r.service).map(r => ({
    name: r.service, qty: r.qty || 1, unitPrice: r.price || 0,
    price: (r.price || 0) * (r.qty || 1)
  }));
  const subtotal  = services.reduce((a, s) => a + s.price, 0);
  const discount  = parseFloat((document.getElementById('to-deduction') || {}).value) || 0;
  const deposit   = parseFloat((document.getElementById('to-advance')   || {}).value) || 0;
  const taskIdVal = (document.getElementById('to-task-id') || {}).value || '';
  const recNo     = taskIdVal.length === 6 ? taskIdVal : toReceiptNum;
  return {
    id: Date.now(), receiptNumber: recNo, date: new Date().toISOString(),
    clientName:    ((document.getElementById('to-name')          || {}).value || '').trim(),
    clientPhone:   ((document.getElementById('to-phone')         || {}).value || '').trim(),
    orderDate:      (document.getElementById('to-order-date')    || {}).value || '',
    dueDate:        (document.getElementById('to-due-date')      || {}).value || '',
    notes:         ((document.getElementById('to-notes')         || {}).value || '').trim(),
    status:         toStatus || 'In Progress',
    staffId:        'admin',
    taskId:         taskIdVal,
    bankName:      ((document.getElementById('to-bank-name')     || {}).value || '').trim(),
    accountNumber: ((document.getElementById('to-bank-acct')     || {}).value || '').trim(),
    accountName:   ((document.getElementById('to-bank-name-acct')|| {}).value || '').trim(),
    services, subtotal, discount, deposit,
    balance: Math.max(0, subtotal - discount - deposit)
  };
}

// ── Calculator field helpers ──────────────────────────────────────────
function calcValidateClearField(el, errId) {
  if (el.value.trim()) {
    el.style.borderColor = '';
    el.style.boxShadow = '';
    var err = document.getElementById(errId);
    if (err) err.style.display = 'none';
  }
}

function updateTaskIdCounter() {
  var len = ($('#taskId').val()||'').length;
  $('#taskIdCounter').text(len + ' / 6');
  $('#taskIdCounter').css('color', len === 6 ? 'var(--green)' : 'var(--text-muted)');
}

function calcFlagField(id, errId) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--red)';
  el.style.boxShadow = '0 0 0 3px rgba(224,82,82,0.18)';
  var err = document.getElementById(errId);
  if (err) err.style.display = 'block';
}

function calcClearAllFlags() {
  ['clientName','taskId','orderDate','dueDate'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });
  ['clientName-err','taskId-err','orderDate-err','dueDate-err'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Clear services card flag
  var svcCard = document.querySelector('#servicesContainer')?.closest('.card');
  if (svcCard) { svcCard.style.borderColor = ''; svcCard.style.boxShadow = ''; }
  var svcErr = document.getElementById('services-err');
  if (svcErr) svcErr.style.display = 'none';
}

function calcValidateForm(data) {
  ['to-name','to-task-id','to-order-date','to-due-date'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });
  var ok = true;
  if (!data.clientName) {
    var n = document.getElementById('to-name');
    if (n) { n.style.borderColor = 'var(--red)'; n.style.boxShadow = '0 0 0 3px rgba(224,82,82,0.18)'; n.focus(); }
    ok = false;
  }
  if (!data.taskId || data.taskId.length !== 6 || !/^[A-Z0-9]{6}$/.test(data.taskId)) {
    var t = document.getElementById('to-task-id');
    if (t) { t.style.borderColor = 'var(--red)'; t.style.boxShadow = '0 0 0 3px rgba(224,82,82,0.18)'; }
    ok = false;
  }
  if (!data.orderDate) {
    var od = document.getElementById('to-order-date');
    if (od) { od.style.borderColor = 'var(--red)'; od.style.boxShadow = '0 0 0 3px rgba(224,82,82,0.18)'; }
    ok = false;
  }
  if (!data.dueDate) {
    var dd = document.getElementById('to-due-date');
    if (dd) { dd.style.borderColor = 'var(--red)'; dd.style.boxShadow = '0 0 0 3px rgba(224,82,82,0.18)'; }
    ok = false;
  }
  if (!data.services.length) {
    var sl = document.getElementById('to-services-list');
    if (sl) { sl.style.outline = '2px solid var(--red)'; sl.style.borderRadius = '8px'; }
    ok = false;
  } else {
    var sl2 = document.getElementById('to-services-list');
    if (sl2) sl2.style.outline = '';
  }
  if (!ok) showToast('⚠️ Please fill all required fields');
  return ok;
}

async function saveOrder() {
  const data = collectForm();
  if (!calcValidateForm(data)) return;
  // Phone validation
  const rawPhone = data.clientPhone.replace(/\D/g,'');
  if (rawPhone && rawPhone.length !== 11) {
    showToast('⚠️ Phone number must be exactly 11 digits'); var pf=document.getElementById('to-phone'); if(pf) pf.focus(); return;
  }
  // Account number validation
  const rawAcctEl = document.getElementById('to-bank-acct'); const rawAcct = (rawAcctEl ? rawAcctEl.value : '').replace(/\D/g,'');
  if (rawAcct && rawAcct.length !== 10) {
    showToast('⚠️ Account number must be exactly 10 digits'); var af=document.getElementById('to-bank-acct'); if(af) af.focus(); return;
  }

  // ── EDIT MODE: update existing order ──
  if (_editingOrderId) {
    await doUpdateOrder(_editingOrderId, data);
    return;
  }

  // ── LOAN SYNC: if deduction entered, sync loan AND save order ──
  if (data.discount > 0) {
    const hasActiveLoan = findActiveLoanMatches(data.clientName, data.clientPhone).length > 0;

    if (!hasActiveLoan) {
      // Warn but don't block — still save the order
      showToast('⚠️ No active loan found for ' + data.clientName + ' — deduction noted on order but loan not updated');
    } else {
      // Confirmation before deducting
      const confirmed = await showConfirm({
    title: 'Confirm Loan Deduction',
    body: 'Deduct <strong>₦' + data.discount.toLocaleString() + '</strong> from <strong>' + data.clientName + '</strong>\'s loan balance?<br/><br/><span style="color:rgba(240,234,214,0.5);font-size:12px;">This will update their loan record immediately.</span>',
    okText: 'Deduct', icon: '💰', danger: false
  });
      if (!confirmed) return;

      // Sync the loan deduction
      syncLoanDeduction(data.clientName, data.clientPhone, data.discount, data.id);
    }
  }

  // Always save order (with or without deduction)
  doSaveOrder(data);
}

// ── Update an existing order ──
async function doUpdateOrder(orderId, data) {
  const orders = getOrders();
  const idx = orders.findIndex(o => String(o.id) === String(orderId));
  if (idx < 0) { showToast('⚠️ Could not find original task'); return; }

  // Merge updated fields, keep original id/receipt/staffId
  const original = orders[idx];
  const updated = Object.assign({}, original, {
    clientName:    data.clientName,
    clientPhone:   data.clientPhone,
    taskId:        data.taskId,
    orderDate:     data.orderDate,
    dueDate:       data.dueDate,
    status:        data.status,
    services:      data.services,
    subtotal:      data.subtotal,
    discount:      data.discount,
    deposit:       data.deposit,
    balance:       data.balance,
    notes:         data.notes,
    bankName:      data.bankName,
    accountNumber: data.accountNumber,
    accountName:   data.accountName,
  });

  orders[idx] = updated;
  localStorage.setItem('incline_orders', JSON.stringify(orders));

  // Sync to Supabase
  const supaUpdate = {
    client_name:    updated.clientName,
    client_phone:   updated.clientPhone,
    task_id:        updated.taskId,
    order_date:     updated.orderDate,
    due_date:       updated.dueDate,
    status:         updated.status,
    services:       updated.services,
    subtotal:       updated.subtotal,
    discount:       updated.discount,
    deposit:        updated.deposit,
    balance:        updated.balance,
    notes:          updated.notes,
    bank_name:      updated.bankName,
    account_number: updated.accountNumber,
    account_name:   updated.accountName,
  };

  try {
    await _sbFetch('orders?id=eq.' + String(orderId), { method: 'PATCH', body: supaUpdate, prefer: 'return=minimal' });
    showToast('✅ Task updated successfully!');
  } catch(e) {
    console.error('Update sync failed:', e);
    showToast('✅ Task updated locally (sync pending)');
  }

  // Clean up edit mode — restore original SVG button
  _editingOrderId = null;
  $('#edit-mode-banner').remove();
  $('#saveOrderBtn')
    .html(`    <i class="fas fa-save icon" style="margin-right:6px;font-size:20px;"></i>`)
    .removeClass('btn-edit-mode')
    .css({ 'background': '', 'color': '', 'padding': '', 'border': '' });
  clearForm();
  renderOrdersTable();

  // Switch back to task list
  switchTab('orders');
  showToast('✅ Task updated!');
}

// ── Saves order to storage and refreshes table ──
function doSaveOrder(data) {
  const orders = getOrders();
  orders.unshift(data);
  localStorage.setItem('incline_orders', JSON.stringify(orders));
  renderOrdersTable();
  // Sync to Supabase
  const supaOrder = {
    staff_id: data.staffId || 'admin',
    staff_name: data.clientName,
    receipt_number: data.receiptNumber,
    client_name: data.clientName,
    client_phone: data.clientPhone,
    order_date: data.orderDate,
    due_date: data.dueDate,
    status: data.status,
    services: data.services,
    subtotal: data.subtotal,
    discount: data.discount,
    deposit: data.deposit,
    balance: data.balance,
    task_id: data.taskId,
    bank_name: data.bankName,
    account_number: data.accountNumber,
    account_name: data.accountName,
    notes: data.notes
  };
  sbSaveOrder(supaOrder)
    .then(() => { showToast('✅ Task saved for ' + data.clientName); setTimeout(toPrint, 400); })
    .catch(err => { console.error(err); showToast('✅ Task saved locally (sync pending)'); setTimeout(toPrint, 400); });
}

// ── Find active loan profiles matching a client ──
function findActiveLoanMatches(clientName, clientPhone) {
  const debts = getManualDebts();
  const nameLower = clientName.toLowerCase();
  return debts.filter(d => {
    if (d.balance <= 0) return false;
    const matchName  = nameLower && d.clientName.toLowerCase().includes(nameLower);
    const matchPhone = clientPhone && d.clientPhone === clientPhone;
    return matchName || matchPhone;
  });
}

// ── Apply deduction directly to matching loan profile(s) ──
function syncLoanDeduction(clientName, clientPhone, deductionAmount, orderId) {
  const debts = getManualDebts();
  const matches = findActiveLoanMatches(clientName, clientPhone);

  if (!matches.length) return;

  let remaining = deductionAmount;

  // Apply to each matching profile, oldest balance first
  matches.forEach(d => {
    if (remaining <= 0) return;
    const deduct = Math.min(remaining, d.balance);
    remaining -= deduct;

    // Find the actual debt object in the full array to mutate it
    const target = debts.find(x => x.id === d.id);
    target.payments = target.payments || [];
    target.payments.unshift({
      type: 'debit',
      amount: deduct,
      note: 'Loan deduction via Calculator — Order #' + orderId,
      date: new Date().toISOString()
    });
    target.balance -= deduct;
    if (target.balance <= 0) { target.balance = 0; target.status = 'Paid'; }
  });

  localStorage.setItem('incline_manual_debts', JSON.stringify(debts));
  updateAlumniBadge();

  const totalSynced = deductionAmount - remaining;
  const fullyPaid = debts.filter(d => matches.find(m => m.id === d.id)).some(d => d.balance <= 0);

  if (fullyPaid) {
    showToast('🎉 ₦' + totalSynced.toLocaleString() + ' deducted — loan fully settled! Check Paid Profiles.');
  } else {
    showToast('Deducted \u20a6' + totalSynced.toLocaleString() + ' from ' + clientName + ' loan profile successfully.');
  }
}

function getOrders() {
  try { return JSON.parse(localStorage.getItem('incline_orders')) || []; } catch { return []; }
}

async function refreshOrdersFromSupabase() {
  let _ordData, _ordErr;
  try { _ordData = await _sbFetch('orders?select=*&order=created_at.desc'); } catch(e) { _ordErr = e; }
  if (_ordErr || !_ordData) return;
  const data = _ordData;
  const normalized = data.map(o => ({
    id: o.id,
    clientName: o.client_name || o.staff_name || '',
    clientPhone: o.client_phone || '',
    receiptNumber: o.receipt_number || '',
    orderDate: o.order_date || '',
    dueDate: o.due_date || '',
    date: o.created_at,
    status: o.status || 'Pending',
    services: o.services || [],
    subtotal: o.subtotal || 0,
    discount: o.discount || 0,
    deposit: o.deposit || 0,
    balance: o.balance || 0,
    taskId: o.task_id || '',
    staffId: o.staff_id || '',
    bankName: o.bank_name || '',
    accountNumber: o.account_number || '',
    accountName: o.account_name || '',
    notes: o.notes || ''
  }));
  localStorage.setItem('incline_orders', JSON.stringify(normalized));
}

let _sosStaffName = null;
let _sosAllOrders = [];

// Fallback: render ALL orders with no staff-name filter (recovery mode)
function renderOrdersTableUnfiltered() {
  const orders = getOrders();
  if (!orders.length) return;
  const staffProfiles = getStaffProfiles();
  const groups = {};
  orders.forEach(o => {
    const raw = (o.clientName || 'Unknown').trim();
    // Resolve to the canonical (capitalised) name from staff profiles if possible
    const profile = staffProfiles.find(s => (s.name||'').toLowerCase().trim() === raw.toLowerCase().trim());
    const name = profile ? profile.name : raw;
    if (!groups[name]) groups[name] = [];
    groups[name].push(o);
  });
  const sortedNames = Object.keys(groups).sort((a,b) => groups[b].length - groups[a].length);
  let html = `<div class="staff-cards-grid">`;
  sortedNames.forEach(name => {
    const staffOrders = groups[name];
    const profile = staffProfiles.find(s => (s.name||'').toLowerCase().trim() === name.toLowerCase().trim());
    const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const _rp = profile ? (getStaffPhoto(profile.id) || null) : null;
    const avatarContent = _rp
      ? `<img src="${_rp}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
      : initials;
    const totalRevenue = staffOrders.reduce((s,o) => s+(o.subtotal||0), 0);
    const totalBalance = staffOrders.reduce((s,o) => s+(o.balance||0), 0);
    const pending = staffOrders.filter(o => o.status==='Pending'||o.status==='In Progress').length;
    html += `
      <div class="staff-id-card" onclick="openStaffOrdersScreen('${name.replace(/'/g,"\'")}')">
        <div class="staff-card-name-label">INCLINEWORKS INT'L</div>
        <div class="staff-card-avatar-wrap"><div class="staff-card-avatar">${avatarContent}</div></div>
        <div class="staff-card-name-label">STAFF</div>
        <div class="staff-card-name-banner">${name}</div>
        ${profile && profile.position ? `<div class="staff-card-row"><span>Position</span><span>${profile.position}</span></div>` : ''}
        ${profile && profile.staffId  ? `<div class="staff-card-row"><span>ID</span><span>${profile.staffId}</span></div>` : ''}
        ${totalBalance > 0 ? `<div class="staff-card-row"><span>Outstanding</span><span style="color:var(--red);">&#8358;${totalBalance.toLocaleString()}</span></div>` : '<div class="staff-card-row"><span>Balance</span><span style="color:var(--green);">All Paid</span></div>'}
        ${pending > 0 ? `<div class="staff-card-row"><span>Active Jobs</span><span style="color:#60a5fa;">${pending}</span></div>` : ''}
        <div class="staff-card-stats">
          <div class="staff-card-stat"><div class="staff-card-stat-val">${staffOrders.length}</div><div class="staff-card-stat-lbl">Task</div></div>
          <div class="staff-card-stat"><div class="staff-card-stat-val" style="font-size:13px;">&#8358;${totalRevenue.toLocaleString()}</div><div class="staff-card-stat-lbl">Revenue</div></div>
        </div>
      </div>`;
  });
  html += `</div>`;
  $('#ordersTable').html(html);
}

function renderOrdersTable() {
  const orders = getOrders();
  const search = $('#filterSearch').val().toLowerCase();
  const sf     = $('#filterStatus').val();

  // Group ALL orders by clientName — show every order regardless of staff match
  const activeStaff = getStaffProfiles();
  const groups = {};
  orders.forEach(o => {
    const raw = (o.clientName || 'Unknown').trim();
    // Try to resolve to canonical staff name (for consistent display)
    const profile = activeStaff.find(s =>
      (s.name||'').toLowerCase().trim() === raw.toLowerCase().trim() ||
      (o.staffId && s.staffId === o.staffId)
    );
    const name = profile ? profile.name : raw;
    if (search && !name.toLowerCase().includes(search) && !(o.clientPhone||'').includes(search)) return;
    if (!groups[name]) groups[name] = [];
    if (!sf || o.status === sf) groups[name].push(o);
  });

  // remove empty groups after status filter
  Object.keys(groups).forEach(k => { if (!groups[k].length) delete groups[k]; });

  if (!Object.keys(groups).length) {
    $('#ordersTable').html('<div class="empty-state"><div class="icon">🧵</div><p>No task found</p></div>');
    return;
  }

  const staffProfiles = getStaffProfiles();
  const sortedNames = Object.keys(groups).sort((a,b) => groups[b].length - groups[a].length);

  let html = `<div class="staff-cards-grid">`;
  sortedNames.forEach(name => {
    const staffOrders = groups[name];
    const profile     = staffProfiles.find(s => s.name.toLowerCase() === name.toLowerCase());
    const initials    = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const _rp = profile ? (getStaffPhoto(profile.id) || profile.photo) : null;
    const avatarContent = _rp
      ? `<img src="${_rp}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
      : `<span style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#34D399;">${initials}</span>`;

    const totalRevenue  = staffOrders.reduce((s,o) => s + (o.subtotal||0), 0);
    const totalBalance  = staffOrders.reduce((s,o) => s + (o.balance||0), 0);
    const pending       = staffOrders.filter(o => o.status==='Pending'||o.status==='In Progress').length;
    const delivered     = staffOrders.filter(o => o.status==='Delivered').length;
    const deliveredPct  = staffOrders.length ? Math.round(delivered/staffOrders.length*100) : 0;
    const hasBalance    = totalBalance > 0;
    const accentColor   = hasBalance ? '#ff4f6b' : '#0eca8e';
    const islandDot     = pending > 0 ? '#10B981' : '#0eca8e';

    html += `
      <div class="di-task-card" onclick="openStaffOrdersScreen('${name.replace(/'/g,"\\'")}')">
        <!-- Dynamic Island top notch -->
        <div class="di-notch">
          <div class="di-notch-inner">
            <div class="di-notch-dot" style="background:${islandDot};box-shadow:0 0 6px ${islandDot};"></div>
            <span class="di-notch-label">INCLINEWORKS INT'L</span>
            <div class="di-notch-dot" style="background:${islandDot};box-shadow:0 0 6px ${islandDot};"></div>
          </div>
        </div>

        <!-- Avatar hero section -->
        <div class="di-avatar-section">
          <div class="di-avatar-ring" style="border-color:${accentColor}40;">
            <div class="di-avatar-inner" style="border-color:${accentColor};">
              ${avatarContent}
            </div>
          </div>
          ${pending > 0 ? `<div class="di-live-badge"><span class="di-live-pulse"></span>ACTIVE</div>` : ''}
        </div>

        <!-- Name & meta -->
        <div class="di-card-body">
          <div class="di-name">${name}</div>
          ${profile && profile.position ? `<div class="di-position">${profile.position}</div>` : ''}
          ${profile && profile.staffId ? `<div class="di-staff-id">${profile.staffId}</div>` : ''}
        </div>

        <!-- Stats row — Dynamic Island style pills -->
        <div class="di-stats-row">
          <div class="di-stat-pill">
            <div class="di-stat-num">${staffOrders.length}</div>
            <div class="di-stat-lbl">Tasks</div>
          </div>
          <div class="di-stat-divider"></div>
          <div class="di-stat-pill">
            <div class="di-stat-num" style="font-size:12px;">&#8358;${totalRevenue >= 1000000 ? (totalRevenue/1000000).toFixed(1)+'M' : totalRevenue >= 1000 ? (totalRevenue/1000).toFixed(0)+'K' : totalRevenue.toLocaleString()}</div>
            <div class="di-stat-lbl">Revenue</div>
          </div>
          <div class="di-stat-divider"></div>
          <div class="di-stat-pill">
            <div class="di-stat-num" style="color:${pending>0?'#10B981':'#0eca8e'}">${pending}</div>
            <div class="di-stat-lbl">Pending</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="di-progress-bar">
          <div class="di-progress-fill" style="width:${deliveredPct}%;background:linear-gradient(90deg,#059669,#34D399);"></div>
        </div>
        <div class="di-progress-meta">
          <span>${deliveredPct}% delivered</span>
          ${hasBalance ? `<span style="color:#ff4f6b;">&#8358;${totalBalance.toLocaleString()} due</span>` : `<span style="color:#0eca8e;">&#10003; All paid</span>`}
        </div>

        <!-- Bottom glow accent -->
        <div class="di-bottom-glow" style="background:radial-gradient(ellipse at 50% 100%, ${accentColor}20, transparent 70%);"></div>
      </div>`;
  });

  html += `</div>`;
  $('#ordersTable').html(html);
}


function openStaffOrdersScreen(name) {
  _sosStaffName = name;
  const allOrders = getOrders();
  const staffProfiles = getStaffProfiles();
  const profile = staffProfiles.find(s => s.name.toLowerCase() === name.toLowerCase());
  const _fn = name.toLowerCase().trim();
  _sosAllOrders = allOrders.filter(o => {
    if (profile && o.staffId && o.staffId === profile.staffId) return true;
    const _on = (o.clientName || '').toLowerCase().trim();
    return _on === _fn || _on.includes(_fn) || _fn.includes(_on);
  }).sort((a,b) => new Date(b.date||b.orderDate||0) - new Date(a.date||a.orderDate||0));
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  // Set avatar
  const av = document.getElementById('sos-avatar');
  const _sp2 = profile ? (getStaffPhoto(profile.id) || profile.photo) : null;
  if (_sp2) {
    av.innerHTML = `<img src="${_sp2}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
  } else {
    av.textContent = initials;
  }

  document.getElementById('sos-name').textContent = name;
  document.getElementById('sos-meta').textContent = profile
    ? [profile.position, profile.staffId, profile.phone].filter(Boolean).join(' · ')
    : '';

  const totalRevenue = _sosAllOrders.reduce((s,o) => s+(o.subtotal||0), 0);
  const totalBalance = _sosAllOrders.reduce((s,o) => s+(o.balance||0), 0);
  document.getElementById('sos-count').textContent   = _sosAllOrders.length;
  document.getElementById('sos-revenue').innerHTML   = '&#8358;' + (totalRevenue.toLocaleString());
  document.getElementById('sos-balance').innerHTML   = '&#8358;' + totalBalance.toLocaleString();

  document.getElementById('sosSearch').value  = '';
  document.getElementById('sosStatus').value  = '';
  renderStaffOrdersList();

  $('#order-list-screen').hide();
  $('#staff-orders-screen').show();
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function closeStaffOrdersScreen() {
  $('#staff-orders-screen').hide();
  $('#order-list-screen').show();
  _sosStaffName = null;
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function renderStaffOrdersList() {
  const search = document.getElementById('sosSearch').value.toLowerCase();
  const status = document.getElementById('sosStatus').value;
  const bmap = {'Pending':'badge-pending','In Progress':'badge-pending','Ready':'badge-ready','Delivered':'badge-delivered','Cancelled':'badge-cancelled'};

  const filtered = _sosAllOrders.filter(o =>
    (!search || (o.receiptNumber||'').toLowerCase().includes(search) || (o.taskId||'').toLowerCase().includes(search)) &&
    (!status || o.status === status)
  );

  if (!filtered.length) {
    document.getElementById('sosOrdersTable').innerHTML = '<div class="empty-state"><div class="icon">🧵</div><p>No task found</p></div>';
    return;
  }

  let html = `<table><thead><tr>
    <th>Receipt</th><th>Date</th><th>Task ID</th><th>Due Date</th>
    <th>Subtotal</th><th>Balance</th><th>Actions</th>
  </tr></thead><tbody>`;

  filtered.forEach(o => {
    const isPaid   = o.balance <= 0;
    const balColor = isPaid ? 'var(--green)' : 'var(--red)';
    const dateStr  = o.orderDate || (o.date ? new Date(o.date).toLocaleDateString('en-GB') : '—');
    html += `<tr>
      <td style="font-weight:600;color:#ffffff;font-size:12px;">${o.receiptNumber||'—'}</td>
      <td style="font-size:12px;color:var(--text-muted);">${dateStr}</td>
      <td style="font-size:12px;color:var(--text-muted);">${o.taskId||'—'}</td>
      <td style="font-size:12px;">${o.dueDate||'—'}</td>
      <td style="font-size:13px;">&#8358;${(o.subtotal||0).toLocaleString()}</td>
      <td style="font-weight:700;font-size:13px;color:${balColor};">&#8358;${(o.balance||0).toLocaleString()}</td>
      <td><div class="tbl-actions">
        <button class="tbl-btn" onclick="closeStaffOrdersScreen();viewOrder('${o.id}')">&#128065; View</button>
        <button class="tbl-btn" onclick="reprintReceipt('${o.id}')">&#128190; Receipt</button>
        <button class="tbl-btn danger" onclick="deleteOrder('${o.id}');renderStaffOrdersList();">&#128465;</button>
      </div></td>
    </tr>`;
  });

  document.getElementById('sosOrdersTable').innerHTML = html + '</tbody></table>';
}

// ════════════════════════════════════════════════════════════════ //
// STAFF TRANSACTION HISTORY PDF — Edited: Slate & Navy Edition
// ════════════════════════════════════════════════════════════════ //
function printStaffTransactionHistory() {
    if (!_sosStaffName || !_sosAllOrders) {
        showToast('⚠️ No staff selected');
        return;
    }
    if (typeof window.jspdf === 'undefined') {
        showToast('⚠️ PDF library not loaded');
        return;
    }

    showToast('⏳ Generating transaction history PDF…');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    // COLOR PALETTE
    const NAVY = [15, 23, 42];
    const SLATE = [148, 163, 184];
    const TEXT_DARK = [30, 41, 59];

    var W = doc.internal.pageSize.getWidth();
    var H = doc.internal.pageSize.getHeight();
    var ML = 14, MR = 14;
    var CW = W - ML - MR;
    var HEADER_H = 46;

    var COL = { 
        num: ML, receipt: ML + 8, date: ML + 55, 
        taskId: ML + 78, due: ML + 105,
        sub: W - MR - 23, bal: W - MR 
    };

    function drawFrame() {
        if (INCLINE_LETTERHEAD_B64) {
            doc.addImage(INCLINE_LETTERHEAD_B64, 'JPEG', 0, 0, W, HEADER_H);
        }
    }

    function drawTblHeader(yy) {
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.rect(ML - 3, yy, CW + 6, 8, 'F');
        // Clean Slate line instead of Gold
        doc.setFillColor(SLATE[0], SLATE[1], SLATE[2]);
        doc.rect(ML - 3, yy + 7.5, CW + 6, 0.5, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(255, 255, 255); // White text on Navy
        doc.text('#', COL.num, yy + 5.3);
        doc.text('JOB DESC', COL.receipt, yy + 5.3);
        doc.text('DATE', COL.date, yy + 5.3);
        doc.text('TASK ID', COL.taskId, yy + 5.3);
        doc.text('DUE DATE', COL.due, yy + 5.3);
        doc.text('SUBTOTAL', COL.sub, yy + 5.3, { align: 'right' });
        doc.text('BALANCE', COL.bal, yy + 5.3, { align: 'right' });
        return yy + 8;
    }

    function newPage() {
        _salaryPDFFooter(doc, ML, W, H, null);
        doc.addPage();
        drawFrame();
        const contY = HEADER_H + 2;
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.rect(ML - 3, contY, CW + 6, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]); // Slate text for "Continued"
        doc.text('Continued — ' + _sosStaffName, ML, contY + 4.2);
        return drawTblHeader(contY + 8);
    }

    drawFrame();
    
    // Header Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(_sosStaffName, ML, HEADER_H + 15);
    
    const staffProfile = getStaffProfiles().find(s => s.name === _sosStaffName);
    const staffId = staffProfile ? staffProfile.staffId : '—';
    const staffDept = staffProfile ? staffProfile.dept : '—';
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('ID: ' + staffId + ' | Dept: ' + staffDept, ML, HEADER_H + 20);
    doc.text('Printed: ' + new Date().toLocaleDateString('en-GB'), ML, HEADER_H + 25);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text('TRANSACTION HISTORY REPORT', W - MR, HEADER_H + 15, { align: 'right' });

    var y = HEADER_H + 35;
    const revenue = _sosAllOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
    const outstanding = _sosAllOrders.reduce((s, o) => s + (o.balance || 0), 0);

    const summaryItems = [
        { lbl: 'TOTAL TASKS', val: String(_sosAllOrders.length) },
        { lbl: 'TOTAL REVENUE', val: 'NGN ' + revenue.toLocaleString() },
        { lbl: 'OUTSTANDING', val: 'NGN ' + outstanding.toLocaleString() }
    ];

    const sw = CW / 3;
    summaryItems.forEach(function(s, i) {
        const sx = ML + i * sw;
        doc.setDrawColor(SLATE[0], SLATE[1], SLATE[2]);
        doc.setLineWidth(0.15);
        doc.rect(sx, y, sw, 16, 'S'); // Outline only
        
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.circle(sx + 5, y + 5, 2.8, 'FD');
        doc.setDrawColor(SLATE[0], SLATE[1], SLATE[2]);
        doc.setLineWidth(0.3);
        doc.circle(sx + 5, y + 5, 2.8, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(255, 255, 255);
        doc.text(String(i + 1), sx + 5, y + 5.9, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text(s.val, sx + sw / 2, y + 10, { align: 'center' });
        
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139); // Slate-muted for labels
        doc.text(s.lbl, sx + sw / 2, y + 14, { align: 'center' });
    });

    y += 22;
    y = drawTblHeader(y);

    const orders = _sosAllOrders.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    orders.forEach(function(o, i) {
        const rowH = 8.5;
        if (y + rowH > H - 26) y = newPage();
        
        doc.setFillColor(i % 2 === 0 ? 252 : 255, i % 2 === 0 ? 252 : 255, i % 2 === 0 ? 252 : 255);
        doc.rect(ML - 3, y, CW + 6, rowH, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
        const desc = (o.services || []).map(s => s.name).join(', ').substring(0, 35);
        doc.text(String(i + 1), COL.num, y + 5.5);
        doc.text(desc, COL.receipt, y + 5.5);
        doc.text(o.date ? o.date.slice(0, 10) : '—', COL.date, y + 5.5);
        doc.text(o.taskId || '—', COL.taskId, y + 5.5);
        doc.text(o.dueDate || '—', COL.due, y + 5.5);
        doc.text((o.subtotal || 0).toLocaleString(), COL.sub, y + 5.5, { align: 'right' });
        doc.text((o.balance || 0).toLocaleString(), COL.bal, y + 5.5, { align: 'right' });
        y += rowH;
    });

    // Signatures
    const ySign = H - 35;
    doc.setDrawColor(SLATE[0], SLATE[1], SLATE[2]);
    doc.line(ML, ySign + 16, ML + 58, ySign + 16);
    doc.line(W - MR - 58, ySign + 16, W - MR, ySign + 16);
    
    doc.setFontSize(6.5);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text('Authorised Signatory', ML, ySign + 20);
    doc.text('Staff Acknowledgement', W - MR - 58, ySign + 20);

    var fname = 'TxHistory_' + _sosStaffName.replace(/\s+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    var blob = doc.output('blob');
    _showTxnPdfActionModal(blob, fname, _sosStaffName);
  }

// ── Transaction History PDF Action Modal ─────────────────────────────────────
var _txnPdfPending = null; // { blob, fname, staffName }

function _showTxnPdfActionModal(blob, fname, staffName) {
  _txnPdfPending = { blob: blob, fname: fname, staffName: staffName };
  var modal = document.getElementById('txnPdfActionModal');
  if (modal) modal.style.display = 'flex';
}

function _closeTxnPdfActionModal() {
  var modal = document.getElementById('txnPdfActionModal');
  if (modal) modal.style.display = 'none';
  _txnPdfPending = null;
}

function _txnPdfAction(action) {
  var modal = document.getElementById('txnPdfActionModal');
  if (modal) modal.style.display = 'none';
  if (!_txnPdfPending) return;
  var blob = _txnPdfPending.blob;
  var fname = _txnPdfPending.fname;
  var staffName = _txnPdfPending.staffName;
  _txnPdfPending = null;

  if (action === 'whatsapp') {
    _shareWhatsApp(blob, fname, 'Transaction History — ' + staffName, null);
  } else {
    _txnPdfDownload(blob, fname);
  }
}

function _txnPdfDownload(blob, fname) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = fname; a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
  showToast('📥 Transaction history saved!');
}

// ═══════════════════════════════════════════════════════════
// UNIVERSAL WHATSAPP PDF SHARE
// Mobile  → navigator.share (file attachment, opens share sheet)
// Desktop → download file + open WhatsApp Web with message
// ═══════════════════════════════════════════════════════════
function _shareWhatsApp(blob, fname, title, phone) {
  var file = new File([blob], fname, { type: 'application/pdf' });

  // Try native file share first (works on Android & iOS with WhatsApp installed)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ title: title, text: title, files: [file] })
      .then(function() { showToast('✅ Shared via WhatsApp!'); })
      .catch(function(err) {
        if (err.name === 'AbortError') return; // user cancelled — do nothing
        // Fallback: download + open WhatsApp
        _waFallback(blob, fname, title, phone);
      });
    return;
  }

  // Desktop or unsupported — download the file then open WhatsApp Web
  _waFallback(blob, fname, title, phone);
}

function _waFallback(blob, fname, title, phone) {
  // Desktop / unsupported: open WhatsApp Web with a message only.
  // Do NOT auto-download — the user must click "Download PDF" separately.
  var msg = title + ' — Please download the PDF from the app, then attach it to this message.';
  var waBase = phone
    ? 'https://wa.me/' + phone.replace(/[^0-9]/g, '')
    : 'https://web.whatsapp.com/';
  window.open(waBase + '?text=' + encodeURIComponent(msg), '_blank');
  showToast('📤 Opening WhatsApp… use Download PDF to get the file.');
}

// ══════════════════════════════════════════════════════════
// LOAN PDF ACTION MODAL (WhatsApp / Download / Cancel)
// ══════════════════════════════════════════════════════════
var _loanPdfPending = null;

function _showLoanPdfActionModal(blob, fname, clientName, clientPhone) {
  _loanPdfPending = { blob: blob, fname: fname, clientName: clientName, clientPhone: clientPhone };
  var modal = document.getElementById('loanPdfActionModal');
  if (modal) modal.style.display = 'flex';
}

function _loanPdfAction(action) {
  var modal = document.getElementById('loanPdfActionModal');
  if (modal) modal.style.display = 'none';
  if (!_loanPdfPending) return;
  var blob = _loanPdfPending.blob;
  var fname = _loanPdfPending.fname;
  var clientName = _loanPdfPending.clientName;
  var clientPhone = _loanPdfPending.clientPhone;
  _loanPdfPending = null;

  if (action === 'whatsapp') {
    var phone = (clientPhone || '').replace(/\D/g, '');
    var waPhone = phone.length >= 10 ? '234' + phone.slice(-10) : null;
    _shareWhatsApp(blob, fname, 'Loan Statement — ' + clientName, waPhone);
  } else {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fname; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
    showToast('PDF saved to Downloads!');
  }
}


// ── Task profile view state ──
let _opId = null;

function viewOrder(id) {
  // Find actual order to get its real id
  const order = getOrders().find(o => String(o.id) === String(id));
  if (!order) return;
  _opId = order.id;
  renderOrderProfile(order.id);
  $('#order-list-screen').hide();
  $('#order-profile-screen').show();
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function closeOrderProfile() {
  $('#order-profile-screen').hide();
  $('#order-list-screen').show();
  _opId = null;
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function renderOrderProfile(id) {
  const o = getOrders().find(o => String(o.id) === String(id));
  if (!o) { closeOrderProfile(); return; }

  const isPaid = o.balance <= 0;
  const statusColors = { 'Pending':'#60a5fa','In Progress':'#60a5fa','Ready':'var(--green)','Delivered':'var(--text-muted)','Cancelled':'var(--red)' };
  const sc = statusColors[o.status] || 'var(--text-muted)';

  // Payment badge
  if (isPaid) {
    $('#op-pay-badge').text('PAID').css({ background:'rgba(16,185,129,0.15)', color:'#34D399', border:'1px solid rgba(16,185,129,0.3)' });
  } else {
    $('#op-pay-badge').text('OUTSTANDING').css({ background:'rgba(224,82,82,0.15)', color:'#f87171', border:'1px solid rgba(224,82,82,0.3)' });
  }

  // Status badge
  $('#op-status-badge').text(o.status).css({ background:'rgba(255,255,255,0.06)', color: sc, border:`1px solid ${sc}` });

  // Hero fields
  $('#op-name').text(o.clientName);
  $('#op-phone').text(o.clientPhone ? '📞  ' + o.clientPhone : 'No phone on record');
  $('#op-balance').text('₦' + o.balance.toLocaleString());
  $('#op-subtotal').text('₦' + o.subtotal.toLocaleString());
  $('#op-deposit').text('₦' + (o.deposit||0).toLocaleString());
  $('#op-deduction').text('₦' + (o.discount||0).toLocaleString());
  $('#op-order-date').text(o.orderDate || '—');

  const overdue = o.dueDate && new Date(o.dueDate) < new Date() && !isPaid;
  $('#op-due-date').html(o.dueDate
    ? (overdue ? `<span style="color:#f87171;">${o.dueDate} ⚠</span>` : o.dueDate)
    : '—');
  $('#op-task-id').text(o.taskId || '—');

  // Services list
  const svcsHtml = (o.services||[]).map((s, i) => {
    const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent';
    return `<div style="display:grid;grid-template-columns:1fr 80px 100px 110px;align-items:center;padding:12px 24px;background:${rowBg};border-bottom:1px solid rgba(255,255,255,0.04);">
      <div style="font-size:13px;color:var(--text);">${s.name}</div>
      <div style="text-align:center;font-size:13px;color:var(--text-muted);">× ${s.qty}</div>
      <div style="text-align:right;font-size:13px;color:var(--text-muted);">₦${(s.unitPrice||0).toLocaleString()}</div>
      <div style="text-align:right;font-size:13px;font-weight:600;color:var(--gold);">₦${s.price.toLocaleString()}</div>
    </div>`;
  }).join('');
  $('#op-services-list').html(svcsHtml);
  $('#op-item-count').text((o.services||[]).reduce((a,s)=>a+s.qty,0) + ' item(s)');

  // Totals block
  const deductRow = o.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--surface3);"><span style="color:var(--text-muted);">Deduction</span><span style="color:#f87171;">−₦${o.discount.toLocaleString()}</span></div>` : '';
  const depositRow = o.deposit > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--surface3);"><span style="color:var(--text-muted);">Advance Paid</span><span style="color:var(--green);">₦${o.deposit.toLocaleString()}</span></div>` : '';
  $('#op-totals').html(`
    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--surface3);"><span style="color:var(--text-muted);">Subtotal</span><span>₦${o.subtotal.toLocaleString()}</span></div>
    ${deductRow}${depositRow}
    <div style="display:flex;justify-content:space-between;padding:10px 0 2px;font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;"><span style="color:var(--text-muted);">Balance</span><span style="color:var(--gold);">₦${o.balance.toLocaleString()}</span></div>
  `);

  // Notes card
  let notesHtml = '';
  if (o.notes) notesHtml += `<div style="margin-bottom:12px;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px;">Notes</div><div style="font-size:13px;color:var(--text);white-space:pre-wrap;">${o.notes}</div></div>`;
  const receiptNo = o.receiptNumber || ('#' + o.id);
  notesHtml += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
    <div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px;">Receipt No.</div><div style="font-size:13px;color:var(--gold);font-weight:600;">${receiptNo}</div></div>
    <div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px;">Staff ID</div><div style="font-size:13px;color:var(--text);">${o.staffId||'—'}</div></div>
  </div>`;
  if (!notesHtml.trim()) notesHtml = '<div style="color:var(--text-muted);font-size:13px;">No additional notes.</div>';
  $('#op-notes-card').html(notesHtml);
}

function opReprint() {
  if (_opId) reprintReceipt(_opId);
}

function opRecordPayment() {
  const o = getOrders().find(o => o.id === _opId);
  if (!o) return;
  if (o.balance <= 0) { showToast('✅ This order is already fully paid.'); return; }
  openPaymentModal('order', o.id, o.clientName, o.balance);
}

function opDelete() {
  if (_opId) deleteOrder(_opId);
}

// ── Edit & Resend to Calculator ──
let _editingOrderId = null;

function opEditResend() {
  const o = getOrders().find(o => String(o.id) === String(_opId));
  if (!o) return;
  _editingOrderId = o.id;

  // Switch to calculator tab first
  switchTab('task-order');
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;

  // ── Fill every field ──
  var _sf=function(id,v){var el=document.getElementById(id);if(el)el.value=v;};
  _sf('to-name',o.clientName||'');
  _sf('to-phone',o.clientPhone||'');
  _sf('to-task-id',o.taskId||'');
  _sf('to-order-date',o.orderDate||'');
  _sf('to-due-date',o.dueDate||'');
  _sf('to-notes',o.notes||'');
  _sf('to-deduction',o.discount>0?o.discount:'');
  _sf('to-advance',o.deposit>0?o.deposit:'');
  _sf('to-bank-name',o.bankName||'');
  _sf('to-bank-acct',o.accountNumber||'');
  _sf('to-bank-name-acct',o.accountName||'');

  // Staff ID counter display
  if (typeof updateTaskIdCounter === 'function') updateTaskIdCounter();

  // ── Status ──
  orderStatus = o.status || 'Pending';
  $('.status-btn').removeClass('active');
  $(`.status-btn[data-status="${orderStatus}"]`).addClass('active');
  if (!$(`.status-btn[data-status="${orderStatus}"]`).length) {
    // fallback — match by text
    $('.status-btn').each(function() {
      if ($(this).text().trim() === orderStatus) $(this).addClass('active');
    });
  }

  // ── Services — rebuild rows with pre-selected values ──
  $('#servicesContainer').empty();
  const svcs = o.services || [];
  if (svcs.length) {
    svcs.forEach(function(sv) {
      const row = $(`
        <div class="calc-svc-row">
          <select class="svc-select">${buildOptions(sv.name)}</select>
          <input type="number" class="svc-qty" value="${sv.qty || 1}" min="1" max="9999"/>
          <div class="price-display calc-svc-price">₦0</div>
          <button class="calc-svc-remove remove-btn" title="Remove">✕</button>
        </div>
      `);
      row.find('.svc-select, .svc-qty').on('change input', () => { triggerRowCalc(row); calcTotals(); });
      row.find('.remove-btn').on('click', () => { row.remove(); calcTotals(); });
      $('#servicesContainer').append(row);
      triggerRowCalc(row);
    });
  } else {
    addServiceRow();
  }
  calcTotals();

  // ── Edit mode banner ──
  $('#edit-mode-banner').remove();
  $('#tab-calculator').prepend(`
    <div id="edit-mode-banner" style="
      background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.25);
      border-radius:12px;padding:12px 18px;margin-bottom:16px;
      display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">✏️</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:#60a5fa;">Editing Existing Task</div>
          <div style="font-size:11px;color:var(--text-muted);">Receipt: <strong style="color:rgba(240,234,214,0.6);">${o.receiptNumber || '#'+o.id}</strong> · Saving will update the original record</div>
        </div>
      </div>
      <button onclick="cancelEditOrder()" style="background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);color:var(--red);padding:6px 14px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;">✕ Cancel Edit</button>
    </div>`);

  // ── Change save button to edit mode ──
  $('#saveOrderBtn')
    .html('<span style="font-size:13px;font-weight:700;letter-spacing:0.3px;">✏️ Update Task</span>')
    .addClass('btn-edit-mode')
    .css({ 'background': 'linear-gradient(135deg,#3b82f6,#60a5fa)', 'color': '#fff', 'padding':'8px 14px', 'border':'none' });

  showToast('✏️ Task loaded — make your changes and click Update Task');
}

function cancelEditOrder() {
  _editingOrderId = null;
  $('#edit-mode-banner').remove();
  // Restore save button to original SVG icon state
  $('#saveOrderBtn')
    .html(`    <i class="fas fa-save icon" style="margin-right:6px;font-size:20px;"></i>`)
    .removeClass('btn-edit-mode')
    .css({ 'background': '', 'color': '', 'padding': '', 'border': '' });
  showToast('Edit cancelled');
}


function opShareWhatsApp() {
  const o = getOrders().find(o => String(o.id) === String(_opId));
  if (!o) return;

  if (typeof html2canvas === 'undefined') {
    showToast('⚠️ Image library still loading, try again in a moment.');
    return;
  }

  showToast('📸 Generating receipt image…');

  // Populate the thermal receipt with this order's data
  $('#receipt-date').text(o.orderDate || new Date().toLocaleDateString());
  $('#receipt-staff').text(o.staffId || 'N/A');
  $('#receipt-task-id').text(o.taskId || '—');
  $('#receipt-number').text(o.receiptNumber || o.id);
  $('#receipt-customer-name').text(o.clientName);
  $('#receipt-customer-phone').text(o.clientPhone || '—');
  $('#receipt-due-date').text(o.dueDate || '—');

  let itemsHtml = '';
  (o.services || []).forEach(function(s) {
    itemsHtml += '<div class="thermal-item"><div class="thermal-item-name">' + s.name + '</div><div class="thermal-item-line"><span>' + s.qty + ' \xd7 \u20a6' + (s.unitPrice||0).toLocaleString() + '</span><span>\u20a6' + s.price.toLocaleString() + '</span></div></div>';
  });
  $('#receipt-items-list').html(itemsHtml);
  $('#receipt-item-count').text((o.services||[]).reduce(function(a,s){return a+s.qty;},0));
  $('#receipt-subtotal').text('\u20a6' + o.subtotal.toLocaleString());

  if (o.discount > 0) { $('#receipt-discount-row').show(); $('#receipt-discount').text('\u2212\u20a6' + o.discount.toLocaleString()); }
  else { $('#receipt-discount-row').hide(); }
  if (o.deposit > 0) { $('#receipt-advance-row').show(); $('#receipt-advance').text('\u20a6' + o.deposit.toLocaleString()); }
  else { $('#receipt-advance-row').hide(); }

  $('#receipt-total').text('\u20a6' + Math.max(0, o.subtotal - o.discount - o.deposit).toLocaleString());
  $('#receipt-balance').text('\u20a6' + o.balance.toLocaleString());
  $('#receipt-bank-name').text(o.bankName || 'Not provided');
  $('#receipt-account-number').text(o.accountNumber || 'XXXXXXXXXX');
  $('#receipt-account-name').text(o.accountName || 'Not provided');

  // Briefly make receipt visible off-screen for capture
  var receiptEl = document.getElementById('thermalReceipt');
  if (!receiptEl) { showToast('⚠️ Receipt element not found. Try reprinting instead.'); return; }
  receiptEl.style.visibility = 'visible';

  // Hide images that cause cross-origin taint errors on local/hosted files
  var imgs = receiptEl.querySelectorAll('img');
  var imgData = [];
  imgs.forEach(function(img) {
    imgData.push({ el: img, src: img.src, display: img.style.display });
    img.style.display = 'none';
  });

  setTimeout(function() {
    html2canvas(receiptEl.querySelector('.thermal-receipt'), {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    }).then(function(canvas) {
      receiptEl.style.visibility = 'hidden';
      // Restore images
      imgData.forEach(function(d) { d.el.style.display = d.display; });

      canvas.toBlob(function(blob) {
        var fileName = 'receipt-' + (o.receiptNumber || o.id) + '.png';
        var file = new File([blob], fileName, { type: 'image/png' });
        var balance = o.balance > 0 ? '\u20a6' + o.balance.toLocaleString() + ' outstanding' : 'Fully paid \u2705';
        var msgText = '\ud83e\uddf5 *INCLINE CAL \u2014 Receipt*\n\ud83d\udccb ' + (o.receiptNumber || ('#'+o.id)) + ' \u00b7 ' + o.clientName + '\n\ud83d\udcb0 ' + balance;

        // Try native share with file (works on mobile)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ title: 'Receipt - ' + o.clientName, text: msgText, files: [file] })
            .then(function() { showToast('\u2705 Receipt shared!'); })
            .catch(function(e) {
              if (e.name !== 'AbortError') _downloadAndWhatsApp(blob, fileName, o);
            });
        } else if (navigator.share) {
          // Share without file — just text (mobile browser without file-share support)
          navigator.share({ title: 'Receipt - ' + o.clientName, text: msgText })
            .then(function() { showToast('\u2705 Shared via system share!'); })
            .catch(function(e) { if (e.name !== 'AbortError') _downloadAndWhatsApp(blob, fileName, o); });
        } else {
          _downloadAndWhatsApp(blob, fileName, o);
        }
      }, 'image/png');
    }).catch(function(err) {
      receiptEl.style.visibility = 'hidden';
      // Restore images
      imgData.forEach(function(d) { d.el.style.display = d.display; });
      console.error('html2canvas error:', err);
      showToast('\u26a0\ufe0f Could not capture receipt. Try reprinting instead.');
    });
  }, 250);
}

function _downloadAndWhatsApp(blob, fileName, o) {
  // On desktop: open WhatsApp Web WITHOUT downloading the image.
  // The user should use the Download button separately if they want the file.
  showToast('📤 Opening WhatsApp…');
  var phone = (o.clientPhone || '').replace(/\D/g, '');
  var waPhone = phone.startsWith('0') ? '234' + phone.slice(1) : phone;
  var msg = '\uD83E\uDDF5 *Receipt \u2014 ' + o.clientName + '*\n\uD83D\uDCCB ' + (o.receiptNumber || ('#'+o.id)) + '\n\uD83D\uDCB0 ' + (o.balance > 0 ? '\u20A6'+o.balance.toLocaleString()+' outstanding' : 'Fully paid \u2705') + '\n\n_(Please download the receipt image from the app and attach it here)_';
  window.open('https://wa.me/' + (waPhone||'') + '?text=' + encodeURIComponent(msg), '_blank');
}

async function deleteOrder(id) {
  var _do = await showConfirm({
    title: 'Delete Task?',
    body: 'This order will be permanently removed from your records.',
    okText: 'Delete', icon: '\uD83D\uDDD1'
  });
  if (!_do) return;

  // 1. Remove locally first so the UI feels instant
  localStorage.setItem('incline_orders', JSON.stringify(getOrders().filter(o => String(o.id) !== String(id))));
  
  // Also update _sosAllOrders if we're on the staff orders screen
  if (typeof _sosAllOrders !== 'undefined' && _sosAllOrders) {
    window._sosAllOrders = _sosAllOrders.filter(o => String(o.id) !== String(id));
    // Update totals on sos screen
    if (document.getElementById('sos-count')) {
      document.getElementById('sos-count').textContent = _sosAllOrders.length;
      const totalRevenue  = _sosAllOrders.reduce((s,o)=>s+(o.subtotal||0),0);
      const totalBalance  = _sosAllOrders.reduce((s,o)=>s+(o.balance||0),0);
      document.getElementById('sos-revenue').innerHTML = '&#8358;' + totalRevenue.toLocaleString();
      document.getElementById('sos-balance').innerHTML = '&#8358;' + totalBalance.toLocaleString();
    }
  }

  // Stay on the task list — don't jump to a different tab
  if ($('#staff-orders-screen').is(':visible')) {
    // Stay on staff orders screen — just re-render
  } else {
    $('#order-profile-screen').hide();
    $('#order-list-screen').show();
    _opId = null;
    renderOrdersTable();
  }
  showToast('Deleting task…');

  // 2. Delete from Supabase so it does not come back on next refresh
  try {
    let _delErr; 
    try { await _sbFetch('orders?id=eq.' + id, { method: 'DELETE', prefer: 'return=minimal' }); } catch(e) { _delErr = e; }
    if (_delErr) {
      showToast('⚠️ Delete failed on server: ' + _delErr.message);
      await refreshOrdersFromSupabase();
      renderOrdersTable();
    } else {
      showToast('🗑 Task deleted.');
    }
  } catch(e) {
    console.error('deleteOrder error:', e);
    showToast('⚠️ Delete failed: ' + e.message);
    await refreshOrdersFromSupabase();
    renderOrdersTable();
  }
}

// ════════════════════════════════════════════════════════════════════
// AUTO-DEDUCTION: Check if customer owes money from previous orders
// ════════════════════════════════════════════════════════════════════
function checkCustomerDebt() {
  // Fix: Use correct Task Order field IDs
  var _cn = document.getElementById('to-name');
  var _cp = document.getElementById('to-phone');
  const name = (_cn ? _cn.value : '').trim().toLowerCase();
  const phone = (_cp ? _cp.value : '').trim();
  
  if (!name && !phone) return;
  
  // Check orders with outstanding balance
  const orders = getOrders();
  const manualDebts = getManualDebts();
  
  // Find matching customer (by name or phone)
  let totalDebt = 0;
  
  orders.forEach(o => {
    if (o.balance > 0 && o.status !== 'Cancelled') {
      const matchName = name && o.clientName.toLowerCase() === name;
      const matchPhone = phone && o.clientPhone === phone;
      if (matchName || matchPhone) {
        totalDebt += o.balance;
      }
    }
  });
  
  manualDebts.forEach(d => {
    if (d.balance > 0) {
      const matchName = name && d.clientName.toLowerCase() === name;
      const matchPhone = phone && d.clientPhone === phone;
      if (matchName || matchPhone) {
        totalDebt += d.balance;
      }
    }
  });
  
  // Auto-fill deduction field
  if (totalDebt > 0) {
    var _de = document.getElementById('to-deduction');
    if (_de) {
      _de.value = totalDebt;
      toCalc();
    }
    showLoanSyncBadge(totalDebt);
    showToast(`⚠️ ${name || 'Customer'} owes ₦${totalDebt.toLocaleString()} — auto-filled & will sync to Loan section on save`);
  } else {
    hideLoanSyncBadge();
  }
}
function showLoanSyncBadge(amount) {
  if ($('#loanSyncBadge').length) { $('#loanSyncBadge').text('🔗 Linked to Loan — ₦' + amount.toLocaleString() + ' will be deducted on Save'); return; }
  const badge = $(`<div id="loanSyncBadge" style="
    margin-top:8px;padding:7px 13px;border-radius:8px;font-size:11px;font-weight:600;
    background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);
    color:var(--green);display:flex;align-items:center;gap:6px;letter-spacing:0.3px;
    animation:slideIn 0.2s ease;">
    🔗 Linked to Loan — ₦${amount.toLocaleString()} will be deducted on Save
  </div>`);
  $('#discountAmt').closest('.form-group').append(badge);
}

function hideLoanSyncBadge() {
  $('#loanSyncBadge').remove();
}

// ════════════════════════════════════════════════════════════════════
// OUTSTANDING BALANCES / LOAN DEDUCTION FUNCTIONS
// ════════════════════════════════════════════════════════════════════
function getManualDebts() {
  try { return JSON.parse(localStorage.getItem('incline_manual_debts')) || []; } catch { return []; }
}

async function refreshLoansFromSupabase() {
  const data = await sbGetLoans();
  if (!data) return;

  // Check local cache — if local says Paid but Supabase says otherwise, fix Supabase
  const localCache = getManualDebts();
  for (const l of data) {
    const local = localCache.find(x => String(x.id) === String(l.id));
    if (local && local.balance <= 0 && l.balance > 0) {
      // Local is paid but Supabase is not — fix Supabase silently
      _sbFetch('loans?id=eq.' + Number(local.id), { method: 'PATCH', body: { balance: 0, status: 'Paid', payments: local.payments || [] }, prefer: 'return=minimal' }).catch(() => {});
      l.balance = 0;
      l.status  = 'Paid';
    }
  }

  const normalized = data.map(l => ({
    id: l.id, clientName: l.client_name, clientPhone: l.client_phone || '',
    staffId: l.staff_id || '',
    amount: l.amount || 0,
    balance: (l.status === 'Paid' || l.balance <= 0) ? 0 : (l.balance || 0),
    status:  (l.balance <= 0 || l.status === 'Paid') ? 'Paid' : (l.status || 'Outstanding'),
    collectedDate: l.collected_date || '', dueDate: l.due_date || '',
    notes: l.notes || '', payments: l.payments || []
  }));
  localStorage.setItem('incline_manual_debts', JSON.stringify(normalized));
}

function addManualDebt() {
  const name      = $('#debtCustomerName').val().trim();
  const staffId   = $('#debtStaffId').val().trim();
  const phone     = $('#debtCustomerPhone').val().trim();
  const amount    = parseFloat($('#debtAmount').val()) || 0;
  const collectedDate = $('#debtCollectedDate').val();
  const collectedTime = $('#debtCollectedTime').val();
  const collected = collectedDate ? (collectedTime ? collectedDate + 'T' + collectedTime : collectedDate) : '';
  const dueDate   = $('#debtDueDate').val();
  const notes     = $('#debtNotes').val().trim();

  if (!name)   { showToast('⚠️ Select a staff member'); return; }
  if (phone && phone.replace(/\D/g,'').length !== 11) {
    showToast('⚠️ Phone number must be exactly 11 digits');
    $('#debtCustomerPhone').focus(); $('#debtPhoneError').show(); return;
  }
  if (amount <= 0) { showToast('⚠️ Enter amount owed'); return; }

  const debt = {
    id: Date.now(),
    date: new Date().toISOString(),
    clientName: name,
    staffId: staffId,
    clientPhone: phone,
    amount: amount,
    balance: amount,
    originalAmount: amount,
    collectedDate: collected,
    dueDate: dueDate,
    notes: notes,
    status: 'Outstanding',
    manualEntry: true,
    payments: [{ type:'credit', amount, note: notes||'Opening loan', date: collected||new Date().toISOString() }]
  };

  const debts = getManualDebts();
  debts.unshift(debt);
  localStorage.setItem('incline_manual_debts', JSON.stringify(debts));
  sbSaveLoan(debt).catch(e => console.error('Loan Supabase sync failed:', e));
  $('#debtStaffSelect').val('');
  $('#debtCustomerName,#debtStaffId,#debtCustomerPhone,#debtAmount,#debtCollectedDate,#debtCollectedTime,#debtDueDate,#debtNotes').val('');
  $('#debtPhoneError').hide();
  renderOutstandingTable();
  showToast(`✅ ${name} added (₦${amount.toLocaleString()})`);
}


function clearOutstandingDates() {
  $('#outstandingFrom, #outstandingTo').val('');
  renderOutstandingTable();
}

function renderOutstandingTable() {
  const orders      = getOrders();
  const manualDebts = getManualDebts();
  const search      = $('#outstandingSearch').val().toLowerCase();
  const sortBy      = $('#outstandingSortBy').val();
  const fromDate    = $('#outstandingFrom').val();
  const toDate      = $('#outstandingTo').val();
  const dateField   = $('#outstandingDateField').val();

  let outstanding = manualDebts.filter(d => d.balance > 0)
    .map(d => ({...d, source:'manual'}));

  if (search) {
    outstanding = outstanding.filter(o =>
      o.clientName.toLowerCase().includes(search) || (o.clientPhone||'').includes(search)
    );
  }

  // Date range filter
  if (fromDate || toDate) {
    outstanding = outstanding.filter(o => {
      const fieldVal = dateField === 'collected'
        ? (o.collectedDate || o.date || '')
        : (o.dueDate || '');
      if (!fieldVal) return false;
      const d = fieldVal.slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate   && d > toDate)   return false;
      return true;
    });
  }

  if (sortBy === 'balance')  outstanding.sort((a,b) => b.balance - a.balance);
  else if (sortBy === 'dueDate') outstanding.sort((a,b) => (a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  else if (sortBy === 'name')    outstanding.sort((a,b) => a.clientName.localeCompare(b.clientName));

  const totalOutstanding = outstanding.reduce((s,o) => s + o.balance, 0);
  $('#totalOutstanding').text('₦' + totalOutstanding.toLocaleString());
  $('#outstandingCount').text(outstanding.length);

  if (!outstanding.length) {
    $('#outstandingTable').html('<div class="empty-state"><div class="icon">💰</div><p>No outstanding balances!</p></div>');
    return;
  }

  // Lookup helper for staff photos by staffId
  const _allStaffForLoans = getStaffProfiles();

  let html = '';
  outstanding.forEach(o => {
    const daysOverdue = o.dueDate && new Date(o.dueDate) < new Date()
      ? Math.floor((new Date() - new Date(o.dueDate)) / (1000*60*60*24)) : 0;
    const isOverdue = daysOverdue > 0;
    // NEW COLOR: coral-amber instead of gold
    const accentColor = isOverdue ? '#ff4f6b' : '#fb923c';
    const accentColorRgb = isOverdue ? '255,79,107' : '251,146,60';

    const totalRepaid = o.source === 'manual'
      ? (o.payments||[]).filter(p=>p.type==='debit').reduce((s,p)=>s+p.amount,0) : 0;
    const pct = o.originalAmount > 0
      ? Math.min(100, Math.round((totalRepaid / o.originalAmount) * 100)) : 0;
    let collected = '—';
    if (o.collectedDate) {
      const cd = new Date(o.collectedDate);
      const hasTime = o.collectedDate.includes('T') && o.collectedDate.length > 10;
      collected = cd.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      if (hasTime) collected += ' · ' + cd.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    }
    const initials = (o.clientName||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

    // Look up staff photo
    const staffProfile = _allStaffForLoans.find(s =>
      (o.staffId && s.staffId === o.staffId) ||
      (s.name||'').toLowerCase().trim() === (o.clientName||'').toLowerCase().trim()
    );
    const staffPhotoSrc = staffProfile ? (getStaffPhoto(String(staffProfile.id)) || staffProfile.photo || null) : null;
    const avatarHtml = staffPhotoSrc
      ? `<img src="${staffPhotoSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
      : `<span style="font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:800;color:${accentColor};">${initials}</span>`;

    // SVG donut arc for repayment
    const r = 20, circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    html += `
      <div class="ob-card" style="--ob-accent:${accentColor};--ob-accent-rgb:${accentColorRgb};">

        <!-- Background watermark -->
        <div class="ob-watermark">${isOverdue ? 'OVERDUE' : 'ACTIVE'}</div>

        <!-- TOP ROW: avatar + identity + balance donut -->
        <div class="ob-top">
          <!-- Avatar -->
          <div class="ob-avatar-wrap">
            <div class="ob-avatar-glow" style="background:radial-gradient(circle,rgba(${accentColorRgb},0.25),transparent 70%);"></div>
            <div class="ob-avatar-circle" style="border-color:${accentColor};">
              ${avatarHtml}
            </div>
            ${isOverdue ? `<div class="ob-overdue-dot"></div>` : ''}
          </div>

          <!-- Name + phone + chips -->
          <div class="ob-identity">
            <div class="ob-name">${o.clientName}</div>
            ${o.clientPhone ? `<div class="ob-phone">
              <i class="fas fa-phone" style="font-size:9px;color:${accentColor};opacity:0.7;"></i>
              ${o.clientPhone}
            </div>` : ''}
            <div class="ob-meta-row">
              ${o.source==='manual' ? `<span class="ob-chip" style="background:rgba(${accentColorRgb},0.12);border-color:rgba(${accentColorRgb},0.3);color:${accentColor};">LOAN #${o.id}</span>` : ''}
              ${isOverdue
                ? `<span class="ob-chip ob-chip-alert">${daysOverdue}d OVERDUE</span>`
                : `<span class="ob-chip ob-chip-ok">ON TRACK</span>`}
            </div>
          </div>

          <!-- Donut + balance -->
          <div class="ob-balance-block">
            <div class="ob-donut-wrap">
              <svg width="54" height="54" viewBox="0 0 52 52" style="overflow:visible;">
                <circle cx="26" cy="26" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
                <circle cx="26" cy="26" r="${r}" fill="none" stroke="${accentColor}" stroke-width="5"
                  stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
                  stroke-dashoffset="${(circ * 0.25).toFixed(1)}"
                  stroke-linecap="round" style="filter:drop-shadow(0 0 4px ${accentColor}80);"/>
                <text x="26" y="30" text-anchor="middle" fill="${accentColor}" font-size="9.5" font-weight="800" font-family="DM Sans,sans-serif">${pct}%</text>
              </svg>
            </div>
            <div class="ob-balance-amt" style="color:${accentColor};">&#8358;${o.balance.toLocaleString()}</div>
            <div class="ob-balance-lbl">Balance Due</div>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="ob-divider" style="background:linear-gradient(90deg,transparent,rgba(${accentColorRgb},0.35),transparent);"></div>

        <!-- MID: repayment bar + date cells -->
        <div class="ob-mid">
          ${o.source==='manual' ? `
          <div class="ob-repay-section">
            <div class="ob-repay-header">
              <span class="ob-repay-label">Repayment Progress</span>
              <span class="ob-repay-pct" style="color:${accentColor};">${pct}%</span>
            </div>
            <div class="ob-repay-track">
              <div class="ob-repay-fill" style="width:${pct}%;background:linear-gradient(90deg,${isOverdue?'#7f1d1d':'#431407'},${accentColor});"></div>
            </div>
          </div>` : ''}

          <div class="ob-dates-grid">
            <div class="ob-date-cell">
              <div class="ob-date-icon" style="color:${accentColor};">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <div class="ob-date-lbl">Collected</div>
                <div class="ob-date-val">${collected}</div>
              </div>
            </div>
            <div class="ob-date-cell">
              <div class="ob-date-icon" style="color:${isOverdue?'#ff4f6b':accentColor};">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <div class="ob-date-lbl">Due Date</div>
                <div class="ob-date-val" style="color:${isOverdue?'#ff4f6b':'inherit'};">${o.dueDate||'—'}${isOverdue?' ⚠':''}</div>
              </div>
            </div>
            ${o.source==='manual' ? `
            <div class="ob-date-cell">
              <div class="ob-date-icon" style="color:${accentColor};">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </div>
              <div>
                <div class="ob-date-lbl">Transactions</div>
                <div class="ob-date-val">${(o.payments||[]).length} recorded</div>
              </div>
            </div>` : ''}
          </div>
        </div>

        <!-- FOOTER: action buttons -->
        <div class="ob-footer">
          <button class="ob-action-btn ob-action-primary" style="--btn-c:${accentColor};--btn-rgb:${accentColorRgb};"
            onclick="${o.source==='manual'?'viewDebt('+o.id+')':"viewOrder('"+o.id+"')"}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
            View Profile
          </button>
          ${o.source==='manual' ? `
          <button class="ob-action-btn ob-action-edit" onclick="openEditDebt(${o.id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="ob-action-btn ob-action-del" onclick="deleteDebt(${o.id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Remove
          </button>` : ''}
        </div>

        <!-- Corner accent glow -->
        <div class="ob-corner-line" style="background:linear-gradient(135deg,${accentColor}30,transparent 55%);"></div>
      </div>
    `;
  });

  $('#outstandingTable').html(html);
}

// ────────────────────────────────────────────────────────────────────
// PROFILE VIEW
// ────────────────────────────────────────────────────────────────────
let _pvId = null;

function viewDebt(id) {
  _pvId = id;
  renderProfileView(id);
  $('#os-main').hide();
  $('#os-profile').show();
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function closeDebtProfile() {
  $('#os-profile').hide();
  $('#os-main').show();
  renderOutstandingTable();
}

function renderProfileView(id) {
  const debt = getManualDebts().find(d => d.id === id);
  if (!debt) { closeDebtProfile(); return; }
  $('#pv-settled-banner').remove(); // Clear any old banner

  const payments = debt.payments || [];
  const totalLoaned = payments.filter(p=>p.type==='credit').reduce((s,p)=>s+p.amount,0);
  const totalRepaid = payments.filter(p=>p.type==='debit').reduce((s,p)=>s+p.amount,0);
  const overdue = debt.dueDate && new Date(debt.dueDate) < new Date();

  $('#pv-name').text(debt.clientName);
  $('#pv-phone').text(debt.clientPhone ? '📞  ' + debt.clientPhone : 'No phone on record');
  $('#pv-loan-id').text('Loan ID: #' + debt.id);
  $('#pv-balance').text('₦' + debt.balance.toLocaleString());
  $('#pv-original').text('₦' + totalLoaned.toLocaleString());
  $('#pv-repaid').text('₦' + totalRepaid.toLocaleString());
  $('#pv-due').html(debt.dueDate
    ? (overdue ? `<span style="color:#f87171;">${debt.dueDate} ⚠</span>` : debt.dueDate)
    : '—');
  if (debt.collectedDate) {
    const cd = new Date(debt.collectedDate);
    const hasTime = debt.collectedDate.includes('T') && debt.collectedDate.length > 10;
    const dateStr = cd.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const timeStr = hasTime ? cd.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
    $('#pv-collected').html(dateStr + (timeStr ? '<br><span style="font-size:14px;color:var(--gold);font-weight:600;">' + timeStr + '</span>' : ''));
  } else {
    $('#pv-collected').text('—');
  }
  $('#pv-notes').text(debt.notes || '—');
  $('#pv-tx-count').text(payments.length + ' transaction' + (payments.length!==1?'s':''));

  if (debt.balance <= 0) {
    $('#pv-status-badge').text('SETTLED').css({'background':'rgba(16,185,129,0.15)','color':'#34D399','border':'1px solid rgba(16,185,129,0.3)'});
    // Show settled banner with link to alumni section
    if (!$('#pv-settled-banner').length) {
      $('#os-profile .container').prepend('<div id="pv-settled-banner" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:14px 20px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;"><div><span style=\"font-size:18px;margin-right:8px;\">✅</span><span style=\"font-size:13px;color:#34D399;font-weight:600;\">This loan is fully settled</span><div style=\"font-size:11px;color:var(--text-muted);margin-top:2px;\">Profile is stored in the Paid Profiles archive.</div></div><button onclick=\"closeDebtProfile();switchLoanSubTab(\'alumni\')\" style=\"background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#34D399;padding:7px 16px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;\">View Archive →</button></div>');
    }
  } else if (overdue) {
    $('#pv-status-badge').text('OVERDUE').css({'background':'rgba(224,82,82,0.15)','color':'#f87171','border':'1px solid rgba(224,82,82,0.3)'});
  } else {
    $('#pv-status-badge').text('OUTSTANDING').css({'background':'rgba(48,168,255,0.12)','color':'#60a5fa','border':'1px solid rgba(48,168,255,0.25)'});
  }

  // Build statement rows with running balance
  if (!payments.length) {
    $('#pv-tx-list').html('<div style="padding:30px;text-align:center;color:var(--text-muted);font-size:13px;">No transactions yet</div>');
    return;
  }

  // Calculate running balance from oldest to newest
  let running = 0;
  const withRunning = [...payments].reverse().map(p => {
    if (p.type === 'credit') running += p.amount;
    else running -= p.amount;
    return { ...p, running: Math.max(0, running) };
  }).reverse();

  let txHtml = '';
  withRunning.forEach((p, i) => {
    const isCredit = p.type === 'credit';
    const _d = new Date(p.date);
    const dateStr = _d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const hasTime = p.date && p.date.includes('T');
    const timeStr = hasTime ? _d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
    const rowBg = i % 2 === 0 ? 'background:rgba(255,255,255,0.01);' : '';
    txHtml += `
      <div style="display:grid;grid-template-columns:110px 1fr 120px 120px 130px 70px;align-items:center;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.04);${rowBg}transition:background 0.15s;" onmouseenter="this.style.background='rgba(255,255,255,0.03)'" onmouseleave="this.style.background='${i%2===0?'rgba(255,255,255,0.01)':'transparent'}'">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.5;">${dateStr}${timeStr ? '<br><span style=\"font-size:10px;color:var(--gold);font-weight:600;\">⏱ ' + timeStr + '</span>' : ''}</div>
        <div style="font-size:13px;color:var(--text);padding-right:12px;">${p.note||'Transaction'}</div>
        <div style="text-align:right;font-size:13px;font-weight:600;color:${isCredit?'var(--green)':'transparent'};">${isCredit?'₦'+p.amount.toLocaleString():'—'}</div>
        <div style="text-align:right;font-size:13px;font-weight:600;color:${!isCredit?'var(--red)':'transparent'};">${!isCredit?'₦'+p.amount.toLocaleString():'—'}</div>
        <div style="text-align:right;font-size:13px;font-weight:700;color:${p.running>0?'var(--text)':'var(--green)'};">₦${p.running.toLocaleString()}</div>
        <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
          <button onclick="openEditTx(${id},${i})" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);color:rgba(16,185,129,0.7);cursor:pointer;font-size:11px;padding:3px 7px;border-radius:5px;line-height:1;transition:all 0.15s;" onmouseenter="this.style.background='rgba(16,185,129,0.18)';this.style.color='var(--green)'" onmouseleave="this.style.background='rgba(16,185,129,0.08)';this.style.color='rgba(16,185,129,0.7)'">✏️</button>
          <button onclick="deleteTx(${id},${i})" style="background:none;border:none;color:rgba(224,82,82,0.3);cursor:pointer;font-size:13px;padding:3px 5px;border-radius:4px;line-height:1;transition:color 0.2s;" onmouseenter="this.style.color='var(--red)'" onmouseleave="this.style.color='rgba(224,82,82,0.3)'">✕</button>
        </div>
      </div>
    `;
  });

  $('#pv-tx-list').html(txHtml);
}

// ── Credit: add more loan ──
function pvCredit() {
  const debt = getManualDebts().find(d => d.id === _pvId);
  if (!debt) return;

  document.getElementById('creditModalSubtitle').textContent = 'Adding funds · ' + debt.clientName;
  document.getElementById('creditModalBalance').textContent = '₦' + debt.balance.toLocaleString();
  document.getElementById('creditAmountInput').value = '';
  document.getElementById('creditNoteInput').value = '';
  document.getElementById('creditError').style.display = 'none';
  document.getElementById('creditModal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('creditAmountInput').focus(); }, 100);
}

function closeCreditModal() {
  document.getElementById('creditModal').style.display = 'none';
}

function confirmCredit() {
  var amount  = parseFloat(document.getElementById('creditAmountInput').value);
  var noteStr = document.getElementById('creditNoteInput').value.trim();
  var errEl   = document.getElementById('creditError');
  if (!amount || amount <= 0) { errEl.textContent = 'Enter a valid amount.'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';

  const creditTimestamp = new Date().toISOString();
  const debts = getManualDebts();
  const d = debts.find(x => x.id === _pvId);
  if (!d) { closeCreditModal(); return; }
  d.balance = (d.balance || 0) + amount;
  d.originalAmount = (d.originalAmount || 0) + amount;
  if (d.status === 'Paid') d.status = 'Outstanding';
  d.payments = d.payments || [];
  d.payments.unshift({ type: 'credit', amount: amount, note: noteStr || 'Additional loan', date: creditTimestamp });
  localStorage.setItem('incline_manual_debts', JSON.stringify(debts));
  sbUpdateLoan(d).catch(function(e){ console.error('Credit sync:', e); });
  closeCreditModal();
  renderProfileView(_pvId);
  renderOutstandingTable();
  updateAlumniBadge();
  showToast('➕ ₦' + amount.toLocaleString() + ' credited to ' + d.clientName);
}

// ── Debit: repayment / deduction ──
function pvDebit() {
  const debt = getManualDebts().find(d => d.id === _pvId);
  if (!debt) return;
  if (debt.balance <= 0) { showToast('⚠️ Balance is already zero'); return; }

  // Temporarily wire modal confirm to profile-view debit logic
  _pmType = 'pv-debit';
  _pmId   = _pvId;
  _pmMax  = debt.balance;
  $('#pm-subtitle').text(debt.clientName);
  $('#pm-balance-chip').text('₦' + debt.balance.toLocaleString());
  $('#pm-amount').val(debt.balance);
  $('#pm-note').val('Repayment');
  $('#pm-error').hide();
  const modal = document.getElementById('paymentModal');
  modal.style.display = 'flex';
  modal.style.opacity = '0';
  setTimeout(function() {
    modal.style.transition = 'opacity 0.3s ease';
    modal.style.opacity = '1';
    document.getElementById('pm-amount').select();
  }, 10);
}

// ── Transfer to calculator ──
function pvUseInCalc() {
  const debt = getManualDebts().find(d => d.id === _pvId);
  if (!debt || debt.balance <= 0) { showToast('⚠️ No outstanding balance to transfer'); return; }
  switchTab('task-order');
  var _n2=document.getElementById('to-name');if(_n2)_n2.value=debt.clientName;
  var _p2=document.getElementById('to-phone');if(_p2&&debt.clientPhone)_p2.value=debt.clientPhone;
  var _d2=document.getElementById('to-deduction');if(_d2)_d2.value=debt.balance;
  calcTotals();
  showToast(`💸 ₦${debt.balance.toLocaleString()} sent to Loan Deduction`);
}

// ── Delete single transaction ──
// ── Edit a specific transaction inside a loan profile ──
var _editTxDebtId = null;
var _editTxIdx    = null;

function openEditTx(debtId, txIdx) {
  const debt = getManualDebts().find(d => d.id === debtId);
  if (!debt) return;
  const tx = (debt.payments || [])[txIdx];
  if (!tx) return;

  _editTxDebtId = debtId;
  _editTxIdx    = txIdx;

  // Type label
  const isCredit = tx.type === 'credit';
  document.getElementById('etx-type-label').textContent =
    (isCredit ? '📥 CREDIT — Loan Issued' : '📤 DEBIT — Repayment') +
    '  ·  Loan ID #' + debtId;

  // Populate fields
  document.getElementById('etx-amount').value = tx.amount || '';
  document.getElementById('etx-note').value   = tx.note   || '';

  // Split ISO date into date + time parts
  if (tx.date) {
    const hasTime = tx.date.includes('T');
    document.getElementById('etx-date').value = tx.date.slice(0, 10);
    document.getElementById('etx-time').value = hasTime ? tx.date.slice(11, 16) : '';
  } else {
    document.getElementById('etx-date').value = '';
    document.getElementById('etx-time').value = '';
  }

  document.getElementById('editTxModal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('etx-amount').focus(); }, 80);
}

function closeEditTx() {
  document.getElementById('editTxModal').style.display = 'none';
  _editTxDebtId = null;
  _editTxIdx    = null;
}

function saveEditTx() {
  const amount = parseFloat(document.getElementById('etx-amount').value);
  if (!amount || amount <= 0) { showToast('⚠️ Enter a valid amount'); return; }

  const dateVal = document.getElementById('etx-date').value;
  const timeVal = document.getElementById('etx-time').value;
  const note    = document.getElementById('etx-note').value.trim();

  if (!dateVal) { showToast('⚠️ Pick a date'); return; }

  const newDate = timeVal ? dateVal + 'T' + timeVal : dateVal;

  const btn = document.getElementById('etxSaveBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  const debts = getManualDebts();
  const debt  = debts.find(d => d.id === _editTxDebtId);
  if (!debt) { btn.textContent = '💾 Save Changes'; btn.disabled = false; return; }

  const tx = (debt.payments || [])[_editTxIdx];
  if (!tx) { btn.textContent = '💾 Save Changes'; btn.disabled = false; return; }

  const oldAmount = tx.amount;
  const diff      = amount - oldAmount;  // positive = increased, negative = decreased

  // Update the transaction
  tx.amount = amount;
  tx.date   = newDate;
  tx.note   = note || tx.note;

  // Recalculate loan balance from all transactions from scratch
  let bal = 0;
  (debt.payments || []).forEach(p => {
    if (p.type === 'credit') bal += p.amount;
    else bal -= p.amount;
  });
  debt.balance = Math.max(0, bal);
  debt.status  = debt.balance <= 0 ? 'Paid' : 'Outstanding';

  localStorage.setItem('incline_manual_debts', JSON.stringify(debts));
  sbUpdateLoan(debt).catch(e => console.error('Tx edit sync failed:', e));

  closeEditTx();
  renderProfileView(_editTxDebtId || debt.id);
  renderOutstandingTable();
  updateAlumniBadge();
  btn.textContent = '💾 Save Changes'; btn.disabled = false;
  showToast('✅ Transaction updated!');
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  var etxModal = document.getElementById('editTxModal');
  if (etxModal) etxModal.addEventListener('click', function(e){ if(e.target===this) closeEditTx(); });
});

async function deleteTx(debtId, txIdx) {
  var _rt = await showConfirm({
    title: 'Remove Transaction?',
    body: 'This transaction entry will be permanently deleted.',
    okText: 'Remove', icon: '\uD83D\uDDD1'
  });
  if (!_rt) return;
  const debts = getManualDebts();
  const debt  = debts.find(d => d.id === debtId);
  if (!debt || !debt.payments) return;
  debt.payments.splice(txIdx, 1);
  // Recalculate balance from scratch
  let bal = 0;
  debt.payments.forEach(p => { if (p.type==='credit') bal += p.amount; else bal -= p.amount; });
  debt.balance = Math.max(0, bal);
  debt.originalAmount = debt.payments.filter(p=>p.type==='credit').reduce((s,p)=>s+p.amount,0);
  debt.status = debt.balance > 0 ? 'Outstanding' : 'Paid';
  localStorage.setItem('incline_manual_debts', JSON.stringify(debts));
  renderProfileView(debtId);
  showToast('🗑 Transaction removed');
}

// ── Edit profile ──
function openEditDebt(idArg) {
  // Accept id directly (from card) or fall back to _pvId (from profile view)
  const id   = idArg !== undefined ? idArg : _pvId;
  const debt = getManualDebts().find(d => d.id === id);
  if (!debt) return;

  // Keep track of which loan we're editing
  _pvId = id;

  // Loan ID badge
  document.getElementById('edit-loan-id-badge').textContent = 'Loan ID: #' + id;

  // Populate staff dropdown
  const sel = document.getElementById('edit-staff-select');
  sel.innerHTML = '<option value="">— Select Staff —</option>';
  getStaffProfiles().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).forEach(function(s) {
    const opt = document.createElement('option');
    opt.value = s.staffId || s.name;
    opt.dataset.name  = s.name;
    opt.dataset.phone = s.phone || '';
    opt.textContent   = s.name + (s.position ? ' · ' + s.position : '');
    // Pre-select if matches current loan
    if (s.name.toLowerCase() === (debt.clientName||'').toLowerCase() ||
        (s.staffId && s.staffId === debt.staffId)) {
      opt.selected = true;
    }
    sel.appendChild(opt);
  });

  // Fill fields
  $('#edit-name').val(debt.clientName || '');
  $('#edit-phone').val(debt.clientPhone || '');
  $('#edit-amount').val(debt.amount || debt.balance || 0);
  if (debt.collectedDate && debt.collectedDate.includes('T')) {
    $('#edit-collected').val(debt.collectedDate.slice(0,10));
    $('#edit-collected-time').val(debt.collectedDate.slice(11,16));
  } else {
    $('#edit-collected').val(debt.collectedDate || '');
    $('#edit-collected-time').val('');
  }
  $('#edit-due').val(debt.dueDate || '');
  $('#edit-notes').val(debt.notes || '');
  $('#edit-phone-error').hide();

  // Set status buttons
  setEditLoanStatus(debt.balance <= 0 ? 'Paid' : (debt.status || 'Outstanding'));

  $('#editDebtModal').css('display','flex');
}

function onEditDebtStaffSelect() {
  const sel = document.getElementById('edit-staff-select');
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.name) {
    $('#edit-name').val(opt.dataset.name);
    if (opt.dataset.phone) $('#edit-phone').val(opt.dataset.phone);
  }
}

function setEditLoanStatus(status) {
  document.getElementById('edit-status').value = status;
  const obtn = document.getElementById('edit-status-outstanding');
  const pbtn = document.getElementById('edit-status-paid');
  if (status === 'Paid') {
    pbtn.style.background = 'rgba(16,185,129,0.18)';
    pbtn.style.color      = 'var(--green)';
    pbtn.style.borderColor= 'rgba(16,185,129,0.4)';
    obtn.style.background = 'var(--surface2)';
    obtn.style.color      = 'var(--text-muted)';
    obtn.style.borderColor= 'rgba(255,255,255,0.1)';
  } else {
    obtn.style.background = 'rgba(48,168,255,0.12)';
    obtn.style.color      = '#60a5fa';
    obtn.style.borderColor= 'rgba(48,168,255,0.4)';
    pbtn.style.background = 'var(--surface2)';
    pbtn.style.color      = 'var(--text-muted)';
    pbtn.style.borderColor= 'rgba(255,255,255,0.1)';
  }
}

function closeEditDebt() {
  $('#editDebtModal').hide();
}

function saveEditDebt() {
  const phone = $('#edit-phone').val().trim();
  if (phone && phone.replace(/\D/g,'').length !== 11) {
    $('#edit-phone-error').show();
    showToast('⚠️ Phone must be exactly 11 digits'); return;
  }
  $('#edit-phone-error').hide();

  const debts = getManualDebts();
  const debt  = debts.find(d => d.id === _pvId);
  if (!debt) return;

  const btn = document.getElementById('editDebtSaveBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  const newName   = $('#edit-name').val().trim() || debt.clientName;
  const newAmount = parseFloat($('#edit-amount').val()) || debt.amount || debt.balance;
  const newStatus = document.getElementById('edit-status').value;
  const editDate  = $('#edit-collected').val();
  const editTime  = $('#edit-collected-time').val();

  // Recalculate balance if amount changed
  const oldAmount    = debt.amount || 0;
  const totalRepaid  = (debt.payments||[]).filter(p=>p.type==='debit').reduce((s,p)=>s+p.amount, 0);
  const newBalance   = newStatus === 'Paid' ? 0 : Math.max(0, newAmount - totalRepaid);

  debt.clientName    = newName;
  debt.clientPhone   = phone;
  debt.amount        = newAmount;
  debt.balance       = newBalance;
  debt.status        = newStatus === 'Paid' ? 'Paid' : (newBalance <= 0 ? 'Paid' : 'Outstanding');
  debt.collectedDate = editDate ? (editTime ? editDate + 'T' + editTime : editDate) : '';
  debt.dueDate       = $('#edit-due').val();
  debt.notes         = $('#edit-notes').val().trim();

  // Update staffId if staff was selected from dropdown
  const sel = document.getElementById('edit-staff-select');
  const selOpt = sel.options[sel.selectedIndex];
  if (selOpt && selOpt.dataset.name) {
    debt.staffId = selOpt.value || debt.staffId;
  }

  // Update opening credit entry amount if loan amount changed
  if (newAmount !== oldAmount && debt.payments && debt.payments.length > 0) {
    const creditIdx = debt.payments.findIndex(p => p.type === 'credit');
    if (creditIdx >= 0) debt.payments[creditIdx].amount = newAmount;
  }

  localStorage.setItem('incline_manual_debts', JSON.stringify(debts));
  sbUpdateLoan(debt).catch(e => console.error('Edit loan sync failed:', e));

  closeEditDebt();
  if ($('#os-profile').is(':visible')) renderProfileView(_pvId);
  renderOutstandingTable();
  updateAlumniBadge();
  btn.textContent = '💾 Save Changes'; btn.disabled = false;
  showToast('✅ Loan updated!');
}

// ── WhatsApp Share Loan Statement ──
function shareOnWhatsApp() {
  const debt = getManualDebts().find(d => d.id === _pvId);
  if (!debt) return;
  if (typeof window.jspdf === 'undefined') {
    showToast('⚠️ PDF library loading, try again'); return;
  }
  window._pdfDebt = debt;
  $('#pdfPassInput').val('');
  $('#pdfPassError').hide().text('');
  const saved = localStorage.getItem('incline_pdf_password');
  $('#pdfPassModalTitle').text(saved ? 'Enter PDF Password' : 'Set PDF Password');
  $('#pdfPassModalDesc').text(saved ? 'Enter your password to encrypt and generate the PDF.' : 'No password set yet. Create one now — it will be saved for future use.');
  document.getElementById('pdfPasswordModal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('pdfPassInput').focus(); }, 100);
}

function closePDFPasswordModal() {
  document.getElementById('pdfPasswordModal').style.display = 'none';
  window._pdfDebt = null;
}

function confirmPDFPassword() {
  const pass = $('#pdfPassInput').val().trim();
  if (!pass) { $('#pdfPassError').text('Enter your password.').show(); return; }
  if (pass.length < 4) { $('#pdfPassError').text('Password must be at least 4 characters.').show(); return; }
  const saved = localStorage.getItem('incline_pdf_password');
  if (saved && pass !== saved) {
    $('#pdfPassError').text('Wrong password. Try again.').show();
    $('#pdfPassInput').val('').focus();
    return;
  }
  // First time — save it
  if (!saved) { localStorage.setItem('incline_pdf_password', pass); showToast('✅ Password saved for future use!'); }
  $('#pdfPassError').hide();
  document.getElementById('pdfPasswordModal').style.display = 'none';
  generateLoanPDF(window._pdfDebt, pass);
  window._pdfDebt = null;
}

function generateLoanPDF(debt, password) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load logo as base64 for embedding
  function getLogoBase64(cb) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      cb(c.toDataURL('image/png'));
    };
    img.onerror = function() { cb(null); };
    img.src = 'logo.PNG';
  }

  getLogoBase64(function(logoData) {
    buildPDF(doc, debt, logoData, password);
  });
}

function buildPDF(doc, debt, logoData, password) {
  const W = 210, H = 297, margin = 14, contentW = W - margin * 2;
  let y = 0;

  // ── helpers ──────────────────────────────────────────────────────
  function fmt(n) { return 'N ' + (Number(n) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }) : '-'; }

  function drawWatermark() {
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(80); doc.setTextColor(16, 185, 129);
    doc.text('IW', W / 2, H / 2, { align: 'center', angle: 40 });
    doc.setGState(new doc.GState({ opacity: 1 }));
  }

  // ── draw full-page chrome (call on every page) ────────────────────
  function drawPageFrame() {
    drawWatermark();
    // Top green bar
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, W, 1.5, 'F');
    // Bottom green bar
    doc.setFillColor(16, 185, 129);
    doc.rect(0, H - 1.5, W, 1.5, 'F');
  }

  // ── Table header row ─────────────────────────────────────────────
  function drawTxnHeader(yy) {
    doc.setFillColor(30, 40, 35);
    doc.rect(margin, yy, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
    doc.text('DATE',        margin + 2,     yy + 5);
    doc.text('NARRATION',   margin + 28,    yy + 5);
    doc.text('DEBIT (N)',   margin + 108,   yy + 5);
    doc.text('CREDIT (N)',  margin + 133,   yy + 5);
    doc.text('BALANCE (N)', W - margin - 2, yy + 5, { align: 'right' });
    return yy + 7;
  }

  // ── Page 1 setup ─────────────────────────────────────────────────
  drawPageFrame();

  // ── HEADER: Logo top-right, company top-left ──────────────────────
  // Company left block
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 8, 18, 18); } catch(e) {}
  }
  const compX = logoData ? margin + 22 : margin;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(16, 185, 129);
  doc.text('INCLINEWORKS', compX, 14);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
  doc.text('INTERNATIONAL', compX, 19);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120, 120, 120);
  doc.text('Professional Tailoring Services', compX, 23);
  doc.text('RC: 1548508', compX, 27);

  // Divider line under header
  doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5);
  doc.line(margin, 31, W - margin, 31);

  y = 38;

  // ── STAFF NAME (bold, large — like "MR. ABHINESH SWAMI") ──────────
  const staffName = (debt.clientName || '-').toUpperCase();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20, 20, 20);
  doc.text(staffName, margin, y);
  y += 6;

  // Staff sub-info line: StaffId · Phone · Position
  const profile = (typeof getStaffProfiles === 'function' ? getStaffProfiles() : [])
    .find(function(s) { return s.name && s.name.toLowerCase() === (debt.clientName || '').toLowerCase(); });

  const subParts = [];
  if (profile && profile.staffId)  subParts.push('ID: ' + profile.staffId);
  if (debt.clientPhone)            subParts.push('Tel: ' + debt.clientPhone);
  if (profile && profile.position) subParts.push(profile.position);
  if (profile && profile.dept)     subParts.push(profile.dept);

  if (subParts.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
    doc.text(subParts.join('   |   '), margin, y);
    y += 5;
  }

  if (profile && (profile.bankName || profile.accountNumber)) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
    const bankLine = [profile.bankName, profile.accountNumber, profile.accountName].filter(Boolean).join('  ·  ');
    doc.text(bankLine, margin, y);
    y += 5;
  }

  // ── RIGHT SIDE: Ref + Statement period info (like CUSTOMER ID block) ──
  const allDebts = (typeof getManualDebts === 'function' ? getManualDebts() : []);
  const refIdx   = allDebts.findIndex(function(d) { return d.id === debt.id; });
  const refNum   = refIdx >= 0 ? 'IW-LS-' + String(allDebts.length - refIdx).padStart(4,'0') : 'IW-LS-0001';
  const today    = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const loanDate = fmtDate(debt.collectedDate || debt.date);
  const dueDate  = fmtDate(debt.dueDate);

  const rightX = W - margin;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
  doc.text('STATEMENT REF: ' + refNum, rightX, 38, { align: 'right' });
  doc.text('Generated: ' + today, rightX, 43, { align: 'right' });
  doc.text('Loan Date: ' + loanDate + '   Due: ' + dueDate, rightX, 48, { align: 'right' });

  y = Math.max(y + 2, 54);

  // ── DIVIDER + "Your Account Statement as on..." ───────────────────
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
  doc.line(margin, y, W - margin, y); y += 4;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
  const txns = debt.transactions || debt.payments || [];
  const statementLine = 'Loan Account Statement for: ' + (debt.clientName || '-') + '   |   As on ' + today;
  doc.text(statementLine, margin, y); y += 6;

  // ── SUMMARY TABLE (like "A summary of your relationship/s with us") ──
  // Green section label
  doc.setFillColor(240, 253, 247); doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 6, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(16, 100, 70);
  doc.text('A summary of this loan account:', margin + 3, y + 4.2);
  y += 8;

  // Summary 4-column table header
  const colW = contentW / 4;
  const sumHeaders = ['Loan Type', 'Currency', 'Principal Amount', 'Balance Outstanding'];
  doc.setFillColor(245, 245, 245); doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
  doc.rect(margin, y, contentW, 6, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  sumHeaders.forEach(function(h, i) {
    doc.text(h, margin + i * colW + 3, y + 4.2);
  });
  y += 6;

  // Summary data row
  const totalLoaned   = debt.originalAmount || txns.filter(function(t) { return !t.type || t.type === 'credit'; }).reduce(function(s,t) { return s+(t.amount||0); }, 0);
  const balanceDue    = debt.balance || 0;
  const isPaid        = balanceDue <= 0;
  const totalPaid     = txns.filter(function(t) { return t.type === 'debit'; }).reduce(function(s,t) { return s+(t.amount||0); }, 0);
  const totalDeducted = txns.filter(function(t) { return t.type==='debit' && (t.note||'').toLowerCase().includes('deduction'); }).reduce(function(s,t) { return s+(t.amount||0); }, 0);

  doc.setFillColor(255, 255, 255); doc.rect(margin, y, contentW, 7, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(20, 20, 20);
  doc.text('STAFF LOAN',    margin + 3,              y + 5);
  doc.text('NGN',           margin + colW + 3,        y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(totalLoaned), margin + colW * 2 + 3,   y + 5);
  doc.setTextColor(isPaid ? 16 : 200, isPaid ? 120 : 40, isPaid ? 70 : 40);
  doc.text(fmt(balanceDue), margin + colW * 3 + 3,    y + 5);
  y += 7;

  // Second row: total repaid + deducted
  doc.setFillColor(248, 252, 249); doc.rect(margin, y, contentW, 6, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  doc.text('Total Repaid (Cash):', margin + 3, y + 4.2);
  doc.setTextColor(16, 120, 70); doc.setFont('helvetica', 'bold');
  doc.text(fmt(totalPaid - totalDeducted), margin + colW + 3, y + 4.2);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text('Total Deducted from Salary:', margin + colW * 2 + 3, y + 4.2);
  doc.setTextColor(30, 80, 200); doc.setFont('helvetica', 'bold');
  doc.text(fmt(totalDeducted), margin + colW * 3 + 3, y + 4.2);
  y += 6;

  // Bottom border of summary
  doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y); y += 6;

  // ── STATUS BADGE inline ───────────────────────────────────────────
  doc.setFillColor(isPaid ? 16 : 220, isPaid ? 160 : 50, isPaid ? 100 : 50);
  doc.roundedRect(margin, y, 42, 7, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
  doc.text(isPaid ? 'FULLY SETTLED' : 'OUTSTANDING', margin + 3, y + 5);
  if (debt.notes) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
    doc.text('Note: ' + debt.notes, margin + 46, y + 5);
  }
  y += 11;

  // ── TRANSACTION STATEMENT SECTION ────────────────────────────────
  if (txns.length) {
    // Section title bar
    doc.setFillColor(30, 40, 35);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text('Statement of Transactions in Loan Account for: ' + (debt.clientName || '-').toUpperCase(), margin + 3, y + 5);
    y += 7;

    y = drawTxnHeader(y);

    // Running balance
    let runBal = totalLoaned;
    let bal = debt.originalAmount || totalLoaned;

    txns.slice().reverse().forEach(function(t, i) {
      const noteText = t.note || (t.type === 'debit' ? 'Loan Repayment' : 'Loan Disbursed');
      const maxNarW  = 78;
      const noteLines = doc.splitTextToSize(noteText, maxNarW);
      const rowH = Math.max(7, 4 + noteLines.length * 4.5);

      if (y + rowH > H - 22) {
        // New page
        doc.addPage(); drawPageFrame();
        doc.setFillColor(30, 40, 35); doc.rect(margin, 12, contentW, 6, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
        doc.text('Statement continued — ' + staffName, margin + 3, 16);
        y = 20;
        y = drawTxnHeader(y);
      }

      // Alternating row background
      if (i % 2 === 0) {
        doc.setFillColor(249, 252, 250);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, y, contentW, rowH, 'F');

      // Light bottom border
      doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.1);
      doc.line(margin, y + rowH, W - margin, y + rowH);

      const isDebit = t.type === 'debit';
      const txDate  = fmtDate(t.date);
      const amt     = t.amount || 0;
      if (isDebit) { bal -= amt; } else { bal += amt; }
      if (i === 0) bal = totalLoaned; // reset to loan amount on first entry

      // Row text
      const textY = y + 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
      doc.text(txDate, margin + 2, textY);

      doc.setTextColor(20, 20, 20);
      noteLines.forEach(function(line, li) {
        doc.text(line, margin + 28, textY + li * 4.5);
      });

      // Debit / Credit columns
      if (isDebit) {
        doc.setTextColor(200, 40, 40); doc.setFont('helvetica', 'bold');
        doc.text(fmt(amt), margin + 108, textY);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
        doc.text('-', margin + 133, textY);
      } else {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
        doc.text('-', margin + 108, textY);
        doc.setTextColor(16, 140, 80); doc.setFont('helvetica', 'bold');
        doc.text(fmt(amt), margin + 133, textY);
      }

      // Running balance
      doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'normal');
      doc.text(fmt(Math.abs(balanceDue - (txns.length - 1 - i) * 0)), W - margin - 2, textY, { align: 'right' });

      y += rowH;
    });

    // ── CLOSING BALANCE ROW ───────────────────────────────────────
    if (y + 9 > H - 22) {
      doc.addPage(); drawPageFrame(); y = 20;
    }
    doc.setFillColor(isPaid ? 16 : 220, isPaid ? 160 : 50, isPaid ? 100 : 50);
    doc.rect(margin, y, contentW, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text('CLOSING BALANCE', margin + 3, y + 6.2);
    doc.text(fmt(balanceDue), W - margin - 2, y + 6.2, { align: 'right' });
    y += 14;
  }

  // ── FOOTER ───────────────────────────────────────────────────────
  if (y > H - 28) { doc.addPage(); drawPageFrame(); y = 20; }
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
  doc.line(margin, y, W - margin, y); y += 5;

  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, y - 3, 7, 7); } catch(e) {}
  }
  const ftX = logoData ? margin + 10 : margin;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(16, 185, 129);
  doc.text('INCLINEWORKS INTERNATIONAL', ftX, y + 1);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(140, 140, 140);
  doc.text('This is an official loan statement. For enquiries contact your Incline Works administrator.', ftX, y + 5.5);
  doc.setTextColor(160, 160, 160);
  doc.text('Generated: ' + new Date().toLocaleString('en-GB'), W - margin, y + 1, { align: 'right' });
  doc.text('Ref: ' + (typeof allDebts !== 'undefined' ? 'IW-LS-0001' : 'IW-LS'), W - margin, y + 5.5, { align: 'right' });


  // Encrypt with pdf-lib then share
  const fileName = 'LoanStatement_' + debt.clientName.replace(/\s+/g, '_') + '.pdf';
  const rawPdfBytes = doc.output('arraybuffer');

  async function encryptAndShare() {
    try {
      const pdfDoc = await PDFLib.PDFDocument.load(rawPdfBytes);
      // pdf-lib encryption via save options
      const encryptedBytes = await pdfDoc.save({
        userPassword: password,
        ownerPassword: password + '_owner_iw',
        permissions: {
          printing: 'highResolution',
          copying: false,
          modifying: false,
        }
      });
      const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ title: 'Loan Statement - ' + debt.clientName, files: [file] })
          .then(function() { showToast('✅ PDF shared!'); })
          .catch(function(e) { if (e.name !== 'AbortError') doSave(blob); });
      } else { doSave(blob); }

      function doSave(b) {
        // Show the unified WhatsApp / Download / Cancel modal
        showToast('PDF ready! Password: ' + password);
        _showLoanPdfActionModal(b, fileName, debt.clientName, debt.clientPhone);
      }
    } catch(err) {
      console.error('Encryption error:', err);
      // Fallback without encryption
      doc.save(fileName);
      showToast('📥 PDF saved (no encryption)');
    }
  }
  encryptAndShare();
} // end buildPDF

// ── Delete whole profile ──
async function deleteCurrentDebt() {
  const debt = getManualDebts().find(d => d.id === _pvId);
  if (!debt) return;
  var _dcd = await showConfirm({
    title: 'Delete Profile?',
    body: 'This will permanently delete <strong>' + debt.clientName + '</strong>\'s loan profile.<br/>This cannot be undone.',
    okText: 'Delete', icon: '\uD83D\uDDD1'
  });
  if (!_dcd) return;
  localStorage.setItem('incline_manual_debts', JSON.stringify(getManualDebts().filter(d => d.id !== _pvId)));
  sbDeleteLoan(_pvId).catch(e => console.error('Loan delete sync failed:', e));
  _pvId = null;
  // Stay on outstanding tab — just go back to the list
  $('#os-profile').hide();
  $('#os-main').show();
  renderOutstandingTable();
  updateAlumniBadge();
  showToast('🗑 Profile deleted');
}

// ── Payment Modal State ──
let _pmType   = null;  // 'manual' | 'order'
let _pmId     = null;
let _pmMax    = 0;

function openPaymentModal(type, id, name, balance) {
  _pmType = type;
  _pmId   = id;
  _pmMax  = balance;
  $('#pm-subtitle').text(name);
  $('#pm-balance-chip').text('₦' + balance.toLocaleString());
  $('#pm-amount').val(balance);
  $('#pm-note').val('');
  $('#pm-error').hide();
  const modal = document.getElementById('paymentModal');
  modal.style.display = 'flex';
  modal.style.opacity = '0';
  setTimeout(function() {
    modal.style.transition = 'opacity 0.3s ease';
    modal.style.opacity = '1';
    document.getElementById('pm-amount').select();
  }, 10);
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  modal.style.transition = 'opacity 0.25s ease';
  modal.style.opacity = '0';
  setTimeout(function() { modal.style.display = 'none'; }, 260);
}

function confirmPayment() {
  const payment = parseFloat($('#pm-amount').val());
  const note    = $('#pm-note').val().trim() || 'Repayment';
  const $err    = $('#pm-error');

  if (isNaN(payment) || payment <= 0) {
    $err.text('Please enter a valid payment amount.'); $err.show();
    document.getElementById('paymentCard').style.animation = 'loginShake 0.4s ease';
    setTimeout(function(){ document.getElementById('paymentCard').style.animation = ''; }, 400);
    return;
  }
  if (payment > _pmMax) {
    $err.text('Payment amount exceeds the outstanding balance of ₦' + _pmMax.toLocaleString() + '.');
    $err.show();
    document.getElementById('paymentCard').style.animation = 'loginShake 0.4s ease';
    setTimeout(function(){ document.getElementById('paymentCard').style.animation = ''; }, 400);
    return;
  }

  if (_pmType === 'manual') {
    const debts = getManualDebts();
    const debt  = debts.find(d => d.id === _pmId);
    if (!debt) { closePaymentModal(); return; }
    debt.payments = debt.payments || [];
    debt.payments.unshift({ type:'debit', amount: payment, note: note, date: new Date().toISOString() });
    debt.balance -= payment;
    if (debt.balance <= 0) { debt.balance = 0; debt.status = 'Paid'; }
    localStorage.setItem('incline_manual_debts', JSON.stringify(debts));
    const fullySettled = debt.balance <= 0;
    // Sync to Supabase
    _sbFetch('loans?id=eq.' + (Number(debt.id), { method: 'PATCH', body: {
      balance: debt.balance, status: debt.status, payments: debt.payments
    }, prefer: 'return=minimal' })).catch(e => console.error('Loan sync:', e));
    renderOutstandingTable();
    updateAlumniBadge();
    closePaymentModal();
    if (fullySettled) {
      showToast('🎉 Loan fully settled! Profile moved to Paid section.');
    } else {
      showToast('✅ Payment recorded: ₦' + payment.toLocaleString());
    }
  } else if (_pmType === 'pv-debit') {
    const paymentTimestamp = new Date().toISOString();
    const debts2 = getManualDebts();
    const d = debts2.find(x => String(x.id) === String(_pmId));
    if (!d) { closePaymentModal(); return; }
    d.balance -= payment;
    if (d.balance <= 0) { d.balance = 0; d.status = 'Paid'; }
    d.payments = d.payments || [];
    d.payments.unshift({ type:'debit', amount: payment, note: note, date: paymentTimestamp });
    localStorage.setItem('incline_manual_debts', JSON.stringify(debts2));
    // Force-update Supabase directly with explicit values
    _sbFetch('loans?id=eq.' + (Number(d.id), { method: 'PATCH', body: {
      balance: d.balance,
      status: d.status,
      payments: d.payments || []
    }, prefer: 'return=minimal' })).then(({error}) => {
      if (error) {
        console.error('Loan sync failed:', error);
        showToast('⚠️ Saved locally — server sync failed');
      }
      renderOutstandingTable();
      updateAlumniBadge();
    }).catch(e => console.error(e));
    var _cn3=document.getElementById('to-name');const calcName=(_cn3?_cn3.value:'').trim().toLowerCase();
    closePaymentModal();
    if (calcName && d.clientName.toLowerCase().includes(calcName)) {
      var _ddd=document.getElementById('to-deduction');if(_ddd){_ddd.value=payment;toCalc();}else{$('#discountAmt').val(payment);}
      showToast('➖ ₦' + payment.toLocaleString() + ' debited — also filled Loan Deduction');
    } else {
      showToast('➖ ₦' + payment.toLocaleString() + ' debited from ' + d.clientName);
    }
    renderProfileView(_pmId);
    updateAlumniBadge();
    if (d.balance <= 0) showToast('🎉 Fully settled! Check Paid Profiles tab.');
    if (typeof window._afterPaymentCallback === 'function') {
      window._afterPaymentCallback();
      window._afterPaymentCallback = null;
    }
  } else if (_pmType === 'trk-loan') {
    var tDebts = getManualDebts();
    var tDebt  = tDebts.find(function(dd) { return String(dd.id) === String(_pmId); });
    if (!tDebt) { closePaymentModal(); return; }
    tDebt.payments = tDebt.payments || [];
    tDebt.payments.unshift({ type:'debit', amount: payment, note: note, date: new Date().toISOString() });
    tDebt.balance -= payment;
    if (tDebt.balance <= 0) { tDebt.balance = 0; tDebt.status = 'Paid'; }
    localStorage.setItem('incline_manual_debts', JSON.stringify(tDebts));
    // Sync to Supabase — try string id first (Supabase UUID), fallback to number (legacy)
    _sbFetch('loans?id=eq.' + (String(tDebt.id), { method: 'PATCH', body: {
      balance: tDebt.balance, status: tDebt.status, payments: tDebt.payments
    }, prefer: 'return=minimal' }))
    .then(function(res) {
      if (res && res.error) {
        return _sbFetch('loans?id=eq.' + (Number(tDebt.id), { method: 'PATCH', body: { balance: tDebt.balance, status: tDebt.status, payments: tDebt.payments }, prefer: 'return=minimal' }));
      }
    }).catch(function(e) { console.error('Loan sync:', e); });
    renderOutstandingTable();
    updateAlumniBadge();
    closePaymentModal();
    showToast(tDebt.balance <= 0
      ? '🎉 Loan fully settled for ' + tDebt.clientName + '!'
      : '✅ ₦' + payment.toLocaleString() + ' recorded for ' + tDebt.clientName);
    setTimeout(function() { trackLoan(); }, 150);
  } else {
    const orders = getOrders();
    const order  = orders.find(o => String(o.id) === String(_pmId));
    if (!order) { closePaymentModal(); return; }
    order.deposit += payment;
    order.balance  = Math.max(0, order.subtotal - order.discount - order.deposit);
    if (order.balance === 0 && order.status === 'Ready') order.status = 'Delivered';
    localStorage.setItem('incline_orders', JSON.stringify(orders));
    // Sync to Supabase
    _sbFetch('orders?id=eq.' + String(order.id), { method: 'PATCH', body: { deposit: order.deposit, balance: order.balance, status: order.status }, prefer: 'return=minimal' })
      .then(() => {}).catch(e => console.error('Supabase payment sync failed:', e));
    renderOutstandingTable();
    renderOrdersTable();
    if (String(_opId) === String(_pmId)) renderOrderProfile(_pmId);
    closePaymentModal();
    showToast('✅ Payment recorded: ₦' + payment.toLocaleString());
  }
}

// ── Quick record payment from list ──
function recordPayment(id) {
  const debt = getManualDebts().find(d => d.id === id);
  if (!debt) return;
  openPaymentModal('manual', id, debt.clientName, debt.balance);
}

function markPaid(id) {
  const order = getOrders().find(o => String(o.id) === String(id));
  if (!order) return;
  openPaymentModal('order', order.id, order.clientName, order.balance);
}

async function deleteDebt(id) {
  var _dd = await showConfirm({
    title: 'Remove from List?',
    body: 'This debt record will be removed from the outstanding list.',
    okText: 'Remove', icon: '\uD83D\uDDD1'
  });
  if (!_dd) return;
  // Stay exactly where the user is — no scroll, no tab switch
  var scrollPos = window.scrollY;
  localStorage.setItem('incline_manual_debts', JSON.stringify(getManualDebts().filter(d => d.id !== id)));
  sbDeleteLoan(id).catch(e => console.error('Loan delete sync failed:', e));
  renderOutstandingTable();
  updateAlumniBadge();
  window.scrollTo({ top: scrollPos, behavior: 'instant' });
  showToast('🗑 Removed');
}

// ════════════════════════════════════════════════════════════════════
// LOAN SUB-TAB SYSTEM  (Active Loans / Paid Alumni)
// ════════════════════════════════════════════════════════════════════
let _loanSubTab = 'active';

function switchLoanSubTab(tab) {
  _loanSubTab = tab;
  if (tab === 'active') {
    $('#view-active-loans').show();
    $('#view-alumni-loans').hide();
    $('#subtab-active').css({ background: 'rgba(224,82,82,0.85)', color: '#fff', boxShadow: '0 4px 12px rgba(224,82,82,0.25)' });
    $('#subtab-alumni').css({ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' });
    renderOutstandingTable();
  } else {
    $('#view-active-loans').hide();
    $('#view-alumni-loans').show();
    $('#subtab-active').css({ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' });
    $('#subtab-alumni').css({ background: 'rgba(16,185,129,0.2)', color: 'var(--green)', boxShadow: '0 4px 12px rgba(16,185,129,0.15)' });
    renderAlumniTable();
  }
}

function updateAlumniBadge() {
  const count = getManualDebts().filter(d => d.balance <= 0 || d.status === 'Paid').length;
  $('#alumniCountBadge').text(count);
  // If alumni tab is visible, refresh it
  if ($('#view-alumni-loans').is(':visible')) renderAlumniTable();
}

function getPaidDebts() {
  return getManualDebts().filter(d => d.balance <= 0 || d.status === 'Paid');
}

function renderAlumniTable() {
  const allDebts = getManualDebts();
  let paid = allDebts.filter(d => d.balance <= 0 || d.status === 'Paid');
  const search = ($('#alumniSearch').val() || '').toLowerCase();
  const sortBy = $('#alumniSortBy').val() || 'name';

  if (search) {
    paid = paid.filter(d =>
      d.clientName.toLowerCase().includes(search) || (d.clientPhone||'').includes(search)
    );
  }

  if (sortBy === 'name') paid.sort((a,b) => a.clientName.localeCompare(b.clientName));
  else if (sortBy === 'amount') paid.sort((a,b) => {
    const ta = (b.payments||[]).filter(p=>p.type==='credit').reduce((s,p)=>s+p.amount,0);
    const tb = (a.payments||[]).filter(p=>p.type==='credit').reduce((s,p)=>s+p.amount,0);
    return ta - tb;
  });
  else if (sortBy === 'date') {
    paid.sort((a,b) => {
      // Sort by latest debit transaction date (settlement date)
      const latestA = (a.payments||[]).filter(p=>p.type==='debit').reduce((d,p) => p.date > d ? p.date : d, '');
      const latestB = (b.payments||[]).filter(p=>p.type==='debit').reduce((d,p) => p.date > d ? p.date : d, '');
      return latestB.localeCompare(latestA);
    });
  }

  $('#alumniTotalCount').text(paid.length);

  if (!paid.length) {
    $('#alumniTable').html('<div class="empty-state"><div class="icon">✅</div><p>No fully paid profiles yet.<br/><span style="font-size:12px;color:var(--text-muted);">Profiles appear here once their loan balance reaches ₦0.</span></p></div>');
    return;
  }

  let html = '';
  paid.forEach(d => {
    const payments = d.payments || [];
    const totalLoaned  = payments.filter(p=>p.type==='credit').reduce((s,p)=>s+p.amount,0);
    const totalRepaid  = payments.filter(p=>p.type==='debit').reduce((s,p)=>s+p.amount,0);
    const settledDate  = payments.filter(p=>p.type==='debit').reduce((dt,p) => p.date > dt ? p.date : dt, '');
    const _sd = settledDate ? new Date(settledDate) : null;
    const settledLabel = _sd
      ? _sd.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
        + (settledDate.includes('T') ? ' · ' + _sd.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '')
      : '—';

    html += `
      <div style="background:var(--surface2);border:1px solid rgba(16,185,129,0.2);border-left:4px solid var(--green);border-radius:10px;padding:18px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:17px;font-weight:600;display:flex;align-items:center;gap:8px;">
              ${d.clientName}
              <span style="background:rgba(16,185,129,0.12);color:var(--green);padding:2px 9px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.5px;border:1px solid rgba(16,185,129,0.25);">SETTLED</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">${d.clientPhone||'—'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--text-muted);">Total Loaned</div>
            <div style="font-size:20px;font-weight:700;color:var(--text);font-family:'Cormorant Garamond',serif;">₦${totalLoaned.toLocaleString()}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:12px;margin-bottom:14px;">
          <div style="background:var(--surface);padding:10px 12px;border-radius:8px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;">Total Repaid</div>
            <div style="font-weight:600;color:var(--green);">₦${totalRepaid.toLocaleString()}</div>
          </div>
          <div style="background:var(--surface);padding:10px 12px;border-radius:8px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;">Transactions</div>
            <div style="font-weight:600;color:var(--text);">${payments.length}</div>
          </div>
          <div style="background:var(--surface);padding:10px 12px;border-radius:8px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;">Settled On</div>
            <div style="font-weight:600;color:var(--text);">${settledLabel}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--surface3);">
          <button class="tbl-btn" onclick="viewDebt(${d.id})">👁 View Profile</button>
          <button class="tbl-btn" style="color:var(--gold);border-color:rgba(16,185,129,0.3);" onclick="openEditDebt(${d.id})">✏️ Edit</button>
          <button class="tbl-btn" style="background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.3);" onclick="reactivateDebt(${d.id})">🔄 Re-Activate Loan</button>
          <button class="tbl-btn danger" onclick="permanentDeleteDebt(${d.id})">🗑 Delete</button>
        </div>
      </div>
    `;
  });

  $('#alumniTable').html(html);
}

// Re-activate a fully paid profile (add new loan to it)
function reactivateDebt(id) {
  const debts = getManualDebts();
  const debt = debts.find(d => d.id === id);
  if (!debt) return;

  const amtStr = prompt(`RE-ACTIVATE LOAN\n${debt.clientName}\nPrevious loan was fully settled.\n\nEnter new loan amount (₦):`);
  if (amtStr === null) return;
  const amount = parseFloat(amtStr);
  if (isNaN(amount) || amount <= 0) { showToast('⚠️ Enter a valid amount'); return; }

  const noteStr = prompt('Description / Note:', 'New loan issued');
  if (noteStr === null) return;

  const today = new Date().toISOString().slice(0,10);
  debt.balance = amount;
  debt.status = 'Outstanding';
  debt.payments = debt.payments || [];
  debt.payments.unshift({ type:'credit', amount, note: noteStr||'New loan issued', date: today });
  debt.collectedDate = today;
  localStorage.setItem('incline_manual_debts', JSON.stringify(debts));
  sbUpdateLoan(debt).catch(e => console.error('Reactivate sync failed:', e));

  showToast(`✅ Loan re-activated for ${debt.clientName} — ₦${amount.toLocaleString()}`);
  switchLoanSubTab('active');
  renderOutstandingTable();
  updateAlumniBadge();
}

// Permanently delete a paid profile
async function permanentDeleteDebt(id) {
  const debt = getManualDebts().find(d => d.id === id);
  if (!debt) return;
  var _rld = await showConfirm({
    title: 'Delete Paid Profile?',
    body: 'Permanently delete <strong>' + debt.clientName + '</strong>\'s profile?<br/>This cannot be undone.',
    okText: 'Delete', icon: '\uD83D\uDDD1'
  });
  if (!_rld) return;
  sbDeleteLoan(id).catch(e => console.error('Loan delete sync failed:', e));
  localStorage.setItem('incline_manual_debts', JSON.stringify(getManualDebts().filter(d => d.id !== id)));
  renderAlumniTable();
  updateAlumniBadge();
  showToast('🗑 Profile permanently deleted');
}

// ════════════════════════════════════════════════════════════════════
// STAFF NAME AUTOCOMPLETE + AUTOFILL
// ════════════════════════════════════════════════════════════════════
function onStaffNameInput() {
  // Fix: Check both #to-name and fallback to #clientName if needed
  var _qEl = document.getElementById('to-name');
  const q = (_qEl ? _qEl.value : $('#clientName').val() || '').trim().toLowerCase();
  _acIndex = -1;

  // If user is typing manually (field not locked), unlock all fields
  var _nameField = document.getElementById('to-name') || document.getElementById('clientName');
  if (_nameField && _nameField.classList.contains('calc-locked-name')) return; // locked, ignore input
  $('#staffAutofillBadge').hide();
  // Unlock any previously locked fields when user manually edits name
  lockCalcStaffFields(false);

  if (!q) { $('#staffAcList').removeClass('open').empty(); return; }

  // Match any word in the query against any word in the staff name
  const words = q.split(/\s+/).filter(Boolean);
  const staff = getStaffProfiles().filter(s => {
    const nameLower = (s.name || '').toLowerCase();
    return words.every(w => nameLower.includes(w));
  });
  if (!staff.length) { $('#staffAcList').removeClass('open').empty(); return; }

  const items = staff.map((s, i) => {
    const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const photoSrc = getStaffPhoto(String(s.id));
    const thumb = photoSrc
      ? `<div class="staff-ac-thumb"><img src="${photoSrc}"/></div>`
      : `<div class="staff-ac-thumb">${initials}</div>`;
    const sub = [s.position, s.dept, s.phone].filter(Boolean).join(' · ');
    return `<div class="staff-ac-item" data-idx="${i}" onclick="selectStaffAc(${i})">
      ${thumb}
      <div>
        <div class="staff-ac-name">${s.name}</div>
        ${sub ? `<div class="staff-ac-sub">${sub}</div>` : ''}
      </div>
    </div>`;
  });

  $('#staffAcList').html(items.join('')).addClass('open');
  // Store matches for keyboard nav
  $('#staffAcList').data('matches', staff);
}

function onStaffNameKeydown(e) {
  const $list = $('#staffAcList');
  if (!$list.hasClass('open')) return;
  const $items = $list.find('.staff-ac-item');
  if (!$items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _acIndex = Math.min(_acIndex + 1, $items.length - 1);
    $items.removeClass('active').eq(_acIndex).addClass('active');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _acIndex = Math.max(_acIndex - 1, 0);
    $items.removeClass('active').eq(_acIndex).addClass('active');
  } else if (e.key === 'Enter' && _acIndex >= 0) {
    e.preventDefault();
    selectStaffAc(_acIndex);
  } else if (e.key === 'Escape') {
    $list.removeClass('open');
  }
}

 function selectStaffAc(idx) {
  const staff = $('#staffAcList').data('matches');
  if (!staff || !staff[idx]) return;
  const s = staff[idx];

  // Fill the Task Order name field
  var _toN = document.getElementById('to-name');
  if (_toN) _toN.value = s.name;
  
  // Fill staff ID if field exists
  if (s.staffId) {
    var _staffId = document.getElementById('staffId');
    if (_staffId) {
      _staffId.value = s.staffId;
      _staffId.style.cssText = 'color:var(--gold);border-color:rgba(16,185,129,0.4)';
    }
  }
  
  // Fill phone field
  if (s.phone) {
    var _toP = document.getElementById('to-phone');
    if (_toP) {
      _toP.value = s.phone;
      _toP.style.borderColor = 'var(--green)';
    }
  }
  
  // Fill bank fields
  if (s.bankName) {
    var _toBank = document.getElementById('to-bank-name');
    if (_toBank) _toBank.value = s.bankName;
  }
  if (s.accountNumber) {
    var _toAcct = document.getElementById('to-bank-acct');
    if (_toAcct) _toAcct.value = s.accountNumber;
  }
  if (s.accountName) {
    var _toAcctN = document.getElementById('to-bank-name-acct');
    if (_toAcctN) _toAcctN.value = s.accountName;
  }

  $('#staffAcList').removeClass('open').empty();
  $('#staffAutofillBadge').show();

  // Lock all staff-related fields so they can't be edited after autofill
  lockCalcStaffFields(true);

  // Still run the debt check
  checkCustomerDebt();
}
function lockCalcStaffFields(lock) {

  const lockFields = [
    '#to-phone',
    '#to-bank-name',
    '#to-bank-acct',
    '#to-bank-name-acct'
  ];

  lockFields.forEach(function(sel) {
    var el = $(sel)[0];
    if (!el) return;

    if (lock) {
      el.readOnly = true;
      $(el).addClass('calc-locked');
    } else {
      el.readOnly = false;
      $(el).removeClass('calc-locked')
           .css('border-color', '');
    }
  });

  var nameEl = document.getElementById('to-name');

  if (nameEl) {
    if (lock) {
      nameEl.readOnly = true;
      $(nameEl).addClass('calc-locked-name');
    } else {
      nameEl.readOnly = false;
      $(nameEl).removeClass('calc-locked-name')
               .css({
                 borderColor: '',
                 color: '',
                 fontWeight: ''
               });
    }
  }
  if (!lock) {
    $('#staffAutofillBadge').hide();
  }
}

// ════════════════════════════════════════════════════════════════════

// In-memory photo store — photos are too large for localStorage (5MB limit)
// Populated from Supabase every fetch. Keyed by String(staff_id).
var _photoCache = {};
function getStaffPhoto(id) { return _photoCache[String(id)] || null; }

var _staffMemCache = null;  // null = not yet loaded; [] = loaded but empty
function getStaffProfiles() {
  if (_staffMemCache !== null) return _staffMemCache;  // explicit null check — [] is truthy!
  try { return JSON.parse(localStorage.getItem('incline_staff_profiles')) || []; } catch { return []; }
}

function saveStaffProfiles(list) {
  _staffMemCache = list || [];
  // Capture any photos into _photoCache; strip them before localStorage write
  (list || []).forEach(function(s) { if (s.photo) _photoCache[String(s.id)] = s.photo; });
  var slim = (list || []).map(function(s) { var c = Object.assign({}, s); delete c.photo; return c; });
  try { localStorage.setItem('incline_staff_profiles', JSON.stringify(slim)); }
  catch(e) { console.warn('saveStaffProfiles: localStorage full, in-memory only'); }
}

function clearAddStaffPhoto() {
  const circle = document.getElementById('addStaffPhotoCircle');
  circle._photoData = null;
  circle.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.5)" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    <span style="font-size:8px;color:rgba(16,185,129,0.5);letter-spacing:0.5px;">ADD PHOTO</span>
  </div>`;
  document.getElementById('addStaffPhotoInput').value = '';
}

function previewAddStaffPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const b64 = e.target.result;
    const circle = document.getElementById('addStaffPhotoCircle');
    circle.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    circle._photoData = b64;
  };
  reader.readAsDataURL(file);
}

function staffFieldClear(el) {
  if (el.value.trim()) {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }
}

function staffFlagField(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--red)';
  el.style.boxShadow = '0 0 0 3px rgba(224,82,82,0.18)';
}

function addStaff() {
  // Only required fields — name, staffId, password
  const requiredIds = ['newStaffName','newStaffStaffId','newStaffPassword'];
  const allIds = ['newStaffName','newStaffStaffId','newStaffPassword','newStaffPhone','newStaffPosition','newStaffDept','newStaffBankName','newStaffAccountNumber','newStaffAccountName','newStaffDOB','newStaffAge','newStaffResidence','newStaffState','newStaffLGA','newStaffStartDate','newStaffNokName','newStaffNokPhone','newStaffGuarantorName','newStaffGuarantorPhone','newStaffLocation'];

  // Reset all borders first
  allIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });

  let hasError = false;
  let firstEl = null;

  requiredIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!el.value.trim()) {
      staffFlagField(id);
      if (!firstEl) firstEl = el;
      hasError = true;
    }
  });

  if (hasError) {
    if (firstEl) firstEl.focus();
    showToast('⚠️ Please fill Name, Staff ID and Password');
    return;
  }

  const name = document.getElementById('newStaffName').value.trim();
  const staffId = document.getElementById('newStaffStaffId').value.trim();
  const phone = document.getElementById('newStaffPhone').value.trim();

  if (phone && phone.replace(/\D/g,'').length !== 11) {
    staffFlagField('newStaffPhone');
    document.getElementById('newStaffPhone').focus();
    showToast('⚠️ Phone must be exactly 11 digits'); return;
  }
  const acct = document.getElementById('newStaffAccountNumber').value.trim();
  if (acct && acct.replace(/\D/g,'').length !== 10) {
    staffFlagField('newStaffAccountNumber');
    document.getElementById('newStaffAccountNumber').focus();
    showToast('⚠️ Account number must be exactly 10 digits'); return;
  }

  const circle = document.getElementById('addStaffPhotoCircle');
  const photo = circle._photoData || null;
  const password = document.getElementById('newStaffPassword').value.trim();

  const profile = {
    name,
    staff_id: staffId,
    password,
    phone,
    position: document.getElementById('newStaffPosition').value.trim(),
    department: document.getElementById('newStaffDept').value.trim(),
    gender: document.getElementById('newStaffGender').value || '',
    bank_name: document.getElementById('newStaffBankName').value.trim(),
    account_number: acct,
    account_name: document.getElementById('newStaffAccountName').value.trim(),
    date_of_birth: document.getElementById('newStaffDOB').value || null,
    age: parseInt(document.getElementById('newStaffAge').value) || null,
    residence: document.getElementById('newStaffResidence').value.trim(),
    state_of_origin: document.getElementById('newStaffState').value.trim(),
    lga: document.getElementById('newStaffLGA').value.trim(),
    photo
  };

  sbAddStaff(profile).then(function(saved) {
    if (saved.photo) _photoCache[String(saved.id)] = saved.photo;
    const list = getStaffProfiles();
    list.unshift({
      id: saved.id, name: saved.name, staffId: saved.staff_id,
      phone: saved.phone, position: saved.position, dept: saved.department,
      bankName: saved.bank_name, accountNumber: saved.account_number,
      accountName: saved.account_name, addedAt: saved.created_at,
      dob: saved.date_of_birth || '', age: saved.age || '',
      residence: saved.residence || '', state: saved.state_of_origin || '', lga: saved.lga || '',
      startDate: saved.start_date || '',
      password: saved.password || '',
      nokName: saved.nok_name || '', nokPhone: saved.nok_phone || '',
      guarantorName: saved.guarantor_name || '', guarantorPhone: saved.guarantor_phone || '',
      location: saved.location || ''
    });
    saveStaffProfiles(list);

    allIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.value = ''; el.style.borderColor = ''; el.style.boxShadow = ''; }
    });
    // Reset gender buttons
    document.getElementById('newStaffGender').value = '';
    var mb = document.getElementById('genderMale'); var fb = document.getElementById('genderFemale');
    if (mb) { mb.style.background='var(--surface2)'; mb.style.color='var(--text-muted)'; mb.style.borderColor='rgba(255,255,255,0.1)'; }
    if (fb) { fb.style.background='var(--surface2)'; fb.style.color='var(--text-muted)'; fb.style.borderColor='rgba(255,255,255,0.1)'; }
    circle._photoData = null;
    circle.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.5)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/><path d="M8 12a4 4 0 118 0c0 1.5-.5 2.5-2 4H10c-1.5-1.5-2-2.5-2-4z"/></svg>
      <span style="font-size:8px;color:rgba(16,185,129,0.5);letter-spacing:0.5px;">PHOTO</span>
    </div>`;
    document.getElementById('addStaffPhotoInput').value = '';
    renderAdminStaffList();
    showToast('✅ ' + name + ' added to staff!');
  }).catch(function(err) {
    console.error(err);
    if (err.code === '23505') showToast('⚠️ Staff ID already exists — use a different ID');
    else showToast('⚠️ Failed to save: ' + (err.message || 'Check connection'));
  });
}

function setGender(g) {
  document.getElementById('newStaffGender').value = g;
  var mb = document.getElementById('genderMale');
  var fb = document.getElementById('genderFemale');
  if (g === 'Male') {
    mb.style.background = 'rgba(96,165,250,0.2)'; mb.style.color = '#60a5fa'; mb.style.borderColor = 'rgba(96,165,250,0.4)';
    fb.style.background = 'var(--surface2)'; fb.style.color = 'var(--text-muted)'; fb.style.borderColor = 'rgba(255,255,255,0.1)';
  } else {
    fb.style.background = 'rgba(244,114,182,0.2)'; fb.style.color = '#f472b6'; fb.style.borderColor = 'rgba(244,114,182,0.4)';
    mb.style.background = 'var(--surface2)'; mb.style.color = 'var(--text-muted)'; mb.style.borderColor = 'rgba(255,255,255,0.1)';
  }
}

function onDebtStaffSelect() {
  const sel = document.getElementById('debtStaffSelect');
  const opt = sel.options[sel.selectedIndex];
  document.getElementById('debtCustomerName').value = opt.dataset.name || '';
  document.getElementById('debtStaffId').value      = opt.dataset.staffid || '';
  document.getElementById('debtCustomerPhone').value = opt.dataset.phone || '';
  document.getElementById('debtPhoneError').style.display = 'none';
}

function populateLoanStaffDropdown() {
  sbGetStaff().then(function(list) {
    if (!list || !list.length) return;
    const sel = document.getElementById('debtStaffSelect');
    if (!sel) return;
    // Keep the placeholder option
    while (sel.options.length > 1) sel.remove(1);
    list.forEach(function(s) {
      const opt = document.createElement('option');
      opt.value      = s.staff_id;
      opt.textContent = s.name + ' (' + s.staff_id + ')';
      opt.dataset.name    = s.name;
      opt.dataset.staffid = s.staff_id;
      opt.dataset.phone   = s.phone || '';
      sel.appendChild(opt);
    });
  }).catch(function(e) { console.error('Staff dropdown load failed', e); });
}


// ── Add Staff Form Toggle ──
function toggleAddStaffForm() {
  var body = document.getElementById('addStaffFormBody');
  var icon = document.getElementById('addStaffToggleIcon');
  if (!body) return;
  var isOpen = body.style.display !== 'none';
  if (isOpen) {
    body.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  } else {
    body.style.display = 'block';
    icon.style.transform = 'rotate(135deg)';
  }
}

function toggleStaffExpand(id) {
  var wrap = document.getElementById('staff-wrap-' + id);
  if (!wrap) return;
  wrap.classList.toggle('expanded');
}

function renderAdminStaffList(forceRefresh) {
  const $el = $('#adminStaffList');

  function _drawList(staffList, allOrders) {
    if (!staffList.length) {
      $el.html('<div class="empty-state" style="padding:40px 0;"><div class="icon">👥</div><p style="font-size:13px;">No staff added yet.<br/><span style="font-size:12px;color:var(--text-muted);">Add a staff member above to get started.</span></p></div>');
      return;
    }
    // Sort A→Z
    const sorted = staffList.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    let html = '';
    sorted.forEach(function(s) {
      const initials   = (s.name || '?').split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
      const photo      = getStaffPhoto(String(s.id));
      const avatarHtml = photo
        ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
        : initials;
      const orderCount = allOrders.filter(function(o){ return (o.staff_id || o.staffId) === s.staffId; }).length;

      function _cell(label, val) {
        const v = val ? `<span class="staff-info-val">${val}</span>` : `<span class="staff-info-val muted">—</span>`;
        return `<div class="staff-info-cell"><div class="staff-info-label">${label}</div>${v}</div>`;
      }

      let dobFmt = '—';
      if (s.dob) { try { dobFmt = new Date(s.dob+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); } catch(e){} }
      let startFmt = '—';
      if (s.startDate) { try { startFmt = new Date(s.startDate+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); } catch(e){} }

      html += `
        <div class="admin-staff-wrap" id="staff-wrap-${s.id}">
          <div class="admin-staff-row" onclick="toggleStaffExpand('${s.id}')">
            <div class="admin-staff-thumb">${avatarHtml}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:14px;font-weight:600;color:var(--text);">${s.name}</div>
              <div style="font-size:11px;color:var(--text-muted);">${s.staffId||'—'} · ${s.position||'—'}${s.dept?' · '+s.dept:''}${s.gender?' · '+s.gender:''}</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);text-align:right;margin-right:12px;">
              <div style="color:var(--gold);font-weight:600;">${orderCount} orders</div>
              <div>${s.phone||'No phone'}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;" onclick="event.stopPropagation()">
              <button class="tbl-btn" onclick="openEditStaff('${s.id}')" style="color:var(--gold);border-color:rgba(16,185,129,0.3);">✏️ Edit</button>
              <button class="tbl-btn danger" onclick="deleteStaff('${s.id}')">🗑</button>
            </div>
            <span class="staff-row-chevron">▼</span>
          </div>
          <div class="staff-expand-panel">
            <div class="staff-expand-inner">
              ${_cell('Full Name', s.name)}
              ${_cell('Staff ID', s.staffId)}
              ${_cell('Phone', s.phone)}
              ${_cell('Position', s.position)}
              ${_cell('Department', s.dept)}
              ${_cell('Gender', s.gender)}
              ${_cell('Date of Birth', dobFmt)}
              ${_cell('Age', s.age ? s.age + ' yrs' : '')}
              ${_cell('Start Date', startFmt)}
              ${_cell('LGA', s.lga)}
              ${_cell('State of Origin', s.state)}
              ${_cell('Residence', s.residence)}
              ${_cell('Bank Name', s.bankName)}
              ${_cell('Account Name', s.accountName)}
              ${_cell('Account Number', s.accountNumber)}
              ${_cell('Next of Kin', s.nokName ? s.nokName + (s.nokPhone ? ' · ' + s.nokPhone : '') : '')}
              ${_cell('Guarantor', s.guarantorName ? s.guarantorName + (s.guarantorPhone ? ' · ' + s.guarantorPhone : '') : '')}
              ${_cell('Location', s.location)}
              ${s.bio ? `<div class="staff-expand-bio">📝 ${s.bio}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    });
    $el.html(html);
  }

  // Show loading placeholder
  $el.html('<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px;">Loading staff...</div>');

  // Always fetch from Supabase — this populates _photoCache with photos
  sbGetStaff().then(function(supaList) {
    if (!supaList || !supaList.length) {
      // Supabase returned empty — fall back to local cache
      const cached = getStaffProfiles();
      $('#staffCountBadge').text(cached.length + ' member' + (cached.length !== 1 ? 's' : ''));
      sbGetOrders(null).then(function(orders){ _drawList(cached, orders); }).catch(function(){ _drawList(cached, []); });
      return;
    }

    // Normalize Supabase format → app format, caching photos
    const staffList = supaList.map(function(s) {
      if (s.photo) _photoCache[String(s.id)] = s.photo;
      return {
        id: s.id, name: s.name, staffId: s.staff_id,
        phone: s.phone, position: s.position, dept: s.department,
        gender: s.gender || '',
        bankName: s.bank_name, accountNumber: s.account_number,
        accountName: s.account_name, addedAt: s.created_at,
        dob: s.date_of_birth || '', age: s.age || '',
        residence: s.residence || '', state: s.state_of_origin || '',
        lga: s.lga || '', startDate: s.start_date || '', bio: s.bio || '',
        password: s.password || '',
        nokName: s.nok_name || '', nokPhone: s.nok_phone || '',
        guarantorName: s.guarantor_name || '', guarantorPhone: s.guarantor_phone || '',
        location: s.location || ''
      };
    });

    saveStaffProfiles(staffList);
    $('#staffCountBadge').text(staffList.length + ' member' + (staffList.length !== 1 ? 's' : ''));

    sbGetOrders(null)
      .then(function(orders){ _drawList(staffList, orders); })
      .catch(function(){ _drawList(staffList, []); });

  }).catch(function() {
    // Network error — use local cache
    const cached = getStaffProfiles();
    $('#staffCountBadge').text(cached.length + ' member' + (cached.length !== 1 ? 's' : ''));
    if (!cached.length) {
      $el.html('<div class="empty-state" style="padding:40px 0;"><div class="icon">👥</div><p>Could not load staff. Check your connection.</p></div>');
    } else {
      sbGetOrders(null).then(function(orders){ _drawList(cached, orders); }).catch(function(){ _drawList(cached, []); });
    }
  });
}

function updateStaffPhoto(id, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const photoData = e.target.result;
    _photoCache[String(id)] = photoData;  // photos live in _photoCache only
    _sbFetch('staff?id=eq.' + id, { method: 'PATCH', body: { photo: photoData }, prefer: 'return=minimal' })
      .then(() => showToast('✅ Photo updated!'))
      .catch(() => showToast('⚠️ Photo saved in session — check connection'));
    renderAdminStaffList(false);
  };
  reader.readAsDataURL(file);
}


// ════════════════════════════════════════════════════════════════
// EDIT STAFF MODAL
// ════════════════════════════════════════════════════════════════
let _editStaffPhotoData = null;

function openEditStaff(id) {
  const list = getStaffProfiles();
  const s = list.find(x => String(x.id) === String(id));
  if (!s) return;

  document.getElementById('editStaffId').value             = String(id);
  document.getElementById('editStaffOriginalStaffId').value = s.staffId || '';
  document.getElementById('editStaffName').value     = s.name || '';
  document.getElementById('editStaffStaffId').value  = s.staffId || '';
  document.getElementById('editStaffPhone').value    = s.phone || '';
  document.getElementById('editStaffPassword').value = s.password || '';
  document.getElementById('editStaffPosition').value = s.position || '';
  document.getElementById('editStaffDept').value     = s.dept || '';
  document.getElementById('editStaffBank').value     = s.bankName || '';
  document.getElementById('editStaffAcctNum').value  = s.accountNumber || '';
  document.getElementById('editStaffAcctName').value = s.accountName || '';
  document.getElementById('editStaffGender').value   = s.gender || '';
  document.getElementById('editStaffDOB').value       = s.dob || '';
  document.getElementById('editStaffAge').value       = s.age || '';
  document.getElementById('editStaffResidence').value = s.residence || '';
  document.getElementById('editStaffState').value     = s.state || '';
  document.getElementById('editStaffLGA').value       = s.lga || '';
  document.getElementById('editStaffStartDate').value = s.startDate || '';
  document.getElementById('editStaffBio').value        = s.bio || '';
  // New fields
  var _g = function(id, val) { var el=document.getElementById(id); if(el) el.value = val||''; };
  _g('editStaffNokName',       s.nokName);
  _g('editStaffNokPhone',      s.nokPhone);
  _g('editStaffGuarantorName', s.guarantorName);
  _g('editStaffGuarantorPhone',s.guarantorPhone);
  _g('editStaffLocation',      s.location);

  // Set gender buttons
  setEditGender(s.gender || '');

  // Set avatar preview — photo lives in _photoCache, not on the profile object
  const preview = document.getElementById('editStaffAvatarPreview');
  const _ep = getStaffPhoto(s.id) || s.photo || null;
  _editStaffPhotoData = _ep;
  if (_ep) {
    preview.innerHTML = '<img src="' + _ep + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
  } else {
    const initials = s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    preview.textContent = initials;
  }

  const modal = document.getElementById('editStaffModal');
  modal.style.display = 'flex';
}

function closeEditStaff() {
  document.getElementById('editStaffModal').style.display = 'none';
  _editStaffPhotoData = null;
  document.getElementById('editStaffPhotoInput').value = '';
}

function toggleEditPassVisibility() {
  var inp = document.getElementById('editStaffPassword');
  var btn = document.getElementById('editPassToggle');
  if (!inp) return;
  // Password field is already type=text in the new modal, we toggle visual masking via font
  if (inp.style.webkitTextSecurity === 'disc' || inp.dataset.masked === 'true') {
    inp.style.webkitTextSecurity = '';
    inp.style.fontFamily = '';
    inp.dataset.masked = 'false';
    if (btn) btn.textContent = '🙈';
  } else {
    inp.style.webkitTextSecurity = 'disc';
    inp.dataset.masked = 'true';
    if (btn) btn.textContent = '👁';
  }
}

function setEditGender(g) {
  document.getElementById('editStaffGender').value = g || '';
  const mb = document.getElementById('editGenderMale');
  const fb = document.getElementById('editGenderFemale');
  if (!mb || !fb) return;
  // Reset both
  mb.style.background = 'var(--surface2)'; mb.style.color = 'var(--text-muted)'; mb.style.borderColor = 'rgba(255,255,255,0.1)';
  fb.style.background = 'var(--surface2)'; fb.style.color = 'var(--text-muted)'; fb.style.borderColor = 'rgba(255,255,255,0.1)';
  if (g === 'Male') {
    mb.style.background = 'rgba(96,165,250,0.2)'; mb.style.color = '#60a5fa'; mb.style.borderColor = 'rgba(96,165,250,0.4)';
  } else if (g === 'Female') {
    fb.style.background = 'rgba(244,114,182,0.2)'; fb.style.color = '#f472b6'; fb.style.borderColor = 'rgba(244,114,182,0.4)';
  }
}

function previewEditPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    _editStaffPhotoData = e.target.result;
    const preview = document.getElementById('editStaffAvatarPreview');
    preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
  };
  reader.readAsDataURL(file);
}

async function saveEditStaff() {
  const id              = document.getElementById('editStaffId').value;
  const originalStaffId = document.getElementById('editStaffOriginalStaffId').value;
  const name     = document.getElementById('editStaffName').value.trim();
  const staffId  = document.getElementById('editStaffStaffId').value.trim();
  const phone    = document.getElementById('editStaffPhone').value.trim();
  const password = document.getElementById('editStaffPassword').value.trim();
  const position = document.getElementById('editStaffPosition').value.trim();
  const dept     = document.getElementById('editStaffDept').value.trim();
  const gender   = document.getElementById('editStaffGender').value;
  const dob      = document.getElementById('editStaffDOB').value || null;
  const age      = parseInt(document.getElementById('editStaffAge').value) || null;
  const residence= document.getElementById('editStaffResidence').value.trim();
  const state    = document.getElementById('editStaffState').value.trim();
  const lga      = document.getElementById('editStaffLGA').value.trim();
  const startDate= document.getElementById('editStaffStartDate').value || null;
  const bank     = document.getElementById('editStaffBank').value.trim();
  const acctNum  = document.getElementById('editStaffAcctNum').value.trim();
  const acctName = document.getElementById('editStaffAcctName').value.trim();
  const bio      = document.getElementById('editStaffBio').value.trim();
  const nokName        = document.getElementById('editStaffNokName') ? document.getElementById('editStaffNokName').value.trim() : '';
  const nokPhone       = document.getElementById('editStaffNokPhone') ? document.getElementById('editStaffNokPhone').value.trim() : '';
  const guarantorName  = document.getElementById('editStaffGuarantorName') ? document.getElementById('editStaffGuarantorName').value.trim() : '';
  const guarantorPhone = document.getElementById('editStaffGuarantorPhone') ? document.getElementById('editStaffGuarantorPhone').value.trim() : '';
  const location       = document.getElementById('editStaffLocation') ? document.getElementById('editStaffLocation').value.trim() : '';

  if (!name)    { showToast('⚠️ Name is required'); return; }
  if (!staffId) { showToast('⚠️ Staff ID is required'); return; }
  if (phone && phone.replace(/\D/g,'').length !== 11) { showToast('⚠️ Phone must be 11 digits'); return; }

  const btn = document.getElementById('editStaffSaveBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  try {
    const updates = {
      name, staff_id: staffId, phone,
      position, department: dept, gender,
      bank_name: bank, account_number: acctNum, account_name: acctName,
      date_of_birth: dob, age, residence, state_of_origin: state, lga, bio,
      nok_name: nokName, nok_phone: nokPhone,
      guarantor_name: guarantorName, guarantor_phone: guarantorPhone,
      location: location
    };
    if (password) updates.password = password;
    if (_editStaffPhotoData) {
      updates.photo = _editStaffPhotoData;
      _photoCache[String(id)] = _editStaffPhotoData;  // keep photo in memory cache
    }
    // Match by UUID primary key — never staff_id (which the user can change)
    let data, error;
    try {
      data = await _sbFetch('staff?id=eq.' + id, { method: 'PATCH', body: updates, prefer: 'return=representation' });
      if (!Array.isArray(data)) data = data ? [data] : [];
    } catch(e) { error = e; }

    if (error) { showToast('⚠️ Save failed: ' + error.message); return; }

    // Update local cache from what Supabase returned
    const list = getStaffProfiles();
    const row = data && data[0];
    const idx = list.findIndex(x => String(x.id) === String(id));
    if (idx >= 0 && row) {
      list[idx] = {
        id: row.id, name: row.name, staffId: row.staff_id,
        phone: row.phone, position: row.position, dept: row.department,
        gender: row.gender || '',
        bankName: row.bank_name, accountNumber: row.account_number,
        accountName: row.account_name, addedAt: row.created_at,
        dob: row.date_of_birth || '', age: row.age || '',
        residence: row.residence || '', state: row.state_of_origin || '', lga: row.lga || '',
        startDate: row.start_date || '', bio: row.bio || '',
        password: row.password || '',
        nokName: row.nok_name || '', nokPhone: row.nok_phone || '',
        guarantorName: row.guarantor_name || '', guarantorPhone: row.guarantor_phone || '',
        location: row.location || ''
      };
    } else if (idx >= 0) {
      // Patch directly if Supabase didn't return the row
      list[idx].name = name; list[idx].staffId = staffId; list[idx].phone = phone;
      list[idx].position = position; list[idx].dept = dept; list[idx].gender = gender;
      list[idx].bankName = bank; list[idx].accountNumber = acctNum; list[idx].accountName = acctName;
      list[idx].dob = dob; list[idx].age = age; list[idx].residence = residence;
      list[idx].state = state; list[idx].lga = lga; list[idx].startDate = startDate;
      list[idx].bio = bio;
      list[idx].nokName = nokName; list[idx].nokPhone = nokPhone;
      list[idx].guarantorName = guarantorName; list[idx].guarantorPhone = guarantorPhone;
      list[idx].location = location;
      if (_editStaffPhotoData) _photoCache[String(id)] = _editStaffPhotoData;  // update photo cache
    }
    saveStaffProfiles(list);

    // ── Propagate name change to all existing orders ──
    try {
      await _sbFetch('orders?staff_id=eq.' + encodeURIComponent(staffId), {
        method: 'PATCH',
        body: { client_name: name, staff_name: name },
        prefer: 'return=minimal'
      });
    } catch(e) { console.warn('Could not update order names in Supabase:', e); }
    // Also update local order cache so profile/task screens reflect new name instantly
    const _localOrders = getOrders().map(function(o) {
      if (String(o.staffId) === String(staffId)) {
        return Object.assign({}, o, { clientName: name });
      }
      return o;
    });
    localStorage.setItem('incline_orders', JSON.stringify(_localOrders));

    closeEditStaff();
    renderAdminStaffList(false);
    const _at = ($('.sidenav__item--active').data('tab') || document.querySelector('.tab-panel[style*="flex"]')?.id?.replace('panel-',''));
    if (_at === 'reports')      renderStaffCards();
    if (_at === 'admin')        renderAdminPanel();
    if (_at === 'orders')       renderOrdersTable();
    if (_at === 'outstanding' && typeof renderOutstandingTable === 'function') renderOutstandingTable();
    if (typeof populateLoanStaffDropdown === 'function') populateLoanStaffDropdown();
    updateAlumniBadge();
    var reloadBtn = document.getElementById('adminReloadBtn');
    if (reloadBtn) { reloadBtn.classList.remove('reload-flash'); void reloadBtn.offsetWidth; reloadBtn.classList.add('reload-flash'); }
    showToast('✅ Staff profile updated!');

  } catch(e) {
    showToast('⚠️ Update failed: ' + e.message);
  } finally {
    btn.textContent = '💾 Save Changes'; btn.disabled = false;
  }
}

// Close edit modal on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('editStaffModal').addEventListener('click', function(e) {
    if (e.target === this) closeEditStaff();
  });
});

async function deleteStaff(id) {
  const list = getStaffProfiles();
  const s = list.find(x => String(x.id) === String(id));
  const name = s ? s.name : 'this staff member';
  const staffId = s ? s.staffId : null;
  const staffName = s ? s.name : null;

  var _ds = await showConfirm({
    title: 'Delete ' + name + '?',
    body: 'This will permanently remove:<br/><br/>' +
          '&bull; Their staff profile<br/>' +
          '&bull; All their orders<br/>' +
          '&bull; All their loan records<br/><br/>' +
          '<span style="color:#E05252;font-size:12px;font-weight:600;">This cannot be undone.</span>',
    okText: 'Delete All', icon: '\u26A0\uFE0F'
  });
  if (!_ds) return;

  try {
    showToast('Deleting...');

    // 1. Delete their orders and debits
    if (staffId) {
      const r1 = await _sbFetch('orders?staff_id=eq.' + staffId, { method: 'DELETE', prefer: 'return=minimal' }).then(() => ({})).catch(e => ({ error: e }));
      if (r1.error) console.warn('Orders delete:', r1.error.message);
      const r2 = await _sbFetch('debits?staff_id=eq.' + staffId, { method: 'DELETE', prefer: 'return=minimal' }).then(() => ({})).catch(e => ({ error: e }));
      if (r2.error) console.warn('Debits delete:', r2.error.message);
    }
    // Also delete orders matched by staff name
    if (staffName) {
      try { await _sbFetch('orders?staff_name=eq.' + encodeURIComponent(staffName), { method: 'DELETE', prefer: 'return=minimal' }); } catch(e) {}
      try { await _sbFetch('orders?client_name=eq.' + encodeURIComponent(staffName), { method: 'DELETE', prefer: 'return=minimal' }); } catch(e) {}
    }

    // 2. Delete the staff profile
    let _sDelErr;
    try { await _sbFetch('staff?id=eq.' + String(id), { method: 'DELETE', prefer: 'return=minimal' }); } catch(e) { _sDelErr = e; }
    if (_sDelErr) {
      showToast('⚠️ Delete failed: ' + (_sDelErr.message || 'Check connection'));
      return;
    }

    // 3. Wipe from ALL local caches
    saveStaffProfiles(list.filter(x => String(x.id) !== String(id)));
    // Remove photo from cache too
    delete _photoCache[String(id)];
    const orders = getOrders().filter(o =>
      String(o.staffId) !== String(staffId) &&
      (o.clientName || '').toLowerCase() !== (staffName || '').toLowerCase()
    );
    localStorage.setItem('incline_orders', JSON.stringify(orders));

    // 4. Re-render everything
    renderAdminStaffList();
    renderOrdersTable();
    renderStaffCards();
    renderAdminPanel();
    if (typeof populateLoanStaffDropdown === 'function') populateLoanStaffDropdown();
    if (typeof renderOutstandingTable    === 'function') renderOutstandingTable();
    updateAlumniBadge();
    showToast('🗑 ' + name + ' permanently deleted');
  } catch(e) {
    console.error('Delete staff error:', e);
    showToast('⚠️ Could not delete: ' + e.message);
  }
}

// ════════════════════════════════════════════════════════════════════
// STAFF REPORTS — CARD GRID
// ════════════════════════════════════════════════════════════════════

function getStaffStats(staffName, timeframe) {
  const orders = getOrders();
  const profiles = getStaffProfiles();
  const profile = profiles.find(s => s.name.toLowerCase() === staffName.toLowerCase());
  const now = new Date();
  // Match by staffId (Supabase orders) OR clientName (legacy local orders)
  const _sname = staffName.toLowerCase().trim();
  let filtered = orders.filter(o => {
    if (profile && o.staffId && o.staffId === profile.staffId) return true;
    const _on = (o.clientName || '').toLowerCase().trim();
    return _on === _sname || _on.includes(_sname) || _sname.includes(_on);
  });
  if (timeframe === 'week') {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(o => new Date(o.date) >= cutoff);
  } else if (timeframe === 'month') {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(o => new Date(o.date) >= cutoff);
  }
  const totalRevenue = filtered.reduce((s, o) => s + (o.subtotal - o.discount), 0);
  const totalItems = filtered.reduce((s, o) => s + o.services.reduce((a, sv) => a + sv.qty, 0), 0);
  const totalOutstanding = filtered.reduce((s, o) => s + o.balance, 0);
  const servicesCount = {};
  filtered.forEach(o => o.services.forEach(sv => {
    servicesCount[sv.name] = (servicesCount[sv.name] || 0) + sv.qty;
  }));
  return { orders: filtered, totalRevenue, totalItems, totalOutstanding, servicesCount };
}

function renderStaffCards() {
  const timeframe = $('#reportTimeframe').val();
  const search = $('#reportStaffSearch').val().toLowerCase();

  // Load all orders from Supabase first, then render
  sbGetOrders(null).then(function(supaOrders) {
    // Merge Supabase orders into local storage so getStaffStats can use them
    const local = getOrders();
    const localIds = new Set(local.map(o => String(o.id)));
    supaOrders.forEach(o => {
      // Normalize Supabase order to match local format
      if (!localIds.has(String(o.id))) {
        local.push({
          id: o.id,
          clientName: o.client_name || o.staff_name,
          clientPhone: o.client_phone,
          receiptNumber: o.receipt_number,
          orderDate: o.order_date,
          dueDate: o.due_date,
          date: o.created_at,
          status: o.status,
          services: o.services || [],
          subtotal: o.subtotal || 0,
          discount: o.discount || 0,
          deposit: o.deposit || 0,
          balance: o.balance || 0,
          taskId: o.task_id,
          staffId: o.staff_id,
          bankName: o.bank_name,
          accountNumber: o.account_number,
          accountName: o.account_name,
          notes: o.notes
        });
      }
    });
    localStorage.setItem('incline_orders', JSON.stringify(local));
    _renderStaffCardsUI(timeframe, search);
  }).catch(function() {
    _renderStaffCardsUI(timeframe, search);
  });
}

function _renderStaffCardsUI(timeframe, search) {
  // Only show currently registered staff — no ghost names from deleted staff orders
  const registered = getStaffProfiles();
  let allStaff = [...registered];
  if (search) allStaff = allStaff.filter(s => (s.name||'').toLowerCase().includes(search));

  // Only show staff who have orders in the selected timeframe, or registered staff always
  const grid = $('#staffCardsGrid');
  if (!allStaff.length) {
    grid.html('<div class="empty-state"><div class="icon">👥</div><p>No staff found</p></div>');
    return;
  }

  // Sort by revenue desc
  allStaff.sort((a, b) => {
    const ra = getStaffStats(a.name, timeframe).totalRevenue;
    const rb = getStaffStats(b.name, timeframe).totalRevenue;
    return rb - ra;
  });

  let html = '';
  allStaff.forEach(s => {
    const stats = getStaffStats(s.name, timeframe);
    // Skip unregistered staff with no orders in timeframe
    if (s.id && String(s.id).startsWith('order_') && !stats.orders.length) return;

    const initials = s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const _sp = getStaffPhoto(s.id);
    const avatarContent = _sp
      ? `<img src="${_sp}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
      : `<span style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#34D399;">${initials}</span>`;

    const delivered    = stats.orders.filter(o=>o.status==='Delivered').length;
    const pending      = stats.orders.filter(o=>o.status==='Pending'||o.status==='In Progress').length;
    const delivPct     = stats.orders.length ? Math.round(delivered/stats.orders.length*100) : 0;
    const revenueShort = stats.totalRevenue >= 1000000 ? (stats.totalRevenue/1000000).toFixed(1)+'M' : stats.totalRevenue >= 1000 ? (stats.totalRevenue/1000).toFixed(0)+'K' : stats.totalRevenue.toLocaleString();
    const islandDot    = pending > 0 ? '#10B981' : '#0eca8e';

    html += `
      <div class="di-task-card" onclick="openStaffReport('${s.name.replace(/'/g,"\\'")}')">
        <div class="di-notch">
          <div class="di-notch-inner">
            <div class="di-notch-dot" style="background:${islandDot};box-shadow:0 0 6px ${islandDot};"></div>
            <span class="di-notch-label">STAFF REPORT</span>
            <div class="di-notch-dot" style="background:${islandDot};box-shadow:0 0 6px ${islandDot};"></div>
          </div>
        </div>
        <div class="di-avatar-section">
          <div class="di-avatar-ring">
            <div class="di-avatar-inner">
              ${avatarContent}
            </div>
          </div>
          ${pending > 0 ? `<div class="di-live-badge"><span class="di-live-pulse"></span>ACTIVE</div>` : ''}
        </div>
        <div class="di-card-body">
          <div class="di-name">${s.name}</div>
          ${s.position ? `<div class="di-position">${s.position}</div>` : ''}
          ${s.dept ? `<div class="di-position" style="color:rgba(16,185,129,0.5);">${s.dept}</div>` : ''}
        </div>
        <div class="di-stats-row">
          <div class="di-stat-pill">
            <div class="di-stat-num">${stats.orders.length}</div>
            <div class="di-stat-lbl">Orders</div>
          </div>
          <div class="di-stat-divider"></div>
          <div class="di-stat-pill">
            <div class="di-stat-num" style="font-size:12px;">&#8358;${revenueShort}</div>
            <div class="di-stat-lbl">Revenue</div>
          </div>
          <div class="di-stat-divider"></div>
          <div class="di-stat-pill">
            <div class="di-stat-num" style="color:${pending>0?'#10B981':'#0eca8e'}">${pending}</div>
            <div class="di-stat-lbl">Active</div>
          </div>
        </div>
        <div class="di-progress-bar">
          <div class="di-progress-fill" style="width:${delivPct}%;background:linear-gradient(90deg,#059669,#34D399);"></div>
        </div>
        <div class="di-progress-meta">
          <span>${delivPct}% completed</span>
          <span style="color:#0eca8e;">${delivered} delivered</span>
        </div>
        <div class="di-bottom-glow"></div>
      </div>`;
  });

  if (!html) {
    grid.html('<div class="empty-state"><div class="icon">📊</div><p>No data for selected period</p></div>');
  } else {
    grid.html(html);
  }
}

// ════════════════════════════════════════════════════════════════════
// STAFF INDIVIDUAL REPORT PAGE
// ════════════════════════════════════════════════════════════════════
let _srStaffName = null;

function openStaffReport(name) {
  _srStaffName = name;
  $('#srTimeframe').val($('#reportTimeframe').val());
  renderStaffReport(name);
  $('#staff-cards-screen').hide();
  $('#staff-report-page').show();
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function closeStaffReport() {
  $('#staff-report-page').hide();
  $('#staff-cards-screen').show();
  _srStaffName = null;
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function renderStaffReport(name) {
  const timeframe = $('#srTimeframe').val();
  const stats = getStaffStats(name, timeframe);
  const registered = getStaffProfiles();
  const profile = registered.find(s => s.name.toLowerCase() === name.toLowerCase());
  const phone = profile ? profile.phone : (stats.orders[0] ? stats.orders[0].clientPhone : '');
  const photo = profile ? (getStaffPhoto(String(profile.id)) || profile.photo || null) : null;
  const position = profile ? profile.position : '';
  const dept = profile ? profile.dept : '';

  // Avatar
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const avatarEl = document.getElementById('sr-avatar-el');
  if (photo) {
    avatarEl.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
  } else {
    avatarEl.textContent = initials;
  }

  // Hero
  $('#sr-name').text(name);
  const staffIdVal = profile ? (profile.staffId || profile.id || '') : '';
  const staffIdBadge = document.getElementById('sr-staffid-badge');
  if (staffIdBadge) {
    if (staffIdVal) { staffIdBadge.textContent = staffIdVal; staffIdBadge.style.display = 'inline-block'; }
    else { staffIdBadge.style.display = 'none'; }
  }
  const positionDeptEl = document.getElementById('sr-position-dept');
  if (positionDeptEl) {
    const pd = [position, dept].filter(Boolean).join('  ·  ');
    positionDeptEl.textContent = pd || '';
    positionDeptEl.style.display = pd ? 'block' : 'none';
  }
  $('#sr-phone').text(phone ? '📞  ' + phone : '');
  const tlabel = {'week':'This Week','month':'This Month','all':'All Time'}[timeframe];
  $('#sr-period-label').text(tlabel);

  // Stats
  $('#sr-stat-orders').text(stats.orders.length);
  $('#sr-stat-revenue').text('₦' + stats.totalRevenue.toLocaleString());
  $('#sr-stat-items').text(stats.totalItems);
  $('#sr-stat-balance').text('₦' + stats.totalOutstanding.toLocaleString());

  // Status breakdown
  const statuses = ['Pending','In Progress','Ready','Delivered','Cancelled'];
  const statusColors = {'Pending':'#60a5fa','In Progress':'#60a5fa','Ready':'#10B981','Delivered':'#888','Cancelled':'#E05252'};
  const statusGlows  = {'Pending':'rgba(48,168,255,0.25)','In Progress':'rgba(96,165,250,0.25)','Ready':'rgba(16,185,129,0.25)','Delivered':'rgba(136,136,136,0.15)','Cancelled':'rgba(224,82,82,0.25)'};
  const statusCounts = {};
  stats.orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const total = stats.orders.length || 1;
  let barsHtml = '';
  statuses.forEach(st => {
    const count = statusCounts[st] || 0;
    if (!count && !stats.orders.length) return;
    const pct = Math.round(count / total * 100);
    barsHtml += `
      <div class="pa-status-row">
        <div class="pa-status-label" style="color:${statusColors[st]||'#888'};">
          <div class="pa-status-dot" style="background:${statusColors[st]};box-shadow:0 0 5px ${statusGlows[st]||'transparent'};"></div>
          ${st}
        </div>
        <div class="pa-bar-track">
          <div class="pa-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${statusColors[st]||'#888'}90,${statusColors[st]});box-shadow:0 0 8px ${statusGlows[st]||'transparent'};"></div>
        </div>
        <div class="pa-status-count" style="color:${statusColors[st]};">${count}</div>
        <div class="pa-status-pct">${pct}%</div>
      </div>`;
  });
  $('#sr-status-bars').html(barsHtml || '<div style="font-size:13px;color:var(--text-muted);">No orders in this period</div>');

  // Outstanding orders
  const outstanding = stats.orders.filter(o => o.balance > 0);
  if (outstanding.length) {
    let osHtml = '';
    outstanding.forEach(o => {
      osHtml += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--surface3);font-size:13px;">
          <div>
            <div style="font-weight:500;">${o.receiptNumber || '#'+o.id}</div>
            <div style="font-size:11px;color:var(--text-muted);">${o.orderDate||'—'} · ${o.status}</div>
          </div>
          <div style="color:#f87171;font-weight:700;font-family:'Cormorant Garamond',serif;font-size:17px;">₦${o.balance.toLocaleString()}</div>
        </div>`;
    });
    $('#sr-outstanding-list').html(osHtml);
    $('#sr-outstanding-wrap').show();
  } else {
    $('#sr-outstanding-wrap').hide();
  }

  // Top services with progress bars
  const topSvcs = Object.entries(stats.servicesCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxSvc = topSvcs.length ? topSvcs[0][1] : 1;
  let svcsHtml = '';
  if (!topSvcs.length) {
    svcsHtml = '<div style="font-size:13px;color:var(--text-muted);">No services in this period</div>';
  } else {
    const svcGradients = [
      'linear-gradient(90deg,#059669,#34D399)',
      'linear-gradient(90deg,#1d4ed8,#60a5fa)',
      'linear-gradient(90deg,#7c3aed,#a78bfa)',
      'linear-gradient(90deg,#b45309,#10B981)',
      'linear-gradient(90deg,#be123c,#fb7185)',
      'linear-gradient(90deg,#0e7490,#22d3ee)',
      'linear-gradient(90deg,#15803d,#4ade80)',
      'linear-gradient(90deg,#9a3412,#fb923c)',
    ];
    topSvcs.forEach(([svcName, count], i) => {
      const pct = Math.round(count / maxSvc * 100);
      const isTop = i === 0;
      svcsHtml += `
        <div class="pa-service-row${isTop?' pa-service-top':''}">
          <div class="pa-svc-name-row">
            <span class="pa-svc-name">${svcName}</span>
            <span class="pa-svc-count">× ${count}</span>
          </div>
          <div class="pa-svc-track">
            <div class="pa-svc-fill" style="width:${pct}%;background:${svcGradients[i%svcGradients.length]};"></div>
          </div>
        </div>`;
    });
  }
  $('#sr-top-services').html(svcsHtml);

  // Task history
  $('#sr-order-count').text(stats.orders.length + ' order' + (stats.orders.length!==1?'s':'') + ' in ' + tlabel.toLowerCase());
  const bmap = {'Pending':'badge-pending','In Progress':'badge-pending','Ready':'badge-ready','Delivered':'badge-delivered','Cancelled':'badge-cancelled'};
  let listHtml = '';
  if (!stats.orders.length) {
    listHtml = '<div style="padding:30px;text-align:center;color:var(--text-muted);font-size:13px;">No orders in this period</div>';
  } else {
    stats.orders.forEach((o, idx) => {
      listHtml += `
  <div class="sr-history-row">
    <div class="sr-history-left">
      ${(Array.isArray(o.services) ? o.services : []).map(s => `
        <div style="margin-bottom:8px;">
          <div style="font-weight:600;">${s?.name || 'Service'}</div>
          <div style="font-size:12px;color:var(--text-muted);">${s?.description || '—'}</div>
        </div>
      `).join('')}
    </div>
  </div>
`;
    });
  }
  $('#sr-order-list').html(listHtml);
}

// ════════════════════════════════════════════════════════════════════
// DANNY-STYLE THERMAL RECEIPT PRINT
// ════════════════════════════════════════════════════════════════════
window.printThermalReceipt = function() {
  const data = collectForm();
  if (!calcValidateForm(data)) return;
  const staffId = $('#staffId').val().trim() || 'N/A';
  
  // Populate receipt
  const taskId = $('#taskId').val().trim() || '—';
  $('#receipt-date').text(data.orderDate || new Date().toLocaleDateString());
  $('#receipt-staff').text(staffId);
  $('#receipt-task-id').text(taskId);
  $('#receipt-number').text(data.receiptNumber || data.id);
  $('#receipt-customer-name').text(data.clientName);
  $('#receipt-customer-phone').text(data.clientPhone || '—');
  $('#receipt-due-date').text(data.dueDate || '—');
  
  // Items
  let itemsHtml = '';
  data.services.forEach(s => {
    itemsHtml += `
      <div class="thermal-item">
        <div class="thermal-item-name">${s.name}</div>
        <div class="thermal-item-line">
          <span>${s.qty} × ₦${(s.unitPrice||0).toLocaleString()}</span>
          <span>₦${s.price.toLocaleString()}</span>
        </div>
      </div>
    `;
  });
  $('#receipt-items-list').html(itemsHtml);
  $('#receipt-item-count').text(data.services.reduce((a,s)=>a+s.qty,0));
  
  // Totals
  $('#receipt-subtotal').text('₦' + data.subtotal.toLocaleString());
  
  if (data.discount > 0) {
    $('#receipt-discount-row').show();
    $('#receipt-discount').text('−₦' + data.discount.toLocaleString());
  } else {
    $('#receipt-discount-row').hide();
  }
  
  if (data.deposit > 0) {
    $('#receipt-advance-row').show();
    $('#receipt-advance').text('₦' + data.deposit.toLocaleString());
  } else {
    $('#receipt-advance-row').hide();
  }
  
  const totalAfterDiscount = Math.max(0, data.subtotal - data.discount - data.deposit);
  $('#receipt-total').text('₦' + totalAfterDiscount.toLocaleString());
  $('#receipt-balance').text('₦' + data.balance.toLocaleString());
  
  // Populate bank details
  const bankName = $('#staffBankName').val().trim() || 'Not provided';
  const accountNumber = $('#staffAccountNumber').val().trim() || 'XXXXXXXXXX';
  const accountName = $('#staffAccountName').val().trim() || 'Not provided';
  
  $('#receipt-bank-name').text(bankName);
  $('#receipt-account-number').text(accountNumber);
  $('#receipt-account-name').text(accountName);
  
  // Print
  window.print();
};

function unlockCalcFields() {
  lockCalcStaffFields(false);
  $('#clientName').val('').focus();
  $('#clientPhone,#staffBankName,#staffAccountNumber,#staffAccountName').val('');
  $('#staffId').val('IW-ADM-001').css({'color':'var(--gold)','border-color':'rgba(16,185,129,0.3)'});
}

async function clearForm() {
  var _cf = await showConfirm({
    title: 'Clear Form?',
    body: 'All entered data will be lost.',
    okText: 'Clear', icon: '\uD83D\uDDD1', danger: false
  });
  if (!_cf) return;
  lockCalcStaffFields(false);
  $('#clientName,#clientPhone,#taskId,#staffBankName,#staffAccountNumber,#staffAccountName,#dueDate,#orderNotes,#discountAmt,#depositPaid').val('');
  $('#staffId').val('IW-ADM-001').css({'color':'var(--gold)','border-color':'rgba(16,185,129,0.3)'});
  $('#staffAutofillBadge').hide();
  var _od2=document.getElementById('to-order-date');if(_od2)_od2.value=new Date().toISOString().slice(0,10);
  $('#servicesContainer').empty();
  orderStatus = 'Pending';
  $('.status-btn').removeClass('active').first().addClass('active');
  addServiceRow(); calcTotals();
  calcClearAllFlags();
  updateTaskIdCounter();
  // Reset edit mode if active
  if (_editingOrderId) {
    _editingOrderId = null;
    $('#edit-mode-banner').remove();
    $('#saveOrderBtn')
      .html(`    <i class="fas fa-save" style="margin-right:6px;font-size:20px;"></i>`)
      .removeClass('btn-edit-mode')
      .css({ 'background': '', 'color': '', 'padding': '', 'border': '' });
  }
}

function exportCSV() {
  const orders = getOrders();
  if (!orders.length) { showToast('No orders to export.'); return; }
  let csv = 'Client,Phone,Task Date,Due Date,Status,Services,Subtotal,Discount,Deposit,Balance\n';
  orders.forEach(o => {
    const svcs = o.services.map(s => `${s.name}x${s.qty}`).join('; ');
    csv += `"${o.clientName}","${o.clientPhone||''}","${o.orderDate||''}","${o.dueDate||''}","${o.status}","${svcs}",${o.subtotal},${o.discount},${o.deposit},${o.balance}\n`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = 'incline-cal-orders.csv'; a.click();
  showToast('📥 CSV exported!');
}

function showToast(msg) {
  const t = $(`<div class="toast">${msg}</div>`);
  $('body').append(t);
  setTimeout(() => t.fadeOut(300, () => t.remove()), 3200);
}

/* ─── Script Block 8 of 12 ─── */
// ── SERVICE WORKER: Makes app work offline after first visit ──
if ('serviceWorker' in navigator) {
  const swCode = `
    const CACHE = 'incline-cal-v1';
    const URLS = [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js'
    ];

    self.addEventListener('install', e => {
      e.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(URLS).catch(()=>{}))
      );
      self.skipWaiting();
    });

    self.addEventListener('fetch', e => {
      e.respondWith(
        caches.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(response => {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
            return response;
          }).catch(() => cached);
        })
      );
    });
  `;

  const blob = new Blob([swCode], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(blob);
  navigator.serviceWorker.register(swUrl).catch(() => {});
}

/* ─── Script Block 9 of 12 ─── */
var _confirmCallback = null;

function showConfirm(opts) {
  return new Promise(function(resolve) {
    _confirmCallback = resolve;
    var isDanger = opts.danger !== false;
    var icon = document.getElementById('confirmIcon');
    icon.textContent = opts.icon || (isDanger ? '\uD83D\uDDD1' : '\u26A0\uFE0F');
    icon.style.background = isDanger ? 'rgba(224,82,82,0.15)' : 'rgba(48,168,255,0.15)';
    icon.style.border     = isDanger ? '1px solid rgba(224,82,82,0.3)' : '1px solid rgba(48,168,255,0.3)';
    document.getElementById('confirmTitle').textContent = opts.title || 'Are you sure?';
    document.getElementById('confirmBody').innerHTML    = opts.body  || '';
    var okBtn = document.getElementById('confirmOkBtn');
    okBtn.textContent  = opts.okText || 'Delete';
    okBtn.style.background = isDanger ? 'linear-gradient(135deg,#c0392b,#e74c3c)' : 'linear-gradient(135deg,#059669,#10B981)';
    okBtn.style.color      = '#fff';
    okBtn.style.boxShadow  = isDanger ? '0 6px 20px rgba(231,76,60,0.4)' : '0 6px 20px rgba(16,185,129,0.4)';
    document.getElementById('confirmCancelBtn').textContent = opts.cancelText || 'Cancel';
    var modal = document.getElementById('confirmModal');
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    setTimeout(function() {
      modal.style.transition = 'opacity 0.18s ease';
      modal.style.opacity = '1';
      document.getElementById('confirmOkBtn').focus();
    }, 10);
    document.addEventListener('keydown', _confirmKeyHandler);
  });
}

function _confirmKeyHandler(e) {
  if (e.key === 'Enter')  { e.preventDefault(); _confirmResolve(); }
  if (e.key === 'Escape') { e.preventDefault(); _confirmReject();  }
}
function _confirmClose() {
  var m = document.getElementById('confirmModal');
  m.style.transition = 'opacity 0.15s ease';
  m.style.opacity = '0';
  setTimeout(function() { m.style.display = 'none'; }, 160);
  document.removeEventListener('keydown', _confirmKeyHandler);
}
function _confirmResolve() { _confirmClose(); if (_confirmCallback) { _confirmCallback(true);  _confirmCallback = null; } }
function _confirmReject()  { _confirmClose(); if (_confirmCallback) { _confirmCallback(false); _confirmCallback = null; } }

/* ─── Script Block 10 of 12 ─── */
// ══════════════════════════════════════════════
// SALARY MODULE
// ══════════════════════════════════════════════

// Field shake helper
function _shakeField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('sal-shake');
  void el.offsetWidth;
  el.classList.add('sal-shake');
  setTimeout(() => el.classList.remove('sal-shake'), 400);
  el.focus();
}

// Salary type pill selector
function setSalaryType(val, btn) {
  document.getElementById('sp-type').value = val;
  document.querySelectorAll('.stype-pill').forEach(b => b.classList.remove('active-pill'));
  btn.classList.add('active-pill');
}

var _salaryStaffId   = null;
var _salaryStaffName = null;
var _salaryEntries   = [];
var _editingSalaryId = null;

var _allSalariesCache = [];

async function renderSalaryTab() {
  // Fetch fresh salaries AND ensure staff photos are in _photoCache
  const [salaries, staffList] = await Promise.all([
    sbGetSalaries(),
    sbGetStaff().catch(() => null)
  ]);
  // Cache photos from fresh Supabase staff data
  if (staffList && staffList.length) {
    staffList.forEach(function(s) {
      if (s.photo) _photoCache[String(s.id)] = s.photo;
    });
    _lastFetch.staff = Date.now();
  }
  _allSalariesCache = salaries;
  _lastFetch.salaries = Date.now();
  _drawSalaryGrid();
}

function _drawSalaryGrid() {
  const search = (document.getElementById('salarySearch')?.value || '').toLowerCase();
  const staff  = getStaffProfiles();
  const grid   = document.getElementById('salaryStaffGrid');
  const strip  = document.getElementById('salary-summary-strip');
  if (!grid) return;

  if (!staff.length) {
    grid.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:60px;grid-column:1/-1;">No staff found.</div>';
    return;
  }

  const allSalaries = _allSalariesCache;

  // Summary strip — use local date (not UTC) so Nigeria UTC+1 doesn't mismatch
  const _now      = new Date();
  const _ym       = _now.getFullYear() + '-' + String(_now.getMonth() + 1).padStart(2, '0');
  const _monthLbl = _now.toLocaleString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
  const grandTotal = allSalaries.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonth  = allSalaries.filter(e => e.date_paid && e.date_paid.slice(0,7) === _ym);
  const monthTotal = thisMonth.reduce((s, e) => s + (e.amount || 0), 0);
  if (strip) strip.innerHTML = `
    <div class="sal-stat-box">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(16,185,129,0.7);margin-bottom:6px;">All-Time Paid</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--green);">₦${grandTotal.toLocaleString()}</div>
    </div>
    <div class="sal-stat-box">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(16,185,129,0.7);margin-bottom:6px;">${_monthLbl}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--gold);">₦${monthTotal.toLocaleString()}</div>
      <div style="font-size:9px;color:var(--text-muted);margin-top:3px;">${thisMonth.length} payment${thisMonth.length !== 1 ? 's' : ''} this month</div>
    </div>
    <div class="sal-stat-box">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(16,185,129,0.7);margin-bottom:6px;">Staff Count</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--text);">${staff.length}</div>
    </div>`;

  const filtered = staff
    .filter(s =>
      !search ||
      (s.name || '').toLowerCase().includes(search) ||
      (s.staffId || '').toLowerCase().includes(search)
    )
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const typeColors = { Monthly:'rgba(16,185,129,0.15)', Weekly:'rgba(48,168,255,0.15)', Daily:'rgba(99,102,241,0.15)', Bonus:'rgba(245,158,11,0.15)', Advance:'rgba(239,68,68,0.15)', Other:'rgba(156,163,175,0.15)' };

  grid.innerHTML = filtered.map(s => {
    const entries   = allSalaries.filter(e => e.staff_id === s.staffId);
    const totalPaid = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    const last      = entries[0];
    const lastDate  = last ? last.date_paid : null;
    const count     = entries.length;
    const photoSrc  = getStaffPhoto(String(s.id)) || s.photo || null;
    const photo     = photoSrc
      ? `<img src="${photoSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
      : null;
    const initials  = (s.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

    return `
    <div class="sal-card sal-selectable-card" id="sal-card-${s.staffId}" onclick="_salCardClick(event,'${s.staffId}')">
      <div style="position:relative;">
        <!-- Checkmark bubble — always in DOM, CSS class on grid container shows/hides it -->
        <div class="sal-card-cb-wrap" id="sal-cb-wrap-${s.staffId}">
          <i class="fas fa-check sal-card-cb" data-staffid="${s.staffId}" data-checked="false" style="font-size:13px;color:#10b981;"></i>
        </div>

        <div style="display:flex;align-items:center;gap:13px;margin-bottom:14px;padding-top:2px;">
          <div class="sal-avatar">
            ${photo ? photo : `<span style="font-size:15px;font-weight:700;color:var(--gold);font-family:'Cormorant Garamond',serif;">${initials}</span>`}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:15px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name || '—'}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${s.staffId || ''} · ${s.position || '—'}</div>
          </div>
          <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700;color:var(--green);white-space:nowrap;">${count} paid</div>
        </div>
        <div style="height:1px;background:rgba(255,255,255,0.05);margin-bottom:14px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px;">Total Paid</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--green);">₦${totalPaid.toLocaleString()}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px;">Last Payment</div>
            <div style="font-size:12px;color:${lastDate ? 'var(--text)' : 'var(--text-muted)'};">${lastDate || 'None yet'}</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // If select mode was active before re-render, restore the CSS class immediately
  if (_salaryGridSelectMode) grid.classList.add('sal-grid-select-active');
}

async function openSalaryProfile(staffId) {
  const staff = getStaffProfiles().find(s => s.staffId === staffId);
  if (!staff) return;

  _salaryStaffId   = staffId;
  _salaryStaffName = staff.name;
  _editingSalaryId = null;

  document.getElementById('sp-name').textContent = staff.name;
  document.getElementById('sp-meta').textContent = `${staff.staffId} · ${staff.position || '—'} · ${staff.dept || '—'}`;

  // Set avatar
  const avEl = document.getElementById('sp-avatar');
  if (avEl) {
    const initials = (staff.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const avPhoto = getStaffPhoto(staff.id) || staff.photo || null;
    avEl.innerHTML = avPhoto
      ? `<img src="${avPhoto}" style="width:100%;height:100%;object-fit:cover;"/>`
      : `<span>${initials}</span>`;
  }

  // Set default date/time to now
  const now = new Date();
  document.getElementById('sp-date').value = now.toISOString().slice(0, 10);
  document.getElementById('sp-time').value = now.toTimeString().slice(0, 5);
  document.getElementById('sp-amount').value = '';
  document.getElementById('sp-notes').value  = '';
  document.getElementById('sp-type').value   = 'Monthly';
  // Reset pills
  document.querySelectorAll('.stype-pill').forEach(b => b.classList.remove('active-pill'));
  const firstPill = document.querySelector('.stype-pill[data-val="Monthly"]');
  if (firstPill) firstPill.classList.add('active-pill');
  document.getElementById('sp-save-btn').innerHTML = '<span style="font-size:16px;">💾</span> Save Payment';
  document.getElementById('sp-form-title').textContent = 'New Payment';
  document.getElementById('sp-cancel-btn').style.display = 'none';

  document.getElementById('salary-main-screen').style.display    = 'none';
  document.getElementById('salary-profile-screen').style.display = 'block';
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;

  // Render instantly from cache so profile appears immediately
  const cachedEntries = (_allSalariesCache || []).filter(e => e.staff_id === staffId);
  if (cachedEntries.length) {
    _salaryEntries = cachedEntries;
    const total = cachedEntries.reduce((s, e) => s + (e.amount || 0), 0);
    const last  = cachedEntries[0];
    document.getElementById('sp-total').textContent = '₦' + total.toLocaleString();
    document.getElementById('sp-count').textContent = cachedEntries.length;
    document.getElementById('sp-last').textContent  = last ? last.date_paid : '—';
    const hc = document.getElementById('sp-history-count');
    if (hc) hc.textContent = cachedEntries.length ? `${cachedEntries.length} record${cachedEntries.length > 1 ? 's' : ''}` : 'No records yet';
    // Quick render of history from cache
    const typeColor = { Monthly:'var(--green)', Weekly:'#FBBF24', Daily:'#818CF8', Bonus:'#F59E0B', Advance:'var(--red)', Other:'var(--text-muted)' };
    const typeBg    = { Monthly:'rgba(16,185,129,0.12)', Weekly:'rgba(48,168,255,0.12)', Daily:'rgba(129,140,248,0.12)', Bonus:'rgba(245,158,11,0.12)', Advance:'rgba(224,82,82,0.12)', Other:'rgba(255,255,255,0.06)' };
    const hist = document.getElementById('sp-history');
    if (hist) hist.innerHTML = cachedEntries.map(e => `
    <div class="sal-entry" data-sal-id="${e.id}">
      <input type="checkbox" class="sal-entry-cb" data-id="${e.id}" style="display:none;width:16px;height:16px;accent-color:var(--green);cursor:pointer;flex-shrink:0;margin-right:6px;" onchange="_updateSalarySelectedCount()"/>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <span style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--green);">₦${(e.amount||0).toLocaleString()}</span>
          <span class="sal-badge" style="background:${typeBg[e.salary_type]||'rgba(255,255,255,0.06)'};color:${typeColor[e.salary_type]||'var(--text-muted)'};">${e.salary_type}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);">📅 ${e.date_paid}${e.time_paid ? ' &nbsp;🕐 ' + e.time_paid.slice(0,5) : ''}</div>
        ${e.notes ? `<div style="font-size:11px;color:rgba(240,234,214,0.4);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📝 ${e.notes}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;margin-left:10px;">
        <button onclick="shareSalaryReceipt(${e.id})" title="Share Receipt" style="background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.25);color:#25D366;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:13px;transition:all 0.15s;"
          onmouseenter="this.style.background='rgba(37,211,102,0.18)'" onmouseleave="this.style.background='rgba(37,211,102,0.08)'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>
        <button onclick="editSalaryEntry(${e.id})" title="Edit" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:var(--green);border-radius:8px;padding:7px 10px;cursor:pointer;font-size:13px;transition:all 0.15s;"
          onmouseenter="this.style.background='rgba(16,185,129,0.2)'" onmouseleave="this.style.background='rgba(16,185,129,0.1)'">✏️</button>
        <button onclick="deleteSalaryEntry(${e.id})" title="Delete" style="background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);color:var(--red);border-radius:8px;padding:7px 10px;cursor:pointer;font-size:13px;transition:all 0.15s;"
          onmouseenter="this.style.background='rgba(224,82,82,0.18)'" onmouseleave="this.style.background='rgba(224,82,82,0.08)'">🗑</button>
      </div>
    </div>`).join('');
  }

  await refreshSalaryProfile();
}

async function refreshSalaryProfile() {
  _salaryEntries = await sbGetSalaries(_salaryStaffId);

  const total = _salaryEntries.reduce((s, e) => s + (e.amount || 0), 0);
  const last  = _salaryEntries[0];

  document.getElementById('sp-total').textContent = '₦' + total.toLocaleString();
  document.getElementById('sp-count').textContent = _salaryEntries.length;
  document.getElementById('sp-last').textContent  = last ? last.date_paid : '—';
  const hc = document.getElementById('sp-history-count');
  if (hc) hc.textContent = _salaryEntries.length ? `${_salaryEntries.length} record${_salaryEntries.length > 1 ? 's' : ''}` : 'No records yet';

  const hist = document.getElementById('sp-history');
  if (!_salaryEntries.length) {
    hist.innerHTML = '<div style="text-align:center;padding:30px 0;"><div style="font-size:36px;margin-bottom:10px;">💸</div><div style="color:var(--text-muted);font-size:13px;">No payments recorded yet</div></div>';
    return;
  }

  const typeColor = { Monthly:'var(--green)', Weekly:'#FBBF24', Daily:'#818CF8', Bonus:'#F59E0B', Advance:'var(--red)', Other:'var(--text-muted)' };
  const typeBg    = { Monthly:'rgba(16,185,129,0.12)', Weekly:'rgba(48,168,255,0.12)', Daily:'rgba(129,140,248,0.12)', Bonus:'rgba(245,158,11,0.12)', Advance:'rgba(224,82,82,0.12)', Other:'rgba(255,255,255,0.06)' };

  hist.innerHTML = _salaryEntries.map(e => `
    <div class="sal-entry" data-sal-id="${e.id}">
      <!-- Checkbox for bulk select (hidden until select mode) -->
      <input type="checkbox" class="sal-entry-cb" data-id="${e.id}" style="display:none;width:16px;height:16px;accent-color:var(--green);cursor:pointer;flex-shrink:0;margin-right:6px;" onchange="_updateSalarySelectedCount()"/>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <span style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--green);">₦${(e.amount||0).toLocaleString()}</span>
          <span class="sal-badge" style="background:${typeBg[e.salary_type]||'rgba(255,255,255,0.06)'};color:${typeColor[e.salary_type]||'var(--text-muted)'};">${e.salary_type}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);">📅 ${e.date_paid}${e.time_paid ? ' &nbsp;🕐 ' + e.time_paid.slice(0,5) : ''}</div>
        ${e.notes ? `<div style="font-size:11px;color:rgba(240,234,214,0.4);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📝 ${e.notes}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;margin-left:10px;">
        <button onclick="shareSalaryReceipt(${e.id})" title="Share Receipt" style="background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.25);color:#25D366;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:13px;transition:all 0.15s;"
          onmouseenter="this.style.background='rgba(37,211,102,0.18)'" onmouseleave="this.style.background='rgba(37,211,102,0.08)'">
          <i class="fab fa-whatsapp" style="font-size:13px;"></i>
        </button>
        <button onclick="editSalaryEntry(${e.id})" title="Edit" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:var(--green);border-radius:8px;padding:7px 10px;cursor:pointer;font-size:13px;transition:all 0.15s;"
          onmouseenter="this.style.background='rgba(16,185,129,0.2)'" onmouseleave="this.style.background='rgba(16,185,129,0.1)'">✏️</button>
        <button onclick="deleteSalaryEntry(${e.id})" title="Delete" style="background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);color:var(--red);border-radius:8px;padding:7px 10px;cursor:pointer;font-size:13px;transition:all 0.15s;"
          onmouseenter="this.style.background='rgba(224,82,82,0.18)'" onmouseleave="this.style.background='rgba(224,82,82,0.08)'">🗑</button>
      </div>
    </div>`).join('');
}

async function saveSalaryEntry() {
  const amount = parseFloat(document.getElementById('sp-amount').value) || 0;
  const type   = document.getElementById('sp-type').value;
  const date   = document.getElementById('sp-date').value;
  const time   = document.getElementById('sp-time').value;
  const notes  = document.getElementById('sp-notes').value.trim();

  if (!amount || amount <= 0) { showToast('⚠️ Enter a valid amount'); _shakeField('sp-amount'); return; }
  if (!date)   { showToast('⚠️ Select a date'); _shakeField('sp-date'); return; }
  if (!time)   { showToast('⚠️ Select a time'); _shakeField('sp-time'); return; }
  if (!notes)  { showToast('⚠️ Enter a note for this payment'); _shakeField('sp-notes'); return; }

  const btn = document.getElementById('sp-save-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    if (_editingSalaryId) {
      await sbUpdateSalary(_editingSalaryId, { amount, salary_type: type, date_paid: date, time_paid: time, notes });
      showToast('✅ Payment updated!');
      _editingSalaryId = null;
      btn.textContent = '💾 Save Payment';
    } else {
      await sbAddSalary({
        staff_id: _salaryStaffId, staff_name: _salaryStaffName,
        amount, salary_type: type, date_paid: date, time_paid: time, notes
      });
      showToast('✅ Salary payment saved!');
    }

    // Clear form
    document.getElementById('sp-amount').value = '';
    document.getElementById('sp-notes').value  = '';
    document.getElementById('sp-type').value   = 'Monthly';
    const now = new Date();
    document.getElementById('sp-date').value = now.toISOString().slice(0, 10);
    document.getElementById('sp-time').value = now.toTimeString().slice(0, 5);

    // Update cache immediately so grid reflects change without extra fetch
    const updatedEntries = await sbGetSalaries(_salaryStaffId);
    _salaryEntries = updatedEntries;
    // Rebuild all-salaries cache for the grid stats
    const allFresh = await sbGetSalaries();
    _allSalariesCache = allFresh;
    await refreshSalaryProfile();
  } catch(e) {
    showToast('❌ Failed to save: ' + e.message);
  } finally {
    btn.disabled = false;
    if (!_editingSalaryId) btn.textContent = '💾 Save Payment';
  }
}

function editSalaryEntry(id) {
  const e = _salaryEntries.find(x => x.id === id);
  if (!e) return;
  _editingSalaryId = id;
  document.getElementById('sp-amount').value = e.amount;
  document.getElementById('sp-type').value   = e.salary_type;
  document.getElementById('sp-date').value   = e.date_paid;
  document.getElementById('sp-time').value   = e.time_paid ? e.time_paid.slice(0,5) : '';
  document.getElementById('sp-notes').value  = e.notes || '';
  document.getElementById('sp-save-btn').innerHTML = '<span style="font-size:16px;">✏️</span> Update Payment';
  document.getElementById('sp-form-title').textContent = 'Edit Payment';
  document.getElementById('sp-cancel-btn').style.display = 'block';
  // Update pills
  document.querySelectorAll('.stype-pill').forEach(b => b.classList.remove('active-pill'));
  const activePill = document.querySelector(`.stype-pill[data-val="${e.salary_type}"]`);
  if (activePill) activePill.classList.add('active-pill');
  document.getElementById('sp-amount').focus();
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
}

function cancelEditSalary() {
  _editingSalaryId = null;
  document.getElementById('sp-amount').value = '';
  document.getElementById('sp-notes').value  = '';
  document.getElementById('sp-type').value   = 'Monthly';
  const now = new Date();
  document.getElementById('sp-date').value = now.toISOString().slice(0, 10);
  document.getElementById('sp-time').value = now.toTimeString().slice(0, 5);
  document.getElementById('sp-save-btn').innerHTML = '<span style="font-size:16px;">💾</span> Save Payment';
  document.getElementById('sp-form-title').textContent = 'New Payment';
  document.getElementById('sp-cancel-btn').style.display = 'none';
  document.querySelectorAll('.stype-pill').forEach(b => b.classList.remove('active-pill'));
  const fp = document.querySelector('.stype-pill[data-val="Monthly"]');
  if (fp) fp.classList.add('active-pill');
}

async function deleteSalaryEntry(id) {
  const ok = await showConfirm({
    icon: '🗑', title: 'Delete Payment?',
    body: 'This salary entry will be permanently deleted.',
    okText: 'Delete', danger: true
  });
  if (!ok) return;
  try {
    var scrollPos = window.scrollY;
    await sbDeleteSalary(id);
    showToast('🗑 Payment deleted');
    await refreshSalaryProfile();
    window.scrollTo({ top: scrollPos, behavior: 'instant' });
  } catch(e) {
    showToast('❌ Failed to delete');
  }
}

function closeSalaryProfile() {
  _salaryStaffId   = null;
  _salaryStaffName = null;
  _editingSalaryId = null;
  // Reset select mode
  _salarySelectMode = false;
  const selBtn = document.getElementById('sp-select-btn');
  const pdfBtn = document.getElementById('sp-pdf-btn');
  const selRow = document.getElementById('sp-select-all-row');
  if (selBtn) selBtn.style.background = 'rgba(255,255,255,0.06)';
  if (pdfBtn) pdfBtn.style.display = 'none';
  if (selRow) selRow.style.display = 'none';
  document.querySelectorAll('.sal-entry-cb').forEach(cb => { cb.style.display = 'none'; cb.checked = false; });
  document.getElementById('salary-profile-screen').style.display = 'none';
  document.getElementById('salary-main-screen').style.display    = 'block';
  if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
  _drawSalaryGrid();
}

// ── Salary Select Mode ──
var _salarySelectMode = false;

function _toggleSalarySelectMode() {
  _salarySelectMode = !_salarySelectMode;
  const selBtn = document.getElementById('sp-select-btn');
  const pdfBtn = document.getElementById('sp-pdf-btn');
  const selRow = document.getElementById('sp-select-all-row');
  const cbs    = document.querySelectorAll('.sal-entry-cb');

  if (_salarySelectMode) {
    selBtn.style.background = 'rgba(16,185,129,0.15)';
    selBtn.style.borderColor = 'rgba(16,185,129,0.4)';
    selBtn.style.color = 'var(--green)';
    if (pdfBtn) { pdfBtn.style.display = 'flex'; }
    if (selRow) { selRow.style.display = 'flex'; }
    cbs.forEach(cb => { cb.style.display = 'inline-block'; cb.checked = false; });
    _updateSalarySelectedCount();
  } else {
    selBtn.style.background = 'rgba(255,255,255,0.06)';
    selBtn.style.borderColor = 'rgba(255,255,255,0.1)';
    selBtn.style.color = 'var(--text-muted)';
    if (pdfBtn) { pdfBtn.style.display = 'none'; }
    if (selRow) { selRow.style.display = 'none'; }
    cbs.forEach(cb => { cb.style.display = 'none'; cb.checked = false; });
    const allCb = document.getElementById('sp-select-all-cb');
    if (allCb) allCb.checked = false;
  }
}

function _salarySelectAll(checked) {
  document.querySelectorAll('.sal-entry-cb').forEach(cb => { cb.checked = checked; });
  _updateSalarySelectedCount();
}

function _updateSalarySelectedCount() {
  const checked = document.querySelectorAll('.sal-entry-cb:checked').length;
  const total   = document.querySelectorAll('.sal-entry-cb').length;
  const el = document.getElementById('sp-selected-count');
  if (el) el.textContent = checked ? `${checked} of ${total} selected` : '';
  const allCb = document.getElementById('sp-select-all-cb');
  if (allCb) allCb.checked = checked === total && total > 0;
}

function _exportSelectedSalaryPDF() {
  const checkedIds = [...document.querySelectorAll('.sal-entry-cb:checked')].map(cb => Number(cb.dataset.id));
  if (!checkedIds.length) { showToast('⚠️ Select at least one payment'); return; }
  const entries = _salaryEntries.filter(e => checkedIds.includes(e.id));
  if (entries.length === 1) {
    // Single entry — show the rich preview modal
    _showSingleSalaryPDFPreview(entries[0], _salaryStaffName, _salaryStaffId);
  } else {
    // Multiple entries — go straight to PDF (bulk)
    _buildSalaryReceiptPDF(entries, _salaryStaffName, _salaryStaffId);
  }
}

function shareSalaryReceipt(id) {
  const e = _salaryEntries.find(x => x.id === id);
  if (!e) return;
  _showSingleSalaryPDFPreview(e, _salaryStaffName, _salaryStaffId);
}

// ── Single-entry PDF preview modal ──────────────────────────────
function _showSingleSalaryPDFPreview(entry, staffName, staffId) {
  var existing = document.getElementById('sal-single-preview-modal');
  if (existing) existing.remove();

  var fmtDate = function(d) {
    if (!d) return '—';
    try { return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}); } catch(e){ return d; }
  };
  var fmtTime = function(t) {
    if (!t) return '—';
    try { var p = t.slice(0,5).split(':'); var h = parseInt(p[0]); return (h%12||12)+':'+p[1]+(h>=12?' PM':' AM'); } catch(e){ return t; }
  };

  var typeColor = { Monthly:'#10B981', Weekly:'#FBBF24', Daily:'#818CF8', Bonus:'#F59E0B', Advance:'#E05252', Other:'#888' };
  var tc = typeColor[entry.salary_type] || '#888';

  var modal = document.createElement('div');
  modal.id = 'sal-single-preview-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.78);backdrop-filter:blur(10px);';
  modal.innerHTML = `
    <div style="background:linear-gradient(145deg,#0e1a11,#111d14);border:1px solid rgba(16,185,129,0.28);border-radius:24px;max-width:380px;width:100%;box-shadow:0 40px 100px rgba(0,0,0,0.8),0 0 0 1px rgba(16,185,129,0.08);animation:modalIn 0.22s ease;overflow:hidden;">

      <!-- Header band -->
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.06));border-bottom:1px solid rgba(16,185,129,0.15);padding:20px 22px 16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;background:linear-gradient(135deg,#10B981,#059669);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px rgba(16,185,129,0.35);">📄</div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:700;color:#F0EAD6;line-height:1.2;">PDF Receipt Preview</div>
            <div style="font-size:11px;color:rgba(16,185,129,0.8);font-weight:600;letter-spacing:0.5px;margin-top:2px;">SALARY PAYMENT RECEIPT</div>
          </div>
        </div>
      </div>

      <!-- Receipt card -->
      <div style="padding:20px 22px;">
        <!-- Staff name -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <div style="width:44px;height:44px;background:linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,50,25,0.8));border:2px solid rgba(16,185,129,0.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:var(--green);flex-shrink:0;">
            ${(staffName||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#F0EAD6;">${staffName||'—'}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:1px;">${staffId||''}</div>
          </div>
          <div style="margin-left:auto;background:rgba(${entry.salary_type==='Advance'?'224,82,82':'16,185,129'},0.12);border:1px solid rgba(${entry.salary_type==='Advance'?'224,82,82':'16,185,129'},0.3);border-radius:20px;padding:4px 11px;font-size:10px;font-weight:700;color:${tc};">${entry.salary_type||'Payment'}</div>
        </div>

        <!-- Divider -->
        <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(16,185,129,0.2),transparent);margin-bottom:16px;"></div>

        <!-- Key info grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">

          <!-- Amount -->
          <div style="grid-column:1/-1;background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04));border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:14px 16px;text-align:center;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:rgba(16,185,129,0.7);font-weight:700;margin-bottom:6px;">Amount Paid</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:#10B981;line-height:1;">₦${(entry.amount||0).toLocaleString()}</div>
          </div>

          <!-- Date -->
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px 14px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);font-weight:700;margin-bottom:5px;">📅 Date</div>
            <div style="font-size:12px;font-weight:600;color:#F0EAD6;line-height:1.4;">${fmtDate(entry.date_paid)}</div>
          </div>

          <!-- Time -->
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px 14px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);font-weight:700;margin-bottom:5px;">🕐 Time</div>
            <div style="font-size:12px;font-weight:600;color:#F0EAD6;line-height:1.4;">${fmtTime(entry.time_paid)}</div>
          </div>

        </div>

        ${entry.notes ? `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 13px;margin-bottom:16px;font-size:11.5px;color:rgba(240,234,214,0.55);">📝 ${entry.notes}</div>` : ''}

        <!-- Buttons -->
        <div style="display:flex;gap:10px;">
          <button onclick="document.getElementById('sal-single-preview-modal').remove();" style="flex:1;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:50px;color:rgba(255,255,255,0.45);cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;transition:all 0.15s;"
            onmouseenter="this.style.background='rgba(255,255,255,0.09)';this.style.color='#F0EAD6'" onmouseleave="this.style.background='rgba(255,255,255,0.05)';this.style.color='rgba(255,255,255,0.45)'">Cancel</button>
          <button onclick="document.getElementById('sal-single-preview-modal').remove();_buildSalaryReceiptPDF([window._salPvEntry],window._salPvName,window._salPvId);" style="flex:2;padding:12px;background:linear-gradient(135deg,#059669,#10B981);border:none;border-radius:50px;color:#fff;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;letter-spacing:0.4px;box-shadow:0 6px 20px rgba(16,185,129,0.32);transition:all 0.15s;"
            onmouseenter="this.style.filter='brightness(1.1)'" onmouseleave="this.style.filter=''">
            <span style="margin-right:5px;">📤</span> Generate &amp; Send PDF
          </button>
        </div>
      </div>
    </div>`;

  // Store refs for the confirm button
  window._salPvEntry = entry;
  window._salPvName  = staffName;
  window._salPvId    = staffId;

  modal.addEventListener('click', function(ev){ if (ev.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ════════════════════════════════════════════════════════════════
//  GRID-LEVEL SELECT MODE  (main salary screen checkboxes)
// ════════════════════════════════════════════════════════════════
var _salaryGridSelectMode = false;

function _toggleSalaryGridSelectMode() {
  _salaryGridSelectMode = !_salaryGridSelectMode;
  const grid   = document.getElementById('salaryStaffGrid');
  const btn    = document.getElementById('sal-grid-select-btn');
  const pdfBtn = document.getElementById('sal-grid-pdf-btn');

  if (_salaryGridSelectMode) {
    if (grid)   grid.classList.add('sal-grid-select-active');
    if (btn)    { btn.style.background = 'rgba(16,185,129,0.15)'; btn.style.borderColor = 'rgba(16,185,129,0.4)'; btn.style.color = 'var(--green)'; }
    if (pdfBtn) pdfBtn.style.display = 'flex';
  } else {
    if (grid)   grid.classList.remove('sal-grid-select-active');
    if (btn)    { btn.style.background = ''; btn.style.borderColor = ''; btn.style.color = ''; }
    if (pdfBtn) pdfBtn.style.display = 'none';
    // Reset all card states
    document.querySelectorAll('.sal-card-cb').forEach(svg => { svg.dataset.checked = 'false'; });
    document.querySelectorAll('.sal-selectable-card').forEach(c => { c.removeAttribute('data-selected'); });
    _updateSalaryGridSelectedCount();
  }
}

function _updateSalaryGridSelectedCount() {
  const count = document.querySelectorAll('.sal-card-cb[data-checked="true"]').length;
  const btn = document.getElementById('sal-grid-pdf-btn');
  if (!btn) return;
  if (count) {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Send PDF (${count})`;
    btn.style.opacity = '1';
  } else {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Send PDF Receipt`;
    btn.style.opacity = '0.55';
  }
}

// Card click: check select mode from DOM class (survives re-renders), not global flag
function _salCardClick(ev, staffId) {
  var grid = document.getElementById('salaryStaffGrid');
  var inSelectMode = grid && grid.classList.contains('sal-grid-select-active');

  if (inSelectMode) {
    var svg  = document.querySelector('.sal-card-cb[data-staffid="'+staffId+'"]');
    var card = document.getElementById('sal-card-'+staffId);
    var nowChecked = !(svg && svg.dataset.checked === 'true');

    if (svg)  svg.dataset.checked = String(nowChecked);
    if (card) card.dataset.selected = nowChecked ? 'true' : 'false';

    _updateSalaryGridSelectedCount();
  } else {
    openSalaryProfile(staffId);
  }
}

// ── Preview modal before bulk-sending PDFs ──
function _showSalaryBulkPreview(staffList) {
  // staffList = [{name, staffId, initials, totalPaid, count, entries}]
  var existing = document.getElementById('sal-bulk-preview-modal');
  if (existing) existing.remove();

  var fmtDate = function(d) {
    if (!d) return '—';
    try { return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); } catch(e) { return d; }
  };
  var fmtTime = function(t) {
    if (!t) return '—';
    try { var p = t.slice(0,5).split(':'); var h = parseInt(p[0]); return (h%12||12)+':'+p[1]+(h>=12?' PM':' AM'); } catch(e){ return t; }
  };
  var typeColor = { Monthly:'#10B981', Weekly:'#FBBF24', Daily:'#818CF8', Bonus:'#F59E0B', Advance:'#E05252', Other:'#888' };

  // Build rows: each staff gets a header + their payment entries
  var rows = staffList.map(function(s, si) {
    var staffHeader = `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px 6px;background:rgba(16,185,129,0.06);border-bottom:1px solid rgba(16,185,129,0.1);">
        <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,rgba(16,185,129,0.25),rgba(5,50,25,0.8));border:1.5px solid rgba(16,185,129,0.35);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:12px;font-weight:700;color:var(--green);flex-shrink:0;">${s.initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#F0EAD6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);">${s.staffId} &nbsp;·&nbsp; ${s.count} payment${s.count!==1?'s':''}</div>
        </div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:var(--green);">₦${s.totalPaid.toLocaleString()}</div>
      </div>`;

    var entryRows = (s.entries || []).map(function(e, ei) {
      var tc = typeColor[e.salary_type] || '#888';
      return `<div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:8px 16px 8px 26px;border-bottom:1px solid rgba(255,255,255,0.04);background:${ei%2===0?'rgba(255,255,255,0.015)':'transparent'};">
        <div>
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;">
            <span style="font-size:11px;font-weight:700;color:#F0EAD6;">₦${(e.amount||0).toLocaleString()}</span>
            <span style="background:rgba(${e.salary_type==='Advance'?'224,82,82':'16,185,129'},0.1);border:1px solid rgba(${e.salary_type==='Advance'?'224,82,82':'16,185,129'},0.25);border-radius:20px;padding:1px 7px;font-size:9px;font-weight:700;color:${tc};">${e.salary_type||'—'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:10px;color:rgba(255,255,255,0.4);">📅 ${fmtDate(e.date_paid)}</span>
            <span style="font-size:10px;color:rgba(255,255,255,0.4);">🕐 ${fmtTime(e.time_paid)}</span>
          </div>
        </div>
        ${e.notes ? `<div style="font-size:9.5px;color:rgba(255,255,255,0.3);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${e.notes}">📝 ${e.notes}</div>` : '<div></div>'}
      </div>`;
    }).join('');

    return staffHeader + entryRows;
  }).join('');

  var grand = staffList.reduce(function(s,x){ return s + x.totalPaid; }, 0);

  var modal = document.createElement('div');
  modal.id = 'sal-bulk-preview-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);';
  modal.innerHTML = `
    <div style="background:#111d13;border:1px solid rgba(16,185,129,0.25);border-radius:22px;max-width:440px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 32px 80px rgba(0,0,0,0.7);animation:modalIn 0.22s ease;overflow:hidden;">
      <!-- Header -->
      <div style="padding:20px 22px 16px;border-bottom:1px solid rgba(16,185,129,0.1);flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#10B981,#059669);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(16,185,129,0.3);">📄</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--text);">PDF Receipt Preview</div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);padding-left:2px;">Payments for <strong style="color:var(--green);">${staffList.length} staff member${staffList.length!==1?'s':''}</strong> — review before generating</div>
      </div>
      <!-- Staff list -->
      <div style="flex:1;overflow-y:auto;">${rows}</div>
      <!-- Grand total -->
      <div style="padding:14px 22px;background:rgba(16,185,129,0.06);border-top:1px solid rgba(16,185,129,0.12);border-bottom:1px solid rgba(16,185,129,0.12);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Combined Total</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--green);">₦${grand.toLocaleString()}</div>
      </div>
      <!-- Buttons -->
      <div style="padding:16px 22px;display:flex;gap:10px;flex-shrink:0;">
        <button onclick="document.getElementById('sal-bulk-preview-modal').remove();_toggleSalaryGridSelectMode();" style="flex:1;padding:13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:50px;color:rgba(255,255,255,0.5);cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;transition:all 0.15s;" onmouseenter="this.style.background='rgba(255,255,255,0.09)';this.style.color='#F0EAD6'" onmouseleave="this.style.background='rgba(255,255,255,0.05)';this.style.color='rgba(255,255,255,0.5)'">Cancel</button>
        <button onclick="_doGridSalaryPDFExport()" style="flex:2;padding:13px;background:linear-gradient(135deg,#059669,#10B981);border:none;border-radius:50px;color:#fff;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;letter-spacing:0.5px;box-shadow:0 6px 20px rgba(16,185,129,0.3);transition:all 0.15s;" onmouseenter="this.style.filter='brightness(1.08)'" onmouseleave="this.style.filter=''">
          <span style="margin-right:6px;">📤</span> ${staffList.length > 1 ? 'Confirm & Generate Combined PDF' : 'Confirm & Send PDF'}
        </button>
      </div>
    </div>`;
  modal.addEventListener('click', function(ev){ if (ev.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// Store selected for deferred export after preview confirm
var _pendingGridExport = [];

async function _exportSelectedGridSalaryPDF() {
  const selected = [...document.querySelectorAll('.sal-card-cb[data-checked="true"]')].map(svg => svg.dataset.staffid);
  if (!selected.length) { showToast('⚠️ Select at least one staff member'); return; }

  const staffProfiles = getStaffProfiles();
  const preview = [];
  _pendingGridExport = [];

  for (const staffId of selected) {
    const profile = staffProfiles.find(s => s.staffId === staffId);
    if (!profile) continue;
    const entries = _allSalariesCache.filter(e => e.staff_id === staffId);
    if (!entries.length) continue;
    const totalPaid = entries.reduce(function(s,e){ return s + (e.amount||0); }, 0);
    const initials  = (profile.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    // Include entries (with date/time) in the preview data
    preview.push({ name: profile.name, staffId: staffId, initials, count: entries.length, totalPaid, entries });
    _pendingGridExport.push({ profile, entries });
  }

  if (!preview.length) { showToast('⚠️ No salary records found for selected staff'); return; }

  // Show preview for 2+ staff; generate directly for single staff
  if (preview.length >= 2) {
    _showSalaryBulkPreview(preview);
  } else {
    await _doGridSalaryPDFExport();
  }
}

async function _doGridSalaryPDFExport() {
  var modal = document.getElementById('sal-bulk-preview-modal');
  if (modal) modal.remove();

  if (!_pendingGridExport.length) return;

  var count = _pendingGridExport.length;
  showToast('⏳ Generating ' + (count > 1 ? 'combined' : '') + ' PDF receipt' + (count>1?'s':'') + '…');

  if (count === 1) {
    // Single staff — use existing per-staff builder
    var item = _pendingGridExport[0];
    await _buildSalaryReceiptPDF(item.entries, item.profile.name, item.profile.staffId);
  } else {
    // Multiple staff — build one combined PDF
    await _buildCombinedSalaryPDF(_pendingGridExport);
  }

  _pendingGridExport = [];
  _toggleSalaryGridSelectMode();
  showToast('✅ Done — receipt' + (count>1?' bundle':'') + ' sent!');
}

// ── Combined multi-staff salary PDF ─────────────────────────────────────────
function _buildCombinedSalaryPDF(exportItems) {
  if (typeof window.jspdf === 'undefined') { showToast('⚠️ PDF library not loaded'); return Promise.resolve(); }

  return new Promise(function(resolve) {
    var { jsPDF } = window.jspdf;
    var doc  = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    var W    = doc.internal.pageSize.getWidth();   // 210
    var H    = doc.internal.pageSize.getHeight();  // 297
    var ML   = 14, MR = 14;
    var CW   = W - ML - MR;                        // ≈182
    var LH_H = 46;  // letterhead height in mm (matches 190px crop at A4 width)

    // ── Column positions for the flat all-staff table ──────────────────
    var COL = {
      num:    ML + 2,          // #
      name:   ML + 9,          // Staff Name
      date:   ML + 62,         // Date
      time:   ML + 93,         // Time
      type:   ML + 116,        // Type
      amount: W - MR - 2,      // Amount (right-aligned)
      notesW: 0                // no notes col in combined view
    };

    // ── Helpers ──────────────────────────────────────────────────────────
    function fmt(n) {
      var parts = Number(n||0).toFixed(2).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');
      return 'NGN ' + parts[0] + '.' + parts[1];
    }
    function fmtDate(d) {
      if (!d) return '—';
      try { return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
      catch(e){ return d; }
    }
    function fmtTime(t) {
      if (!t) return '—';
      try {
        var p = t.slice(0,5).split(':');
        var h = parseInt(p[0]);
        return (h%12||12)+':'+p[1]+(h>=12?' PM':' AM');
      } catch(e){ return t; }
    }

    var typeColors = {
      Monthly:[16,185,129], Weekly:[251,191,36], Daily:[129,140,248],
      Bonus:[245,158,11],   Advance:[224,82,82], Other:[155,163,175]
    };

    // ── Aggregate data ───────────────────────────────────────────────────
    var grandTotal   = 0;
    var totalPayments = 0;
    var allRows = [];   // flat list of every payment with staff info attached

    exportItems.forEach(function(item) {
      var sTotal = 0;
      item.entries.forEach(function(e) {
        grandTotal    += (e.amount||0);
        sTotal        += (e.amount||0);
        totalPayments++;
        allRows.push({
          staffName: item.profile.name || '—',
          staffId:   item.profile.staffId || '',
          amount:    e.amount || 0,
          date_paid: e.date_paid,
          time_paid: e.time_paid,
          salary_type: e.salary_type || 'Other',
          notes:     e.notes || ''
        });
      });
    });

    // Sort by staff name then date
    allRows.sort(function(a,b){
      var n = (a.staffName).localeCompare(b.staffName);
      return n !== 0 ? n : (a.date_paid||'').localeCompare(b.date_paid||'');
    });

    // ── Page helpers ─────────────────────────────────────────────────────
    function drawLetterhead() {
      var LH = (typeof INCLINE_LETTERHEAD_B64 !== 'undefined') ? INCLINE_LETTERHEAD_B64 : null;
      doc.setFillColor(255,255,255); doc.rect(0,0,W,LH_H,'F');
      if (LH) { try { doc.addImage(LH,'JPEG',0,0,W,LH_H,'','FAST'); } catch(e){} }
      doc.setFillColor(16,185,129); doc.rect(0,LH_H,W,1.8,'F');
    }
    function drawBorder() {
      doc.setDrawColor(16,185,129); doc.setLineWidth(0.35);
      doc.rect(ML-4, LH_H+4, CW+8, H-LH_H-11,'S');
      [[ML-4,LH_H+4],[W-MR+4,LH_H+4],[ML-4,H-7],[W-MR+4,H-7]].forEach(function(pt){
        doc.setLineWidth(0.6);
        doc.line(pt[0],pt[1],pt[0]+(pt[0]<W/2?4:-4),pt[1]);
        doc.line(pt[0],pt[1],pt[0],pt[1]+(pt[1]<H/2?4:-4));
      });
    }
    function drawFrame() { drawLetterhead(); drawBorder(); }

    function drawTableHeader(yy) {
      doc.setFillColor(8,35,18);
      doc.rect(ML-2, yy, CW+4, 8, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.2); doc.setTextColor(52,211,153);
      doc.text('#',         COL.num,    yy+5.3);
      doc.text('STAFF NAME',COL.name,   yy+5.3);
      doc.text('DATE PAID', COL.date,   yy+5.3);
      doc.text('TIME PAID', COL.time,   yy+5.3);
      doc.text('TYPE',      COL.type,   yy+5.3);
      doc.text('AMOUNT',    COL.amount, yy+5.3, {align:'right'});
      return yy + 8;
    }

    function newPage() {
      _salaryPDFFooter(doc, ML, W, H, null);
      doc.addPage();
      drawFrame();
      // "Continued" banner
      var cy = LH_H + 10;
      doc.setFillColor(8,50,24); doc.rect(ML-2, cy, CW+4, 6,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(160,220,190);
      doc.text('COMBINED SALARY REPORT — Continued', ML+2, cy+4.3);
      return drawTableHeader(cy+8);
    }

    // ══════════════════════════════════════════════════════════════════
    //  PAGE 1 — COVER / SUMMARY
    // ══════════════════════════════════════════════════════════════════
    drawFrame();

    // Report label — comfortably below the letterhead green bar
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(14,90,50);
    doc.text('COMBINED SALARY REPORT', W-MR, LH_H + 34, {align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(80,130,100);
    doc.text('Generated: '+new Date().toLocaleString('en-GB'), W-MR, LH_H + 41, {align:'right'});

    var y = LH_H + 52;

    // 3 summary boxes
    var boxW = (CW-8)/3;
    var boxes = [
      { lbl:'STAFF INCLUDED',  val: String(exportItems.length) },
      { lbl:'TOTAL PAYMENTS',  val: String(totalPayments) },
      { lbl:'GRAND TOTAL',     val: fmt(grandTotal) }
    ];
    boxes.forEach(function(b,i){
      var bx = ML + i*(boxW+4);
      doc.setFillColor(i===2?240:245, i===2?252:251, i===2?244:248);
      doc.rect(bx, y, boxW, 18,'F');
      doc.setDrawColor(180,220,190); doc.setLineWidth(0.15);
      doc.rect(bx, y, boxW, 18,'S');
      // number badge
      doc.setFillColor(16,185,129); doc.circle(bx+5, y+5, 2.5,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(5.5); doc.setTextColor(255,255,255);
      doc.text(String(i+1), bx+5, y+6.3, {align:'center'});
      // value
      doc.setFont('helvetica','bold'); doc.setFontSize(i===2?8.5:11); doc.setTextColor(14,90,50);
      doc.text(b.val, bx+boxW/2, y+11, {align:'center'});
      // label
      doc.setFont('helvetica','normal'); doc.setFontSize(5.8); doc.setTextColor(100,130,110);
      doc.text(b.lbl, bx+boxW/2, y+16, {align:'center'});
    });
    y += 25;

    // Staff directory (compact list)
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(16,185,129);
    doc.text('STAFF INCLUDED IN THIS REPORT', ML, y);
    doc.setDrawColor(16,185,129); doc.setLineWidth(0.15);
    doc.line(ML, y+2, W-MR, y+2);
    y += 6;

    exportItems.forEach(function(item,idx){
      var sTotal = item.entries.reduce(function(s,e){ return s+(e.amount||0); },0);
      doc.setFillColor(idx%2===0?248:255, idx%2===0?252:255, idx%2===0?249:255);
      doc.rect(ML, y, CW, 9,'F');
      doc.setDrawColor(220,235,225); doc.setLineWidth(0.1);
      doc.line(ML, y+9, W-MR, y+9);

      // index badge
      doc.setFillColor(8,50,24); doc.roundedRect(ML+1,y+1.5,7,6,1,1,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(52,211,153);
      doc.text(String(idx+1), ML+4.5, y+5.8, {align:'center'});

      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(20,30,25);
      doc.text(item.profile.name||'—', ML+12, y+5.5);
      doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(100,120,110);
      doc.text(item.profile.staffId||'—', ML+65, y+5.5);
      doc.text(item.profile.position||'—', ML+93, y+5.5);
      doc.text(item.entries.length+' payment'+(item.entries.length!==1?'s':''), ML+135, y+5.5);
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(14,90,50);
      doc.text(fmt(sTotal), W-MR-2, y+5.5, {align:'right'});
      y += 9;
      if (y > H-30) { _salaryPDFFooter(doc,ML,W,H,null); doc.addPage(); drawFrame(); y = LH_H+18; }
    });

    // ══════════════════════════════════════════════════════════════════
    //  PAGE 2+ — FLAT ALL-STAFF PAYMENT TABLE
    // ══════════════════════════════════════════════════════════════════
    _salaryPDFFooter(doc,ML,W,H,null);
    doc.addPage();
    drawFrame();

    // Section title — comfortably below the letterhead green bar
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(14,90,50);
    doc.text('ALL PAYMENTS — DETAILED RECORD', W-MR, LH_H + 34, {align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(80,130,100);
    doc.text(new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}), W-MR, LH_H + 41, {align:'right'});

    y = LH_H + 48;
    y = drawTableHeader(y);

    var prevName = '';
    allRows.forEach(function(row, i) {
      // Row height
      var rowH = 8.5;

      if (y + rowH > H - 26) { y = newPage(); }

      // Shade rows alternately; shade differently when staff changes
      var nameChanged = (row.staffName !== prevName);
      if (nameChanged) {
        // Light teal tint for first row of each staff group
        doc.setFillColor(235,250,243);
      } else {
        doc.setFillColor(i%2===0?248:255, i%2===0?252:255, i%2===0?250:255);
      }
      doc.rect(ML-2, y, CW+4, rowH,'F');
      doc.setDrawColor(220,235,228); doc.setLineWidth(0.1);
      doc.line(ML-2, y+rowH, W-MR+2, y+rowH);

      var ty = y + rowH/2 + 1.5;

      // #
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(110,140,120);
      doc.text(String(i+1), COL.num, ty);

      // Staff name — bold on name change, normal otherwise
      if (nameChanged) {
        doc.setFont('helvetica','bold'); doc.setTextColor(14,70,40);
      } else {
        doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50);
      }
      doc.setFontSize(7);
      // Truncate long names
      var displayName = row.staffName.length > 25 ? row.staffName.slice(0,23)+'…' : row.staffName;
      doc.text(displayName, COL.name, ty);

      // Date
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(30,30,30);
      doc.text(fmtDate(row.date_paid), COL.date, ty);

      // Time
      doc.setTextColor(70,70,90);
      doc.text(fmtTime(row.time_paid), COL.time, ty);

      // Type (coloured)
      var tc = typeColors[row.salary_type] || [140,140,140];
      doc.setFont('helvetica','bold'); doc.setFontSize(6.2);
      doc.setTextColor(tc[0],tc[1],tc[2]);
      doc.text((row.salary_type||'—').toUpperCase(), COL.type, ty);

      // Amount
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(14,90,50);
      doc.text(fmt(row.amount), COL.amount, ty, {align:'right'});

      prevName = row.staffName;
      y += rowH;
    });

    // Grand total row
    if (y + 11 > H-26) { y = newPage(); }
    y += 2;
    doc.setFillColor(8,35,18);
    doc.rect(ML-2, y, CW+4, 12,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(255,255,255);
    doc.text('GRAND TOTAL  ('+exportItems.length+' staff · '+totalPayments+' payments)', ML+2, y+8.5);
    doc.setTextColor(52,211,153);
    doc.text(fmt(grandTotal), COL.amount, y+8.5, {align:'right'});
    y += 18;

    // Signature block
    if (y + 28 > H-26) { _salaryPDFFooter(doc,ML,W,H,null); doc.addPage(); drawFrame(); y = LH_H+22; }
    doc.setDrawColor(170,215,185); doc.setLineWidth(0.2);
    doc.line(ML,    y+16, ML+58,      y+16);
    doc.line(W-MR-58, y+16, W-MR,    y+16);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(120,145,130);
    doc.text('Authorised Signatory',           ML, y+20);
    doc.text('Staff Acknowledgement',    W-MR-58, y+20);
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(16,185,129);
    doc.text('INCLINEWORKS INTERNATIONAL', W/2, y+9, {align:'center'});
    doc.setFont('helvetica','italic'); doc.setFontSize(6.5); doc.setTextColor(130,160,145);
    doc.text('"Excellence in Every Stitch"', W/2, y+14, {align:'center'});

    _salaryPDFFooter(doc,ML,W,H,null);

    // ── Output / Share ───────────────────────────────────────────────
    var dateStr = new Date().toISOString().slice(0,10);
    var names   = exportItems.map(function(x){ return (x.profile.name||'').split(' ')[0]; }).join('_');
    var fname   = 'CombinedSalary_'+names+'_'+dateStr+'.pdf';
    var bytes   = doc.output('arraybuffer');
    var blob    = new Blob([bytes], {type:'application/pdf'});
    var file    = new File([blob], fname, {type:'application/pdf'});

    _showSalPdfActionModal(blob, fname, 'Combined Report', resolve);
  });
}



// ════════════════════════════════════════════════════════════════
//  SALARY RECEIPT PDF  — clean, fast, properly laid out
// ════════════════════════════════════════════════════════════════
function _buildSalaryReceiptPDF(entries, staffName, staffId) {
  if (!entries || !entries.length) { showToast('⚠️ No entries to export'); return Promise.resolve(); }
  if (typeof window.jspdf === 'undefined') { showToast('⚠️ PDF library not loaded'); return Promise.resolve(); }

  return new Promise(function(resolve) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();   // 210
    const H = doc.internal.pageSize.getHeight();  // 297
    const ML = 14, MR = 14;  // left / right margins
    const CW = W - ML - MR;  // content width ≈ 182 mm

    // ── Column x-positions (all relative to ML) ──────────────────
    // #(5) | DATE(30) | TIME(18) | TYPE(22) | NOTES(~55) | AMOUNT(right-align)
    const COL = {
      num:    ML + 2,
      date:   ML + 9,
      time:   ML + 41,
      type:   ML + 60,
      notes:  ML + 84,
      amount: W - MR - 2,       // right-aligned
      notesW: 55                 // max width for notes text wrap
    };

    // ── Helpers ──────────────────────────────────────────────────
    function fmt(n) {
      return 'NGN ' + (function(num){ var p = Number(num||0).toFixed(2).split('.'); p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,','); return p[0]+'.'+p[1]; })(n);
    }
    function fmtDate(d) {
      if (!d) return '\u2014';
      try { return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); } catch(e){ return d; }
    }
    function fmtTime(t) { return t ? t.slice(0,5) : '\u2014'; }

    // ── Extract logo (synchronously from DOM) ─────────────────────
    var logoData = null;
    try {
      var li = document.getElementById('header-logo');
      if (li && li.complete && li.naturalWidth > 0) {
        var lc = document.createElement('canvas');
        lc.width = li.naturalWidth; lc.height = li.naturalHeight;
        lc.getContext('2d').drawImage(li, 0, 0);
        logoData = lc.toDataURL('image/png');
      }
    } catch(e) {}

    // ── Staff profile (no photo on receipt) ──────────────────────
    var staffProfile = null;
    var allSt = typeof getStaffProfiles === 'function' ? getStaffProfiles() : [];
    staffProfile = allSt.find(function(s){ return s.staffId === staffId; });
    var circlePhotoData = null; // photo intentionally not shown

    // ── Page frame — real letterhead image as header ──────────────
    var LHIMG = (typeof INCLINE_LETTERHEAD_B64 !== 'undefined') ? INCLINE_LETTERHEAD_B64 : null;
    var HEADER_H = 46; // matches cropped letterhead (864×190px at A4 210mm width)
    function drawFrame() {
      doc.setFillColor(255,255,255); doc.rect(0,0,W,HEADER_H,'F');
      if (LHIMG) {
        try { doc.addImage(LHIMG,'JPEG',0,0,W,HEADER_H,'','FAST'); }
        catch(e){ doc.setFillColor(6,28,14); doc.rect(0,0,W,HEADER_H,'F'); }
      } else { doc.setFillColor(6,28,14); doc.rect(0,0,W,HEADER_H,'F'); }
      doc.setFillColor(16,185,129); doc.rect(0,HEADER_H,W,1.2,'F');
      doc.setDrawColor(16,185,129); doc.setLineWidth(0.25);
      doc.rect(ML-4,HEADER_H+4,CW+8,H-HEADER_H-11,'S');
      var corners=[[ML-4,HEADER_H+4],[W-MR+4,HEADER_H+4],[ML-4,H-7],[W-MR+4,H-7]];
      doc.setLineWidth(0.6);
      corners.forEach(function(c){
        var x=c[0],cy=c[1],s=4;
        doc.line(x,cy,x+(x<W/2?s:-s),cy); doc.line(x,cy,x,cy+(cy<H/2?s:-s));
      });
    }

    // ── First page ────────────────────────────────────────────────
    drawFrame();
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(14,90,50);
    doc.text('SALARY RECEIPT', W-MR, HEADER_H + 28, {align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(80,130,100);
    doc.text('Official Payment Record', W-MR, HEADER_H + 36, {align:'right'});
    doc.setFontSize(6); doc.setTextColor(80,120,95);
    doc.text('Ref: IW-SR-'+String(Date.now()).slice(-6)+'  |  Issued: '+new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}), W-MR, HEADER_H + 43, {align:'right'});

    var y = HEADER_H + 54;

    // ── Staff card ─────────────────────────────────────────────────
    var cardH = 38;
    doc.setFillColor(245, 252, 248);
    doc.roundedRect(ML-3, y, CW+6, cardH, 4, 4, 'F');
    doc.setDrawColor(160, 210, 180); doc.setLineWidth(0.35);
    doc.roundedRect(ML-3, y, CW+6, cardH, 4, 4, 'S');
    // Left accent stripe
    doc.setFillColor(16,185,129);
    doc.roundedRect(ML-3, y, 6, cardH, 3, 3, 'F');
    doc.rect(ML-3+3, y, 3, cardH, 'F');

    // No photo — text starts directly after accent stripe
    var textStartX = ML + 9;
    doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(12,55,30);
    doc.text(staffName||'—', textStartX, y+12);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(70,110,85);
    doc.text('ID: '+(staffId||'—'), textStartX, y+19);
    if (staffProfile && staffProfile.position) {
      var roleStr = (staffProfile.position||'') + (staffProfile.dept?' · '+staffProfile.dept:'');
      doc.setFontSize(7.5); doc.setTextColor(90,130,105);
      doc.text(roleStr, textStartX, y+25.5);
    }
    // Date & time of payment (shown on card, bottom-left)
    var payDate = entries.length===1 ? fmtDate(entries[0].date_paid) : fmtDate(entries[entries.length-1].date_paid);
    var payTime = entries.length===1 ? fmtTime(entries[0].time_paid) : '';
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(16,120,70);
    doc.text('📅 ' + payDate + (payTime ? '   🕐 ' + payTime : ''), textStartX, y+33);

    // Total amount box (right side of card)
    var totalAll = entries.reduce(function(s,e){ return s+(e.amount||0); }, 0);
    var boxW = 50, boxH = 26, boxX = W-MR-boxW-2, boxY = y + (cardH-boxH)/2;
    doc.setFillColor(8, 60, 30);
    doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F');
    doc.setDrawColor(16,185,129); doc.setLineWidth(0.5);
    doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'S');
    doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(140,210,175);
    doc.text('TOTAL AMOUNT PAID', boxX+boxW/2, boxY+7, { align:'center' });
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(52,211,153);
    doc.text(fmt(totalAll), boxX+boxW/2, boxY+19, { align:'center' });

    y += cardH + 8;

    // ── 3 numbered info boxes ──────────────────────────────────────
    var isSingle = entries.length === 1;
    if (isSingle) {
      var se = entries[0];
      var infoItems = [
        { num:'1', lbl:'AMOUNT PAID', val: fmt(se.amount) },
        { num:'2', lbl:'DATE',        val: fmtDate(se.date_paid) },
        { num:'3', lbl:'TIME',        val: fmtTime(se.time_paid) }
      ];
      var iw = CW/3;
      infoItems.forEach(function(info, i){
        var ix = ML + i*iw, isAmt = i===0;
        doc.setFillColor(isAmt?8:245, isAmt?50:251, isAmt?28:248);
        doc.rect(ix, y, iw, 18, 'F');
        doc.setDrawColor(isAmt?16:200, isAmt?185:225, isAmt?129:210); doc.setLineWidth(0.18);
        doc.rect(ix, y, iw, 18, 'S');
        doc.setFillColor(isAmt?52:16, isAmt?211:185, isAmt?153:129);
        doc.circle(ix+5, y+5, 3, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(255,255,255);
        doc.text(info.num, ix+5, y+6.5, {align:'center'});
        doc.setFont('helvetica','bold'); doc.setFontSize(isAmt?9:8);
        doc.setTextColor(isAmt?52:18, isAmt?211:55, isAmt?153:30);
        var val = info.val; if (val.length>18) val=val.slice(0,16)+'\u2026';
        doc.text(val, ix+iw/2, y+11, {align:'center'});
        doc.setFont('helvetica','normal'); doc.setFontSize(5.5); doc.setTextColor(100,130,110);
        doc.text(info.lbl, ix+iw/2, y+16, {align:'center'});
      });
      y += 23;
    } else {
      var dates = entries.map(function(e){ return e.date_paid||''; }).filter(Boolean).sort();
      var stats = [
        { num:'1', lbl:'PAYMENTS', val: String(entries.length) },
        { num:'2', lbl:'EARLIEST', val: fmtDate(dates[0]) },
        { num:'3', lbl:'LATEST',   val: fmtDate(dates[dates.length-1]) }
      ];
      var sw = CW/3;
      stats.forEach(function(s,i){
        var sx = ML + i*sw;
        doc.setFillColor(i===0?240:i===1?245:250, i===0?250:i===1?252:252, i===0?244:i===1?247:250);
        doc.rect(sx, y, sw, 16, 'F');
        doc.setDrawColor(200,220,208); doc.setLineWidth(0.15); doc.rect(sx,y,sw,16,'S');
        doc.setFillColor(16,185,129); doc.circle(sx+5, y+5, 3, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(255,255,255);
        doc.text(s.num, sx+5, y+6.5, {align:'center'});
        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(18,55,30);
        doc.text(s.val, sx+sw/2, y+10, {align:'center'});
        doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(110,140,120);
        doc.text(s.lbl, sx+sw/2, y+15, {align:'center'});
      });
      y += 21;
    }

    // ── Table ───────────────────────────────────────────────────────
    function drawTblHeader(yy) {
      doc.setFillColor(8,35,18);
      doc.rect(ML-3, yy, CW+6, 8, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(52,211,153);
      doc.text('#',          COL.num,    yy+5.3);
      doc.text('DATE',       COL.date,   yy+5.3);
      doc.text('TIME',       COL.time,   yy+5.3);
      doc.text('TYPE',       COL.type,   yy+5.3);
      doc.text('NOTES',      COL.notes,  yy+5.3);
      doc.text('AMOUNT',     COL.amount, yy+5.3, { align:'right' });
      return yy + 8;
    }

    function newPage() {
      _salaryPDFFooter(doc, ML, W, H, logoData);
      doc.addPage();
      drawFrame();
      var contY = HEADER_H + 2;
      doc.setFillColor(25,40,30); doc.rect(ML-3,contY,CW+6,6,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(160,220,190);
      doc.text('Continued — '+staffName, ML, contY+4.5);
      return drawTblHeader(contY+8);
    }

    y = drawTblHeader(y);

    var typeColors = {
      Monthly:[16,185,129], Weekly:[251,191,36], Daily:[129,140,248],
      Bonus:[245,158,11],   Advance:[224,82,82], Other:[155,163,175]
    };
    var runTotal = 0;

    entries.forEach(function(e, i) {
      // Calculate row height — notes may wrap
      doc.setFontSize(7);
      var noteRaw   = (e.notes||'').trim();
      var noteLines = doc.splitTextToSize(noteRaw || '\u2014', COL.notesW);
      if (noteLines.length > 3) noteLines = noteLines.slice(0,3).concat(['…']);
      var rowH = Math.max(9, noteLines.length * 4.2 + 3.5);

      if (y + rowH > H - 26) { y = newPage(); }

      // Row background
      doc.setFillColor(i%2===0 ? 248:255, i%2===0 ? 252:255, i%2===0 ? 250:255);
      doc.rect(ML-3, y, CW+6, rowH, 'F');
      // Bottom separator
      doc.setDrawColor(228,238,230); doc.setLineWidth(0.1);
      doc.line(ML-3, y+rowH, W-MR+3, y+rowH);

      runTotal += (e.amount||0);
      var ty = y + (rowH/2) + 1.5; // vertical centre of row

      // # (row number)
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(110,140,120);
      doc.text(String(i+1), COL.num, ty);

      // Date
      doc.setFont('helvetica','normal'); doc.setTextColor(25,25,25);
      doc.text(fmtDate(e.date_paid), COL.date, ty);

      // Time
      doc.setTextColor(80,80,80);
      doc.text(fmtTime(e.time_paid), COL.time, ty);

      // Type (coloured)
      var tc = typeColors[e.salary_type] || [140,140,140];
      doc.setTextColor(tc[0],tc[1],tc[2]);
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5);
      doc.text((e.salary_type||'\u2014').toUpperCase(), COL.type, ty);

      // Notes (wrapped, grey)
      doc.setFont('helvetica','normal'); doc.setFontSize(6.8); doc.setTextColor(100,115,108);
      var noteStartY = y + (rowH - noteLines.length*4.2)/2 + 4;
      noteLines.forEach(function(ln, li){ doc.text(ln, COL.notes, noteStartY + li*4.2); });

      // Amount (right-aligned, bold green)
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(14,90,50);
      doc.text(fmt(e.amount), COL.amount, ty, { align:'right' });

      y += rowH;
    });

    // ── Grand total row ─────────────────────────────────────────────
    if (y + 11 > H - 26) { y = newPage(); }
    doc.setFillColor(8,35,18);
    doc.rect(ML-3, y, CW+6, 10, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
    doc.text('TOTAL SALARY PAID', ML+2, y+7);
    doc.setTextColor(52,211,153);
    doc.text(fmt(runTotal), COL.amount, y+7, { align:'right' });
    y += 15;

    // ── Signature block ─────────────────────────────────────────────
    if (y + 28 > H - 26) { y = newPage(); }
    doc.setDrawColor(170,215,185); doc.setLineWidth(0.2);
    doc.line(ML, y+16, ML+58, y+16);
    doc.line(W-MR-58, y+16, W-MR, y+16);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(120,145,130);
    doc.text('Authorised Signatory', ML, y+20);
    doc.text('Staff Signature / Acknowledgement', W-MR-58, y+20);
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(16,185,129);
    doc.text('INCLINEWORKS INTERNATIONAL', ML+CW/2, y+8, { align:'center' });
    doc.setFont('helvetica','italic'); doc.setFontSize(6.5); doc.setTextColor(130,160,145);
    doc.text('"Excellence in Every Stitch"', ML+CW/2, y+13, { align:'center' });

    // ── Footer ─────────────────────────────────────────────────────
    _salaryPDFFooter(doc, ML, W, H, logoData);

    // ── Output / share ─────────────────────────────────────────────
    var fname = 'SalaryReceipt_'+(staffName||'Staff').replace(/\s+/g,'_')+'_'+new Date().toISOString().slice(0,10)+'.pdf';
    var bytes = doc.output('arraybuffer');
    var blob  = new Blob([bytes], { type:'application/pdf' });
    var file  = new File([blob], fname, { type:'application/pdf' });

    // Show Download / Share choice modal
    _showSalPdfActionModal(blob, fname, staffName, resolve);
  });
}

function _salaryPDFDownload(blob, fname) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = fname;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 3000);
  showToast('📥 Salary receipt saved!');
}

// ── Salary PDF Action Modal (Download / Share) ──────────────────────────────
var _salPdfPending = null; // { blob, fname, staffName, resolve }

function _showSalPdfActionModal(blob, fname, staffName, resolve) {
  _salPdfPending = { blob: blob, fname: fname, staffName: staffName, resolve: resolve };
  // Always show the WhatsApp button — on desktop it opens WhatsApp Web without downloading
  var shareBtn = document.getElementById('sal-action-share-btn');
  if (shareBtn) shareBtn.style.display = 'flex';
  var desc = document.getElementById('sal-action-desc');
  if (desc) desc.textContent = 'Share via WhatsApp or download to your device.';
  var modal = document.getElementById('sal-action-modal');
  if (modal) modal.style.display = 'flex';
}

function _closeSalPdfActionModal() {
  var modal = document.getElementById('sal-action-modal');
  if (modal) modal.style.display = 'none';
  if (_salPdfPending && _salPdfPending.resolve) _salPdfPending.resolve();
  _salPdfPending = null;
}

// Called by buttons in sal-action-modal
function _salActionDo(action) { _salPdfAction(action); } // bridges modal buttons to _salPdfAction

function _salPdfAction(action) {
  var modal = document.getElementById('sal-action-modal');
  if (modal) modal.style.display = 'none';
  if (!_salPdfPending) return;
  var blob = _salPdfPending.blob;
  var fname = _salPdfPending.fname;
  var staffName = _salPdfPending.staffName;
  var resolve = _salPdfPending.resolve;
  _salPdfPending = null;

  if (action === 'whatsapp') {
    _shareWhatsApp(blob, fname, 'Salary Receipt — ' + staffName, null);
    resolve();
  } else {
    _salaryPDFDownload(blob, fname);
    resolve();
  }
}

function _salaryPDFFooter(doc, ML, W, H, logoData) {
  var fy = H - 16;
  doc.setDrawColor(190,220,200); doc.setLineWidth(0.2);
  doc.line(ML-3, fy, W-ML+3, fy);
  fy += 3.5;
  if (logoData) { try { doc.addImage(logoData,'PNG',ML,fy-2,6,6); } catch(e){} }
  var fx = logoData ? ML+9 : ML;
  doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(16,185,129);
  doc.text('INCLINEWORKS INTERNATIONAL', fx, fy+1.5);
  doc.setFont('helvetica','normal'); doc.setFontSize(5.8); doc.setTextColor(140,140,140);
  doc.text('Official salary receipt. For enquiries contact your Incline Works administrator.', fx, fy+6);
  doc.setFont('helvetica','normal'); doc.setFontSize(6.2); doc.setTextColor(16,185,129);
  doc.text('Generated: '+new Date().toLocaleString('en-GB'), W-ML, fy+1.5, { align:'right' });
}

function _buildSalaryReceiptText(entries, downloadPDF) {
  // Legacy shim
  _buildSalaryReceiptPDF(entries, _salaryStaffName||'—', _salaryStaffId||'—');
}

async function exportSalaryExcel() {
  showToast('📊 Preparing Excel file…');

  // Fetch fresh data
  let salaries = _allSalariesCache;
  if (!salaries || !salaries.length) {
    salaries = await sbGetSalaries();
  }
  if (!salaries.length) { showToast('⚠️ No salary records to export'); return; }

  // Sort by staff name then date
  salaries = [...salaries].sort(function(a, b) {
    var n = (a.staff_name || '').localeCompare(b.staff_name || '');
    if (n !== 0) return n;
    return (a.date_paid || '').localeCompare(b.date_paid || '');
  });

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: All Payments (detailed) ──
  const detailRows = [
    ['INCLINEWORKS INT\'L — SALARY PAYMENT RECORDS'],
    ['Generated: ' + new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) + ' at ' + new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })],
    [],
    ['S/N', 'Staff Name', 'Staff ID', 'Payment Type', 'Date Paid', 'Time Paid', 'Amount (₦)', 'Notes']
  ];

  let sn = 1;
  let grandTotal = 0;
  salaries.forEach(function(s) {
    detailRows.push([
      sn++,
      s.staff_name || '',
      s.staff_id || '',
      s.salary_type || '',
      s.date_paid || '',
      s.time_paid ? s.time_paid.slice(0,5) : '',
      s.amount || 0,
      s.notes || ''
    ]);
    grandTotal += (s.amount || 0);
  });

  detailRows.push([]);
  detailRows.push(['', '', '', '', '', 'GRAND TOTAL', grandTotal, '']);

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);

  // Column widths
  wsDetail['!cols'] = [
    { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 13 }, { wch: 10 }, { wch: 16 }, { wch: 30 }
  ];

  // Merge title cells A1:H1
  wsDetail['!merges'] = [
    { s: { r:0, c:0 }, e: { r:0, c:7 } },
    { s: { r:1, c:0 }, e: { r:1, c:7 } }
  ];

  XLSX.utils.book_append_sheet(wb, wsDetail, 'All Payments');

  // ── Sheet 2: Summary by Staff ──
  const staffTotals = {};
  salaries.forEach(function(s) {
    const name = s.staff_name || 'Unknown';
    const sid  = s.staff_id   || '';
    if (!staffTotals[name]) staffTotals[name] = { staff_id: sid, total: 0, count: 0, types: {} };
    staffTotals[name].total += (s.amount || 0);
    staffTotals[name].count++;
    const t = s.salary_type || 'Other';
    staffTotals[name].types[t] = (staffTotals[name].types[t] || 0) + (s.amount || 0);
  });

  const summaryRows = [
    ['INCLINEWORKS INT\'L — SALARY SUMMARY BY STAFF'],
    ['Generated: ' + new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })],
    [],
    ['S/N', 'Staff Name', 'Staff ID', 'Total Paid (₦)', 'No. of Payments', 'Monthly (₦)', 'Weekly (₦)', 'Daily (₦)', 'Bonus (₦)', 'Advance (₦)', 'Other (₦)']
  ];

  let ssn = 1;
  let summaryTotal = 0;
  Object.entries(staffTotals).sort(function(a,b) { return a[0].localeCompare(b[0]); }).forEach(function(entry) {
    const name = entry[0];
    const d    = entry[1];
    summaryRows.push([
      ssn++,
      name,
      d.staff_id,
      d.total,
      d.count,
      d.types['Monthly']  || 0,
      d.types['Weekly']   || 0,
      d.types['Daily']    || 0,
      d.types['Bonus']    || 0,
      d.types['Advance']  || 0,
      d.types['Other']    || 0
    ]);
    summaryTotal += d.total;
  });

  summaryRows.push([]);
  summaryRows.push(['', 'TOTAL', '', summaryTotal, salaries.length, '', '', '', '', '', '']);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
  ];
  wsSummary['!merges'] = [
    { s: { r:0, c:0 }, e: { r:0, c:10 } },
    { s: { r:1, c:0 }, e: { r:1, c:10 } }
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Staff Summary');

  // ── Download ──
  const today = new Date().toISOString().slice(0,10);
  const filename = 'InclineWorks_Salary_' + today + '.xlsx';
  XLSX.writeFile(wb, filename);
  showToast('✅ Excel file downloaded: ' + filename);
}

/* ─── Script Block 11 of 12 ─── */
// ══════════════════════════════════════
// ANALYSIS TAB
// ══════════════════════════════════════

var _anxChart  = null;
var _anxDonut  = null;

function renderAnalysis() {
  var tf  = (document.getElementById('anx-time')  || {}).value || 'all';
  var sf  = (document.getElementById('anx-staff') || {}).value || 'all';
  var cat = (document.getElementById('anx-cat')   || {}).value || 'all';

  // Populate staff dropdown once
  var staffSel = document.getElementById('anx-staff');
  if (staffSel && staffSel.options.length <= 1) {
    getStaffProfiles().forEach(function(s) {
      var o = document.createElement('option');
      o.value = s.name; o.textContent = s.name;
      staffSel.appendChild(o);
    });
  }

  var profiles  = getStaffProfiles();
  var allOrders = getOrders();

  // Smart timeframe: if selected period has no data, auto-expand to find data
  var now = new Date();
  function getCutoff(period) {
    if (period === 'week')   return new Date(now - 7  * 864e5);
    if (period === 'month')  return new Date(now - 30 * 864e5);
    if (period === '3month') return new Date(now - 90 * 864e5);
    if (period === 'year')   return new Date(now.getFullYear(), 0, 1);
    return null;
  }

  var cutoff = getCutoff(tf);
  var filtered = allOrders.filter(function(o) {
    if (!cutoff) return true;
    return new Date(o.orderDate || o.date) >= cutoff;
  });

  // If nothing found and a specific period was chosen AND no staff filter, auto-expand
  var autoExpanded = false;
  if (!filtered.length && tf !== 'all' && sf === 'all') {
    filtered = allOrders.slice();
    autoExpanded = true;
  }

  // Show/hide auto-expand notice
  var notice = document.getElementById('anx-expand-notice');
  if (notice) notice.style.display = autoExpanded ? 'block' : 'none';

  var orders = filtered;

  if (sf !== 'all') {
    var profile = profiles.find(function(p) { return p.name === sf; });
    orders = orders.filter(function(o) {
      return (profile && o.staffId && o.staffId === profile.staffId) ||
             (o.clientName && o.clientName.toLowerCase() === sf.toLowerCase());
    });
  }

  // Aggregate
  var svcMap = {};
  orders.forEach(function(o) {
    (o.services || []).forEach(function(sv) {
      var name = (sv.name || '').trim();
      if (!name) return;
      var isCut = name.toLowerCase().includes('cutting') || /— cut/i.test(name);
      var short = name.replace(/ — (Cutting|Sewing)$/i, '');
      if (!svcMap[short]) svcMap[short] = { qty: 0, isCut: isCut };
      svcMap[short].qty += (sv.qty || 1);
    });
  });

  var entries = Object.entries(svcMap);
  if (cat === 'sewing')  entries = entries.filter(function(e) { return !e[1].isCut; });
  if (cat === 'cutting') entries = entries.filter(function(e) { return  e[1].isCut; });
  entries.sort(function(a, b) { return b[1].qty - a[1].qty; });

  var totalSewn = 0, totalCut = 0;
  entries.forEach(function(e) { if (e[1].isCut) totalCut += e[1].qty; else totalSewn += e[1].qty; });

  document.getElementById('anx-total-sewn').textContent = totalSewn;
  document.getElementById('anx-total-cut').textContent  = totalCut;
  document.getElementById('anx-total-svc').textContent  = entries.length;

  // Always keep canvas intact — show/hide empty state overlay instead
  var emptyEl  = document.getElementById('anx-empty-state');
  var barWrap  = document.getElementById('anx-bar-wrap');
  var donutWrap = document.getElementById('anx-donut-wrap');

  if (!entries.length) {
    if (emptyEl)  emptyEl.style.display  = 'block';
    if (barWrap)  { var bc = document.getElementById('anx-bar-chart'); if (bc) bc.style.display = 'none'; }
    if (donutWrap) donutWrap.style.display = 'none';
    if (_anxChart) { _anxChart.destroy(); _anxChart = null; }
    if (_anxDonut) { _anxDonut.destroy(); _anxDonut = null; }
    return;
  }
  // Has data — hide empty state, show charts
  if (emptyEl)  emptyEl.style.display  = 'none';
  if (donutWrap) donutWrap.style.display = '';
  var bcEl = document.getElementById('anx-bar-chart');
  if (bcEl) bcEl.style.display = '';

  // ── Main horizontal bar chart (top 15) ──
  var top = entries.slice(0, 15);
  var labels   = top.map(function(e) { var l = e[0]; return l.length > 24 ? l.slice(0,22)+'…' : l; });
  var values   = top.map(function(e) { return e[1].qty; });
  var bgColors = top.map(function(e) { return e[1].isCut ? 'rgba(48,168,255,0.75)' : 'rgba(16,185,129,0.75)'; });
  var borders  = top.map(function(e) { return e[1].isCut ? '#FBBF24' : '#10B981'; });

  // Bar thickness scales with number of items — fewer items = fatter bars
  var barThick = top.length <= 5 ? 32 : top.length <= 8 ? 26 : top.length <= 12 ? 20 : 14;

  // Portrait chart — fixed height
  var chartH = 300;
  var barCanvas = document.getElementById('anx-bar-chart');
  if (barCanvas) barCanvas.height = chartH;

  if (_anxChart) _anxChart.destroy();
  var bctx = document.getElementById('anx-bar-chart').getContext('2d');
  _anxChart = new Chart(bctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantity', data: values,
        backgroundColor: bgColors, borderColor: borders,
        borderWidth: 1.5, borderRadius: 5, borderSkipped: false,
        barThickness: barThick
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111816',
          borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1,
          titleColor: '#F0EAD6', bodyColor: '#aaa', padding: 12,
          callbacks: {
            title: function(items) { return top[items[0].dataIndex][0]; },
            label: function(item) { return ' ' + item.raw + ' piece' + (item.raw !== 1 ? 's' : ''); }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#bbb', font: { size: 11 }, maxRotation: 35, minRotation: 25,
            callback: function(val, i) {
              var l = labels[i] || '';
              return l.length > 14 ? l.slice(0,13)+'…' : l;
            }
          }
        },
        y: {
          beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#666', font: { size: 11 }, stepSize: 1 }
        }
      }
    }
  });

  // ── Donut: cut vs sewn ──
  if (_anxDonut) _anxDonut.destroy();
  var dctx = document.getElementById('anx-donut-chart').getContext('2d');
  _anxDonut = new Chart(dctx, {
    type: 'doughnut',
    data: {
      labels: ['Sewn 🪡', 'Cut ✂'],
      datasets: [{
        data: [totalSewn || 0.001, totalCut || 0.001],
        backgroundColor: ['rgba(16,185,129,0.75)', 'rgba(48,168,255,0.75)'],
        borderColor: ['#10B981', '#FBBF24'],
        borderWidth: 2, hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      animation: { duration: 600 },
      plugins: {
        legend: { position: 'bottom', labels: { color: '#aaa', font: { size: 12 }, padding: 14 } },
        tooltip: {
          backgroundColor: '#111816', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1,
          titleColor: '#F0EAD6', bodyColor: '#aaa', padding: 10,
          callbacks: { label: function(i) { return ' ' + i.raw.toLocaleString() + ' pieces'; } }
        }
      }
    }
  });

  // ── Service breakdown rows ──
  var svcRowsEl = document.getElementById('anx-svc-rows');
  if (svcRowsEl && entries.length) {
    var maxQty = entries[0][1].qty || 1;
    svcRowsEl.innerHTML = entries.map(function(e, i) {
      var name = e[0]; var d = e[1];
      var pct  = Math.round((d.qty / maxQty) * 100);
      var color = d.isCut ? '#FBBF24' : '#10B981';
      var bg    = d.isCut ? 'rgba(48,168,255,0.1)' : 'rgba(16,185,129,0.1)';
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;margin-bottom:6px;background:'+bg+';border:1px solid rgba(255,255,255,0.04);transition:all 0.15s;">'
        + '<div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.25);width:18px;text-align:right;flex-shrink:0;">'+(i+1)+'</div>'
        + '<div style="flex:1;min-width:0;">'
          + '<div style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;">'+name+'</div>'
          + '<div style="height:4px;background:rgba(255,255,255,0.07);border-radius:4px;overflow:hidden;">'
            + '<div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:4px;transition:width 0.4s ease;"></div>'
          + '</div>'
        + '</div>'
        + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;font-weight:700;color:'+color+';flex-shrink:0;min-width:36px;text-align:right;">'+d.qty+'</div>'
        + '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.25);flex-shrink:0;width:28px;">'+(d.isCut?'cut':'sew')+'</div>'
      + '</div>';
    }).join('');
  }
}

/* ─── Script Block 12 of 12 ─── */
(function(){
  var _cVal='0', _cExpr='', _cOp=null, _cPrev=null, _cFresh=false;

  function formatNumber(num){
    if(num === "Error") return num;
    let parts = num.toString().split(".");
    parts[0] = parseFloat(parts[0]).toLocaleString();
    return parts.join(".");
  }
  function _disp(){
    var el=document.getElementById('calcDisplay');
    var ex=document.getElementById('calcExpr');
    if(el){
      var txt = formatNumber(_cVal);
      el.textContent = txt;
      el.className='calc-display'+(_cVal==='Error'?' has-error':'');
      // Auto-scale font so number never escapes the box
      var len = txt.replace(/[^0-9.\-]/g,'').length;
      var fs = len <= 9 ? 42 : len <= 12 ? 32 : len <= 15 ? 24 : 18;
      el.style.fontSize = fs + 'px';
    }
    if(ex) ex.textContent=_cExpr||'\u00a0';
  }
  function _fmt(n){
    if(!isFinite(n)) return 'Error';
    return parseFloat(n.toPrecision(10)).toString();
  }

  window.calcNum=function(d){
    if(_cVal==='Error') calcAC();
    if(_cFresh||_cVal==='0'){ _cVal=d; _cFresh=false; }
    else{ if(_cVal.replace('-','').length>=12) return; _cVal+=d; }
    _disp();
  };
  window.calcDot=function(){
    if(_cFresh){_cVal='0';_cFresh=false;}
    if(!_cVal.includes('.')) _cVal+='.';
    _disp();
  };
  window.calcOp=function(op){
    if(_cVal==='Error'){calcAC();return;}
    if(_cOp&&!_cFresh) calcEquals(true);
    _cPrev=parseFloat(_cVal); _cOp=op; _cExpr=_cVal+' '+op; _cFresh=true;
    _disp();
  };
  window.calcEquals=function(chain){
    if(_cOp===null||_cPrev===null) return;
    var cur=parseFloat(_cVal), res;
    switch(_cOp){
      case '+': res=_cPrev+cur; break;
      case '−': res=_cPrev-cur; break;
      case '×': res=_cPrev*cur; break;
      case '÷': res=cur===0?NaN:_cPrev/cur; break;
      default:  res=cur;
    }
    if(!isFinite(res)){
      _cExpr=_cVal+' '+_cOp+' '+cur+' ='; _cVal='Error';
      _cOp=null; _cPrev=null; _cFresh=true;
    } else {
      if(!chain) _cExpr=(_cExpr||_cPrev)+' '+_cVal+' =';
      _cVal=_fmt(res);
      if(!chain){_cOp=null;_cPrev=null;} else _cPrev=res;
      _cFresh=true;
    }
    _disp();
  };
  window.calcAC=function(){
    _cVal='0';_cExpr='';_cOp=null;_cPrev=null;_cFresh=false; _disp();
  };
  window.calcBack=function(){
    if(_cVal==='Error'||_cFresh){_cVal='0';_cFresh=false;}
    else if(_cVal.length>1){_cVal=_cVal.slice(0,-1);}
    else{_cVal='0';}
    _disp();
  };
  window.calcToggleSign=function(){
    if(_cVal==='0'||_cVal==='Error') return;
    _cVal=_cVal.startsWith('-')?_cVal.slice(1):'-'+_cVal; _disp();
  };
  window.calcPercent=function(){
    var n=parseFloat(_cVal); if(!isFinite(n)) return;
    _cVal=_fmt(n/100); _disp();
  };
  document.addEventListener('click',function(e){
    var d=document.getElementById('calcDropdown');
    var btn=document.getElementById('calcToggleBtn');
    if(!d||d.style.display==='none') return;
    if(!d.contains(e.target)&&btn&&!btn.contains(e.target)){
      d.style.display='none';
      if(btn){btn.style.color='';btn.style.background='';}
    }
  });
  document.addEventListener('keydown',function(e){
    var d=document.getElementById('calcDropdown');
    if(!d||d.style.display==='none') return;
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    if('0123456789'.includes(e.key)){calcNum(e.key);e.preventDefault();}
    else if(e.key==='.'){calcDot();e.preventDefault();}
    else if(e.key==='+'){calcOp('+');e.preventDefault();}
    else if(e.key==='-'){calcOp('−');e.preventDefault();}
    else if(e.key==='*'){calcOp('×');e.preventDefault();}
    else if(e.key==='/'){calcOp('÷');e.preventDefault();}
    else if(e.key==='Enter'||e.key==='='){calcEquals();e.preventDefault();}
    else if(e.key==='Escape'){toggleCalcDropdown();e.preventDefault();}
    else if(e.key==='Backspace'){calcBack();e.preventDefault();}
  });
})();

/* ── FINAL CALCULATOR DROPDOWN FIX ── */
(function(){
  let isOpen = false;

  window.toggleCalcDropdown = function(e){
    if(e){ e.preventDefault(); e.stopPropagation(); }
    const dropdown = document.getElementById('calcDropdown');
    if(!dropdown) return;
    isOpen = !isOpen;
    if(isOpen){
      dropdown.style.display = 'block';
      requestAnimationFrame(function(){
        dropdown.style.opacity  = '1';
        dropdown.style.transform = 'translateY(0)';
      });
    } else {
      dropdown.style.opacity   = '0';
      dropdown.style.transform = 'translateY(20px)';
      setTimeout(function(){ dropdown.style.display = 'none'; }, 260);
    }
  };

  window.toggleCalcSize = function(){
    const dropdown = document.getElementById('calcDropdown');
    if(!dropdown) return;
    var currentWidth = parseFloat(dropdown.style.width || '240px');
    var currentHeight = parseFloat(dropdown.style.height || 'auto');
    
    if(currentWidth === 240){
      dropdown.style.width = '420px';
      dropdown.style.height = '540px';
      showToast('📐 Calculator enlarged');
    } else {
      dropdown.style.width = '240px';
      dropdown.style.height = 'auto';
      showToast('📐 Calculator restored');
    }
  };

  document.addEventListener('click', function(e){
    if(!isOpen) return;
    const dropdown = document.getElementById('calcDropdown');
    const btn = document.getElementById('calcToggleBtn');
    if(!dropdown || !btn) return;
    if(!dropdown.contains(e.target) && !btn.contains(e.target)){
      isOpen = false;
      dropdown.style.opacity   = '0';
      dropdown.style.transform = 'translateY(20px)';
      setTimeout(function(){ dropdown.style.display = 'none'; }, 260);
    }
  });

  /* ── Make calculator draggable ── */
  (function makeDraggable(panelId, handleId){
    var panel, handle, dragging = false, ox = 0, oy = 0;
    function init(){
      panel  = document.getElementById(panelId);
      handle = document.getElementById(handleId);
      if(!panel || !handle) { setTimeout(init, 400); return; }
      handle.addEventListener('mousedown', function(e){
        if(e.button !== 0) return;
        dragging = true;
        var r = panel.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        panel.style.transition = 'none';
        panel.style.right = 'unset';
        panel.style.bottom = 'unset';
        handle.style.cursor = 'grabbing';
        e.preventDefault();
      });
      document.addEventListener('mousemove', function(e){
        if(!dragging) return;
        panel.style.left = (e.clientX - ox) + 'px';
        panel.style.top  = (e.clientY - oy) + 'px';
      });
      document.addEventListener('mouseup', function(){
        if(!dragging) return;
        dragging = false;
        panel.style.transition = '';
        handle.style.cursor = 'grab';
      });
    }
    init();
  })('calcDropdown', 'calc-drag-handle');

  /* ── Use in Order: paste calc value into active price/amount field ── */
  window.calcUseInOrder = function(){
    var val = parseFloat(document.getElementById('calcDisplay').textContent.replace(/,/g,''));
    if(!isFinite(val)) return;
    // Try to fill active service price row first, then deduction, then advance
    var focused = document.activeElement;
    if(focused && (focused.type === 'number' || focused.type === 'text') && focused !== document.getElementById('calcDisplay')){
      focused.value = val;
      focused.dispatchEvent(new Event('input',{bubbles:true}));
    } else {
      showToast('📋 ' + val.toLocaleString() + ' copied — click a number field then "Use in Order"');
    }
  };
})();

/* ══════════════════════════════════════════════════════
   STAFF CHAT — WhatsApp UI (Full Feature Rebuild)
   ══════════════════════════════════════════════════════ */
(function(){
  var _chatStaff  = '__general__';
  var _chatView   = 'admin';
  var CHAT_KEY    = 'incline_chat_';
  var _replyIdx   = null;   // index of message being replied to
  var _ctxIdx     = null;   // index of message in context menu
  var _searchQ    = '';
  var _emojiOpen  = false;
  var _typingTimer= null;

  /* ── Storage ── */
  function _chatKey(id){ return CHAT_KEY + (id || '__general__'); }
  function _loadMsgs(id){ try{ return JSON.parse(localStorage.getItem(_chatKey(id)) || '[]'); }catch(e){ return []; } }
  function _saveMsgs(id, msgs){ localStorage.setItem(_chatKey(id), JSON.stringify(msgs)); }
  function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ── Date grouping helper ── */
  function _dayLabel(isoStr){
    var d = new Date(isoStr);
    var today = new Date();
    var yest  = new Date(); yest.setDate(yest.getDate()-1);
    if(d.toDateString()===today.toDateString()) return 'Today';
    if(d.toDateString()===yest.toDateString())  return 'Yesterday';
    return d.toLocaleDateString([],{weekday:'long',day:'numeric',month:'long'});
  }

  /* ── Render messages ── */
  function _renderMsgs(){
    var box = document.getElementById('chat-messages');
    if(!box) return;
    var msgs = _loadMsgs(_chatStaff);

    if(!msgs.length){
      box.innerHTML = '<div class="wa-empty"><div class="wa-empty-icon">💬</div><div class="wa-empty-text">No messages yet.<br/>Say hello to get things started!</div></div>';
      return;
    }

    var html = '';
    var lastDay = '';

    msgs.forEach(function(m, idx){
      if(m.deleted){ return; } // skip deleted

      // Apply search filter
      if(_searchQ && !m.text.toLowerCase().includes(_searchQ.toLowerCase())){ return; }

      var isMe   = m.sender === 'admin';
      var dir    = isMe ? 'out' : 'in';
      var ts     = m.ts ? new Date(m.ts) : new Date();
      var day    = _dayLabel(m.ts||'');
      var time   = ts.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      var edited = m.edited ? '<span class="wa-edited-tag">(edited)</span>' : '';

      // Date separator
      if(day !== lastDay){
        html += '<div class="wa-date-sep"><span>'+_esc(day)+'</span></div>';
        lastDay = day;
      }

      // Search highlight
      var displayText = _esc(m.text);
      if(_searchQ){
        var re = new RegExp('('+_searchQ.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
        displayText = displayText.replace(re,'<span class="wa-highlight">$1</span>');
      }

      // Reply quote
      var replyHtml = '';
      if(m.replyTo != null && msgs[m.replyTo] && !msgs[m.replyTo].deleted){
        var rq = msgs[m.replyTo];
        replyHtml = '<div class="wa-bubble-reply"><strong>'+_esc(rq.sender==='admin'?'Admin':'Staff')+'</strong>'+_esc(rq.text.substring(0,80))+(rq.text.length>80?'…':'')+'</div>';
      }

      // Reactions
      var reactHtml = '';
      if(m.reactions && Object.keys(m.reactions).length){
        reactHtml = '<div class="wa-reactions">';
        Object.entries(m.reactions).forEach(function(kv){
          reactHtml += '<span class="wa-reaction-chip" onclick="toggleReaction('+idx+',\''+kv[0]+'\')">'+kv[0]+' <span class="wa-reaction-count">'+kv[1]+'</span></span>';
        });
        reactHtml += '</div>';
      }

      // Quick reaction popup
      var qrPos = isMe ? 'out' : 'in';
      var qrHtml = '<div class="wa-quick-reactions '+qrPos+'" id="wa-qr-'+idx+'">'+
        ['❤️','😂','👍','😮','😢','🙏'].map(function(e){
          return '<button class="wa-qr-btn" onclick="quickReact('+idx+',\''+e+'\')">'+e+'</button>';
        }).join('')+
      '</div>';

      // Ticks (only for sent messages)
      var ticks = isMe ? '<span class="wa-ticks">✓✓</span>' : '';

      // Build bubble content (text or attachment)
      var bubbleContent = '';
      if(m.attachment){
        var att = m.attachment;
        var sizeFmt = att.size ? (att.size > 1048576 ? (att.size/1048576).toFixed(1)+' MB' : (att.size/1024).toFixed(0)+' KB') : '';
        if(att.type === 'image'){
          bubbleContent = '<div class="wa-img-bubble" onclick="openLightbox(\''+att.dataUrl+'\')">'
            + '<img src="'+att.dataUrl+'" alt="'+_esc(att.name)+'"/>'
            + '</div>';
          if(m.text) bubbleContent += '<span>'+displayText+'</span>';
        } else if(att.type === 'audio'){
          var waveHtml = '';
          for(var wi=0;wi<24;wi++){
            var h = 4 + Math.floor(Math.random()*20);
            waveHtml += '<div class="wa-wave-bar" style="height:'+h+'px"></div>';
          }
          bubbleContent = '<div class="wa-audio-bubble">'
            + '<button class="wa-audio-play" onclick="playAudio(\''+att.dataUrl+'\',this)"><i class="fa-solid fa-play"></i></button>'
            + '<div class="wa-audio-waveform">'+waveHtml+'</div>'
            + '<span class="wa-audio-dur">0:00</span>'
            + '</div>';
        } else {
          // document / video
          var fileIcon = '📄';
          if(att.mime){
            if(att.mime.includes('pdf')) fileIcon='📕';
            else if(att.mime.includes('word')||att.mime.includes('docx')) fileIcon='📝';
            else if(att.mime.includes('excel')||att.mime.includes('xlsx')||att.mime.includes('sheet')) fileIcon='📊';
            else if(att.mime.includes('video')) fileIcon='🎬';
            else if(att.mime.includes('zip')||att.mime.includes('rar')) fileIcon='🗜️';
            else if(att.mime.includes('powerpoint')||att.mime.includes('pptx')) fileIcon='📑';
            else if(att.mime.includes('csv')||att.mime.includes('text')) fileIcon='📋';
          }
          bubbleContent = '<div class="wa-file-bubble">'
            + '<div class="wa-file-icon-wrap">'+fileIcon+'</div>'
            + '<div class="wa-file-info">'
            + '<div class="wa-file-name">'+_esc(att.name)+'</div>'
            + '<div class="wa-file-size">'+sizeFmt+'</div>'
            + '</div>'
            + '<a class="wa-file-dl" href="'+att.dataUrl+'" download="'+_esc(att.name)+'" title="Download"><i class="fa-solid fa-download"></i></a>'
            + '</div>';
          if(m.text) bubbleContent += '<span>'+displayText+'</span>';
        }
      } else {
        bubbleContent = replyHtml + '<span>'+displayText+'</span>'+edited;
      }

      html +=
        '<div class="wa-msg-row '+dir+'" id="wa-row-'+idx+'" style="position:relative;"'
        +' oncontextmenu="showCtxMenu(event,'+idx+')"'
        +' onmouseenter="showQuickReact('+idx+')"'
        +' onmouseleave="hideQuickReact('+idx+')">'
        + qrHtml
        + '<div class="wa-bubble '+dir+'">'
        + (m.attachment ? '' : replyHtml)
        + bubbleContent
        + '<div class="wa-meta">'+time+ticks+'</div>'
        + '</div>'
        + reactHtml
        +'</div>';
    });

    box.innerHTML = html;
    requestAnimationFrame(function(){ box.scrollTop = box.scrollHeight; });
  }

  /* ── Contact header ── */
  function _updateContactHeader(){
    var nameEl   = document.getElementById('chat-contact-name');
    var avatarEl = document.getElementById('chat-contact-avatar');
    var statusEl = document.getElementById('wa-status-text');
    var isGen    = _chatStaff === '__general__';
    var label    = isGen ? 'General' : _chatStaff;
    var initials = isGen ? 'IW' : label.substring(0,2).toUpperCase();
    if(nameEl)   nameEl.textContent   = label;
    if(avatarEl) avatarEl.textContent = initials;
    if(statusEl) statusEl.textContent = 'online';
  }

  /* ── Populate channel select ── */
  function _populateStaffSelect(){
    var sel = document.getElementById('chat-staff-select');
    if(!sel) return;
    var staff = [];
    try{ staff = JSON.parse(localStorage.getItem('incline_staff')||'[]'); }catch(e){}
    sel.innerHTML = '<option value="__general__">📋 General</option>';
    staff.forEach(function(s){
      var opt = document.createElement('option');
      opt.value = s.staffId||s.id||s.name;
      opt.textContent = '👤 '+(s.name||s.staffId||'Staff');
      sel.appendChild(opt);
    });
    sel.value = _chatStaff;
  }

  /* ── Populate sidebar staff list ── */
  function _populateStaffList(filter){
    var list = document.getElementById('chat-staff-list');
    if(!list) return;
    var staff = [];
    try{ staff = JSON.parse(localStorage.getItem('incline_staff')||'[]'); }catch(e){}
    filter = (filter||'').toLowerCase();
    var filtered = filter ? staff.filter(function(s){ return (s.name||'').toLowerCase().includes(filter)||(s.staffId||'').toLowerCase().includes(filter); }) : staff;

    list.innerHTML = filtered.map(function(s){
      var name = s.name||s.staffId||'Staff';
      var isActive = _chatStaff === (s.staffId||s.id||s.name) ? ' active' : '';
      return '<div class="wa-staff-item'+isActive+'" onclick="selectStaffChat(\''+_esc(s.staffId||s.id||s.name)+'\')">'
        + '<div class="wa-staff-avatar">'+name.charAt(0).toUpperCase()+'</div>'
        + '<div><div class="wa-staff-name">'+_esc(name)+'</div>'
        + '<div class="wa-staff-id">'+_esc(s.staffId||'')+'</div></div>'
        + '</div>';
    }).join('');
  }

  /* ── Typing indicator ── */
  function _showTyping(){
    var t = document.getElementById('wa-typing');
    if(t) t.style.display='flex';
    clearTimeout(_typingTimer);
    _typingTimer = setTimeout(function(){ var el=document.getElementById('wa-typing'); if(el) el.style.display='none'; }, 2000);
  }

  /* ══ PUBLIC API ══ */

  window.chatSwitchStaff = function(){
    var sel = document.getElementById('chat-staff-select');
    if(sel) _chatStaff = sel.value;
    _replyIdx = null;
    cancelReply();
    _updateContactHeader();
    _renderMsgs();
  };

  window.chatSend = function(){
    var inp = document.getElementById('chat-input');
    if(!inp) return;
    var text = inp.value.trim();
    if(!text) return;
    var msgs = _loadMsgs(_chatStaff);
    var msg = { sender:'admin', text:text, ts:new Date().toISOString(), edited:false, editedText:null, reactions:{} };
    if(_replyIdx !== null) msg.replyTo = _replyIdx;
    msgs.push(msg);
    _saveMsgs(_chatStaff, msgs);
    inp.value = '';
    inp.style.height = 'auto';
    _replyIdx = null;
    cancelReply();
    _renderMsgs();
    // Simulate typing response after a bit
    setTimeout(function(){ _showTyping(); }, 600);
  };

  window.switchChatView = function(view){
    _chatView = view;
    var adminBtn = document.getElementById('chatViewAdminBtn');
    var staffBtn = document.getElementById('chatViewStaffBtn');
    var sidebar  = document.getElementById('chat-staff-sidebar');
    if(view==='admin'){
      if(adminBtn){ adminBtn.classList.add('wa-view-active'); }
      if(staffBtn){ staffBtn.classList.remove('wa-view-active'); }
      if(sidebar)  sidebar.style.display = 'none';
    } else {
      if(staffBtn){ staffBtn.classList.add('wa-view-active'); }
      if(adminBtn){ adminBtn.classList.remove('wa-view-active'); }
      if(sidebar){ sidebar.style.display = 'flex'; }
      _populateStaffList();
    }
  };

  window.selectStaffChat = function(staffId){
    _chatStaff = staffId;
    var sel = document.getElementById('chat-staff-select');
    if(sel) sel.value = staffId;
    _replyIdx = null;
    cancelReply();
    _updateContactHeader();
    _renderMsgs();
    _populateStaffList();
  };

  window.filterStaffList = function(q){ _populateStaffList(q); };

  /* ── Attachment Menu Toggle ── */
  var _attachMenuOpen = false;

  window.toggleAttachMenu = function(e){
    e.stopPropagation();
    var menu = document.getElementById('wa-attach-menu');
    var btn  = document.getElementById('wa-attach-btn');
    if(!menu) return;
    _attachMenuOpen = !_attachMenuOpen;
    if(_attachMenuOpen){
      menu.classList.add('show');
      if(btn) btn.classList.add('attach-active');
    } else {
      menu.classList.remove('show');
      if(btn) btn.classList.remove('attach-active');
    }
  };

  /* Close menu when clicking outside */
  document.addEventListener('click', function(e){
    var menu = document.getElementById('wa-attach-menu');
    var btn  = document.getElementById('wa-attach-btn');
    if(menu && !menu.contains(e.target) && e.target !== btn && !(btn && btn.contains(e.target))){
      menu.classList.remove('show');
      if(btn) btn.classList.remove('attach-active');
      _attachMenuOpen = false;
    }
  });

  /* ── Trigger file input by type ── */
  window.attachTrigger = function(type){
    var menu = document.getElementById('wa-attach-menu');
    var btn  = document.getElementById('wa-attach-btn');
    if(menu){ menu.classList.remove('show'); }
    if(btn) btn.classList.remove('attach-active');
    _attachMenuOpen = false;

    if(type === 'image'){
      document.getElementById('wa-file-image').click();
    } else if(type === 'document'){
      document.getElementById('wa-file-document').click();
    } else if(type === 'audio'){
      document.getElementById('wa-file-audio').click();
    } else if(type === 'camera'){
      // Camera: open image input with capture
      var inp = document.getElementById('wa-file-image');
      inp.setAttribute('capture','camera');
      inp.click();
      setTimeout(()=>inp.removeAttribute('capture'), 2000);
    } else if(type === 'location'){
      _sendLocationMessage();
    } else if(type === 'contact'){
      _sendContactMessage();
    }
  };

  /* ── Handle file selection ── */
  window.handleFileAttach = function(input, kind){
    var files = Array.from(input.files);
    if(!files.length) return;
    files.forEach(function(file){
      var reader = new FileReader();
      reader.onload = function(ev){
        var dataUrl = ev.target.result;
        _sendFileMessage(file, dataUrl, kind);
      };
      reader.readAsDataURL(file);
    });
    input.value = ''; // reset so same file can be re-attached
  };

  /* Build and save a file message */
  function _sendFileMessage(file, dataUrl, kind){
    var msgs = _loadMsgs(_chatStaff);
    var isImage = kind === 'image' || file.type.startsWith('image/');
    var isVideo = file.type.startsWith('video/');
    var isAudio = kind === 'audio' || file.type.startsWith('audio/');

    var msg = {
      id: Date.now() + Math.random(),
      sender: _chatView === 'staff' ? 'staff' : 'admin',
      text: '',
      ts: Date.now(),
      attachment: {
        type: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document',
        name: file.name,
        size: file.size,
        mime: file.type,
        dataUrl: dataUrl
      }
    };
    msgs.push(msg);
    _saveMsgs(_chatStaff, msgs);
    _renderMsgs();
    showToast('📎 ' + file.name + ' sent');
  }

  /* Location message */
  function _sendLocationMessage(){
    if(!navigator.geolocation){ showToast('⚠️ Geolocation not available'); return; }
    showToast('📍 Getting location…');
    navigator.geolocation.getCurrentPosition(function(pos){
      var lat = pos.coords.latitude.toFixed(5);
      var lng = pos.coords.longitude.toFixed(5);
      var msgs = _loadMsgs(_chatStaff);
      msgs.push({
        id: Date.now(),
        sender: _chatView === 'staff' ? 'staff' : 'admin',
        text: '📍 Location shared\nLat: ' + lat + '\nLng: ' + lng + '\nhttps://maps.google.com/?q=' + lat + ',' + lng,
        ts: Date.now()
      });
      _saveMsgs(_chatStaff, msgs);
      _renderMsgs();
      showToast('📍 Location shared');
    }, function(){ showToast('⚠️ Location permission denied'); });
  }

  /* Contact card message */
  function _sendContactMessage(){
    var name = localStorage.getItem('incline_admin_name') || 'Admin';
    var msgs = _loadMsgs(_chatStaff);
    msgs.push({
      id: Date.now(),
      sender: _chatView === 'staff' ? 'staff' : 'admin',
      text: '👤 Contact Card\n' + name + '\nInclineWorks International\nIW-ADM-001',
      ts: Date.now()
    });
    _saveMsgs(_chatStaff, msgs);
    _renderMsgs();
    showToast('👤 Contact card sent');
  }

  /* Legacy stub kept for any old calls */
  window.attachFile = function(){ window.toggleAttachMenu({ stopPropagation: function(){} }); };

  window.editChatMessage = function(idx){
    var msgs = _loadMsgs(_chatStaff);
    var msg = msgs[idx];
    if(!msg || msg.sender!=='admin') return;
    var newText = prompt('Edit message:', msg.text);
    if(newText && newText.trim() && newText.trim() !== msg.text){
      msg.editedText = msg.text;
      msg.text = newText.trim();
      msg.edited = true;
      _saveMsgs(_chatStaff, msgs);
      _renderMsgs();
      showToast('✓ Message edited');
    }
  };

  /* ── Context menu ── */
  window.showCtxMenu = function(e, idx){
    e.preventDefault();
    _ctxIdx = idx;
    var menu = document.getElementById('wa-ctx-menu');
    if(!menu) return;
    menu.style.display = 'block';
    var x = e.clientX, y = e.clientY;
    if(x + 180 > window.innerWidth) x -= 180;
    if(y + 160 > window.innerHeight) y -= 160;
    menu.style.left = x+'px'; menu.style.top = y+'px';
  };
  document.addEventListener('click', function(e){
    var m = document.getElementById('wa-ctx-menu');
    if(m && !m.contains(e.target)){ m.style.display='none'; _ctxIdx=null; }
    var ep = document.getElementById('wa-emoji-picker');
    if(ep && !ep.contains(e.target) && !e.target.closest('.wa-input-btn')){ ep.style.display='none'; _emojiOpen=false; }
  });

  window.ctxReply = function(){
    if(_ctxIdx===null) return;
    var msgs = _loadMsgs(_chatStaff);
    var msg  = msgs[_ctxIdx];
    if(!msg) return;
    _replyIdx = _ctxIdx;
    var banner = document.getElementById('wa-reply-banner');
    var prev   = document.getElementById('wa-reply-preview');
    if(banner) banner.style.display = 'flex';
    if(prev)   prev.textContent = msg.text.substring(0,60)+(msg.text.length>60?'…':'');
    document.getElementById('chat-input').focus();
    document.getElementById('wa-ctx-menu').style.display = 'none';
  };
  window.ctxEdit = function(){
    var idx = _ctxIdx;
    document.getElementById('wa-ctx-menu').style.display='none';
    if(idx===null) return;
    window.editChatMessage(idx);
  };
  window.ctxCopy = function(){
    var msgs = _loadMsgs(_chatStaff);
    var msg  = _ctxIdx!==null ? msgs[_ctxIdx] : null;
    if(msg){ try{ navigator.clipboard.writeText(msg.text); showToast('📋 Copied to clipboard'); }catch(e){} }
    document.getElementById('wa-ctx-menu').style.display='none';
  };
  window.ctxDelete = function(){
    if(_ctxIdx===null) return;
    var msgs = _loadMsgs(_chatStaff);
    if(msgs[_ctxIdx]){ msgs[_ctxIdx].deleted = true; _saveMsgs(_chatStaff, msgs); _renderMsgs(); showToast('🗑 Message deleted'); }
    document.getElementById('wa-ctx-menu').style.display='none';
  };

  /* ── Reply ── */
  window.cancelReply = function(){
    _replyIdx = null;
    var b = document.getElementById('wa-reply-banner'); if(b) b.style.display='none';
  };

  /* ── Image Lightbox ── */
  window.openLightbox = function(src){
    var lb = document.getElementById('wa-lightbox');
    var img = document.getElementById('wa-lightbox-img');
    if(!lb || !img) return;
    img.src = src;
    lb.classList.add('open');
  };
  window.closeLightbox = function(){
    var lb = document.getElementById('wa-lightbox');
    if(lb) lb.classList.remove('open');
  };
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') window.closeLightbox();
  });

  /* ── Audio playback ── */
  var _currentAudio = null;
  window.playAudio = function(src, btn){
    if(_currentAudio && !_currentAudio.paused){
      _currentAudio.pause();
      if(btn) btn.innerHTML='<i class="fa-solid fa-play"></i>';
      if(_currentAudio._btn && _currentAudio._btn !== btn)
        _currentAudio._btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
    if(_currentAudio && _currentAudio.src === src && !_currentAudio.ended){
      _currentAudio = null; return;
    }
    var audio = new Audio(src);
    audio._btn = btn;
    _currentAudio = audio;
    if(btn) btn.innerHTML='<i class="fa-solid fa-pause"></i>';
    audio.play();
    audio.onended = function(){
      if(btn) btn.innerHTML='<i class="fa-solid fa-play"></i>';
    };
  };


  window.showQuickReact = function(idx){
    var el = document.getElementById('wa-qr-'+idx);
    if(el) el.classList.add('show');
  };
  window.hideQuickReact = function(idx){
    var el = document.getElementById('wa-qr-'+idx);
    if(el) el.classList.remove('show');
  };
  window.quickReact = function(idx, emoji){
    var msgs = _loadMsgs(_chatStaff);
    if(!msgs[idx]) return;
    if(!msgs[idx].reactions) msgs[idx].reactions = {};
    var r = msgs[idx].reactions;
    r[emoji] = (r[emoji]||0) + 1;
    _saveMsgs(_chatStaff, msgs);
    _renderMsgs();
  };
  window.toggleReaction = function(idx, emoji){
    window.quickReact(idx, emoji);
  };

  /* ── Emoji picker ── */
  window.toggleEmojiPicker = function(e){
    e.stopPropagation();
    var picker = document.getElementById('wa-emoji-picker');
    if(!picker) return;
    _emojiOpen = !_emojiOpen;
    picker.style.display = _emojiOpen ? 'block' : 'none';
    if(_emojiOpen){
      // Position near button
      var btn = e.currentTarget;
      var r = btn.getBoundingClientRect();
      picker.style.bottom = (window.innerHeight - r.top + 8)+'px';
      picker.style.left = r.left+'px';
      // Bind emoji clicks
      picker.querySelector('.wa-emoji-grid').onclick = function(ev){
        var ch = ev.target.textContent;
        if(!ch || ch.length > 4) return; // not a char
        var inp = document.getElementById('chat-input');
        if(inp){ inp.value += ch; inp.focus(); }
        picker.style.display = 'none'; _emojiOpen = false;
      };
    }
  };

  /* ── Search ── */
  window.toggleChatSearch = function(){
    var bar = document.getElementById('wa-search-bar');
    if(!bar) return;
    bar.style.display = bar.style.display==='none' ? 'flex' : 'none';
    if(bar.style.display==='flex') document.getElementById('wa-search-input').focus();
    else{ _searchQ=''; _renderMsgs(); }
  };
  window.closeChatSearch = function(){
    var bar = document.getElementById('wa-search-bar'); if(bar) bar.style.display='none';
    _searchQ=''; _renderMsgs();
  };
  window.chatSearchMessages = function(q){
    _searchQ = q;
    _renderMsgs();
  };

  /* ── Chat info panel toggle ── */
  window.toggleChatInfo = function(){
    showToast('ℹ️ Chat info panel — coming soon');
  };

  /* ── Textarea helpers ── */
  window.chatInputKeydown = function(e){
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); window.chatSend(); }
  };
  window.chatInputAutosize = function(el){
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120)+'px';
  };

  /* ── Init ── */
  setTimeout(function(){
    _populateStaffSelect();
    _updateContactHeader();
    _renderMsgs();
  }, 500);
})();
/* ── Final override: correct switchTab using Part-1 selectors (.tab-panel / #panel-*) ── */
(function() {
  // Restore native addEventListener now that file-2 is fully parsed
  document.addEventListener = _origAddEventListener;

  var _TAB_LABELS = {
    'dashboard':'Admin Panel',     'task-order':'New Task Order',
    'orders':'Task Orders',        'outstanding':'Loans & Balances',
    'salary':'Staff Salary',       'reports':'Staff Reports',
    'staff':'Staff Management',    'tracker':'Receipt Tracker',
    'analysis':'Production Analysis','admin':'Admin Prices',
    'inventory':'Inventory',       'chat':'Staff Chat'
  };

  window.switchTab = function(tab) {
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.style.display = 'none'; });
    var panel = document.getElementById('panel-' + tab);
    if (panel) { panel.style.display = 'flex'; panel.scrollTop = 0; }

    document.querySelectorAll('.sidenav__item[data-tab]').forEach(function(el) { el.classList.remove('sidenav__item--active'); });
    var activeItem = document.querySelector('.sidenav__item[data-tab="' + tab + '"]');
    if (activeItem) activeItem.classList.add('sidenav__item--active');

    var modLabel = document.getElementById('topbar-module-label');
    if (modLabel && _TAB_LABELS[tab]) modLabel.textContent = _TAB_LABELS[tab];

    var show = function(id) { var el = document.getElementById(id); if(el) el.style.display = 'block'; };
    var hide = function(id) { var el = document.getElementById(id); if(el) el.style.display = 'none'; };

    if (tab === 'orders') {
      show('order-list-screen'); hide('staff-orders-screen'); hide('order-profile-screen');
      if (typeof renderOrdersTable === 'function') renderOrdersTable();
    }
    if (tab === 'outstanding') {
      show('os-main'); hide('os-profile');
      if (typeof renderOutstandingTable === 'function') renderOutstandingTable();
      if (typeof updateAlumniBadge === 'function') updateAlumniBadge();
      if (typeof populateLoanStaffDropdown === 'function') populateLoanStaffDropdown();
    }
    if (tab === 'reports') {
      show('staff-cards-screen'); hide('staff-report-page');
      if (typeof renderStaffCards === 'function') renderStaffCards();
    }
    if (tab === 'salary') {
      show('salary-main-screen'); hide('salary-profile-screen');
      if (typeof _drawSalaryGrid === 'function') _drawSalaryGrid();
    }
    if (tab === 'staff')    { if (typeof renderAdminStaffList === 'function') renderAdminStaffList(); }
    if (tab === 'analysis') { if (typeof renderAnalysis === 'function') renderAnalysis(); }
    if (tab === 'chat')     { setTimeout(function(){ if(typeof chatSwitchStaff === 'function') chatSwitchStaff(); }, 100); }

    if(document.getElementById('tab-panels-container')) document.getElementById('tab-panels-container').scrollTop = 0;
  };
})();

/* ════════════════════════════════════════════════════
   CHAT FUNCTIONALITY — Reactions & Attachments
   ════════════════════════════════════════════════════ */

let chatMessages = [];
let currentChatView = 'staff';

function switchChatView(view) {
  currentChatView = view;
  const staffBtn = document.getElementById('chatViewStaffBtn');
  if (staffBtn) {
    staffBtn.classList.toggle('wa-view-active', view === 'staff');
  }
  const staffSidebar = document.getElementById('chat-staff-sidebar');
  if (staffSidebar) {
    staffSidebar.style.display = view === 'staff' ? 'flex' : 'none';
  }
}

function toggleEmojiPicker(event) {
  event.preventDefault();
  const picker = document.getElementById('wa-emoji-picker');
  if (!picker) return;
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function addEmojiReaction(emoji, messageId) {
  const msgElement = document.getElementById(messageId);
  if (!msgElement) return;
  
  let reactionsContainer = msgElement.querySelector('.message-reactions');
  if (!reactionsContainer) {
    reactionsContainer = document.createElement('div');
    reactionsContainer.className = 'message-reactions';
    msgElement.appendChild(reactionsContainer);
  }
  
  let emojiBtn = reactionsContainer.querySelector('[data-emoji="' + emoji + '"]');
  if (emojiBtn) {
    const count = parseInt(emojiBtn.textContent.split(' ')[1]) || 1;
    emojiBtn.textContent = emoji + ' ' + (count + 1);
  } else {
    emojiBtn = document.createElement('button');
    emojiBtn.className = 'reaction-btn';
    emojiBtn.setAttribute('data-emoji', emoji);
    emojiBtn.textContent = emoji + ' 1';
    emojiBtn.onclick = function() { addEmojiReaction(emoji, messageId); };
    reactionsContainer.appendChild(emojiBtn);
  }
}

function triggerFileInput() {
  const fileInput = document.getElementById('chatFileInput');
  if (fileInput) fileInput.click();
}

function handleFileAttach(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  for (let file of files) {
    const fileSize = (file.size / 1024).toFixed(2);
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const fileName = file.name;
      const fileType = file.type;
      const fileContent = e.target.result;
      
      const msgContainer = document.getElementById('chat-messages');
      if (!msgContainer) return;
      
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message-item';
      msgDiv.id = 'msg-' + Date.now();
      
      let attachmentHTML = '';
      if (fileType.startsWith('image/')) {
        attachmentHTML = '<img src="' + fileContent + '" style="max-width:250px;border-radius:8px;margin:8px 0;" />';
      } else if (fileType.startsWith('video/')) {
        attachmentHTML = '<video controls style="max-width:250px;border-radius:8px;margin:8px 0;"><source src="' + fileContent + '" type="' + fileType + '"></video>';
      } else if (fileType.startsWith('audio/')) {
        attachmentHTML = '<audio controls style="width:100%;margin:8px 0;"><source src="' + fileContent + '" type="' + fileType + '"></audio>';
      } else {
        attachmentHTML = '<div style="background:#1f2722;padding:12px;border-radius:8px;border:1px solid rgba(16,185,129,0.2);margin:8px 0;"><i class="fa-solid fa-file"></i> ' + fileName + ' (' + fileSize + ' KB)</div>';
      }
      
      msgDiv.innerHTML = '<div class="message-bubble admin" style="margin-left:auto;">' + attachmentHTML + '<div class="message-time"><span>' + new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) + '</span></div></div>';
      msgContainer.appendChild(msgDiv);
      msgContainer.parentElement.scrollTop = msgContainer.parentElement.scrollHeight;
    };
    
    reader.readAsDataURL(file);
  }
  
  event.target.value = '';
}

function chatSend() {
  const input = document.getElementById('chat-input');
  const msgText = input.value.trim();
  if (!msgText) return;
  
  const msgContainer = document.getElementById('chat-messages');
  if (!msgContainer) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message-item';
  msgDiv.id = 'msg-' + Date.now();
  
  const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  msgDiv.innerHTML = '<div class="message-bubble admin" style="margin-left:auto;">' + 
    '<span>' + escapeHtml(msgText) + '</span>' +
    '<div class="message-time"><span>' + time + '</span><span class="read">✓✓</span></div>' +
  '</div>';
  
  msgContainer.appendChild(msgDiv);
  msgContainer.parentElement.scrollTop = msgContainer.parentElement.scrollHeight;
  input.value = '';
  input.style.height = 'auto';
}

function chatInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatSend();
  }
}

function chatInputAutosize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function chatSwitchStaff() {
  const select = document.getElementById('chat-staff-select');
  if (!select) return;
  const staffId = select.value;
  const staffList = document.getElementById('chat-staff-list');
  if (staffList) {
    document.querySelectorAll('.wa-staff-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === staffId);
    });
  }
}

function toggleChatSearch() {
  const searchBar = document.getElementById('wa-search-bar');
  if (searchBar) {
    searchBar.style.display = searchBar.style.display === 'none' ? 'block' : 'none';
    if (searchBar.style.display === 'block') {
      document.getElementById('wa-search-input')?.focus();
    }
  }
}

function closeChatSearch() {
  const searchBar = document.getElementById('wa-search-bar');
  if (searchBar) searchBar.style.display = 'none';
}

function toggleChatInfo() {
  console.log('Chat info toggled');
}

function filterStaffList(query) {
  const items = document.querySelectorAll('.wa-staff-item');
  items.forEach(item => {
    const name = (item.textContent || '').toLowerCase();
    item.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none';
  });
}

function chatSearchMessages(query) {
  const messages = document.querySelectorAll('.message-bubble');
  messages.forEach(msg => {
    const text = (msg.textContent || '').toLowerCase();
    msg.closest('.message-item').style.display = text.includes(query.toLowerCase()) ? 'block' : 'none';
  });
}

function ctxReply() {
  console.log('Reply action');
}

function ctxEdit() {
  console.log('Edit action');
}

function ctxCopy() {
  console.log('Copy action');
}

function ctxDelete() {
  console.log('Delete action');
}

function cancelReply() {
  const banner = document.getElementById('wa-reply-banner');
  if (banner) banner.style.display = 'none';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}