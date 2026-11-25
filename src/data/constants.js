// Fixed lists used across the app

export const STATUSES = ['Available', 'In use', 'On loan', 'Faulty', 'E-waste']

export const TYPES = ['PC', 'Laptop', 'Monitor', 'Server', 'Printer', 'Phone', 'Other']

// Short codes used in asset tags: TSL-PC-001, TSL-LT-002 ...
export const TYPE_CODES = { PC: 'PC', Laptop: 'LT', Monitor: 'MN', Server: 'SV', Printer: 'PR', Phone: 'PH', Other: 'OT' }

// Next free tags for a type, e.g. nextTags('TSL', 'Monitor', assets, 2) -> ['TSL-MN-035', 'TSL-MN-036']
export function nextTags(prefix, type, assets, count = 1) {
  const start = `${prefix}-${TYPE_CODES[type] || 'OT'}-`
  const used = assets.filter((a) => a.tag.startsWith(start)).map((a) => parseInt(a.tag.slice(start.length), 10) || 0)
  const first = Math.max(0, ...used) + 1
  return Array.from({ length: count }, (_, i) => start + String(first + i).padStart(3, '0'))
}

// Next free tag for a type, e.g. nextTag('TSL', 'Laptop', assets) -> 'TSL-LT-015'
export const nextTag = (prefix, type, assets) => nextTags(prefix, type, assets, 1)[0]

// Tailwind colours for each status (badges)
export const STATUS_COLORS = {
  Available: 'bg-green-100 text-green-800',
  'In use': 'bg-blue-100 text-blue-800',
  'On loan': 'bg-purple-100 text-purple-800',
  Faulty: 'bg-amber-100 text-amber-800',
  'E-waste': 'bg-red-100 text-red-800',
}

// Small coloured dots used on the office map
export const STATUS_DOTS = {
  Available: 'bg-green-500',
  'In use': 'bg-blue-500',
  'On loan': 'bg-purple-500',
  Faulty: 'bg-amber-500',
  'E-waste': 'bg-red-500',
}

// Today's date as YYYY-MM-DD
export const today = () => new Date().toISOString().slice(0, 10)

// A loan is overdue if it is not returned and the return date has passed
export const isOverdue = (loan) => !loan.returnedDate && loan.returnBy && loan.returnBy < today()

// "2026-11-25" -> "25 Nov"
export const shortDate = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
