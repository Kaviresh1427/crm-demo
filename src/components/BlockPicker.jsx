import { Link } from 'react-router-dom'
import { blockText } from '../termsLibrary'

// Tick the saved notes or terms you want on this document.
// Ticking adds the text to the box below. Unticking removes it. You can still edit the box by hand.
export default function BlockPicker({ blocks, value, onChange }) {
  if (!blocks || blocks.length === 0) return null

  function toggle(b) {
    const text = blockText(b)
    const current = String(value || '')
    if (current.includes(text)) {
      onChange(current.replace(text, '').replace(/\n{3,}/g, '\n\n').trim())
    } else {
      onChange((current.trim() ? current.trim() + '\n\n' : '') + text)
    }
  }

  return (
    <div className="blk-pick">
      <div className="blk-head">
        <span>Tick what you want on this document</span>
        <Link to="/settings/terms">Edit library</Link>
      </div>
      <div className="blk-list">
        {blocks.map((b) => {
          const on = String(value || '').includes(blockText(b))
          return (
            <label key={b.id} className={'blk-chip' + (on ? ' on' : '')}>
              <input type="checkbox" checked={on} onChange={() => toggle(b)} />
              <span>{b.title}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
