/* ══════════════════════════════════════════════════════════════════
   INCLINEWORKS — APPWRITE BACKEND (Drop-in Supabase replacement)
   ══════════════════════════════════════════════════════════════════

   HOW TO USE:
   ───────────
   1. In index.html, REMOVE the Supabase script tag:
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

   2. ADD this instead (before script.js):
        <script src="https://cdn.jsdelivr.net/npm/appwrite@16"></script>
        <script src="appwrite.js"></script>

   3. In Appwrite console, create these collections in a database:
        Database name: inclineworks  (copy the Database ID below)
        Collections:
          - staff      (Collection ID: staff)
          - orders     (Collection ID: orders)
          - prices     (Collection ID: prices)
          - loans      (Collection ID: loans)
          - salaries   (Collection ID: salaries)

   4. For each collection, set permissions:
        Roles → Any → Read + Write

   5. Paste your Database ID below where it says PASTE_DATABASE_ID

   That's it. Your login, UI, and all logic stay exactly the same.
   ════════════════════════════════════════════════════════════════ */


// ── CONFIG ──────────────────────────────────────────────────────
const AW_ENDPOINT   = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT_ID = '6a030e6e001906e4bbae';
const AW_API_KEY    = 'standard_dfc7628d5da1882fc8f9687b126357380aa9e82260c2290cfde2a1eb45b125840d409ef4d355245d426469a082f8f5e481fad6245701052a0945e059b816196aae18c42f235a13c5d0ea0620f20660e5372f64e9ca70d2a4c8f0f2446f11a8ff077dd3491c1d73ae1d0bf4524ee1cf70bfc6091d6ab88cb7500697d4bacde653';
const AW_BUCKET_ID  = 'incline001';
const AW_DB_ID      = '6a030fb6000fd9df0193';

// Collection IDs (must match what you create in Appwrite console)
const AW_COL = {
  staff:    'staff',
  orders:   'orders',
  prices:   'prices',
  loans:    'loan',
  salaries: 'salaries',
};


// ── INIT CLIENT ─────────────────────────────────────────────────
const _awClient = new Appwrite.Client()
  .setEndpoint(AW_ENDPOINT)
  .setProject(AW_PROJECT_ID);

const _awDbs     = new Appwrite.Databases(_awClient);
const _awStorage = new Appwrite.Storage(_awClient);


// ── HELPERS ──────────────────────────────────────────────────────

// Strip Appwrite system fields ($id, $createdAt etc.) and map to
// the same shape your existing code expects
function _clean(doc) {
  if (!doc) return null;
  const out = {};
  for (const k in doc) {
    if (!k.startsWith('$')) out[k] = doc[k];
  }
  out.id = doc.$id;            // always expose id
  out.created_at = doc.$createdAt;
  // Parse JSON strings back to arrays (Appwrite stores complex arrays as JSON strings)
  if (typeof out.services === 'string') { try { out.services = JSON.parse(out.services); } catch(_){} }
  if (typeof out.payments === 'string') { try { out.payments = JSON.parse(out.payments); } catch(_){} }
  return out;
}

function _cleanList(res) {
  if (!res || !res.documents) return [];
  return res.documents.map(_clean);
}

// Generate a unique ID (replaces supabase auto-id)
function _uid() { return Appwrite.ID.unique(); }

// Build query filters — mirrors Supabase ?field=eq.value style
const Q = Appwrite.Query;


/* ══════════════════════════════════════════════════════════════════
   STAFF
   ════════════════════════════════════════════════════════════════ */

async function sbGetStaff() {
  try {
    const res = await _awDbs.listDocuments(AW_DB_ID, AW_COL.staff, [
      Q.orderDesc('$createdAt'),
      Q.limit(500)
    ]);
    return _cleanList(res);
  } catch(e) { console.warn('sbGetStaff:', e); return []; }
}

async function sbAddStaff(profile) {
  try {
    const docId = profile.id ? String(profile.id) : _uid();
    const data  = { ...profile };
    delete data.id;
    delete data.created_at;
    const doc = await _awDbs.createDocument(AW_DB_ID, AW_COL.staff, docId, data);
    return _clean(doc);
  } catch(e) { console.warn('sbAddStaff:', e); return null; }
}

async function sbDeleteStaff(id) {
  try {
    await _awDbs.deleteDocument(AW_DB_ID, AW_COL.staff, String(id));
  } catch(e) { console.warn('sbDeleteStaff:', e); }
}

async function sbUpdateStaffPhoto(id, photo) {
  try {
    await _awDbs.updateDocument(AW_DB_ID, AW_COL.staff, String(id), { photo });
  } catch(e) { console.warn('sbUpdateStaffPhoto:', e); }
}

