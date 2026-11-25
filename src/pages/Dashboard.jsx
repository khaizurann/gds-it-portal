// Dashboard: quick overview of all assets and loans

import { Link } from 'react-router'
import { useData } from '../data/DataContext'
import { STATUSES, STATUS_COLORS, isOverdue, shortDate } from '../data/constants'
import { StatusBadge } from '../components/ui'
import AskBox from '../components/AskBox'

// Count items in a list by a field, e.g. countBy(assets, 'status') -> { 'In use': 30, ... }
function countBy(list, field) {
  return list.reduce((acc, item) => {
    const key = item[field] || 'Not set'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function BarList({ title, counts }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-2">
        {rows.map(([label, n]) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 truncate text-slate-600">{label}</span>
            <div className="h-3 flex-1 rounded bg-slate-100">
              <div className="h-3 rounded bg-blue-500" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right font-medium">{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { assets, staff, loans } = useData()
  const byStatus = countBy(assets, 'status')
  const problems = assets.filter((a) => ['Faulty', 'E-waste'].includes(a.status))
  const overdue = loans.filter(isOverdue)
  const activeStaff = staff.filter((s) => s.active)
  const personName = (id) => staff.find((s) => s.id === id)?.name || '(unknown)'
  const assetTag = (id) => assets.find((a) => a.id === id)?.tag || '(deleted item)'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          {assets.length} assets · {activeStaff.length} active staff (
          {activeStaff.filter((s) => s.type === 'Intern').length} interns)
        </p>
      </div>

      <AskBox />

      {/* One card per status. Click to see those assets. "On loan" goes to the Loans page. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {STATUSES.map((s) => (
          <Link
            key={s}
            to={s === 'On loan' ? '/loans' : `/assets?status=${encodeURIComponent(s)}`}
            className="rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s]}`}>{s}</span>
            <p className="mt-3 text-3xl font-bold">{byStatus[s] || 0}</p>
            {s === 'On loan' && overdue.length > 0 && (
              <p className="text-xs font-medium text-red-600">{overdue.length} overdue</p>
            )}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarList title="By department" counts={countBy(assets, 'department')} />
        <BarList title="By type" counts={countBy(assets, 'type')} />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Needs attention ({problems.length + overdue.length})</h2>
        {problems.length + overdue.length === 0 ? (
          <p className="text-sm text-slate-500">All good. No faulty items or overdue loans.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {overdue.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="py-2 font-mono text-xs">{assetTag(l.assetId)}</td>
                  <td className="py-2">Loan to {personName(l.staffId)}</td>
                  <td className="py-2 text-slate-500">Was due {shortDate(l.returnBy)}</td>
                  <td className="py-2 text-right">
                    <Link to="/loans" className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Overdue</Link>
                  </td>
                </tr>
              ))}
              {problems.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="py-2 font-mono text-xs">{a.tag}</td>
                  <td className="py-2">{a.model}</td>
                  <td className="py-2 text-slate-500">{a.remarks}</td>
                  <td className="py-2 text-right"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
