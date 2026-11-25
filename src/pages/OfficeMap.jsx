// Office map: see every desk at a glance, click for details, drag desks in "Edit layout" mode

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useData } from '../data/DataContext'
import { STATUSES, STATUS_DOTS } from '../data/constants'
import { StatusBadge, btn } from '../components/ui'
import TypeIcon from '../components/TypeIcon'
import EditDesk from '../components/EditDesk'

const GRID = 10 // desks snap to a 10px grid
const snap = (n) => Math.round(n / GRID) * GRID

// Colours an area (zone) can have
const ZONE_COLORS = {
  slate: 'border-slate-300 bg-slate-50/70',
  green: 'border-green-300 bg-green-50/80',
  blue: 'border-sky-300 bg-sky-50/80',
  amber: 'border-amber-300 bg-amber-50/80',
  purple: 'border-purple-300 bg-purple-50/80',
}

// When a desk has several items of one type, show the most important status
const PRIORITY = ['E-waste', 'Faulty', 'On loan', 'Available', 'In use']
const worstStatus = (list) => PRIORITY.find((s) => list.some((a) => a.status === s))

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

// Popup shown when you click a desk (normal mode)
function DeskPopup({ desk, onEdit, onClose }) {
  const { staff, assets } = useData()
  const navigate = useNavigate()
  const person = staff.find((s) => s.deskId === desk.id && s.active)
  const items = assets.filter((a) => a.deskId === desk.id)

  return (
    <div className="w-80 rounded-xl bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${person?.type === 'Intern' ? 'bg-purple-100 text-purple-800' : person ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-400'}`}>
            {person ? initials(person.name) : '—'}
          </div>
          <div>
            <p className="flex items-center gap-2 font-semibold">
              {person ? person.name : items.length ? 'No user (shared)' : 'Empty desk'}
              {person?.type === 'Intern' && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">Intern</span>}
            </p>
            <p className="text-xs text-slate-500">
              Desk {desk.label}{desk.port && ` · Port ${desk.port}`}{person && ` · ${person.department}`}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
      </div>

      <div className="mt-3">
        {items.length === 0 && <p className="border-t py-3 text-sm text-slate-400">No items on this desk.</p>}
        {items.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 border-t py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm">
                <TypeIcon type={a.type} /> <span className="truncate">{a.type} · {a.brand} {a.model}</span>
              </p>
              <p className="truncate text-xs text-slate-400">
                {a.tag}{['Faulty', 'E-waste'].includes(a.status) && a.remarks && ` · ${a.remarks}`}
              </p>
            </div>
            <StatusBadge status={a.status} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={onEdit} className={`${btn.secondary} flex-1`}>✎ Edit desk</button>
        {(person || items[0]) && (
          <button
            onClick={() => navigate(`/assets?search=${encodeURIComponent(person ? person.name : items[0].tag)}`)}
            className={`${btn.secondary} flex-1`}
          >
            Open in assets
          </button>
        )}
      </div>
    </div>
  )
}

// Panel shown when you click something in "Edit layout" mode
function LayoutPanel({ item, onClose }) {
  const { saveDesk, deleteDesk } = useData()
  const input = 'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm'
  const remove = () => {
    if (confirm(`Delete ${item.label}? People and items on it will be unlinked.`)) {
      deleteDesk(item.id)
      onClose()
    }
  }
  return (
    <div className="w-72 space-y-3 rounded-xl bg-white p-4">
      <div className="flex justify-between">
        <p className="font-semibold">{item.kind === 'zone' ? 'Area' : 'Desk'} settings</p>
        <button onClick={onClose} className="text-xl leading-none text-slate-400" aria-label="Close">×</button>
      </div>
      <label className="block text-xs text-slate-600">
        Name
        <input className={input} value={item.label} onChange={(e) => saveDesk({ ...item, label: e.target.value })} />
      </label>
      {item.kind === 'desk' ? (
        <label className="block text-xs text-slate-600">
          Network port
          <input className={input} value={item.port || ''} placeholder="D12" onChange={(e) => saveDesk({ ...item, port: e.target.value })} />
        </label>
      ) : (
        <label className="block text-xs text-slate-600">
          Colour
          <select className={input} value={item.color || 'slate'} onChange={(e) => saveDesk({ ...item, color: e.target.value })}>
            {Object.keys(ZONE_COLORS).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      )}
      <button onClick={remove} className="text-sm text-red-600 hover:underline">Delete {item.kind === 'zone' ? 'area' : 'desk'}</button>
    </div>
  )
}

export default function OfficeMap() {
  const { desks, assets, staff, saveDesk, moveDesk, resetLayout } = useData()
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [editDeskId, setEditDeskId] = useState(null)
  const [search, setSearch] = useState('')
  const selected = desks.find((d) => d.id === selectedId)
  const editDesk = desks.find((d) => d.id === editDeskId)

  const personAt = (deskId) => staff.find((s) => s.deskId === deskId && s.active)
  const itemsAt = (deskId) => assets.filter((a) => a.deskId === deskId)

  // Search: does this desk match the name / tag typed?
  const q = search.trim().toLowerCase()
  const matches = (d) => {
    if (!q || d.kind === 'zone') return false
    const words = [d.label, d.port, personAt(d.id)?.name, ...itemsAt(d.id).flatMap((a) => [a.tag, a.model])]
    return words.join(' ').toLowerCase().includes(q)
  }

  // Drag to move (mode "move") or drag the corner to resize (mode "resize")
  const startDrag = (e, item, mode) => {
    if (!editing) return
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (mode === 'move') moveDesk(item.id, { x: Math.max(0, snap(item.x + dx)), y: Math.max(0, snap(item.y + dy)) })
      else moveDesk(item.id, { w: Math.max(60, snap(item.w + dx)), h: Math.max(40, snap(item.h + dy)) })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    setSelectedId(item.id)
  }

  const add = (kind) => {
    const count = desks.filter((d) => d.kind === kind).length + 1
    saveDesk(kind === 'desk'
      ? { kind, label: `Desk ${count}`, port: '', x: 20, y: 20, w: 124, h: 74 }
      : { kind, label: `Area ${count}`, color: 'slate', x: 20, y: 20, w: 300, h: 200 })
  }

  const reset = () => {
    if (confirm('Reset the office map to the sample layout? Your desk positions will be lost.')) {
      resetLayout()
      setSelectedId(null)
    }
  }

  const width = Math.max(960, ...desks.map((d) => d.x + d.w + 30))
  const height = Math.max(600, ...desks.map((d) => d.y + d.h + 30))
  // Areas first, so desks sit on top
  const ordered = [...desks.filter((d) => d.kind === 'zone'), ...desks.filter((d) => d.kind !== 'zone')]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Office Map</h1>
          <p className="text-sm text-slate-500">
            {editing ? 'Drag to move. Drag the blue corner to resize. Click to rename.' : 'Click a desk to see details.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing && (
            <input
              className="w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Search name or tag"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          {editing && (
            <>
              <button onClick={() => add('desk')} className={btn.secondary}>+ Desk</button>
              <button onClick={() => add('zone')} className={btn.secondary}>+ Area</button>
              <button onClick={reset} className={btn.secondary}>↺ Reset layout</button>
            </>
          )}
          <button onClick={() => { setEditing(!editing); setSelectedId(null) }} className={editing ? btn.primary : btn.secondary}>
            {editing ? '✓ Done' : '✎ Edit layout'}
          </button>
        </div>
      </div>

      {/* Legend: what the coloured dots mean */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        {STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOTS[s]}`} /> {s}</span>
        ))}
        <span className="flex items-center gap-1.5 border-l border-slate-300 pl-4">
          <span className="h-3 w-4 rounded-sm border border-purple-300 border-l-4 border-l-purple-500 bg-purple-50" /> Intern desk
        </span>
      </div>

      <div className="overflow-auto rounded-xl bg-white shadow-sm">
        <div
          className="relative"
          style={{
            width, height,
            backgroundImage: editing
              ? 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)'
              : 'none',
            backgroundSize: `${GRID * 2}px ${GRID * 2}px`,
          }}
          onClick={() => setSelectedId(null)}
        >
          {ordered.map((d) => {
            const isSel = d.id === selectedId
            const faded = q && d.kind === 'desk' && !matches(d)
            const style = { left: d.x, top: d.y, width: d.w, height: d.h, touchAction: 'none' }
            const common = {
              onPointerDown: (e) => startDrag(e, d, 'move'),
              onClick: (e) => { e.stopPropagation(); setSelectedId(d.id) },
            }
            const handle = editing && (
              <div onPointerDown={(e) => startDrag(e, d, 'resize')} className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm bg-blue-500" />
            )

            if (d.kind === 'zone') {
              return (
                <div key={d.id} {...common} style={style}
                  className={`absolute select-none rounded-xl border-2 border-dashed ${ZONE_COLORS[d.color] || ZONE_COLORS.slate} ${editing ? 'cursor-move' : ''} ${isSel ? 'ring-2 ring-blue-500' : ''}`}>
                  <span className="absolute left-3 top-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.label}</span>
                  {handle}
                </div>
              )
            }

            const person = personAt(d.id)
            const items = itemsAt(d.id)
            // Group items by type: one icon per type, with a count and a status dot
            const byType = [...new Set(items.map((a) => a.type))].map((t) => {
              const list = items.filter((a) => a.type === t)
              return { type: t, count: list.length, status: worstStatus(list) }
            })

            const intern = person?.type === 'Intern'
            // Interns get a purple card so they stand out from staff
            const look = intern
              ? 'border-purple-300 border-l-4 border-l-purple-500 bg-purple-50'
              : person ? 'border-slate-300 bg-white' : 'border-dashed border-slate-300 bg-white'
            return (
              <div key={d.id} {...common} style={style}
                className={`absolute select-none overflow-hidden rounded-lg border px-2 py-1.5 shadow-sm transition ${
                  editing ? 'cursor-move' : 'cursor-pointer hover:shadow-md'
                } ${look} ${isSel || (q && matches(d)) ? 'ring-2 ring-blue-500' : ''} ${faded ? 'opacity-30' : ''}`}>
                <p className={`truncate text-[11px] ${intern ? 'font-medium text-purple-600' : 'text-slate-400'}`}>
                  {d.label}{intern && ' · Intern'}
                </p>
                <p className={`truncate text-[13px] leading-tight ${intern ? 'font-semibold text-purple-950' : person ? 'font-semibold' : 'text-slate-400'}`}>
                  {person ? person.name : items.length ? 'No user' : 'Empty desk'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500">
                  {byType.map((g) => (
                    <span key={g.type} className="flex items-center gap-0.5 text-[11px]" title={`${g.count} ${g.type} · ${g.status}`}>
                      <TypeIcon type={g.type} className="h-3.5 w-3.5" />
                      {g.count > 1 && g.count}
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[g.status]}`} />
                    </span>
                  ))}
                </div>
                {handle}
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating panel on the right */}
      {selected && (
        <div className="fixed right-6 top-36 z-40 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-xl shadow-2xl ring-1 ring-slate-200">
          {editing ? (
            <LayoutPanel key={selected.id} item={selected} onClose={() => setSelectedId(null)} />
          ) : selected.kind === 'desk' ? (
            <DeskPopup key={selected.id} desk={selected} onEdit={() => setEditDeskId(selected.id)} onClose={() => setSelectedId(null)} />
          ) : null}
        </div>
      )}

      {editDesk && <EditDesk desk={editDesk} onClose={() => setEditDeskId(null)} />}
    </div>
  )
}
