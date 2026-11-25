// Small reusable pieces used by every page

import { STATUS_COLORS } from '../data/constants'

export function StatusBadge({ status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || ''}`}>
      {status}
    </span>
  )
}

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        className={`my-8 w-full rounded-xl bg-white shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// A label + input. Pass "options" to get a dropdown instead of a text box.
export function Field({ label, value, onChange, options, type = 'text', required, placeholder, full }) {
  const box = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {options ? (
        <select className={box} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )
          })}
        </select>
      ) : type === 'textarea' ? (
        <textarea className={box} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          className={box}
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}

export const btn = {
  primary: 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700',
  secondary: 'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50',
  danger: 'rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700',
}
