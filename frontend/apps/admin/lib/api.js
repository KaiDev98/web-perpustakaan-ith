export async function getCsrf() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error('Gagal menyiapkan keamanan formulir.');
  return (await response.json()).data.token;
}
export async function login(email, password) {
  const csrf = await getCsrf();
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST', credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'Terlalu banyak percobaan. Coba lagi nanti.' : 'Email atau kata sandi tidak valid.');
  return (await response.json()).data;
}
export async function logout() {
  const csrf = await getCsrf();
  const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'X-CSRF-Token': csrf } });
  if (!response.ok) throw new Error('Gagal keluar. Coba lagi.');
}
