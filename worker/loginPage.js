// The sign-in page (plain HTML + CSS), shown by the Worker before the website.

export function loginPage({ showDemoHint }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sign in · IT Portal</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f1f5f9; color: #1e293b; }
  .side { flex: 1; background: #0f172a; color: #e2e8f0; padding: 48px; display: flex; flex-direction: column; justify-content: space-between; }
  .side h1 { font-size: 28px; margin: 0 0 8px; color: #fff; }
  .side p { color: #94a3b8; margin: 0; line-height: 1.6; max-width: 360px; }
  .side ul { list-style: none; padding: 0; margin: 32px 0 0; color: #cbd5e1; line-height: 2.1; }
  .side li::before { content: "✓  "; color: #60a5fa; }
  .main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
  form { width: 100%; max-width: 360px; background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, .08); }
  h2 { margin: 0 0 4px; font-size: 22px; }
  .sub { margin: 0 0 24px; color: #64748b; font-size: 14px; }
  label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
  input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; margin-bottom: 16px; }
  input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, .15); }
  button { width: 100%; padding: 11px; border: 0; border-radius: 8px; background: #2563eb; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  button:disabled { opacity: .6; cursor: wait; }
  .error { display: none; background: #fef2f2; color: #b91c1c; padding: 10px 12px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
  .hint { margin-top: 20px; padding: 12px; border-radius: 8px; background: #eff6ff; color: #1e40af; font-size: 13px; line-height: 1.6; }
  .hint b { font-family: ui-monospace, monospace; }
  @media (max-width: 800px) { .side { display: none; } }
</style>
</head>
<body>
  <div class="side">
    <div>
      <h1>IT Portal</h1>
      <p>Track every PC, laptop and monitor in the office: who uses it, where it sits, and what's on loan.</p>
      <ul>
        <li>Asset list with status</li>
        <li>Drag-and-drop office map</li>
        <li>Loans and overdue alerts</li>
        <li>AI assistant for quick questions</li>
      </ul>
    </div>
    <p style="font-size:13px">Runs on Cloudflare Workers</p>
  </div>
  <div class="main">
    <form id="f">
      <h2>Sign in</h2>
      <p class="sub">Enter your username and password to continue.</p>
      <div class="error" id="err"></div>
      <label for="u">Username</label>
      <input id="u" name="username" autocomplete="username" required autofocus />
      <label for="p">Password</label>
      <input id="p" name="password" type="password" autocomplete="current-password" required />
      <button id="b" type="submit">Sign in</button>
      ${showDemoHint ? '<div class="hint">Demo account<br>Username: <b>demo</b> · Password: <b>demo123</b></div>' : ''}
    </form>
  </div>
<script>
  const f = document.getElementById('f'), err = document.getElementById('err'), b = document.getElementById('b');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.style.display = 'none';
    b.disabled = true; b.textContent = 'Signing in…';
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: f.username.value, password: f.password.value }),
      });
      if (res.ok) { location.reload(); return; }
      const data = await res.json().catch(() => ({}));
      err.textContent = data.error || 'Sign in failed';
    } catch {
      err.textContent = 'Could not reach the server. Try again.';
    }
    err.style.display = 'block';
    b.disabled = false; b.textContent = 'Sign in';
  });
</script>
</body>
</html>`
}
