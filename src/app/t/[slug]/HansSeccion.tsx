// 📁 RUTA: src/app/t/[slug]/HansSeccion.tsx   (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SeccionHero from './SeccionHero';
import type { HansPub } from '@/lib/hans-publico';

const LOGO_HANS = '/hans.jpeg';
/** Video del hero de Hans. Provisional: cámbialo por '/hans.mp4' cuando lo subas a /public */
const VIDEO_HANS = '/fundido.mp4';
const LS_KEY = 'hans-carrito-v1';
const PAGOS = ['Efectivo', 'Transferencia', 'Contra entrega', 'Tarjeta / PSE'];

const cop = (n: number) => (n > 0 ? `$${n.toLocaleString('es-CO')}` : 'Consultar');
const enlace = (wa: string, t: string) => (wa === '#' ? '#' : `${wa}?text=${encodeURIComponent(t)}`);
const catDe = (x: HansPub) => x.categoria.trim() || 'Otras piezas';
const hayMayor = (x: HansPub) => x.tipo === 'mayorista' || x.tipo === 'ambos';
const hayMenudeo = (x: HansPub) => x.tipo !== 'mayorista';

type Modo = 'menudeo' | 'mayorista';
type Linea = { key: string; codigo: string; nombre: string; modo: Modo; cant: number; precio: number; min: number; max: number; foto: string };

const precioDe = (x: HansPub, m: Modo) => (m === 'mayorista' ? x.mayorista || x.menudeo : x.menudeo || x.mayorista);
const minDe = (x: HansPub, m: Modo) => (m === 'mayorista' ? Math.max(1, x.minMayorista || 1) : 1);
const maxDe = (x: HansPub) => (x.stock > 0 ? x.stock : 999);

/* ---------- Galería (cruce lento entre fotos) ---------- */
function Galeria({ fotos, alt, auto, mini, onClick }: { fotos: string[]; alt: string; auto?: boolean; mini?: boolean; onClick?: () => void }) {
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
    <div className={`hh-gal${mini ? ' mini' : ''}`} onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {n === 0 && <span className="hh-nofoto">Sin foto</span>}
      {fotos.map((u, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u + k} src={u} alt={k === idx ? alt : ''} loading={k === 0 ? 'eager' : 'lazy'} draggable={false} style={{ opacity: k === idx ? 1 : 0 }} />
      ))}
      {n > 1 && (
        <>
          {!mini && (
            <>
              <button type="button" className="hh-arr prev" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); ir(-1); }}>‹</button>
              <button type="button" className="hh-arr next" aria-label="Foto siguiente" onClick={(e) => { e.stopPropagation(); ir(1); }}>›</button>
            </>
          )}
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

const IcoBolsa = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 7h12l1 13H5z" /><path d="M9 7a3 3 0 0 1 6 0" />
  </svg>
);

