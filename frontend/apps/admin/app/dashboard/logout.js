'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '../../lib/api';
export default function Logout() {
  const router = useRouter();
  const [error, setError] = useState('');
  async function leave() {
    setError('');
    try { await logout(); router.replace('/login'); router.refresh(); }
    catch (issue) { setError(issue.message); }
  }
  return <div><button className="logout" onClick={leave}>Keluar <span aria-hidden="true">↗</span></button>{error && <p className="error" role="alert">{error}</p>}</div>;
}
