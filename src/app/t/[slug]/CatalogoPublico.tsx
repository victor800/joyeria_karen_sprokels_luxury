// 📁 RUTA: src/app/t/[slug]/CatalogoPublico.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export type VarianteP = { tamano: string; peso: string; stock: number; precio: number; fotos: string[] };
export type PrendaP = {
  id: string; codigo: string; nombre: string; categoria: string; quilate: string; descripcion: string;
  variantes: VarianteP[];
};

const cop = (n: number) => (n > 0 ? `$${n.toLocaleString('es-CO')}` : 'Consultar precio');
const LEY: Record<string, string> = { '24': '999', '18': '750', '14': '585' };
const PUREZA: Record<string, string> = { '24': '99.9', '18': '75.0', '14': '58.5' };
const estadoDe = (stock: number) =>
  stock <= 0 ? { t: 'Agotada', c: 'ag' } : stock === 1 ? { t: 'Última unidad', c: 'ul' } : { t: 'Disponible', c: 'ok' };
const LIKES_KEY = 'jks_me_encanta'; // ids que este visitante ya marcó (solo en su navegador)
const waHref = (wa: string, p: PrendaP, v: VarianteP) => {
  const msg = `Hola, me interesa ${p.nombre} (${p.codigo})${v.tamano ? ` en tamaño ${v.tamano}` : ''}. ¿Está disponible?`;
  return wa === '#' ? '#' : `${wa}?text=${encodeURIComponent(msg)}`;
};

/* Pase automático de fotos: lento y con fundido suave */
const PASE_MS = 5600;      // tiempo que se queda cada foto en la tarjeta
const PASE_MODAL_MS = 6000; // tiempo en la vista rápida
const MAX_FOTOS = 6;
const sinMovimiento = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Iconos ---------- */
const ic = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const Chev = ({ d }: { d: 'l' | 'r' }) => (<svg {...ic}><path d={d === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></svg>);
const Cerrar = () => (<svg {...ic}><path d="M6 6l12 12M18 6L6 18" /></svg>);
const Ojo = () => (<svg {...ic}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>);
const Chat = () => (<svg {...ic}><path d="M21 12a8 8 0 0 1-11.7 7L4 20l1.1-4.2A8 8 0 1 1 21 12z" /></svg>);
const Ok = () => (<svg {...ic} width={13} height={13}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></svg>);
const Corazon = ({ on }: { on: boolean }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);
const Gema = () => (<svg {...ic} width={44} height={44} strokeWidth={1.3}><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></svg>);

/* ---------- Corazón "me encanta": blanco → rojo ---------- */
function BotonLike({ liked, onClick, nombre }: { liked: boolean; onClick: () => void; nombre: string }) {
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      className={`cp-like ${liked ? 'on' : ''} ${pop ? 'pop' : ''}`}
      aria-pressed={liked}
      aria-label={liked ? `Quitar me encanta de ${nombre}` : `Me encanta ${nombre}`}
      title={liked ? 'Quitar de mis favoritas' : 'Me encanta'}
      onClick={(e) => { e.stopPropagation(); if (!liked) setPop(true); onClick(); }}
      onAnimationEnd={() => setPop(false)}
    >
      <Corazon on={liked} />
      <span className="cp-like-aro" aria-hidden="true" />
    </button>
  );
}

