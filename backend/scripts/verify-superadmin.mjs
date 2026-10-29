const base = 'http://127.0.0.1:3001/api/v1';
const email = process.env.BOOTSTRAP_SUPERADMIN_EMAIL;
const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
const cookie = (response, name) => response.headers.getSetCookie().find((value) => value.startsWith(`${name}=`))?.split(';')[0];
async function verify() {
  if (!email || !password) throw new Error('missing operator input');
  const csrfResponse = await fetch(`${base}/auth/csrf`);
  if (!csrfResponse.ok) throw new Error('csrf unavailable');
  const csrf = (await csrfResponse.json()).data.token;
  const csrfCookie = cookie(csrfResponse, 'ith_csrf');
  if (!csrfCookie) throw new Error('csrf cookie missing');
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'http://127.0.0.1:3002', 'Cookie': csrfCookie, 'X-CSRF-Token': csrf }, body: JSON.stringify({ email, password }) });
  if (!login.ok) throw new Error('login rejected');
  const adminCookie = cookie(login, 'ith_admin');
  if (!adminCookie) throw new Error('session cookie missing');
  const headers = { Cookie: `${csrfCookie}; ${adminCookie}` };
  try {
    const me = await fetch(`${base}/admin/me`, { headers });
    const user = (await me.json()).data;
    if (!me.ok || user.role !== 'SUPERADMIN') throw new Error('role mismatch');
    for (const permission of ['content.manage','navigation.manage','slides.manage','resources.manage','settings.manage']) {
      if (!user.permissions.includes(permission)) throw new Error('permission missing');
    }
    for (const path of ['contents','menu','slides','resources','settings','media']) {
      const response = await fetch(`${base}/admin/cms/${path}`, { headers });
      if (!response.ok) throw new Error('CMS route unavailable');
    }
    process.stdout.write('Login SUPERADMIN dan enam modul CMS terverifikasi.\n');
  } finally {
    await fetch(`${base}/auth/logout`, { method: 'POST', headers: { ...headers, 'Origin': 'http://127.0.0.1:3002', 'X-CSRF-Token': csrf } }).catch(() => undefined);
  }
}
verify().catch(() => { process.stderr.write('Verifikasi login gagal. Pastikan backend lokal aktif dan kredensial benar.\n'); process.exitCode = 1; });