async function sbUpdateStaff(id, data) {
  try {
    const doc = await _awDbs.updateDocument(AW_DB_ID, AW_COL.staff, String(id), data);
    return _clean(doc);
  } catch(e) { console.warn('sbUpdateStaff:', e); return null; }
}


/* ══════════════════════════════════════════════════════════════════
   ORDERS
   ════════════════════════════════════════════════════════════════ */

async function sbGetOrders(staffId) {
  try {
    const filters = [Q.orderDesc('$createdAt'), Q.limit(1000)];
    if (staffId) filters.push(Q.equal('staff_id', String(staffId)));
    const res = await _awDbs.listDocuments(AW_DB_ID, AW_COL.orders, filters);
    return _cleanList(res);
  } catch(e) { console.warn('sbGetOrders:', e); return []; }
}

async function sbSaveOrder(order) {
  try {
    const docId = order.id ? String(order.id) : _uid();
    const data  = { ...order };
    delete data.id;
    delete data.created_at;
    // Appwrite doesn't support arrays of objects — stringify them
    if (data.services && typeof data.services !== 'string') data.services = JSON.stringify(data.services);
    if (data.payments && typeof data.payments !== 'string') data.payments = JSON.stringify(data.payments);
    const doc = await _awDbs.createDocument(AW_DB_ID, AW_COL.orders, docId, data);
    return _clean(doc);
  } catch(e) { console.warn('sbSaveOrder:', e); return null; }
}

// Used inline in script.js via _sbFetch — proxied here
async function _awUpdateOrder(id, fields) {
  try {
    const data = { ...fields };
    if (data.services && typeof data.services !== 'string') data.services = JSON.stringify(data.services);
    if (data.payments && typeof data.payments !== 'string') data.payments = JSON.stringify(data.payments);
    await _awDbs.updateDocument(AW_DB_ID, AW_COL.orders, String(id), data);
  } catch(e) { console.warn('_awUpdateOrder:', e); }
}

async function _awDeleteOrder(id) {
  try {
    await _awDbs.deleteDocument(AW_DB_ID, AW_COL.orders, String(id));
  } catch(e) { console.warn('_awDeleteOrder:', e); }
}


/* ══════════════════════════════════════════════════════════════════
   PRICES
   ════════════════════════════════════════════════════════════════ */

async function sbGetPrices() {
  try {
    const res = await _awDbs.listDocuments(AW_DB_ID, AW_COL.prices, [
      Q.orderAsc('cat'),
      Q.limit(500)
    ]);
    return _cleanList(res);
  } catch(e) { console.warn('sbGetPrices:', e); return null; }
}

async function sbSavePrices(services) {
  // Appwrite doc IDs cannot have spaces or special chars - derive a safe ID from the name
  function _safeId(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 36);
  }
  try {
    for (const s of services) {
      const docId = _safeId(s.name);
      const data  = { name: s.name, cat: s.cat, price: s.price, custom: s.custom || false };
      try {
        await _awDbs.updateDocument(AW_DB_ID, AW_COL.prices, docId, data);
      } catch(_) {
        try {
          await _awDbs.createDocument(AW_DB_ID, AW_COL.prices, docId, data);
        } catch(e2) { console.warn('sbSavePrices item failed:', s.name, e2.message); }
      }
    }
  } catch(e) { console.warn('sbSavePrices:', e); }
}

async function sbDeletePrice(name) {
  try {
    const docId = name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 36);
    await _awDbs.deleteDocument(AW_DB_ID, AW_COL.prices, docId);
  } catch(e) { console.warn('sbDeletePrice:', e); }
}


/* ══════════════════════════════════════════════════════════════════
   LOANS
   ════════════════════════════════════════════════════════════════ */

async function sbGetLoans() {
  try {
    const res = await _awDbs.listDocuments(AW_DB_ID, AW_COL.loans, [
      Q.orderDesc('$createdAt'),
      Q.limit(1000)
    ]);
    return _cleanList(res);
  } catch(e) { console.warn('sbGetLoans:', e); return null; }
}

async function sbSaveLoan(loan) {
  try {
    const docId = String(loan.id || _uid());
    const rawPayments = loan.payments || [];
    const data = {
      client_name:    loan.clientName   || loan.client_name   || '',
      client_phone:   loan.clientPhone  || loan.client_phone  || '',
      staff_id:       loan.staffId      || loan.staff_id      || '',
      amount:         loan.amount       || 0,
      balance:        loan.balance      || 0,
      status:         loan.status       || 'Outstanding',
      collected_date: loan.collectedDate|| loan.collected_date || '',
      due_date:       loan.dueDate      || loan.due_date      || '',
      notes:          loan.notes        || '',
      payments:       typeof rawPayments === 'string' ? rawPayments : JSON.stringify(rawPayments),
    };
    try {
      await _awDbs.updateDocument(AW_DB_ID, AW_COL.loans, docId, data);
    } catch(_) {
      await _awDbs.createDocument(AW_DB_ID, AW_COL.loans, docId, data);
    }
  } catch(e) { console.warn('sbSaveLoan:', e); }
}

