// 📁 RUTA: src/app/t/[slug]/CatalogoPublico.tsx   (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { rutaFoto } from '@/lib/foto-url';
import { ArmaMalla, type DatosMalla } from './SeccionesTaller';   // ⟵ CAMBIO: el taller ya no va aquí

export type VarianteP = { tamano: string; peso: string; stock: number; precio: number; fotos: string[] };
export type PrendaP = {
  id: string; codigo: string; nombre: string; categoria: string;
  quilate: string; descripcion: string; variantes: VarianteP[];
};

type Item = { key: string; id: string; nombre: string; tamano: string; precio: number; qty: number; max: number; foto: string };
type Vista = 'catalogo' | 'malla';   // ⟵ CAMBIO: solo dos pestañas

const LS_CARRITO = 'mw-carrito';
const LS_LIKES = 'mw-likes';
const EV_CARRITO = 'mw-carrito';
const EV_ABRIR = 'mw-abrir-carrito';
/** Para cambiar de sección desde fuera: window.dispatchEvent(new CustomEvent('mw-vista', { detail: 'malla' }))
 *  'taller' ya no es pestaña: baja hasta la sección del taller. */
const EV_VISTA = 'mw-vista';
const LS_CUPON = 'mw-cupon';
const LS_ENVIO = 'mw-envio';
const ID_MALLA = 'malla-personalizada';

/** Cupón aplicado desde la sección de Promociones */
type Cupon = { codigo: string; nombre: string; tipo: 'porcentaje' | 'monto'; valor: number; hasta: string };

/** Datos de entrega del cliente (se recuerdan en el navegador) */
type Envio = {
  entrega: 'domicilio' | 'recoger';
  nombre: string; telefono: string; correo: string;
  zona: string; barrio: string; direccion: string; complemento: string; indicaciones: string;   // ⟵ CAMBIO: zona (antes ciudad)
};
const ENVIO_VACIO: Envio = {
  entrega: 'domicilio', nombre: '', telefono: '', correo: '',
  zona: '', barrio: '', direccion: '', complemento: '', indicaciones: '',
};
const mismaZona = (a: string, b: string) => {
  const n = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return !!a && !!b && n(a) === n(b);
};
const PASOS = ['Carrito', 'Envío', 'Confirmar'];

const soloCelular = (t: string) => {
  let d = t.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return d;
};

function validarEnvio(e: Envio, zonas: string[]): Partial<Record<keyof Envio, string>> {
  const r: Partial<Record<keyof Envio, string>> = {};
  const nombre = e.nombre.trim();
  if (nombre.length < 5 || nombre.split(/\s+/).length < 2) r.nombre = 'Escribe tu nombre y apellido';
  if (!/^3\d{9}$/.test(soloCelular(e.telefono))) r.telefono = 'Celular de 10 dígitos. Ej: 3001234567';
  if (e.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.correo.trim())) r.correo = 'El correo no es válido';
  if (e.entrega === 'domicilio') {
    if (zonas.length ? !zonas.some((z) => mismaZona(z, e.zona)) : e.zona.trim().length < 2)
      r.zona = zonas.length ? 'Elige tu zona de entrega' : 'Indica la zona de entrega';   // ⟵ CAMBIO
    if (e.barrio.trim().length < 2) r.barrio = 'Indica el barrio';
    if (e.direccion.trim().length < 5) r.direccion = 'Escribe la dirección completa';
  }
  return r;
}

/** URL a mostrar; si rutaFoto falla o no aplica, se usa el valor tal cual */
const srcFoto = (f?: string) => {
  if (!f) return '';
  if (/^(data:|blob:)/.test(f)) return f;
  try { return rutaFoto(f) || f; } catch { return f; }
};

/** Orden preferido de las categorías (las demás van después, en el orden en que aparecen) */
const ORDEN_CAT = ['collares', 'cadenas', 'anillos', 'aretes', 'pulseras', 'dijes'];
const slugCat = (k: string) => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Clave estable de una categoría: ignora mayúsculas, tildes y espacios ("collares " = "Collares") */
const CLAVE_OTRAS = 'otras-piezas';
const claveCat = (k: string) => slugCat(k || '') || CLAVE_OTRAS;

/** Texto a mostrar: "collares" → "Collares" */
const etiquetaCat = (k: string) => {
  const t = (k || '').trim().replace(/\s+/g, ' ');
  if (!t) return 'Otras piezas';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

const rangoCat = (clave: string) => {
  const i = ORDEN_CAT.indexOf(clave);
  return i < 0 ? 99 : i;
};

const cop = (n: number) => (n > 0 ? `$${n.toLocaleString('es-CO')}` : 'Consultar');

function leer<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
function guardar(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio o modo privado */ }
}

/* ---------- Iconos ---------- */
const Cart = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" />
    <circle cx="9.5" cy="19.2" r="1.4" /><circle cx="17" cy="19.2" r="1.4" />
  </svg>
);
const Heart = ({ on, s = 16 }: { on: boolean; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
const Check = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l4 4 10-10" /></svg>
);
const Close = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
);
const Chev = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === 'l' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
  </svg>
);

/* ---------- Icono del carrito para la cabecera (lo usa page.tsx). Es el ÚNICO botón del carrito. ---------- */
export function CarritoHeader() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const sync = () => setN(leer<Item[]>(LS_CARRITO, []).reduce((a, i) => a + i.qty, 0));
    sync();
    window.addEventListener(EV_CARRITO, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EV_CARRITO, sync); window.removeEventListener('storage', sync); };
  }, []);
  return (
    <button type="button" className="mc-hbtn" aria-label={`Abrir carrito (${n})`}
      onClick={() => window.dispatchEvent(new Event(EV_ABRIR))}>
      <Cart s={22} />
      {n > 0 && <span className="mc-badge">{n}</span>}
    </button>
  );
}

/* ═════════════ Galería (foto + contador + puntos) ═════════════ */
function Galeria({ fotos, alt, peso, extra, grande, onClick }: {
  fotos: string[]; alt: string; peso?: string; extra?: ReactNode; grande?: boolean; onClick?: () => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [crudo, setCrudo] = useState<Record<number, boolean>>({});
  const xIni = useRef<number | null>(null);

  useEffect(() => { setIdx(0); setCrudo({}); }, [fotos.join('|')]);

  const n = fotos.length;
  const actual = fotos[idx] ?? '';
  const src = crudo[idx] ? actual : srcFoto(actual);
  const ir = (d: number) => setIdx((i) => (i + d + n) % n);

  return (
    <div className={`mc-foto${grande ? ' grande' : ''}`} ref={caja}
      onClick={onClick}
      onTouchStart={(e) => { xIni.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (xIni.current === null || n < 2) return;
        const dx = e.changedTouches[0].clientX - xIni.current;
        xIni.current = null;
        if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
      }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img key={src} className="mc-base" src={src} alt={alt} loading="lazy" draggable={false}
            onError={() => { if (!crudo[idx] && srcFoto(actual) !== actual) setCrudo((c) => ({ ...c, [idx]: true })); }} />
        : <span className="mc-sinfoto">Sin foto</span>}

      <div className="mc-vela" />

      {n > 1 && <span className="mc-cont">{idx + 1} / {n}</span>}
      {extra}

      {n > 1 && (
        <>
          <button type="button" className="mc-flecha l" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); ir(-1); }}><Chev dir="l" /></button>
          <button type="button" className="mc-flecha r" aria-label="Foto siguiente" onClick={(e) => { e.stopPropagation(); ir(1); }}><Chev dir="r" /></button>
          <div className="mc-puntos">
            {fotos.map((_, i) => (
              <button key={i} type="button" aria-label={`Foto ${i + 1}`} data-on={i === idx}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }} />
            ))}
          </div>
        </>
      )}

      <div className="mc-pie-foto">
        <span>Fotografía real</span>
        {peso ? <b>{peso} g</b> : null}
      </div>
    </div>
  );
}