/* ---------- Tarjeta del catálogo ---------- */
function Tarjeta({ p, wa, delay, onAbrir, liked, onLike }: { p: PrendaP; wa: string; delay: number; onAbrir: (vi: number, fi: number) => void; liked: boolean; onLike: () => void }) {
  const [vi, setVi] = useState(0);
  const [fi, setFi] = useState(0);
  const [visto, setVisto] = useState(false);   // ya apareció alguna vez (animación de entrada)
  const [viendo, setViendo] = useState(false); // está en pantalla ahora mismo (el pase de fotos solo corre si se ve)
  const item = useRef<HTMLDivElement>(null);

  const v = p.variantes[Math.min(vi, p.variantes.length - 1)];
  const multi = p.variantes.length > 1;
  const fotos = v.fotos.slice(0, MAX_FOTOS);
  const n = fotos.length;
  const k0 = n ? Math.min(fi, n - 1) : 0;
  const agotada = v.stock <= 0;
  const est = estadoDe(v.stock);
  const spec = [v.peso ? `${v.peso} g` : '', v.tamano].filter(Boolean).join('  ·  ');

  const elegir = (k: number) => { setVi(k); setFi(0); };

  // Aparece con un suave desplazamiento al entrar en pantalla, y avisa si la tarjeta está a la vista
  useEffect(() => {
    const el = item.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisto(true); setViendo(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisto(true);
      setViendo(e.isIntersecting);
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pase automático: una foto cada PASE_MS, con un pequeño desfase por tarjeta para que no cambien todas a la vez
  useEffect(() => {
    if (n < 2 || !viendo || sinMovimiento()) return;
    const espera = PASE_MS + (fi === 0 ? (delay % 4) * 700 : 0);
    const t = setTimeout(() => setFi((k) => (k + 1) % n), espera);
    return () => clearTimeout(t);
  }, [fi, n, viendo, delay]);

  // Inclinación 3D suave + luz que sigue el cursor (solo mouse; no re-renderiza)
  const mover = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const f = el.querySelector('.cp-foto')?.getBoundingClientRect();
    if (f) {
      el.style.setProperty('--mx', `${(((e.clientX - f.left) / f.width) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(((e.clientY - f.top) / f.height) * 100).toFixed(1)}%`);
    }
    el.style.setProperty('--rx', `${((0.5 - py) * 5).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * 7).toFixed(2)}deg`);
  };
  const salir = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--rx', '0deg');
    e.currentTarget.style.setProperty('--ry', '0deg');
  };

  return (
    <div ref={item} className={`cp-item ${visto ? 'vis' : ''}`} style={{ transitionDelay: `${Math.min(delay, 6) * 70}ms` }}>
      <article className={`cp-card ${agotada ? 'ago' : ''}`} onPointerMove={mover} onPointerLeave={salir}>
        <button type="button" className={`cp-foto ${n > 1 ? 'multi' : ''}`} onClick={() => onAbrir(vi, k0)} aria-haspopup="dialog" aria-label={`Vista rápida de ${p.nombre}`}>
          {n ? (
            fotos.map((u, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${vi}-${k}`} className={`cp-img ${k === k0 ? 'on' : ''}`} src={u} alt="" loading="lazy" />
            ))
          ) : (
            <span className="cp-vacio"><Gema /></span>
          )}
          <span className="cp-luz" aria-hidden="true" />
          <span className="cp-ley"><Ok /> ORO {p.quilate}K</span>
          {n > 1 && (
            <span className="cp-prog" aria-hidden="true">
              {fotos.map((_, k) => (<i key={k} className={k === k0 ? 'on' : ''} />))}
            </span>
          )}
          <span className="cp-rapida"><Ojo /> Vista rápida</span>
        </button>

        <BotonLike liked={liked} onClick={onLike} nombre={p.nombre} />

        <div className="cp-cuerpo">
          <div className="cp-ey"><span>{p.categoria}</span><b>{p.codigo}</b></div>
          <h3 className="cp-nom" title={p.nombre}>{p.nombre}</h3>
          <i className="cp-linea" aria-hidden="true" />

          {multi && (
            <div className="cp-tams" role="group" aria-label="Tamaño">
              {p.variantes.map((x, k) => (
                <button key={k} type="button" aria-pressed={k === vi} onClick={() => elegir(k)}>{x.tamano || `Opción ${k + 1}`}</button>
              ))}
            </div>
          )}
          {spec && <p className="cp-spec">{spec}</p>}

          <div className="cp-fila">
            <span className="cp-precio">{cop(v.precio)}{v.precio > 0 && <small>COP</small>}</span>
            <span className={`cp-est ${est.c}`}><i aria-hidden="true" />{est.t}</span>
          </div>

          <a className={`cp-pedir ${agotada ? 'off' : ''}`} href={agotada ? undefined : waHref(wa, p, v)} target="_blank" rel="noopener noreferrer" aria-disabled={agotada}>
            <Chat /> {agotada ? 'Agotada por ahora' : 'Pedir por WhatsApp'}
          </a>
        </div>
      </article>
    </div>
  );
}

/* ---------- Vista rápida: ficha a pantalla completa con galería y zoom ---------- */
function VistaRapida({ p, wa, logo, vi0, fi0, onCerrar, liked, onLike }: { p: PrendaP; wa: string; logo?: string; vi0: number; fi0: number; onCerrar: () => void; liked: boolean; onLike: () => void }) {
  const [vi, setVi] = useState(Math.min(vi0, p.variantes.length - 1));
  const [fi, setFi] = useState(fi0);
  const [pausa, setPausa] = useState(false); // el pase automático se detiene mientras el cursor está sobre la foto (zoom)
  const v = p.variantes[vi];
  const fotos = v.fotos.slice(0, MAX_FOTOS);
  const n = fotos.length;
  const i = n ? Math.min(fi, n - 1) : 0;
  const est = estadoDe(v.stock);
  const agotada = v.stock <= 0;
  const ley = LEY[p.quilate];
  const pureza = PUREZA[p.quilate];
  const tiles = [
    { k: 'Peso', val: v.peso ? `${v.peso} g` : '' },
    { k: 'Tamaño', val: v.tamano },
    { k: 'Pureza', val: pureza ? `${pureza}% Au` : '' },
  ].filter((t) => t.val);

  const ir = (d: number) => { if (n > 1) setFi((i + d + n) % n); };
  const elegir = (k: number) => { setVi(k); setFi(0); };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      else if (e.key === 'ArrowRight') ir(1);
      else if (e.key === 'ArrowLeft') ir(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  // Pase automático lento; al cambiar de foto a mano el reloj vuelve a empezar
  useEffect(() => {
    if (n < 2 || pausa || sinMovimiento()) return;
    const t = setTimeout(() => setFi((i + 1) % n), PASE_MODAL_MS);
    return () => clearTimeout(t);
  }, [i, n, pausa, vi]);

  const zoom = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--zx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty('--zy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };

  return (
    <div className="cp-m" role="dialog" aria-modal="true" aria-label={p.nombre} onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="cp-m-hoja">
        <button type="button" className="cp-m-x" onClick={onCerrar} aria-label="Cerrar" autoFocus><Cerrar /></button>

        <div className="cp-m-gal">
          <div
            className="cp-m-foto"
            onPointerMove={zoom}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPausa(true); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPausa(false); }}
          >
            {n ? (
              fotos.map((u, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${vi}-${k}`} className={`cp-m-img ${k === i ? 'on' : ''}`} src={u} alt={k === i ? (n > 1 ? `${p.nombre} (${i + 1} de ${n})` : p.nombre) : ''} aria-hidden={k !== i} />
              ))
            ) : (
              <span className="cp-vacio"><Gema /></span>
            )}
            <span className="cp-ley"><Ok /> ORO {p.quilate}K{ley ? ` · LEY ${ley}` : ''}</span>
            <BotonLike liked={liked} onClick={onLike} nombre={p.nombre} />
            {n > 1 && (
              <>
                <button type="button" className="cp-m-nav prev" onClick={() => ir(-1)} aria-label="Foto anterior"><Chev d="l" /></button>
                <button type="button" className="cp-m-nav next" onClick={() => ir(1)} aria-label="Foto siguiente"><Chev d="r" /></button>
              </>
            )}
          </div>
          {n > 1 && (
            <div className="cp-m-tiras">
              {fotos.map((u, k) => (
                <button key={u + k} type="button" className={k === i ? 'on' : ''} onClick={() => setFi(k)} aria-label={`Foto ${k + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cp-m-info">
          <div className="cp-m-top">
            <span className="cp-sku">SKU: {p.codigo}</span>
            <span className={`cp-est pill ${est.c}`}><i aria-hidden="true" />{est.t}</span>
          </div>
          <h3 className="cp-m-nom">{p.nombre}</h3>
          <p className="cp-m-desc">{p.descripcion || 'Pieza en oro certificado.'}</p>

          {p.variantes.length > 1 && (
            <div className="cp-tams" role="group" aria-label="Tamaño">
              {p.variantes.map((x, k) => (
                <button key={k} type="button" aria-pressed={k === vi} onClick={() => elegir(k)}>{x.tamano || `Opción ${k + 1}`}</button>
              ))}
            </div>
          )}

          {tiles.length > 0 && (
            <div className="cp-tiles" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
              {tiles.map((t) => (<div key={t.k}><span>{t.k}</span><b title={t.val}>{t.val}</b></div>))}
            </div>
          )}

          <div className="cp-m-precio">
            <span>Precio</span>
            <b>{cop(v.precio)}{v.precio > 0 && <small>COP</small>}</b>
          </div>

          <a className={`cp-pedir grande ${agotada ? 'off' : ''}`} href={agotada ? undefined : waHref(wa, p, v)} target="_blank" rel="noopener noreferrer" aria-disabled={agotada}>
            <Chat /> {agotada ? 'Agotada por ahora' : 'Pedir por WhatsApp'}
          </a>

          <div className="cp-m-sello">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" aria-hidden="true" />
            )}
            <span>Oro certificado{ley ? ` · Ley ${ley}` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Catálogo ---------- */
export default function CatalogoPublico({ prendas, wa, logo }: { prendas: PrendaP[]; wa: string; logo?: string }) {
  const [cat, setCat] = useState('todas');
  const [rapida, setRapida] = useState<{ id: string; vi: number; fi: number } | null>(null);
  const [mios, setMios] = useState<Set<string>>(() => new Set());
  const pendientes = useRef<Set<string>>(new Set());

  // Recuerda en este navegador qué piezas ya marcó el visitante
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(LIKES_KEY) || '[]');
      if (Array.isArray(a)) setMios(new Set(a.filter((x): x is string => typeof x === 'string')));
    } catch { /* sin almacenamiento: funciona igual, solo no se recuerda */ }
  }, []);

  const poner = (id: string, quiere: boolean) =>
    setMios((cur) => {
      const sig = new Set(cur);
      if (quiere) sig.add(id); else sig.delete(id);
      try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(sig))); } catch { /* ignorar */ }
      return sig;
    });

  // El corazón cambia al instante; si el servidor falla, vuelve a como estaba
  const alternarLike = async (id: string) => {
    if (pendientes.current.has(id)) return;
    const quiere = !mios.has(id);
    pendientes.current.add(id);
    poner(id, quiere);
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accion: quiere ? 'like' : 'unlike' }),
      });
      if (!res.ok) throw new Error('like');
    } catch {
      poner(id, !quiere);
    } finally {
      pendientes.current.delete(id);
    }
  };

  const cats = Array.from(new Set(prendas.map((p) => p.categoria).filter(Boolean)));
  const activa = cat !== 'todas' && cats.includes(cat) ? cat : 'todas';
  const lista = prendas.filter((p) => activa === 'todas' || p.categoria === activa);
  const abierta = rapida ? prendas.find((p) => p.id === rapida.id) : undefined;

  return (
    <>
      <style>{CSS}</style>

      {cats.length > 1 && (
        <div className="cp-chips" role="group" aria-label="Categorías">
          <button type="button" aria-pressed={activa === 'todas'} onClick={() => setCat('todas')}>Todas <i>{prendas.length}</i></button>
          {cats.map((c) => (
            <button key={c} type="button" aria-pressed={activa === c} onClick={() => setCat(c)}>
              {c} <i>{prendas.filter((p) => p.categoria === c).length}</i>
            </button>
          ))}
        </div>
      )}

      <div className="cp-grid">
        {lista.map((p, k) => (
          <Tarjeta key={p.id} p={p} wa={wa} delay={k} onAbrir={(vi, fi) => setRapida({ id: p.id, vi, fi })} liked={mios.has(p.id)} onLike={() => alternarLike(p.id)} />
        ))}
      </div>

      {abierta && rapida && (
        <VistaRapida key={abierta.id} p={abierta} wa={wa} logo={logo} vi0={rapida.vi} fi0={rapida.fi} onCerrar={() => setRapida(null)} liked={mios.has(abierta.id)} onLike={() => alternarLike(abierta.id)} />
      )}
    </>
  );
}

/* ---------- Estilos ---------- */
const CSS = `
  .cp-chips { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 28px; }
  .cp-chips button { font: inherit; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; padding: 11px 20px; border-radius: 99px; border: 1px solid rgba(176,141,60,.38);
    background: transparent; color: #3c4a42; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; transition: .25s; }
  .cp-chips button i { font-style: normal; font-size: 10px; letter-spacing: .06em; color: #8a6d25; }
  .cp-chips button:hover { border-color: #b08d3c; color: #0b2d1f; }
  .cp-chips button[aria-pressed="true"] { background: #0b2d1f; border-color: #0b2d1f; color: #f3ead2; }
  .cp-chips button[aria-pressed="true"] i { color: #ecd07a; }
  .cp-chips button:focus-visible, .cp-card button:focus-visible, .cp-m button:focus-visible, .cp-pedir:focus-visible { outline: 2px solid #d8b95f; outline-offset: 2px; }

  .cp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(262px, 1fr)); gap: 28px; align-items: stretch; }
  .cp-item { opacity: 0; transform: translateY(22px); perspective: 1000px; transition: opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); }
  .cp-item.vis { opacity: 1; transform: none; }

  .cp-card { --mx: 50%; --my: 50%; --rx: 0deg; --ry: 0deg; position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; border-radius: 22px; color: #f3ead2;
    background: linear-gradient(180deg, #0d3324 0%, #0a2619 55%, #07211a 100%); border: 1px solid rgba(216,185,95,.2); box-shadow: 0 18px 40px rgba(5,28,19,.25);
    transform: rotateX(var(--rx)) rotateY(var(--ry)); transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s, border-color .35s; will-change: transform; }
  .cp-card:hover { border-color: rgba(216,185,95,.5); box-shadow: 0 30px 60px rgba(5,28,19,.38); }
  /* brillo dorado que recorre el borde al pasar el cursor */
  .cp-card::before { content: ""; position: absolute; inset: 0; z-index: 7; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0; transition: opacity .3s;
    background: linear-gradient(115deg, transparent 35%, rgba(255,232,160,.95) 50%, transparent 65%); background-size: 260% 100%; background-position: 150% 0;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
  .cp-card:hover::before { opacity: 1; animation: cpbrillo 1.5s ease both; }
  @keyframes cpbrillo { from { background-position: 150% 0; } to { background-position: -50% 0; } }

  .cp-foto { position: relative; display: block; width: 100%; aspect-ratio: 1 / 1.1; padding: 0; border: 0; background: #050d09; cursor: pointer; overflow: hidden; }
  .cp-foto::after { content: ""; position: absolute; inset: auto 0 0 0; height: 40%; z-index: 2; pointer-events: none; background: linear-gradient(to top, #0a2619 0%, rgba(10,38,25,0)); }

  /* Fotos apiladas: la activa se funde sobre la anterior, despacio, con un acercamiento casi imperceptible */
  .cp-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 38%; opacity: 0; transform: scale(1);
    transition: opacity 1.8s ease-in-out, transform 0s linear 1.8s; }
  .cp-img.on { opacity: 1; transition: opacity 1.8s ease-in-out, transform 0s; }
  .cp-foto.multi .cp-img.on { transform: scale(1.07); transition: opacity 1.8s ease-in-out, transform 9s ease-out; }

  .cp-vacio { position: absolute; inset: 0; display: grid; place-items: center; color: #b08d3c; }
  /* luz que sigue al cursor, como un foco de vitrina */
  .cp-luz { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: 0; transition: opacity .4s; mix-blend-mode: screen;
    background: radial-gradient(240px circle at var(--mx) var(--my), rgba(255,236,170,.26), transparent 62%); }
  .cp-card:hover .cp-luz { opacity: 1; }

  /* indicador discreto de cuántas fotos tiene la pieza y cuál se ve */
  .cp-prog { position: absolute; left: 50%; bottom: 62px; z-index: 4; transform: translateX(-50%); display: flex; gap: 5px; pointer-events: none; transition: opacity .3s; }
  .cp-prog i { display: block; width: 12px; height: 2px; border-radius: 2px; background: rgba(243,234,210,.4); transition: width 1s ease, background 1s ease; }
  .cp-prog i.on { width: 26px; background: #ecd07a; }
  .cp-card:hover .cp-prog { opacity: 0; }
  @media (hover: none) { .cp-card:hover .cp-prog { opacity: 1; } }

  .cp-ley { position: absolute; top: 14px; left: 14px; z-index: 4; pointer-events: none; display: inline-flex; align-items: center; gap: 7px; height: 28px; padding: 0 12px; border-radius: 99px;
    font-size: 10.5px; font-weight: 600; letter-spacing: .14em; white-space: nowrap; color: #f3ead2; background: rgba(6,24,17,.55); border: 1px solid rgba(236,208,122,.5); backdrop-filter: blur(8px); }
  .cp-ley svg { color: #ecd07a; }
  .cp-rapida { position: absolute; left: 50%; bottom: 46px; z-index: 4; display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 18px; border-radius: 99px; white-space: nowrap;
    font-size: 10.5px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #f3ead2; background: rgba(6,24,17,.6); border: 1px solid rgba(236,208,122,.5); backdrop-filter: blur(8px);
    opacity: 0; transform: translate(-50%, 10px); transition: opacity .3s, transform .3s; }
  .cp-card:hover .cp-rapida, .cp-foto:focus-visible .cp-rapida { opacity: 1; transform: translate(-50%, 0); }
  @media (hover: none) { .cp-rapida { opacity: 1; transform: translate(-50%, 0); } .cp-prog { bottom: 94px; } }

  .cp-cuerpo { position: relative; z-index: 5; flex: 1; display: flex; flex-direction: column; margin-top: -30px; padding: 0 22px 22px; }
  .cp-ey { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; font-size: 10px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: #d8b95f; }
  .cp-ey span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cp-ey b { flex-shrink: 0; font-weight: 500; letter-spacing: .14em; color: rgba(243,234,210,.55); }
  .mw .cp-nom { font-size: 23px; line-height: 1.2; color: #f3ead2; min-height: 2.4em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .cp-linea { display: block; width: 36px; height: 1px; margin: 12px 0 14px; background: linear-gradient(90deg, #ecd07a, rgba(236,208,122,0)); transition: width .6s cubic-bezier(.2,.8,.2,1); }
  .cp-card:hover .cp-linea { width: 100%; }

  .cp-tams { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
  .cp-tams button { font: inherit; font-size: 11px; padding: 6px 12px; border-radius: 99px; border: 1px solid rgba(216,185,95,.4); background: transparent; color: rgba(243,234,210,.88); cursor: pointer; transition: .2s; }
  .cp-tams button:hover { border-color: #d8b95f; }
  .cp-tams button[aria-pressed="true"] { background: linear-gradient(135deg, #f0d680, #b08d3c); border-color: #e6c970; color: #1c1608; font-weight: 600; }
  .cp-spec { margin: 0 0 10px; font-size: 12px; letter-spacing: .06em; color: rgba(243,234,210,.66); }

  .cp-fila { margin-top: auto; padding-top: 6px; display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .cp-precio { font-family: var(--serif, Georgia, serif); font-size: 28px; font-weight: 500; letter-spacing: .01em; color: #ecd07a; }
  .cp-precio small { font-family: system-ui, sans-serif; font-size: 10px; letter-spacing: .14em; margin-left: 7px; color: rgba(236,208,122,.6); }
  .cp-est { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 600; letter-spacing: .04em; white-space: nowrap; color: #8fdcb0; }
  .cp-est i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .cp-est.ul { color: #f0c48f; }
  .cp-est.ag { color: #f2a59d; }

  .cp-pedir { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: 16px; height: 46px; border-radius: 99px;
    font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #1c1608 !important; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c);
    transition: transform .25s, box-shadow .25s; }
  .cp-pedir::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%; transform: skewX(-20deg); background: linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent); }
  .cp-pedir:hover:not(.off) { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(176,141,60,.4); }
  .cp-pedir:hover:not(.off)::after { left: 130%; transition: left .8s ease; }
  .cp-pedir.off { background: rgba(255,255,255,.08); color: rgba(243,234,210,.55) !important; cursor: default; }
  .cp-pedir.off::after { display: none; }
  .cp-pedir.grande { height: 52px; font-size: 12px; margin-top: 4px; }
  .cp-card.ago .cp-img { filter: grayscale(.8); }
  .cp-card.ago .cp-img.on { opacity: .65; }

  /* ---------- Corazón "me encanta" ---------- */
  .cp-like { position: absolute; top: 12px; right: 12px; z-index: 6; width: 44px; height: 44px; padding: 0; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
    color: #fff; background: rgba(6,24,17,.5); border: 1px solid rgba(255,255,255,.38); backdrop-filter: blur(8px);
    transition: transform .25s, background .25s, border-color .25s, color .25s; }
  .cp-like:hover { transform: scale(1.08); background: rgba(6,24,17,.72); border-color: rgba(255,255,255,.7); }
  .cp-like.on { color: #ff4d5a; border-color: rgba(255,77,90,.65); }
  .cp-like.pop svg { animation: cplatido .6s cubic-bezier(.2,.9,.3,1.4); }
  .cp-like-aro { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #ff4d5a; opacity: 0; pointer-events: none; }
  .cp-like.pop .cp-like-aro { animation: cparo .6s ease-out; }
  @keyframes cplatido { 0% { transform: scale(.55); } 45% { transform: scale(1.4); } 100% { transform: scale(1); } }
  @keyframes cparo { 0% { transform: scale(.7); opacity: .9; } 100% { transform: scale(1.9); opacity: 0; } }
  .cp-m-foto .cp-like { top: 14px; right: 14px; }

  /* ---------- Vista rápida ---------- */
  .cp-m { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 24px; background: rgba(3,10,7,.78); backdrop-filter: blur(8px); animation: cpfade .25s both; }
  @keyframes cpfade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cppop { from { opacity: 0; transform: translateY(18px) scale(.97); } to { opacity: 1; transform: none; } }
  .cp-m-hoja { position: relative; width: 100%; max-width: 1020px; max-height: calc(100vh - 48px); overflow: auto; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    border-radius: 24px; background: #0a130f; color: #f1ede0; border: 1px solid rgba(216,185,95,.35); box-shadow: 0 40px 100px rgba(0,0,0,.6); animation: cppop .35s cubic-bezier(.2,.9,.3,1.1) both; }
  .cp-m-x { position: absolute; top: 14px; right: 14px; z-index: 10; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; padding: 0; cursor: pointer;
    border: 1px solid rgba(255,255,255,.25); background: rgba(6,24,17,.6); color: #f3ead2; backdrop-filter: blur(6px); transition: .2s; }
  .cp-m-x:hover { background: #d8b95f; color: #0b2d1f; border-color: #d8b95f; }
  .cp-m-gal { display: flex; flex-direction: column; min-width: 0; background: #050a08; }
  .cp-m-foto { position: relative; flex: 1; min-height: 460px; overflow: hidden; cursor: zoom-in; }
  /* mismas fotos apiladas con fundido largo; el zoom del cursor solo aplica a la foto visible */
  .cp-m-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transform-origin: var(--zx, 50%) var(--zy, 50%); transition: opacity 1.4s ease-in-out, transform .5s cubic-bezier(.2,.8,.2,1); }
  .cp-m-img.on { opacity: 1; }
  @media (hover: hover) { .cp-m-foto:hover .cp-m-img.on { transform: scale(1.9); } }
  .cp-m-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 5; width: 44px; height: 44px; border-radius: 50%; padding: 0; display: grid; place-items: center; cursor: pointer;
    border: 1px solid rgba(216,185,95,.55); background: rgba(6,24,17,.6); color: #ecd07a; backdrop-filter: blur(6px); transition: .2s; }
  .cp-m-nav.prev { left: 14px; } .cp-m-nav.next { right: 14px; }
  .cp-m-nav:hover { background: #d8b95f; color: #0b2d1f; }
  .cp-m-tiras { display: flex; gap: 8px; padding: 12px 14px; overflow-x: auto; border-top: 1px solid rgba(255,255,255,.06); }
  .cp-m-tiras button { flex-shrink: 0; width: 58px; height: 58px; padding: 0; border-radius: 10px; overflow: hidden; cursor: pointer; opacity: .55; background: #0e1a15; border: 1px solid rgba(255,255,255,.14); transition: .4s; }
  .cp-m-tiras button:hover { opacity: .9; }
  .cp-m-tiras button.on { opacity: 1; border-color: #ecd07a; }
  .cp-m-tiras img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .cp-m-info { min-width: 0; display: flex; flex-direction: column; gap: 16px; padding: 38px 34px 28px; background: linear-gradient(180deg, #0e1a15, #0a130f); }
  .cp-m-top { display: flex; align-items: center; gap: 10px; padding-right: 48px; }
  .cp-sku { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; letter-spacing: .08em; color: #93a09a; }
  .cp-est.pill { height: 26px; padding: 0 11px; border-radius: 99px; background: rgba(60,170,110,.14); border: 1px solid rgba(92,190,134,.28); }
  .cp-est.pill.ul { background: rgba(232,169,79,.14); border-color: rgba(232,169,79,.32); }
  .cp-est.pill.ag { background: rgba(239,100,90,.14); border-color: rgba(239,100,90,.32); }
  .mw .cp-m-nom { font-size: 32px; line-height: 1.15; color: #fff; }
  .cp-m-desc { margin: 0; font-size: 14px; line-height: 1.65; color: #b4bdb7; white-space: pre-line; }
  .cp-tiles { display: grid; gap: 8px; }
  .cp-tiles > div { min-width: 0; padding: 11px 13px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.05); }
  .cp-tiles span { display: block; font-size: 9.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #93a09a; }
  .cp-tiles b { display: block; margin-top: 4px; font-size: 16px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cp-m-precio { margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.07); }
  .cp-m-precio span { display: block; font-size: 10px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #f0c14b; }
  .cp-m-precio b { display: block; margin-top: 4px; font-family: var(--serif, Georgia, serif); font-size: 36px; font-weight: 500; color: #ecd07a; }
  .cp-m-precio small { font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: .12em; margin-left: 8px; color: rgba(236,208,122,.6); }
  .cp-m-sello { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: rgba(243,234,210,.6); }
  .cp-m-sello img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(216,185,95,.7); }

  @media (max-width: 820px) {
    .cp-m { padding: 12px; }
    .cp-m-hoja { grid-template-columns: minmax(0, 1fr); max-height: calc(100vh - 24px); }
    .cp-m-foto { min-height: 340px; }
    .cp-m-info { padding: 26px 22px 24px; }
    .mw .cp-m-nom { font-size: 26px; }
  }
  @media (max-width: 600px) { .cp-grid { grid-template-columns: minmax(0, 1fr); } }
  @media (prefers-reduced-motion: reduce) {
    .cp-item { opacity: 1; transform: none; transition: none; }
    .cp-card { transform: none !important; }
    .cp-card::before, .cp-m, .cp-m-hoja, .cp-like.pop svg, .cp-like.pop .cp-like-aro { animation: none !important; }
    .cp-img, .cp-m-img, .cp-linea, .cp-prog i { transition: none !important; }
    .cp-foto.multi .cp-img.on { transform: none; }
  }
`;