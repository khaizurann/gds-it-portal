// The main layout: sidebar menu on the left, the current page on the right

import { useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router'
import { useData } from './data/DataContext'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Staff from './pages/Staff'
import OfficeMap from './pages/OfficeMap'
import Settings from './pages/Settings'
import Loans from './pages/Loans'

const menu = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/assets', label: 'Assets', icon: '🖥' },
  { to: '/loans', label: 'Loans', icon: '↔' },
  { to: '/staff', label: 'Staff', icon: '👥' },
  { to: '/map', label: 'Office Map', icon: '🗺' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function App() {
  const { settings } = useData()
  const title = `${settings.companyName || 'Company'} IT Portal`

  // Browser tab title follows the company name
  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <aside className="flex w-56 shrink-0 flex-col bg-slate-900 p-4 text-slate-200">
        <div className="mb-6">
          <p className="text-lg font-bold text-white">{title}</p>
          <p className="text-xs text-slate-400">Asset management</p>
        </div>
        <nav className="flex-1 space-y-1">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <span>{m.icon}</span> {m.label}
            </NavLink>
          ))}
        </nav>
        <p className="text-xs text-slate-500">Demo · data saved in this browser</p>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/map" element={<OfficeMap />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
