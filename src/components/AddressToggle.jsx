import { useState } from 'react'
import { showCompanyAddress, setShowCompanyAddress } from '../docSettings'

// Tick box: print my company address on the PDF (remembered on this computer)
export default function AddressToggle() {
  const [on, setOn] = useState(showCompanyAddress())
  return (
    <label className="addr-opt addr-inline">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked)
          setShowCompanyAddress(e.target.checked)
        }}
      />
      Show my company address on the PDF
    </label>
  )
}
