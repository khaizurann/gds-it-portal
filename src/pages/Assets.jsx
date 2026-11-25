// Asset list: search, filter, add, edit, quick status change

import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useData } from '../data/DataContext'
import { STATUSES, TYPES, STATUS_COLORS } from '../data/constants'
import { Modal, StatusBadge, btn } from '../components/ui'
import AssetForm from '../components/AssetForm'
import TypeIcon from '../components/TypeIcon'

function AssetDetail({ asset, onEdit, onClose }) {
  const { staff, desks, deleteAsset } = useData()
  const person = staff.find((s) => s.id === asset.staffId)
  const desk = desks.find((d) => d.id === asset.deskId)
  const rows = [
    ['Type', asset.type], ['Brand / Model', `${asset.brand} ${asset.model}`], ['Computer name', asset.computerName],
    ['Department', asset.department], ['Assigned to', person?.name], ['Desk', desk?.label], ['Year', asset.year],
    ['CPU', asset.cpu], ['GPU', asset.gpu], ['RAM', asset.ram], ['Storage', asset.storage],
    ['Monitors', asset.monitors], ['OS', asset.os], ['Office', asset.office],
    ['Last servicing', asset.lastService], ['Remarks', asset.remarks],
  ]

  const remove = () => {
    if (confirm(`Delete ${asset.tag}? This cannot be undone.`)) {
      deleteAsset(asset.id)
      onClose()
    }
  }

  return (
    <Modal title={asset.tag} onClose={onClose} wide>
      <div className="mb-4"><StatusBadge status={asset.status} /></div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex justify-between">
        <button onClick={remove} className="text-sm text-red-600 hover:underline">Delete asset</button>
        <button onClick={onEdit} className={btn.primary}>Edit</button>
      </div>
    </Modal>
  )
}

// Which columns to show for each type tab
const SPEC_TYPES = ['PC', 'Laptop', 'Server']

export default function Assets() {
  const { assets, staff, desks, departments, setAssetStatus } = useData()
  const [params, setParams] = useSearchParams()
  // ?search=TSL-PC-001 from the office map pre-fills the search box
  const [search, setSearch] = useState(params.get('search') || '')
  const [dept, setDept] = useState('')
  const [viewing, setViewing] = useState(null) // asset shown in detail popup
  const [editing, setEditing] = useState(null) // asset in edit form, or 'new'

  // Type tab and status filter live in the URL, so other pages can link here (/assets?status=Faulty)
  const type = params.get('type') || ''
  const status = params.get('status') || ''
  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const staffName = (id) => staff.find((s) => s.id === id)?.name || ''
  const deskLabel = (id) => desks.find((d) => d.id === id)?.label || ''

  const q = search.toLowerCase()
  // Everything except the type filter (used for the tab counts)
  const filtered = assets.filter(
    (a) =>
      (!status || a.status === status) &&
      (!dept || a.department === dept) &&
      (!q || [a.tag, a.computerName, a.model, a.brand, a.cpu, staffName(a.staffId), deskLabel(a.deskId)].join(' ').toLowerCase().includes(q)),
  )
  const shown = filtered.filter((a) => !type || a.type === type)
  const showSpecs = SPEC_TYPES.includes(type)

  const select = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'
  const tab = (active) =>
    `flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
      active ? 'border-blue-500 bg-blue-50 font-medium text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    }`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-sm text-slate-500">Showing {shown.length} of {assets.length}</p>
        </div>
        <button onClick={() => setEditing('new')} className={btn.primary}>+ Add asset</button>
      </div>

      {/* Type tabs with counts */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setParam('type', '')} className={tab(!type)}>
          All <span className="font-semibold">{filtered.length}</span>
        </button>
        {TYPES.map((t) => {
          const n = filtered.filter((a) => a.type === t).length
          if (!n && type !== t) return null
          return (
            <button key={t} onClick={() => setParam('type', t)} className={tab(type === t)}>
              <TypeIcon type={t} /> {t} <span className="font-semibold">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className={`${select} min-w-60 flex-1`}
          placeholder="Search tag, model, user, desk…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={select} value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={select} value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Asset tag</th>
              {!type && <th className="px-4 py-3">Type</th>}
              <th className="px-4 py-3">Model</th>
              {showSpecs && <th className="px-4 py-3">CPU</th>}
              {showSpecs && <th className="px-4 py-3">RAM</th>}
              {showSpecs && <th className="px-4 py-3">Storage</th>}
              <th className="px-4 py-3">Used by</th>
              <th className="px-4 py-3">Desk</th>
              {!showSpecs && <th className="px-4 py-3">Department</th>}
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id} onClick={() => setViewing(a)} className="cursor-pointer border-t hover:bg-blue-50">
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{a.tag}</td>
                {!type && (
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-1.5 text-slate-600"><TypeIcon type={a.type} /> {a.type}</span>
                  </td>
                )}
                <td className="px-4 py-2">{a.brand} {a.model}</td>
                {showSpecs && <td className="px-4 py-2 text-slate-600">{a.cpu}</td>}
                {showSpecs && <td className="whitespace-nowrap px-4 py-2 text-slate-600">{a.ram}</td>}
                {showSpecs && <td className="px-4 py-2 text-slate-600">{a.storage}</td>}
                <td className="px-4 py-2">{staffName(a.staffId) || <span className="text-slate-400">—</span>}</td>
                <td className="whitespace-nowrap px-4 py-2">{deskLabel(a.deskId) || <span className="text-slate-400">—</span>}</td>
                {!showSpecs && <td className="px-4 py-2 text-slate-500">{a.department}</td>}
                {/* Quick status change. stopPropagation so the row click doesn't open the popup */}
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={a.status}
                    onChange={(e) => setAssetStatus(a.id, e.target.value)}
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_COLORS[a.status]}`}
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No assets match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <AssetDetail
          asset={assets.find((a) => a.id === viewing.id) || viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(assets.find((a) => a.id === viewing.id)); setViewing(null) }}
        />
      )}
      {editing && <AssetForm asset={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
