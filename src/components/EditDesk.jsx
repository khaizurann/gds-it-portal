// "Edit desk" popup: rename the desk, seat a person, add or remove items

import { useState } from 'react'
import { useData } from '../data/DataContext'
import { TYPES } from '../data/constants'
import { Modal, StatusBadge, btn } from './ui'
import TypeIcon from './TypeIcon'

export default function EditDesk({ desk, onClose }) {
  const { staff, assets, desks, saveDesk, seatStaff, placeAsset } = useData()
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  const person = staff.find((s) => s.deskId === desk.id && s.active)
  const onDesk = assets.filter((a) => a.deskId === desk.id)
  const deskLabel = (id) => desks.find((d) => d.id === id)?.label

  // Change who sits here: remove the old person, seat the new one
  const changePerson = (newId) => {
    if (person) seatStaff(person.id, null)
    if (newId) seatStaff(newId, desk.id)
  }

  // Items you can add: free ones (no desk), or all if the box is ticked. Grouped by type.
  const q = search.toLowerCase()
  const candidates = assets.filter(
    (a) =>
      a.deskId !== desk.id &&
      (showAll || !a.deskId) &&
      (!q || [a.tag, a.brand, a.model, a.type].join(' ').toLowerCase().includes(q)),
  )
  const groups = TYPES.map((t) => [t, candidates.filter((a) => a.type === t)]).filter(([, list]) => list.length)

  const input = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm'

  return (
    <Modal title={`Edit desk ${desk.label}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-600">
            Desk name
            <input className={input} value={desk.label} onChange={(e) => saveDesk({ ...desk, label: e.target.value })} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Network port
            <input className={input} value={desk.port || ''} placeholder="D12" onChange={(e) => saveDesk({ ...desk, port: e.target.value })} />
          </label>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          Person sitting here
          <select className={input} value={person?.id || ''} onChange={(e) => changePerson(e.target.value)}>
            <option value="">— Empty desk —</option>
            {staff.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.department}){s.deskId && s.deskId !== desk.id ? ` · now at ${deskLabel(s.deskId)}` : ''}
              </option>
            ))}
          </select>
        </label>

        <section>
          <h3 className="mb-1 text-xs font-medium text-slate-600">Items on this desk ({onDesk.length})</h3>
          {onDesk.length === 0 && <p className="text-sm text-slate-400">No items yet. Add some below.</p>}
          {onDesk.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <span className="flex min-w-0 items-center gap-2">
                <TypeIcon type={a.type} />
                <span className="truncate">{a.type} · {a.brand} {a.model}</span>
              </span>
              <button onClick={() => placeAsset(a.id, null)} className="shrink-0 text-xs text-red-600 hover:underline">Remove</button>
            </div>
          ))}
        </section>

        <section className="rounded-lg bg-slate-50 p-3">
          <h3 className="mb-2 text-xs font-medium text-slate-600">Add items</h3>
          <input className={`${input} bg-white`} placeholder="Search tag, brand or model" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Also show items already on other desks
          </label>
          <div className="mt-2 max-h-60 overflow-y-auto">
            {groups.length === 0 && <p className="py-3 text-center text-sm text-slate-400">No free items found.</p>}
            {groups.map(([type, list]) => (
              <div key={type} className="mt-2">
                <p className="text-xs font-semibold uppercase text-slate-400">{type} ({list.length})</p>
                {list.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{a.brand} {a.model}</p>
                      <p className="truncate text-xs text-slate-500">
                        <span className="font-mono">{a.tag}</span>{a.deskId && ` · at ${deskLabel(a.deskId)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={a.status} />
                      <button onClick={() => placeAsset(a.id, desk.id)} className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700">Add</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button onClick={onClose} className={btn.primary}>Done</button>
        </div>
      </div>
    </Modal>
  )
}
