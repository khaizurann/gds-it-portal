// The "data layer": holds settings, assets, staff and desks, and saves them in the browser.
// Later we only change THIS file to talk to the real API + database. Pages stay the same.

import { createContext, useContext, useEffect, useState } from 'react'
import { sampleAssets, sampleDesks, sampleLoans, sampleSettings, sampleStaff } from './sample'

const STORAGE_KEY = 'it-portal-data-v6'
const DataContext = createContext(null)

const sampleData = () => ({
  settings: sampleSettings,
  assets: sampleAssets,
  staff: sampleStaff,
  desks: sampleDesks,
  loans: sampleLoans,
})

// Empty company: keeps the sample layout so the map isn't blank
const emptyData = () => ({
  settings: { companyName: 'My Company', tagPrefix: 'CO', departments: ['IT', 'Admin', 'Finance', 'HR'] },
  assets: [],
  staff: [],
  desks: sampleDesks,
  loans: [],
})

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // broken or blocked storage: fall back to sample data
  }
  return sampleData()
}

// After loans change, make each asset's status match: an open loan = "On loan".
// When an item comes back, it returns to the status it had before the loan
// (e.g. someone's own laptop goes back to "In use", a spare goes back to "Available").
function syncLoanStatus(assets, loans, assetIds) {
  return assets.map((a) => {
    if (!assetIds.includes(a.id)) return a
    const mine = loans.filter((l) => l.assetId === a.id)
    if (mine.some((l) => !l.returnedDate)) return { ...a, status: 'On loan' }
    if (a.status !== 'On loan') return a
    const latest = [...mine].sort((x, y) => y.takenDate.localeCompare(x.takenDate))[0]
    const before = latest?.prevStatus && latest.prevStatus !== 'On loan' ? latest.prevStatus : 'Available'
    return { ...a, status: before }
  })
}

function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function DataProvider({ children }) {
  const [data, setData] = useState(loadData)

  // Save to the browser every time data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // storage full or blocked: the app still works until refresh
    }
  }, [data])

  // Helper: replace one list (e.g. "assets") with a new version
  const update = (key, fn) => setData((d) => ({ ...d, [key]: fn(d[key]) }))

  // Add a new item, or update it if it already has an id
  const saveItem = (key, prefix, item) =>
    update(key, (list) =>
      item.id ? list.map((x) => (x.id === item.id ? item : x)) : [...list, { ...item, id: newId(prefix) }],
    )

  const actions = {
    // SETTINGS
    saveSettings: (settings) => setData((d) => ({ ...d, settings })),

    // ASSETS
    saveAsset: (asset) => saveItem('assets', 'a', asset),
    deleteAsset: (id) => update('assets', (list) => list.filter((a) => a.id !== id)),
    setAssetStatus: (id, status) =>
      update('assets', (list) => list.map((a) => (a.id === id ? { ...a, status } : a))),

    // STAFF
    saveStaff: (person) => saveItem('staff', 's', person),
    // Deactivate = person left (e.g. intern swap). Their assets become unassigned.
    deactivateStaff: (id) =>
      setData((d) => ({
        ...d,
        staff: d.staff.map((s) => (s.id === id ? { ...s, active: false, deskId: null } : s)),
        assets: d.assets.map((a) =>
          a.staffId === id ? { ...a, staffId: null, status: a.status === 'In use' ? 'Available' : a.status } : a,
        ),
      })),
    reactivateStaff: (id) => update('staff', (list) => list.map((s) => (s.id === id ? { ...s, active: true } : s))),

    // LOANS: item taken home / to site. The asset's status follows the loan.
    createLoan: (loan) =>
      setData((d) => {
        // Remember the item's status before the loan, to restore it on return
        const prevStatus = d.assets.find((a) => a.id === loan.assetId)?.status
        const loans = [...d.loans, { ...loan, id: newId('l'), prevStatus }]
        return { ...d, loans, assets: syncLoanStatus(d.assets, loans, [loan.assetId]) }
      }),
    returnLoan: (loanId, returnedDate) =>
      setData((d) => {
        const loans = d.loans.map((l) => (l.id === loanId ? { ...l, returnedDate } : l))
        const loan = loans.find((l) => l.id === loanId)
        return { ...d, loans, assets: syncLoanStatus(d.assets, loans, [loan.assetId]) }
      }),
    // Edit any loan (also returned ones). Clearing the returned date re-opens it.
    updateLoan: (changed) =>
      setData((d) => {
        const before = d.loans.find((l) => l.id === changed.id)
        // Switched to a different item? Remember that item's status too.
        if (changed.assetId !== before.assetId) {
          changed = { ...changed, prevStatus: d.assets.find((a) => a.id === changed.assetId)?.status }
        }
        const loans = d.loans.map((l) => (l.id === changed.id ? changed : l))
        return { ...d, loans, assets: syncLoanStatus(d.assets, loans, [before.assetId, changed.assetId]) }
      }),
    deleteLoan: (loanId) =>
      setData((d) => {
        const loan = d.loans.find((l) => l.id === loanId)
        const loans = d.loans.filter((l) => l.id !== loanId)
        return { ...d, loans, assets: syncLoanStatus(d.assets, loans, [loan.assetId]) }
      }),

    // DESKS (office map)
    saveDesk: (desk) => saveItem('desks', 'd', desk),
    moveDesk: (id, changes) => update('desks', (list) => list.map((k) => (k.id === id ? { ...k, ...changes } : k))),
    deleteDesk: (id) =>
      setData((d) => ({
        ...d,
        desks: d.desks.filter((k) => k.id !== id),
        assets: d.assets.map((a) => (a.deskId === id ? { ...a, deskId: null } : a)),
        staff: d.staff.map((s) => (s.deskId === id ? { ...s, deskId: null } : s)),
      })),
    seatStaff: (staffId, deskId) =>
      update('staff', (list) => list.map((s) => (s.id === staffId ? { ...s, deskId } : s))),
    placeAsset: (assetId, deskId) =>
      update('assets', (list) => list.map((a) => (a.id === assetId ? { ...a, deskId } : a))),
    // Put desks back to the sample layout. Links to desks that no longer exist are cleared.
    resetLayout: () =>
      setData((d) => {
        const ids = new Set(sampleDesks.map((k) => k.id))
        return {
          ...d,
          desks: sampleDesks,
          assets: d.assets.map((a) => (ids.has(a.deskId) ? a : { ...a, deskId: null })),
          staff: d.staff.map((s) => (ids.has(s.deskId) ? s : { ...s, deskId: null })),
        }
      }),

    // WHOLE DATASET
    loadSample: () => setData(sampleData()),
    startEmpty: () => setData(emptyData()),
    exportData: () => JSON.stringify(data, null, 2),
    importData: (json) => {
      const parsed = JSON.parse(json)
      if (!parsed.assets || !parsed.staff || !parsed.desks) throw new Error('Not a backup file')
      // Older backups used "Desktop" for PCs
      parsed.assets = parsed.assets.map((a) => (a.type === 'Desktop' ? { ...a, type: 'PC' } : a))
      setData({ settings: sampleSettings, loans: [], ...parsed })
    },
  }

  const value = { ...data, departments: data.settings.departments, ...actions }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// Any page calls useData() to read data and use the actions above
export function useData() {
  return useContext(DataContext)
}
