// The "brain" of the Ask box.
// 1. buildContext(): turns our data into short text the AI can read
// 2. quickAnswer(): answers common questions without AI (used when the AI is not available)

import { STATUSES, TYPES, isOverdue, shortDate } from './constants'

// ---------- 1. Data for the AI ----------
export function buildContext({ assets, staff, desks, loans }) {
  const person = (id) => staff.find((s) => s.id === id)
  const desk = (id) => desks.find((d) => d.id === id)?.label || '-'
  const lines = []

  lines.push(`SUMMARY: ${assets.length} assets, ${staff.filter((s) => s.active).length} active staff.`)
  for (const t of TYPES) {
    const list = assets.filter((a) => a.type === t)
    if (!list.length) continue
    const parts = STATUSES.map((s) => [s, list.filter((a) => a.status === s).length]).filter(([, n]) => n)
    lines.push(`${t}: ${list.length} total (${parts.map(([s, n]) => `${s} ${n}`).join(', ')})`)
  }

  lines.push('', 'ASSETS (tag | type | brand model | status | used by | desk | department | remarks):')
  for (const a of assets) {
    lines.push([a.tag, a.type, `${a.brand} ${a.model}`.trim(), a.status, person(a.staffId)?.name || '-', desk(a.deskId), a.department || '-', a.remarks || ''].join(' | '))
  }

  lines.push('', 'STAFF (name | Staff/Intern | department | desk | active):')
  for (const s of staff) lines.push([s.name, s.type, s.department, desk(s.deskId), s.active ? 'active' : 'left'].join(' | '))

  lines.push('', 'OPEN LOANS (tag | borrower | taken | return by | overdue):')
  for (const l of loans.filter((x) => !x.returnedDate)) {
    const a = assets.find((x) => x.id === l.assetId)
    lines.push([a?.tag, person(l.staffId)?.name, l.takenDate, l.returnBy || 'not set', isOverdue(l) ? 'OVERDUE' : 'no'].join(' | '))
  }

  const empty = desks.filter((d) => d.kind === 'desk' && !staff.some((s) => s.active && s.deskId === d.id) && !assets.some((a) => a.deskId === d.id))
  lines.push('', `EMPTY DESKS (nobody seated, no items): ${empty.map((d) => d.label).join(', ') || 'none'}`)
  return lines.join('\n')
}

// ---------- 2. Quick answers (no AI) ----------
const TYPE_WORDS = {
  PC: ['pc', 'pcs', 'desktop', 'desktops', 'computer', 'computers'],
  Laptop: ['laptop', 'laptops', 'notebook', 'notebooks'],
  Monitor: ['monitor', 'monitors', 'screen', 'screens'],
  Server: ['server', 'servers', 'nas'],
  Printer: ['printer', 'printers'],
  Phone: ['phone', 'phones', 'mobile'],
  Other: ['projector', 'projectors', 'switch'],
}
const STATUS_WORDS = {
  Available: ['available', 'free', 'spare', 'unused'],
  'In use': ['in use', 'used'],
  'On loan': ['on loan', 'loaned', 'borrowed'],
  Faulty: ['faulty', 'broken', 'problem', 'problems', 'issue', 'issues', 'damaged', 'repair'],
  'E-waste': ['e-waste', 'ewaste', 'dispose', 'scrap'],
}

// Whole-word match, so "items" doesn't count as "IT"
const hasWord = (q, w) => new RegExp(`\\b${w.toLowerCase().replace(/[-/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&')}\\b`).test(q)

