// 📁 RUTA: src/app/t/[slug]/CarruselColecciones.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type Coleccion = { n: string; c: number; foto: string; href: string };

const ic = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export default function CarruselColecciones({ cats }: { cats: Coleccion[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const [nav, setNav] = useState({ ant: false, sig: false });

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    setNav({ ant: el.scrollLeft > 4, sig: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [medir, cats.length]);

  const mover = (dir: 1 | -1) => {
    const el = pista.current;
    const hijo = el?.firstElementChild as HTMLElement | null;
    if (el && hijo) el.scrollBy({ left: dir * (hijo.offsetWidth + 22), behavior: 'smooth' });
  };

  if (cats.length === 0) return null;

  return (
    <section className="cc">
      <style>{CSS}</style>
      <div className="cc-in">
        <div className="cc-izq">
          <span className="cc-ey">Colecciones</span>
          <h3>Descubre<br />nuestros mundos</h3>
          <p>Piezas en oro certificado agrupadas por estilo, para que encuentres la joya que va contigo.</p>
          <div className="cc-flechas">
            <button type="button" onClick={() => mover(-1)} disabled={!nav.ant} aria-label="Colecciones anteriores">
              <svg {...ic}><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" onClick={() => mover(1)} disabled={!nav.sig} aria-label="Más colecciones">
              <svg {...ic}><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        <div className="cc-pista" ref={pista} onScroll={medir} tabIndex={0} aria-label="Colecciones">
          {cats.map((c) => (
            <a key={c.n} href={c.href} className="cc-card">
              <span className="cc-img">
                {c.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.foto} alt={c.n} loading="lazy" decoding="async" />
                ) : (
                  <svg {...ic} width={44} height={44} strokeWidth={1.2} className="cc-vacio">
                    <path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" />
                  </svg>
                )}
              </span>
              <span className="cc-velo" />
              <span className="cc-txt">
                <b>{c.n}</b>
                <small>{c.c} {c.c === 1 ? 'pieza' : 'piezas'}</small>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

const CSS = `
  .cc { position: relative; padding: 72px 0; color: #f4efdc; overflow: hidden;
    background: radial-gradient(ellipse 45% 70% at 90% 30%, rgba(224,183,63,.16), transparent 70%), radial-gradient(ellipse 50% 80% at 0% 60%, rgba(15,95,59,.6), transparent 70%), linear-gradient(120deg, #030c08, #06241a 60%, #030c08);
    border-top: 1px solid rgba(224,183,63,.25); border-bottom: 1px solid rgba(224,183,63,.25); }
  .cc-in { max-width: 1180px; margin: 0 auto; padding: 0 28px; display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 40px; align-items: center; }

  .cc-ey { display: inline-flex; align-items: center; gap: 12px; font-size: 10.5px; letter-spacing: .3em; text-transform: uppercase; color: #e0b73f; }
  .cc-ey::before { content: ""; width: 28px; height: 1px; background: #e0b73f; }
  .cc-izq h3 { margin: 16px 0 14px; font-family: var(--serif, Georgia, serif); font-weight: 500; font-size: clamp(28px, 3.2vw, 40px); line-height: 1.12; letter-spacing: .06em; text-transform: uppercase; color: #f6efd9; }
  .cc-izq p { margin: 0 0 26px; font-size: 13.5px; line-height: 1.6; color: #b9c6bd; max-width: 270px; }
  .cc-flechas { display: flex; gap: 12px; }
  .cc-flechas button { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; cursor: pointer; color: #e0b73f; background: rgba(224,183,63,.06); border: 1px solid rgba(224,183,63,.6); transition: background .2s, color .2s, opacity .2s; }
  .cc-flechas button:hover:not(:disabled) { background: #e0b73f; color: #1a1405; }
  .cc-flechas button:disabled { opacity: .3; cursor: default; }
  .cc-flechas button:focus-visible, .cc-card:focus-visible, .cc-pista:focus-visible { outline: 2px solid #e0b73f; outline-offset: 3px; }

  /* Pista: las tarjetas se difuminan al borde derecho */
  .cc-pista { display: flex; gap: 22px; overflow-x: auto; padding: 14px 40px 14px 18px; scroll-snap-type: x mandatory; scroll-behavior: smooth; scrollbar-width: none; outline: none;
    -webkit-mask-image: linear-gradient(90deg, #000 88%, transparent); mask-image: linear-gradient(90deg, #000 88%, transparent); }
  .cc-pista::-webkit-scrollbar { display: none; }

  /* Tarjeta inclinada (paralelogramo) con borde dorado */
  .cc-card { position: relative; flex: 0 0 230px; height: 340px; scroll-snap-align: start; overflow: hidden; transform: skewX(-7deg); border: 1px solid rgba(224,183,63,.55);
    background: linear-gradient(170deg, #0c3322, #030806); box-shadow: 0 16px 34px rgba(0,0,0,.45); transition: border-color .25s, box-shadow .25s; }
  .cc-card:hover { border-color: #f0d680; box-shadow: 0 20px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(240,214,128,.3); }
  .cc-img { position: absolute; inset: -4% -14%; display: block; transform: skewX(7deg); }
  .cc-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .7s ease; }
  .cc-card:hover .cc-img img { transform: scale(1.1); }
  .cc-vacio { position: absolute; inset: 0; margin: auto; color: #b08d3c; opacity: .55; }
  .cc-velo { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(3,8,6,.92)); }
  .cc-txt { position: absolute; left: 0; right: 0; bottom: 18px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; transform: skewX(7deg); padding: 0 12px; }
  .cc-txt b { font-family: var(--serif, Georgia, serif); font-weight: 500; font-size: 14px; letter-spacing: .24em; text-transform: uppercase; color: #f6efd9; }
  .cc-txt small { font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; color: #e0b73f; }

  @media (max-width: 860px) {
    .cc { padding: 52px 0; }
    .cc-in { grid-template-columns: 1fr; gap: 26px; padding: 0 16px; }
    .cc-izq { display: grid; grid-template-columns: 1fr auto; column-gap: 16px; align-items: end; }
    .cc-izq .cc-ey, .cc-izq h3, .cc-izq p { grid-column: 1; }
    .cc-izq p { margin-bottom: 0; }
    .cc-flechas { grid-column: 2; grid-row: 2 / 4; align-self: end; }
    .cc-card { flex-basis: 190px; height: 290px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cc-pista { scroll-behavior: auto; }
    .cc-img img, .cc-card { transition: none; }
  }
`;