/* ---------- Tarjeta (compacta) ---------- */
function Tarjeta({ x, onVer, onAdd }: { x: HansPub; onVer: () => void; onAdd: (m: Modo) => void }) {
  const agotado = x.stock <= 0;
  const modo: Modo = hayMenudeo(x) ? 'menudeo' : 'mayorista';
  const precio = precioDe(x, modo);
  return (
    <article className="hh-card">
      <Galeria fotos={x.fotos} alt={x.nombre} auto mini onClick={onVer} />
      <div className="hh-info">
        <div className="hh-top">
          <small>{x.codigo}</small>
          {agotado ? <span className="hh-pill off">Agotado</span> : x.oro && <span className="hh-pill">Oro {x.oro}</span>}
        </div>
        <h4 onClick={onVer}>{x.nombre}</h4>
        <div className="hh-pc">
          <b>{cop(precio)}</b>
          {hayMenudeo(x) && hayMayor(x) && x.mayorista > 0 && <em>Mayor {cop(x.mayorista)}{x.minMayorista > 0 ? ` · ${x.minMayorista}+ u.` : ''}</em>}
          {!hayMenudeo(x) && x.minMayorista > 0 && <em>Mínimo {x.minMayorista} unidades</em>}
        </div>
        <div className="hh-btns">
          <button type="button" className="hh-b ghost" onClick={onVer}>Detalles</button>
          <button type="button" className="hh-b" disabled={agotado || precio <= 0} onClick={() => onAdd(modo)}>
            <IcoBolsa /> Agregar
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------- Detalle (popup) ---------- */
function Detalle({ x, onClose, onAdd }: { x: HansPub; onClose: () => void; onAdd: (m: Modo) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);

  const agotado = x.stock <= 0;
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
              <button type="button" className="hh-b" disabled={agotado || precioDe(x, 'menudeo') <= 0} onClick={() => { onAdd('menudeo'); onClose(); }}>
                <IcoBolsa /> Agregar al carrito
              </button>
            )}
            {hayMayor(x) && (
              <button type="button" className={`hh-b${hayMenudeo(x) ? ' ghost' : ''}`} disabled={agotado || precioDe(x, 'mayorista') <= 0} onClick={() => { onAdd('mayorista'); onClose(); }}>
                <IcoBolsa /> Agregar al por mayor{x.minMayorista > 1 ? ` (${x.minMayorista} u.)` : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Carrito de Hans + pedido ---------- */
type Form = { cliente: string; telefono: string; email: string; zona: string; barrio: string; direccion: string; metodo_pago: string; notas: string; hp: string };
const FORM0: Form = { cliente: '', telefono: '', email: '', zona: '', barrio: '', direccion: '', metodo_pago: 'Efectivo', notas: '', hp: '' };

function CarritoHans({ lineas, setLineas, abierto, setAbierto, wa, zonas, domicilio }: {
  lineas: Linea[]; setLineas: React.Dispatch<React.SetStateAction<Linea[]>>; abierto: boolean; setAbierto: (v: boolean) => void; wa: string;
  zonas: string[]; domicilio: number;   // ⟵ CAMBIO: de la hoja Configuración
}) {
  const [f, setF] = useState<Form>(FORM0);
  const [err, setErr] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ codigo: string; total: number } | null>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const uds = lineas.reduce((s, l) => s + l.cant, 0);
  const subtotal = lineas.reduce((s, l) => s + l.cant * l.precio, 0);
  const total = subtotal + (lineas.length ? domicilio : 0);   // ⟵ CAMBIO: prendas + domicilio

  useEffect(() => {
    if (!abierto) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [abierto, setAbierto]);

  const cambiar = (key: string, d: number) =>
    setLineas((a) => a.map((l) => (l.key === key ? { ...l, cant: Math.max(l.min, Math.min(l.max, l.cant + d)) } : l)));
  const quitar = (key: string) => setLineas((a) => a.filter((l) => l.key !== key));

  async function enviar() {
    setErr('');
    if (!lineas.length) return setErr('Tu carrito está vacío.');
    if (!f.cliente.trim()) return setErr('Escribe tu nombre.');
    if (f.telefono.replace(/\D/g, '').length < 10) return setErr('Escribe un celular válido (10 dígitos).');
    if (!f.zona.trim()) return setErr(zonas.length ? 'Elige la zona de entrega.' : 'Escribe la zona de entrega.');   // ⟵ CAMBIO
    if (!f.direccion.trim()) return setErr('Escribe la dirección de entrega.');
    setEnviando(true);
    try {
      const res = await fetch('/api/hans/pedido-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, items: lineas.map((l) => ({ codigo: l.codigo, modo: l.modo, cant: l.cant })) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo enviar el pedido');
      setListo({ codigo: String(d.codigo ?? ''), total: Number(d.total) || total });
      setLineas([]);
      setF(FORM0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo enviar el pedido');
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) return null;
  const cerrar = () => { setAbierto(false); setListo(null); setErr(''); };

  return (
    <div className="hc-fondo" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <aside className="hc-hoja" role="dialog" aria-modal="true" aria-label="Pedido Joyería Hans">
        <header className="hc-head">
          <div><small>Joyería Hans</small><h3>{listo ? '¡Pedido recibido!' : 'Tu pedido'}</h3></div>
          <button type="button" className="hh-x static" aria-label="Cerrar" onClick={cerrar}>×</button>
        </header>

        {listo ? (
          <div className="hc-body">
            <div className="hc-ok">
              <span>✓</span>
              <p>Tu pedido <b>{listo.codigo || 'quedó registrado'}</b> por <b>{cop(listo.total)}</b> llegó a Joyería Hans. Te contactaremos para confirmar la entrega y el pago.</p>
            </div>
            <div className="hh-btns" style={{ flexDirection: 'column' }}>
              {wa !== '#' && (
                <a className="hh-b ghost" href={enlace(wa, `Hola, hice el pedido ${listo.codigo} en Joyería Hans.`)} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
              )}
              <button type="button" className="hh-b" onClick={cerrar}>Listo</button>
            </div>
          </div>
        ) : lineas.length === 0 ? (
          <div className="hc-body"><p className="hh-vacio">Aún no has agregado piezas de Hans.</p></div>
        ) : (
          <>
            <div className="hc-body">
              <ul className="hc-lns">
                {lineas.map((l) => (
                  <li key={l.key}>
                    {l.foto
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={l.foto} alt="" />
                      : <span className="hc-nf" />}
                    <div className="hc-li">
                      <b>{l.nombre}</b>
                      <small>{l.codigo} · {l.modo === 'mayorista' ? `Mayor (mín. ${l.min})` : 'Menudeo'} · {cop(l.precio)}</small>
                      <div className="hc-row">
                        <div className="hc-step">
                          <button type="button" aria-label="Quitar una unidad" disabled={l.cant <= l.min} onClick={() => cambiar(l.key, -1)}>−</button>
                          <span aria-live="polite">{l.cant}</span>
                          <button type="button" aria-label="Agregar una unidad" disabled={l.cant >= l.max} onClick={() => cambiar(l.key, 1)}>+</button>
                        </div>
                        <strong>{cop(l.cant * l.precio)}</strong>
                        <button type="button" className="hc-del" aria-label={`Quitar ${l.nombre}`} onClick={() => quitar(l.key)}>Quitar</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <h4 className="hc-h">Tus datos y entrega</h4>
              <div className="hc-g">
                <div className="full"><label htmlFor="hc-n">Nombre *</label><input id="hc-n" className="hc-in" autoComplete="name" value={f.cliente} onChange={set('cliente')} /></div>
                <div><label htmlFor="hc-t">Celular / WhatsApp *</label><input id="hc-t" className="hc-in" inputMode="tel" autoComplete="tel" value={f.telefono} onChange={set('telefono')} placeholder="300 000 0000" /></div>
                <div><label htmlFor="hc-e">Correo (opcional)</label><input id="hc-e" className="hc-in" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></div>
                <div className="full"><label htmlFor="hc-d">Dirección de entrega *</label><input id="hc-d" className="hc-in" autoComplete="street-address" value={f.direccion} onChange={set('direccion')} placeholder="Calle, número, apto / indicaciones" /></div>
                {/* ⟵ CAMBIO: zona de la hoja Configuración + barrio */}
                <div>
                  <label htmlFor="hc-z">Zona de entrega *</label>
                  {zonas.length ? (
                    <select id="hc-z" className="hc-in" value={f.zona} onChange={set('zona')}>
                      <option value="">Elige tu zona</option>
                      {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  ) : (
                    <input id="hc-z" className="hc-in" value={f.zona} onChange={set('zona')} placeholder="Ciudad o municipio" />
                  )}
                </div>
                <div><label htmlFor="hc-c">Barrio</label><input id="hc-c" className="hc-in" value={f.barrio} onChange={set('barrio')} /></div>
              </div>
              <span className="hc-l">Método de pago</span>
              <div className="hc-chips" role="group" aria-label="Método de pago">
                {PAGOS.map((p) => (
                  <button key={p} type="button" aria-pressed={f.metodo_pago === p} onClick={() => setF((x) => ({ ...x, metodo_pago: p }))}>{p}</button>
                ))}
              </div>
              <label className="hc-l" htmlFor="hc-o">Notas (opcional)</label>
              <textarea id="hc-o" className="hc-in" rows={2} value={f.notas} onChange={set('notas')} placeholder="Color, indicaciones de entrega…" />
              {/* Campo trampa anti-spam: las personas no lo ven */}
              <input className="hc-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.hp} onChange={set('hp')} />
            </div>
            <footer className="hc-foot">
              {err && <p className="hc-err" role="alert">{err}</p>}
              {/* ⟵ CAMBIO: prendas + domicilio = total */}
              <div className="hc-sub"><span>Prendas · {uds} u.</span><span>{cop(subtotal)}</span></div>
              <div className="hc-sub"><span>Domicilio{f.zona ? ` · ${f.zona}` : ''}</span><span>{domicilio > 0 ? cop(domicilio) : 'Por confirmar'}</span></div>
              <div className="hc-tot"><span>Total</span><b>{cop(total)}</b></div>
              <button type="button" className="hh-b big" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar pedido'}</button>
              <p className="hc-nota">Te contactamos para confirmar la entrega y el pago.</p>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

/* ---------- Sección ---------- */
export default function HansSeccion({ items, wa, zonas = [], domicilio = 0 }: { items: HansPub[]; wa: string; zonas?: string[]; domicilio?: number }) {
  const [cat, setCat] = useState('todas');
  const [ver, setVer] = useState<HansPub | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [carrito, setCarrito] = useState(false);
  const [aviso, setAviso] = useState('');
  const hidratado = useRef(false);
  const tAviso = useRef<number | undefined>(undefined);
  const cerrar = useCallback(() => setVer(null), []);
  const cats = useMemo(() => Array.from(new Set(items.map(catDe))), [items]);

  /* Recuperar y guardar el carrito en este navegador */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const a = JSON.parse(raw);
        if (Array.isArray(a)) {
          // solo conserva piezas que todavía existen en el catálogo
          setLineas(a.filter((l: Linea) => items.some((x) => x.codigo === l.codigo)).map((l: Linea) => ({ ...l, cant: Math.max(l.min, Math.min(l.max, l.cant)) })));
        }
      }
    } catch { /* sin almacenamiento */ }
    hidratado.current = true;
  }, [items]);
  useEffect(() => {
    if (!hidratado.current) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(lineas)); } catch { /* sin almacenamiento */ }
  }, [lineas]);

  const agregar = useCallback((x: HansPub, modo: Modo) => {
    const min = minDe(x, modo);
    const max = maxDe(x);
    const key = `${x.codigo}|${modo}`;
    setLineas((a) => {
      const i = a.findIndex((l) => l.key === key);
      if (i >= 0) return a.map((l, j) => (j === i ? { ...l, cant: Math.min(l.max, l.cant + 1) } : l));
      return [...a, { key, codigo: x.codigo, nombre: x.nombre, modo, cant: Math.min(max, min), precio: precioDe(x, modo), min, max, foto: x.fotos[0] ?? '' }];
    });
    setAviso(`${x.nombre} agregado${modo === 'mayorista' && min > 1 ? ` (${min} u.)` : ''}`);
    window.clearTimeout(tAviso.current);
    tAviso.current = window.setTimeout(() => setAviso(''), 2200);
  }, []);

  const uds = lineas.reduce((s, l) => s + l.cant, 0);

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
          .hh-cat { display: flex; align-items: baseline; gap: 12px; margin: 30px 0 14px; }
          .hh-cat:first-of-type { margin-top: 0; }
          .hh-cat h4 { margin: 0; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 24px; color: #f4efdc; }
          .hh-cat small { font-size: 12px; color: #8fa397; }
          .hh-cat i { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(224,183,63,.5), transparent); }

          /* Tarjetas más pequeñas */
          .hh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 196px), 1fr)); gap: 14px; }
          .hh-card { display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; border: 1px solid rgba(224,183,63,.3); background: linear-gradient(175deg, #0c3322, #07140e 55%, #030806); box-shadow: 0 12px 28px rgba(0,0,0,.4);
            transition: transform .35s cubic-bezier(.2,.7,.2,1), border-color .3s, box-shadow .35s; }
          .hh-card:hover { transform: translateY(-5px); border-color: var(--o3); box-shadow: 0 22px 40px rgba(0,0,0,.5), 0 0 26px rgba(224,183,63,.2); }
          .hh-gal { position: relative; aspect-ratio: 1; background: #07241a; overflow: hidden; }
          .hh-card .hh-gal { aspect-ratio: 1 / 1.05; }
          .hh-gal img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 1.4s ease; user-select: none; }
          .hh-nofoto { position: absolute; inset: 0; display: grid; place-items: center; color: #b08d3c; font-size: 13px; }
          .hh-arr { position: absolute; top: 50%; transform: translateY(-50%); z-index: 2; width: 34px; height: 34px; padding: 0 0 3px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
            border: 1px solid rgba(255,255,255,.35); background: rgba(6,16,11,.6); color: #fff; font-size: 22px; line-height: 1; }
          .hh-arr:hover { background: var(--o2); color: #1a1405; border-color: var(--o2); }
          .hh-arr.prev { left: 8px; } .hh-arr.next { right: 8px; }
          .hh-dots { position: absolute; left: 50%; transform: translateX(-50%); bottom: 8px; z-index: 2; display: flex; gap: 5px; padding: 3px 7px; border-radius: 99px; background: rgba(6,16,11,.5); }
          .hh-dots button { width: 7px; height: 7px; padding: 0; border-radius: 50%; cursor: pointer; border: 1px solid rgba(255,255,255,.8); background: rgba(0,0,0,.35); }
          .hh-dots button[aria-pressed="true"] { background: var(--o2); border-color: var(--o2); }
          .hh-info { padding: 11px 12px 12px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
          .hh-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
          .hh-top small { font-family: ui-monospace, Menlo, monospace; font-size: 9.5px; letter-spacing: .06em; color: #93a09a; }
          .hh-pill { font-size: 10px; padding: 2px 8px; border-radius: 99px; font-weight: 600; color: var(--o2); border: 1px solid rgba(224,183,63,.45); background: rgba(224,183,63,.12); white-space: nowrap; }
          .hh-pill.off { background: #5a2b25; border-color: #8a3f36; color: #ffd9d4; }
          .hh-info h4 { margin: 0; cursor: pointer; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 17px; line-height: 1.2; color: #fff; min-height: 2.4em;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .hh-pc b { display: block; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-weight: 700; font-size: 18px; color: var(--o3); font-variant-numeric: lining-nums tabular-nums; }
          .hh-pc em { display: block; font-style: normal; font-size: 11px; color: #9fb1a5; margin-top: 1px; }
          .hh-pre { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
          .hh-pre > div { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); border-radius: 10px; padding: 8px 11px; }
          .hh-pre span { display: block; font-size: 11px; color: #93a09a; }
          .hh-pre b { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-weight: 700; font-size: 17px; color: var(--o3); font-variant-numeric: lining-nums tabular-nums; }
          .hh-pre em { display: block; font-style: normal; font-size: 11px; color: #93a09a; }
          .hh-btns { display: flex; gap: 8px; margin-top: auto; padding-top: 4px; flex-wrap: wrap; }
          .hh-b { flex: 1; min-height: 38px; padding: 0 10px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-align: center; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
            border: 1px solid transparent; background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); color: #1a1405 !important; transition: filter .2s, transform .2s; }
          .hh-b:hover:not(:disabled) { filter: brightness(1.08); }
          .hh-b:disabled { opacity: .4; cursor: not-allowed; }
          .hh-b.ghost { background: transparent; color: var(--o2) !important; border-color: rgba(224,183,63,.6); }
          .hh-b.big { min-height: 50px; flex: none; width: 100%; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; }
          .hh-b:focus-visible, .hh-chips button:focus-visible, .hh-arr:focus-visible, .hh-x:focus-visible { outline: 2px solid var(--o3); outline-offset: 2px; }
          .hh-card .hh-btns .ghost { flex: 0 0 auto; }
          .hh-vacio { text-align: center; color: #8fa397; font-size: 14px; padding: 20px 0; }

          /* Detalle (popup) */
          .hh-modal { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px; background: rgba(3,12,8,.75); backdrop-filter: blur(4px); }
          .hh-hoja { position: relative; width: 100%; max-width: 900px; max-height: 92vh; overflow-y: auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); border-radius: 18px; color: #f4efdc;
            border: 1px solid rgba(224,183,63,.4); background: linear-gradient(175deg, #0c3322, #07140e 60%, #030806); animation: hh-up .3s cubic-bezier(.2,.7,.2,1) both; }
          @keyframes hh-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
          .hh-hoja .hh-gal { aspect-ratio: auto; min-height: 420px; height: 100%; }
          .hh-x { position: absolute; top: 10px; right: 10px; z-index: 5; width: 36px; height: 36px; padding: 0 0 3px; border-radius: 50%; border: 1px solid rgba(255,255,255,.35); background: rgba(6,16,11,.7); color: #fff; font-size: 22px; line-height: 1; cursor: pointer; }
          .hh-x.static { position: static; flex: 0 0 auto; }
          .hh-det { padding: 22px 22px 20px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
          .hh-det h4 { margin: 0; padding-right: 40px; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 28px; line-height: 1.15; color: #fff; }
          .hh-desc { margin: 0; font-size: 14px; line-height: 1.65; color: #c5d0c8; }
          .hh-dl { margin: 0; display: grid; gap: 6px; font-size: 13px; }
          .hh-dl div { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,.08); }
          .hh-dl dt { color: #93a09a; } .hh-dl dd { margin: 0; text-align: right; }
          .hh-ul { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.7; color: #c5d0c8; }
          .hh-video { width: 100%; max-height: 220px; border-radius: 12px; background: #000; }
          .hh-det .hh-btns { flex-direction: column; } .hh-det .hh-b { min-height: 46px; }

          /* Botón flotante del pedido + aviso */
          .hc-fab { position: fixed; left: 16px; bottom: 18px; z-index: 60; display: inline-flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 20px 0 16px; border-radius: 99px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 700;
            color: #1a1405; border: 0; background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); box-shadow: 0 14px 30px rgba(0,0,0,.45), 0 0 0 4px rgba(3,12,8,.35); animation: hc-pop .4s cubic-bezier(.2,.7,.2,1) both; }
          .hc-fab b { min-width: 22px; height: 22px; padding: 0 6px; display: grid; place-items: center; border-radius: 99px; font-size: 12px; color: var(--o3); background: #06241a; }
          @keyframes hc-pop { from { opacity: 0; transform: translateY(14px) scale(.9); } to { opacity: 1; transform: none; } }
          .hc-aviso { position: fixed; left: 50%; transform: translateX(-50%); bottom: 88px; z-index: 70; max-width: calc(100vw - 32px); padding: 11px 18px; border-radius: 99px; font-size: 13px; font-weight: 600; color: #f4efdc; background: rgba(6,36,26,.95);
            border: 1px solid rgba(224,183,63,.6); box-shadow: 0 14px 30px rgba(0,0,0,.45); animation: hc-pop .25s ease both; }
          .hc-aviso::before { content: "✓ "; color: var(--o3); }

          /* Carrito de Hans */
          .hc-fondo { position: fixed; inset: 0; z-index: 110; display: flex; justify-content: flex-end; background: rgba(3,12,8,.72); backdrop-filter: blur(4px); }
          .hc-hoja { width: min(100%, 460px); height: 100%; display: flex; flex-direction: column; color: #f4efdc; border-left: 1px solid rgba(224,183,63,.4); background: linear-gradient(175deg, #0c3322, #07140e 55%, #030806); animation: hc-in .3s cubic-bezier(.2,.7,.2,1) both; }
          @keyframes hc-in { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
          .hc-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid rgba(224,183,63,.25); }
          .hc-head small { display: block; font-size: 10.5px; letter-spacing: .24em; text-transform: uppercase; color: var(--o2); margin-bottom: 4px; }
          .hc-head h3 { margin: 0; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 24px; color: #fff; }
          .hc-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; overscroll-behavior: contain; }
          .hc-lns { list-style: none; margin: 0 0 20px; padding: 0; display: grid; gap: 12px; }
          .hc-lns li { display: flex; gap: 12px; padding: 10px; border-radius: 14px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); }
          .hc-lns img, .hc-nf { flex: 0 0 64px; width: 64px; height: 64px; border-radius: 10px; object-fit: cover; background: #07241a; }
          .hc-li { min-width: 0; flex: 1; }
          .hc-li b { display: block; font-size: 14px; color: #fff; line-height: 1.25; }
          .hc-li small { display: block; margin: 2px 0 8px; font-size: 11.5px; color: #9fb1a5; }
          .hc-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
          .hc-row strong { margin-left: auto; font-family: system-ui, sans-serif; font-size: 14px; color: var(--o3); }
          .hc-step { display: inline-flex; align-items: center; border: 1px solid rgba(224,183,63,.45); border-radius: 99px; overflow: hidden; }
          .hc-step button { width: 32px; height: 32px; cursor: pointer; border: 0; background: transparent; color: var(--o3); font-size: 18px; line-height: 1; }
          .hc-step button:disabled { opacity: .3; cursor: not-allowed; }
          .hc-step span { min-width: 28px; text-align: center; font-size: 13px; font-weight: 700; }
          .hc-del { border: 0; background: none; cursor: pointer; font: inherit; font-size: 12px; color: #f0a48f; text-decoration: underline; padding: 4px; }
          .hc-h { margin: 4px 0 12px; font: 600 11px/1 system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: var(--o2); }
          .hc-g { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .hc-g .full { grid-column: 1 / -1; }
          .hc-g label, .hc-l { display: block; margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #b9c4be; }
          .hc-l { margin-top: 14px; }
          .hc-in { width: 100%; padding: 11px 13px; font: inherit; font-size: 14px; color: #e8ede9; background: #18211d; border: 1px solid #33423b; border-radius: 12px; }
          .hc-in:focus-visible { outline: none; border-color: var(--o2); box-shadow: 0 0 0 3px rgba(224,183,63,.2); }
          .hc-chips { display: flex; flex-wrap: wrap; gap: 8px; }
          .hc-chips button { cursor: pointer; padding: 8px 14px; font: inherit; font-size: 12.5px; color: #cfd6d2; background: #18211d; border: 1px solid #33423b; border-radius: 99px; }
          .hc-chips button[aria-pressed="true"] { color: #1a1405; font-weight: 600; background: linear-gradient(135deg, var(--o3), var(--o2)); border-color: transparent; }
          .hc-hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
          .hc-foot { padding: 14px 20px 18px; border-top: 1px solid rgba(224,183,63,.25); background: rgba(3,12,8,.6); display: grid; gap: 10px; }
          .hc-sub { display: flex; justify-content: space-between; font-size: 12.5px; color: #9fb1a5; }
          .hc-sub span:last-child { font-family: system-ui, sans-serif; color: #dfe5e1; }
          select.hc-in { appearance: none; -webkit-appearance: none; padding-right: 34px; background-image: linear-gradient(45deg, transparent 50%, #e0b73f 50%), linear-gradient(135deg, #e0b73f 50%, transparent 50%); background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%; background-size: 5px 5px; background-repeat: no-repeat; }
          .hc-tot { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; color: #b9c4be; }
          .hc-tot b { font-family: system-ui, sans-serif; font-size: 22px; color: var(--o3); }
          .hc-err { margin: 0; padding: 9px 12px; font-size: 12.5px; color: #f0a48f; border-radius: 10px; border: 1px solid rgba(224,133,107,.4); background: rgba(224,133,107,.1); }
          .hc-nota { margin: 0; text-align: center; font-size: 11.5px; color: #8fa397; }
          .hc-ok { display: flex; gap: 14px; align-items: center; margin-bottom: 18px; padding: 16px; border-radius: 16px; border: 1px solid rgba(224,183,63,.35); background: rgba(15,95,59,.3); }
          .hc-ok span { flex: 0 0 48px; height: 48px; display: grid; place-items: center; border-radius: 50%; font-size: 24px; font-weight: 700; color: #1a1405; background: linear-gradient(135deg, var(--o3), var(--o2)); }
          .hc-ok p { margin: 0; font-size: 14px; line-height: 1.55; color: #dfe5e1; } .hc-ok b { color: var(--o3); }

          @media (max-width: 860px) {
            .hc-fab { bottom: calc(92px + env(safe-area-inset-bottom)); }
            .hc-aviso { bottom: calc(158px + env(safe-area-inset-bottom)); }
          }

          /* Móvil: carrusel de tarjetas pequeñas + popups tipo hoja inferior */
          @media (max-width: 760px) {
            .hh-grid { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; margin: 0 -16px; padding: 4px 16px 16px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
            .hh-grid::-webkit-scrollbar { display: none; }
            .hh-card { flex: 0 0 62%; max-width: 232px; scroll-snap-align: start; }
            .hh-card:hover { transform: none; }
            .hh-info h4 { font-size: 16px; }
            .hh-modal { padding: 0; align-items: end; }
            .hh-hoja { grid-template-columns: 1fr; max-height: 92vh; border-radius: 20px 20px 0 0; animation-name: hh-sheet; }
            @keyframes hh-sheet { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
            .hh-hoja .hh-gal { min-height: 0; height: auto; aspect-ratio: 1; }
            .hh-det { padding: 18px 16px calc(18px + env(safe-area-inset-bottom)); }
            .hh-det h4 { font-size: 24px; }
            .hc-fondo { align-items: flex-end; }
            .hc-hoja { width: 100%; height: auto; max-height: 94dvh; border-left: 0; border-radius: 20px 20px 0 0; border-top: 1px solid rgba(224,183,63,.4); animation-name: hh-sheet; }
            .hc-body { padding: 14px 16px; } .hc-head, .hc-foot { padding-left: 16px; padding-right: 16px; }
            .hc-foot { padding-bottom: calc(18px + env(safe-area-inset-bottom)); }
            .hc-g { grid-template-columns: 1fr; }
          }
          @media (prefers-reduced-motion: reduce) { .hh-hoja, .hc-hoja, .hc-fab, .hc-aviso, .hh-card { animation: none; transition: none; } }
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
                    {lista.map((x) => <Tarjeta key={x.id} x={x} onVer={() => setVer(x)} onAdd={(m) => agregar(x, m)} />)}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </SeccionHero>

      {ver && <Detalle x={ver} onClose={cerrar} onAdd={(m) => agregar(ver, m)} />}

      {uds > 0 && !carrito && (
        <button type="button" className="hc-fab" onClick={() => setCarrito(true)} aria-label={`Ver pedido de Hans, ${uds} unidades`}>
          <IcoBolsa /> Pedido Hans <b>{uds}</b>
        </button>
      )}
      {aviso && <div className="hc-aviso" role="status">{aviso}</div>}

      <CarritoHans lineas={lineas} setLineas={setLineas} abierto={carrito} setAbierto={setCarrito} wa={wa} zonas={zonas} domicilio={domicilio} />
    </>
  );
}