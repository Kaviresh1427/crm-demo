import { supabase } from './supabaseClient'
import { DEMO_COMPANY } from './demo/demoSeed'

// Company details printed on every document PDF.
// These are the starting values. Your saved details from
// Settings > Company & Bank Details replace them after login.
export const COMPANY = {
  ...DEMO_COMPANY,
  addressLines: [...DEMO_COMPANY.addressLines],
  bank: { ...DEMO_COMPANY.bank },
}

// Loads the saved company details from the database (if you saved any).
export async function loadCompanySettings() {
  try {
    const { data } = await supabase
      .from('company_templates')
      .select('content')
      .eq('kind', 'company_settings')
      .maybeSingle()
    if (data && data.content && Object.keys(data.content).length > 0) {
      const c = data.content
      Object.assign(COMPANY, c, { bank: { ...COMPANY.bank, ...(c.bank || {}) } })
    }
  } catch (e) {
    // If this fails, the starting values above are used.
  }
}

// The document types we can create.
// key = what is saved in the database, title = heading on the PDF,
// convertTo = which documents this one can be turned into.
export const DOC_TYPES = {
  quote: { label: 'Quotation', title: 'QUOTATION', convertTo: ['invoice', 'sales_order', 'proforma'] },
  estimate: { label: 'Estimate', title: 'ESTIMATE', convertTo: ['quote'] },
  proforma: { label: 'Proforma Invoice', title: 'PROFORMA INVOICE', convertTo: ['invoice'] },
  invoice: { label: 'Invoice', title: 'INVOICE', convertTo: ['receipt', 'credit_note'] },
  receipt: { label: 'Receipt', title: 'RECEIPT', convertTo: [] },
  credit_note: { label: 'Credit Note', title: 'CREDIT NOTE', convertTo: [] },
  sales_order: { label: 'Sales Order', title: 'SALES ORDER', convertTo: ['invoice'] },
  statement: { label: 'Account Statement', title: 'ACCOUNT STATEMENT', convertTo: [] },
  work_order: { label: 'Work Order', title: 'WORK ORDER', convertTo: ['invoice'] },
  timesheet: { label: 'Timesheet', title: 'TIMESHEET', convertTo: ['invoice'] },
  purchase_order: { label: 'Purchase Order', title: 'PURCHASE ORDER', convertTo: [] },
  packing_slip: { label: 'Packing Slip', title: 'PACKING SLIP', convertTo: [] },
  item_receipt: { label: 'Item Receipt Letter', title: 'ITEM RECEIPT LETTER', convertTo: [] },
}

export const STATUSES = ['Draft', 'Sent', 'Accepted', 'Paid', 'Overdue', 'Cancelled']

export const PAYMENT_REFERENCE_NOTE = 'Please use the document number as the payment reference.'

export function docLabel(type) {
  return DOC_TYPES[type] ? DOC_TYPES[type].label : type
}
// Remembers your choice: print your company address on PDFs or not.
// (Sales documents have their own tick box on each document.)
const ADDR_KEY = 'sce_show_company_address'
export function showCompanyAddress() {
  try {
    return localStorage.getItem(ADDR_KEY) !== '0'
  } catch (e) {
    return true
  }
}
export function setShowCompanyAddress(on) {
  try {
    localStorage.setItem(ADDR_KEY, on ? '1' : '0')
  } catch (e) {
    // ignore
  }
}
