import Link from 'next/link';
import { getCms, resolveMenu, resourceTypes } from './site-data';
import HeroSlider from './hero-slider';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const [settings, menuData, slidesData, newsData, resourcesData, profileData] = await Promise.all([
    getCms('settings'), getCms('menu?limit=50'), getCms('slides'), getCms('contents?content_type=NEWS&limit=3'), getCms('resources?limit=12'), getCms('contents?content_type=PROFILE&limit=1'),
  ]);
  const menu = resolveMenu(menuData);
  const slides = slidesData?.items ?? []; const news = newsData?.items ?? []; const resources = resourcesData?.items ?? []; const profile = profileData?.items?.[0];
  const siteName = settings?.website_name || 'Perpustakaan ITH';
  return <>
    <div className="topbar"><span>Institut Teknologi Bacharuddin Jusuf Habibie</span><span>{settings?.service_hours || 'Informasi jam layanan sedang disiapkan'}</span></div>
    <header className="header"><Link className="brand" href="/"><span className="brand-mark">ITH</span><span><b>PERPUSTAKAAN</b><small>Institut Teknologi B. J. Habibie</small></span></Link><span className="header-note">Ruang belajar, riset, dan pengetahuan</span></header>
    <nav className="nav" aria-label="Navigasi utama">{menu.map((item) => <div className="nav-item" key={item.id ?? item.label}><Link href={item.target_url}>{item.label}</Link>{item.children?.length > 0 && <details className="nav-submenu"><summary aria-label={`Buka submenu ${item.label}`}>▾</summary><div className="dropdown">{item.children.map(([label,href]) => <Link key={href} href={href}>{label}</Link>)}</div></details>}</div>)}</nav>
    <main>
      <HeroSlider slides={slides} siteName={siteName} />
      <section className="section"><div className="section-heading"><div><span className="eyebrow">TENTANG KAMI</span><h2>Perpustakaan ITH</h2></div><Link className="text-link" href="/profil">Selengkapnya ↗</Link></div><p className="intro">{profile?.body || 'Profil resmi perpustakaan akan tampil setelah diterbitkan oleh pengelola. Ini adalah contoh tampilan.'}</p></section>
      <section className="section tinted"><div className="section-heading"><div><span className="eyebrow">AKSES CEPAT</span><h2>Layanan perpustakaan</h2></div></div><div className="cards">{[['Literasi Informasi','/layanan/literasi-informasi','Pendampingan pencarian dan penggunaan informasi.'],['Bebas Pustaka','/layanan/bebas-pustaka','Informasi permohonan bebas pustaka.'],['Penelitian','/layanan/penelitian','Informasi dukungan riset dan penelusuran sumber.']].map(([title,href,description]) => <Link className="card card-link" href={href} key={title}><span className="card-icon">✦</span><h3>{title}</h3><p>{description}</p><span className="state">Lihat layanan →</span></Link>)}</div></section>
      <section className="section"><div className="section-heading"><div><span className="eyebrow">SUMBER PENGETAHUAN</span><h2>Jelajahi sumber digital</h2></div></div><div className="resource-grid">{Object.entries(resourceTypes).map(([type,[label,href]]) => { const item = resources.find((entry) => entry.resource_type === type); return <div key={type}><h3>{label}</h3><p>{item?.description || 'Tautan resmi akan ditambahkan oleh pengelola.'}</p>{item?.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">Buka sumber ↗</a> : <Link href={href}>Lihat halaman →</Link>}</div>; })}</div></section>
      <section className="section tinted"><div className="section-heading"><div><span className="eyebrow">KABAR TERBARU</span><h2>Berita perpustakaan</h2></div><Link className="text-link" href="/berita">Semua berita ↗</Link></div>{news.length ? <div className="cards">{news.map((item) => <Link className="card card-link" href={`/berita/${item.slug}`} key={item.id}><span className="eyebrow">BERITA</span><h3>{item.title}</h3><p>{item.body.slice(0,150)}{item.body.length > 150 ? '…' : ''}</p><span className="state">Baca selengkapnya →</span></Link>)}</div> : <div className="empty"><span>✳</span><p>Belum ada berita yang diterbitkan.</p><small>Informasi resmi akan muncul setelah tersedia.</small></div>}</section>
    </main><footer><div><b>{siteName.toUpperCase()}</b><p>{settings?.institution_name || 'Institut Teknologi Bacharuddin Jusuf Habibie'}</p><small>{settings?.address || 'Alamat resmi akan ditambahkan oleh pengelola.'}</small></div><div><b>KONTAK</b><p>{settings?.admin_email || 'Email resmi belum tersedia'}</p><p>{settings?.admin_whatsapp || 'WhatsApp resmi belum tersedia'}</p></div><div><b>AKSES CEPAT</b><p><Link href="/panduan">Panduan</Link></p><p><Link href="/repositori">Repositori</Link></p></div></footer>
  </>;
}
