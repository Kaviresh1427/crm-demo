// DEMO DATABASE
// This replaces Supabase in the demo version. Everything is saved in the
// visitor's own browser (localStorage). Nothing is sent to any server.
// The sample data is put back fresh every day, or when "Reset demo" is pressed.
import { buildSeed, DEMO_USER_ID } from './demoSeed'

const STORE_KEY = 'sarvesh_crm_demo_v1'
const SESSION_KEY = 'sarvesh_crm_demo_session'

// ---------- Table rules (copied from the real database) ----------
const NUMERIC = {
  customers: [],
  contacts: [],
  leads: ['value'],
  activities: [],
  services: ['price'],
  documents: ['subtotal', 'discount_amount', 'tax_rate', 'tax_amount', 'total', 'amount_paid'],
  document_items: ['position', 'quantity', 'unit_price', 'line_total'],
  document_counters: ['year', 'last_number'],
  suppliers: [],
  expenses: ['amount'],
  payments: ['amount'],
  maintenance_contracts: ['amount'],
  item_receipts: ['estimated_cost'],
  item_receipt_items: ['position'],
  company_templates: [],
  profiles: [],
}

const DATE_COLS = ['issue_date', 'due_date', 'next_follow_up', 'follow_up_at', 'expense_date', 'payment_date',
  'start_date', 'end_date', 'received_date']

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
const now = () => new Date().toISOString()

