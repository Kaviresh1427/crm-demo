import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, ListChecks } from 'lucide-react'
import { PageHeader, Panel } from '../components/ui'
import Select from '../components/Select'
import { loadTermsLibrary, saveTermsLibrary } from '../termsLibrary'

const KINDS = [
  { value: 'note', label: 'Notes box' },
  { value: 'terms', label: 'Terms box (with heading)' },
]

export default function SettingsTerms() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadTermsLibrary().then((b) => {
      setBlocks(b)
      setLoading(false)
    })
  }, [])

  function setBlock(id, key, value) {
    setMsg('')
    setBlocks((list) => list.map((b) => (b.id === id ? { ...b, [key]: value } : b)))
  }

  function add() {
    setMsg('')
    setBlocks((list) => [...list, { id: 'b' + Date.now(), kind: 'terms', title: '', body: '' }])
  }

  function remove(id) {
    setMsg('')
    setBlocks((list) => list.filter((b) => b.id !== id))
  }

  async function save() {
    setSaving(true)
    setError('')
    const clean = blocks.filter((b) => b.title.trim() && b.body.trim())
    const err = await saveTermsLibrary(clean)
    setSaving(false)
    if (err) setError(err)
    else {
      setBlocks(clean)
      setMsg('Saved. You can now tick these on any document.')
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <PageHeader
        icon={ListChecks}
        title="Notes & Terms Library"
        subtitle="Save your usual notes and terms once. Tick the ones you want when you make a document."
      >
        <button type="button" className="small ghost" onClick={add}>
          <Plus size={15} /> Add New
        </button>
        <button type="button" className="small" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save Library'}
        </button>
      </PageHeader>

      {error && <p className="error">{error}</p>}
      {msg && <p className="ok-msg" style={{ color: '#9af0bd' }}>{msg}</p>}

      {blocks.map((b) => (
        <div key={b.id} style={{ marginBottom: 14 }}>
        <Panel title={b.title || 'New item'}>
          <div className="form-grid">
            <div>
              <label>Title</label>
              <input value={b.title} onChange={(e) => setBlock(b.id, 'title', e.target.value)} />
            </div>
            <div>
              <label>Put it in</label>
              <Select value={b.kind} onChange={(v) => setBlock(b.id, 'kind', v)} options={KINDS} />
            </div>
            <div className="full" style={{ gridColumn: '1 / -1' }}>
              <label>Text (start a line with "- " to make a bullet point)</label>
              <textarea rows="5" value={b.body} onChange={(e) => setBlock(b.id, 'body', e.target.value)} />
            </div>
          </div>
          <div className="detail-actions" style={{ marginTop: 10 }}>
            <button type="button" className="small danger" onClick={() => remove(b.id)}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </Panel>
        </div>
      ))}
    </div>
  )
}
