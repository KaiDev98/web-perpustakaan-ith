'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/api';
export default function LoginForm({ previewEnabled = false }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try { await login(form.get('email'), form.get('password')); router.replace('/dashboard'); router.refresh(); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="login-form"><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Kata sandi<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="error" role="alert">{error}</p>}<button disabled={busy} type="submit">{busy ? 'Memverifikasi…' : 'Masuk'} <span aria-hidden="true">→</span></button>{previewEnabled && <div className="preview-login-links"><a href="/preview/admin">Preview Admin</a><a href="/preview/superadmin">Preview Superadmin</a></div>}<small>Jika akses bermasalah, hubungi pengelola sistem melalui kanal internal.</small></form>;
}
