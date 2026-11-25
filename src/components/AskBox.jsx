// "Ask about your assets" box on the Dashboard.
// Tries the real AI first (/api/ask on Cloudflare). If that fails, uses quick answers.

import { useState } from 'react'
import { useData } from '../data/DataContext'
import { QUICK_HELP, buildContext, quickAnswer } from '../data/assistant'

const SUGGESTIONS = [
  'How many laptops are available?',
  "What's overdue?",
  'Faulty items in Engineering',
  'Which interns have no PC?',
  'What does Farah use?',
]

async function askAI(question, data) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, company: data.settings.companyName, context: buildContext(data) }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.answer || null
  } catch {
    return null // offline, running locally, or AI limit reached
  } finally {
    clearTimeout(timer)
  }
}

// Shows "- " lines as a list, other lines as text
function AnswerText({ text }) {
  return (
    <div className="space-y-1 text-sm">
      {text.split('\n').filter((l) => l.trim()).map((line, i) =>
        /^\s*[-•*]\s+/.test(line) ? (
          <p key={i} className="pl-3 text-slate-600">• {line.replace(/^\s*[-•*]\s+/, '').replace(/\*\*/g, '')}</p>
        ) : (
          <p key={i}>{line.replace(/\*\*/g, '')}</p>
        ),
      )}
    </div>
  )
}

export default function AskBox() {
  const data = useData()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null) // { text, source }
  const [loading, setLoading] = useState(false)

  const ask = async (q = question) => {
    const text = q.trim()
    if (!text || loading) return
    setQuestion(text)
    setLoading(true)
    setAnswer(null)
    const ai = await askAI(text, data)
    if (ai) setAnswer({ text: ai, source: 'ai' })
    else setAnswer({ text: quickAnswer(text, data) || QUICK_HELP, source: 'quick' })
    setLoading(false)
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <span className="text-purple-600">✦</span> Ask about your assets
      </h2>
      <form onSubmit={(e) => { e.preventDefault(); ask() }} className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="e.g. How many laptops are available?"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60" disabled={loading}>
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-700">
            {s}
          </button>
        ))}
      </div>

      {answer && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <AnswerText text={answer.text} />
          <p className="mt-3 text-xs text-slate-400">
            {answer.source === 'ai' ? '✦ Answered by AI (Cloudflare Workers AI) · check important details' : 'Quick answer (AI not available here)'}
          </p>
        </div>
      )}
    </div>
  )
}
