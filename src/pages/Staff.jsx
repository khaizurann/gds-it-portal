// Staff list: add, edit, deactivate (e.g. when an intern leaves)

import { useState } from 'react'
import { useData } from '../data/DataContext'
import { Field, Modal, btn } from '../components/ui'

function StaffForm({ person, onClose }) {
  const { departments, desks, saveStaff } = useData()
  const [form, setForm] = useState(person || { name: '', type: 'Staff', department: '', deskId: null, active: true })
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    saveStaff({ ...form, name: form.name.trim() })
    onClose()
  }

  return (
    <Modal title={person ? `Edit ${person.name}` : 'Add staff'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" value={form.name} onChange={set('name')} required />
        <Field label="Type" value={form.type} onChange={set('type')} options={['Staff', 'Intern']} />
        <Field label="Department" value={form.department} onChange={set('department')} options={['', ...departments]} />
        <Field
          label="Desk"
          value={form.deskId}
          onChange={(v) => set('deskId')(v || null)}
          options={[{ value: '', label: '— No desk —' }, ...desks.filter((d) => d.kind === 'desk').map((d) => ({ value: d.id, label: d.label }))]}
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="submit" className={btn.primary}>Save</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Staff() {
  const { staff, assets, desks, deactivateStaff, reactivateStaff } = useData()
  const [showInactive, setShowInactive] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [editing, setEditing] = useState(null)

  const shown = staff.filter((s) => (showInactive || s.active) && (!typeFilter || s.type === typeFilter))
  const assetCount = (id) => assets.filter((a) => a.staffId === id).length
  const deskLabel = (id) => desks.find((d) => d.id === id)?.label || '—'

  const deactivate = (s) => {
    const n = assetCount(s.id)
    if (confirm(`Deactivate ${s.name}? ${n} asset(s) will become unassigned.`)) deactivateStaff(s.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-slate-500">{staff.filter((s) => s.active).length} active</p>
        </div>
        <button onClick={() => setEditing('new')} className={btn.primary}>+ Add staff</button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Staff + Interns</option>
          <option>Staff</option>
          <option>Intern</option>
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Desk</th>
              <th className="px-4 py-3">Assets</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.id} className={`border-t ${s.active ? '' : 'text-slate-400'}`}>
                <td className="px-4 py-2 font-medium">
                  {s.name} {!s.active && <span className="ml-1 text-xs">(inactive)</span>}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s.type === 'Intern' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100'}`}>
                    {s.type}
                  </span>
                </td>
                <td className="px-4 py-2">{s.department}</td>
                <td className="px-4 py-2">{deskLabel(s.deskId)}</td>
                <td className="px-4 py-2">{assetCount(s.id)}</td>
                <td className="space-x-3 px-4 py-2 text-right">
                  <button onClick={() => setEditing(s)} className="text-blue-600 hover:underline">Edit</button>
                  {s.active ? (
                    <button onClick={() => deactivate(s)} className="text-red-600 hover:underline">Deactivate</button>
                  ) : (
                    <button onClick={() => reactivateStaff(s.id)} className="text-green-600 hover:underline">Reactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <StaffForm person={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
