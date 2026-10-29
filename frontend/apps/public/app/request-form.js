'use client';
import { useRef, useState } from 'react';
export default function RequestForm({ kind, programs = [], contact = {} }) {
  const [busy,setBusy] = useState(false); const [result,setResult] = useState(''); const [error,setError] = useState('');
  const inFlight = useRef(false);
  const literacy = kind === 'literacy';
  async function submit(event) {
    event.preventDefault(); if (inFlight.current) return; inFlight.current = true; setBusy(true); setResult(''); setError('');
    const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    if (!literacy) values.study_program_id = Number(values.study_program_id);
    try {
      const response = await fetch(`/api/v1/public/${literacy ? 'literacy-requests' : 'clearance-requests'}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(values) });
      if (!response.ok) throw new Error(response.status === 429 ? 'Terlalu banyak permohonan. Coba lagi nanti.' : 'Permohonan gagal dikirim. Periksa isian dan coba lagi.');
      setResult('Permohonan berhasil diterima dengan status PROSES.'); form.reset();
    } catch (issue) { setError(issue.message); } finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="service-form"><h2>{literacy ? 'Permohonan Literasi Informasi' : 'Permohonan Bebas Pustaka'}</h2><p>Lengkapi formulir berikut. Kolom bertanda * wajib diisi.</p><form onSubmit={submit} aria-busy={busy}>
    {literacy ? <><label>Nama Lengkap *<input required maxLength="160" name="requester_name" autoComplete="name" /></label><label>Judul *<input required maxLength="255" name="title" /></label><label>Deskripsi *<textarea required maxLength="5000" name="description" rows="5" /></label><label>WhatsApp (opsional)<input name="requester_whatsapp" type="tel" /></label><label>Email (opsional)<input name="requester_email" type="email" /></label></> : <><label>Nama Lengkap *<input required maxLength="160" name="full_name" autoComplete="name" /></label><label>NIM *<input required maxLength="32" name="nim" /></label><label>Program Studi *<select name="study_program_id" required defaultValue=""><option value="">Pilih program studi</option>{programs.map((program) => <option value={program.id} key={program.id}>{program.name}</option>)}</select></label><label>WhatsApp *<input required name="whatsapp" type="tel" /></label><label>Email *<input required name="email" type="email" /></label></>}
    <button type="submit" disabled={busy || (!literacy && programs.length === 0)}>{busy ? 'Mengirim…' : 'Kirim permohonan'}</button>
  </form>{!literacy && programs.length === 0 && <p role="status">Daftar program studi belum tersedia. Pengiriman sementara tidak dapat dilakukan.</p>}{result && <p className="form-success" role="status">{result}</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="service-contact"><b>Kontak pustakawan</b><span>WhatsApp: {contact.whatsapp || 'Belum tersedia'}</span><span>Email: {contact.email || 'Belum tersedia'}</span></div></div>;
}
