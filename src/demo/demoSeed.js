// DEMO SAMPLE DATA
// A made-up company with made-up customers. All dates are counted from today,
// so the demo always looks "live" (this month's sales, follow-ups due today, etc.).
// No real customer, phone number or bank account is used here.

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

export const DEMO_COMPANY = {
  name: 'DEMO IT SOLUTIONS SDN BHD',
  addressLines: ['NO. 1, JALAN CONTOH 1/1,', 'TAMAN DEMO,', '81100 JOHOR BAHRU,', 'JOHOR.'],
  phone: '+60 7-000 0000',
  email: 'hello@demo-company.my',
  website: 'www.demo-company.my',
  bank: {
    bankName: 'Demo Bank Berhad',
    accountName: 'Demo IT Solutions Sdn Bhd',
    accountNumber: '0000-0000-0000',
  },
}

// Small fixed "random" so the sample data looks the same every time
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function pad(n) {
  return String(n).padStart(2, '0')
}
function dateStr(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}
function day(offset) {
  const d = new Date()
  d.setHours(10, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}
const D = (offset) => dateStr(day(offset))
const T = (offset, hour = 10) => {
  const d = day(offset)
  d.setHours(hour, Math.floor((Math.abs(offset) * 7) % 60), 0, 0)
  return d.toISOString()
}

let idN = 0
function id(prefix) {
  idN += 1
  // valid-looking uuid, different for every row
  const hex = (prefix + idN.toString(16)).replace(/[^0-9a-f]/g, '').padStart(12, '0').slice(-12)
  return 'd0000000-0000-4000-8000-' + hex
}

const round2 = (n) => Math.round(n * 100) / 100

export function buildSeed() {
  idN = 0
  const rand = rng(20261122)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]

  // ---------- Users ----------
  const profiles = [
    { id: DEMO_USER_ID, full_name: 'Demo User', role: 'owner', created_at: T(-200) },
    { id: id('a'), full_name: 'Aina Sofea', role: 'staff', created_at: T(-150) },
    { id: id('a'), full_name: 'Farah Lim', role: 'accountant', created_at: T(-120) },
  ]

  // ---------- Services ----------
  const svc = (name, category, unit, price, description) => ({
    id: id('b'), name, category, unit, price, active: true, description, created_at: T(-200),
  })
  const services = [
    svc('POS System Package', 'Software', 'job', 3500, 'Point-of-sale system with menu/product setup, receipts, daily sales report and staff login.'),
    svc('Custom Business System', 'Software', 'job', 8000, 'Web-based system built around your workflow: customers, jobs, stock and reports.'),
    svc('Web Application Development', 'Software', 'job', 6000, 'Online booking or records app that works on phone, tablet and laptop.'),
    svc('Business Website (5 pages)', 'Software', 'job', 1800, 'Modern responsive website with enquiry form and WhatsApp button.'),
    svc('Website Hosting & Domain (1 year)', 'Software', 'year', 450, 'Hosting, .my domain renewal and SSL certificate for 12 months.'),
    svc('System Training (half day)', 'Software', 'day', 300, 'On-site training for staff on the new system.'),
    svc('Laptop / PC Service', 'IT Services', 'job', 150, 'Full check-up, cleaning, thermal paste and software tune-up.'),
    svc('Windows Reinstallation', 'IT Services', 'job', 120, 'Windows reinstall with drivers, updates and basic software.'),
    svc('SSD Upgrade (512GB)', 'IT Services', 'unit', 280, '512GB SSD including installation and data transfer.'),
    svc('On-Site IT Support', 'IT Services', 'visit', 100, 'Technician visit to your office or shop (first hour).'),
    svc('Monthly IT Maintenance', 'IT Services', 'month', 350, 'Monthly check-up of office PCs, backups and remote support.'),
    svc('Microsoft 365 Setup', 'IT Services', 'unit', 80, 'Microsoft 365 account, email and Office apps setup per user.'),
    svc('Data Recovery', 'IT Services', 'job', 300, 'Recovery of files from damaged or formatted drives.'),
  ]
  const S = Object.fromEntries(services.map((s) => [s.name, s]))

  // ---------- Customers ----------
  const cust = (name, type, city, phoneEnd, email, extra = {}) => ({
    id: id('c'),
    name,
    type,
    email,
    phone: '011-0000 0' + phoneEnd,
    address: extra.address || null,
    city,
    state: 'Johor',
    postcode: extra.postcode || '81100',
    country: 'Malaysia',
    tax_id: extra.tax_id || null,
    notes: extra.notes || null,
    created_by: DEMO_USER_ID,
    created_at: T(extra.since || -180),
    updated_at: T(extra.since || -180),
  })
  const customers = [
    cust('Kedai Runcit Maju Jaya', 'company', 'Johor Bahru', '101', 'majujaya@example.com', { address: 'No. 12, Jalan Pasar 3', since: -175, notes: 'Grocery shop. Owner prefers WhatsApp.' }),
    cust('Restoran Selera Kampung', 'company', 'Skudai', '102', 'selerakampung@example.com', { address: 'No. 8, Jalan Makan 2', postcode: '81300', since: -170 }),
    cust('Klinik Gigi Senyum Indah', 'company', 'Johor Bahru', '103', 'admin@senyumindah.example.com', { address: 'Lot 5, Jalan Klinik', since: -160 }),
    cust('Bright Minds Tuition Centre', 'company', 'Kulai', '104', 'brightminds@example.com', { postcode: '81000', since: -150 }),
    cust('Bengkel Kereta Ah Seng', 'company', 'Masai', '105', 'ahseng.workshop@example.com', { postcode: '81750', since: -140 }),
    cust('Butik Nurul Fashion', 'company', 'Johor Bahru', '106', 'nurulfashion@example.com', { since: -120 }),
    cust('Pantas Logistics Sdn Bhd', 'company', 'Pasir Gudang', '107', 'ops@pantaslogistics.example.com', { postcode: '81700', since: -110, tax_id: 'C0000000000' }),
    cust('Hotel Seri Pelangi', 'company', 'Johor Bahru', '108', 'it@seripelangi.example.com', { since: -100 }),
    cust('Kafe Kopi Kita', 'company', 'Iskandar Puteri', '109', 'kopikita@example.com', { postcode: '79100', since: -90 }),
    cust('Dobi Bersih Laundry', 'company', 'Tebrau', '110', 'dobibersih@example.com', { postcode: '81100', since: -60 }),
    cust('Lim Wei Jie', 'individual', 'Johor Bahru', '111', 'weijie.lim@example.com', { since: -45 }),
    cust('Siti Aminah binti Ahmad', 'individual', 'Skudai', '112', 'siti.aminah@example.com', { postcode: '81300', since: -20 }),
  ]
  customers.forEach((c, i) => {
    c.customer_code = 'CUS-' + String(i + 1).padStart(4, '0')
  })
  const C = (name) => customers.find((c) => c.name === name)

  // ---------- Contacts ----------
  const contact = (cname, name, position, phoneEnd, email, primary) => ({
    id: id('d'), customer_id: C(cname).id, name, position, phone: '011-0000 0' + phoneEnd, email, is_primary: primary, created_at: C(cname).created_at,
  })
  const contacts = [
    contact('Kedai Runcit Maju Jaya', 'Encik Rahman', 'Owner', '201', 'rahman@example.com', true),
    contact('Restoran Selera Kampung', 'Puan Zaleha', 'Owner', '202', 'zaleha@example.com', true),
    contact('Restoran Selera Kampung', 'Hafiz', 'Supervisor', '203', null, false),
    contact('Klinik Gigi Senyum Indah', 'Dr. Tan Mei Ling', 'Principal Dentist', '204', 'drtan@example.com', true),
    contact('Klinik Gigi Senyum Indah', 'Nadia', 'Front Desk', '205', 'frontdesk@example.com', false),
    contact('Pantas Logistics Sdn Bhd', 'Mr. Rajesh', 'Operations Manager', '206', 'rajesh@example.com', true),
    contact('Hotel Seri Pelangi', 'Ms. Jessica Wong', 'Admin Manager', '207', 'jessica@example.com', true),
    contact('Kafe Kopi Kita', 'Amir', 'Owner', '208', 'amir@example.com', true),
  ]

  // ---------- Documents ----------
  const documents = []
  const document_items = []
  const counters = {}
  const PREFIX = { quote: 'QT', estimate: 'ES', proforma: 'PI', invoice: 'INV', receipt: 'RC', credit_note: 'CN', sales_order: 'SO', work_order: 'WO', timesheet: 'TS', purchase_order: 'PO', packing_slip: 'PS' }
  const TERMS = 'Please use the document number as the payment reference.'

  // planned documents, numbered later in date order
  const planned = []
  function plan(type, cname, offset, lines, opts = {}) {
    const p = { type, cname, offset, lines, opts, id: id('e') }
    planned.push(p)
    return p
  }
  const L = (name, qty = 1, price, desc) => ({ name, qty, price: price ?? S[name].price, desc: desc || null })

  // Quotations
  const q1 = plan('quote', 'Kedai Runcit Maju Jaya', -160, [L('POS System Package'), L('System Training (half day)')], { status: 'Accepted' })
  const q2 = plan('quote', 'Klinik Gigi Senyum Indah', -150, [L('Custom Business System', 1, 9500, 'Patient records and appointment system with SMS-ready reminders.'), L('System Training (half day)', 2)], { status: 'Accepted' })
  const q3 = plan('quote', 'Hotel Seri Pelangi', -98, [L('Monthly IT Maintenance', 12, 350), L('Microsoft 365 Setup', 15)], { status: 'Accepted' })
  plan('quote', 'Bright Minds Tuition Centre', -40, [L('Web Application Development', 1, 5500, 'Student attendance and fee tracking web app.')], { status: 'Sent', due: 30 })
  plan('quote', 'Pantas Logistics Sdn Bhd', -12, [L('Custom Business System', 1, 12000, 'Delivery job tracking system with driver phone view.'), L('System Training (half day)', 2)], { status: 'Sent', due: 30 })
  plan('quote', 'Dobi Bersih Laundry', -3, [L('POS System Package', 1, 3200, 'Laundry POS with order tags and SMS-ready pickup list.')], { status: 'Draft', due: 2 })
  plan('quote', 'Siti Aminah binti Ahmad', -1, [L('Laptop / PC Service'), L('SSD Upgrade (512GB)')], { status: 'Sent', due: 14 })
  plan('estimate', 'Kafe Kopi Kita', -8, [L('POS System Package', 1, 3000), L('Business Website (5 pages)', 1, 1500)], { status: 'Sent' })
  plan('proforma', 'Bright Minds Tuition Centre', -5, [L('Business Website (5 pages)')], { status: 'Sent', due: 14 })
  plan('sales_order', 'Pantas Logistics Sdn Bhd', -9, [L('On-Site IT Support', 4), L('Microsoft 365 Setup', 10)], { status: 'Accepted' })

  // Invoices (status: paid / part / unpaid / overdue)
  const inv = [
    ['Kedai Runcit Maju Jaya', -155, [L('POS System Package'), L('System Training (half day)')], 'paid', q1],
    ['Restoran Selera Kampung', -150, [L('POS System Package', 1, 3800, 'Restaurant POS with table orders and kitchen slip.')], 'paid'],
    ['Klinik Gigi Senyum Indah', -140, [L('Custom Business System', 1, 9500, 'Patient records and appointment system with SMS-ready reminders.'), L('System Training (half day)', 2)], 'paid', q2],
    ['Bengkel Kereta Ah Seng', -130, [L('Laptop / PC Service', 2), L('Windows Reinstallation', 2)], 'paid'],
    ['Butik Nurul Fashion', -115, [L('Business Website (5 pages)'), L('Website Hosting & Domain (1 year)')], 'paid'],
    ['Pantas Logistics Sdn Bhd', -105, [L('On-Site IT Support', 3), L('SSD Upgrade (512GB)', 4)], 'paid'],
    ['Hotel Seri Pelangi', -95, [L('Microsoft 365 Setup', 15)], 'paid', q3],
    ['Kafe Kopi Kita', -85, [L('Business Website (5 pages)', 1, 1600), L('Website Hosting & Domain (1 year)')], 'paid'],
    ['Hotel Seri Pelangi', -65, [L('Monthly IT Maintenance', 2)], 'paid'],
    ['Lim Wei Jie', -44, [L('Data Recovery'), L('SSD Upgrade (512GB)')], 'paid'],
    ['Bengkel Kereta Ah Seng', -50, [L('On-Site IT Support', 2), L('Windows Reinstallation')], 'overdue'],
    ['Hotel Seri Pelangi', -35, [L('Monthly IT Maintenance', 1)], 'paid'],
    ['Klinik Gigi Senyum Indah', -32, [L('Web Application Development', 1, 4500, 'Online appointment booking page linked to the clinic system.')], 'part'],
    ['Restoran Selera Kampung', -26, [L('On-Site IT Support'), L('Laptop / PC Service')], 'paid'],
    ['Butik Nurul Fashion', -18, [L('POS System Package', 1, 3300, 'Boutique POS with barcode stock and member points.')], 'part'],
    ['Pantas Logistics Sdn Bhd', -10, [L('Microsoft 365 Setup', 10), L('On-Site IT Support', 2)], 'unpaid'],
    ['Hotel Seri Pelangi', -5, [L('Monthly IT Maintenance', 1)], 'paid'],
    ['Kedai Runcit Maju Jaya', -4, [L('Website Hosting & Domain (1 year)')], 'unpaid'],
    ['Lim Wei Jie', -2, [L('Laptop / PC Service')], 'paid'],
  ]
  const invoicePlans = inv.map(([cname, offset, lines, kind, from]) =>
    plan('invoice', cname, offset, lines, { kind, from, due: kind === 'overdue' ? 14 : 30 })
  )

  // Other documents
  plan('credit_note', 'Bengkel Kereta Ah Seng', -125, [L('Refund', 1, 120, 'Refund: one PC did not need Windows reinstallation.')], { status: 'Sent' })
  plan('work_order', 'Pantas Logistics Sdn Bhd', -6, [L('On-Site IT Support', 2, 100, 'set up 10 new staff accounts and install Office on 5 PCs')], { status: 'Sent' })
  plan('work_order', 'Restoran Selera Kampung', -1, [L('On-Site IT Support', 1, 100, 'kitchen slip printer not printing, check cable and driver')], { status: 'Draft' })
  plan('timesheet', 'Klinik Gigi Senyum Indah', -15, [L('System Training (half day)', 1, 300, 'appointments module, 4 hours')], { status: 'Sent' })
  plan('packing_slip', 'Butik Nurul Fashion', -16, [L('POS hardware set', 1, 0, 'Barcode scanner x1, receipt printer x1, cash drawer x1')], { status: 'Sent' })

  // Number them in date order (like they were created one by one)
  planned.sort((a, b) => a.offset - b.offset)
  for (const p of planned) {
    const issue = day(p.offset)
    const yr = issue.getFullYear()
    const key = p.type + '|' + yr
    counters[key] = (counters[key] || 0) + 1
    p.number = PREFIX[p.type] + '-' + yr + '-' + String(counters[key]).padStart(3, '0')
  }

  const payments = []
  const receipts = []
  for (const p of planned) {
    const c = C(p.cname)
    const subtotal = round2(p.lines.reduce((s, l) => s + l.qty * l.price, 0))
    const total = subtotal
    let status = p.opts.status || 'Draft'
    let paid = 0
    if (p.type === 'invoice') {
      const kind = p.opts.kind
      if (kind === 'paid') {
        paid = total
        status = 'Paid'
        const payDay = Math.min(p.offset + 3 + Math.floor(rand() * 10), 0)
        payments.push({ document_id: p.id, customer_id: c.id, offset: payDay, amount: total, method: pick(['Bank Transfer', 'Bank Transfer', 'Cash', 'E-Wallet']), reference: p.number })
        if (rand() < 0.35 || p.offset > -10) receipts.push({ p, payDay, total })
      } else if (kind === 'part') {
        paid = round2(total * 0.5)
        status = 'Sent'
        payments.push({ document_id: p.id, customer_id: c.id, offset: Math.min(p.offset + 2, 0), amount: paid, method: 'Bank Transfer', reference: p.number + ' (50% deposit)' })
      } else if (kind === 'overdue') {
        status = 'Overdue'
      } else {
        status = 'Sent'
      }
    }
    documents.push({
      id: p.id,
      doc_type: p.type,
      doc_number: p.number,
      customer_id: c.id,
      status,
      issue_date: D(p.offset),
      due_date: p.opts.due ? D(p.offset + p.opts.due) : null,
      currency: 'MYR',
      subtotal,
      discount_amount: 0,
      tax_rate: 0,
      tax_amount: 0,
      total,
      amount_paid: paid,
      notes: ['quote', 'estimate', 'proforma'].includes(p.type) ? '50% deposit to confirm the order. Balance upon completion.' : null,
      terms: TERMS,
      converted_from: p.opts.from ? p.opts.from.id : null,
      created_by: DEMO_USER_ID,
      created_at: T(p.offset, 11),
      updated_at: T(p.offset, 11),
      show_address: true,
      import_ref: null,
    })
    p.lines.forEach((l, i) => {
      document_items.push({
        id: id('f'),
        document_id: p.id,
        position: i + 1,
        service_id: S[l.name] ? S[l.name].id : null,
        description: S[l.name] ? (l.desc ? l.name + ' - ' + l.desc : l.name) : l.desc || l.name,
        quantity: l.qty,
        unit_price: l.price,
        line_total: round2(l.qty * l.price),
      })
    })
  }

  // Receipts for some paid invoices
  receipts.sort((a, b) => a.payDay - b.payDay)
  for (const r of receipts) {
    const yr = day(r.payDay).getFullYear()
    const key = 'receipt|' + yr
    counters[key] = (counters[key] || 0) + 1
    const rid = id('e')
    documents.push({
      id: rid,
      doc_type: 'receipt',
      doc_number: 'RC-' + yr + '-' + String(counters[key]).padStart(3, '0'),
      customer_id: C(r.p.cname).id,
      status: 'Paid',
      issue_date: D(r.payDay),
      due_date: null,
      currency: 'MYR',
      subtotal: r.total,
      discount_amount: 0,
      tax_rate: 0,
      tax_amount: 0,
      total: r.total,
      amount_paid: r.total,
      notes: 'Payment received for ' + r.p.number + '. Thank you.',
      terms: null,
      converted_from: r.p.id,
      created_by: DEMO_USER_ID,
      created_at: T(r.payDay, 15),
      updated_at: T(r.payDay, 15),
      show_address: true,
      import_ref: null,
    })
    document_items.push({
      id: id('f'), document_id: rid, position: 1, service_id: null,
      description: 'Payment for ' + r.p.number, quantity: 1, unit_price: r.total, line_total: r.total,
    })
  }

  const document_counters = Object.entries(counters).map(([k, n]) => {
    const [doc_type, year] = k.split('|')
    return { doc_type, year: Number(year), last_number: n }
  })

  const paymentRows = payments.map((p) => ({
    id: id('g'),
    document_id: p.document_id,
    customer_id: p.customer_id,
    payment_date: D(p.offset),
    amount: p.amount,
    method: p.method,
    reference: p.reference,
    notes: null,
    created_by: DEMO_USER_ID,
    created_at: T(p.offset, 16),
    updated_at: T(p.offset, 16),
  }))

  // ---------- Suppliers ----------
  const sup = (name, contact_person, category, city, phoneEnd) => ({
    id: id('h'), name, contact_person, email: name.toLowerCase().replace(/[^a-z]+/g, '') + '@example.com',
    phone: '011-0000 0' + phoneEnd, address: null, city, state: 'Johor', postcode: '81100', country: 'Malaysia',
    tax_id: null, category, notes: null, created_by: DEMO_USER_ID, created_at: T(-190), updated_at: T(-190),
  })
  const suppliers = [
    sup('TechParts Distribution Sdn Bhd', 'Mr. Wong', 'Parts & Hardware', 'Johor Bahru', '301'),
    sup('CloudHost MY', 'Support Team', 'Hosting & Domain', 'Kuala Lumpur', '302'),
    sup('PrintMax Supplies', 'Ms. Kavitha', 'Parts & Hardware', 'Skudai', '303'),
    sup('Swift Courier Services', 'Counter', 'Transport', 'Johor Bahru', '304'),
    sup('SoftLicence Asia', 'Sales', 'Software & Licences', 'Kuala Lumpur', '305'),
  ]
  const SP = (n) => suppliers.find((s) => s.name.startsWith(n)).id

  // ---------- Expenses ----------
  const expenses = []
  const exp = (offset, description, category, supplier, amount, method = 'Bank Transfer', customer) => {
    expenses.push({
      id: id('i'), expense_date: D(offset), description, category, supplier_id: supplier ? SP(supplier) : null,
      customer_id: customer ? C(customer).id : null, amount, payment_method: method, reference: null, notes: null,
      created_by: DEMO_USER_ID, created_at: T(offset, 18), updated_at: T(offset, 18),
    })
  }
  for (let m = 0; m < 6; m++) {
    const base = -m * 30 - 2
    exp(base, 'Cloud hosting and domains (monthly)', 'Hosting & Domain', 'CloudHost', 120)
    exp(base - 5, 'Fuel and parking for site visits', 'Transport', null, 180 + Math.round(rand() * 80), 'Card')
    exp(base - 9, 'Office internet and phone bill', 'Office', null, 199, 'Bank Transfer')
  }
  exp(-152, 'Receipt printer and cash drawer for Maju Jaya', 'Parts & Hardware', 'TechParts', 690, 'Bank Transfer', 'Kedai Runcit Maju Jaya')
  exp(-148, 'Kitchen printer for Selera Kampung', 'Parts & Hardware', 'PrintMax', 420, 'Bank Transfer', 'Restoran Selera Kampung')
  exp(-104, '4 x 512GB SSD', 'Parts & Hardware', 'TechParts', 640, 'Bank Transfer', 'Pantas Logistics Sdn Bhd')
  exp(-96, 'Microsoft 365 licences (15 users)', 'Software & Licences', 'SoftLicence', 900, 'Bank Transfer', 'Hotel Seri Pelangi')
  exp(-70, 'Facebook and Instagram ads', 'Marketing', null, 300, 'Card')
  exp(-43, 'SSD for data recovery job', 'Parts & Hardware', 'TechParts', 160, 'Cash', 'Lim Wei Jie')
  exp(-20, 'Courier: POS hardware to Butik Nurul', 'Transport', 'Swift', 35, 'Cash', 'Butik Nurul Fashion')
  exp(-17, 'Barcode scanner and receipt printer', 'Parts & Hardware', 'TechParts', 760, 'Bank Transfer', 'Butik Nurul Fashion')
  exp(-11, 'Freelance designer for website graphics', 'Subcontractor', null, 400, 'Bank Transfer')
  exp(-1, 'Flyers printing (500 pcs)', 'Marketing', 'PrintMax', 150, 'E-Wallet')

  // ---------- Maintenance contracts ----------
  const contract = (no, cname, title, start, end, cycle, amount, scope) => ({
    id: id('j'), contract_no: no, customer_id: C(cname).id, title, start_date: D(start), end_date: D(end),
    billing_cycle: cycle, amount, status: 'Active', scope, notes: null, created_by: DEMO_USER_ID,
    created_at: T(start), updated_at: T(start),
  })
  const maintenance_contracts = [
    contract('MC-001', 'Hotel Seri Pelangi', 'Monthly IT Maintenance - 15 PCs', -95, 18, 'Monthly', 350, 'Monthly check-up, backups, remote support, 2 on-site visits per month.'),
    contract('MC-002', 'Kafe Kopi Kita', 'Website Hosting & Support', -85, 280, 'Yearly', 450, 'Hosting, domain, SSL and small content updates.'),
    contract('MC-003', 'Pantas Logistics Sdn Bhd', 'Quarterly PC Maintenance', -100, 265, 'Quarterly', 900, 'Quarterly service of 20 office PCs and printers.'),
  ]

  // ---------- Item receipts (laptops / devices received for repair) ----------
  const item_receipts = []
  const item_receipt_items = []
  const receipt = (n, cname, offset, contact_name, problem, condition, cost, status, items) => {
    const rid = id('k')
    item_receipts.push({
      id: rid, job_no: 'JOB-' + String(n).padStart(4, '0'), customer_id: C(cname).id, received_date: D(offset),
      contact_name, contact_phone: C(cname).phone, problem_description: problem, condition_notes: condition,
      estimated_cost: cost, status, created_by: DEMO_USER_ID, created_at: T(offset, 12), updated_at: T(offset, 12),
    })
    items.forEach((it, i) => item_receipt_items.push({ id: id('l'), receipt_id: rid, position: i + 1, ...it }))
  }
  receipt(1, 'Lim Wei Jie', -46, 'Lim Wei Jie', 'Laptop cannot boot, need files back.', 'Small scratch on lid.', 460, 'Collected',
    [{ device_type: 'Laptop', brand: 'Acer', model: 'Aspire 5', serial_no: 'DEMO-SN-1001', accessories: 'Charger', notes: null }])
  receipt(2, 'Bengkel Kereta Ah Seng', -12, 'Ah Seng', 'Office PC very slow, sometimes blue screen.', 'Dusty inside.', 270, 'Ready',
    [{ device_type: 'Desktop PC', brand: 'Dell', model: 'OptiPlex 3080', serial_no: 'DEMO-SN-2002', accessories: 'Power cable', notes: null }])
  receipt(3, 'Siti Aminah binti Ahmad', -2, 'Siti Aminah', 'Laptop slow, wants SSD upgrade and full service.', 'Good condition.', 430, 'In Progress',
    [{ device_type: 'Laptop', brand: 'HP', model: 'Pavilion 14', serial_no: 'DEMO-SN-3003', accessories: 'Charger, bag', notes: null }])
  receipt(4, 'Restoran Selera Kampung', 0, 'Hafiz', 'Receipt printer not printing.', 'Paper cover cracked.', 100, 'Received',
    [{ device_type: 'Printer', brand: 'Epson', model: 'TM-T82', serial_no: 'DEMO-SN-4004', accessories: 'USB cable', notes: null }])

  // ---------- Leads ----------
  const lead = (name, company, source, interest, stage, value, created, follow, extra = {}) => ({
    id: id('m'), customer_id: extra.customer ? C(extra.customer).id : null, name, company,
    phone: '011-0000 0' + (400 + idN % 100), email: extra.email || null, source, service_interest: interest,
    message: extra.message || null, stage, value, next_follow_up: follow === null ? null : D(follow), notes: extra.notes || null,
    created_by: DEMO_USER_ID, created_at: T(created), updated_at: T(Math.min(created + 2, 0)),
  })
  const leads = [
    lead('Encik Faizal', 'Faizal Hardware', 'Website', 'POS System Package', 'New', 3500, -1, 0, { message: 'Hi, I need a POS for my hardware shop with barcode. How much?' }),
    lead('Ms. Priya', 'Glow Beauty Salon', 'Instagram', 'Web Application Development', 'New', 4000, 0, 1, { message: 'Looking for an online booking system for my salon.' }),
    lead('Mr. Chong', 'Chong Bros Trading', 'WhatsApp', 'Custom Business System', 'New', 9000, -2, 0, { message: 'Need stock and invoice system for 2 branches.' }),
    lead('Puan Rohana', 'Rohana Catering', 'Facebook', 'Business Website (5 pages)', 'Contacted', 1800, -6, 2),
    lead('Jason Teo', 'Teo Auto Parts', 'Referral', 'POS System Package', 'Contacted', 3500, -9, -1, { notes: 'Referred by Ah Seng. Call in the evening.' }),
    lead('Mr. Rajesh', 'Pantas Logistics Sdn Bhd', 'Phone call', 'Custom Business System', 'Proposal Sent', 12000, -14, 3, { customer: 'Pantas Logistics Sdn Bhd', notes: 'Quotation sent. Decision after management meeting.' }),
    lead('Cikgu Hana', 'Bright Minds Tuition Centre', 'Walk-in', 'Web Application Development', 'Proposal Sent', 5500, -42, -2, { customer: 'Bright Minds Tuition Centre' }),
    lead('Amir', 'Kafe Kopi Kita', 'Referral', 'POS System Package', 'Meeting', 4500, -10, 4, { customer: 'Kafe Kopi Kita', notes: 'Demo at the cafe on Saturday 3pm.' }),
    lead('Mdm. Lee', 'Lee Pharmacy', 'Website', 'POS System Package', 'Meeting', 3800, -7, 1),
    lead('Dr. Tan Mei Ling', 'Klinik Gigi Senyum Indah', 'Referral', 'Custom Business System', 'Won', 9500, -155, null, { customer: 'Klinik Gigi Senyum Indah' }),
    lead('Encik Rahman', 'Kedai Runcit Maju Jaya', 'Walk-in', 'POS System Package', 'Won', 3800, -165, null, { customer: 'Kedai Runcit Maju Jaya' }),
    lead('Ms. Jessica Wong', 'Hotel Seri Pelangi', 'Phone call', 'Monthly IT Maintenance', 'Won', 4200, -100, null, { customer: 'Hotel Seri Pelangi' }),
    lead('Mr. Kumar', 'KS Florist', 'Facebook', 'Business Website (5 pages)', 'Lost', 1800, -60, null, { notes: 'Went with a cheaper option.' }),
    lead('Dobi Bersih', 'Dobi Bersih Laundry', 'WhatsApp', 'POS System Package', 'Contacted', 3200, -4, 0, { customer: 'Dobi Bersih Laundry' }),
  ]

  // ---------- Notes and reminders ----------
  const activities = [
    { id: id('n'), customer_id: C('Bengkel Kereta Ah Seng').id, lead_id: null, type: 'call', summary: 'Remind Ah Seng about overdue invoice payment', activity_at: T(-7), follow_up_at: D(0), done: false, created_by: DEMO_USER_ID, created_at: T(-7) },
    { id: id('n'), customer_id: C('Hotel Seri Pelangi').id, lead_id: null, type: 'note', summary: 'Discuss contract renewal for next year', activity_at: T(-3), follow_up_at: D(-1), done: false, created_by: DEMO_USER_ID, created_at: T(-3) },
    { id: id('n'), customer_id: C('Klinik Gigi Senyum Indah').id, lead_id: null, type: 'note', summary: 'Collect balance 50% for booking page', activity_at: T(-10), follow_up_at: D(2), done: false, created_by: DEMO_USER_ID, created_at: T(-10) },
  ]

  // ---------- Company settings (shown on every PDF) ----------
  const company_templates = [
    { id: id('o'), kind: 'company_settings', content: DEMO_COMPANY, updated_at: T(-30) },
  ]

  return {
    profiles,
    services,
    customers,
    contacts,
    leads,
    activities,
    documents,
    document_items,
    document_counters,
    payments: paymentRows,
    suppliers,
    expenses,
    maintenance_contracts,
    item_receipts,
    item_receipt_items,
    company_templates,
  }
}
