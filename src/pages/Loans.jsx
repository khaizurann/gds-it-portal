// Loans: who took which item home / to site, and when it should come back

import { useState } from 'react'
import { useData } from '../data/DataContext'
import { isOverdue, shortDate, today } from '../data/constants'
import { Field, Modal, btn } from '../components/ui'

// Item dropdown grouped as: the person's own items, available items, everything else
function ItemSelect({ value, onChange, choices, staffId }) {
  const { staff } = useData()
  const who = staff.find((s) => s.id === staffId)
  const groups = [
    [who ? `${who.name}'s own items` : 'Own items', choices.filter((a) => staffId && a.staffId === staffId)],
    ['Available', choices.filter((a) => a.staffId !== staffId && a.status === 'Available')],
    ['Other items', choices.filter((a) => a.staffId !== staffId && a.status !== 'Available')],
  ].filter(([, list]) => list.length)
  const label = (a) => `${a.tag} · ${a.type} · ${a.brand} ${a.model}`

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">Item <span className="text-red-500">*</span></span>
      <select
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Choose an item —</option>
        {groups.map(([name, list]) => (
          <optgroup key={name} label={name}>
            {list.map((a) => <option key={a.id} value={a.id}>{label(a)}</option>)}
          </optgroup>
        ))}
      </select>
      <span className="mt-1 block text-xs text-slate-500">When returned, the item goes back to its previous status.</span>
    </label>
  )
}

// Form for a new loan, or editing an existing one (pass "loan")
function LoanForm({ loan, onClose }) {
  const { staff, assets, createLoan, updateLoan, deleteLoan } = useData()
  // Any item can be taken out, except ones already on loan or thrown away (E-waste)
  const choices = assets.filter((a) => !['On loan', 'E-waste'].includes(a.status) || a.id === loan?.assetId)
  const [form, setForm] = useState(
    loan || { staffId: '', assetId: '', takenDate: today(), returnBy: '', purpose: '', returnedDate: null },
  )
  const [error, setError] = useState('')
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.staffId || !form.assetId) return setError('Choose who is taking it and which item.')
    if (form.returnBy && form.returnBy < form.takenDate) return setError('Return date cannot be before the date taken.')
    if (form.returnedDate && form.returnedDate < form.takenDate) return setError('Returned date cannot be before the date taken.')
    const clean = { ...form, returnedDate: form.returnedDate || null }
    if (loan) updateLoan(clean)
    else createLoan(clean)
    onClose()
  }

  const remove = () => {
    if (confirm('Delete this loan record? This cannot be undone.')) {
      deleteLoan(loan.id)
      onClose()
    }
  }

  return (
    <Modal title={loan ? 'Edit loan' : 'New loan'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Who is taking it" required value={form.staffId} onChange={set('staffId')}
          options={[{ value: '', label: '— Choose a person —' },
            ...staff.filter((s) => s.active || s.id === form.staffId).map((s) => ({ value: s.id, label: `${s.name} (${s.department})` }))]}
        />
        <ItemSelect value={form.assetId} onChange={set('assetId')} choices={choices} staffId={form.staffId} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date taken" type="date" value={form.takenDate} onChange={set('takenDate')} />
          <Field label="Return by (optional)" type="date" value={form.returnBy} onChange={set('returnBy')} />
        </div>
        <Field label="Purpose / where (optional)" value={form.purpose} onChange={set('purpose')} placeholder="Site: Kuantan" />
        {loan && (
          <div>
            <Field label="Returned on (clear it if not returned yet)" type="date" value={form.returnedDate || ''} onChange={set('returnedDate')} />
            {form.returnedDate && (
              <button type="button" onClick={() => set('returnedDate')(null)} className="mt-1 text-xs text-blue-600 hover:underline">
                Not returned yet
              </button>
            )}
          </div>
        )}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center justify-between pt-2">
          {loan ? <button type="button" onClick={remove} className="text-sm text-red-600 hover:underline">Delete loan</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
            <button type="submit" className={btn.primary}>{loan ? 'Save changes' : 'Save loan'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default function Loans() {
  const { loans, assets, staff, returnLoan } = useData()
  const [view, setView] = useState('open') // open | returned | all
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // 'new' or a loan

  const assetOf = (l) => assets.find((a) => a.id === l.assetId) || { tag: '(deleted item)', type: '', brand: '', model: '' }
  const personOf = (l) => staff.find((s) => s.id === l.staffId) || { name: '(unknown)', department: '' }

  const open = loans.filter((l) => !l.returnedDate)
  const thisMonth = today().slice(0, 7)
  const returnedThisMonth = loans.filter((l) => l.returnedDate?.startsWith(thisMonth)).length

  const q = search.toLowerCase()
  const shown = loans
    .filter((l) => (view === 'open' ? !l.returnedDate : view === 'returned' ? l.returnedDate : true))
    .filter((l) => {
      const a = assetOf(l)
      return !q || [personOf(l).name, a.tag, a.model, l.purpose].join(' ').toLowerCase().includes(q)
    })
    // Overdue first, then newest first
    .sort((x, y) => (isOverdue(y) ? 1 : 0) - (isOverdue(x) ? 1 : 0) || y.takenDate.localeCompare(x.takenDate))

  const markReturned = (l) => {
    if (confirm(`Mark ${assetOf(l).tag} as returned today?`)) returnLoan(l.id, today())
  }

  const card = 'rounded-xl bg-white p-4 shadow-sm'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loans</h1>
          <p className="text-sm text-slate-500">Items taken home or to site</p>
        </div>
        <button onClick={() => setEditing('new')} className={btn.primary}>+ New loan</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={card}><p className="text-sm text-slate-500">On loan now</p><p className="text-3xl font-bold">{open.length}</p></div>
        <div className={card}><p className="text-sm text-slate-500">Overdue</p><p className="text-3xl font-bold text-red-600">{open.filter(isOverdue).length}</p></div>
        <div className={card}><p className="text-sm text-slate-500">Returned this month</p><p className="text-3xl font-bold">{returnedThisMonth}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-60 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="Search name, tag, purpose…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={view} onChange={(e) => setView(e.target.value)}>
          <option value="open">On loan now</option>
          <option value="returned">Returned</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Taken</th>
              <th className="px-4 py-3">Return by</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => {
              const a = assetOf(l)
              const p = personOf(l)
              const late = isOverdue(l)
              return (
                <tr key={l.id} className={`border-t ${late ? 'bg-red-50/50' : ''}`}>
                  <td className="px-4 py-2">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.department}</p>
                  </td>
                  <td className="px-4 py-2">
                    <p>{a.type} · {a.brand} {a.model}</p>
                    <p className="text-xs text-slate-500"><span className="font-mono">{a.tag}</span>{l.purpose && ` · ${l.purpose}`}</p>
                  </td>
                  <td className="px-4 py-2">{shortDate(l.takenDate)}</td>
                  <td className="px-4 py-2">
                    {l.returnBy ? (
                      late ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{shortDate(l.returnBy)} · overdue</span>
                      ) : shortDate(l.returnBy)
                    ) : <span className="text-slate-400">Not set</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {l.returnedDate ? (
                      <span className="text-xs text-green-700">Returned {shortDate(l.returnedDate)}</span>
                    ) : (
                      <button onClick={() => markReturned(l)} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:bg-slate-50">Mark returned</button>
                    )}
                    <button onClick={() => setEditing(l)} className="ml-3 text-xs font-medium text-blue-600 hover:underline">Edit</button>
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No loans here.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && <LoanForm loan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