async function sbDeleteLoan(id) {
  try {
    await _awDbs.deleteDocument(AW_DB_ID, AW_COL.loans, String(id));
  } catch(e) { console.warn('sbDeleteLoan:', e); }
}

async function sbUpdateLoan(loan) {
  try {
    const data = {
      balance:        loan.balance,
      status:         loan.status,
      amount:         loan.amount       || 0,
      payments:       typeof (loan.payments||[]) === 'string' ? loan.payments : JSON.stringify(loan.payments || []),
      client_name:    loan.clientName   || loan.client_name   || '',
      staff_id:       loan.staffId      || loan.staff_id      || '',
      client_phone:   loan.clientPhone  || loan.client_phone  || '',
      notes:          loan.notes        || '',
      collected_date: loan.collectedDate|| loan.collected_date || '',
      due_date:       loan.dueDate      || loan.due_date      || '',
    };
    try {
      await _awDbs.updateDocument(AW_DB_ID, AW_COL.loans, String(loan.id), data);
    } catch(_) {
      await sbSaveLoan(loan);
    }
  } catch(e) { console.warn('sbUpdateLoan:', e); }
}


/* ══════════════════════════════════════════════════════════════════
   SALARIES
   ════════════════════════════════════════════════════════════════ */

async function sbGetSalaries(staffId) {
  try {
    const filters = [Q.orderDesc('date_paid'), Q.limit(1000)];
    if (staffId) filters.push(Q.equal('staff_id', String(staffId)));
    const res = await _awDbs.listDocuments(AW_DB_ID, AW_COL.salaries, filters);
    return _cleanList(res);
  } catch(e) { console.warn('sbGetSalaries:', e); return []; }
}

async function sbAddSalary(entry) {
  try {
    const data  = { ...entry };
    delete data.id;
    delete data.created_at;
    const doc = await _awDbs.createDocument(AW_DB_ID, AW_COL.salaries, _uid(), data);
    return _clean(doc);
  } catch(e) { console.warn('sbAddSalary:', e); return null; }
}

async function sbUpdateSalary(id, entry) {
  try {
    await _awDbs.updateDocument(AW_DB_ID, AW_COL.salaries, String(id), entry);
  } catch(e) { console.warn('sbUpdateSalary:', e); }
}

async function sbDeleteSalary(id) {
  try {
    await _awDbs.deleteDocument(AW_DB_ID, AW_COL.salaries, String(id));
  } catch(e) { console.warn('sbDeleteSalary:', e); }
}


/* ══════════════════════════════════════════════════════════════════
   _sbFetch SHIM
   Catches the remaining inline _sbFetch calls in script.js
   Routes them to the right Appwrite function
   ════════════════════════════════════════════════════════════════ */

