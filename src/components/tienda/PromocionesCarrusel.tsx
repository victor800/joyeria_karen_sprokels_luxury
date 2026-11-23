// 📁 RUTA: src/components/tienda/PromocionesCarrusel.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { estadoPromo, type Promocion } from '@/types/promocion';
import { rutaFoto } from '@/lib/foto-url';

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaLarga(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return m && d ? `${d} ${MESES[m - 1]} ${y}` : iso;
}

function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function cuentaRegresiva(hasta: string, hoy: string) {
  const n = diasEntre(hoy, hasta);
  if (n <= 0) return 'Termina hoy';
  if (n === 1) return 'Termina mañana';
  return `Quedan ${n} días`;
}

const IC = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

type Props = {
  promos: Promocion[];
  hoy: string;
  logoUrl?: string;
  /** Se llama al pulsar "Aplicar a mi carrito" con el código del cupón */
  onAplicar?: (codigo: string) => void;
};

function TarjetaPromo({ p, hoy, logoUrl, onAplicar }: { p: Promocion; hoy: string; logoUrl: string; onAplicar?: (c: string) => void }) {
  const [copiado, setCopiado] = useState(false);
  const urgente = diasEntre(hoy, p.hasta) <= 2;
  const restantes = p.usosMax > 0 ? Math.max(0, p.usosMax - p.usos) : null;
  const pct = p.usosMax > 0 ? Math.min(100, Math.round((p.usos / p.usosMax) * 100)) : 0;
  const valor = p.tipo === 'porcentaje' ? `−${p.valor}%` : `−$${numero.format(p.valor)}`;
  const etiqueta = p.tipo === 'porcentaje' ? 'de descuento' : 'de descuento en COP';

  async function copiar() {
    try {
      await navigator.clipboard.writeText(p.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {}
  }

  return (
    <article className="pv-card">
      {/* Foto */}
      <div className="pv-foto">
        {p.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rutaFoto(p.fotoUrl)} alt={p.nombre} loading="lazy" decoding="async" />
        ) : (
          <span className="pv-foto-vacio" aria-hidden>
            <svg width="44" height="44" viewBox="0 0 24 24" {...IC}>
              <path d="M6 3h12l4 6-10 12L2 9z" />
              <path d="M2 9h20M12 21 8 9l4-6 4 6z" />
            </svg>
          </span>
        )}
        <div className="pv-velo" />

        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pv-logo" src={logoUrl} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
        )}

        <span className={`pv-aviso ${urgente ? 'urg' : ''}`}>
          <i />
          {cuentaRegresiva(p.hasta, hoy)}
        </span>

        <div className="pv-desc">
          <b>{valor}</b>
          <small>{etiqueta}</small>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="pv-cuerpo">
        <span className="pv-tag">Cupón exclusivo</span>
        <h3>{p.nombre}</h3>
        <p className="pv-texto">{p.descripcion || 'Descuento especial en tu próxima compra.'}</p>

        <ul className="pv-datos">
          <li>
            <svg width="15" height="15" viewBox="0 0 24 24" {...IC} aria-hidden>
              <rect x="3" y="4" width="18" height="17" rx="3" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Válido hasta el {fechaLarga(p.hasta)}
          </li>
          <li>
            <svg width="15" height="15" viewBox="0 0 24 24" {...IC} aria-hidden>
              <path d="M2 9a3 3 0 0 0 0 6v3h20v-3a3 3 0 0 1 0-6V6H2zM13 6v12" />
            </svg>
            {restantes === null ? 'Sin límite de usos' : restantes === 0 ? 'Sin usos disponibles' : `${restantes} ${restantes === 1 ? 'uso disponible' : 'usos disponibles'}`}
          </li>
        </ul>
        {restantes !== null && (
          <div className="pv-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Cupones usados">
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Talón del cupón */}
      <div className="pv-talon">
        <div className="pv-corte" aria-hidden />
        <button type="button" className="pv-codigo" onClick={copiar} aria-label={`Copiar código ${p.codigo}`}>
          <span>{p.codigo}</span>
          <em>
            <svg width="13" height="13" viewBox="0 0 24 24" {...IC} aria-hidden>
              {copiado ? <path d="M5 12l4 4 10-10" /> : <path d="M9 9h11v11H9zM5 15V5h10" />}
            </svg>
            {copiado ? 'Copiado' : 'Copiar'}
          </em>
        </button>
        <button type="button" className="pv-cta" onClick={() => onAplicar?.(p.codigo)}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...IC} aria-hidden>
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="18" cy="20" r="1.4" />
            <path d="M2 3h3l2.7 12.4a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6" />
          </svg>
          Aplicar a mi carrito
        </button>
      </div>
    </article>
  );
}

