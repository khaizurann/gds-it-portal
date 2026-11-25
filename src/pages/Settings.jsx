// Settings: company name, departments, and data tools (backup, sample, start empty)

import { useRef, useState } from 'react'
import { useData } from '../data/DataContext'
import { btn } from '../components/ui'

export default function Settings() {
  const { settings, saveSettings, assets, staff, exportData, importData, loadSample, startEmpty } = useData()
  const [newDept, setNewDept] = useState('')
  const fileInput = useRef(null)

  const setName = (companyName) => saveSettings({ ...settings, companyName })

  const addDept = (e) => {
    e.preventDefault()
    const name = newDept.trim()
    if (!name || settings.departments.includes(name)) return
    saveSettings({ ...settings, departments: [...settings.departments, name] })
    setNewDept('')
  }

  const removeDept = (name) => {
    const used = assets.some((a) => a.department === name) || staff.some((s) => s.department === name)
    if (used && !confirm(`"${name}" is still used by some assets or staff. Remove it from the list anyway?`)) return
    saveSettings({ ...settings, departments: settings.departments.filter((d) => d !== name) })
  }

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `it-portal-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
  }

  const upload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      importData(await file.text())
      alert('Backup imported.')
    } catch {
      alert('That file is not a valid backup.')
    }
    e.target.value = ''
  }

  const card = 'rounded-xl bg-white p-5 shadow-sm'

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Company</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Company name</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={settings.companyName}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">Shown in the sidebar as "{settings.companyName || 'Company'} IT Portal".</p>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Asset tag prefix</span>
          <input
            className="w-40 rounded-md border border-slate-300 px-3 py-2 uppercase"
            value={settings.tagPrefix || ''}
            maxLength={5}
            onChange={(e) => saveSettings({ ...settings, tagPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          New assets get tags like {settings.tagPrefix || 'CO'}-PC-001 (PC), {settings.tagPrefix || 'CO'}-LT-001 (laptop), {settings.tagPrefix || 'CO'}-MN-001 (monitor).
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Departments</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {settings.departments.map((d) => (
            <span key={d} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm">
              {d}
              <button onClick={() => removeDept(d)} className="text-slate-400 hover:text-red-600" title="Remove">×</button>
            </span>
          ))}
        </div>
        <form onSubmit={addDept} className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="New department, e.g. 07-Finance"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
          />
          <button className={btn.primary}>Add</button>
        </form>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold">Data</h2>
        <p className="mb-4 text-sm text-slate-500">
          Data is saved in this browser only. Use Export / Import to move it to another computer.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={download} className={btn.secondary}>⬇ Export backup</button>
          <button onClick={() => fileInput.current.click()} className={btn.secondary}>⬆ Import backup</button>
          <input ref={fileInput} type="file" accept=".json" className="hidden" onChange={upload} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <button
            onClick={() => confirm('Replace everything with the sample company data?') && loadSample()}
            className={btn.secondary}
          >
            Load sample data
          </button>
          <button
            onClick={() => confirm('Delete all assets and staff and start with an empty company? Export a backup first if you need it.') && startEmpty()}
            className={btn.danger}
          >
            Start empty
          </button>
        </div>
      </section>
    </div>
  )
}
