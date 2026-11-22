import { supabase } from './supabaseClient'

// Saved notes and terms that you can tick on any document.
// kind 'note'  = goes into the Notes box (text only)
// kind 'terms' = goes into the Terms box (printed with its title as a heading)
const KIND = 'terms_library'

export const DEFAULT_BLOCKS = [
  {
    id: 'deposit',
    kind: 'note',
    title: '50% deposit',
    body: 'A 50% deposit is required before we start the job. The balance is payable once the job is completed.',
  },
  {
    id: 'validity',
    kind: 'note',
    title: 'Quotation validity',
    body: 'This quotation is valid for 14 days from the date of issue.',
  },
  {
    id: 'thanks',
    kind: 'note',
    title: 'Thank you',
    body: 'Thank you for choosing Demo IT Solutions.',
  },
  {
    id: 'warranty',
    kind: 'terms',
    title: 'Warranty & After-Sales Support',
    body:
      'Warranty applies to the supplied parts, subject to the applicable warranty conditions. Please contact Demo IT Solutions before sending any item for a warranty claim. If inspection is required, the customer may courier the item to us. For a valid warranty claim, we will cover the return courier cost.',
  },
  {
    id: 'exclusions',
    kind: 'terms',
    title: 'Warranty Exclusions',
    body:
      'Warranty does not cover physical damage, liquid or water damage, misuse or improper handling, unauthorized repairs or modifications, software or Windows issues, malware or virus, or data loss or corruption. Customers should keep a backup of important data. Warranty applies only to the parts and services stated in this document and does not cover unrelated or subsequently developed faults.',
  },
  {
    id: 'payment-delivery',
    kind: 'terms',
    title: 'Payment & Delivery Terms',
    body:
      '- Payment is due upon completion of the agreed service.\n- Any additional repair or replacement not listed above requires customer approval before work proceeds.\n- The customer bears the initial courier cost when sending the item to us.\n- Return courier cost for a valid warranty claim is covered by us.\n- This document covers only the services and parts listed above.',
  },
  {
    id: 'acceptance',
    kind: 'terms',
    title: 'Customer Acceptance',
    body:
      'I confirm that I have reviewed and accepted the services, amount, warranty terms and conditions stated in this document.',
  },
]

// The exact text a block adds to the Notes or Terms box
export function blockText(b) {
  const body = String(b.body || '').trim()
  return b.kind === 'terms' ? '## ' + String(b.title || '').trim() + '\n' + body : body
}

export async function loadTermsLibrary() {
  try {
    const { data } = await supabase.from('company_templates').select('content').eq('kind', KIND).maybeSingle()
    if (data && data.content && Array.isArray(data.content.blocks) && data.content.blocks.length > 0) {
      return data.content.blocks
    }
  } catch (e) {
    // use the starting blocks below
  }
  return DEFAULT_BLOCKS.map((b) => ({ ...b }))
}

export async function saveTermsLibrary(blocks) {
  const { error } = await supabase
    .from('company_templates')
    .upsert({ kind: KIND, content: { blocks }, updated_at: new Date().toISOString() }, { onConflict: 'kind' })
  return error ? error.message : ''
}
