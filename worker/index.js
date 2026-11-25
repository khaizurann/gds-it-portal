// BACKEND (Cloudflare Worker)
// 1. /api/ask  -> sends the question + asset data to a Workers AI model and returns the answer
// 2. anything else -> serves the React website (the built files in /dist)

// Llama 3.3 70B: good at reading lists and counting. Change here to try another model.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/ask') return ask(request, env)
    return env.ASSETS.fetch(request)
  },
}

async function ask(request, env) {
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }

  // Limit sizes so nobody can send huge requests and use up the free AI allowance
  const question = String(body.question || '').trim().slice(0, 500)
  const context = String(body.context || '').slice(0, 40000)
  const company = String(body.company || 'the company').slice(0, 60)
  if (!question) return json({ error: 'Empty question' }, 400)

  const system = [
    `You are the IT asset assistant for ${company}. Today is ${new Date().toISOString().slice(0, 10)}.`,
    'Answer ONLY from the DATA below. If the data does not contain the answer, say you do not know.',
    'For "how many" questions, use the SUMMARY counts. Use exact asset tags, names and desk labels from the data.',
    'Keep it short: one sentence first, then at most 8 lines that each start with "- ". Plain text only, no tables, no markdown headings.',
  ].join('\n')

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: `${system}\n\nDATA:\n${context}` },
        { role: 'user', content: question },
      ],
      max_tokens: 500,
    })
    // Different models return the text in different places
    const answer = result?.response ?? result?.choices?.[0]?.message?.content ?? ''
    if (!String(answer).trim()) throw new Error('Empty answer')
    return json({ answer: String(answer).trim(), model: MODEL })
  } catch (err) {
    // e.g. free daily limit reached. The website then uses its built-in quick answers.
    return json({ error: 'AI unavailable', detail: String(err?.message || err) }, 503)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