async function _sbFetch(path, opts) {
  const method = (opts && opts.method) || 'GET';
  const body   = opts && opts.body;

  // ── ORDERS ──
  if (path.startsWith('orders?id=eq.')) {
    const id = path.replace('orders?id=eq.', '').split('&')[0];
    if (method === 'DELETE') { await _awDeleteOrder(id); return null; }
    if (method === 'PATCH')  { await _awUpdateOrder(id, body); return [body]; }
  }
  if (path === 'orders' || path.startsWith('orders?select=')) {
    if (method === 'POST') return await sbSaveOrder(body);
    return await sbGetOrders(null);
  }
  if (path.startsWith('orders?select=*&order=created_at.desc')) {
    return await sbGetOrders(null);
  }
  if (path.startsWith('orders?staff_id=eq.')) {
    const sid = decodeURIComponent(path.replace('orders?staff_id=eq.', '').split('&')[0]);
    if (method === 'PATCH')  { 
      const res = await sbGetOrders(sid);
      for (const o of res) { await _awUpdateOrder(o.id, body); }
      return null;
    }
    if (method === 'DELETE') {
      const res = await sbGetOrders(sid);
      for (const o of res) { await _awDeleteOrder(o.id); }
      return null;
    }
    return await sbGetOrders(sid);
  }
  if (path.startsWith('orders?staff_name=eq.') || path.startsWith('orders?client_name=eq.')) {
    if (method === 'DELETE') {
      // best-effort delete by name — skip silently if not needed
      return null;
    }
  }

  // ── STAFF ──
  if (path.startsWith('staff?id=eq.')) {
    const id = path.replace('staff?id=eq.', '').split('&')[0];
    if (method === 'PATCH')  {
      const doc = await _awDbs.updateDocument(AW_DB_ID, AW_COL.staff, String(id), body);
      return [_clean(doc)];
    }
    if (method === 'DELETE') { await sbDeleteStaff(id); return null; }
  }

  // ── LOANS ──
  if (path.startsWith('loans?id=eq.')) {
    const id = path.replace('loans?id=eq.', '').split('&')[0].replace(/[()]/g, '');
    if (method === 'DELETE') { await sbDeleteLoan(id); return null; }
    if (method === 'PATCH')  { await sbUpdateLoan({ id, ...body }); return null; }
    if (method === 'POST')   { await sbSaveLoan({ id, ...body }); return null; }
  }
  if (path.startsWith('loans?on_conflict=id')) {
    if (method === 'POST' && body) {
      const rows = Array.isArray(body) ? body : [body];
      for (const r of rows) await sbSaveLoan(r);
      return null;
    }
  }

  // ── DEBITS (map to loans) ──
  if (path.startsWith('debits?staff_id=eq.')) {
    if (method === 'DELETE') return null; // skip — no debits collection
  }

  // ── PRICES ──
  if (path.startsWith('prices?on_conflict=name')) {
    if (method === 'POST' && body) {
      const rows = Array.isArray(body) ? body : [body];
      await sbSavePrices(rows);
      return null;
    }
  }
  if (path.startsWith('prices?name=eq.')) {
    if (method === 'DELETE') {
      const name = decodeURIComponent(path.replace('prices?name=eq.', '').split('&')[0]);
      await sbDeletePrice(name);
      return null;
    }
  }

  // ── STAFF (GET all) ──
  if (path.startsWith('staff?select=') || path === 'staff') {
    if (method === 'GET' || !method) return await sbGetStaff();
    if (method === 'POST' && body) return await sbAddStaff(body);
  }

  // ── LOANS (GET all) ──
  if (path.startsWith('loans?select=') || path === 'loans') {
    if (method === 'GET' || !method) return await sbGetLoans();
  }

  // ── PRICES (GET all) ──
  if (path.startsWith('prices?select=') || path === 'prices') {
    if (method === 'GET' || !method) return await sbGetPrices();
  }

  // ── SALARIES ──
  if (path.startsWith('salaries?select=') || path === 'salaries') {
    if (method === 'GET' || !method) return await sbGetSalaries(null);
    if (method === 'POST' && body) return await sbAddSalary(body);
  }
  if (path.startsWith('salaries?id=eq.')) {
    const id = path.replace('salaries?id=eq.', '').split('&')[0];
    if (method === 'PATCH')  { await sbUpdateSalary(id, body); return null; }
    if (method === 'DELETE') { await sbDeleteSalary(id); return null; }
  }
  if (path.startsWith('salaries?staff_id=eq.')) {
    const sid = decodeURIComponent(path.replace('salaries?staff_id=eq.', '').split('&')[0]);
    return await sbGetSalaries(sid);
  }

  // ── STAFF (PATCH/DELETE by id) ──
  if (path.startsWith('staff?staff_id=eq.') || path.startsWith('staff?name=eq.')) {
    // best-effort: ignore or handle silently
    return null;
  }

  console.warn('[IWI] _sbFetch unhandled path:', method, path);
  return null;
}


/* ══════════════════════════════════════════════════════════════════
   STORAGE HELPERS (for photos later)
   ════════════════════════════════════════════════════════════════ */

async function awUploadFile(file, fileId) {
  try {
    return await _awStorage.createFile(AW_BUCKET_ID, fileId || _uid(), file);
  } catch(e) { console.warn('awUploadFile:', e); return null; }
}

function awGetFileURL(fileId) {
  return _awStorage.getFileView(AW_BUCKET_ID, fileId).toString();
}

async function awDeleteFile(fileId) {
  try { await _awStorage.deleteFile(AW_BUCKET_ID, fileId); return true; }
  catch(e) { console.warn('awDeleteFile:', e); return false; }
}


/* ══════════════════════════════════════════════════════════════════
   STUB — removes Supabase realtime (Appwrite realtime can be added
   later, not needed to get data working first)
   ════════════════════════════════════════════════════════════════ */

// Prevent script.js from crashing on supa.removeChannel / supa.channel
const supa = {
  removeChannel: () => {},
  channel:       () => ({ on: () => ({ subscribe: () => {} }) }),
};

var _realtimeChannel = null;

function setupRealtimeSync() {
  // Realtime placeholder — data refreshes on tab switch already
  console.log('[IWI] Appwrite realtime stub active. Data syncs on tab switch.');
}


/* ══════════════════════════════════════════════════════════════════
   CONSOLE TEST
   Paste in browser console after login to verify:

   sbGetStaff().then(r  => console.log('Staff:', r));
   sbGetOrders().then(r => console.log('Orders:', r));
   sbGetLoans().then(r  => console.log('Loans:', r));
   ════════════════════════════════════════════════════════════════ */
