'use client';
import { useEffect, useState } from 'react';
import { getCsrf } from '../../lib/api';
const tabs = [ ['contents','Konten & Berita'],['menu','Menu'],['resources','Sumber Digital'],['slides','Slider'],['media','Media'],['settings','Pengaturan'] ];
const fields = {
  contents: [['slug','Slug'],['content_type','Jenis: PROFILE, NEWS, GUIDE, dll.'],['title','Judul'],['body','Isi teks']],
  menu: [['label','Label'],['target_url','Tautan /path atau https://'],['parent_id','ID menu induk (opsional)'],['position','Urutan']],
  resources: [['resource_type','Jenis: REPOSITORY_ITH, INDONESIA_ONESEARCH, E_JOURNAL, E_BOOK'],['title','Nama sumber'],['description','Deskripsi'],['url','URL https://'],['position','Urutan']],
  slides: [['media_asset_id','ID media'],['title','Judul'],['caption','Keterangan'],['target_url','Tautan'],['position','Urutan']],
  settings: [['institution_name','Nama institusi'],['website_name','Nama website'],['admin_whatsapp','WhatsApp resmi'],['admin_email','Email resmi'],['address','Alamat'],['service_hours','Jam layanan'],['footer_text','Informasi footer']],
};
const numeric = new Set(['parent_id','position','media_asset_id']);
async function cmsRequest(path, options = {}) {
  const headers = options.body instanceof FormData ? {} : { 'Content-Type':'application/json' };
  if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = await getCsrf();
  const response = await fetch(`/api/v1/admin/cms/${path}`, { ...options, credentials:'include', headers, cache:'no-store' });
  if (!response.ok) throw new Error(response.status === 403 ? 'Akses ditolak.' : `Permintaan gagal (${response.status}).`);
  return (await response.json()).data;
}
export default function CmsPanel() {
  const [tab,setTab] = useState('contents'); const [items,setItems] = useState([]); const [form,setForm] = useState({}); const [selected,setSelected] = useState(null); const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
  useEffect(() => { const syncHash = () => { const key = window.location.hash.replace('#cms-',''); if (tabs.some(([value]) => value === key)) { setTab(key); document.getElementById('cms')?.scrollIntoView(); } }; window.addEventListener('hashchange',syncHash); syncHash(); return () => window.removeEventListener('hashchange',syncHash); }, []);
  async function load(active = tab) { try { const result = await cmsRequest(active); if (active === 'settings') setForm(result ?? {}); else setItems(result?.items ?? []); } catch (error) { setMessage(error.message); } }
  useEffect(() => { load(tab); }, [tab]);
  function choose(item) { setSelected(item.id); setForm(item); setMessage(''); }
  function change(name,value) { setForm((previous) => ({...previous,[name]:numeric.has(name) ? (value === '' ? undefined : Number(value)) : value})); }
  async function save(event) { event.preventDefault(); setBusy(true); setMessage(''); try {
    const payload = Object.fromEntries((fields[tab] ?? []).map(([key]) => [key, form[key]]).filter(([,value]) => value !== undefined && value !== ''));
    if (tab === 'contents') payload.is_published = Boolean(form.is_published);
    if (['menu','resources','slides'].includes(tab)) payload.is_active = form.is_active !== false;
    const path = tab === 'settings' ? tab : selected ? `${tab}/${selected}` : tab;
    await cmsRequest(path, { method: tab === 'settings' || selected ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
    setMessage('Perubahan tersimpan.'); setSelected(null); setForm({}); await load(tab);
  } catch (error) { setMessage(error.message); } finally { setBusy(false); } }
  async function remove(id) { if (!window.confirm('Hapus item ini? Konten terbit perlu ditarik dahulu.')) return; setBusy(true); try { await cmsRequest(`${tab}/${id}`, { method:'DELETE' }); setMessage('Item dihapus.'); await load(tab); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }
  async function upload(event) { event.preventDefault(); const formElement = event.currentTarget; const data = new FormData(formElement); setBusy(true); try { const result = await cmsRequest('media',{method:'POST',body:data}); setMessage(`Gambar diunggah. ID media: ${result.id}`); await load('media'); formElement.reset(); } catch(error) { setMessage(error.message); } finally { setBusy(false); } }
  return <section className="cms-panel" id="cms"><div className="cms-heading"><div><span className="kicker">PENGELOLAAN WEBSITE</span><h2>Kelola konten website</h2></div><span>Khusus SUPERADMIN</span></div><div className="cms-tabs">{tabs.map(([key,label]) => <button type="button" className={tab===key?'selected':''} aria-pressed={tab===key} onClick={() => {setTab(key);setSelected(null);setForm({});setMessage('');}} key={key}>{label}</button>)}</div>{message && <p role="status" className="cms-message">{message}</p>}
    {tab === 'media' ? <form onSubmit={upload} className="cms-form"><label>Gambar PNG, JPEG, atau WebP (maks. 5 MiB)<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required /></label><button disabled={busy}>Unggah gambar</button></form> : <form onSubmit={save} className="cms-form"><h3>{tab === 'settings' ? 'Identitas website' : selected ? `Ubah #${selected}` : 'Tambah item'}</h3><div className="cms-fields">{fields[tab].map(([key,label]) => <label key={key}>{label}{key === 'body' || key === 'description' || key === 'address' || key === 'footer_text' ? <textarea value={form[key] ?? ''} onChange={(event) => change(key,event.target.value)} rows="4" /> : <input value={form[key] ?? ''} onChange={(event) => change(key,event.target.value)} />}</label>)}</div>{tab === 'contents' && <label className="cms-check"><input type="checkbox" checked={Boolean(form.is_published)} onChange={(event)=>setForm({...form,is_published:event.target.checked})} /> Terbitkan</label>}{['menu','resources','slides'].includes(tab) && <label className="cms-check"><input type="checkbox" checked={form.is_active !== false} onChange={(event)=>setForm({...form,is_active:event.target.checked})} /> Tampilkan</label>}<div className="cms-actions"><button disabled={busy}>{busy?'Menyimpan…':'Simpan'}</button>{selected && <button type="button" className="secondary" onClick={()=>{setSelected(null);setForm({});}}>Batal</button>}</div></form>}
    {tab !== 'settings' && <div className="cms-list"><h3>Daftar {tabs.find(([key])=>key===tab)?.[1]}</h3>{items.length ? items.map((item) => <article key={item.id}><div><b>{item.title || item.label || item.original_name || `Item #${item.id}`}</b><small>#{item.id} · {item.is_published ? 'Terbit' : item.is_active === false ? 'Tersembunyi' : 'Aktif / draft'}</small></div><div className="cms-actions">{tab !== 'media' && <button type="button" className="secondary" onClick={()=>choose(item)}>Ubah</button>}<button type="button" className="danger" onClick={()=>remove(item.id)} disabled={busy}>Hapus</button></div></article>) : <p>Belum ada data pada modul ini.</p>}</div>}
  </section>;
}