const DEFAULTS = {
  customers: () => ({ type: 'company', country: 'Malaysia', created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  contacts: () => ({ is_primary: false, created_at: now() }),
  leads: () => ({ source: 'Manual', stage: 'New', value: 0, created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  activities: () => ({ type: 'note', activity_at: now(), done: false, created_by: DEMO_USER_ID, created_at: now() }),
  services: () => ({ category: 'Software', unit: 'job', price: 0, active: true, created_at: now() }),
  documents: () => ({
    status: 'Draft', issue_date: todayStr(), currency: 'MYR', subtotal: 0, discount_amount: 0, tax_rate: 0,
    tax_amount: 0, total: 0, amount_paid: 0, show_address: true, created_by: DEMO_USER_ID, created_at: now(), updated_at: now(),
  }),
  document_items: () => ({ position: 1, quantity: 1, unit_price: 0, line_total: 0 }),
  document_counters: () => ({ last_number: 0 }),
  suppliers: () => ({ country: 'Malaysia', created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  expenses: () => ({ expense_date: todayStr(), amount: 0, created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  payments: () => ({ payment_date: todayStr(), amount: 0, created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  maintenance_contracts: () => ({ start_date: todayStr(), billing_cycle: 'Yearly', amount: 0, status: 'Active', created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  item_receipts: () => ({ received_date: todayStr(), estimated_cost: 0, status: 'Received', created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  item_receipt_items: () => ({ position: 1 }),
  company_templates: () => ({ content: {}, updated_at: now() }),
  profiles: () => ({ role: 'staff', created_at: now() }),
}

// Tables where "updated_at" changes by itself on every update (like the real triggers)
const TOUCH_ON_UPDATE = ['customers', 'leads', 'documents']

// Tables without an "id" column, and their key
const KEYS = { document_counters: ['doc_type', 'year'] }

// Columns that must be unique
const UNIQUE = {
  documents: [['doc_number']],
  customers: [['customer_code']],
  item_receipts: [['job_no']],
  maintenance_contracts: [['contract_no']],
  company_templates: [['kind']],
  document_counters: [['doc_type', 'year']],
}

// Links between tables: [child table, column, parent table, what happens when the parent is deleted]
const FKS = [
  ['contacts', 'customer_id', 'customers', 'cascade'],
  ['leads', 'customer_id', 'customers', 'setnull'],
  ['activities', 'customer_id', 'customers', 'cascade'],
  ['activities', 'lead_id', 'leads', 'cascade'],
  ['documents', 'customer_id', 'customers', 'setnull'],
  ['documents', 'converted_from', 'documents', 'setnull'],
  ['document_items', 'document_id', 'documents', 'cascade'],
  ['document_items', 'service_id', 'services', 'setnull'],
  ['expenses', 'supplier_id', 'suppliers', 'setnull'],
  ['expenses', 'customer_id', 'customers', 'setnull'],
  ['item_receipts', 'customer_id', 'customers', 'restrict'],
  ['item_receipt_items', 'receipt_id', 'item_receipts', 'cascade'],
  ['payments', 'document_id', 'documents', 'restrict'],
  ['payments', 'customer_id', 'customers', 'restrict'],
  ['maintenance_contracts', 'customer_id', 'customers', 'restrict'],
]

// ---------- Storage ----------
let db = null

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function freshDb() {
  return { seededOn: todayStr(), tables: buildSeed(), seq: { customer_code: 0, job_no: 0 } }
}

function finishSeed(d) {
  // Continue the customer code and job number counters after the sample data
  const maxNum = (rows, col) =>
    rows.reduce((m, r) => Math.max(m, Number(String(r[col] || '').replace(/\D/g, '')) || 0), 0)
  d.seq.customer_code = maxNum(d.tables.customers || [], 'customer_code')
  d.seq.job_no = maxNum(d.tables.item_receipts || [], 'job_no')
  Object.keys(NUMERIC).forEach((t) => {
    if (!d.tables[t]) d.tables[t] = []
  })
  return d
}

function load() {
  if (db) return db
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.seededOn === todayStr() && parsed.tables) {
        db = parsed
        return db
      }
    }
  } catch (e) {
    // broken or blocked storage: start fresh
  }
  db = finishSeed(freshDb())
  save()
  return db
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db))
  } catch (e) {
    // storage full or blocked: the demo keeps working until the page is closed
  }
}

export function resetDemo() {
  db = finishSeed(freshDb())
  save()
}

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

// ---------- Helpers ----------
function pgError(code, message, details) {
  return { code, message, details: details || null, hint: null }
}

function cleanRow(table, row) {
  const out = { ...row }
  ;(NUMERIC[table] || []).forEach((c) => {
    if (c in out) out[c] = out[c] === '' || out[c] === null || out[c] === undefined ? null : Number(out[c])
  })
  DATE_COLS.forEach((c) => {
    if (c in out && out[c] === '') out[c] = null
  })
  return out
}

function keyOf(table, row) {
  const k = KEYS[table]
  return k ? k.map((c) => String(row[c])).join('|') : row.id
}

function checkUnique(table, rows, row, ignoreKey) {
  for (const cols of UNIQUE[table] || []) {
    if (cols.some((c) => row[c] === null || row[c] === undefined)) continue
    const clash = rows.find(
      (r) => keyOf(table, r) !== ignoreKey && cols.every((c) => String(r[c]) === String(row[c]))
    )
    if (clash) {
      return pgError('23505', 'duplicate key value violates unique constraint "' + table + '_' + cols.join('_') + '_key"',
        'Key (' + cols.join(', ') + ')=(' + cols.map((c) => row[c]).join(', ') + ') already exists.')
    }
  }
  return null
}

function prepareInsert(table, value) {
  const row = { ...DEFAULTS[table](), ...cleanRow(table, value) }
  if (!KEYS[table] && !row.id) row.id = uuid()
  if (table === 'customers' && !row.customer_code) {
    db.seq.customer_code += 1
    row.customer_code = 'CUS-' + String(db.seq.customer_code).padStart(4, '0')
  }
  return row
}

// Deleting: follow the same rules as the real database
function planDelete(table, ids, plan) {
  for (const [child, col, parent, rule] of FKS) {
    if (parent !== table) continue
    const kids = db.tables[child].filter((r) => r[col] && ids.has(r[col]) && !(plan.del[child] && plan.del[child].has(keyOf(child, r))))
    if (kids.length === 0) continue
    if (rule === 'restrict') {
      return pgError('23503',
        'update or delete on table "' + table + '" violates foreign key constraint "' + child + '_' + col + '_fkey" on table "' + child + '"',
        'Key is still referenced from table "' + child + '".')
    }
    if (rule === 'setnull') {
      plan.nulls.push([child, col, ids])
    } else {
      plan.del[child] = plan.del[child] || new Set()
      const newIds = new Set()
      kids.forEach((r) => {
        plan.del[child].add(keyOf(child, r))
        newIds.add(r.id)
      })
      const err = planDelete(child, newIds, plan)
      if (err) return err
    }
  }
  return null
}

// ---------- Reading a "select" text like  'id, name, customers(name, phone)' ----------
function splitTop(s) {
  const parts = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function project(table, row, columns) {
  const cols = splitTop(columns || '*')
  const out = {}
  for (const c of cols) {
    const m = c.match(/^(?:([a-zA-Z_]+):)?([a-zA-Z_]+)(?:!inner)?\((.*)\)$/s)
    if (m) {
      const alias = m[1] || m[2]
      const rel = m[2]
      const inner = m[3]
      const up = FKS.find(([child, , parent]) => child === table && parent === rel)
      if (up) {
        const parentRow = row[up[1]] ? db.tables[rel].find((r) => r.id === row[up[1]]) : null
        out[alias] = parentRow ? project(rel, parentRow, inner) : null
        continue
      }
      const down = FKS.find(([child, , parent]) => child === rel && parent === table)
      if (down) {
        out[alias] = db.tables[rel].filter((r) => r[down[1]] === row.id).map((r) => project(rel, r, inner))
        continue
      }
      out[alias] = null
    } else if (c === '*') {
      Object.assign(out, row)
    } else {
      const [name, alias] = c.split(':').reverse()
      out[alias || name] = row[name] === undefined ? null : row[name]
    }
  }
  return out
}

// ---------- Filters ----------
function same(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return String(a) === String(b)
}
function cmp(a, b) {
  if (a === null || a === undefined) return null
  if (typeof a === 'number' || typeof b === 'number') return Number(a) - Number(b)
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
}
function parseList(v) {
  if (Array.isArray(v)) return v
  return String(v).replace(/^\(|\)$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
}
function test(op, a, v) {
  switch (op) {
    case 'eq': return same(a, v)
    case 'neq': return a !== null && a !== undefined && !same(a, v)
    case 'gt': { const c = cmp(a, v); return c !== null && c > 0 }
    case 'gte': { const c = cmp(a, v); return c !== null && c >= 0 }
    case 'lt': { const c = cmp(a, v); return c !== null && c < 0 }
    case 'lte': { const c = cmp(a, v); return c !== null && c <= 0 }
    case 'in': return a !== null && a !== undefined && parseList(v).some((x) => same(a, x))
    case 'is': return v === null || v === 'null' ? a === null || a === undefined : a === v || String(a) === String(v)
    case 'like':
    case 'ilike': {
      if (a === null || a === undefined) return false
      const re = new RegExp('^' + String(v).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', op === 'ilike' ? 'i' : '')
      return re.test(String(a))
    }
    case 'contains': return Array.isArray(a) && parseList(v).every((x) => a.includes(x))
    default: return true
  }
}

// ---------- The query builder (same shape as supabase.from(...)) ----------
class Query {
  constructor(table) {
    this.table = table
    this.action = 'select'
    this.columns = '*'
    this.filters = []
    this.orders = []
    this.limitN = null
    this.rangeFrom = null
    this.rangeTo = null
    this.singleMode = null
    this.wantRows = false
    this.countMode = null
    this.head = false
  }
  select(columns = '*', opts = {}) {
    if (this.action === 'select') {
      this.columns = columns
      this.countMode = opts.count || null
      this.head = !!opts.head
    } else {
      this.wantRows = true
      this.columns = columns
    }
    return this
  }
  insert(values) { this.action = 'insert'; this.values = values; return this }
  update(values) { this.action = 'update'; this.values = values; return this }
  upsert(values, opts = {}) { this.action = 'upsert'; this.values = values; this.onConflict = opts.onConflict; return this }
  delete() { this.action = 'delete'; return this }

  _f(op, col, val, negate = false) { this.filters.push({ op, col, val, negate }); return this }
  eq(c, v) { return this._f('eq', c, v) }
  neq(c, v) { return this._f('neq', c, v) }
  gt(c, v) { return this._f('gt', c, v) }
  gte(c, v) { return this._f('gte', c, v) }
  lt(c, v) { return this._f('lt', c, v) }
  lte(c, v) { return this._f('lte', c, v) }
  in(c, v) { return this._f('in', c, v) }
  is(c, v) { return this._f('is', c, v) }
  like(c, v) { return this._f('like', c, v) }
  ilike(c, v) { return this._f('ilike', c, v) }
  contains(c, v) { return this._f('contains', c, v) }
  not(c, op, v) { return this._f(op, c, v, true) }
  filter(c, op, v) { return this._f(op, c, v) }
  match(obj) { Object.entries(obj).forEach(([c, v]) => this._f('eq', c, v)); return this }
  or(text) {
    const parts = splitTop(text).map((p) => {
      const [col, op, ...rest] = p.split('.')
      return { col, op, val: rest.join('.') }
    })
    this.filters.push({ or: parts })
    return this
  }
  order(col, opts = {}) { this.orders.push({ col, asc: opts.ascending !== false, nullsFirst: opts.nullsFirst }); return this }
  limit(n) { this.limitN = n; return this }
  range(a, b) { this.rangeFrom = a; this.rangeTo = b; return this }
  single() { this.singleMode = 'one'; return this }
  maybeSingle() { this.singleMode = 'maybe'; return this }
  abortSignal() { return this }
  throwOnError() { return this }

  _match(row) {
    return this.filters.every((f) => {
      if (f.or) return f.or.some((p) => test(p.op, row[p.col], p.val))
      const ok = test(f.op, row[f.col], f.val)
      return f.negate ? !ok && row[f.col] !== null && row[f.col] !== undefined : ok
    })
  }

  _run() {
    load()
    const t = this.table
    if (!db.tables[t]) {
      return { data: null, error: pgError('42P01', 'relation "public.' + t + '" does not exist'), count: null, status: 404 }
    }
    const rows = db.tables[t]
    let result = []
    let error = null

    if (this.action === 'select') {
      result = rows.filter((r) => this._match(r))
    } else if (this.action === 'insert' || this.action === 'upsert') {
      const list = Array.isArray(this.values) ? this.values : [this.values]
      const staged = rows.slice()
      const touched = []
      for (const v of list) {
        if (this.action === 'upsert') {
          const conflict = this.onConflict ? this.onConflict.split(',').map((s) => s.trim()) : KEYS[t] || ['id']
          const existing = staged.find((r) => conflict.every((c) => v[c] !== undefined && same(r[c], v[c])))
          if (existing) {
            const updated = { ...existing, ...cleanRow(t, v) }
            if (TOUCH_ON_UPDATE.includes(t)) updated.updated_at = now()
            staged[staged.indexOf(existing)] = updated
            touched.push(updated)
            continue
          }
        }
        const row = prepareInsert(t, v)
        error = checkUnique(t, staged, row, null)
        if (error) break
        staged.push(row)
        touched.push(row)
      }
      if (!error) {
        db.tables[t] = staged
        result = touched
        save()
      }
    } else if (this.action === 'update') {
      const values = cleanRow(t, this.values)
      const next = rows.map((r) => {
        if (!this._match(r)) return r
        const u = { ...r, ...values }
        if (TOUCH_ON_UPDATE.includes(t)) u.updated_at = now()
        result.push(u)
        return u
      })
      for (const u of result) {
        error = checkUnique(t, next, u, keyOf(t, u))
        if (error) break
      }
      if (!error) {
        db.tables[t] = next
        save()
      } else result = []
    } else if (this.action === 'delete') {
      const victims = rows.filter((r) => this._match(r))
      const plan = { del: { [t]: new Set(victims.map((r) => keyOf(t, r))) }, nulls: [] }
      error = planDelete(t, new Set(victims.map((r) => r.id)), plan)
      if (!error) {
        plan.nulls.forEach(([child, col, ids]) => {
          db.tables[child] = db.tables[child].map((r) => (r[col] && ids.has(r[col]) ? { ...r, [col]: null } : r))
        })
        Object.entries(plan.del).forEach(([tbl, keys]) => {
          db.tables[tbl] = db.tables[tbl].filter((r) => !keys.has(keyOf(tbl, r)))
        })
        result = victims
        save()
      }
    }

    if (error) return { data: null, error, count: null, status: 409 }

    // Sorting, paging, columns
    if (this.orders.length) {
      result = result.slice().sort((a, b) => {
        for (const o of this.orders) {
          const av = a[o.col]
          const bv = b[o.col]
          const an = av === null || av === undefined
          const bn = bv === null || bv === undefined
          if (an || bn) {
            if (an && bn) continue
            const nullsFirst = o.nullsFirst === undefined ? !o.asc : o.nullsFirst
            return an === nullsFirst ? -1 : 1
          }
          let c = typeof av === 'boolean' || typeof bv === 'boolean' ? Number(av) - Number(bv) : cmp(av, bv)
          if (typeof av === 'string' && typeof bv === 'string' && !/^\d{4}-\d\d-\d\d/.test(av)) c = av.localeCompare(bv)
          if (c !== 0) return o.asc ? c : -c
        }
        return 0
      })
    }
    const count = this.countMode ? result.length : null
    if (this.rangeFrom !== null) result = result.slice(this.rangeFrom, this.rangeTo + 1)
    if (this.limitN !== null) result = result.slice(0, this.limitN)

    const returnsRows = this.action === 'select' || this.wantRows
    if (!returnsRows) return { data: null, error: null, count, status: this.action === 'insert' ? 201 : 204 }
    if (this.head) return { data: null, error: null, count, status: 200 }

    let data = result.map((r) => project(t, r, this.columns))
    if (this.singleMode) {
      if (data.length === 1) data = data[0]
      else if (data.length === 0 && this.singleMode === 'maybe') data = null
      else {
        return {
          data: null,
          error: pgError('PGRST116', 'JSON object requested, multiple (or no) rows returned',
            'The result contains ' + data.length + ' rows'),
          count: null,
          status: 406,
        }
      }
    }
    return { data: clone(data), error: null, count, status: 200 }
  }

  then(resolve, reject) {
    return new Promise((done) => setTimeout(done, 25 + Math.random() * 60))
      .then(() => {
        try {
          return this._run()
        } catch (e) {
          return { data: null, error: pgError('500', e.message || String(e)), count: null, status: 500 }
        }
      })
      .then(resolve, reject)
  }
}

// ---------- Number generators (same as the real database) ----------
const PREFIX = {
  quote: 'QT', estimate: 'ES', proforma: 'PI', invoice: 'INV', receipt: 'RC', credit_note: 'CN', statement: 'ST',
  sales_order: 'SO', work_order: 'WO', timesheet: 'TS', purchase_order: 'PO', packing_slip: 'PS', item_receipt: 'IRL',
}

function rpcRun(name, args = {}) {
  load()
  if (name === 'next_doc_number') {
    const type = args.p_type
    const yr = new Date().getFullYear()
    const counters = db.tables.document_counters
    let c = counters.find((r) => r.doc_type === type && Number(r.year) === yr)
    if (!c) {
      c = { doc_type: type, year: yr, last_number: 0 }
      counters.push(c)
    }
    c.last_number += 1
    save()
    const prefix = PREFIX[type] || String(type).slice(0, 3).toUpperCase()
    return { data: prefix + '-' + yr + '-' + String(c.last_number).padStart(3, '0'), error: null }
  }
  if (name === 'next_job_no') {
    db.seq.job_no += 1
    save()
    return { data: 'JOB-' + String(db.seq.job_no).padStart(4, '0'), error: null }
  }
  return { data: null, error: pgError('PGRST202', 'Could not find the function public.' + name) }
}

// ---------- Demo login (no password) ----------
const listeners = new Set()

function demoUser() {
  return {
    id: DEMO_USER_ID,
    email: 'demo@demo-company.my',
    role: 'authenticated',
    user_metadata: { full_name: 'Demo User' },
    app_metadata: {},
  }
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function notify(event, session) {
  listeners.forEach((cb) => {
    try {
      cb(event, session)
    } catch (e) {
      // ignore
    }
  })
}

const auth = {
  async getSession() {
    return { data: { session: readSession() }, error: null }
  },
  async getUser() {
    const s = readSession()
    return { data: { user: s ? s.user : null }, error: null }
  },
  onAuthStateChange(cb) {
    listeners.add(cb)
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
  },
  async signInWithPassword() {
    load()
    const session = {
      access_token: 'demo',
      token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
      user: demoUser(),
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch (e) {
      // ignore
    }
    setTimeout(() => notify('SIGNED_IN', session), 0)
    return { data: { session, user: session.user }, error: null }
  },
  async signOut() {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch (e) {
      // ignore
    }
    setTimeout(() => notify('SIGNED_OUT', null), 0)
    return { error: null }
  },
  async updateUser() {
    return { data: { user: demoUser() }, error: null }
  },
  async resetPasswordForEmail() {
    return { data: {}, error: null }
  },
}

export const supabase = {
  from: (table) => new Query(table),
  rpc: (name, args) =>
    new Promise((done) => setTimeout(done, 40)).then(() => rpcRun(name, args)),
  auth,
  // The real system does not use these, they are here so nothing breaks
  storage: { from: () => ({ upload: async () => ({ data: null, error: pgError('demo', 'Uploads are off in the demo') }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  channel: () => ({ on() { return this }, subscribe() { return this } }),
  removeChannel: () => {},
}
