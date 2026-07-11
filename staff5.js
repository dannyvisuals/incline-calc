/* =====================================================================
   INCLINEWORKS STAFF PORTAL v5 — staff5.js
   Synced with admin portal: orders · loans · debits · messages tables
   ===================================================================== */

const AW_ENDPOINT   = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT_ID = '6a030e6e001906e4bbae';
const AW_DB_ID      = '6a030fb6000fd9df0193';
const AW_COLS = {
  orders:   'orders',
  loans:    'loan',
  staff:    'staff',
  prices:   'prices',
  salaries: 'salaries',
  messages: 'messages',
  debits:   'debits',
  staff_reports: 'staff_reports',
};
const AW_BUCKET_ID  = 'incline001';

/* ── SESSION GUARD ── */
const _raw = sessionStorage.getItem('iw_staff_session');
if (!_raw) { window.location.replace('staff_login.html'); throw new Error('redirect'); }
const STAFF = JSON.parse(_raw);

/* ── APPWRITE REST HELPER ── */
// Parses a Supabase-style path like 'orders?staff_id=eq.X&order=$createdAt.desc'
// and translates it into an Appwrite listDocuments/createDocument/updateDocument/deleteDocument call
async function sb(path, opts) {
  opts = opts || {};
  const method = (opts.method || 'GET').toUpperCase();
  const AW_HDR = { 'X-Appwrite-Project': AW_PROJECT_ID, 'Content-Type': 'application/json' };

  // Parse collection and query string
  const [rawCol, qs] = path.split('?');
  const colName = rawCol.trim();
  const colId   = AW_COLS[colName] || colName;
  const params  = new URLSearchParams(qs || '');

  // -- DELETE --
  if (method === 'DELETE') {
    const idMatch = (qs || '').match(/id=eq\.([^&]+)/);
    if (!idMatch) throw new Error('DELETE requires id=eq.X');
    const res = await fetch(`${AW_ENDPOINT}/databases/${AW_DB_ID}/collections/${colId}/documents/${idMatch[1]}`, {
      method: 'DELETE', headers: AW_HDR
    });
    if (!res.ok && res.status !== 404) throw new Error(await res.text());
    return null;
  }

  // -- POST (create) --
  if (method === 'POST') {
    const body  = opts.body || {};
    const docId = body.id ? String(body.id) : 'unique()';
    const data  = Object.assign({}, body);
    delete data.id; delete data.created_at; delete data.$id; delete data.$createdAt;
    // Stringify array fields
    if (data.services && typeof data.services !== 'string') data.services = JSON.stringify(data.services);
    if (data.payments && typeof data.payments !== 'string') data.payments = JSON.stringify(data.payments);
    const res = await fetch(`${AW_ENDPOINT}/databases/${AW_DB_ID}/collections/${colId}/documents`, {
      method: 'POST', headers: AW_HDR,
      body: JSON.stringify({ documentId: docId, data })
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    const doc = JSON.parse(txt);
    return [_awClean(doc)];
  }

  // -- PATCH (update) --
  if (method === 'PATCH') {
    const idMatch = (qs || '').match(/id=eq\.([^&]+)/);
    if (!idMatch) throw new Error('PATCH requires id=eq.X');
    const data = Object.assign({}, opts.body || {});
    delete data.id; delete data.created_at; delete data.$id; delete data.$createdAt;
    if (data.services && typeof data.services !== 'string') data.services = JSON.stringify(data.services);
    if (data.payments && typeof data.payments !== 'string') data.payments = JSON.stringify(data.payments);
    const res = await fetch(`${AW_ENDPOINT}/databases/${AW_DB_ID}/collections/${colId}/documents/${idMatch[1]}`, {
      method: 'PATCH', headers: AW_HDR,
      body: JSON.stringify({ data })
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return [_awClean(JSON.parse(txt))];
  }

  // -- GET (list with filters) --
  const queries = [];

  // Parse common Supabase filter patterns → Appwrite Query objects
  for (const [k, v] of params.entries()) {
    if (k === 'order' || k === 'limit' || k === 'select') continue;
    const eqMatch  = k.match(/^(.+)$/) && v.match(/^eq\.(.+)$/);
    const neqMatch = k.match(/^(.+)$/) && v.match(/^neq\.(.+)$/);
    const ilikeMatch = v.match(/^ilike\.\*?(.+?)\*?$/);
    if (eqMatch)    queries.push(JSON.stringify({method:'equal',    attribute:k, values:[v.replace('eq.','')]}));
    else if (neqMatch) queries.push(JSON.stringify({method:'notEqual', attribute:k, values:[v.replace('neq.','')]}));
    else if (ilikeMatch) queries.push(JSON.stringify({method:'search', attribute:k, values:[ilikeMatch[1]]}));
    // Handle or= pattern e.g. or=(sender_id.eq.X,receiver_id.eq.X)
    else if (k === 'or') {
      const parts = v.replace(/[()]/g,'').split(',');
      parts.forEach(p => {
        const m = p.match(/^(.+)\.eq\.(.+)$/);
        if (m) queries.push(JSON.stringify({method:'equal', attribute:m[1], values:[m[2]]}));
      });
    }
  }
  // Order
  const orderVal = params.get('order');
  if (orderVal) {
    const [field, dir] = orderVal.split('.');
    queries.push(JSON.stringify({method: dir==='asc' ? 'orderAsc' : 'orderDesc', attribute: field}));
  }
  // Limit
  const limitVal = params.get('limit');
  if (limitVal) queries.push(JSON.stringify({method:'limit', values:[parseInt(limitVal)]}));
  else queries.push(JSON.stringify({method:'limit', values:[500]}));

  const url = `${AW_ENDPOINT}/databases/${AW_DB_ID}/collections/${colId}/documents?${
    queries.map(q => 'queries[]=' + encodeURIComponent(q)).join('&')
  }`;
  const res = await fetch(url, { headers: AW_HDR });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt);
  const data = JSON.parse(txt);
  const docs = (data.documents || []).map(_awClean);
  return docs;
}

function _awClean(doc) {
  if (!doc) return null;
  const out = {};
  for (const k in doc) { if (!k.startsWith('$')) out[k] = doc[k]; }
  out.id = doc.$id;
  out.created_at = doc.$createdAt;
  if (typeof out.services === 'string') { try { out.services = JSON.parse(out.services); } catch(_){} }
  if (typeof out.payments === 'string') { try { out.payments = JSON.parse(out.payments); } catch(_){} }
  return out;
}

function _awFileUrl(fileId) {
  return fileId && fileId.startsWith('staff_')
    ? `${AW_ENDPOINT}/storage/buckets/${AW_BUCKET_ID}/files/${fileId}/view?project=${AW_PROJECT_ID}`
    : (fileId || '');
}

/* ── TOAST ── */
function showToast(msg, color) {
  color = color || 'var(--green)';
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position:'fixed', bottom:'28px', left:'50%', transform:'translateX(-50%)',
    background: color, color:'#000', fontWeight:'700', fontSize:'13px',
    padding:'12px 24px', borderRadius:'50px', zIndex:'9999',
    fontFamily:'var(--font-head)', boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
    animation:'fadeUp .3s ease', pointerEvents:'none'
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
const _ts = document.createElement('style');
_ts.textContent = '@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
document.head.appendChild(_ts);

/* ── LIVE CLOCK ── */
function updateClock() {
  const el = document.getElementById('liveClock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
updateClock(); setInterval(updateClock, 1000);

/* ── SESSION → UI ── */
function applySession() {
  const first = (STAFF.name || '—').split(' ')[0];
  const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  setTxt('pageSubtitle', 'Welcome back, ' + first);
  const nameEl = document.querySelector('.staff-name');
  const idEl   = document.querySelector('.staff-id');
  const avEl   = document.querySelector('.staff-avatar');
  if (nameEl) nameEl.textContent = STAFF.name || '—';
  if (idEl)   idEl.textContent   = STAFF.staffId || '—';
  if (avEl) {
    const photoUrl = STAFF.photo ? _awFileUrl(STAFF.photo) : null;
    if (photoUrl && STAFF.photo.startsWith('staff_')) {
      avEl.innerHTML = '<img src="' + photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
    } else if (STAFF.photo && STAFF.photo.startsWith('data:')) {
      avEl.innerHTML = '<img src="' + STAFF.photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
    } else {
      avEl.textContent = (STAFF.name||'IW').split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,2);
    }
  }
  window._pageTitles = {
    dashboard: { title:'Dashboard', sub:'Welcome back, ' + first },
    tools:     { title:'Tools',     sub:'Calculator · Tasks · Debt' },
    reports:   { title:'Reports',   sub:'Submit and track your reports' }
  };
}

/* =========================================================
   NAVIGATION
   ========================================================= */
function switchPage(target) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById(target);
  if (page) page.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${target}"]`);
  if (nav) nav.classList.add('active');
  const info = window._pageTitles && window._pageTitles[target];
  if (info) {
    const pt = document.getElementById('pageTitle');
    const ps = document.getElementById('pageSubtitle');
    if (pt) pt.textContent = info.title;
    if (ps) ps.textContent = info.sub;
  }
  if (target === 'tools') {
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
    const nt    = document.getElementById('newtask');
    const ntTab = document.querySelector('.tool-tab[data-tool="newtask"]');
    if (nt)    nt.classList.add('active');
    if (ntTab) ntTab.classList.add('active');
    loadDebt();
    renderTasks();
  }
  if (target === 'dashboard') { renderTasks(); updateDashboard(); }
  if (target === 'reports')   loadReports();
}

document.querySelectorAll('.nav-item').forEach(item =>
  item.addEventListener('click', () => switchPage(item.getAttribute('data-page')))
);
document.querySelectorAll('.panel-link').forEach(btn =>
  btn.addEventListener('click', () => switchPage(btn.getAttribute('data-page')))
);

/* ── TOOL TABS ── */
document.querySelectorAll('.tool-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById(tab.getAttribute('data-tool'));
    if (panel) panel.classList.add('active');
    const tool = tab.getAttribute('data-tool');
    if (tool === 'mytasks') renderTasks();
    if (tool === 'mydebt')  loadDebt();
  });
});

/* =========================================================
   CALCULATOR (kept exactly from uploaded file)
   ========================================================= */
let calcExpr = '', calcResult = null;
const calcDisplay    = document.getElementById('calcDisplay');
const calcExpression = document.getElementById('calcExpression');
const calcHistory    = document.getElementById('calcHistory');

function formatWithCommas(str) {
  if (!str || str === 'Error') return str || '0';
  return str.split(/([+\-×÷])/).map(part => {
    if (['+','-','×','÷'].includes(part)) return part;
    if (part === '') return '';
    const sections = part.split('.');
    sections[0] = parseFloat(sections[0]).toLocaleString('en-US');
    return sections.join('.');
  }).join('');
}
function updateCalcDisplay(val) {
  if (calcDisplay) calcDisplay.textContent = formatWithCommas(val);
}
document.getElementById('calcAC').addEventListener('click', () => {
  calcExpr=''; calcResult=null;
  if (calcExpression) calcExpression.textContent='';
  updateCalcDisplay('0');
});
document.getElementById('calcDel').addEventListener('click', () => {
  if (calcResult!==null){calcExpr='';calcResult=null;updateCalcDisplay('0');return;}
  calcExpr=calcExpr.slice(0,-1); updateCalcDisplay(calcExpr||'0');
});
document.getElementById('calcPct').addEventListener('click', () => {
  if (!calcExpr) return;
  try { const v=parseFloat(eval(calcExpr.replace(/÷/g,'/').replace(/×/g,'*'))); calcExpr=String(v/100); updateCalcDisplay(calcExpr); } catch(e){}
});
document.getElementById('calcEquals').addEventListener('click', () => {
  if (!calcExpr) return;
  try {
    const s=calcExpr.replace(/÷/g,'/').replace(/×/g,'*');
    const r=Function('"use strict";return('+s+')')();
    const rounded=parseFloat(r.toFixed(10));
    if (calcHistory) calcHistory.textContent=formatWithCommas(calcExpr)+' =';
    if (calcExpression) calcExpression.textContent='';
    calcResult=rounded; calcExpr=String(rounded); updateCalcDisplay(calcExpr);
  } catch(e){ updateCalcDisplay('Error'); calcExpr=''; }
});
document.querySelectorAll('.calc-btn.num').forEach(btn => btn.addEventListener('click', () => {
  if (calcResult!==null){calcExpr='';calcResult=null;}
  const v=btn.textContent.trim();
  if (v==='.'&&calcExpr.split(/[+\-×÷]/).pop().includes('.')) return;
  calcExpr+=v; if (calcExpression) calcExpression.textContent=''; updateCalcDisplay(calcExpr);
}));
document.querySelectorAll('.calc-btn.op').forEach(btn => btn.addEventListener('click', () => {
  calcResult=null;
  const op=btn.getAttribute('data-op'), last=calcExpr.slice(-1);
  if (['+','-','×','÷'].includes(last)) calcExpr=calcExpr.slice(0,-1)+op; else if(calcExpr!=='') calcExpr+=op;
  if (calcExpression) calcExpression.textContent=formatWithCommas(calcExpr); updateCalcDisplay(calcExpr);
}));

/* =========================================================
   PRICES
   ========================================================= */
let SERVICES = [];
const DEFAULT_PRICES = [
  {cat:'Cutting Fee',name:'Coverall — Cutting',price:300},
  {cat:'Cutting Fee',name:'Shirt / Trouser — Cutting',price:350},
  {cat:'Cutting Fee',name:'Lab Coat — Cutting',price:450},
  {cat:'Sewing Fee', name:'Coverall — Sewing',price:2200},
  {cat:'Sewing Fee', name:'Shirt — Sewing',price:1800},
  {cat:'Sewing Fee', name:'Trouser — Sewing',price:1500},
  {cat:'Sewing Fee', name:'Lab Coat — Sewing',price:2500},
  {cat:'Sewing Fee', name:'Cook Uniform — Sewing',price:1500},
  {cat:'Other',      name:'Alteration',price:1200},
  {cat:'Other',      name:'Embroidery',price:800}
];
async function loadPrices() {
  try {
    const d = await sb('prices?select=name,cat,price&order=cat.asc,name.asc');
    SERVICES = (d && d.length) ? d : DEFAULT_PRICES;
  } catch(e) { SERVICES = DEFAULT_PRICES; }
}

/* =========================================================
   NEW TASK FORM — saves to ADMIN's 'orders' table
   ========================================================= */
let currentServices = [], selectedTaskStatus = 'Pending';

function buildServiceOptions() {
  const groups = {};
  SERVICES.forEach(s => {
    if (!groups[s.cat]) groups[s.cat] = [];
    groups[s.cat].push(`<option value="${s.name}" data-price="${s.price}">${s.name} — ₦${Number(s.price).toLocaleString('en-NG')}</option>`);
  });
  return Object.entries(groups).map(([cat, opts]) => `<optgroup label="${cat}">${opts.join('')}</optgroup>`).join('');
}

function renderServices() {
  const container = document.getElementById('servicesContainer');
  if (!container) return;
  const opts = buildServiceOptions();
  container.innerHTML = currentServices.map((svc, i) => `
    <div class="svc-row" data-index="${i}" style="display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
      <select class="svc-select" onchange="updateService(${i})" style="flex:1;min-width:200px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 12px;">
        <option value="">— Select Service —</option>${opts}
      </select>
      <input type="number" class="svc-qty" value="${svc.qty||1}" min="1" onchange="updateService(${i})"
        style="width:70px;text-align:center;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;">
      <div class="svc-price" style="min-width:90px;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--green);">
        ₦${((svc.price||0)*(svc.qty||1)).toLocaleString('en-NG')}
      </div>
      <button type="button" onclick="removeService(${i})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:4px 8px;">✕</button>
    </div>`).join('');
  currentServices.forEach((svc, i) => {
    if (!svc.name) return;
    const row = container.querySelector(`[data-index="${i}"]`);
    if (!row) return;
    const sel = row.querySelector('.svc-select');
    if (sel) sel.value = svc.name;
  });
}

function addService()        { currentServices.push({name:'',qty:1,price:0}); renderServices(); calculateTaskTotals(); }
function removeService(i)    { currentServices.splice(i,1); renderServices(); calculateTaskTotals(); }
function updateService(i) {
  const row = document.querySelector(`.svc-row[data-index="${i}"]`); if (!row) return;
  const sel = row.querySelector('.svc-select');
  const qty = parseInt(row.querySelector('.svc-qty').value)||1;
  const name = sel.value;
  const opt  = sel.querySelector(`option[value="${name}"]`);
  const unitPrice = opt ? parseFloat(opt.getAttribute('data-price'))||0 : 0;
  currentServices[i] = {name, qty, unitPrice, price: unitPrice * qty};
  renderServices(); calculateTaskTotals();
}

function calculateTaskTotals() {
  let items=0, subtotal=0;
  currentServices.forEach(s => { if(s.name){subtotal+=(s.unitPrice||s.price||0)*(s.qty||1); items+=s.qty||1;} });
  const ded = parseFloat(document.getElementById('loanDeduction')?.value)||0;
  const bal = Math.max(0, subtotal - ded);
  const set = (id, v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('totalItems',    items);
  set('totalSubtotal', '₦'+subtotal.toLocaleString('en-NG'));
  set('totalBalance',  '₦'+bal.toLocaleString('en-NG'));
}

function loadStaffInfoIntoTask() {
  const f = (id, v) => { const e=document.getElementById(id); if(e) e.value=v; };
  f('taskStaffName', STAFF.name||'');
  f('taskStaffId',   STAFF.staffId||'');
  f('taskPhone',     STAFF.phone||'');
}

function clearNewTaskForm() {
  currentServices = [];
  ['taskId','taskNotes','loanDeduction','taskDueDate'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
  const td=document.getElementById('taskDate'); if(td) td.value=new Date().toISOString().slice(0,10);
  selectedTaskStatus='Pending';
  document.querySelectorAll('#taskStatusGroup .priority-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-status')==='Pending')
  );
  renderServices(); calculateTaskTotals();
}

/* ── Receipt number: matches admin's getNextReceiptNum() ── */
function getNextReceiptNum() {
  if (!allTasks.length) return 'REC-001';
  const nums = allTasks
    .map(o => o.receipt_number||'')
    .filter(r => r.startsWith('REC-'))
    .map(r => parseInt(r.replace('REC-',''))||0);
  const next = nums.length ? Math.max(...nums)+1 : allTasks.length+1;
  return 'REC-'+String(next).padStart(3,'0');
}

/* ── Save Task → 'orders' table (same as admin) ── */
async function saveNewTask(andPrint) {
  andPrint = andPrint||false;
  const taskId  = (document.getElementById('taskId').value||'').trim().toUpperCase();
  const taskDate= document.getElementById('taskDate').value;
  const dueDate = document.getElementById('taskDueDate').value;
  const notes   = (document.getElementById('taskNotes').value||'').trim();

  if (!taskId || taskId.length < 1) { showModal('Missing Info','Please enter a Task ID.',[{text:'OK',primary:true}]); return; }
  if (!taskDate||!dueDate)          { showModal('Missing Info','Please fill Task Date and Due Date.',[{text:'OK',primary:true}]); return; }

  const validSvcs = currentServices.filter(s => s.name);
  if (!validSvcs.length) { showModal('No Services','Add at least one service first.',[{text:'OK',primary:true}]); return; }

  const subtotal  = validSvcs.reduce((sum,s) => sum+(s.unitPrice||s.price||0)*(s.qty||1), 0);
  const deposit   = parseFloat(document.getElementById('loanDeduction').value)||0;
  const balance   = Math.max(0, subtotal-deposit);

  /* Build services in admin format: {name, qty, unitPrice, price} */
  const services = validSvcs.map(s => ({
    name:      s.name,
    qty:       s.qty||1,
    unitPrice: s.unitPrice || s.price || 0,
    price:     (s.unitPrice||s.price||0)*(s.qty||1)
  }));

  /* Exact same structure as admin's buildOrderObj() */
  const order = {
    staff_id:       STAFF.staffId,
    staff_name:     STAFF.name,
    receipt_number: getNextReceiptNum(),
    client_name:    STAFF.name,
    client_phone:   STAFF.phone||'',
    order_date:     taskDate,
    due_date:       dueDate,
    status:         selectedTaskStatus||'Pending',
    services:       services,
    subtotal:       subtotal,
    discount:       0,
    deposit:        deposit,
    balance:        balance,
    task_id:        taskId,
    bank_name:      STAFF.bankName||'',
    account_number: STAFF.accountNumber||'',
    account_name:   STAFF.accountName||'',
    notes:          notes
  };

  ['saveTaskBtn','savePrintBtn'].forEach(id => {
    const e=document.getElementById(id); if(e){e.disabled=true;e.textContent='Saving…';}
  });

  try {
    const saved = await sb('orders', {method:'POST', body:order, prefer:'return=representation'});
    const savedOrder = Array.isArray(saved) ? saved[0] : saved;
    allTasks.unshift(savedOrder||order);
    renderTasks(); updateDashboard();

    /* Auto-deduct from active loan if deposit > 0 */
    if (deposit > 0) {
      try { await autoDeductFromLoan(deposit, 'Task deduction — '+taskId); } catch(e) { console.warn('Loan deduction failed:', e.message); }
    }

    showModal('Task Saved ✓',
      `Task <strong>${taskId}</strong> saved.<br>Receipt: <strong>${order.receipt_number}</strong><br>Balance: <strong>₦${balance.toLocaleString('en-NG')}</strong>`,
      [
        {text:'New Task', primary:true, action: clearNewTaskForm},
        {text:'View Tasks', action: () => {
          switchPage('tools');
          setTimeout(() => {
            document.querySelectorAll('.tool-tab').forEach(t=>t.classList.remove('active'));
            document.querySelectorAll('.tool-panel').forEach(p=>p.classList.remove('active'));
            const tab=document.querySelector('.tool-tab[data-tool="mytasks"]');
            const panel=document.getElementById('mytasks');
            if(tab) tab.classList.add('active');
            if(panel) panel.classList.add('active');
          }, 100);
        }}
      ]
    );
    if (andPrint) setTimeout(() => showReceiptPreview(savedOrder||order), 600);

  } catch(e) {
    showToast('⚠ Save failed: '+(e.message||'Check connection'), 'var(--red)');
    console.error(e);
  } finally {
    const sv=document.getElementById('saveTaskBtn'), pr=document.getElementById('savePrintBtn');
    if(sv){sv.disabled=false;sv.textContent='Save Task';}
    if(pr){pr.disabled=false;pr.textContent='Save & Print Receipt';}
  }
}

/* Auto-deduct from active loan — mirrors admin's autoDeductFromLoan() */
async function autoDeductFromLoan(amount, note) {
  const loans = await sb(`loans?staff_id=eq.${encodeURIComponent(STAFF.staffId)}&status=neq.Paid&order=$createdAt.asc&limit=1`).catch(()=>[]);
  const loan = Array.isArray(loans) ? loans[0] : null;
  if (!loan) return;
  const newBalance = Math.max(0, (loan.balance||0) - amount);
  const newStatus  = newBalance<=0 ? 'Paid' : loan.status;
  const payments   = (loan.payments||[]).concat([{type:'debit',amount,date:new Date().toISOString().slice(0,10),note:note||'Task deduction'}]);
  await sb(`loans?id=eq.${loan.id}`, {method:'PATCH', body:{balance:newBalance,status:newStatus,payments}, prefer:'return=minimal'});
}

/* =========================================================
   MY TASKS — reads from 'orders' table (admin's table)
   ========================================================= */
let allTasks = [];

async function loadTasks() {
  const seen = {}, merged = [];
  const add = (list) => (list||[]).forEach(t => { if(!seen[t.id]){seen[t.id]=true;merged.push(t);} });

  const ORDER = 'order=$createdAt.desc';

  // 1. staff_id exact match
  try { add(await sb(`orders?staff_id=eq.${encodeURIComponent(STAFF.staffId)}&${ORDER}`)); } catch(e){ console.warn('[Tasks] staff_id failed:', e.message); }
  // 2. staff_name exact match
  try { if (STAFF.name) add(await sb(`orders?staff_name=eq.${encodeURIComponent(STAFF.name)}&${ORDER}`)); } catch(e){ console.warn('[Tasks] staff_name failed:', e.message); }
  // 3. client_name match
  try { if (STAFF.name) add(await sb(`orders?client_name=eq.${encodeURIComponent(STAFF.name)}&${ORDER}`)); } catch(e){}
  // 4. assigned_to field
  try { add(await sb(`orders?assigned_to=eq.${encodeURIComponent(STAFF.staffId)}&${ORDER}`)); } catch(e){}
  try { if (STAFF.name) add(await sb(`orders?assigned_to=eq.${encodeURIComponent(STAFF.name)}&${ORDER}`)); } catch(e){}

  merged.sort((a,b) => new Date(b.created_at||b.$createdAt||0)-new Date(a.created_at||a.$createdAt||0));
  allTasks = merged;
  console.log(`[Tasks] Loaded ${allTasks.length} tasks for ${STAFF.staffId} (${STAFF.name})`);
}

function renderTasks(filter) {
  filter = filter||'all';
  const list = document.getElementById('taskList'); if (!list) return;
  const filtered = filter==='all' ? allTasks : allTasks.filter(t=>(t.status||'Pending')===filter);
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⬡</div><p>No tasks found.</p>
      <span>${filter==='all'?'Tasks you save will appear here.':'No tasks with this status.'}</span></div>`;
    return;
  }
  list.innerHTML = filtered.map(t => {
    const svcs    = (t.services||[]).filter(s=>s.name);
    const balance = parseFloat(t.balance)||0;
    const subtotal= parseFloat(t.subtotal)||0;
    const status  = t.status||'Pending';
    const dateStr = t.order_date||(t.created_at?new Date(t.created_at).toLocaleDateString('en-GB'):'—');
    const svcTags = svcs.length
      ? svcs.map(s=>`<span style="display:inline-block;background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;font-family:var(--font-mono);color:var(--text-dim);margin:2px 2px 0 0;">${s.name}${(s.qty||1)>1?' ×'+(s.qty||1):''}</span>`).join('')
      : `<span style="font-size:11px;color:var(--text-muted);">No services</span>`;
    return `
      <div class="task-card" onclick="openTaskDetail('${t.id}')" style="cursor:pointer;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
            <span class="task-id" style="margin-bottom:0;">${t.receipt_number||t.task_id||'—'}</span>
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">Task: ${t.task_id||'—'}</span>
            <span class="task-status status-${status.toLowerCase().replace(/\s+/g,'-')}">${status}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:8px;">
            Date: ${dateStr} &nbsp;·&nbsp; Due: ${t.due_date||'—'}
          </div>
          <div style="margin-bottom:${t.notes?'8px':'0'};">${svcTags}</div>
          ${t.notes?`<div style="font-size:12px;color:var(--text-dim);margin-top:4px;font-style:italic;">${t.notes}</div>`:''}
        </div>
        <div style="text-align:right;min-width:120px;flex-shrink:0;padding-left:12px;">
          ${subtotal!==balance?`<div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:2px;">Subtotal: ₦${subtotal.toLocaleString('en-NG')}</div>`:''}
          <div style="font-family:var(--font-mono);font-size:17px;font-weight:800;color:${balance<=0?'var(--green)':'var(--amber, #ffc107)'};">
            ₦${balance.toLocaleString('en-NG')}
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono);">BALANCE DUE</div>
        </div>
      </div>`;
  }).join('');
}

function openTaskDetail(id) {
  const t = allTasks.find(x => String(x.id)===String(id)); if (!t) return;
  const svcs = (t.services||[]).filter(s=>s.name);
  const svcRows = svcs.map(s => {
    const up = s.unitPrice||s.price||0;
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <span style="color:var(--text-muted);">${s.name} × ${s.qty||1}</span>
      <span style="font-family:var(--font-mono);color:var(--green);">₦${(up*(s.qty||1)).toLocaleString('en-NG')}</span>
    </div>`;
  }).join('')||'<p style="color:var(--text-muted);font-size:13px;">No services</p>';

  const balance = parseFloat(t.balance||0);
  const deposit = parseFloat(t.deposit||t.deduction||0);
  const status  = t.status||'Pending';

  showModal(t.receipt_number||('Task '+t.task_id),
    `<div style="font-size:13px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Receipt</div><div style="font-weight:700;color:var(--green);">${t.receipt_number||'—'}</div></div>
        <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Task ID</div><div style="font-weight:700;">${t.task_id||'—'}</div></div>
        <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Status</div><span class="task-status status-${status.toLowerCase().replace(/\s+/g,'-')}">${status}</span></div>
        <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Due Date</div><div>${t.due_date||'—'}</div></div>
      </div>
      <div style="margin-bottom:12px;">${svcRows}</div>
      <div style="background:var(--surface2);border-radius:8px;padding:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-muted);">Subtotal</span><span>₦${parseFloat(t.subtotal||0).toLocaleString('en-NG')}</span></div>
        ${deposit>0?`<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-muted);">Loan Deduction</span><span style="color:var(--green);">-₦${deposit.toLocaleString('en-NG')}</span></div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;border-top:1px solid var(--border);padding-top:8px;margin-top:4px;">
          <span>Balance</span><span style="color:${balance<=0?'var(--green)':'var(--red)'};">₦${balance.toLocaleString('en-NG')}</span>
        </div>
      </div>
      ${t.notes?`<div style="margin-top:12px;color:var(--text-muted);font-size:13px;font-style:italic;">${t.notes}</div>`:''}
    </div>`,
    [{text:'Close'},{text:'Print Receipt',primary:true,action:()=>showReceiptPreview(t)}]
  );
}

document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderTasks(btn.getAttribute('data-filter'));
}));

/* =========================================================
   DEBT — reads 'loans' + 'debits' (same logic as admin)
   ========================================================= */
async function loadDebt() {
  const debtList = document.getElementById('debtList');
  if (debtList) debtList.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center;">Loading…</p>';

  /* ── LOANS (same 3-query merge as admin's loadDebits()) ── */
  const seen = {}, allLoans = [];
  const mergeLoan = l => { if (!seen[String(l.id)]) { seen[String(l.id)]=true; allLoans.push(l); } };
  try { (await sb(`loans?client_name=ilike.${encodeURIComponent(STAFF.name)}&order=$createdAt.desc`)||[]).forEach(mergeLoan); } catch(e){}
  try { (await sb(`loans?client_name=ilike.*${encodeURIComponent(STAFF.name)}*&order=$createdAt.desc`)||[]).forEach(mergeLoan); } catch(e){}
  try { (await sb(`loans?staff_id=eq.${encodeURIComponent(STAFF.staffId)}&order=$createdAt.desc`)||[]).forEach(mergeLoan); } catch(e){}
  allLoans.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  /* ── DEBITS ── */
  let debits = [];
  try { debits = await sb(`debits?staff_id=eq.${encodeURIComponent(STAFF.staffId)}&order=$createdAt.desc`)||[]; } catch(e){}

  renderDebts(allLoans, debits);
}

function renderDebts(loans, debits) {
  const totalLoans  = loans.filter(l=>l.status!=='Paid').reduce((s,l)=>s+(parseFloat(l.balance)||0),0);
  const totalDebits = (debits||[]).reduce((s,d)=>s+(parseFloat(d.amount)||0),0);
  const grand       = totalLoans + totalDebits;
  const paidAmt     = loans.filter(l=>l.status==='Paid').reduce((s,l)=>s+(parseFloat(l.amount)||0),0);

  const setTxt=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setTxt('debtTotal', '₦'+grand.toLocaleString('en-NG',{minimumFractionDigits:2}));
  setTxt('debtPaid',  '₦'+paidAmt.toLocaleString('en-NG',{minimumFractionDigits:2}));
  setTxt('statDebt',  '₦'+grand.toLocaleString('en-NG'));

  const list = document.getElementById('debtList'); if (!list) return;
  if (!loans.length && !(debits||[]).length) {
    list.innerHTML=`<div class="empty-state"><div class="empty-icon">◎</div><p>No debt recorded.</p><span>You owe the company nothing.</span></div>`;
    return;
  }

  let html = '';

  /* Loans */
  if (loans.length) {
    html += `<div style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Loan Profiles</div>`;
    loans.forEach(l => {
      const isPaid  = l.status==='Paid'||parseFloat(l.balance||0)<=0;
      const col     = isPaid?'var(--green)':'var(--red)';
      const dateStr = l.collected_date ? new Date(l.collected_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : (l.created_at?new Date(l.created_at).toLocaleDateString('en-GB'):'—');
      const dueStr  = l.due_date ? new Date(l.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : null;
      const payments= l.payments||[];
      const totalPaid= (parseFloat(l.amount||0)-parseFloat(l.balance||0)).toLocaleString('en-NG');
      const payRows = payments.map(p => {
        const isCredit = p.type==='credit';
        const pd = p.date?new Date(p.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;">
          <div><div style="font-weight:500;">${p.note||(isCredit?'Loan Issued':'Payment')}</div><div style="font-size:10px;color:var(--text-muted);">${pd}</div></div>
          <div style="font-family:var(--font-mono);font-weight:700;color:${isCredit?'var(--red)':'var(--green)'};">${isCredit?'+':'-'}₦${(p.amount||0).toLocaleString('en-NG')}</div>
        </div>`;
      }).join('')||`<p style="color:var(--text-muted);font-size:13px;padding:12px 0;font-style:italic;">No payment history yet</p>`;

      html += `
      <div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid ${col};border-radius:12px;padding:18px;margin-bottom:14px;cursor:pointer;" onclick='openLoanModal(${JSON.stringify(l)})'>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:15px;font-weight:700;margin-bottom:4px;">Loan — ${dateStr}</div>
            <div style="font-size:12px;color:var(--text-muted);font-style:italic;">${l.notes||'Staff Advance'}</div>
            ${dueStr?`<div style="font-size:12px;color:var(--red);margin-top:4px;">Due: ${dueStr}</div>`:''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:3px;">${isPaid?'SETTLED':'BALANCE'}</div>
            <div style="font-family:var(--font-mono);font-size:24px;font-weight:800;color:${col};line-height:1;">₦${parseFloat(l.balance||0).toLocaleString('en-NG')}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">of ₦${parseFloat(l.amount||0).toLocaleString('en-NG')} loaned</div>
            <div style="font-size:11px;color:var(--green);margin-top:2px;">Repaid: ₦${totalPaid}</div>
          </div>
        </div>
        ${payments.length?`<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px;"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Payment History</div>${payRows}</div>`:''}
      </div>`;
    });
  }

  /* Debits */
  if ((debits||[]).length) {
    html += `<div style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:2px;margin:16px 0 12px;">Other Debits</div>`;
    debits.forEach(d => {
      const dateStr = d.date ? new Date(d.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
      html += `
      <div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--red);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:13px;font-weight:500;margin-bottom:4px;">${d.note||'Debit'}</div>
          <div style="font-size:12px;color:var(--text-muted);">${dateStr}</div>
        </div>
        <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--red);">₦${parseFloat(d.amount||0).toLocaleString('en-NG')}</div>
      </div>`;
    });
  }

  list.innerHTML = html;
}

