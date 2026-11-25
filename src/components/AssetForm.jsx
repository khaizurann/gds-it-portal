// Add / edit an asset.
// New asset: step 1 = pick a type, step 2 = short form with auto-fill.
// Edit asset: goes straight to the form.

import { useState } from 'react'
import { useData } from '../data/DataContext'
import { STATUSES, TYPES, nextTag, nextTags } from '../data/constants'
import { Field, Modal, btn } from './ui'
import TypeIcon from './TypeIcon'

const EMPTY = {
  tag: '', computerName: '', type: 'PC', brand: '', model: '', department: '', staffId: null,
  deskId: null, status: 'Available', year: '', cpu: '', gpu: '', ram: '', storage: '', monitors: '',
  office: '', os: '', lastService: '', remarks: '',
}
const COMPUTERS = ['PC', 'Laptop', 'Server']
// Fields copied when you pick an existing model
const SPEC_FIELDS = ['brand', 'model', 'cpu', 'gpu', 'ram', 'storage', 'os', 'office', 'monitors']

// Step 1: big buttons to choose what to add
function TypePicker({ onPick }) {
  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">Step 1 of 2</p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onPick(t)}
            className="flex flex-col items-center gap-2 rounded-lg border border-slate-300 py-4 text-sm hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
          >
            <TypeIcon type={t} className="h-7 w-7" />
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

// Model box that suggests models you already have. Picking one copies its specs.
function ModelInput({ form, setForm }) {
  const { assets } = useData()
  const [open, setOpen] = useState(false)
  const q = form.model.toLowerCase()
  // One suggestion per brand + model of the same type
  const seen = new Set()
  const suggestions = assets
    .filter((a) => a.type === form.type && a.model && `${a.brand} ${a.model}`.toLowerCase().includes(q))
    .filter((a) => {
      const key = `${a.brand}|${a.model}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 5)

  const pick = (a) => {
    setForm((f) => ({ ...f, ...Object.fromEntries(SPEC_FIELDS.map((k) => [k, a[k] || ''])) }))
    setOpen(false)
  }

  return (
    <label className="relative block">
      <span className="mb-1 block text-xs font-medium text-slate-600">Model <span className="text-slate-400">(type to search existing)</span></span>
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        value={form.model}
        placeholder="Precision 5820"
        onChange={(e) => { setForm((f) => ({ ...f, model: e.target.value })); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1 text-xs text-slate-400">Copy from existing</p>
          {suggestions.map((a) => (
            <button
              type="button"
              key={a.id}
              onMouseDown={() => pick(a)}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50"
            >
              <span className="font-medium">{a.brand} {a.model}</span>
              {(a.cpu || a.ram) && <span className="block text-xs text-slate-500">{[a.cpu, a.ram, a.storage].filter(Boolean).join(' · ')}</span>}
            </button>
          ))}
        </div>
      )}
    </label>
  )
}

export default function AssetForm({ asset, onClose }) {
  const { assets, staff, desks, departments, settings, saveAsset } = useData()
  const prefix = settings.tagPrefix || 'CO'
  const isNew = !asset
  const [step, setStep] = useState(isNew ? 'pick' : 'form')
  const [form, setForm] = useState(asset || EMPTY)
  const [monitorCount, setMonitorCount] = useState(0)
  const [monitorModel, setMonitorModel] = useState('')
  const [showMore, setShowMore] = useState(!isNew)
  const [error, setError] = useState('')

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const isComputer = COMPUTERS.includes(form.type)
  const canAddMonitors = isNew && (form.type === 'PC' || form.type === 'Laptop')
  const monitorTags = nextTags(prefix, 'Monitor', assets, monitorCount)

  const pickType = (type) => {
    setForm({ ...EMPTY, type, tag: nextTag(prefix, type, assets) })
    setMonitorCount(0)
    setStep('form')
  }

  // Choosing a person fills in their department, desk and status
  const assignTo = (staffId) => {
    const person = staff.find((s) => s.id === staffId)
    setForm((f) => ({
      ...f,
      staffId: staffId || null,
      department: person ? person.department : f.department,
      deskId: person ? person.deskId || f.deskId : f.deskId,
      status: person && f.status === 'Available' ? 'In use' : !person && f.status === 'In use' ? 'Available' : f.status,
    }))
  }

  const submit = (e) => {
    e.preventDefault()
    const tag = form.tag.trim()
    if (!tag) return setError('Asset tag is required.')
    if (assets.some((a) => a.tag.toLowerCase() === tag.toLowerCase() && a.id !== form.id)) {
      return setError(`Asset tag "${tag}" is already used.`)
    }
    // Computers use their tag as the PC name unless one was typed
    const computerName = isComputer && !form.computerName ? tag : form.computerName
    saveAsset({ ...form, tag, computerName, year: form.year ? Number(form.year) : null })

    // Also create the monitors that go with this PC / laptop
    if (canAddMonitors) {
      const [brand, ...rest] = monitorModel.trim().split(' ')
      monitorTags.forEach((mTag) =>
        saveAsset({
          ...EMPTY, type: 'Monitor', tag: mTag, brand: rest.length ? brand : '', model: rest.length ? rest.join(' ') : monitorModel.trim(),
          status: form.status, staffId: form.staffId, deskId: form.deskId, department: form.department, year: form.year ? Number(form.year) : null,
        }),
      )
    }
    onClose()
  }

  const auto = <span className="ml-1 text-[10px] font-normal text-green-600">auto</span>
  const staffOptions = [
    { value: '', label: '— Unassigned —' },
    ...staff.filter((s) => s.active || s.id === form.staffId).map((s) => ({ value: s.id, label: `${s.name} (${s.department})` })),
  ]
  const deskOptions = [
    { value: '', label: '— No desk —' },
    ...desks.filter((d) => d.kind === 'desk').map((d) => ({ value: d.id, label: d.label })),
  ]
  const choice = (active) =>
    `rounded-md border px-3 py-1 text-sm ${active ? 'border-blue-500 bg-blue-50 font-medium text-blue-700' : 'border-slate-300 hover:bg-slate-50'}`

  const title = step === 'pick' ? 'What do you want to add?' : isNew ? `New ${form.type}` : `Edit ${asset.tag}`

  return (
    <Modal title={title} onClose={onClose} wide={step === 'form'}>
      {step === 'pick' ? (
        <TypePicker onPick={pickType} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {isNew && (
            <p className="text-sm text-slate-500">
              Step 2 of 2 ·{' '}
              <button type="button" onClick={() => setStep('pick')} className="text-blue-600 hover:underline">← change type</button>
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Asset tag" value={form.tag} onChange={set('tag')} required placeholder={`${prefix}-PC-001`} />
            <ModelInput form={form} setForm={setForm} />
            <Field label="Brand" value={form.brand} onChange={set('brand')} placeholder="Dell" />
            {!isNew && <Field label="Type" value={form.type} onChange={set('type')} options={TYPES} />}
            <Field label="Assigned to" value={form.staffId} onChange={assignTo} options={staffOptions} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Status {isNew && auto}</span>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(e) => set('status')(e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Department {isNew && auto}</span>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.department} onChange={(e) => set('department')(e.target.value)}>
                {['', ...departments].map((d) => <option key={d} value={d}>{d || '—'}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Desk {isNew && auto}</span>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.deskId || ''} onChange={(e) => set('deskId')(e.target.value || null)}>
                {deskOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>

          {canAddMonitors && (
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm"><TypeIcon type="Monitor" /> Also add monitors on the same desk</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((n) => (
                    <button type="button" key={n} onClick={() => setMonitorCount(n)} className={choice(monitorCount === n)}>{n}</button>
                  ))}
                </div>
              </div>
              {monitorCount > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Monitor model" value={monitorModel} onChange={setMonitorModel} placeholder='Dell P2422H 24"' />
                  <p className="self-end pb-2 text-xs text-slate-600">
                    Will create: <span className="font-mono">{form.tag}</span> + {monitorTags.map((t) => <span key={t} className="font-mono">{t} </span>)}
                  </p>
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={() => setShowMore(!showMore)} className="text-sm font-medium text-blue-600 hover:underline">
            {showMore ? '▴ Hide details' : `▾ More details${isComputer ? ' (CPU, RAM, storage, OS, remarks)' : ' (year, remarks)'}`}
          </button>

          {showMore && (
            <div className="grid gap-3 sm:grid-cols-2">
              {isComputer && <Field label="Computer name" value={form.computerName} onChange={set('computerName')} placeholder="Same as tag" />}
              <Field label="Year acquired" value={form.year} onChange={set('year')} type="number" />
              {isComputer && (
                <>
                  <Field label="CPU / Processor" value={form.cpu} onChange={set('cpu')} />
                  <Field label="GPU / Graphics" value={form.gpu} onChange={set('gpu')} />
                  <Field label="RAM" value={form.ram} onChange={set('ram')} placeholder="16 GB" />
                  <Field label="Storage" value={form.storage} onChange={set('storage')} placeholder="512GB SSD + 1TB HDD" />
                  <Field label="Operating system" value={form.os} onChange={set('os')} options={['', 'Windows', 'Linux', 'Other']} />
                  <Field label="Office version" value={form.office} onChange={set('office')} />
                  <Field label="Monitor sizes" value={form.monitors} onChange={set('monitors')} placeholder='27", 27"' />
                </>
              )}
              <Field label="Last servicing" value={form.lastService} onChange={set('lastService')} type="date" />
              <Field label="Remarks" value={form.remarks} onChange={set('remarks')} type="textarea" full />
            </div>
          )}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
            <button type="submit" className={btn.primary}>
              {canAddMonitors && monitorCount > 0 ? `Save ${monitorCount + 1} items` : 'Save'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
