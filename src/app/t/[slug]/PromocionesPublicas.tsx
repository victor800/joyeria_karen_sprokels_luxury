// 📁 RUTA: src/app/t/[slug]/PromocionesPublicas.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PromoP = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: 'porcentaje' | 'monto';
  valor: number;
  hasta: string; // AAAA-MM-DD
  dias: number; // días que le quedan (calculado en el servidor)
  fotoUrl: string; // ya resuelta con rutaFoto()
  /** Opcional: usos que quedan (null = ilimitado) */
  restantes?: number | null;
};

/* Mismas claves/eventos que usa CatalogoPublico (carrito) */
const LS_CUPON = 'mw-cupon';
const EV_CARRITO = 'mw-carrito';
const EV_ABRIR = 'mw-abrir-carrito';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return m && d ? `${d} ${MESES[m - 1]} ${y}` : iso;
};
const valorDesc = (p: PromoP) => (p.tipo === 'porcentaje' ? `−${p.valor}%` : `−$${numero.format(p.valor)}`);
const pista = (dias: number) => (dias <= 0 ? 'Termina hoy' : dias === 1 ? 'Termina mañana' : `Quedan ${dias} días`);

const ic = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

function leerCupon(): string {
  try {
    const v = localStorage.getItem(LS_CUPON);
    return v ? String((JSON.parse(v) as { codigo?: string }).codigo ?? '') : '';
  } catch {
    return '';
  }
}

/** Visor de foto ampliada: clic fuera, × o Escape para cerrar */
function VisorFoto({ p, logo, onCerrar }: { p: PromoP; logo?: string; onCerrar: () => void }) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alTeclear);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  return createPortal(
    <div className="pm-visor" onClick={onCerrar} role="dialog" aria-modal="true" aria-label={`Foto de ${p.nombre}`}>
      <button type="button" className="pm-visor-x" onClick={onCerrar} aria-label="Cerrar">×</button>
      <div className="pm-visor-marco" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pm-visor-foto" src={p.fotoUrl} alt={p.nombre} decoding="async" />
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pm-visor-logo" src={logo} alt="" />
        )}
      </div>
      <p onClick={(e) => e.stopPropagation()}>{p.nombre} · {valorDesc(p)}</p>
    </div>,
    document.body,
  );
}