/* =========================================================
   REPORTS — 'staff_reports' table
   ========================================================= */
let reports=[], selectedPriority='low';

document.querySelectorAll('.priority-btn[data-priority]').forEach(btn => btn.addEventListener('click', () => {
  btn.closest('.priority-group').querySelectorAll('.priority-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); selectedPriority=btn.getAttribute('data-priority');
}));

async function loadReports() {
  try {
    const d = await sb(`staff_reports?staff_id=eq.${encodeURIComponent(STAFF.staffId)}&order=$createdAt.desc`);
    reports = Array.isArray(d)?d:[];
  } catch(e){ console.warn('Reports failed:', e.message); }
  renderReports();
}

function renderReports() {
  const list=document.getElementById('reportList'), countEl=document.getElementById('reportCount');
  if (countEl) countEl.textContent=reports.length;
  if (!list) return;
  if (!reports.length) {
    list.innerHTML=`<div class="empty-state"><div class="empty-icon">◎</div><p>No reports yet.</p><span>Reports you submit will appear here.</span></div>`;
    updateDashboard(); return;
  }
  list.innerHTML = reports.map((r,i) => `
    <div class="report-item">
      <div class="report-item-top">
        <span class="report-item-title">${r.title}</span>
        <div class="report-item-actions">
          <span class="priority-tag priority-${r.priority}">${r.priority}</span>
          <span class="priority-tag" style="background:var(--surface2);color:var(--text-dim);margin-left:4px;">${r.status||'open'}</span>
          <button class="delete-btn" onclick="deleteReport(${i})">✕</button>
        </div>
      </div>
      <p class="report-item-desc">${r.description}</p>
      <span class="report-item-time">${r.created_at?new Date(r.created_at).toLocaleString('en-GB'):''}</span>
    </div>`).join('');
  updateDashboard();
}

document.getElementById('reportForm').addEventListener('submit', async e => {
  e.preventDefault();
  const title=document.getElementById('title').value.trim();
  const desc =document.getElementById('description').value.trim();
  if (!title||!desc) return;
  const btn=e.target.querySelector('.submit-btn');
  if (btn){btn.disabled=true;btn.textContent='Submitting…';}
  try {
    const row={staff_id:STAFF.staffId,staff_name:STAFF.name,title,description:desc,priority:selectedPriority,status:'open'};
    const saved=await sb('staff_reports',{method:'POST',body:row,prefer:'return=representation'});
    reports.unshift(Array.isArray(saved)?saved[0]:{...row,created_at:new Date().toISOString()});
    e.target.reset(); selectedPriority='low';
    document.querySelectorAll('.priority-btn[data-priority]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-priority')==='low'));
    renderReports(); showToast('Report submitted ✓');
  } catch(err){ showToast('⚠ Submit failed: '+(err.message||'error'),'var(--red)'); }
  finally { if(btn){btn.disabled=false;btn.textContent='Submit Report';} }
});