export default function PromocionesCarrusel({ promos, hoy, logoUrl = '', onAplicar }: Props) {
  const activas = useMemo(() => promos.filter((p) => estadoPromo(p, hoy) === 'activa'), [promos, hoy]);
  const pista = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const [puede, setPuede] = useState({ ant: false, sig: false });

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const hijo = el.firstElementChild as HTMLElement | null;
    const paso = hijo ? hijo.offsetWidth + 20 : el.clientWidth;
    setIndice(Math.round(el.scrollLeft / paso));
    setPuede({ ant: el.scrollLeft > 4, sig: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [medir, activas.length]);

  const mover = (dir: 1 | -1) => {
    const el = pista.current;
    const hijo = el?.firstElementChild as HTMLElement | null;
    if (!el || !hijo) return;
    el.scrollBy({ left: dir * (hijo.offsetWidth + 20), behavior: 'smooth' });
  };

  const irA = (i: number) => {
    const el = pista.current;
    const hijo = el?.firstElementChild as HTMLElement | null;
    if (!el || !hijo) return;
    el.scrollTo({ left: i * (hijo.offsetWidth + 20), behavior: 'smooth' });
  };

  if (activas.length === 0) return null;
  const varias = activas.length > 1;

  return (
    <section className="pv-seccion" aria-label="Promociones">
      <style>{CSS}</style>

      <header className="pv-cab">
        <span>Ofertas del momento</span>
        <h2>Promociones para ti</h2>
      </header>

      <div className={`pv-carrusel ${varias ? 'varias' : ''}`}>
        {varias && (
          <button type="button" className="pv-flecha ant" onClick={() => mover(-1)} disabled={!puede.ant} aria-label="Promoción anterior">
            <svg width="20" height="20" viewBox="0 0 24 24" {...IC} aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        )}

        <div className="pv-pista" ref={pista} onScroll={medir} tabIndex={0} aria-label="Lista de promociones">
          {activas.map((p) => (
            <TarjetaPromo key={p.id} p={p} hoy={hoy} logoUrl={logoUrl} onAplicar={onAplicar} />
          ))}
        </div>

        {varias && (
          <button type="button" className="pv-flecha sig" onClick={() => mover(1)} disabled={!puede.sig} aria-label="Promoción siguiente">
            <svg width="20" height="20" viewBox="0 0 24 24" {...IC} aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>

      {varias && (
        <div className="pv-puntos" role="tablist" aria-label="Elegir promoción">
          {activas.map((p, i) => (
            <button key={p.id} type="button" role="tab" aria-selected={i === indice} aria-label={`Ir a ${p.nombre}`} className={i === indice ? 'on' : ''} onClick={() => irA(i)} />
          ))}
        </div>
      )}
    </section>
  );
}

const CSS = `
.pv-seccion,.pv-seccion *{box-sizing:border-box}
.pv-seccion{--pv-bg:#f4f3ee;--pv-oro:#d9b95a;--pv-oro-2:#b8923a;--pv-verde:#12372e;padding:56px 0 64px;width:100%}
.pv-cab{text-align:center;margin-bottom:34px;padding:0 16px}
.pv-cab span{display:block;font-size:.7rem;letter-spacing:.28em;text-transform:uppercase;color:#b8923a}
.pv-cab h2{margin:8px 0 0;font-family:var(--font-playfair),serif;font-size:2.1rem;font-weight:500;color:#1b1f1d}

.pv-carrusel{position:relative;max-width:1180px;margin:0 auto;padding:0 16px}
.pv-pista{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding:14px 4px 30px;justify-content:center;
  scrollbar-width:none;-ms-overflow-style:none;outline:none}
.pv-pista::-webkit-scrollbar{display:none}
.pv-carrusel.varias .pv-pista{justify-content:flex-start;padding-left:calc(50% - 170px);padding-right:calc(50% - 170px)}
@media (min-width:1100px){
  .pv-carrusel.varias .pv-pista{padding-left:4px;padding-right:4px}
}

/* Tarjeta vertical */
.pv-card{flex:0 0 340px;scroll-snap-align:center;display:flex;flex-direction:column;overflow:hidden;border-radius:22px;color:#efe9d6;border:1px solid transparent;
  background:linear-gradient(170deg,#12332a,#091a14) padding-box,linear-gradient(150deg,rgba(240,220,148,.8),rgba(201,166,74,.15) 45%,rgba(201,166,74,.5)) border-box;
  box-shadow:0 16px 36px rgba(8,28,22,.28)}

/* Foto con descuento superpuesto */
.pv-foto{position:relative;aspect-ratio:4/3.2;background:#0e241c;overflow:hidden}
.pv-foto>img:first-child{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pv-foto-vacio{position:absolute;inset:0;display:grid;place-items:center;color:#c9a64a;opacity:.55}
.pv-velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,16,12,.35) 0%,transparent 35%,rgba(5,16,12,.85) 100%)}
.pv-logo{position:absolute;top:12px;left:12px;width:40px;height:40px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(240,220,148,.8);background:#0a3d2a;box-shadow:0 2px 8px rgba(0,0,0,.5)}
.pv-aviso{position:absolute;top:14px;right:12px;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:.7rem;font-weight:600;color:#f3e2a6;background:rgba(8,24,19,.72);border:1px solid rgba(240,220,148,.35);backdrop-filter:blur(4px)}
.pv-aviso i{width:6px;height:6px;border-radius:50%;background:#e2b946}
.pv-aviso.urg{color:#ffd0c9;border-color:rgba(255,160,150,.5)}
.pv-aviso.urg i{background:#ff8f83}
.pv-desc{position:absolute;left:16px;right:16px;bottom:12px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pv-desc b{font-family:var(--font-playfair),serif;font-size:2.2rem;font-weight:600;line-height:1;color:#f6e7aa;text-shadow:0 2px 12px rgba(0,0,0,.5)}
.pv-desc small{font-size:.78rem;color:#efe9d6}

/* Cuerpo */
.pv-cuerpo{display:flex;flex-direction:column;gap:8px;padding:18px 20px 16px}
.pv-tag{font-size:.66rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#c9a64a}
.pv-cuerpo h3{margin:0;font-family:var(--font-playfair),serif;font-size:1.55rem;font-weight:500;line-height:1.15;color:#f6efd9}
.pv-texto{margin:0;font-size:.85rem;line-height:1.5;color:#b4bfb7;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.55em}
.pv-datos{list-style:none;margin:6px 0 0;padding:12px 0 0;border-top:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:8px}
.pv-datos li{display:flex;align-items:center;gap:9px;font-size:.8rem;color:#d6dcd7}
.pv-datos svg{flex:0 0 auto;color:#c9a64a}
.pv-barra{height:5px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.pv-barra i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#c9a64a,#f0dc94)}

/* Talón con muescas */
.pv-talon{position:relative;display:flex;flex-direction:column;gap:12px;padding:20px 20px 20px;margin-top:auto}
.pv-corte{position:absolute;top:0;left:14px;right:14px;border-top:1.5px dashed rgba(201,166,74,.4)}
.pv-corte::before,.pv-corte::after{content:"";position:absolute;top:-11px;width:20px;height:20px;border-radius:50%;background:var(--pv-bg);box-shadow:inset 0 0 0 1px rgba(201,166,74,.35)}
.pv-corte::before{left:-24px}
.pv-corte::after{right:-24px}
.pv-codigo{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:12px 14px;border-radius:12px;cursor:pointer;font:inherit;color:#e8d38a;background:rgba(201,166,74,.07);border:1px dashed rgba(201,166,74,.55)}
.pv-codigo:hover{background:rgba(201,166,74,.15)}
.pv-codigo span{font-family:ui-monospace,monospace;font-size:1.05rem;font-weight:700;letter-spacing:.14em}
.pv-codigo em{display:inline-flex;align-items:center;gap:6px;font-style:normal;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#c9a64a}
.pv-cta{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;min-height:48px;padding:0 18px;border:0;border-radius:999px;cursor:pointer;font:inherit;font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#12372e;background:linear-gradient(180deg,#e6c966,#c29a3c);box-shadow:0 6px 16px rgba(184,146,58,.35);transition:transform .15s ease,box-shadow .15s ease}
.pv-cta:hover{transform:translateY(-1px);box-shadow:0 10px 20px rgba(184,146,58,.45)}
.pv-cta:active{transform:translateY(0)}

/* Flechas */
.pv-flecha{position:absolute;top:calc(50% - 20px);z-index:3;width:46px;height:46px;display:grid;place-items:center;border-radius:50%;cursor:pointer;color:#f3e2a6;
  background:linear-gradient(160deg,#164a3d,#0d2b24);border:1px solid rgba(240,220,148,.55);box-shadow:0 8px 20px rgba(8,28,22,.35);transition:opacity .2s,transform .2s}
.pv-flecha:hover:not(:disabled){transform:scale(1.07)}
.pv-flecha:disabled{opacity:0;pointer-events:none}
.pv-flecha.ant{left:0}
.pv-flecha.sig{right:0}
.pv-flecha:focus-visible,.pv-codigo:focus-visible,.pv-cta:focus-visible,.pv-puntos button:focus-visible,.pv-pista:focus-visible{outline:2px solid #c9a64a;outline-offset:3px}

/* Puntos */
.pv-puntos{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:4px}
.pv-puntos button{width:8px;height:8px;padding:0;border:0;border-radius:999px;cursor:pointer;background:#cfc7ae;transition:width .25s ease,background .25s ease}
.pv-puntos button.on{width:26px;background:linear-gradient(90deg,#c9a64a,#e6c966)}

@media (max-width:640px){
  .pv-seccion{padding:40px 0 48px}
  .pv-cab h2{font-size:1.7rem}
  .pv-carrusel{padding:0}
  .pv-pista{padding-left:calc(50% - 150px) !important;padding-right:calc(50% - 150px) !important;gap:14px}
  .pv-card{flex-basis:300px}
  .pv-flecha{display:none}
}
@media (prefers-reduced-motion:reduce){
  .pv-pista{scroll-behavior:auto}
  .pv-cta,.pv-flecha,.pv-puntos button{transition:none}
}
`;