export function quickAnswer(question, { assets, staff, desks, loans, departments }) {
  const q = question.toLowerCase()
  const person = (id) => staff.find((s) => s.id === id)
  const deskLabel = (id) => desks.find((d) => d.id === id)?.label
  const describe = (a) => `- ${a.tag} · ${a.brand} ${a.model} · ${a.status}${person(a.staffId) ? ` · ${person(a.staffId).name}` : ''}${deskLabel(a.deskId) ? ` · ${deskLabel(a.deskId)}` : ''}`
  const listOf = (items, max = 8) => items.slice(0, max).join('\n') + (items.length > max ? `\n- …and ${items.length - max} more` : '')

  // A specific tag, e.g. "who has TSL-LT-018?"
  const tagMatch = q.match(/\b[a-z0-9]{2,5}-[a-z]{2}-\d{3}\b/)
  if (tagMatch) {
    const a = assets.find((x) => x.tag.toLowerCase() === tagMatch[0])
    if (!a) return `I couldn't find ${tagMatch[0].toUpperCase()}.`
    const loan = loans.find((l) => l.assetId === a.id && !l.returnedDate)
    return `${a.tag} is a ${a.type} (${a.brand} ${a.model}), status ${a.status}.` +
      `\n- Used by: ${person(a.staffId)?.name || 'nobody'}\n- Desk: ${deskLabel(a.deskId) || 'none'}` +
      (loan ? `\n- On loan to ${person(loan.staffId)?.name} since ${shortDate(loan.takenDate)}${loan.returnBy ? `, return by ${shortDate(loan.returnBy)}` : ''}${isOverdue(loan) ? ' (OVERDUE)' : ''}` : '')
  }

  // Overdue / loans
  if (q.includes('overdue') || q.includes('late')) {
    const late = loans.filter(isOverdue)
    if (!late.length) return 'No overdue loans. 👍'
    return `${late.length} overdue loan${late.length > 1 ? 's' : ''}:\n` + listOf(late.map((l) => {
      const a = assets.find((x) => x.id === l.assetId)
      return `- ${a?.tag} · ${person(l.staffId)?.name} · was due ${shortDate(l.returnBy)}`
    }))
  }
  if (q.includes('loan') || q.includes('borrow')) {
    const open = loans.filter((l) => !l.returnedDate)
    return `${open.length} item${open.length === 1 ? ' is' : 's are'} on loan:\n` + listOf(open.map((l) => {
      const a = assets.find((x) => x.id === l.assetId)
      return `- ${a?.tag} · ${person(l.staffId)?.name}${l.purpose ? ` · ${l.purpose}` : ''}${isOverdue(l) ? ' · OVERDUE' : ''}`
    }))
  }

  // Empty desks
  if (q.includes('empty desk') || q.includes('free desk') || (q.includes('desk') && (q.includes('empty') || q.includes('nobody')))) {
    // Empty = nobody seated and nothing on it
    const empty = desks.filter((d) => d.kind === 'desk' && !staff.some((s) => s.active && s.deskId === d.id) && !assets.some((a) => a.deskId === d.id))
    return empty.length ? `${empty.length} empty desks: ${empty.map((d) => d.label).join(', ')}.` : 'There are no empty desks.'
  }

  // Interns
  if (q.includes('intern')) {
    const interns = staff.filter((s) => s.active && s.type === 'Intern')
    if (q.includes('no ') || q.includes('without')) {
      const noPc = interns.filter((s) => !assets.some((a) => a.staffId === s.id && ['PC', 'Laptop'].includes(a.type)))
      return noPc.length ? `${noPc.length} intern(s) without a PC or laptop:\n` + listOf(noPc.map((s) => `- ${s.name} · ${s.department}`)) : 'Every intern has a PC or laptop.'
    }
    return `${interns.length} active interns:\n` + listOf(interns.map((s) => `- ${s.name} · ${s.department} · ${deskLabel(s.deskId) || 'no desk'}`))
  }

  // A person's name, e.g. "what does Farah use?"
  const who = staff.find((s) => s.name.toLowerCase().split(' ').some((part) => part.length > 2 && hasWord(q, part)))
  if (who) {
    const items = assets.filter((a) => a.staffId === who.id)
    return `${who.name} (${who.type}, ${who.department}) sits at ${deskLabel(who.deskId) || 'no desk'} and has ${items.length} item${items.length === 1 ? '' : 's'}:\n` + listOf(items.map(describe))
  }

  // Type / status / department filters, e.g. "how many laptops are available?"
  const type = Object.keys(TYPE_WORDS).find((t) => TYPE_WORDS[t].some((w) => hasWord(q, w)))
  const status = Object.keys(STATUS_WORDS).find((s) => STATUS_WORDS[s].some((w) => q.includes(w)))
  const dept = departments.find((d) => hasWord(q, d))
  if (type || status || dept) {
    const found = assets.filter((a) => (!type || a.type === type) && (!status || a.status === status) && (!dept || a.department === dept))
    const noun = (n) => (type ? (n === 1 ? type.toLowerCase() : `${type === 'PC' ? 'PC' : type.toLowerCase()}s`) : n === 1 ? 'item' : 'items')
    const what = (n) => [status?.toLowerCase(), noun(n), dept && `in ${dept}`].filter(Boolean).join(' ')
    if (!found.length) return `There are no ${what(0)}.`
    return `There ${found.length === 1 ? 'is' : 'are'} ${found.length} ${what(found.length)}:\n` + listOf(found.map(describe))
  }

  return null
}

export const QUICK_HELP =
  "I couldn't understand that one. Try asking:\n- How many laptops are available?\n- Who has TSL-LT-018?\n- What's overdue?\n- Faulty items in Engineering\n- Which interns have no PC?\n- What does Farah use?"