async function deleteReport(index) {
  const r=reports[index]; if(!r) return;
  showModal('Delete Report?',`Delete "<strong>${r.title}</strong>"?<br>This cannot be undone.`,[
    {text:'Cancel'},
    {text:'Delete',danger:true,action:async()=>{
      try {
        if(r.id) await sb(`staff_reports?id=eq.${r.id}`,{method:'DELETE',prefer:'return=minimal'});
        reports.splice(index,1); renderReports(); showToast('Report deleted.');
      } catch(e){ showToast('⚠ Delete failed','var(--red)'); }
    }}
  ]);
}

/* =========================================================
   CHAT WITH ADMIN — 'messages' table
   ========================================================= */
let chatMessages   = [];
let chatPollingInt = null;

function initChat() {
  const tab = document.querySelector('.tool-tab[data-tool="chat"]');
  if (!tab) return; /* Chat tab not yet in HTML — skip */
  tab.addEventListener('click', () => { loadChat(); startChatPolling(); });
  const sendBtn = document.getElementById('chatSendBtn');
  const chatInp = document.getElementById('chatInput');
  if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
  if (chatInp) chatInp.addEventListener('keydown', e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMessage();} });
}

async function loadChat() {
  try {
    const data = await sb(`messages?or=(sender_id.eq.${encodeURIComponent(STAFF.staffId)},receiver_id.eq.${encodeURIComponent(STAFF.staffId)})&order=$createdAt.asc&limit=100`);
    chatMessages = Array.isArray(data)?data:[];
    renderChat();
  } catch(e){ console.warn('Chat load failed:', e.message); }
}

