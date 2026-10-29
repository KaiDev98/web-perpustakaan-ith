'use client';

import { useMemo, useState } from 'react';

const adminModules = [
  ['overview', 'Ringkasan', '⌂'], ['literacy', 'Form Pustakawan', '✎'], ['clearance', 'Daftar Pemohon', '▤'],
];
const superModules = [
  ...adminModules,
  ['news', 'Berita & Konten', '▣'], ['profile', 'Profil Perpustakaan', '◉'], ['navigation', 'Navigasi / Menu', '☷'],
  ['journals', 'E-Journal', '▤'], ['ebooks', 'E-Book', '▤'], ['repository', 'Repositori', '↗'],
  ['slides', 'Slider & Media', '▧'], ['services', 'Layanan & Panduan', '⌑'], ['settings', 'Pengaturan Website', '⚙'],
  ['users', 'Pengelolaan Pengguna', '♙'], ['audit', 'Audit Log', '◎'],
];
const sampleRows = [
  { id: 1, name: 'Alya Contoh', title: 'Strategi penelusuran jurnal', nim: 'CONTOH-001', program: 'Program Studi Contoh', status: 'PROSES' },
  { id: 2, name: 'Bima Simulasi', title: 'Akses sumber elektronik', nim: 'CONTOH-002', program: 'Program Studi Simulasi', status: 'SELESAI' },
];
const contentRows = {
  news: [['Berita Contoh: Pekan Literasi', 'Berita · Draft'], ['Pembaruan Layanan Digital', 'Berita · Terbit']],
  journals: [['Portal Jurnal Contoh', 'E-Journal · Aktif'], ['Indeks Jurnal Simulasi', 'E-Journal · Aktif']],
  ebooks: [['Koleksi Buku Digital Contoh', 'E-Book · Aktif'], ['Panduan Membaca E-Book', 'E-Book · Draft']],
  repository: [['Repositori ITH (contoh)', 'Repositori · Aktif'], ['Indonesia OneSearch (contoh)', 'Tautan · Aktif']],
  slides: [['Banner Sambutan Perpustakaan', 'Slider · Aktif'], ['Foto Ruang Baca Contoh', 'Media · Tersimpan']],
  navigation: [['Beranda', 'Menu utama · Posisi 1'], ['Profil', 'Menu utama · Posisi 2'], ['Layanan', 'Menu utama · Posisi 7']],
  services: [['Literasi Informasi', 'Layanan · Aktif'], ['Panduan Repositori', 'Panduan · Draft']],
  users: [['Operator Contoh', 'ADMIN · Aktif'], ['Pengelola Contoh', 'SUPERADMIN · Aktif']],
  audit: [['Pembaruan konten simulasi', 'SUPERADMIN · 29 Okt 2026'], ['Perubahan status contoh', 'ADMIN · 28 Okt 2026']],
};
const labels = { overview: 'Ringkasan', literacy: 'Form Pustakawan', clearance: 'Daftar Pemohon', news: 'Berita & Konten', profile: 'Profil Perpustakaan', navigation: 'Navigasi / Menu', journals: 'E-Journal', ebooks: 'E-Book', repository: 'Repositori', slides: 'Slider & Media', services: 'Layanan & Panduan', settings: 'Pengaturan Website', users: 'Pengelolaan Pengguna', audit: 'Audit Log' };

function PreviewForm({ title, fields }) {
  return <form className="cms-form preview-form" onSubmit={(event) => event.preventDefault()}><h3>{title}</h3><div className="cms-fields">{fields.map((field) => <label key={field}>{field}{field === 'Deskripsi' || field === 'Isi konten' || field === 'Alamat' ? <textarea rows="3" placeholder={`Contoh ${field.toLowerCase()}`} /> : <input placeholder={`Contoh ${field.toLowerCase()}`} />}</label>)}</div><button type="button" disabled title="Simulasi saja">Simpan (simulasi)</button></form>;
}

