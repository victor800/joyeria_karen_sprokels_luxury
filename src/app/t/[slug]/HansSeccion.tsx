// 📁 RUTA: src/app/t/[slug]/HansSeccion.tsx   (ARCHIVO NUEVO)
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SeccionHero from './SeccionHero';
import type { HansPub } from '@/lib/hans-publico';

const LOGO_HANS = '/hans.jpeg';
/** Video del hero de Hans. Provisional: cámbialo por '/hans.mp4' cuando lo subas a /public */
const VIDEO_HANS = '/fundido.mp4';

const cop = (n: number) => (n > 0 ? `$${n.toLocaleString('es-CO')}` : 'Consultar');
const enlace = (wa: string, t: string) => (wa === '#' ? '#' : `${wa}?text=${encodeURIComponent(t)}`);
const catDe = (x: HansPub) => x.categoria.trim() || 'Otras piezas';
const hayMayor = (x: HansPub) => x.tipo === 'mayorista' || x.tipo === 'ambos';
const hayMenudeo = (x: HansPub) => x.tipo !== 'mayorista';

/* ---------- Galería (cruce lento entre fotos) ---------- */
function Galeria({ fotos, alt, auto, onClick }: { fotos: string[]; alt: string; auto?: boolean; onClick?: () => void }) {
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const n = fotos.length;
  const idx = Math.min(i, Math.max(n - 1, 0));

  useEffect(() => {
    if (!auto || n < 2 || pausa) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((k) => (k + 1) % n), 5500);
    return () => clearInterval(t);
  }, [auto, n, pausa]);

  const ir = (d: number) => setI((k) => (k + d + n) % n);

  return (
    <div className="hh-gal" onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {n === 0 && <span className="hh-nofoto">Sin foto</span>}
      {fotos.map((u, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u + k} src={u} alt={k === idx ? alt : ''} loading={k === 0 ? 'eager' : 'lazy'} draggable={false} style={{ opacity: k === idx ? 1 : 0 }} />
      ))}
      {n > 1 && (
        <>
          <button type="button" className="hh-arr prev" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); ir(-1); }}>‹</button>
          <button type="button" className="hh-arr next" aria-label="Foto siguiente" onClick={(e) => { e.stopPropagation(); ir(1); }}>›</button>
          <div className="hh-dots">
            {fotos.map((u, k) => (
              <button key={u + k} type="button" aria-label={`Ver foto ${k + 1}`} aria-pressed={k === idx} onClick={(e) => { e.stopPropagation(); setI(k); }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Bloque de precios ---------- */
function Precios({ x }: { x: HansPub }) {
  return (
    <div className="hh-pre">
      {hayMenudeo(x) && <div><span>{x.tipo === 'tejida' ? 'Precio' : 'Menudeo'}</span><b>{cop(x.menudeo)}</b></div>}
      {hayMayor(x) && (
        <div>
          <span>Al por mayor</span><b>{cop(x.mayorista)}</b>
          {x.minMayorista > 0 && <em>desde {x.minMayorista} unidades</em>}
        </div>
      )}
    </div>
  );
}

/* ---------- Tarjeta ---------- */
function Tarjeta({ x, wa, onVer }: { x: HansPub; wa: string; onVer: () => void }) {
  const agotado = x.stock <= 0;
  return (
    <article className="hh-card">
      <Galeria fotos={x.fotos} alt={x.nombre} auto onClick={onVer} />
      <div className="hh-info">
        <div className="hh-top">
          <small>{x.codigo}</small>
          {agotado ? <span className="hh-pill off">Agotado</span> : x.oro && <span className="hh-pill">Oro {x.oro}</span>}
        </div>
        <h4>{x.nombre}</h4>
        {x.descripcion && <p>{x.descripcion}</p>}
        <Precios x={x} />
        <div className="hh-btns">
          <button type="button" className="hh-b ghost" onClick={onVer}>Ver detalle</button>
          <a className="hh-b" href={enlace(wa, `Hola, me interesa ${x.nombre} (${x.codigo}) de Joyería Hans.`)} target="_blank" rel="noopener noreferrer">Pedir</a>
        </div>
      </div>
    </article>
  );
}

/* ---------- Detalle ---------- */
function Detalle({ x, wa, onClose }: { x: HansPub; wa: string; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);

  const filas: [string, string][] = [
    ['Código', x.codigo],
    ['Categoría', catDe(x)],
    ...(x.material ? [['Material', x.material] as [string, string]] : []),
    ...(x.oro ? [['Oro', `${x.oro}${x.gramos ? ` · ${x.gramos} g` : ''}`] as [string, string]] : []),
    ['Disponibles', x.stock > 0 ? `${x.stock}` : 'Agotado por ahora'],
  ];

  return (
    <div className="hh-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hh-hoja" role="dialog" aria-modal="true" aria-label={x.nombre}>
        <button type="button" className="hh-x" aria-label="Cerrar" onClick={onClose}>×</button>
        <Galeria fotos={x.fotos} alt={x.nombre} />
        <div className="hh-det">
          <h4>{x.nombre}</h4>
          {x.descripcion && <p className="hh-desc">{x.descripcion}</p>}
          <Precios x={x} />
          <dl className="hh-dl">
            {filas.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
          </dl>
          {x.detalles.length > 0 && (
            <ul className="hh-ul">{x.detalles.map((d) => <li key={d}>{d}</li>)}</ul>
          )}
          {x.video && <video className="hh-video" src={x.video} controls playsInline preload="metadata" />}
          <div className="hh-btns">
            {hayMenudeo(x) && (
              <a className="hh-b" href={enlace(wa, `Hola, quiero comprar ${x.nombre} (${x.codigo}) de Joyería Hans.`)} target="_blank" rel="noopener noreferrer">
                Pedir por WhatsApp
              </a>
            )}
            {hayMayor(x) && (
              <a className="hh-b ghost" href={enlace(wa, `Hola, quiero comprar al por mayor ${x.nombre} (${x.codigo}) de Joyería Hans${x.minMayorista ? `, mínimo ${x.minMayorista} unidades` : ''}.`)} target="_blank" rel="noopener noreferrer">
                Comprar al por mayor
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sección ---------- */
export default function HansSeccion({ items, wa }: { items: HansPub[]; wa: string }) {
  const [cat, setCat] = useState('todas');
  const [ver, setVer] = useState<HansPub | null>(null);
  const cerrar = useCallback(() => setVer(null), []);
  const cats = useMemo(() => Array.from(new Set(items.map(catDe))), [items]);

  return (
    <>
      <SeccionHero
        id="hans"
        logo={LOGO_HANS}
        alt="Joyería Hans"
        tag="Mayor y menudeo"
        titulo={<>Joyería<br />Hans</>}
        texto="Pulseras tejidas y joyas para llevar una pieza o surtir tu negocio. Compra al detal o al por mayor."
        video={VIDEO_HANS}
        wa={wa}
        msgWa="Hola, quiero información de Joyería Hans."
      >
        <style>{`
          .hh-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 26px; }
          .hh-chips button { font: inherit; font-size: 12.5px; padding: 8px 16px; border-radius: 99px; cursor: pointer; background: transparent; color: #e8e1c8; border: 1px solid rgba(224,183,63,.4); }
          .hh-chips button[aria-pressed="true"] { background: var(--o2); border-color: var(--o2); color: #1a1405; }
          .hh-cat { display: flex; align-items: baseline; gap: 12px; margin: 30px 0 16px; }
          .hh-cat:first-of-type { margin-top: 0; }
          .hh-cat h4 { margin: 0; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 26px; color: #f4efdc; }
          .hh-cat small { font-size: 12px; color: #8fa397; }
          .hh-cat i { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(224,183,63,.5), transparent); }
          .hh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr)); gap: 16px; }
          .hh-card { display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; border: 1px solid rgba(224,183,63,.3); background: linear-gradient(175deg, #0c3322, #07140e 55%, #030806); box-shadow: 0 14px 34px rgba(0,0,0,.45); }
          .hh-gal { position: relative; aspect-ratio: 1; background: #07241a; overflow: hidden; }
          .hh-gal img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 1.4s ease; user-select: none; }
          .hh-nofoto { position: absolute; inset: 0; display: grid; place-items: center; color: #b08d3c; font-size: 13px; }
          .hh-arr { position: absolute; top: 50%; transform: translateY(-50%); z-index: 2; width: 34px; height: 34px; padding: 0 0 3px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
            border: 1px solid rgba(255,255,255,.35); background: rgba(6,16,11,.6); color: #fff; font-size: 22px; line-height: 1; }
          .hh-arr:hover { background: var(--o2); color: #1a1405; border-color: var(--o2); }
          .hh-arr.prev { left: 8px; } .hh-arr.next { right: 8px; }
          .hh-dots { position: absolute; left: 50%; transform: translateX(-50%); bottom: 10px; z-index: 2; display: flex; gap: 6px; padding: 4px 8px; border-radius: 99px; background: rgba(6,16,11,.5); }
          .hh-dots button { width: 8px; height: 8px; padding: 0; border-radius: 50%; cursor: pointer; border: 1px solid rgba(255,255,255,.8); background: rgba(0,0,0,.35); }
          .hh-dots button[aria-pressed="true"] { background: var(--o2); border-color: var(--o2); }
          .hh-info { padding: 14px 15px 15px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
          .hh-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
          .hh-top small { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; letter-spacing: .08em; color: #93a09a; }
          .hh-pill { font-size: 10.5px; padding: 3px 10px; border-radius: 99px; font-weight: 600; color: var(--o2); border: 1px solid rgba(224,183,63,.45); background: rgba(224,183,63,.12); }
          .hh-pill.off { background: #5a2b25; border-color: #8a3f36; color: #ffd9d4; }
          .hh-info h4 { margin: 0; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 20px; line-height: 1.2; color: #fff; }
          .hh-info p { margin: 0; font-size: 13px; line-height: 1.5; color: #b4bdb7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .hh-pre { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
          .hh-pre > div { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); border-radius: 10px; padding: 8px 11px; }
          .hh-pre span { display: block; font-size: 11px; color: #93a09a; }
          .hh-pre b { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-weight: 700; font-size: 17px; color: var(--o3); font-variant-numeric: lining-nums tabular-nums; }
          .hh-pre em { display: block; font-style: normal; font-size: 11px; color: #93a09a; }
          .hh-btns { display: flex; gap: 8px; margin-top: auto; padding-top: 6px; flex-wrap: wrap; }
          .hh-b { flex: 1; min-height: 40px; padding: 0 14px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; text-align: center; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
            border: 1px solid transparent; background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); color: #1a1405 !important; }
          .hh-b.ghost { background: transparent; color: var(--o2) !important; border-color: rgba(224,183,63,.6); }
          .hh-b:focus-visible, .hh-chips button:focus-visible, .hh-arr:focus-visible, .hh-x:focus-visible { outline: 2px solid var(--o3); outline-offset: 2px; }
          .hh-vacio { text-align: center; color: #8fa397; font-size: 14px; padding: 20px 0; }

          /* Detalle */
          .hh-modal { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px; background: rgba(3,12,8,.75); backdrop-filter: blur(4px); }
          .hh-hoja { position: relative; width: 100%; max-width: 900px; max-height: 92vh; overflow-y: auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); border-radius: 18px; color: #f4efdc;
            border: 1px solid rgba(224,183,63,.4); background: linear-gradient(175deg, #0c3322, #07140e 60%, #030806); }
          .hh-hoja .hh-gal { aspect-ratio: auto; min-height: 420px; height: 100%; }
          .hh-x { position: absolute; top: 10px; right: 10px; z-index: 5; width: 36px; height: 36px; padding: 0 0 3px; border-radius: 50%; border: 1px solid rgba(255,255,255,.35); background: rgba(6,16,11,.7); color: #fff; font-size: 22px; line-height: 1; cursor: pointer; }
          .hh-det { padding: 22px 22px 20px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
          .hh-det h4 { margin: 0; padding-right: 40px; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 28px; line-height: 1.15; color: #fff; }
          .hh-desc { margin: 0; font-size: 14px; line-height: 1.65; color: #c5d0c8; }
          .hh-dl { margin: 0; display: grid; gap: 6px; font-size: 13px; }
          .hh-dl div { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,.08); }
          .hh-dl dt { color: #93a09a; } .hh-dl dd { margin: 0; text-align: right; }
          .hh-ul { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.7; color: #c5d0c8; }
          .hh-video { width: 100%; max-height: 220px; border-radius: 12px; background: #000; }
          @media (max-width: 760px) {
            .hh-modal { padding: 0; align-items: end; }
            .hh-hoja { grid-template-columns: 1fr; max-height: 94vh; border-radius: 18px 18px 0 0; }
            .hh-hoja .hh-gal { min-height: 0; height: auto; aspect-ratio: 1; }
          }
        `}</style>

        <div className="mw-tit"><small>Catálogo Hans</small><h3>Una pieza o por mayor</h3><i /></div>

        {items.length === 0 ? (
          <p className="hh-vacio">Muy pronto: nuestro catálogo de Hans.</p>
        ) : (
          <>
            <div className="hh-chips" role="group" aria-label="Categorías de Hans">
              <button type="button" aria-pressed={cat === 'todas'} onClick={() => setCat('todas')}>Todas</button>
              {cats.map((c) => (
                <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
            {cats.filter((c) => cat === 'todas' || c === cat).map((c) => {
              const lista = items.filter((x) => catDe(x) === c);
              return (
                <section key={c}>
                  <div className="hh-cat"><h4>{c}</h4><small>{lista.length} {lista.length === 1 ? 'pieza' : 'piezas'}</small><i /></div>
                  <div className="hh-grid">
                    {lista.map((x) => <Tarjeta key={x.id} x={x} wa={wa} onVer={() => setVer(x)} />)}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </SeccionHero>

      {ver && <Detalle x={ver} wa={wa} onClose={cerrar} />}
    </>
  );
}