export default function PromocionesPublicas({ promos, logo }: { promos: PromoP[]; wa?: string; logo?: string }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [aplicado, setAplicado] = useState('');
  const [visor, setVisor] = useState<PromoP | null>(null);
  const cerrarVisor = useCallback(() => setVisor(null), []);
  const pistaRef = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const [nav, setNav] = useState({ ant: false, sig: false, hay: false });

  useEffect(() => {
    const sync = () => setAplicado(leerCupon());
    sync();
    window.addEventListener(EV_CARRITO, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EV_CARRITO, sync); window.removeEventListener('storage', sync); };
  }, []);

  const medir = useCallback(() => {
    const el = pistaRef.current;
    if (!el) return;
    const hijo = el.firstElementChild as HTMLElement | null;
    const paso = hijo ? hijo.offsetWidth + 20 : el.clientWidth;
    setIndice(Math.min(promos.length - 1, Math.round(el.scrollLeft / paso)));
    setNav({
      hay: el.scrollWidth > el.clientWidth + 4,
      ant: el.scrollLeft > 4,
      sig: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, [promos.length]);

  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [medir]);

  const mover = (dir: 1 | -1) => {
    const el = pistaRef.current;
    const hijo = el?.firstElementChild as HTMLElement | null;
    if (el && hijo) el.scrollBy({ left: dir * (hijo.offsetWidth + 20), behavior: 'smooth' });
  };
  const irA = (i: number) => {
    const el = pistaRef.current;
    const hijo = el?.firstElementChild as HTMLElement | null;
    if (el && hijo) el.scrollTo({ left: i * (hijo.offsetWidth + 20), behavior: 'smooth' });
  };

  async function copiar(p: PromoP) {
    try {
      await navigator.clipboard.writeText(p.codigo);
      setCopiado(p.id);
      setTimeout(() => setCopiado((c) => (c === p.id ? null : c)), 1800);
    } catch {
      /* sin portapapeles: el código igual se ve */
    }
  }

  function aplicar(p: PromoP) {
    try {
      localStorage.setItem(LS_CUPON, JSON.stringify({
        codigo: p.codigo, nombre: p.nombre, tipo: p.tipo, valor: p.valor, hasta: p.hasta,
      }));
    } catch { /* modo privado */ }
    setAplicado(p.codigo);
    window.dispatchEvent(new Event(EV_CARRITO));
    window.dispatchEvent(new Event(EV_ABRIR)); // abre el carrito para ver el descuento
  }

  const hayAplicado = promos.some((p) => p.codigo === aplicado);

  return (
    <>
      <style>{CSS}</style>

      <div className="pm-tit">
        <small>Ofertas del momento</small>
        <h3>Promociones para ti</h3>
        <p>Aplica tu cupón al carrito y ahorra en tu próxima joya.</p>
      </div>

      <div className={`pm-vit ${promos.length === 1 ? 'uno' : ''}`}>
      <div className="pm-col">
      <div className="pm-carrusel">
        {nav.hay && (
          <button type="button" className="pm-flecha ant" onClick={() => mover(-1)} disabled={!nav.ant} aria-label="Promoción anterior">
            <svg {...ic} width={20} height={20}><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        )}

        <div className="pm-pista" ref={pistaRef} onScroll={medir} tabIndex={0} aria-label="Lista de promociones">
          {promos.map((p) => {
            const activo = aplicado === p.codigo;
            const urgente = p.dias <= 2;
            const rest = p.restantes;
            return (
              <article key={p.id} className="pm-card">
                {/* Foto con descuento encima */}
                <div className="pm-foto">
                  {p.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.fotoUrl} alt={p.nombre} loading="lazy" decoding="async" />
                  ) : (
                    <span className="pm-vacio" aria-hidden="true">
                      <svg {...ic} width={44} height={44} strokeWidth={1.3}>
                        <path d="M6 4h12l4 5-10 11L2 9z" />
                        <path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" />
                      </svg>
                    </span>
                  )}
                  <div className="pm-velo" />
                  {p.fotoUrl && <button type="button" className="pm-zoom" onClick={() => setVisor(p)} aria-label={`Ver foto ampliada de ${p.nombre}`} />}
                  {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="pm-sello" src={logo} alt="" />
                  )}
                  <span className={`pm-aviso ${urgente ? 'urg' : ''}`}><i />{pista(p.dias)}</span>
                  <div className="pm-desc">
                    <b>{valorDesc(p)}</b>
                    <small>{p.tipo === 'porcentaje' ? 'de descuento' : 'de descuento en COP'}</small>
                  </div>
                </div>

                {/* Detalle */}
                <div className="pm-cuerpo">
                  <span className="pm-ey">Cupón exclusivo</span>
                  <h4 className="pm-nom">{p.nombre}</h4>
                  <p className="pm-txt">{p.descripcion || 'Aprovecha esta oferta en piezas seleccionadas.'}</p>
                  <ul className="pm-datos">
                    <li>
                      <svg {...ic} width={15} height={15}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                      Válido hasta el {fechaLarga(p.hasta)}
                    </li>
                    <li>
                      <svg {...ic} width={15} height={15}><path d="M2 9a3 3 0 0 0 0 6v3h20v-3a3 3 0 0 1 0-6V6H2zM13 6v12" /></svg>
                      {rest == null ? 'Úsalo en tu pedido' : rest === 0 ? 'Sin usos disponibles' : `${rest} ${rest === 1 ? 'uso disponible' : 'usos disponibles'}`}
                    </li>
                  </ul>
                </div>

                {/* Talón del cupón */}
                <div className="pm-talon">
                  <div className="pm-corte" aria-hidden="true" />
                  <button type="button" className={`pm-codigo ${copiado === p.id ? 'ok' : ''}`} onClick={() => copiar(p)} aria-label={`Copiar código ${p.codigo}`}>
                    <span className="pm-codigo-t">{p.codigo}</span>
                    <span className="pm-codigo-a">
                      <svg {...ic} width={13} height={13}>
                        {copiado === p.id ? <path d="M5 12l4 4 10-10" /> : <path d="M9 9h11v11H9zM5 15V5h10" />}
                      </svg>
                      {copiado === p.id ? '¡Copiado!' : 'Copiar'}
                    </span>
                  </button>
                  <button type="button" className={`pm-pedir ${activo ? 'ok' : ''}`} onClick={() => (activo ? window.dispatchEvent(new Event(EV_ABRIR)) : aplicar(p))}>
                    <svg {...ic} width={17} height={17}>
                      {activo
                        ? <path d="M5 12l4 4 10-10" />
                        : <><path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" /><circle cx="9.5" cy="19.2" r="1.4" /><circle cx="17" cy="19.2" r="1.4" /></>}
                    </svg>
                    {activo ? 'Aplicado · Ver carrito' : 'Aplicar a mi carrito'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {nav.hay && (
          <button type="button" className="pm-flecha sig" onClick={() => mover(1)} disabled={!nav.sig} aria-label="Promoción siguiente">
            <svg {...ic} width={20} height={20}><path d="M9 6l6 6-6 6" /></svg>
          </button>
        )}
      </div>

      {nav.hay && (
        <div className="pm-puntos" role="tablist" aria-label="Elegir promoción">
          {promos.map((p, i) => (
            <button key={p.id} type="button" role="tab" aria-selected={i === indice} aria-label={`Ir a ${p.nombre}`} className={i === indice ? 'on' : ''} onClick={() => irA(i)} />
          ))}
        </div>
      )}
      </div>

      <aside className="pm-pasos-caja" aria-label="Cómo usar tu cupón">
        <h4 className="pm-pasos-h">Cómo usar tu cupón</h4>
        <ol className="pm-pasos">
          <li className="pm-paso">
            <span className="pm-num">1</span>
            <div><b>Elige tu joya</b><small>Explora el catálogo y agrégala a tu carrito.</small></div>
          </li>
          <li className={`pm-paso ${hayAplicado ? 'hecho' : ''}`}>
            <span className="pm-num">
              {hayAplicado ? <svg {...ic} width={16} height={16} strokeWidth={2.4}><path d="M5 12l4 4 10-10" /></svg> : '2'}
            </span>
            <div><b>Aplica el cupón</b><small>Pulsa «Aplicar a mi carrito» o copia el código.</small></div>
          </li>
          <li className="pm-paso">
            <span className="pm-num">3</span>
            <div><b>Pide con descuento</b><small>Verás tu ahorro en el total antes de pedir.</small></div>
          </li>
        </ol>
      </aside>
      </div>

      {visor && <VisorFoto p={visor} logo={logo} onCerrar={cerrarVisor} />}
    </>
  );
}

const CSS = `
  .pm-tit { margin-bottom: 26px; text-align: center; }
  .pm-tit small { display: block; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--o, #b08d3c); margin-bottom: 4px; }
  .pm-tit h3 { font-size: 26px; }

  .pm-carrusel { position: relative; }
  .pm-pista { display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; padding: 10px 4px 28px;
    scrollbar-width: none; -ms-overflow-style: none; outline: none; }
  .pm-pista::-webkit-scrollbar { display: none; }
  /* Centra cuando caben todas, sin cortar la primera cuando hay scroll */
  .pm-pista > .pm-card:first-child { margin-left: auto; }
  .pm-pista > .pm-card:last-child { margin-right: auto; }

  .pm-card { flex: 0 0 280px; scroll-snap-align: start; display: flex; flex-direction: column; overflow: hidden; border-radius: 18px; color: #f3ead2; border: 1px solid transparent;
    background: linear-gradient(175deg, #0c3322, #07140e 55%, #030806) padding-box,
      linear-gradient(150deg, rgba(240,220,148,.8), rgba(201,166,74,.15) 45%, rgba(201,166,74,.5)) border-box;
    box-shadow: 0 12px 28px rgba(0,0,0,.26); }

  /* Foto */
  .pm-foto { position: relative; aspect-ratio: 4 / 2.5; background: #07211a; overflow: hidden; }
  .pm-foto > img:first-child { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .pm-foto > img:first-child { transition: transform .6s ease; transform-origin: 50% 45%; }
  .pm-zoom { position: absolute; inset: 0; z-index: 1; padding: 0; border: 0; background: transparent; cursor: zoom-in; }
  .pm-sello, .pm-aviso, .pm-desc { z-index: 2; pointer-events: none; }
  @media (hover: hover) { .pm-foto:hover > img:first-child { transform: scale(1.18); } }

  /* Visor de foto ampliada */
  .pm-visor { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 20px 16px;
    background: rgba(3,8,6,.93); cursor: zoom-out; animation: pm-in .2s ease; }
  @keyframes pm-in { from { opacity: 0; } to { opacity: 1; } }
  .pm-visor-marco { position: relative; max-width: min(94vw, 820px); cursor: default; }
  .pm-visor-foto { display: block; max-width: 100%; max-height: 78dvh; width: auto; height: auto; margin: 0 auto; object-fit: contain; border-radius: 14px;
    border: 1px solid rgba(240,220,148,.35); box-shadow: 0 20px 60px rgba(0,0,0,.6); }
  .pm-visor-logo { position: absolute; right: 12px; bottom: 12px; width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(240,220,148,.8); box-shadow: 0 3px 12px rgba(0,0,0,.55); pointer-events: none; }
  .pm-visor p { margin: 0; text-align: center; font-family: var(--serif, Georgia, serif); font-size: 18px; color: #f3e2a6; }
  .pm-visor-x { position: absolute; top: 14px; right: 14px; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(240,220,148,.4); background: rgba(8,24,19,.8); color: #f3e2a6; font-size: 26px; line-height: 1; cursor: pointer; }
  .pm-zoom:focus-visible, .pm-visor-x:focus-visible { outline: 2px solid #d8b95f; outline-offset: -3px; }

  .pm-vacio { position: absolute; inset: 0; display: grid; place-items: center; color: #b08d3c; opacity: .6; }
  .pm-velo { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,8,6,.35) 0%, transparent 35%, rgba(3,8,6,.88) 100%); }
  .pm-sello { position: absolute; top: 10px; left: 10px; width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid #d8b95f; background: #0a3d2a; box-shadow: 0 2px 8px rgba(0,0,0,.5); }
  .pm-aviso { position: absolute; top: 11px; right: 10px; display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 99px; font-size: 10px; font-weight: 600; color: #f3e2a6;
    background: rgba(5,16,12,.72); border: 1px solid rgba(240,220,148,.35); backdrop-filter: blur(4px); }
  .pm-aviso i { width: 6px; height: 6px; border-radius: 50%; background: #e0b73f; }
  .pm-aviso.urg { color: #ffd0c9; border-color: rgba(255,160,150,.5); }
  .pm-aviso.urg i { background: #ff8f83; }
  .pm-desc { position: absolute; left: 14px; right: 14px; bottom: 9px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .pm-desc b { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-variant-numeric: lining-nums tabular-nums; font-size: 24px; font-weight: 800; line-height: 1; color: #f6e7aa; text-shadow: 0 2px 12px rgba(0,0,0,.55); }
  .pm-desc small { font-size: 10.5px; color: #efe9d6; }

  /* Cuerpo */
  .pm-cuerpo { display: flex; flex-direction: column; gap: 5px; padding: 13px 16px 10px; }
  .pm-ey { font-size: 9px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #d8b95f; }
  .pm-nom { margin: 0; font-size: 19px; line-height: 1.15; color: #f3ead2; font-family: var(--serif, Georgia, serif); font-weight: 500; }
  .pm-txt { margin: 0; font-size: 12px; line-height: 1.45; color: rgba(243,234,210,.74); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pm-datos { list-style: none; margin: 4px 0 0; padding: 9px 0 0; border-top: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 6px; }
  .pm-datos li { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #d6dcd7; }
  .pm-datos svg { flex: 0 0 auto; color: #d8b95f; }

  /* Talón con muescas (el color de las muescas es el fondo crema de la sección) */
  .pm-talon { position: relative; display: flex; flex-direction: column; gap: 9px; padding: 15px 16px 16px; margin-top: auto; }
  .pm-corte { position: absolute; top: 0; left: 14px; right: 14px; border-top: 1.5px dashed rgba(216,185,95,.4); }
  .pm-corte::before, .pm-corte::after { content: ""; position: absolute; top: -9px; width: 16px; height: 16px; border-radius: 50%; background: var(--crema, #f6f4ee); box-shadow: inset 0 0 0 1px rgba(216,185,95,.35); }
  .pm-corte::before { left: -22px; }
  .pm-corte::after { right: -22px; }

  .pm-codigo { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 8px 12px; border-radius: 10px; cursor: pointer; font: inherit;
    color: #ecd07a; background: rgba(216,185,95,.07); border: 1px dashed rgba(216,185,95,.6); transition: background .2s, border-color .2s; }
  .pm-codigo:hover { background: rgba(216,185,95,.16); border-color: #ecd07a; }
  .pm-codigo.ok { border-color: #8fdcb0; color: #8fdcb0; background: rgba(143,220,176,.1); }
  .pm-codigo-t { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; font-weight: 700; letter-spacing: .12em; }
  .pm-codigo-a { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }

  .pm-pedir { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; min-height: 40px; padding: 0 16px; border: 0; border-radius: 99px; cursor: pointer;
    font: 800 10.5px/1 system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #1c1608; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c);
    box-shadow: 0 6px 16px rgba(176,141,60,.35); transition: transform .2s, box-shadow .2s; }
  .pm-pedir:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(176,141,60,.45); }
  .pm-pedir.ok { color: #0b2a1b; background: linear-gradient(135deg, #b9efcd, #7fd69a); box-shadow: none; }
  .pm-codigo:focus-visible, .pm-pedir:focus-visible, .pm-flecha:focus-visible, .pm-puntos button:focus-visible, .pm-pista:focus-visible { outline: 2px solid #d8b95f; outline-offset: 3px; }

  /* Flechas */
  .pm-flecha { position: absolute; top: calc(50% - 28px); z-index: 3; width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; cursor: pointer; color: #f3e2a6;
    background: linear-gradient(160deg, #0f5f3b, #06241a); border: 1px solid rgba(240,220,148,.55); box-shadow: 0 8px 20px rgba(0,0,0,.35); transition: opacity .2s, transform .2s; }
  .pm-flecha:hover:not(:disabled) { transform: scale(1.07); }
  .pm-flecha:disabled { opacity: 0; pointer-events: none; }
  .pm-flecha.ant { left: -14px; }
  .pm-flecha.sig { right: -14px; }

  /* Puntos */
  .pm-puntos { display: flex; justify-content: center; align-items: center; gap: 8px; }
  .pm-puntos button { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 99px; cursor: pointer; background: #cfc7ae; transition: width .25s, background .25s; }
  .pm-puntos button.on { width: 26px; background: linear-gradient(90deg, #b08d3c, #e0b73f); }

  .pm-tit p { margin: 8px auto 0; max-width: 420px; font-size: 13.5px; line-height: 1.5; color: #6b7a72; }

  /* Composición: pasos + tarjeta, con un halo dorado de fondo */
  .pm-vit { position: relative; display: grid; gap: 28px; }
  .pm-vit::before { content: ""; position: absolute; inset: -40px -8%; pointer-events: none; z-index: 0;
    background: radial-gradient(ellipse 45% 60% at 62% 50%, rgba(224,183,63,.2), transparent 70%); }
  .pm-vit > * { position: relative; z-index: 1; }
  .pm-col { min-width: 0; }
  .pm-vit.uno { grid-template-columns: minmax(0, 330px) 296px; justify-content: center; align-items: center; gap: 56px; }
  .pm-vit.uno .pm-pasos-caja { order: -1; }

  .pm-pasos-caja { min-width: 0; }
  .pm-pasos-h { margin: 0 0 20px; font-family: var(--serif, Georgia, serif); font-size: 20px; font-weight: 500; color: var(--v, #0b4a2e); }
  .pm-pasos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 22px; }
  .pm-paso { position: relative; display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 14px; align-items: start; }
  .pm-paso:not(:last-child)::after { content: ""; position: absolute; left: 18px; top: 42px; bottom: -20px; width: 1px; background: linear-gradient(var(--o2, #e0b73f), transparent); }
  .pm-num { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; font-family: var(--serif, Georgia, serif); font-size: 17px; color: var(--v, #0b4a2e);
    background: #fffdf6; border: 1px solid var(--o2, #e0b73f); box-shadow: 0 0 0 4px rgba(224,183,63,.12); }
  .pm-paso.hecho .pm-num { color: #1c1608; background: linear-gradient(135deg, #f0d680, #c9a548); border-color: transparent; }
  .pm-paso b { display: block; font-size: 14px; color: #14201a; margin-top: 2px; }
  .pm-paso small { display: block; margin-top: 3px; font-size: 12.5px; line-height: 1.45; color: #6b7a72; }

  /* Varias promos: pasos en fila debajo del carrusel */
  .pm-vit:not(.uno) .pm-pasos-caja { max-width: 920px; width: 100%; margin: 0 auto; padding-top: 24px; border-top: 1px solid #e3dfcd; }
  .pm-vit:not(.uno) .pm-pasos-h { text-align: center; }
  .pm-vit:not(.uno) .pm-pasos { flex-direction: row; gap: 24px; }
  .pm-vit:not(.uno) .pm-paso { flex: 1; }
  .pm-vit:not(.uno) .pm-paso::after { display: none; }

  @media (max-width: 820px) {
    .pm-vit.uno { grid-template-columns: minmax(0, 1fr); gap: 22px; }
    .pm-vit.uno .pm-pasos-caja { order: 2; max-width: 360px; width: 100%; margin: 0 auto; }
    .pm-vit.uno .pm-col { max-width: 300px; margin: 0 auto; }
    .pm-vit:not(.uno) .pm-pasos { flex-direction: column; gap: 20px; }
    .pm-vit:not(.uno) .pm-paso::after { display: block; }
    .pm-vit:not(.uno) .pm-pasos-caja { max-width: 360px; }
    .pm-vit:not(.uno) .pm-pasos-h { text-align: left; }
  }

  @media (max-width: 600px) {
    .pm-tit h3 { font-size: 22px; }
    .pm-pista { gap: 14px; scroll-snap-type: x mandatory; }
    .pm-card { flex-basis: min(262px, 78vw); scroll-snap-align: center; }
    .pm-nom { font-size: 18px; }
    .pm-flecha { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pm-pista { scroll-behavior: auto; }
    .pm-foto > img:first-child { transition: none; }
    .pm-visor { animation: none; }
    .pm-pedir, .pm-flecha, .pm-puntos button { transition: none; }
  }
`;