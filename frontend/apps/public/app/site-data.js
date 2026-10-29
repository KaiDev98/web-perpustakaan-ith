const origin = process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001';
export async function getCms(path) {
  try { const response = await fetch(`${origin}/api/v1/public/${path}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) }); return response.ok ? (await response.json()).data : null; }
  catch { return null; }
}
export const mainMenu = [
  { label: 'Beranda', target_url: '/' },
  { label: 'Profil', target_url: '/profil', children: [['Profil Perpustakaan','/profil'],['Visi & Misi','/profil/visi-misi'],['Struktur Organisasi','/profil/struktur-organisasi'],['Profil Staf','/profil/staf']] },
  { label: 'Berita', target_url: '/berita' },
  { label: 'Repositori', target_url: '/repositori', children: [['Repository ITH','/repositori/repository-ith'],['Indonesia OneSearch','/repositori/indonesia-onesearch']] },
  { label: 'E-Journal', target_url: '/e-journal' }, { label: 'E-Book', target_url: '/e-book' },
  { label: 'Layanan', target_url: '/layanan', children: [['Penelitian','/layanan/penelitian'],['Literasi Informasi','/layanan/literasi-informasi'],['Bebas Pustaka','/layanan/bebas-pustaka']] },
  { label: 'Panduan', target_url: '/panduan', children: [['Panduan Repo','/panduan/repo'],['Unggah / Unduh Panduan','/panduan/unggah-unduh'],['Panduan Lainnya','/panduan/lainnya']] },
];
export const resourceTypes = { REPOSITORY_ITH: ['Repository ITH','/repositori/repository-ith'], INDONESIA_ONESEARCH: ['Indonesia OneSearch','/repositori/indonesia-onesearch'], E_JOURNAL: ['E-Journal','/e-journal'], E_BOOK: ['E-Book','/e-book'] };
export function resolveMenu(data) {
  const items = data?.items?.filter((item) => item.is_active !== false) ?? [];
  if (!items.length) return mainMenu;
  return items.filter((item) => !item.parent_id).sort((a,b) => a.position-b.position).map((item) => ({
    ...item, children: items.filter((child) => child.parent_id === item.id).sort((a,b) => a.position-b.position).map((child) => [child.label,child.target_url]),
  }));
}