function renderChat() {
  const box = document.getElementById('chatMessages'); if (!box) return;
  if (!chatMessages.length) {
    box.innerHTML='<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">No messages yet. Start the conversation!</div>';
    return;
  }
  box.innerHTML = chatMessages.map(m => {
    const isMe = m.sender_id===STAFF.staffId;
    const time  = m.created_at?new Date(m.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
    return `
    <div style="display:flex;justify-content:${isMe?'flex-end':'flex-start'};margin-bottom:10px;">
      <div style="max-width:72%;background:${isMe?'var(--green)':'var(--surface2)'};color:${isMe?'#000':'var(--text)'};padding:10px 14px;border-radius:${isMe?'16px 16px 4px 16px':'16px 16px 16px 4px'};font-size:13px;line-height:1.5;">
        ${!isMe?`<div style="font-size:10px;font-weight:700;color:var(--green);margin-bottom:4px;letter-spacing:0.5px;">ADMIN</div>`:''}
        <div>${m.message||''}</div>
        <div style="font-size:10px;${isMe?'color:rgba(0,0,0,0.5)':'color:var(--text-muted)'};margin-top:4px;text-align:right;">${time}</div>
      </div>
    </div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

async function sendChatMessage() {
  const inp = document.getElementById('chatInput'); if (!inp) return;
  const msg = (inp.value||'').trim(); if (!msg) return;
  inp.value=''; inp.disabled=true;
  try {
    const row={sender_id:STAFF.staffId,sender_name:STAFF.name,receiver_id:'ADMIN',message:msg,read:false};
    const saved=await sb('messages',{method:'POST',body:row,prefer:'return=representation'});
    chatMessages.push(Array.isArray(saved)?saved[0]:{...row,created_at:new Date().toISOString()});
    renderChat();
  } catch(e){ showToast('⚠ Could not send: '+(e.message||'error'),'var(--red)'); inp.value=msg; }
  finally { inp.disabled=false; inp.focus(); }
}

function startChatPolling() { if (!chatPollingInt) chatPollingInt=setInterval(loadChat,8000); }
function stopChatPolling()  { if (chatPollingInt){clearInterval(chatPollingInt);chatPollingInt=null;} }

/* =========================================================
   DASHBOARD
   ========================================================= */
function updateDashboard() {
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('statReports', reports.length);
  const active=allTasks.filter(t=>t.status!=='Delivered'&&t.status!=='Cancelled');
  set('statTasks', active.length);

  const dr=document.getElementById('dashReports');
  if (dr) dr.innerHTML=!reports.length
    ?'<p class="empty-msg">No reports submitted yet.</p>'
    :reports.slice(0,3).map(r=>`<div class="mini-item"><span>${r.title}</span><span class="priority-tag priority-${r.priority}">${r.priority}</span></div>`).join('');

  const dt=document.getElementById('dashTasks');
  if (dt) {
    const top=active.slice(0,3);
    dt.innerHTML=!top.length
      ?'<p class="empty-msg">No active tasks.</p>'
      :top.map(t=>{const s=t.status||'Pending';return`<div class="mini-item"><span>${t.receipt_number||t.task_id||'—'}</span><span class="task-status status-${s.toLowerCase().replace(/\s+/g,'-')}">${s}</span></div>`;}).join('');
  }
}

/* =========================================================
   TASK STATUS BUTTONS
   ========================================================= */
document.querySelectorAll('#taskStatusGroup .priority-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('#taskStatusGroup .priority-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); selectedTaskStatus=btn.getAttribute('data-status');
}));

/* Task ID counter */
const taskIdInput=document.getElementById('taskId'), taskIdCounter=document.getElementById('taskIdCounter');
if (taskIdInput&&taskIdCounter) {
  taskIdInput.addEventListener('input', () => {
    taskIdInput.value=taskIdInput.value.toUpperCase().slice(0,6);
    taskIdCounter.textContent=taskIdInput.value.length+' / 6';
  });
}

const dedInput=document.getElementById('loanDeduction');
if (dedInput) dedInput.addEventListener('input', calculateTaskTotals);
const addSvcBtn=document.getElementById('addServiceBtn');
if (addSvcBtn) addSvcBtn.addEventListener('click', addService);

const saveTaskBtn=document.getElementById('saveTaskBtn'), savePrintBtn=document.getElementById('savePrintBtn'), clearTaskBtn=document.getElementById('clearTaskBtn');
if (saveTaskBtn)  saveTaskBtn.addEventListener('click',  ()=>saveNewTask(false));
if (savePrintBtn) savePrintBtn.addEventListener('click', ()=>saveNewTask(true));
if (clearTaskBtn) clearTaskBtn.addEventListener('click', ()=>showModal('Clear Form?','This will delete all entered data.<br>Are you sure?',[{text:'Cancel'},{text:'Yes, Clear',danger:true,action:clearNewTaskForm}]));

/* =========================================================
   MODAL
   ========================================================= */
function showModal(title, message, buttons) {
  buttons=buttons||[];
  const overlay=document.getElementById('globalModal'), titleEl=document.getElementById('modalTitle'),
        bodyEl=document.getElementById('modalBody'), footerEl=document.getElementById('modalFooter');
  if (!overlay) return;
  titleEl.textContent=title;
  bodyEl.innerHTML=`<p style="font-size:14px;line-height:1.6;">${message}</p>`;
  footerEl.innerHTML='';
  buttons.forEach(b => {
    const btn=document.createElement('button'); btn.textContent=b.text; btn.className='submit-btn';
    btn.style.cssText='padding:12px 24px;min-width:100px;';
    if (b.danger)  btn.style.background='var(--red)';
    if (b.primary) btn.style.background='var(--green)';
    btn.onclick=()=>{closeModal();if(b.action)b.action();};
    footerEl.appendChild(btn);
  });
  overlay.style.display='flex';
}
function closeModal() { const o=document.getElementById('globalModal');if(o)o.style.display='none'; }

/* =========================================================
   RECEIPT — single source of truth (populateReceipt fills #thermalReceipt,
   which is what gets previewed, printed, PDF'd, and WhatsApp'd — always in sync)
   ========================================================= */
let _receiptPrintCount = {};

function populateReceipt(t) {
  if (!t) t = {};
  const id = t.$id || t.id || t.task_id || ('temp_' + Date.now());
  const pc = (_receiptPrintCount[id] = (_receiptPrintCount[id] || 0) + 1);
  const recNum = (t.receipt_number || t.invoice_no || 'REC-' + String(id).substring(0,6).toUpperCase())
                 + (pc > 1 ? ' [REPRINT #' + pc + ']' : '');

  // Normalize services/items from admin panel data
  const rawServices = t.services || t.items || [];
  const svcs = Array.isArray(rawServices) ? rawServices.filter(s => s && (s.name || s.service_name)) : [];

  // ── CALCULATIVE: always derive correct numbers, never trust a blank/stale field ──
  const lineItems = svcs.map(s => {
    const name = s.name || s.service_name || 'Tailoring Item';
    const qty  = parseInt(s.qty || s.quantity || 1, 10) || 1;
    const unit = parseFloat(s.unitPrice || s.price || s.rate || 0) || 0;
    return { name, qty, unit, total: qty * unit };
  });
  const computedSubtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
  const subtotal = parseFloat(t.subtotal) > 0 ? parseFloat(t.subtotal) : (computedSubtotal || parseFloat(t.total_amount || 0) || 0);
  const deposit  = parseFloat(t.deposit || t.deduction || t.amount_paid || 0) || 0;
  const balance  = parseFloat(t.balance) >= 0 && !isNaN(parseFloat(t.balance)) ? parseFloat(t.balance) : Math.max(subtotal - deposit, 0);

  const dateStr    = t.order_date || (t.$createdAt ? new Date(t.$createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const timeStr    = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dueDateStr = t.due_date || '---';
  const taskIdDisplay = t.task_id || String(id).substring(0,8).toUpperCase();
  const staffName  = (window.STAFF && window.STAFF.name) || 'Staff Operator';
  const staffIdVal = (window.STAFF && window.STAFF.staffId) || '---';

  document.getElementById('tr-receipt').textContent = recNum;
  document.getElementById('tr-date').textContent     = dateStr + '  ·  ' + timeStr;
  document.getElementById('tr-staff').textContent    = staffName;
  document.getElementById('tr-staffid').textContent  = staffIdVal;
  document.getElementById('tr-task').textContent     = taskIdDisplay;
  document.getElementById('tr-due').textContent      = dueDateStr;

  const itemsEl = document.getElementById('tr-items');
  if (lineItems.length) {
    itemsEl.innerHTML = lineItems.map(li => `
      <div class="tr-item-row">
        <span class="tr-col-item">${li.name}</span>
        <span class="tr-col-qty">${li.qty}</span>
        <span class="tr-col-price">₦${li.unit.toLocaleString('en-NG')}</span>
        <span class="tr-col-total">₦${li.total.toLocaleString('en-NG')}</span>
      </div>`).join('');
  } else {
    itemsEl.innerHTML = `
      <div class="tr-item-row">
        <span class="tr-col-item">${t.task_name || t.title || 'Tailoring Job'}</span>
        <span class="tr-col-qty">1</span>
        <span class="tr-col-price">₦${subtotal.toLocaleString('en-NG')}</span>
        <span class="tr-col-total">₦${subtotal.toLocaleString('en-NG')}</span>
      </div>`;
  }

  document.getElementById('tr-subtotal').textContent = '₦' + subtotal.toLocaleString('en-NG');
  const depositRow = document.getElementById('tr-deposit-row');
  if (deposit > 0) {
    depositRow.style.display = 'flex';
    document.getElementById('tr-deposit').textContent = '- ₦' + deposit.toLocaleString('en-NG');
  } else {
    depositRow.style.display = 'none';
  }
  document.getElementById('tr-total').textContent = '₦' + balance.toLocaleString('en-NG');

  document.getElementById('tr-bank').textContent    = (window.STAFF && window.STAFF.bankName)      || '---';
  document.getElementById('tr-accnum').textContent  = (window.STAFF && window.STAFF.accountNumber) || '---';
  document.getElementById('tr-accname').textContent = (window.STAFF && window.STAFF.accountName)   || '---';

  // Fake barcode, cosmetic — bar widths derived from the receipt number so it looks unique per receipt
  const barcodeSrc = String(recNum).replace(/[^A-Za-z0-9]/g, '') || 'INCLINEWORKS';
  let barGradient = 'repeating-linear-gradient(90deg';
  let pos = 0;
  for (let i = 0; i < barcodeSrc.length; i++) {
    const w = 1 + (barcodeSrc.charCodeAt(i) % 3);
    barGradient += `, #000 ${pos}px, #000 ${pos + w}px, transparent ${pos + w}px, transparent ${pos + w + 2}px`;
    pos += w + 2;
  }
  barGradient += ')';
  document.getElementById('tr-barcode').style.backgroundImage = barGradient;
  document.getElementById('tr-barcode-num').textContent = String(recNum).toUpperCase();
}

function showReceiptPreview(t) {
  window._lastReceiptTask = t || {};
  populateReceipt(window._lastReceiptTask);

  // Mirror the exact same markup into the preview modal so what you SEE is what gets printed/shared
  const contentBox = document.getElementById('receiptContent');
  const thermal = document.getElementById('thermalReceipt');
  if (contentBox && thermal) {
    contentBox.innerHTML = thermal.innerHTML;
    thermal.querySelectorAll('[id]').forEach(el => {
      const clone = contentBox.querySelector('#' + el.id);
      if (clone) clone.removeAttribute('id'); // avoid duplicate DOM ids while modal is open
    });
  }

  const modal = document.getElementById('receiptModal');
  if (modal) modal.style.display = 'flex';
  else console.error("Critical: Could not find container element '#receiptModal' in your HTML page.");
}

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.style.display = 'none';
}

function printReceipt() {
  const t = window._lastReceiptTask;
  if (t) populateReceipt(t);
  window.print();
}

async function _captureThermalReceipt() {
  const receipt = document.getElementById('thermalReceipt');
  const prevDisplay = receipt.style.display;
  receipt.style.display = 'block';
  receipt.style.position = 'absolute';
  receipt.style.left = '-9999px';
  receipt.style.top = '0px';
  await new Promise(r => setTimeout(r, 80));
  try {
    const canvas = await html2canvas(receipt, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    return canvas;
  } finally {
    receipt.style.display = prevDisplay || 'none';
    receipt.style.position = '';
    receipt.style.left = '';
    receipt.style.top = '';
  }
}

async function shareReceiptAsPDF(t) {
  if (t) populateReceipt(t);
  const filename = 'Receipt-' + ((window._lastReceiptTask && window._lastReceiptTask.receipt_number) || 'task');
  try {
    const { jsPDF } = window.jspdf;
    const canvas = await _captureThermalReceipt();
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 80;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', [imgWidth, imgHeight]);
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    const pdfBlob = pdf.output('blob');
    const file = new File([pdfBlob], filename + '.pdf', { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename, text: 'InclineWorks Receipt' });
    } else {
      pdf.save(filename + '.pdf');
      showToast('PDF downloaded successfully!');
    }
  } catch (e) {
    console.error('PDF generation error:', e);
    showToast('Failed to generate PDF. Use print instead.', 'var(--red)');
  }
}

async function whatsappReceipt(t) {
  if (t) populateReceipt(t);
  const filename = 'Receipt-' + ((window._lastReceiptTask && window._lastReceiptTask.receipt_number) || 'task');
  try {
    const canvas = await _captureThermalReceipt();
    canvas.toBlob(async blob => {
      if (!blob) { showToast('Capture extraction failed', 'var(--red)'); return; }
      const file = new File([blob], filename + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename, text: 'Your receipt from InclineWorks Tailoring Services' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename + '.png'; a.click();
        URL.revokeObjectURL(url);
        showToast('Receipt saved to device! Share it manually via WhatsApp.');
      }
    }, 'image/png');
  } catch (e) {
    console.error('WhatsApp conversion error:', e);
    showToast('Could not capture receipt layout.', 'var(--red)');
  }
}

/* Loan receipt (viewLoanDetails kept compatible) */
function viewLoanDetails(loan) {
  const isPaid=loan.status==='Paid';
  const col=isPaid?'var(--green)':'var(--amber, #ffc107)';
  const totalPaid=(parseFloat(loan.amount||0)-parseFloat(loan.balance||0)).toLocaleString('en-NG');
  showModal('Loan Details',
    `<div style="font-family:var(--font-mono);text-align:left;">
      <div style="background:var(--bg3);padding:15px;border-radius:10px;margin-bottom:15px;border-left:4px solid ${col};">
        <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">LOAN RECORD</p>
        <h2 style="margin:0;color:${col};font-size:28px;">₦${parseFloat(loan.amount||0).toLocaleString('en-NG')}</h2>
        <p style="margin:5px 0 0;font-size:14px;font-weight:bold;">${loan.notes||'Staff Advance'}</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
        <div style="background:var(--bg2);padding:10px;border-radius:8px;border:1px solid var(--border);">
          <small style="display:block;color:var(--text-muted);font-size:9px;">DATE ISSUED</small>
          <strong style="font-size:13px;">${loan.collected_date?new Date(loan.collected_date).toLocaleDateString('en-GB'):new Date(loan.created_at||0).toLocaleDateString('en-GB')}</strong>
        </div>
        <div style="background:var(--bg2);padding:10px;border-radius:8px;border:1px solid var(--border);">
          <small style="display:block;color:var(--text-muted);font-size:9px;">STATUS</small>
          <strong style="color:${col};font-size:13px;">${(loan.status||'').toUpperCase()}</strong>
        </div>
        <div style="background:var(--bg2);padding:10px;border-radius:8px;border:1px solid var(--border);">
          <small style="display:block;color:var(--text-muted);font-size:9px;">TOTAL REPAID</small>
          <strong style="font-size:13px;">₦${totalPaid}</strong>
        </div>
        <div style="background:var(--bg2);padding:10px;border-radius:8px;border:1px solid var(--border);">
          <small style="display:block;color:var(--text-muted);font-size:9px;">CURRENT BALANCE</small>
          <strong style="color:var(--red);font-size:13px;">₦${parseFloat(loan.balance||0).toLocaleString('en-NG')}</strong>
        </div>
      </div>
    </div>`,
    [{text:'Close'},{text:'Print Receipt',action:()=>openLoanReceipt(loan)},{text:'Share PDF',action:()=>shareLoanPDF(loan)}]
  );
}

function openLoanReceipt(loan) {
  const el=document.getElementById('receiptContent'); if (!el) return;
  const totalPaid=(parseFloat(loan.amount||0)-parseFloat(loan.balance||0)).toLocaleString('en-NG');
  el.innerHTML=`
    <div style="font-family:'Courier New',monospace;color:#000;text-align:center;padding:10px;">
      <div style="font-size:18px;font-weight:bold;letter-spacing:2px;">INCLINEWORKS</div>
      <div style="font-size:11px;margin-bottom:5px;">STAFF PORTAL OFFICIAL</div>
      <div style="font-size:10px;margin-bottom:10px;">LOAN RECEIPT</div>
      <div style="border-top:1px dashed #000;margin:8px 0;"></div>
      <div style="text-align:left;font-size:12px;line-height:1.5;">
        <div style="display:flex;justify-content:space-between;"><span>Date:</span><span>${loan.collected_date?new Date(loan.collected_date).toLocaleDateString('en-GB'):new Date(loan.created_at||0).toLocaleDateString('en-GB')}</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Staff ID:</span><span>${STAFF.staffId}</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Staff:</span><span>${STAFF.name}</span></div>
      </div>
      <div style="border-top:1px dashed #000;margin:8px 0;"></div>
      <div style="text-align:left;font-size:12px;font-weight:bold;">DESCRIPTION:</div>
      <div style="text-align:left;font-size:12px;margin-bottom:10px;font-style:italic;">${loan.notes||'Staff Advance'}</div>
      <div style="border-top:1px dashed #000;margin:8px 0;"></div>
      <div style="text-align:left;font-size:12px;line-height:1.8;">
        <div style="display:flex;justify-content:space-between;"><span>Principal:</span><span>₦${parseFloat(loan.amount||0).toLocaleString('en-NG')}</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Total Repaid:</span><span>₦${totalPaid}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:bold;border-top:1px solid #eee;">
          <span>BALANCE DUE:</span><span>₦${parseFloat(loan.balance||0).toLocaleString('en-NG')}</span>
        </div>
      </div>
      <div style="border-top:1px dashed #000;margin:15px 0 8px 0;"></div>
      <div style="font-size:9px;">*** Verified Digital Copy ***</div>
    </div>`;
  document.getElementById('receiptModal').style.display='flex';
}

async function shareLoanPDF(loan) {
  openLoanReceipt(loan);
  const element=document.getElementById('receiptContent');
  try {
    const {jsPDF}=window.jspdf;
    const canvas=await html2canvas(element,{scale:3,backgroundColor:'#ffffff',logging:false});
    const pdf=new jsPDF('p','mm',[80,160]);
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,80,160);
    pdf.save('Loan_Receipt_'+Date.now()+'.pdf');
    setTimeout(closeReceiptModal,800);
  } catch(err){ console.error('PDF fail:',err); }
}

