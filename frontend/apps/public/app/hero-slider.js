'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
export default function HeroSlider({ slides, siteName }) {
  const [index,setIndex] = useState(0);
  useEffect(() => { if (slides.length < 2) return; const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), 6500); return () => clearInterval(timer); }, [slides.length]);
  const slide = slides[index];
  const style = slide?.media_asset_id ? { backgroundImage: `linear-gradient(90deg,rgba(6,60,51,.95),rgba(6,60,51,.5)),url(http://127.0.0.1:3001/api/v1/public/media/${slide.media_asset_id})`, backgroundSize:'cover',backgroundPosition:'center' } : undefined;
  return <section className="hero" style={style}><div className="hero-content"><span className="eyebrow">SELAMAT DATANG DI {siteName.toUpperCase()}</span><h1>{slide?.title || 'Pengetahuan untuk langkah berikutnya.'}</h1><p>{slide?.caption || 'Temukan informasi perpustakaan, sumber digital, dan layanan dalam satu tempat.'}</p><Link className="button" href={slide?.target_url?.startsWith('/') ? slide.target_url : '/layanan'}>Jelajahi layanan ↗</Link>{slides.length > 1 && <div className="slide-dots" aria-label="Pilih slide">{slides.map((item,number) => <button type="button" aria-label={`Slide ${number+1}`} aria-current={number===index} onClick={()=>setIndex(number)} key={item.id}>{number+1}</button>)}</div>}</div>{!slide && <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="book-shape">ITH<span>LIBRARY</span></div></div>}</section>;
}
