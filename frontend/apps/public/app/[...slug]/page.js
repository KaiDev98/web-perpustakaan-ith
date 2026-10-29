import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCms, resolveMenu } from '../site-data';
import RequestForm from '../request-form';
export const dynamic = 'force-dynamic';
const contentTypes = { 'profil': 'PROFILE', 'profil/visi-misi': 'VISION_MISSION', 'profil/struktur-organisasi': 'ORG_STRUCTURE', 'profil/staf': 'STAFF_PROFILE', 'layanan/penelitian': 'RESEARCH_SERVICE', 'panduan': 'GUIDE', 'panduan/repo': 'GUIDE', 'panduan/unggah-unduh': 'GUIDE', 'panduan/lainnya': 'GUIDE', 'berita': 'NEWS' };
const titles = { 'profil':'Profil Perpustakaan','profil/visi-misi':'Visi & Misi','profil/struktur-organisasi':'Struktur Organisasi','profil/staf':'Profil Staf','berita':'Berita','repositori':'Repositori','repositori/repository-ith':'Repository ITH','repositori/indonesia-onesearch':'Indonesia OneSearch','e-journal':'E-Journal','e-book':'E-Book','layanan':'Layanan','layanan/penelitian':'Penelitian','layanan/literasi-informasi':'Literasi Informasi','layanan/bebas-pustaka':'Bebas Pustaka','panduan':'Panduan','panduan/repo':'Panduan Repo','panduan/unggah-unduh':'Unggah / Unduh Panduan','panduan/lainnya':'Panduan Lainnya' };
export default async function Page({ params }) {
  const slug = (await params).slug.join('/');
  if (!titles[slug] && !slug.startsWith('berita/')) notFound();
  const type = contentTypes[slug];
  const [content, resources, settings, programs, menuData] = await Promise.all([type ? getCms(`contents?content_type=${type}&limit=20`) : null, getCms('resources?limit=50'), getCms('settings'), slug === 'layanan/bebas-pustaka' ? getCms('study-programs') : null, getCms('menu?limit=50')]);
  const item = slug.startsWith('berita/') ? (await getCms('contents?content_type=NEWS&limit=50'))?.items?.find((entry) => entry.slug === slug.slice(7)) : null;
  if (slug.startsWith('berita/') && !item) notFound();
  const title = item?.title || titles[slug] || 'Halaman belum tersedia';
  const resourceType = slug.startsWith('repositori') ? (slug.endsWith('onesearch') ? 'INDONESIA_ONESEARCH' : 'REPOSITORY_ITH') : slug === 'e-journal' ? 'E_JOURNAL' : slug === 'e-book' ? 'E_BOOK' : null;
  const selectedResources = resourceType ? (resources?.items ?? []).filter((entry) => entry.resource_type === resourceType) : [];
  const menu = resolveMenu(menuData);
  const subpages = menu.find((entry) => entry.target_url === `/${slug}`)?.children ?? [];
  const isLiteracy = slug === 'layanan/literasi-informasi'; const isClearance = slug === 'layanan/bebas-pustaka';
  return <><div className="topbar"><span>Institut Teknologi Bacharuddin Jusuf Habibie</span><span>{settings?.service_hours || 'Informasi jam layanan sedang disiapkan'}</span></div><header className="header"><Link className="brand" href="/"><span className="brand-mark">ITH</span><span><b>PERPUSTAKAAN</b><small>Institut Teknologi B. J. Habibie</small></span></Link></header><nav className="nav" aria-label="Navigasi utama">{resolveMenu(menuData).map((entry) => <div className="nav-item" key={entry.id ?? entry.label}><Link href={entry.target_url}>{entry.label}</Link>{entry.children?.length > 0 && <details className="nav-submenu"><summary aria-label={`Buka submenu ${entry.label}`}>▾</summary><div className="dropdown">{entry.children.map(([label,href]) => <Link href={href} key={href}>{label}</Link>)}</div></details>}</div>)}</nav><main><section className="inner-hero"><Link href="/">Beranda</Link><span> / {title}</span><h1>{title}</h1><p>Informasi dan layanan Perpustakaan ITH.</p></section><section className="section inner-content">
    {item ? <article className="article"><span className="eyebrow">BERITA</span><h2>{item.title}</h2><p>{item.body}</p></article> : null}
    {content?.items?.length ? <div className="content-list">{content.items.map((entry) => <article className="article" key={entry.id}><h2>{entry.title}</h2><p>{entry.body}</p>{slug === 'berita' && <Link className="text-link" href={`/berita/${entry.slug}`}>Baca selengkapnya →</Link>}</article>)}</div> : null}
    {selectedResources.length ? <div className="cards">{selectedResources.map((entry) => <a className="card card-link" key={entry.id} href={entry.url} target="_blank" rel="noopener noreferrer"><h3>{entry.title}</h3><p>{entry.description}</p><span className="state">Buka sumber ↗</span></a>)}</div> : null}
    {subpages.length > 0 && <div className="subpage-list"><h2>Jelajahi {title}</h2><div className="cards">{subpages.map(([label,href]) => <Link className="card card-link" href={href} key={href}><h3>{label}</h3><span className="state">Buka halaman →</span></Link>)}</div></div>}
    {(isLiteracy || isClearance) && <RequestForm kind={isLiteracy ? 'literacy' : 'clearance'} programs={programs ?? []} contact={{ whatsapp: settings?.admin_whatsapp, email: settings?.admin_email }} />}
    {!item && !content?.items?.length && !selectedResources.length && !subpages.length && !isLiteracy && !isClearance && <div className="empty"><span>✳</span><p>Konten resmi belum diterbitkan.</p><small>Bagian ini akan diperbarui oleh pengelola.</small></div>}
    </section></main><footer><div><b>{settings?.website_name || 'PERPUSTAKAAN ITH'}</b><p>{settings?.institution_name || 'Institut Teknologi Bacharuddin Jusuf Habibie'}</p><small>{settings?.address || 'Alamat resmi akan ditambahkan oleh pengelola.'}</small></div><div><b>KONTAK</b><p>{settings?.admin_email || 'Email resmi belum tersedia'}</p><p>{settings?.admin_whatsapp || 'WhatsApp resmi belum tersedia'}</p></div><div><b>AKSES CEPAT</b><p><Link href="/panduan">Panduan</Link></p><p><Link href="/repositori">Repositori</Link></p></div></footer></>;
}