function RequestsView({ kind, rows, setRows }) {
  const [selected, setSelected] = useState(null);
  const literacy = kind === 'literacy';
  const list = literacy ? rows : rows;
  return <>
    <div className="preview-stat-row"><article><small>Total permohonan contoh</small><b>{list.length}</b></article><article><small>Dalam proses</small><b>{list.filter((row) => row.status === 'PROSES').length}</b></article><article><small>Selesai</small><b>{list.filter((row) => row.status === 'SELESAI').length}</b></article></div>
    <PreviewForm title={literacy ? 'Contoh Form Pustakawan' : 'Contoh Form Bebas Pustaka'} fields={literacy ? ['Nama Lengkap', 'Judul', 'Deskripsi', 'Nomor WhatsApp', 'Email'] : ['Nama Lengkap', 'NIM', 'Program Studi', 'Nomor WhatsApp', 'Email']} />
    <div className="preview-table"><h3>{literacy ? 'Permohonan Literasi Informasi' : 'Pemohon Bebas Pustaka'}</h3><div className="request-table-wrap"><table><thead><tr>{(literacy ? ['Nama', 'Judul', 'Status', 'Aksi'] : ['Nama', 'NIM', 'Prodi', 'Status', 'Aksi']).map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{list.map((row) => <tr key={row.id}><td>{row.name}</td>{literacy ? <td>{row.title}</td> : <><td>{row.nim}</td><td>{row.program}</td></>}<td><span className="status-chip">{row.status}</span></td><td><button type="button" onClick={() => setSelected(row)}>Detail</button></td></tr>)}</tbody></table></div></div>
    {selected && <div className="request-detail"><div className="cms-heading"><h3>Detail simulasi #{selected.id}</h3><button type="button" onClick={() => setSelected(null)}>Tutup</button></div><dl>{Object.entries({ Nama: selected.name, ...(literacy ? { Judul: selected.title, Deskripsi: 'Contoh deskripsi permohonan untuk pratinjau.' } : { NIM: selected.nim, 'Program Studi': selected.program }), Email: 'contoh@example.test', WhatsApp: '08xx-xxx-contoh', Status: selected.status }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><div className="cms-actions"><button type="button" onClick={() => { setRows((current) => current.map((row) => row.id === selected.id ? { ...row, status: 'PROSES' } : row)); setSelected({ ...selected, status: 'PROSES' }); }}>Simulasikan PROSES</button><button type="button" onClick={() => { setRows((current) => current.map((row) => row.id === selected.id ? { ...row, status: 'SELESAI' } : row)); setSelected({ ...selected, status: 'SELESAI' }); }}>Simulasikan SELESAI</button></div><p className="preview-note">Perubahan status ini hanya simulasi lokal dan tidak disimpan.</p></div>}
  </>;
}

export default function PreviewDashboard({ role }) {
  const superadmin = role === 'superadmin';
  const modules = superadmin ? superModules : adminModules;
  const [active, setActive] = useState('overview');
  const [literacyRows, setLiteracyRows] = useState(sampleRows);
  const [clearanceRows, setClearanceRows] = useState(sampleRows.map((row) => ({ ...row, name: row.id === 1 ? 'Citra Contoh' : 'Danu Simulasi' })));
  const activeLabel = labels[active] ?? 'Ringkasan';
  const rows = useMemo(() => contentRows[active] ?? [], [active]);
  return <div className="shell preview-shell"><aside><a className="preview-brand" href="/login"><span className="mark">ITH</span><span><b>PERPUSTAKAAN</b><small>ADMIN PREVIEW</small></span></a><p className="sidebar-label">NAVIGASI</p><nav aria-label="Navigasi preview">{modules.map(([key, label, icon]) => <button type="button" className={active === key ? 'active' : ''} key={key} onClick={() => setActive(key)}><i aria-hidden="true">{icon}</i>{label}</button>)}</nav><div className="sidebar-bottom"><a href="/login">← Kembali ke Login</a><small>Semua data hanya contoh.</small></div></aside><main className="dashboard-main"><div className="preview-ribbon">MODE PREVIEW — DATA SIMULASI <span>Perubahan tidak tersimpan</span></div><header><div><span className="kicker">DASHBOARD {superadmin ? 'SUPERADMIN' : 'ADMIN'}</span><h1>{activeLabel}</h1></div><a className="preview-back" href="/login">Kembali ke Login</a></header><section className="welcome"><span>PRATINJAU ANTARMUKA</span><h2>{active === 'overview' ? (superadmin ? 'Ruang kerja pengelola website' : 'Ringkasan permohonan layanan') : activeLabel}</h2><p>Data dan interaksi di halaman ini sintetis. Tidak ada sesi administrator, data database, atau API admin yang digunakan.</p></section>
    {active === 'overview' && <div className="preview-stat-row"><article><small>Permohonan Literasi</small><b>{literacyRows.length}</b><span>contoh sintetis</span></article><article><small>Bebas Pustaka</small><b>{clearanceRows.length}</b><span>contoh sintetis</span></article>{superadmin && <article><small>Modul CMS</small><b>11</b><span>tersedia di navigasi</span></article>}</div>}
    {active === 'literacy' && <RequestsView kind="literacy" rows={literacyRows} setRows={setLiteracyRows} />}
    {active === 'clearance' && <RequestsView kind="clearance" rows={clearanceRows} setRows={setClearanceRows} />}
    {active === 'profile' && <><PreviewForm title="Profil perpustakaan (contoh)" fields={['Nama perpustakaan', 'Tagline', 'Deskripsi', 'Visi', 'Misi', 'Kontak pustakawan']} /><div className="preview-table"><h3>Konten profil</h3><p>Pratinjau profil singkat dengan konten sintetis. Isi resmi dikelola melalui CMS.</p></div></>}
    {active === 'settings' && <PreviewForm title="Identitas website (contoh)" fields={['Nama institusi', 'Nama website', 'Email resmi', 'WhatsApp resmi', 'Alamat', 'Jam layanan', 'Informasi footer']} />}
    {rows.length > 0 && <><PreviewForm title={`Form ${activeLabel} (contoh)`} fields={active === 'news' ? ['Slug', 'Jenis konten', 'Judul', 'Isi konten'] : ['Nama', 'Deskripsi', 'URL', 'Urutan']} /><div className="preview-table"><h3>Daftar {activeLabel}</h3><div className="request-table-wrap"><table><thead><tr><th>Nama</th><th>Jenis / Status</th><th>Aksi</th></tr></thead><tbody>{rows.map(([name, detail]) => <tr key={name}><td>{name}</td><td>{detail}</td><td><button type="button" onClick={(event) => { event.currentTarget.textContent = 'Terpilih (simulasi)'; }}>Lihat contoh</button></td></tr>)}</tbody></table></div></div></>}
  </main></div>;
}