/* ═════════════ Datos comunes de una pieza ═════════════ */
function estadoStock(stock: number) {
  if (stock <= 0) return { t: 'Agotado', c: 'ago' };
  if (stock === 1) return { t: 'Última unidad', c: 'ult' };
  return { t: `${stock} disponibles`, c: 'ok' };
}

type PropsPieza = {
  p: PrendaP; liked: boolean; conteo: number;
  onLike: () => void; onAdd: (v: VarianteP) => void; onFicha: () => void;
};

function BotonLike({ liked, conteo, onLike }: { liked: boolean; conteo: number; onLike: () => void }) {
  return (
    <button type="button" className={`mc-like${liked ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); onLike(); }}
      aria-pressed={liked} aria-label={liked ? 'Quitar de me encanta' : 'Me encanta'}>
      <Heart on={liked} />{conteo > 0 && <span>{conteo}</span>}
    </button>
  );
}

function Variantes({ p, idx, setIdx }: { p: PrendaP; idx: number; setIdx: (i: number) => void }) {
  if (p.variantes.length < 2) return null;
  return (
    <div className="mc-tams" role="group" aria-label="Tamaño">
      {p.variantes.map((x, i) => (
        <button key={i} type="button" disabled={x.stock <= 0} data-on={i === idx} onClick={() => setIdx(i)}>
          {x.tamano || `Opción ${i + 1}`}
        </button>
      ))}
    </div>
  );
}

/* ═════════════ Tarjeta (compacta: el detalle y la compra están en la ficha) ═════════════ */
function Tarjeta({ p, liked, conteo, onLike, onAdd, onFicha }: PropsPieza) {
  const v = p.variantes.find((x) => x.stock > 0) ?? p.variantes[0];
  const est = estadoStock(v.stock);
  const agotado = v.stock <= 0;

  return (
    <article className="mc-card">
      <Galeria fotos={v.fotos} alt={p.nombre} peso={v.peso}
        extra={<BotonLike liked={liked} conteo={conteo} onLike={onLike} />} onClick={onFicha} />

      <div className="mc-cuerpo">
        <div className="mc-top">
          <span className="mc-sku">{p.codigo ? `SKU: ${p.codigo}` : `Oro ${p.quilate}K`}</span>
          <span className={`mc-est ${est.c}`}><i />{est.t}</span>
        </div>

        <h4 className="mc-nom">{p.nombre}</h4>

        <div className="mc-fila">
          <div className="mc-precio"><b>{cop(v.precio)}</b></div>
          <button type="button" className="mc-bolsa" aria-label="Agregar al carrito"
            disabled={agotado || v.precio <= 0}
            onClick={(e) => { e.stopPropagation(); p.variantes.length > 1 ? onFicha() : onAdd(v); }}>
            <Cart s={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ═════════════ Carrusel por categoría: se ve ~80 % de la tarjeta y asoma ~20 % de la siguiente ═════════════ */
function GrupoCarrusel({ id, nombre, cuenta, children }: { id: string; nombre: string; cuenta: number; children: ReactNode }) {
  const pista = useRef<HTMLDivElement>(null);
  const [ant, setAnt] = useState(false);
  const [sig, setSig] = useState(false);

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    setAnt(el.scrollLeft > 4);
    setSig(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    el.addEventListener('scroll', medir, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', medir); };
  }, [medir, cuenta]);

  const mover = (dir: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    const tarjeta = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 14;
    const paso = tarjeta ? tarjeta.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * paso, behavior: 'smooth' });
  };

  return (
    <section className="mc-grupo" id={`cat-${id}`}>
      <div className="mc-grupo-tit">
        <h4>{nombre}</h4>
        <span>{cuenta} {cuenta === 1 ? 'pieza' : 'piezas'}</span>
        <i aria-hidden="true" />
        {(ant || sig) && (
          <div className="mc-nav">
            <button type="button" aria-label={`${nombre}: anteriores`} disabled={!ant} onClick={() => mover(-1)}><Chev dir="l" /></button>
            <button type="button" aria-label={`${nombre}: siguientes`} disabled={!sig} onClick={() => mover(1)}><Chev dir="r" /></button>
          </div>
        )}
      </div>
      <div className="mc-track" ref={pista} tabIndex={0} role="group" aria-label={`Carrusel de ${nombre}`}>
        {children}
      </div>
    </section>
  );
}

/* ═════════════ Ficha completa (ventana) ═════════════ */
function Ficha({ p, liked, conteo, onLike, onAdd, onCerrar }: Omit<PropsPieza, 'onFicha'> & { onCerrar: () => void }) {
  const [idx, setIdx] = useState(Math.max(0, p.variantes.findIndex((v) => v.stock > 0)));
  const v = p.variantes[idx] ?? p.variantes[0];
  const est = estadoStock(v.stock);
  const agotado = v.stock <= 0;

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCerrar]);

  return (
    <>
      <div className="mc-back" onClick={onCerrar} />
      <div className="mc-modal" role="dialog" aria-label={p.nombre}>
        <button type="button" className="mc-x mc-modal-x" aria-label="Cerrar" onClick={onCerrar}><Close /></button>
        <Galeria fotos={v.fotos} alt={p.nombre} peso={v.peso} grande
          extra={<BotonLike liked={liked} conteo={conteo} onLike={onLike} />} />
        <div className="mc-cuerpo mc-cuerpo-modal">
          <div className="mc-top">
            <span className="mc-sku">{p.codigo ? `SKU: ${p.codigo}` : 'Pieza'}</span>
            <span className={`mc-est ${est.c}`}><i />{est.t}</span>
          </div>
          <h4 className="mc-nom grande">{p.nombre}</h4>
          {p.descripcion && <p className="mc-desc completa">{p.descripcion}</p>}

          <div className="mc-datos tres">
            <div><small>Material</small><b>Oro {p.quilate}K</b></div>
            <div><small>Peso exacto</small><b>{v.peso ? `${v.peso} g` : '—'}</b></div>
            <div><small>Tamaño</small><b>{v.tamano || '—'}</b></div>
          </div>
          <Variantes p={p} idx={idx} setIdx={setIdx} />
          {p.categoria && <p className="mc-cat-ficha">Categoría: {etiquetaCat(p.categoria)}</p>}

          <div className="mc-fila">
            <div className="mc-precio"><small>Precio público</small><b>{cop(v.precio)}</b></div>
            <button type="button" className="mc-add" disabled={agotado || v.precio <= 0} onClick={() => onAdd(v)}>
              <Cart s={17} /><span>Agregar</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═════════════ Campo de formulario con etiqueta y error ═════════════ */
function Campo({ id, label, opcional, error, children }: { id: string; label: string; opcional?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="mc-c">
      <label htmlFor={id}>{label}{opcional && <em> (opcional)</em>}</label>
      {children}
      {error && <small className="mc-err" role="alert">{error}</small>}
    </div>
  );
}

/* ═════════════ Catálogo + carrito ═════════════ */
export default function CatalogoPublico({ prendas, wa, tienda = "Karen Sprockel's", zonas = [], domicilio = 0 }: {
  prendas: PrendaP[]; wa: string; logo?: string; tienda?: string;
  zonas?: string[];     // ⟵ CAMBIO: fila "cobertura" de Configuración
  domicilio?: number;   // ⟵ CAMBIO: fila "domicilio" de Configuración
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [abierto, setAbierto] = useState(false);
  const [ficha, setFicha] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('catalogo');
  const [cat, setCat] = useState('todas'); // clave de categoría ('todas' = sin filtro)
  const [aviso, setAviso] = useState('');
  const [cupon, setCupon] = useState<Cupon | null>(null);
  const [paso, setPaso] = useState(0);
  const [envio, setEnvio] = useState<Envio>(ENVIO_VACIO);
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [enviando, setEnviando] = useState(false);                                                          // ⟵ CAMBIO
  const [errEnvio, setErrEnvio] = useState('');                                                             // ⟵ CAMBIO
  const [listo, setListo] = useState<{ codigo: string; total: number; link: string } | null>(null);        // ⟵ CAMBIO
  const enVuelo = useRef<Set<string>>(new Set());

  useEffect(() => {
    setItems(leer<Item[]>(LS_CARRITO, []));
    setLikes(leer<string[]>(LS_LIKES, []));
    setCupon(leer<Cupon | null>(LS_CUPON, null));
    setEnvio({ ...ENVIO_VACIO, ...leer<Partial<Envio>>(LS_ENVIO, {}) });
    const abrir = () => { setPaso(0); setListo(null); setErrEnvio(''); setAbierto(true); };
    const releer = () => { setItems(leer<Item[]>(LS_CARRITO, [])); setCupon(leer<Cupon | null>(LS_CUPON, null)); };
    const irVista = (e: Event) => {
      const d = (e as CustomEvent<string>).detail;
      if (d === 'catalogo' || d === 'malla') setVista(d);
      else if (d === 'taller') document.getElementById('reparacion')?.scrollIntoView({ behavior: 'smooth', block: 'start' });   // ⟵ CAMBIO
    };
    window.addEventListener(EV_ABRIR, abrir);
    window.addEventListener(EV_CARRITO, releer);
    window.addEventListener(EV_VISTA, irVista);
    return () => {
      window.removeEventListener(EV_ABRIR, abrir);
      window.removeEventListener(EV_CARRITO, releer);
      window.removeEventListener(EV_VISTA, irVista);
    };
  }, []);

  // totales de "me encanta" por pieza
  useEffect(() => {
    fetch('/api/likes', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.likes) setConteos(d.likes as Record<string, number>); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = abierto || ficha ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto, ficha]);

  const persistir = useCallback((next: Item[]) => {
    setItems(next);
    guardar(LS_CARRITO, next);
    window.dispatchEvent(new Event(EV_CARRITO));
  }, []);

  const avisar = (t: string) => { setAviso(t); window.setTimeout(() => setAviso(''), 1800); };

  const agregar = (p: PrendaP, v: VarianteP) => {
    const key = `${p.id}|${v.tamano}`;
    const ex = items.find((i) => i.key === key);
    if (ex) {
      if (ex.qty >= v.stock) return avisar('Ya tienes todo el stock disponible');
      persistir(items.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      persistir([...items, {
        key, id: p.id, nombre: p.nombre, tamano: v.tamano, precio: v.precio,
        qty: 1, max: v.stock, foto: srcFoto(v.fotos[0]),
      }]);
    }
    avisar('Agregado al carrito');
  };

  /** Manilla armada en el visor 3D (pieza hecha a pedido: hasta 5 iguales por pedido) */
  const agregarMalla = (d: DatosMalla) => {
    const ex = items.find((i) => i.key === d.key);
    if (ex) {
      if (ex.qty >= ex.max) return avisar('Máximo 5 manillas iguales por pedido');   // ⟵ CAMBIO
      persistir(items.map((i) => (i.key === d.key ? { ...i, qty: i.qty + 1, precio: d.precio } : i)));
    } else {
      persistir([...items, {
        key: d.key, id: ID_MALLA, nombre: d.nombre, tamano: d.tamano, precio: d.precio,
        qty: 1, max: 5, foto: d.foto,
      }]);
    }
    avisar('Manilla agregada al carrito');   // ⟵ CAMBIO
  };

  const cambiar = (key: string, d: number) =>
    persistir(items
      .map((i) => (i.key === key ? { ...i, qty: Math.min(i.max, i.qty + d) } : i))
      .filter((i) => i.qty > 0));

  const quitar = (key: string) => persistir(items.filter((i) => i.key !== key));

  const alternarLike = async (p: PrendaP) => {
    if (enVuelo.current.has(p.id)) return;
    enVuelo.current.add(p.id);

    const on = !likes.includes(p.id);
    const aplicar = (marcado: boolean) =>
      setLikes((prev) => {
        const next = marcado ? Array.from(new Set([...prev, p.id])) : prev.filter((x) => x !== p.id);
        guardar(LS_LIKES, next);
        return next;
      });

    aplicar(on);
    setConteos((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) + (on ? 1 : -1)) }));
    try {
      const r = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, accion: on ? 'like' : 'unlike' }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json().catch(() => null)) as { total?: number } | null;
      if (typeof d?.total === 'number') setConteos((c) => ({ ...c, [p.id]: d.total as number }));
    } catch (e) {
      aplicar(!on);
      setConteos((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) + (on ? -1 : 1)) }));
      avisar(e instanceof Error && e.message === '429' ? 'Demasiados intentos, espera un momento' : 'No se pudo guardar tu me encanta');
    } finally {
      enVuelo.current.delete(p.id);
    }
  };

  /* Categorías detectadas dinámicamente desde las piezas (clave normalizada + etiqueta visible) */
  const categorias = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of prendas) {
      const clave = claveCat(p.categoria);
      if (!m.has(clave)) m.set(clave, etiquetaCat(p.categoria));
    }
    const lista = Array.from(m.entries())
      .map(([clave, etiqueta]) => ({ clave, etiqueta }))
      .sort((a, b) => rangoCat(a.clave) - rangoCat(b.clave));
    return [{ clave: 'todas', etiqueta: 'Todas' }, ...lista];
  }, [prendas]);

  // si la categoría seleccionada ya no existe, volver a "Todas"
  useEffect(() => {
    if (cat !== 'todas' && !categorias.some((c) => c.clave === cat)) setCat('todas');
  }, [categorias, cat]);

  const visibles = cat === 'todas' ? prendas : prendas.filter((p) => claveCat(p.categoria) === cat);

  /* Piezas agrupadas por categoría: cada categoría nueva aparece sola como "Nombre · N pieza(s)" */
  const grupos = useMemo(() => {
    const m = new Map<string, { nombre: string; lista: PrendaP[] }>();
    for (const p of visibles) {
      const clave = claveCat(p.categoria);
      const g = m.get(clave);
      if (g) g.lista.push(p);
      else m.set(clave, { nombre: etiquetaCat(p.categoria), lista: [p] });
    }
    return Array.from(m.entries())
      .sort((a, b) => rangoCat(a[0]) - rangoCat(b[0]))
      .map(([clave, g]) => ({ clave, ...g }));
  }, [visibles]);

  const subtotal = items.reduce((a, i) => a + i.precio * i.qty, 0);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const cuponOk = cupon && hoy <= cupon.hasta ? cupon : null;
  const descuento = cuponOk && subtotal > 0
    ? Math.min(subtotal, cuponOk.tipo === 'porcentaje' ? Math.round((subtotal * cuponOk.valor) / 100) : cuponOk.valor)
    : 0;
  const costoDom = envio.entrega === 'domicilio' ? domicilio : 0;   // ⟵ CAMBIO
  const total = subtotal - descuento + costoDom;                    // ⟵ CAMBIO: prendas − cupón + domicilio
  const quitarCupon = () => {
    try { localStorage.removeItem(LS_CUPON); } catch { /* */ }
    setCupon(null);
    window.dispatchEvent(new Event(EV_CARRITO));
  };
  const pFicha = ficha ? prendas.find((p) => p.id === ficha) : undefined;

  /* ---- Datos de envío ---- */
  const errores = useMemo(() => validarEnvio(envio, zonas), [envio, zonas]);
  const faltan = Object.keys(errores).length;
  const valido = faltan === 0;
  const pasoEf = items.length === 0 ? 0 : paso === 2 && !valido ? 1 : paso;
  const poner = <K extends keyof Envio>(k: K, v: Envio[K]) =>
    setEnvio((prev) => { const n = { ...prev, [k]: v }; guardar(LS_ENVIO, n); return n; });
  const tocar = (k: string) => setTocados((t) => (t[k] ? t : { ...t, [k]: true }));
  const err = (k: keyof Envio) => (tocados[k] ? errores[k] : undefined);

  const cerrarCarrito = () => setAbierto(false);

  const pedido = (codigo: string, tot: number) => {
    const lineas = items.map((i) =>
      `• ${i.nombre}${i.tamano ? ` (${i.tamano})` : ''} x${i.qty} — ${cop(i.precio * i.qty)}`);
    const extra = cuponOk && descuento > 0
      ? `\n\nCupón: ${cuponOk.codigo} (−${cop(descuento)})\nSubtotal: ${cop(subtotal)}`
      : '';
    const e = envio;
    const datos = [
      '\n\nDatos de entrega',
      `Nombre: ${e.nombre.trim()}`,
      `Teléfono: ${soloCelular(e.telefono)}`,
      e.correo.trim() ? `Correo: ${e.correo.trim()}` : '',
      e.entrega === 'domicilio'
        ? `Entrega: Domicilio\nZona: ${e.zona.trim()}\nBarrio: ${e.barrio.trim()}\nDirección: ${e.direccion.trim()}${e.complemento.trim() ? `, ${e.complemento.trim()}` : ''}\nDomicilio: ${cop(costoDom)}`
        : 'Entrega: Recoger en tienda',
      e.indicaciones.trim() ? `Indicaciones: ${e.indicaciones.trim()}` : '',
    ].filter(Boolean).join('\n');
    const msg = `Hola, *${tienda}* 👋\nHice el pedido *${codigo}*:\n\n${lineas.join('\n')}${extra}\n\n*Total: ${cop(tot)}*${datos}\n\n¿Me confirmas disponibilidad, envío y forma de pago? ¡Gracias!`;
    const sep = wa.includes('?') ? '&' : '?';
    return `${wa}${sep}text=${encodeURIComponent(msg)}`;
  };
  const waOk = wa !== '#';

  /* ⟵ CAMBIO: el pedido se guarda en la hoja "Pedidos" de Karen (su joyeria_id) y después se ofrece WhatsApp.
     El enlace de WhatsApp es un <a> que la persona toca: así Safari/iPhone no lo bloquea como ventana emergente. */
  const pedir = async () => {
    if (!valido || items.length === 0 || enviando) return;
    setEnviando(true);
    setErrEnvio('');
    try {
      const r = await fetch('/api/pedido-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...envio,
          telefono: soloCelular(envio.telefono),
          cupon: cuponOk?.codigo ?? '',
          items: items.map((i) => ({ id: i.id, nombre: i.nombre, tamano: i.tamano, qty: i.qty, precio: i.precio })),
        }),
      });
      const d = (await r.json().catch(() => ({}))) as { codigo?: string; total?: number; error?: string };
      if (!r.ok) throw new Error(d.error || 'No se pudo enviar el pedido');
      const codigo = String(d.codigo ?? '');
      const tot = Number(d.total) || total;
      setListo({ codigo, total: tot, link: waOk ? pedido(codigo, tot) : '#' });
      persistir([]);
      quitarCupon();
      // ⟵ CAMBIO: el carrito queda limpio, también los datos de envío (no se precargan en el siguiente pedido)
      setEnvio(ENVIO_VACIO);
      setTocados({});
      try { localStorage.removeItem(LS_ENVIO); } catch { /* modo privado */ }
      setPaso(0);
    } catch (e) {
      setErrEnvio(e instanceof Error ? e.message : 'No se pudo enviar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  const totales = (
    <>
      {descuento > 0 && (
        <>
          <div className="mc-sub"><span>Subtotal</span><span>{cop(subtotal)}</span></div>
          <div className="mc-sub desc"><span>Cupón {cuponOk?.codigo}</span><span>−{cop(descuento)}</span></div>
        </>
      )}
      {descuento <= 0 && <div className="mc-sub"><span>Prendas</span><span>{cop(subtotal)}</span></div>}
      {/* ⟵ CAMBIO: domicilio según la zona elegida */}
      <div className="mc-sub">
        <span>{envio.entrega === 'recoger' ? 'Recoger en tienda' : `Domicilio${envio.zona ? ` · ${envio.zona}` : ''}`}</span>
        <span>{envio.entrega === 'recoger' ? '$0' : domicilio > 0 ? cop(domicilio) : 'Por confirmar'}</span>
      </div>
      <div className="mc-tot"><span>Total</span><b>{cop(total)}</b></div>
    </>
  );

  const titulos = ['Tu carrito', 'Datos de envío', 'Confirma tu pedido'];
  /* ⟵ CAMBIO: solo dos pestañas; "Taller de reparación" se movió a la sección del taller (abajo) */
  const TABS: { id: Vista; t: string }[] = [
    { id: 'catalogo', t: 'Catálogo' },
    { id: 'malla', t: 'Arma tu manilla' },
  ];

  return (
    <>
      <style>{`
        .mc-tabs { display: flex; gap: 6px; overflow-x: auto; padding: 4px; margin: 0 0 18px; border-radius: 14px; background: #f1ece0; scrollbar-width: none; }
        .mc-tabs::-webkit-scrollbar { display: none; }
        .mc-tabs button { flex: 1 0 auto; border: 0; border-radius: 10px; padding: 11px 16px; font: inherit; font-size: 14px; font-weight: 600; white-space: nowrap; cursor: pointer; background: transparent; color: #5d6f68; }
        .mc-tabs button[aria-selected="true"] { background: var(--v); color: #f3e2a6; box-shadow: 0 4px 12px rgba(11,74,46,.25); }

        .mc-cats { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 16px; margin: 0 -2px; scrollbar-width: none; }
        .mc-cats::-webkit-scrollbar { display: none; }
        .mc-chip { flex-shrink: 0; border: 1px solid var(--vm); background: #fff; color: var(--v); border-radius: 999px; padding: 7px 14px; font-size: 13px; cursor: pointer; }
        .mc-chip.on { background: var(--v); color: #fff; border-color: var(--v); }

        .mc-grupo { scroll-margin-top: 80px; }
        .mc-grupo + .mc-grupo { margin-top: 30px; }
        .mc-grupo-tit { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .mc-grupo-tit h4 { margin: 0; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 26px; color: var(--tx); }
        .mc-grupo-tit span { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--o); white-space: nowrap; }
        .mc-grupo-tit i { flex: 1; height: 1px; align-self: center; background: linear-gradient(90deg, #cfc7ae, transparent); }

        .mc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 16px; }

        /* ── Carrusel por categoría: ~80 % de la tarjeta + ~20 % de la siguiente ── */
        .mc-nav { display: flex; gap: 8px; flex: 0 0 auto; }
        .mc-nav button { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: #e0b73f; background: rgba(4,23,15,.75); border: 1px solid rgba(224,183,63,.55); transition: background .2s, color .2s, opacity .2s; -webkit-tap-highlight-color: transparent; }
        .mc-nav button:hover:not(:disabled) { background: #e0b73f; color: #1a1405; }
        .mc-nav button:disabled { opacity: .28; cursor: default; }
        .mc-nav button svg { width: 18px; height: 18px; }

        .mc-track { --g: 14px; --w: calc((100% - 4 * var(--g)) / 4.2);
          display: flex; gap: var(--g); overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scroll-padding-left: 2px; scrollbar-width: none; -webkit-overflow-scrolling: touch;
          padding: 6px 2px 26px; margin: -6px -2px -12px; outline: none; }
        .mc-track::-webkit-scrollbar { display: none; }
        .mc-track:focus-visible { outline: 2px solid #e0b73f; outline-offset: 2px; border-radius: 12px; }
        .mc-track > .mc-card { flex: 0 0 var(--w); min-width: 0; scroll-snap-align: start; }
        @media (max-width: 1100px) { .mc-track { --w: calc((100% - 3 * var(--g)) / 3.2); } }
        @media (max-width: 860px) { .mc-track { --w: calc((100% - 2 * var(--g)) / 2.2); } }
        @media (max-width: 600px) {
          .mc-track { --g: 12px; --w: 80%; margin: -6px -16px -12px; padding: 6px 16px 26px; scroll-padding-left: 16px; }
          .mc-grupo-tit { gap: 8px; }
          .mc-grupo-tit span { font-size: 10px; letter-spacing: .12em; }
          .mc-grupo-tit i { display: none; }
          .mc-grupo-tit h4 { flex: 1; min-width: 0; }
          .mc-nav button { width: 36px; height: 36px; }
        }

        /* ── Tarjeta oscura ── */
        .mc-card { background: #0c1511; color: #ece7d4; border: 1px solid rgba(224,183,63,.18); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,.18); }

        .mc-foto { position: relative; aspect-ratio: 1 / 1; background: #000; overflow: hidden; cursor: zoom-in; touch-action: pan-y; -webkit-user-select: none; user-select: none; }
        .mc-foto.grande { aspect-ratio: auto; height: 100%; min-height: 360px; cursor: default; }
        .mc-base { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; transform-origin: 50% 45%; will-change: transform; animation: mc-fade .5s ease both, mc-respira 11s ease-in-out .5s infinite; -webkit-user-drag: none; }
        .mc-foto:hover .mc-base { animation-play-state: running, paused; }
        @keyframes mc-respira { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.09); } }
        @keyframes mc-fade { from { opacity: 0; } to { opacity: 1; } }
        .mc-sinfoto { position: absolute; inset: 0; display: grid; place-items: center; font-size: 12px; color: #6f7a72; }
        .mc-vela { position: absolute; inset: auto 0 0 0; height: 34%; background: linear-gradient(to top, rgba(0,0,0,.78), transparent); pointer-events: none; }

        .mc-cont { position: absolute; top: 10px; left: 10px; z-index: 4; font-size: 11px; padding: 5px 10px; border-radius: 999px; background: rgba(0,0,0,.6); border: 1px solid rgba(255,255,255,.14); color: #f1ecd8; }
        .mc-like { position: absolute; top: 10px; right: 10px; z-index: 4; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(0,0,0,.6); color: #f1ecd8; font-size: 12px; cursor: pointer; transition: transform .15s; }
        .mc-like:hover { transform: scale(1.06); }
        .mc-like.on { color: #ff5d8f; }
        .mc-flecha { position: absolute; top: 50%; z-index: 4; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 50%; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.55); color: #f1ecd8; display: grid; place-items: center; cursor: pointer; opacity: 0; transition: opacity .2s; }
        .mc-flecha.l { left: 8px; } .mc-flecha.r { right: 8px; }
        .mc-foto:hover .mc-flecha, .mc-flecha:focus-visible { opacity: 1; }
        @media (hover: none) { .mc-flecha { opacity: .85; } }
        .mc-puntos { position: absolute; left: 0; right: 0; bottom: 34px; z-index: 4; display: flex; justify-content: center; gap: 7px; }
        .mc-puntos button { width: 18px; height: 18px; padding: 0; border: 0; background: none; cursor: pointer; display: grid; place-items: center; }
        .mc-puntos button::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.35); transition: all .2s; }
        .mc-puntos button[data-on="true"]::before { width: 20px; border-radius: 4px; background: #e0b73f; }
        .mc-pie-foto { position: absolute; left: 12px; right: 12px; bottom: 10px; z-index: 4; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #cfc9b4; pointer-events: none; }
        .mc-pie-foto b { color: #e0b73f; font-weight: 600; letter-spacing: .04em; }

        /* cuerpo */
        .mc-cuerpo { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .mc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .mc-sku { font: 500 10.5px/1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .14em; color: #7f8a82; text-transform: uppercase; }
        .mc-est { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(224,183,63,.45); color: #e9c552; background: rgba(224,183,63,.08); white-space: nowrap; }
        .mc-est i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .mc-est.ok { border-color: rgba(143,214,168,.4); color: #8fd6a8; background: rgba(143,214,168,.07); }
        .mc-est.ago { border-color: rgba(255,138,128,.4); color: #ff8a80; background: rgba(255,138,128,.07); }
        .mc-nom { font-family: var(--serif), Georgia, serif !important; font-weight: 500 !important; font-size: 19px !important; line-height: 1.15; margin: 2px 0 0; color: #f4efdc; }
        .mc-nom.grande { font-size: 27px !important; }
        .mc-desc { margin: 0; font-size: 13px; line-height: 1.5; color: #b9b9aa; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mc-desc.completa { -webkit-line-clamp: unset; display: block; font-size: 14px; }
        .mc-ficha-link { align-self: flex-start; border: 0; background: none; padding: 0; color: #e0b73f; font-size: 13px; cursor: pointer; }
        .mc-ficha-link:hover { text-decoration: underline; }
        .mc-datos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 2px; }
        .mc-datos.tres { grid-template-columns: repeat(3, 1fr); }
        .mc-datos div { background: #101c16; border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 10px 12px; min-width: 0; }
        .mc-datos small { display: block; font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: #7f8a82; margin-bottom: 4px; }
        .mc-datos b { font-size: 15px; font-weight: 600; color: #f4efdc; overflow-wrap: anywhere; }
        .mc-tams { display: flex; flex-wrap: wrap; gap: 6px; }
        .mc-tams button { border: 1px solid rgba(255,255,255,.14); background: transparent; color: #d6d1bd; border-radius: 8px; padding: 5px 11px; font-size: 12px; cursor: pointer; }
        .mc-tams button[data-on="true"] { border-color: #e0b73f; color: #e0b73f; background: rgba(224,183,63,.1); }
        .mc-tams button:disabled { opacity: .35; text-decoration: line-through; cursor: not-allowed; }
        .mc-cat-ficha { margin: 0; font-size: 12px; color: #7f8a82; }

        .mc-fila { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.07); }
        .mc-precio small { display: block; font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: #7f8a82; margin-bottom: 3px; }
        .mc-precio b { font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 22px; color: #f0c24a; }
        .mc-add { display: inline-flex; align-items: center; gap: 8px; background: #f0c24a; color: #1a1405; border: 0; border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: filter .2s, transform .1s; }
        .mc-add:hover:not(:disabled) { filter: brightness(1.07); }
        .mc-add:active:not(:disabled) { transform: translateY(1px); }
        .mc-add:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Ficha completa ── */
        .mc-modal { position: fixed; z-index: 52; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(920px, calc(100% - 24px)); max-height: calc(100dvh - 24px); background: #0c1511; color: #ece7d4; border: 1px solid rgba(224,183,63,.25); border-radius: 20px; overflow: hidden; display: grid; grid-template-columns: 1.05fr 1fr; box-shadow: 0 30px 80px rgba(0,0,0,.5); }
        .mc-cuerpo-modal { padding: 22px 22px 20px; overflow-y: auto; max-height: calc(100dvh - 24px); }
        .mc-modal-x { position: absolute; top: 10px; right: 10px; z-index: 6; width: 34px; height: 34px; border-radius: 50%; background: rgba(0,0,0,.65) !important; color: #f1ecd8 !important; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.15) !important; }
        .mc-modal .mc-like { right: 54px; }

        /* Carrito de la cabecera (único botón del carrito) */
        .mc-hbtn { position: relative; border: 0; background: none; color: var(--v); cursor: pointer; padding: 6px; display: grid; place-items: center; }
        .mc-badge { position: absolute; top: -2px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--o); color: #fff; font-size: 11px; font-weight: 600; display: grid; place-items: center; }

        /* ── Carrito (3 pasos) ── */
        .mc-back { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 50; }
        .mc-dr { position: fixed; top: 0; right: 0; bottom: 0; width: min(440px, 100%); background: #fff; z-index: 51; display: flex; flex-direction: column; box-shadow: -10px 0 40px rgba(0,0,0,.18); color: var(--tx); }
        .mc-dh { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 18px; border-bottom: 1px solid #e6e2d6; }
        .mc-dh-t { display: flex; align-items: center; gap: 6px; min-width: 0; }
        .mc-dh b { font-size: 18px; font-family: var(--serif), Georgia, serif; font-weight: 500; color: var(--v); }
        .mc-x { border: 0; background: none; cursor: pointer; color: #44514a; padding: 4px; display: grid; place-items: center; }

        .mc-pasos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 18px 10px; border-bottom: 1px solid #efece0; }
        .mc-pasos span { display: flex; align-items: center; gap: 7px; padding-top: 8px; border-top: 3px solid #e6e2d6; font-size: 11.5px; font-weight: 600; letter-spacing: .04em; color: #8a948e; }
        .mc-pasos span i { width: 20px; height: 20px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; font-style: normal; font-size: 10.5px; border: 1px solid #cfc7ae; }
        .mc-pasos span.on { border-color: var(--o2); color: var(--v); }
        .mc-pasos span.on i { background: var(--v); border-color: var(--v); color: #f3e2a6; }
        .mc-pasos span.hecho { border-color: var(--o); color: var(--v); }
        .mc-pasos span.hecho i { background: var(--o2); border-color: var(--o2); color: #1a1405; }

        .mc-lista { flex: 1; overflow-y: auto; padding: 8px 18px; }
        .mc-vacio { text-align: center; color: #6b7a72; font-size: 14px; padding: 48px 12px; }
        .mc-it { display: grid; grid-template-columns: 56px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0ede3; }
        .mc-it img, .mc-it .mc-ph { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; background: var(--vc); }
        .mc-it h5 { margin: 0; font-size: 14px; font-weight: 600; font-family: inherit; }
        .mc-it small { color: #6b7a72; font-size: 12px; line-height: 1.4; display: block; }
        .mc-it .mc-r { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
        .mc-q { display: inline-flex; align-items: center; border: 1px solid var(--vm); border-radius: 8px; }
        .mc-q button { width: 28px; height: 28px; border: 0; background: none; font-size: 16px; cursor: pointer; color: var(--v); }
        .mc-q span { min-width: 22px; text-align: center; font-size: 13px; }
        .mc-rm { border: 0; background: none; color: #a33; font-size: 12px; cursor: pointer; margin-left: 10px; }
        .mc-pie { padding: 14px 18px calc(16px + env(safe-area-inset-bottom)); border-top: 1px solid #e6e2d6; display: grid; gap: 10px; }
        .mc-tot { display: flex; justify-content: space-between; font-size: 16px; }
        .mc-tot b { color: var(--v); }
        .mc-cupon { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 10px 0 2px; padding: 9px 12px; border-radius: 10px; font-size: 13px; color: #6b5214; background: #faf3dc; border: 1px dashed #c9a24a; }
        .mc-cupon button { border: 0; background: none; color: #a33; font-size: 12px; cursor: pointer; }
        .mc-sub { display: flex; justify-content: space-between; font-size: 13px; color: #55645b; }
        .mc-sub.desc { color: #1f8a4d; }
        .mc-nota { font-size: 12px; color: #6b7a72; text-align: center; margin: 0; }

        /* Botones principales del carrito (dorados, como el resto de la tienda) */
        .mc-pedir, .mc-sig { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; min-height: 50px; border: 0; border-radius: 10px; cursor: pointer; font: 700 14px/1 system-ui, sans-serif;
          background: linear-gradient(135deg, #f0d680, #e0b73f 55%, #b08d3c); color: #1a1405 !important; text-decoration: none; transition: filter .2s, opacity .2s; }
        .mc-pedir:hover:not(:disabled), .mc-sig:hover:not(:disabled) { filter: brightness(1.06); }
        .mc-pedir:disabled, .mc-sig:disabled { opacity: .45; cursor: not-allowed; filter: grayscale(.4); }
        .mc-bloq { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 0; font-size: 12px; color: #8a7a3e; }

        /* Formulario de envío */
        .mc-form { display: grid; gap: 14px; padding: 16px 0 6px; }
        .mc-ent { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: #f1ece0; }
        .mc-ent button { padding: 10px 6px; border: 0; border-radius: 9px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; background: transparent; color: #5d6f68; }
        .mc-ent button.on { background: var(--v); color: #f3e2a6; }
        .mc-c { display: flex; flex-direction: column; gap: 6px; }
        .mc-c label { font-size: 12px; font-weight: 600; letter-spacing: .03em; color: #4f6159; }
        .mc-c label em { font-style: normal; font-weight: 400; color: #8a948e; }
        .mc-c input, .mc-c textarea { width: 100%; padding: 11px 13px; border-radius: 11px; border: 1px solid #ddd5bd; background: #fff; font: inherit; font-size: 15px; color: var(--tx); outline: none; resize: vertical; }
        .mc-c input:focus, .mc-c textarea:focus { border-color: var(--v); box-shadow: 0 0 0 3px rgba(11,74,46,.1); }
        .mc-c input[aria-invalid="true"], .mc-c textarea[aria-invalid="true"] { border-color: #c4453c; }
        .mc-err { font-size: 12px; color: #b3372f; }
        /* ⟵ CAMBIO: selector de zona, error al enviar y confirmación */
        .mc-sel { width: 100%; padding: 11px 38px 11px 13px; border-radius: 11px; border: 1px solid #ddd5bd; font: inherit; font-size: 16px; color: var(--tx); outline: none; cursor: pointer;
          appearance: none; -webkit-appearance: none; background: #fff linear-gradient(45deg, transparent 50%, #0b4a2e 50%) calc(100% - 19px) 50% / 6px 6px no-repeat;
          background-image: linear-gradient(45deg, transparent 50%, #0b4a2e 50%), linear-gradient(135deg, #0b4a2e 50%, transparent 50%);
          background-position: calc(100% - 20px) 50%, calc(100% - 14px) 50%; background-size: 6px 6px; background-repeat: no-repeat; }
        .mc-sel:focus { border-color: var(--v); box-shadow: 0 0 0 3px rgba(11,74,46,.1); }
        .mc-sel[aria-invalid="true"] { border-color: #c4453c; }
        .mc-err-box { margin: 0; padding: 9px 12px; border-radius: 10px; font-size: 12.5px; color: #b3372f; background: #fbeceb; border: 1px solid #efc2bd; }
        .mc-ok { display: flex; gap: 14px; align-items: center; margin: 18px 0; padding: 16px; border-radius: 14px; background: #f1f7f3; border: 1px solid #cfe0d5; }
        .mc-ok > span { flex: 0 0 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; color: #f3e2a6; background: var(--v); }
        .mc-ok p { margin: 0; font-size: 14px; line-height: 1.55; color: #35493f; } .mc-ok b { color: var(--v); }
        .mw .mc-sig.mc-sig-sec, .mc-sig.mc-sig-sec { background: transparent !important; color: var(--v) !important; border: 1px solid var(--v); }
        .mc-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mc-recoger { margin: 0; padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; color: #6b5214; background: #faf3dc; border: 1px dashed #c9a24a; }

        /* Confirmación */
        .mc-res { display: grid; gap: 14px; padding: 14px 0 8px; }
        .mc-res h5 { display: flex; align-items: center; justify-content: space-between; margin: 0; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--o); font-family: inherit; font-weight: 700; }
        .mc-link { border: 0; background: none; cursor: pointer; font: inherit; font-size: 12px; letter-spacing: 0; text-transform: none; font-weight: 600; color: var(--v); text-decoration: underline; text-underline-offset: 3px; }
        .mc-caja { padding: 12px 14px; border-radius: 12px; background: #faf8f1; border: 1px solid #ece5cc; display: grid; gap: 4px; font-size: 13.5px; line-height: 1.45; color: #35493f; }
        .mc-caja b { color: var(--tx); }
        .mc-rl { display: flex; justify-content: space-between; gap: 12px; font-size: 13.5px; color: #35493f; }
        .mc-rl b { white-space: nowrap; color: var(--tx); }

        .mc-aviso { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--tx); color: #fff; font-size: 13px; padding: 9px 16px; border-radius: 999px; z-index: 60; }

        @media (max-width: 820px) {
          .mc-modal { grid-template-columns: 1fr; overflow-y: auto; align-content: start; }
          .mc-foto.grande { aspect-ratio: 4 / 5; height: auto; min-height: 0; max-height: 58dvh; }
          .mc-cuerpo-modal { max-height: none; overflow: visible; }
        }
        @media (max-width: 600px) {
          .mc-grupo-tit h4 { font-size: 22px; }
          .mc-grupo + .mc-grupo { margin-top: 26px; }
          .mc-nom { font-size: 18px !important; }
          .mc-datos.tres { grid-template-columns: 1fr 1fr; }
          .mc-dos { grid-template-columns: 1fr; }
          .mc-pasos span { font-size: 10.5px; gap: 5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mc-base { animation: none; }
          .mc-track { scroll-behavior: auto; }
        }
      `}</style>

      <div className="mc-tabs" role="tablist" aria-label="Secciones de la tienda">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={vista === t.id} onClick={() => setVista(t.id)}>{t.t}</button>
        ))}
      </div>

      {vista === 'catalogo' && (
        <>
          {categorias.length > 2 && (
            <div className="mc-cats" role="tablist">
              {categorias.map((c) => (
                <button key={c.clave} type="button" className={`mc-chip${c.clave === cat ? ' on' : ''}`} onClick={() => setCat(c.clave)}>{c.etiqueta}</button>
              ))}
            </div>
          )}

          {grupos.map(({ clave, nombre, lista }) => (
            <GrupoCarrusel key={clave} id={clave} nombre={nombre} cuenta={lista.length}>
              {lista.map((p) => (
                <Tarjeta key={p.id} p={p} liked={likes.includes(p.id)} conteo={conteos[p.id] ?? 0}
                  onLike={() => alternarLike(p)} onAdd={(v) => agregar(p, v)} onFicha={() => setFicha(p.id)} />
              ))}
            </GrupoCarrusel>
          ))}
        </>
      )}

      {vista === 'malla' && <ArmaMalla onAdd={agregarMalla} wa={wa} />}

      {pFicha && (
        <Ficha p={pFicha} liked={likes.includes(pFicha.id)} conteo={conteos[pFicha.id] ?? 0}
          onLike={() => alternarLike(pFicha)} onAdd={(v) => agregar(pFicha, v)} onCerrar={() => setFicha(null)} />
      )}

      {abierto && (
        <>
          <div className="mc-back" onClick={cerrarCarrito} />
          <aside className="mc-dr" role="dialog" aria-label="Carrito">
            <div className="mc-dh">
              <div className="mc-dh-t">
                {pasoEf > 0 && (
                  <button type="button" className="mc-x" aria-label="Paso anterior" onClick={() => setPaso(pasoEf - 1)}><Chev dir="l" /></button>
                )}
                <b>{listo ? '¡Pedido recibido!' : titulos[pasoEf]}</b>
              </div>
              <button type="button" className="mc-x" aria-label="Cerrar" onClick={cerrarCarrito}><Close /></button>
            </div>

            {!listo && items.length > 0 && (
              <div className="mc-pasos" aria-label="Progreso del pedido">
                {PASOS.map((t, i) => (
                  <span key={t} className={i === pasoEf ? 'on' : i < pasoEf ? 'hecho' : ''} aria-current={i === pasoEf ? 'step' : undefined}>
                    <i>{i < pasoEf ? <Check s={11} /> : i + 1}</i>{t}
                  </span>
                ))}
              </div>
            )}

            {/* ── Paso 1: carrito ── */}
            {/* ⟵ CAMBIO: pedido guardado en el panel de Karen → confirmación + WhatsApp */}
            {listo && (
              <>
                <div className="mc-lista">
                  <div className="mc-ok">
                    <span><Check s={22} /></span>
                    <p>Tu pedido <b>{listo.codigo || 'quedó registrado'}</b> por <b>{cop(listo.total)}</b> llegó a {tienda}. Te contactaremos para confirmar la entrega y el pago.</p>
                  </div>
                </div>
                <div className="mc-pie">
                  {listo.link !== '#' && (
                    <a className="mc-pedir" href={listo.link} target="_blank" rel="noopener noreferrer">Enviar resumen por WhatsApp</a>
                  )}
                  <button type="button" className="mc-sig mc-sig-sec" onClick={() => { setListo(null); cerrarCarrito(); }}>Listo</button>
                </div>
              </>
            )}

            {!listo && pasoEf === 0 && (
              <>
                <div className="mc-lista">
                  {cuponOk && (
                    <div className="mc-cupon">
                      <span><b>{cuponOk.codigo}</b> · {cuponOk.tipo === 'porcentaje' ? `−${cuponOk.valor}%` : `−${cop(cuponOk.valor)}`}</span>
                      <button type="button" onClick={quitarCupon}>Quitar</button>
                    </div>
                  )}
                  {items.length === 0 ? (
                    <p className="mc-vacio">Tu carrito está vacío. Agrega una pieza con el botón “Agregar”.</p>
                  ) : items.map((i) => (
                    <div key={i.key} className="mc-it">
                      {i.foto
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={i.foto} alt={i.nombre} />
                        : <div className="mc-ph" />}
                      <div>
                        <h5>{i.nombre}</h5>
                        <small>{i.tamano ? `${i.id === ID_MALLA ? '' : 'Tamaño '}${i.tamano} · ` : ''}{cop(i.precio)}</small>
                        <div className="mc-r">
                          <span>
                            <span className="mc-q">
                              <button type="button" aria-label="Quitar uno" onClick={() => cambiar(i.key, -1)}>−</button>
                              <span>{i.qty}</span>
                              <button type="button" aria-label="Agregar uno" onClick={() => cambiar(i.key, 1)} disabled={i.qty >= i.max}>+</button>
                            </span>
                            <button type="button" className="mc-rm" onClick={() => quitar(i.key)}>Quitar</button>
                          </span>
                          <b>{cop(i.precio * i.qty)}</b>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {items.length > 0 && (
                  <div className="mc-pie">
                    {totales}
                    <button type="button" className="mc-sig" onClick={() => setPaso(1)}>Continuar con mis datos</button>
                    <p className="mc-nota">{zonas.length ? `Domicilio a ${zonas.join(', ')}` : 'El domicilio se confirma según tu zona.'}</p>
                  </div>
                )}
              </>
            )}

            {/* ── Paso 2: datos de envío ── */}
            {pasoEf === 1 && (
              <>
                <div className="mc-lista">
                  <form className="mc-form" onSubmit={(e) => { e.preventDefault(); if (valido) setPaso(2); }} noValidate>
                    <div className="mc-ent" role="group" aria-label="Forma de entrega">
                      <button type="button" className={envio.entrega === 'domicilio' ? 'on' : ''} onClick={() => poner('entrega', 'domicilio')}>Domicilio</button>
                      <button type="button" className={envio.entrega === 'recoger' ? 'on' : ''} onClick={() => poner('entrega', 'recoger')}>Recoger en tienda</button>
                    </div>

                    <Campo id="env-nombre" label="Nombre y apellido" error={err('nombre')}>
                      <input id="env-nombre" value={envio.nombre} autoComplete="name" placeholder="Ej: María Gómez"
                        aria-invalid={!!err('nombre')} onBlur={() => tocar('nombre')} onChange={(e) => poner('nombre', e.target.value)} />
                    </Campo>

                    <Campo id="env-tel" label="Celular / WhatsApp" error={err('telefono')}>
                      <input id="env-tel" value={envio.telefono} inputMode="tel" autoComplete="tel" placeholder="3001234567"
                        aria-invalid={!!err('telefono')} onBlur={() => tocar('telefono')} onChange={(e) => poner('telefono', e.target.value)} />
                    </Campo>

                    <Campo id="env-correo" label="Correo" opcional error={err('correo')}>
                      <input id="env-correo" type="email" value={envio.correo} autoComplete="email" placeholder="tucorreo@email.com"
                        aria-invalid={!!err('correo')} onBlur={() => tocar('correo')} onChange={(e) => poner('correo', e.target.value)} />
                    </Campo>

                    {envio.entrega === 'domicilio' ? (
                      <>
                        <div className="mc-dos">
                          {/* ⟵ CAMBIO: zonas de la hoja Configuración */}
                          <Campo id="env-zona" label="Zona de entrega" error={err('zona')}>
                            {zonas.length ? (
                              <select id="env-zona" className="mc-sel" value={envio.zona}
                                aria-invalid={!!err('zona')} onBlur={() => tocar('zona')} onChange={(e) => { poner('zona', e.target.value); tocar('zona'); }}>
                                <option value="">Elige tu zona</option>
                                {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
                              </select>
                            ) : (
                              <input id="env-zona" value={envio.zona} autoComplete="address-level2" placeholder="Ej: Medellín"
                                aria-invalid={!!err('zona')} onBlur={() => tocar('zona')} onChange={(e) => poner('zona', e.target.value)} />
                            )}
                          </Campo>
                          <Campo id="env-barrio" label="Barrio" error={err('barrio')}>
                            <input id="env-barrio" value={envio.barrio} placeholder="Ej: El Poblado"
                              aria-invalid={!!err('barrio')} onBlur={() => tocar('barrio')} onChange={(e) => poner('barrio', e.target.value)} />
                          </Campo>
                        </div>

                        <Campo id="env-dir" label="Dirección" error={err('direccion')}>
                          <input id="env-dir" value={envio.direccion} autoComplete="street-address" placeholder="Ej: Calle 10 # 43-12"
                            aria-invalid={!!err('direccion')} onBlur={() => tocar('direccion')} onChange={(e) => poner('direccion', e.target.value)} />
                        </Campo>

                        <Campo id="env-comp" label="Apartamento, torre o casa" opcional>
                          <input id="env-comp" value={envio.complemento} placeholder="Ej: Torre 2, apto 504"
                            onChange={(e) => poner('complemento', e.target.value)} />
                        </Campo>
                      </>
                    ) : (
                      <p className="mc-recoger">Recogerás tu pedido en la tienda. Te confirmamos la dirección y el horario por WhatsApp.</p>
                    )}

                    <Campo id="env-ind" label="Indicaciones para la entrega" opcional>
                      <textarea id="env-ind" rows={2} maxLength={200} value={envio.indicaciones} placeholder="Portería, punto de referencia, horario…"
                        onChange={(e) => poner('indicaciones', e.target.value)} />
                    </Campo>
                  </form>
                </div>

                <div className="mc-pie">
                  {totales}
                  <button type="button" className="mc-sig" disabled={!valido} onClick={() => setPaso(2)}>Continuar</button>
                  {!valido && (
                    <p className="mc-bloq">Completa {faltan === 1 ? 'el campo obligatorio' : `los ${faltan} campos obligatorios`} para continuar.</p>
                  )}
                </div>
              </>
            )}

            {/* ── Paso 3: confirmar ── */}
            {pasoEf === 2 && (
              <>
                <div className="mc-lista">
                  <div className="mc-res">
                    <h5>Tu pedido <button type="button" className="mc-link" onClick={() => setPaso(0)}>Editar</button></h5>
                    <div className="mc-caja">
                      {items.map((i) => (
                        <div key={i.key} className="mc-rl">
                          <span>{i.nombre}{i.tamano ? ` (${i.tamano})` : ''} ×{i.qty}</span>
                          <b>{cop(i.precio * i.qty)}</b>
                        </div>
                      ))}
                    </div>

                    <h5>Entrega <button type="button" className="mc-link" onClick={() => setPaso(1)}>Editar</button></h5>
                    <div className="mc-caja">
                      <span><b>{envio.nombre.trim()}</b></span>
                      <span>{soloCelular(envio.telefono)}{envio.correo.trim() ? ` · ${envio.correo.trim()}` : ''}</span>
                      {envio.entrega === 'domicilio' ? (
                        <span>
                          {envio.direccion.trim()}{envio.complemento.trim() ? `, ${envio.complemento.trim()}` : ''}<br />
                          {envio.barrio.trim()}, {envio.zona.trim()}
                        </span>
                      ) : (
                        <span>Recoger en tienda</span>
                      )}
                      {envio.indicaciones.trim() && <span>“{envio.indicaciones.trim()}”</span>}
                    </div>
                  </div>
                </div>

                <div className="mc-pie">
                  {totales}
                  {errEnvio && <p className="mc-err-box" role="alert">{errEnvio}</p>}
                  <button type="button" className="mc-pedir" disabled={!valido || enviando} onClick={pedir}>
                    <Check s={18} /> {enviando ? 'Enviando…' : 'Enviar pedido'}
                  </button>
                  <p className="mc-nota">Te confirmamos disponibilidad, envío y forma de pago.</p>
                </div>
              </>
            )}
          </aside>
        </>
      )}

      {aviso && <div className="mc-aviso" role="status">{aviso}</div>}
    </>
  );
}