/* =========================================================
   LOAN MODAL (from staff3)
   ========================================================= */
let _activeLoan = null;

function openLoanModal(loan) {
  _activeLoan = loan;
  const isPaid = loan.status === 'Paid' || parseFloat(loan.balance||0) <= 0;
  const fmt = v => '₦' + parseFloat(v||0).toLocaleString('en-NG', {minimumFractionDigits:2});
  const dateStr = loan.collected_date ? new Date(loan.collected_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
                : loan.created_at ? new Date(loan.created_at).toLocaleDateString('en-GB') : '—';

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
  set('lm-amount',  fmt(loan.amount));
  set('lm-balance', fmt(loan.balance));
  set('lm-date',    dateStr);
  set('lm-status',  `<span style="font-weight:700;color:${isPaid?'var(--green)':'var(--red)'};">${isPaid?'SETTLED':'OUTSTANDING'}</span>`);
  set('lm-notes',   loan.notes || 'Staff Advance');

  // Payment history
  const payments = loan.payments || [];
  if (payments.length) {
    set('lm-payments', payments.map(p => {
      const isCredit = p.type === 'credit';
      const pd = p.date ? new Date(p.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <div><div style="font-weight:500;">${p.note||(isCredit?'Loan Issued':'Payment')}</div><div style="font-size:10px;color:var(--text-muted);">${pd}</div></div>
        <div style="font-family:var(--font-mono);font-weight:700;color:${isCredit?'var(--red)':'var(--green)'};">${isCredit?'+':'-'}₦${(p.amount||0).toLocaleString('en-NG')}</div>
      </div>`;
    }).join(''));
  } else {
    set('lm-payments', '<p style="color:var(--text-muted);font-size:13px;font-style:italic;">No payment history yet.</p>');
  }

  const modal = document.getElementById('loanModal');
  if (modal) modal.style.display = 'flex';
}

function closeLoanModal() {
  const modal = document.getElementById('loanModal');
  if (modal) modal.style.display = 'none';
  _activeLoan = null;
}

function printLoanFromModal() {
  if (!_activeLoan) return;
  openLoanReceipt(_activeLoan);
}

function shareLoanFromModal() {
  if (!_activeLoan) return;
  shareLoanPDF(_activeLoan);
}

/* =========================================================
   LOGOUT
   ========================================================= */
const logoutBtn=document.querySelector('.logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    showModal('Sign Out','Are you sure you want to sign out?',[
      {text:'Cancel'},
      {text:'Sign Out',danger:true,action:()=>{
        stopChatPolling();
        sessionStorage.removeItem('iw_staff_session');
        window.location.replace('staff login.html'); /* Fixed: no space in filename */
      }}
    ]);
  });
}

/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn=document.getElementById('mobileMenuBtn');
  const sidebar=document.querySelector('.sidebar');
  if (menuBtn&&sidebar) {
    menuBtn.addEventListener('click', e=>{e.stopPropagation();sidebar.classList.toggle('active');});
    document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',()=>{
      if(window.innerWidth<=992) sidebar.classList.remove('active');
    }));
    document.addEventListener('click', e=>{
      if(window.innerWidth<=992&&!sidebar.contains(e.target)&&!menuBtn.contains(e.target))
        sidebar.classList.remove('active');
    });
  }
});

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  applySession();
  loadStaffInfoIntoTask();
  const todayEl=document.getElementById('taskDate');
  if (todayEl) todayEl.value=new Date().toISOString().slice(0,10);

  await Promise.all([
    loadPrices().then(()=>{renderServices();calculateTaskTotals();}),
    loadTasks().then(()=>{renderTasks();}),
    loadReports(),
    loadDebt()
  ]);

  updateDashboard();
  initChat();
  switchPage('dashboard');
});
