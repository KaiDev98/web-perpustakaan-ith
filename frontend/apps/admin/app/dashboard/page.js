import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Logout from './logout';
import { navigationForPermissions } from '../../lib/navigation';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001'}/api/v1/admin/me`, {
    headers: { Cookie: cookieHeader }, cache: 'no-store',
  }).catch(() => null);
  if (!response || response.status === 401) redirect('/login');
  if (response.status === 403) redirect('/forbidden');
  if (!response.ok) return <main className="system-state"><h1>Layanan belum siap</h1><p>Backend admin tidak dapat dihubungi.</p></main>;

  const user = (await response.json()).data;
  const allowed = new Set(user.permissions);
  const visibleNavigation = navigationForPermissions(user.permissions);
  const superadmin = allowed.has('content.manage');

  return <div className="shell">
    <aside>
      <div className="sidebar-brand"><span className="mark">ITH</span><div><b>PERPUSTAKAAN</b><small>ADMIN PANEL</small></div></div>
      <p className="sidebar-label">NAVIGASI</p>
      <nav aria-label="Navigasi administrator">{visibleNavigation.map((item, index) =>
        <span className={index === 0 ? 'active' : ''} key={item.label}><i aria-hidden="true">{item.icon}</i>{item.label}</span>)}</nav>
      <div className="sidebar-bottom">Fondasi dashboard · modul layanan menyusul</div>
    </aside>
    <main className="dashboard-main">
      <header><div><span className="kicker">DASHBOARD ADMIN</span><h1>Selamat datang, {user.display_name}</h1></div><Logout /></header>
      <section className="welcome"><span>AKSES TERVERIFIKASI</span><h2>Ruang kerja perpustakaan</h2><p>Anda masuk sebagai <strong>{user.role}</strong>. Akses yang tampil mengikuti izin dari backend.</p></section>
      <div className="dashboard-grid">
        <article><span>01</span><h3>Literasi Informasi</h3><p>Ringkasan dan formulir akan tersedia saat API layanan selesai.</p></article>
        <article><span>02</span><h3>Bebas Pustaka</h3><p>Daftar pemohon dan perubahan status akan tersedia saat API layanan selesai.</p></article>
        {superadmin && <article><span>03</span><h3>Konten website</h3><p>Pengelolaan konten khusus SUPERADMIN akan tersedia pada fase modul konten.</p></article>}
      </div>
    </main>
  </div>;
}
