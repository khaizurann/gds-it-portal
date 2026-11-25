// BACKEND (Cloudflare Worker)
// Every request comes here first:
//   /api/login, /api/logout -> sign in / sign out
//   not signed in           -> show the login page
//   /api/ask                -> AI assistant (Workers AI)
//   anything else           -> the React website (built files in /dist)

import { loginPage } from './loginPage.js'

// Llama 3.3 70B: good at reading lists and counting. Change here to try another model.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const COOKIE = 'itp_session'
const SESSION_SECONDS = 7 * 24 * 60 * 60 // stay signed in for 7 days

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/login') return login(request, env)
    if (url.pathname === '/api/logout') return logout()

    if (!(await isSignedIn(request, env))) {
      if (url.pathname.startsWith('/api/')) return json({ error: 'Please sign in' }, 401)
      // Opening a page -> show the login page instead
      const wantsPage = request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html')
      if (wantsPage) return html(loginPage({ showDemoHint: !env.LOGIN_PASSWORD }), 401)
      return new Response('Sign in required', { status: 401 })
    }

    if (url.pathname === '/api/ask') return ask(request, env)
    return env.ASSETS.fetch(request)
  },
}

// ---------- Sign in ----------
// Username and password come from Cloudflare secrets LOGIN_USER / LOGIN_PASSWORD.
// If they are not set, the public demo account is used: demo / demo123
function credentials(env) {
  const user = env.LOGIN_USER || 'demo'
  const password = env.LOGIN_PASSWORD || 'demo123'
  // Secret key used to sign the session cookie (changing the password logs everyone out)
  const secret = env.SESSION_SECRET || `it-portal:${user}:${password}`
  return { user, password, secret }
}

async function login(request, env) {
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }
  const { user, password, secret } = credentials(env)
  // Compare signed versions so the check takes the same time whether it is right or wrong
  const sameUser = (await sign(String(body.username || '').trim().toLowerCase(), secret)) === (await sign(user.toLowerCase(), secret))
  const samePass = (await sign(String(body.password || ''), secret)) === (await sign(password, secret))
  if (!sameUser || !samePass) {
    await new Promise((r) => setTimeout(r, 600)) // slow down password guessing
    return json({ error: 'Wrong username or password' }, 401)
  }

  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const token = `${expires}.${await sign(`${user}.${expires}`, secret)}`
  return json({ ok: true }, 200, {
    'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
  })
}

function logout() {
  return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` })
}

async function isSignedIn(request, env) {
  const cookie = request.headers.get('cookie') || ''
  const token = cookie.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!token) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false
  const { user, secret } = credentials(env)
  return signature === (await sign(`${user}.${expires}`, secret))
}

// HMAC-SHA256 signature (hex). Proves the cookie was made by this server.
async function sign(text, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------- AI assistant ----------
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
    'For "how many" questions, use the counts at the top of the data. Use exact asset tags, names and desk labels.',
    'Be brief: one short sentence, then at most 4 lines starting with "- " only if listing items helps.',
    'Never repeat yourself, never mention the words SUMMARY or DATA, no markdown headings or tables.',
  ].join('\n')

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: `${system}\n\nDATA:\n${context}` },
        { role: 'user', content: question },
      ],
      max_tokens: 300,
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

// ---------- Helpers ----------
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
