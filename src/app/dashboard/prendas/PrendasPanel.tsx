// 📁 RUTA: src/app/dashboard/prendas/PrendasPanel.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Prenda = {
  id: string; codigo: string; nombre: string; categoria: string; quilate: string; peso: string;
  tamano: string; descripcion: string; foto_url: string; precio_manual: string; stock: string;
  activo: string; creado: string; actualizado: string; precio: number;
};
type Precios = { p24: string; p18: string; p14: string; margen: string };

const CATEGORIAS = ['Anillos', 'Collares', 'Aretes', 'Pulseras', 'Dijes', 'Cadenas', 'Esclavas'];
const QUILATES = ['24', '18', '14'];
const VERDE = '#0b4a2e';
const ORO = '#b08d3c';
const ZOOM = 2.2;   // aumento de la lupa (modo mouse)
const LENTE = 140;  // diámetro de la lupa en px

const FORM_VACIO = {
  nombre: '', categoria: 'Anillos', quilate: '18', peso: '', tamano: '',
  stock: '1', precio_manual: '', descripcion: '', foto_url: '',
};

const cop = (n: number) => (n > 0 ? `$${n.toLocaleString('es-CO')}` : 'Sin precio');
const fecha = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }).format(d);
};

const SEP = '|'; // varias fotos por prenda se guardan en foto_url separadas por |
const MAX_FOTOS = 6;
const parseFotos = (v: string) => (v || '').split(SEP).map((x) => x.trim()).filter(Boolean);

type Variante = { tamano: string; peso: string; stock: string; precio_manual: string; fotos: string[] };
const varVacia = (): Variante => ({ tamano: '', peso: '', stock: '1', precio_manual: '', fotos: [] });
/** Una prenda con varios tamaños guarda sus variantes como JSON dentro del campo `tamano` (no hace falta tocar el backend). */
function parseVariantes(tamano: string): Variante[] | null {
  const t = (tamano || '').trim();
  if (!t.startsWith('[')) return null;
  try {
    const arr = JSON.parse(t);
    if (!Array.isArray(arr) || !arr.length) return null;
    return arr.map((x: Record<string, unknown>) => ({
      tamano: String(x.t ?? ''), peso: String(x.p ?? ''), stock: String(x.s ?? '0'), precio_manual: String(x.m ?? ''), fotos: parseFotos(String(x.f ?? '')),
    }));
  } catch {
    return null;
  }
}
const serializarVariantes = (vs: Variante[]) =>
  JSON.stringify(vs.map((v) => ({ t: v.tamano, p: v.peso, s: v.stock, m: v.precio_manual, f: v.fotos.join(SEP) })));

/* ---------- Iconos ---------- */
const ico = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const ico2 = { ...ico, width: 16, height: 16 };
const IcoCorazon = () => (<svg {...ico} fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>);
const IcoLapiz = () => (<svg {...ico2}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>);
const IcoPapelera = () => (<svg {...ico2}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>);
const IcoLupa = () => (<svg {...ico2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></svg>);
const IcoCerrar = () => (<svg {...ico2}><path d="M6 6l12 12M18 6L6 18" /></svg>);
const IcoMas = () => (<svg {...ico2}><path d="M12 5v14M5 12h14" /></svg>);
const IcoChev = ({ dir }: { dir: 'izq' | 'der' }) => (<svg {...ico2}><path d={dir === 'izq' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></svg>);

type Lente = { x: number; y: number; w: number; h: number; z?: number; op?: number };

/* ---------- Foto con efecto lupa ---------- */
function FotoLupa({ fotos, alt, onAbrir, children }: { fotos: string[]; alt: string; onAbrir: (i: number) => void; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [lupa, setLupa] = useState<Lente | null>(null);
  const x0 = useRef<number | null>(null);
  const deslizo = useRef(false);
  const n = fotos.length;
  const i = Math.min(idx, n - 1);
  const src = fotos[i];

  const ir = (d: number) => {
    setLupa(null);
    setIdx((i + d + n) % n);
  };

  const cur = lupa;
  const Z = ZOOM;

  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    if ((e.target as HTMLElement).closest('.pr-nav, .pr-dots')) return setLupa(null);
    const r = ref.current.getBoundingClientRect();
    setLupa({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  };
  const abajo = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') x0.current = e.clientX;
  };
  const arriba = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || x0.current === null) return;
    const dx = e.clientX - x0.current;
    x0.current = null;
    if (n > 1 && Math.abs(dx) > 40) {
      deslizo.current = true;
      ir(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div
      ref={ref}
      className="pr-foto"
      style={{ touchAction: n > 1 ? 'pan-y' : 'auto' }}
      role="button"
      tabIndex={0}
      aria-label={`Ver ${alt} en grande`}
      onPointerMove={mover}
      onPointerLeave={() => setLupa(null)}
      onPointerDown={abajo}
      onPointerUp={arriba}
      onClick={() => {
        if (deslizo.current) { deslizo.current = false; return; }
        onAbrir(i);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(i); }
        else if (n > 1 && e.key === 'ArrowRight') ir(1);
        else if (n > 1 && e.key === 'ArrowLeft') ir(-1);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={`bg${i}`} className="pr-bg" src={src} alt="" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={`m${i}`} className="pr-main pr-fade" src={src} alt={n > 1 ? `${alt} (${i + 1} de ${n})` : alt} />
      {children}
      {n > 1 && <span className="pr-cnt" aria-label={`Foto ${i + 1} de ${n}`}>{i + 1} / {n}</span>}
      <span className="pr-hint"><IcoLupa /> Ampliar</span>

      {n > 1 && (
        <>
          <button type="button" className="pr-nav prev" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); ir(-1); }}><IcoChev dir="izq" /></button>
          <button type="button" className="pr-nav next" aria-label="Foto siguiente" onClick={(e) => { e.stopPropagation(); ir(1); }}><IcoChev dir="der" /></button>
          <div className="pr-dots">
            {fotos.map((_, k) => (
              <button key={k} type="button" className={k === i ? 'on' : ''} aria-label={`Ir a la foto ${k + 1}`} onClick={(e) => { e.stopPropagation(); setLupa(null); setIdx(k); }} />
            ))}
          </div>
        </>
      )}

      {cur && (
        <div className="pr-lupa" style={{ left: cur.x - LENTE / 2, top: cur.y - LENTE / 2 }} aria-hidden>
          {/* mismo fondo desenfocado que la tarjeta, ampliado, para que la lupa no muestre bandas lisas */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            style={{ position: 'absolute', maxWidth: 'none', width: cur.w * Z * 1.24, height: cur.h * Z * 1.24, left: LENTE / 2 - cur.x * Z - cur.w * Z * 0.12, top: LENTE / 2 - cur.y * Z - cur.h * Z * 0.12, objectFit: 'cover', filter: `blur(${22 * Z * 0.5}px) saturate(1.1) brightness(.75)` }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            style={{ position: 'absolute', maxWidth: 'none', width: cur.w * Z, height: cur.h * Z, left: LENTE / 2 - cur.x * Z, top: LENTE / 2 - cur.y * Z, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------- Galería de fotos del formulario (sirve para la prenda y para cada tamaño) ---------- */
function GaleriaForm({ fotos, subiendo, onSubir, onCambio, titulo }: {
  fotos: string[]; subiendo: boolean; onSubir: (e: React.ChangeEvent<HTMLInputElement>) => void; onCambio: (f: string[]) => void; titulo?: string;
}) {
  return (
    <div className="pr-gal">
      <div className="pr-gal-top">
        <strong>{titulo || 'Fotos de la pieza'}</strong>
        <span>{fotos.length}/{MAX_FOTOS} · PNG, JPG o WEBP · máx. 4 MB c/u · la primera es la portada</span>
      </div>
      <div className="pr-gal-grid">
        {fotos.map((u, k) => (
          <div key={u + k} className="pr-th">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Foto ${k + 1}`} />
            {k === 0 ? <b className="pr-por">Portada</b> : <button type="button" className="pr-por2" onClick={() => onCambio([fotos[k], ...fotos.filter((_, j) => j !== k)])}>Hacer portada</button>}
            <button type="button" className="pr-th-x" onClick={() => onCambio(fotos.filter((_, j) => j !== k))} aria-label={`Quitar foto ${k + 1}`}><IcoCerrar /></button>
          </div>
        ))}
        {fotos.length < MAX_FOTOS && (
          <label className="pr-th add">
            {subiendo ? <span className="pr-sp" aria-hidden /> : <IcoMas />}
            <span>{subiendo ? 'Subiendo…' : 'Agregar fotos'}</span>
            <input type="file" multiple accept="image/png,image/jpeg,image/webp" hidden onChange={onSubir} disabled={subiendo} />
          </label>
        )}
      </div>
    </div>
  );
}

/* ---------- Sección por categoría: cuadrícula en PC, carrusel en móvil ---------- */
function Categoria({ nombre, total, onNueva, children }: { nombre: string; total: number; onNueva: () => void; children: React.ReactNode }) {
  const pista = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);

  const paso = () => {
    const el = pista.current;
    const c = el?.children[0] as HTMLElement | undefined;
    if (!el || !c) return 0;
    return c.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 0);
  };
  const alDesplazar = () => {
    const el = pista.current;
    const p = paso();
    if (!el || !p) return;
    setPos(Math.max(0, Math.min(total - 1, Math.round(el.scrollLeft / p))));
  };
  const ir = (d: number) => {
    const el = pista.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, Math.min(total - 1, pos + d)) * paso(), behavior: 'smooth' });
  };

  return (
    <section className="pr-sec" aria-label={nombre}>
      <header className="pr-sec-h">
        <h2>{nombre}</h2>
        <span className="pr-sec-n">{total} {total === 1 ? 'pieza' : 'piezas'}</span>
        <i className="pr-sec-l" />
        {total > 1 && (
          <div className="pc-ctl" aria-label={`Navegar ${nombre}`}>
            <button type="button" onClick={() => ir(-1)} disabled={pos <= 0} aria-label="Pieza anterior"><IcoChev dir="izq" /></button>
            {total <= 8 ? (
              <span className="pc-pts" aria-hidden>
                {Array.from({ length: total }).map((_, k) => <i key={k} className={k === pos ? 'on' : ''} />)}
              </span>
            ) : (
              <span className="pc-cnt-n">{pos + 1}/{total}</span>
            )}
            <button type="button" onClick={() => ir(1)} disabled={pos >= total - 1} aria-label="Pieza siguiente"><IcoChev dir="der" /></button>
          </div>
        )}
      </header>
      <div className="pc-grid" ref={pista} onScroll={alDesplazar}>
        {children}
        <button type="button" className="pc-nueva" onClick={onNueva}>
          <span><IcoMas /></span>
          Nueva en {nombre}
        </button>
      </div>
    </section>
  );
}

export default function PrendasPanel({ inicial, precios }: { inicial: Prenda[]; precios: Precios }) {
  const [lista, setLista] = useState<Prenda[]>(inicial);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'activas' | 'borrador'>('todas');
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [visor, setVisor] = useState<{ p: Prenda; fotos: string[]; i: number } | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [cat, setCat] = useState('todas');
  const [multi, setMulti] = useState(false);
  const [vars, setVars] = useState<Variante[]>([varVacia()]);
  const [sel, setSel] = useState<Record<string, number>>({});
  const [subiendoEn, setSubiendoEn] = useState<'s' | number | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({}); // me encanta por id de prenda
  const [detalle, setDetalle] = useState<string | null>(null); // id de la única tarjeta con detalles abiertos
  const [exp, setExp] = useState<string | null>(null); // móvil: id de la tarjeta con la información desplegada
  const aBorrar = lista.find((x) => x.id === confirmar) || null;
  const portadaBorrar = aBorrar ? parseFotos(aBorrar.foto_url)[0] : '';
  const fotosForm = parseFotos(form.foto_url);

  useEffect(() => {
    if (!abierto && !visor && !confirmar) return;
    const esc = (e: KeyboardEvent) => {
      if (confirmar) { if (e.key === 'Escape' && !borrando) setConfirmar(null); return; }
      if (visor && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const n = visor.fotos.length;
        if (n > 1) setVisor((v) => (v ? { ...v, i: (v.i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n } : v));
        return;
      }
      if (e.key !== 'Escape') return;
      if (visor) setVisor(null);
      else setAbierto(false);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto, visor, confirmar, borrando]);

  // "Me encanta" de los clientes: se consulta cada 8 s (solo con la pestaña visible) y al volver a ella
  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/likes', { cache: 'no-store' });
        if (!res.ok) return;
        const d = await res.json();
        if (vivo && d && typeof d.likes === 'object' && d.likes) setLikes(d.likes as Record<string, number>);
      } catch { /* sin conexión: se reintenta en el siguiente ciclo */ }
    };
    leer();
    const t = setInterval(leer, 8000);
    const vis = () => { if (!document.hidden) leer(); };
    document.addEventListener('visibilitychange', vis);
    return () => { vivo = false; clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, []);

  // Cierra el panel de detalles con Escape
  useEffect(() => {
    if (!detalle) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetalle(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [detalle]);

  // Precio estimado en vivo dentro del formulario
  const estimado = useMemo(() => {
    const manual = Number(form.precio_manual.replace(/\D/g, ''));
    if (manual > 0) return manual;
    const gramo = Number(String(precios[`p${form.quilate}` as keyof Precios]).replace(/\D/g, ''));
    const peso = Number(form.peso.replace(',', '.'));
    const margen = Number(String(precios.margen || '0').replace(',', '.')) || 0;
    return peso > 0 && gramo > 0 ? Math.round(peso * gramo * (1 + margen / 100)) : 0;
  }, [form, precios]);

  const calcPrecio = (quilate: string, peso: string, manual: string) => {
    const m = Number(String(manual || '').replace(/\D/g, ''));
    if (m > 0) return m;
    const gramo = Number(String(precios[`p${quilate}` as keyof Precios]).replace(/\D/g, ''));
    const pe = Number(String(peso || '').replace(',', '.'));
    const margen = Number(String(precios.margen || '0').replace(',', '.')) || 0;
    return pe > 0 && gramo > 0 ? Math.round(pe * gramo * (1 + margen / 100)) : 0;
  };

  const visibles = lista.filter((p) => {
    const texto = `${p.nombre} ${p.codigo} ${p.categoria}`.toLowerCase();
    if (q && !texto.includes(q.toLowerCase())) return false;
    if (filtro === 'activas') return p.activo === 'true';
    if (filtro === 'borrador') return p.activo !== 'true';
    return true;
  });
  const nActivas = lista.filter((p) => p.activo === 'true').length;
  const totalLikes = lista.reduce((t, p) => t + (likes[p.id] || 0), 0);
  const valorPrenda = (p: Prenda) => {
    const vs = parseVariantes(p.tamano);
    return vs ? vs.reduce((t, v) => t + calcPrecio(p.quilate, v.peso, v.precio_manual) * (Number(v.stock) || 0), 0) : p.precio * (Number(p.stock) || 0);
  };
  const valorPublicado = lista.filter((p) => p.activo === 'true').reduce((t, p) => t + valorPrenda(p), 0);
  const presentes = [
    ...CATEGORIAS.filter((c) => visibles.some((p) => p.categoria === c)),
    ...Array.from(new Set(visibles.map((p) => p.categoria))).filter((c) => c && !CATEGORIAS.includes(c)),
  ];
  const catActiva = cat !== 'todas' && presentes.includes(cat) ? cat : 'todas';
  const secciones = presentes.filter((c) => catActiva === 'todas' || c === catActiva).map((c) => ({ c, items: visibles.filter((p) => p.categoria === c) }));

  const set = (k: keyof typeof FORM_VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const avisar = (t: string, ms = 3500) => {
    setAviso(t);
    setTimeout(() => setAviso(''), ms);
  };

  function abrir(categoria?: string) {
    setDetalle(null);
    setEditId(null);
    setForm(categoria ? { ...FORM_VACIO, categoria } : FORM_VACIO);
    setMulti(false);
    setVars([varVacia()]);
    setError('');
    setAbierto(true);
  }

  function abrirEditar(p: Prenda) {
    const vs = parseVariantes(p.tamano);
    setDetalle(null);
    setEditId(p.id);
    setMulti(!!vs);
    setVars(vs ?? [varVacia()]);
    setForm({
      nombre: p.nombre || '',
      categoria: p.categoria || 'Anillos',
      quilate: p.quilate || '18',
      peso: p.peso || '',
      tamano: vs ? '' : p.tamano || '',
      stock: p.stock || '1',
      precio_manual: p.precio_manual || '',
      descripcion: p.descripcion || '',
      foto_url: p.foto_url || '',
    });
    setError('');
    setAbierto(true);
  }

  async function subirFotos(e: React.ChangeEvent<HTMLInputElement>, destino: 's' | number) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const actuales = destino === 's' ? parseFotos(form.foto_url) : vars[destino]?.fotos ?? [];
    const libres = MAX_FOTOS - actuales.length;
    const lote = files.slice(0, Math.max(libres, 0));
    setSubiendo(true);
    setSubiendoEn(destino);
    setError(files.length > lote.length ? `Máximo ${MAX_FOTOS} fotos por prenda` : '');
    const nuevas: string[] = [];
    try {
      for (const file of lote) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Usa imágenes PNG, JPG o WEBP');
        if (file.size > 4 * 1024 * 1024) throw new Error(`"${file.name}" pesa más de 4 MB`);
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/prendas/foto', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo subir la foto');
        nuevas.push(data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      if (nuevas.length) {
        if (destino === 's') setForm((f) => ({ ...f, foto_url: [...parseFotos(f.foto_url), ...nuevas].join(SEP) }));
        else setVars((vs) => vs.map((v, j) => (j === destino ? { ...v, fotos: [...v.fotos, ...nuevas] } : v)));
      }
      setSubiendo(false);
      setSubiendoEn(null);
    }
  }

  const setFotosSimple = (arr: string[]) => setForm((f) => ({ ...f, foto_url: arr.join(SEP) }));
  const setVar = (k: number, patch: Partial<Variante>) => setVars((vs) => vs.map((v, j) => (j === k ? { ...v, ...patch } : v)));
  const agregarVar = () => setVars((vs) => (vs.length >= 12 ? vs : [...vs, varVacia()]));
  const quitarVar = (k: number) => setVars((vs) => (vs.length <= 1 ? vs : vs.filter((_, j) => j !== k)));

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      const editando = editId !== null;
      let payload: Record<string, string> = { ...form };
      if (multi) {
        const vs = vars.map((v) => ({ ...v, tamano: v.tamano.trim() }));
        if (vs.some((v) => !v.tamano)) throw new Error('Cada tamaño necesita un nombre, por ejemplo 45 cm');
        if (new Set(vs.map((v) => v.tamano.toLowerCase())).size !== vs.length) throw new Error('Hay tamaños repetidos');
        const v0 = vs[0];
        payload = {
          ...form,
          tamano: serializarVariantes(vs),
          peso: v0.peso,
          precio_manual: v0.precio_manual,
          foto_url: v0.fotos.join(SEP),
          stock: String(vs.reduce((t, v) => t + (Number(v.stock) || 0), 0)),
        };
      }
      const res = await fetch(editando ? `/api/prendas/${editId}` : '/api/prendas', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (editando ? 'No se pudo guardar' : 'No se pudo crear la prenda'));
      if (editando) {
        setLista((l) => l.map((x) => (x.id === editId ? data : x)));
        avisar('Cambios guardados.', 3000);
      } else {
        setLista((l) => [data, ...l]);
        avisar('Prenda creada. Está inhabilitada hasta que actives el interruptor.', 4000);
      }
      setAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(p: Prenda) {
    const nuevo = p.activo === 'true' ? 'false' : 'true';
    setLista((l) => l.map((x) => (x.id === p.id ? { ...x, activo: nuevo } : x))); // optimista
    try {
      const res = await fetch(`/api/prendas/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLista((l) => l.map((x) => (x.id === p.id ? data : x)));
    } catch {
      setLista((l) => l.map((x) => (x.id === p.id ? { ...x, activo: p.activo } : x)));
      avisar('No se pudo cambiar el estado. Intenta de nuevo.');
    }
  }

  async function borrar(p: Prenda) {
    setBorrando(true);
    try {
      const res = await fetch(`/api/prendas/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLista((l) => l.filter((x) => x.id !== p.id));
      setDetalle((d) => (d === p.id ? null : d));
      avisar(`"${p.nombre}" eliminada.`);
    } catch {
      avisar('No se pudo eliminar la prenda.');
    } finally {
      setBorrando(false);
      setConfirmar(null);
    }
  }

  const tarjeta = (p: Prenda, i: number) => {
    const on = p.activo === 'true';
    const vs = parseVariantes(p.tamano);
    const vi = vs ? Math.min(sel[p.id] ?? 0, vs.length - 1) : 0;
    const v = vs ? vs[vi] : null;
    const peso = v ? v.peso : p.peso;
    const tamano = v ? v.tamano : p.tamano;
    const stockTxt = v ? v.stock : p.stock;
    const manual = v ? v.precio_manual : p.precio_manual;
    const precio = v ? calcPrecio(p.quilate, v.peso, v.precio_manual) : p.precio;
    const stock = Number(stockTxt) || 0;
    // Foto(s) del tamaño elegido; si ese tamaño no tiene fotos, usa las del primero que sí tenga
    const fotos = v ? (v.fotos.length ? v.fotos : (vs ?? []).find((x) => x.fotos.length)?.fotos ?? []) : parseFotos(p.foto_url);
    const estado = stock === 0 ? { t: 'Agotada', c: 'ag' } : stock === 1 ? { t: 'Última unidad', c: 'ul' } : { t: `${stock} disponibles`, c: 'ok' };
    const abiertoDet = detalle === p.id;
    const desplegada = exp === p.id;
    const nLikes = likes[p.id] || 0;
    const insignias = (
      <>
        <span className={`pc-like ${nLikes ? '' : 'cero'}`} title="Me encanta de los clientes" aria-label={`${nLikes} me encanta`}><IcoCorazon /><b key={nLikes}>{nLikes}</b></span>
        <div className="pc-pie"><span>Fotografía real</span><b>{peso ? `${peso} g` : ''}</b></div>
        <div className="pc-nom-ov">
          <small>{p.categoria}{peso ? ` · ${peso} g` : ''}</small>
          <h3>{p.nombre}</h3>
        </div>
      </>
    );
    return (
      <article key={p.id} className={`pc-card ${on ? '' : 'off'}`} style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
        {fotos.length ? (
          <FotoLupa key={`${p.id}-${vi}`} fotos={fotos} alt={p.nombre} onAbrir={(k) => setVisor({ p, fotos, i: k })}>{insignias}</FotoLupa>
        ) : (
          <div className="pr-foto" style={{ cursor: 'default' }}>
            <div className="pr-vacio-foto">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" />
              </svg>
            </div>
            {insignias}
          </div>
        )}

        <div className={`pc-info ${desplegada ? 'abre' : ''}`}>
          {/* Móvil: resumen siempre visible con botón para desplegar el resto */}
          <div className="pc-resumen">
            <div>
              <b>{cop(precio)}{precio > 0 && <small>COP</small>}</b>
              <span className={`pc-est ${estado.c}`}><i aria-hidden="true" />{estado.t}</span>
            </div>
            <button type="button" className="pc-tg" aria-expanded={desplegada} onClick={() => setExp(desplegada ? null : p.id)}>
              {desplegada ? 'Ocultar' : 'Detalles'} <IcoChev dir="der" />
            </button>
          </div>

          <div className="pc-top pc-det">
            <span className="pc-sku" title={p.codigo}>SKU: {p.codigo}</span>
            <span className={`pc-est ${estado.c}`}><i aria-hidden="true" />{estado.t}</span>
          </div>

          <h3 className="pc-nom" title={p.nombre}>{p.nombre}</h3>

          <div className="pc-det">
            <p className="pc-desc">{p.descripcion || 'Sin descripción.'}</p>
            <button type="button" className="pc-mas" onClick={() => setDetalle(p.id)} aria-haspopup="dialog" aria-expanded={abiertoDet}>
              Ver ficha completa <IcoChev dir="der" />
            </button>
          </div>

          {vs && (
            <div className="pc-tams" role="group" aria-label="Tamaño">
              {vs.map((x, k) => (
                <button key={k} type="button" aria-pressed={k === vi} onClick={() => setSel((m) => ({ ...m, [p.id]: k }))}>
                  {x.tamano || `Opción ${k + 1}`}
                  {x.fotos.length > 0 && <i>{x.fotos.length} {x.fotos.length === 1 ? 'foto' : 'fotos'}</i>}
                </button>
              ))}
            </div>
          )}

          <div className="pc-tiles pc-det">
            <div><span>Peso exacto</span><b>{peso ? `${peso} g` : '—'}</b></div>
            <div><span>Tamaño</span><b title={tamano}>{tamano || '—'}</b></div>
          </div>

          <div className="pc-precios pc-det">
            <div>
              <span>Precio público{manual && <em title="Precio fijado manualmente">Manual</em>}</span>
              <b>{cop(precio)}{precio > 0 && <small>COP</small>}</b>
            </div>
            <div className="vip">
              <span>Valor en stock</span>
              <b>{precio > 0 && stock > 0 ? cop(precio * stock) : '—'}{precio > 0 && stock > 0 && <small>COP</small>}</b>
            </div>
          </div>

          <div className="pc-acc pc-det">
            <div className="pc-sw">
              <button
                type="button" role="switch" aria-checked={on} className="pc-tog"
                onClick={() => alternar(p)} aria-label={on ? 'Inhabilitar prenda' : 'Publicar prenda'}
                title={on ? 'Publicada: clic para inhabilitar' : 'Inhabilitada: clic para publicar'}
              />
              <span>{on ? 'Publicada' : 'Inhabilitada'}</span>
            </div>
            <button type="button" className="pc-b gold" onClick={() => abrirEditar(p)}><IcoLapiz /> Editar</button>
            <button type="button" className="pc-b icon" onClick={() => { setDetalle(null); setConfirmar(p.id); }} title="Eliminar" aria-label={`Eliminar ${p.nombre}`}><IcoPapelera /></button>
          </div>
        </div>

        {/* Panel de detalles: se superpone dentro de la tarjeta, no cambia su altura y solo hay uno abierto */}
        {abiertoDet && (
          <div className="pr-ov" role="dialog" aria-label={`Detalles de ${p.nombre}`}>
            <header className="pr-ov-h">
              <div>
                <small>{p.categoria} · {p.codigo}</small>
                <h4>{p.nombre}</h4>
              </div>
              <button type="button" className="pr-ov-x" onClick={() => setDetalle(null)} aria-label="Cerrar detalles" autoFocus><IcoCerrar /></button>
            </header>

            <dl className="pr-ov-g">
              <div><dt>Quilate</dt><dd>{p.quilate}K</dd></div>
              <div><dt>Peso</dt><dd>{peso ? `${peso} g` : '—'}</dd></div>
              <div><dt>Tamaño</dt><dd>{tamano || '—'}</dd></div>
              <div><dt>Stock</dt><dd>{stockTxt} u.</dd></div>
            </dl>

            {vs && vs.length > 1 && (
              <>
                <div className="pr-ov-s">Tamaños disponibles</div>
                <div className="pr-ov-t">
                  {vs.map((x, k) => (
                    <span key={k} className={k === vi ? 'on' : ''}>{x.tamano || `Opción ${k + 1}`}<i>{x.stock} u.</i></span>
                  ))}
                </div>
              </>
            )}

            <div className="pr-ov-s">Descripción</div>
            <p className="pr-ov-d">{p.descripcion || 'Sin descripción.'}</p>

            <footer className="pr-ov-f">
              <span>Creada {fecha(p.creado)}</span>
              <span>{manual ? 'Precio manual' : 'Precio calculado'}<b>{cop(precio)}</b></span>
            </footer>
          </div>
        )}
      </article>
    );
  };

  return (
    <main className="d-cont simple">
      <style>{`
        .pr-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 2px 0 14px; }
        .pr-bus { flex: 1 1 260px; max-width: 420px; min-width: 200px; padding: 8px 14px; border-radius: 99px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13px; }
        .pr-fil { display: inline-flex; border: 1px solid rgba(128,128,128,.35); border-radius: 99px; overflow: hidden; background: #fff; }
        .pr-fil button { font: inherit; font-size: 12px; padding: 7px 14px; border: 0; background: transparent; cursor: pointer; color: inherit; }
        .pr-fil button[aria-pressed="true"] { background: ${VERDE}; color: #fff; }
        .pr-aviso { background: #e6f4ea; color: #1e6b34; padding: 9px 13px; border-radius: 10px; font-size: 12.5px; margin-bottom: 12px; }

        /* ---------- Foto ---------- */
        .pr-foto { position: relative; aspect-ratio: 5 / 6; overflow: hidden; cursor: crosshair; outline: none; background: #07241a; }
        .pr-foto:focus-visible { box-shadow: inset 0 0 0 2px var(--au); }
        .pr-bg { position: absolute; inset: -12%; width: 124%; height: 124%; object-fit: cover; filter: blur(22px) saturate(1.1) brightness(.75); }
        .pr-main { position: relative; width: 100%; height: 100%; object-fit: contain; display: block; transition: filter .3s, opacity .3s; }
        .pr-foto::after { content: ""; position: absolute; inset: auto 0 0 0; height: 42%; background: linear-gradient(to top, var(--c1) 6%, rgba(11,45,31,0)); pointer-events: none; z-index: 2; }
        .pr-vacio-foto { position: absolute; inset: 0; display: grid; place-items: center; color: ${ORO}; }
        .pr-fade { animation: prfade .35s both; }
        .pr-nav { position: absolute; top: 42%; transform: translateY(-50%); z-index: 5; width: 28px; height: 28px; border-radius: 50%; padding: 0; display: grid; place-items: center; cursor: pointer;
          border: 1px solid rgba(216,185,95,.55); background: rgba(6,24,17,.55); color: #ecd07a; backdrop-filter: blur(6px); opacity: 0; transition: opacity .2s, background .2s, color .2s; }
        .pr-nav.prev { left: 8px; } .pr-nav.next { right: 8px; }
        .pr-foto:hover .pr-nav, .pr-nav:focus-visible { opacity: 1; }
        .pr-nav:hover { background: #d8b95f; color: #0b2d1f; }
        .pr-dots { position: absolute; left: 0; right: 0; bottom: 36px; z-index: 5; display: flex; justify-content: center; align-items: center; gap: 6px; }
        .pr-dots button { width: 6px; height: 6px; padding: 0; border: 0; border-radius: 99px; background: rgba(243,234,210,.45); cursor: pointer; transition: width .25s, background .25s; }
        .pr-dots button.on { width: 18px; background: #ecd07a; }
        @media (hover: none) { .pr-nav { display: none; } }

        /* contador de fotos (esquina superior izquierda de la foto) */
        .pr-cnt { position: absolute; top: 10px; left: 10px; z-index: 4; pointer-events: none; height: 24px; padding: 0 10px; display: inline-flex; align-items: center;
          border-radius: 99px; font-size: 11px; font-weight: 600; letter-spacing: .08em; font-variant-numeric: tabular-nums; color: #f3ead2;
          background: rgba(6,16,11,.62); border: 1px solid rgba(255,255,255,.18); backdrop-filter: blur(6px); }

        .pr-vnav { position: absolute; top: 50%; transform: translateY(-50%); width: 46px; height: 46px; border-radius: 50%; border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.08); color: #fff; display: grid; place-items: center; cursor: pointer; }
        .pr-vnav:hover { background: rgba(255,255,255,.22); }
        .pr-vnav.prev { left: 18px; } .pr-vnav.next { right: 18px; }
        .pr-vtiras { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; max-width: 94vw; overflow-x: auto; padding: 4px; }
        .pr-vtiras button { width: 52px; height: 52px; padding: 0; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,.25); opacity: .55; cursor: pointer; background: #0e3b27; flex-shrink: 0; }
        .pr-vtiras button.on { border-color: #ecd07a; opacity: 1; }
        .pr-vtiras img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pr-gal { margin-bottom: 18px; }
        .pr-gal-top { display: flex; flex-direction: column; gap: 3px; margin-bottom: 10px; }
        .pr-gal-top span { font-size: 12px; color: #7a857e; }
        .pr-gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
        .pr-th { position: relative; aspect-ratio: 4 / 5; border-radius: 14px; overflow: hidden; background: #0e3b27; border: 1px solid rgba(128,128,128,.35); }
        .pr-th img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: contain; }
        .pr-th.add { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: #faf8f2; border: 1px dashed #c9bd94; color: #7a6a30; font-size: 12px; cursor: pointer; text-align: center; padding: 6px; }
        .pr-th.add:hover { background: #f4efdf; }
        .pr-por, .pr-por2 { position: absolute; left: 6px; bottom: 6px; font-size: 10px; padding: 3px 8px; border-radius: 99px; border: 0; }
        .pr-por { background: #d8b95f; color: #1c1c1c; font-weight: 700; }
        .pr-por2 { background: rgba(6,24,17,.7); color: #f3ead2; cursor: pointer; font-family: inherit; }
        .pr-por2:hover { background: #0b4a2e; }
        .pr-th-x { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; border: 0; display: grid; place-items: center; background: rgba(6,24,17,.7); color: #fff; cursor: pointer; padding: 0; }
        .pr-th-x:hover { background: #b04a3f; }

        /* ---------- Resumen y categorías ---------- */
        .pr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin: 4px 0 16px; }
        .pr-stats > div { background: #fff; border: 1px solid #ece7d6; border-radius: 14px; padding: 10px 14px; box-shadow: 0 6px 18px rgba(11,45,31,.05); }
        .pr-stats span { display: block; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #8a978f; font-weight: 600; }
        .pr-stats b { display: block; margin-top: 4px; font-family: var(--jks-serif, Georgia), serif; font-size: 21px; font-weight: 500; color: #0b2d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pr-stats .gold { background: linear-gradient(135deg, #0d3324, #07211a); border-color: rgba(216,185,95,.4); }
        .pr-stats .gold span { color: rgba(216,185,95,.85); }
        .pr-stats .gold b { color: #ecd07a; }
        .pr-chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 4px; }
        .pr-chips button { font: inherit; font-size: 12px; padding: 6px 13px; border-radius: 99px; border: 1px solid rgba(176,141,60,.4); background: #fff; color: #3c4a42; cursor: pointer; display: inline-flex; gap: 7px; align-items: center; transition: .2s; }
        .pr-chips button i { font-style: normal; font-size: 10.5px; background: #f1ead2; color: #8a6d25; padding: 1px 7px; border-radius: 99px; }
        .pr-chips button:hover { border-color: #b08d3c; }
        .pr-chips button[aria-pressed="true"] { background: #0b2d1f; border-color: #0b2d1f; color: #f3ead2; }
        .pr-chips button[aria-pressed="true"] i { background: rgba(236,208,122,.2); color: #ecd07a; }
        .pr-sec { margin-bottom: 4px; }
        .pr-sec-h { display: flex; align-items: center; gap: 12px; margin: 20px 0 6px; }
        .pr-sec-h h2 { margin: 0; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 23px; color: #0b2d1f; }
        .pr-sec-n { font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; color: #9a8441; font-weight: 600; white-space: nowrap; }
        .pr-sec-l { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(176,141,60,.6), rgba(176,141,60,.04)); }
        @media (max-width: 760px) { .pr-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .pr-sec-h h2 { font-size: 20px; } }

        /* ---------- Formulario ---------- */
        .pr-hoja { max-width: 700px !important; }
        .pr-multi { display: flex; gap: 12px; align-items: flex-start; margin: 18px 0; padding: 14px 16px; border-radius: 14px; background: #f6f3ea; border: 1px solid #ece7d6; cursor: pointer; }
        .pr-multi input { margin-top: 3px; width: 18px; height: 18px; accent-color: #0b4a2e; flex-shrink: 0; }
        .pr-multi b { display: block; font-size: 14px; color: #14231b; }
        .pr-multi small { display: block; font-size: 12px; color: #7a857e; margin-top: 2px; line-height: 1.4; }
        .pr-var { border: 1px solid #e6e1d2; border-radius: 16px; padding: 16px; margin-bottom: 14px; background: #fffdf8; }
        .pr-var-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 600; font-size: 13px; color: #0b2d1f; }
        .pr-var-x { border: 0; background: transparent; color: #b04a3f; cursor: pointer; font: inherit; font-size: 12px; display: inline-flex; gap: 5px; align-items: center; }
        .pr-var .pr-gal { margin: 14px 0 10px; }
        .pr-var-p { display: flex; justify-content: space-between; align-items: center; background: #eef4ef; border-radius: 12px; padding: 10px 14px; }
        .pr-var-p small { color: #5a6b62; font-size: 12px; }
        .pr-var-p b { font-size: 18px; color: #0b4a2e; }
        .pr-var-add { width: 100%; padding: 12px; border-radius: 14px; border: 1.5px dashed #c9bd94; background: #faf8f2; color: #7a6a30; cursor: pointer; font: inherit; font-size: 13px; display: inline-flex; justify-content: center; gap: 8px; align-items: center; }
        .pr-var-add:hover { background: #f4efdf; }

        /* ---------- Lupa ---------- */
        .pr-hint { position: absolute; z-index: 3; pointer-events: none; left: 50%; top: 46%; transform: translate(-50%, -50%) scale(.92); display: inline-flex; align-items: center; gap: 6px;
          font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #f3ead2; background: rgba(6,24,17,.55); border: 1px solid rgba(216,185,95,.4);
          padding: 6px 12px; border-radius: 99px; backdrop-filter: blur(6px); opacity: 0; transition: opacity .25s, transform .25s; }
        .pr-foto:hover .pr-hint { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        .pr-foto:has(.pr-lupa) .pr-hint { opacity: 0; }
        .pr-lupa { position: absolute; z-index: 6; pointer-events: none; width: ${LENTE}px; height: ${LENTE}px; border-radius: 50%; overflow: hidden;
          border: 2px solid #e6c970; background: #0e3b27;
          box-shadow: 0 10px 28px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.25), inset 0 0 18px rgba(0,0,0,.35); }
        .pr-lupa::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.25), transparent 45%); }

        /* ---------- Panel de detalles (superpuesto en la tarjeta) ---------- */
        .pr-ov { position: absolute; inset: 0; z-index: 8; display: flex; flex-direction: column; padding: 16px 16px 12px;
          background: linear-gradient(180deg, rgba(9,38,27,.97), rgba(5,24,17,.985)); backdrop-filter: blur(10px);
          animation: prsube .32s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes prsube { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .pr-ov-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding-bottom: 10px; margin-bottom: 10px;
          border-bottom: 1px solid rgba(216,185,95,.25); }
        .pr-ov-h small { display: block; font-size: 9.5px; letter-spacing: .2em; text-transform: uppercase; color: #d8b95f; font-weight: 600; margin-bottom: 5px; }
        .pr-ov-h h4 { margin: 0; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 18px; line-height: 1.2; color: #f3ead2; }
        .pr-ov-x { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; padding: 0; cursor: pointer;
          border: 1px solid rgba(216,185,95,.4); background: transparent; color: #d8b95f; transition: .2s; }
        .pr-ov-x:hover { background: #d8b95f; color: #0b2d1f; }
        .pr-ov-g { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 0 0 12px; }
        .pr-ov-g > div { padding: 7px 10px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(216,185,95,.14); min-width: 0; }
        .pr-ov-g dt { font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: rgba(216,185,95,.8); font-weight: 600; }
        .pr-ov-g dd { margin: 2px 0 0; font-size: 13px; color: #f3ead2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pr-ov-s { font-size: 9.5px; letter-spacing: .2em; text-transform: uppercase; color: #d8b95f; font-weight: 600; margin-bottom: 5px; }
        .pr-ov-t { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
        .pr-ov-t span { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; padding: 3px 9px; border-radius: 99px; color: rgba(243,234,210,.85); border: 1px solid rgba(216,185,95,.25); }
        .pr-ov-t span i { font-style: normal; font-size: 10px; color: rgba(216,185,95,.75); }
        .pr-ov-t span.on { border-color: #e6c970; color: #ecd07a; }
        .pr-ov-d { flex: 1; min-height: 0; margin: 0; overflow-y: auto; font-size: 12.5px; line-height: 1.55; color: rgba(243,234,210,.82); white-space: pre-line; padding-right: 4px; scrollbar-width: thin; scrollbar-color: rgba(216,185,95,.4) transparent; }
        .pr-ov-f { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(216,185,95,.2);
          font-size: 11px; color: rgba(243,234,210,.55); }
        .pr-ov-f span:last-child { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .pr-ov-f b { font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 16px; color: #ecd07a; }

        /* ---------- Confirmar eliminación ---------- */
        .pr-dlgf { position: fixed; inset: 0; z-index: 130; display: grid; place-items: center; padding: 18px; background: rgba(3,12,8,.74); backdrop-filter: blur(5px); animation: prfade .2s both; }
        .pr-dlg { width: 100%; max-width: 380px; text-align: center; padding: 30px 26px 24px; border-radius: 24px; color: #f3ead2;
          background: linear-gradient(180deg, #0d3324, #07211a); border: 1px solid rgba(216,185,95,.4);
          box-shadow: 0 30px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06); animation: prpop .28s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes prpop { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
        .pr-dlg-foto { position: relative; width: 96px; height: 96px; margin: 0 auto 24px; }
        .pr-dlg-img { position: absolute; inset: 0; border-radius: 24px; overflow: hidden; background: #0e3b27; border: 1px solid rgba(216,185,95,.55); display: grid; place-items: center; color: #d8b95f; }
        .pr-dlg-img img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; }
        .pr-dlg-ic { position: absolute; right: -10px; bottom: -10px; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: #b04a3f; border: 3px solid #0a291d; }
        .pr-dlg h3 { margin: 0 0 8px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 23px; color: #f3ead2; }
        .pr-dlg-n { margin: 0; font-size: 14px; line-height: 1.5; color: rgba(243,234,210,.85); }
        .pr-dlg-n b { font-weight: 600; color: #ecd07a; }
        .pr-dlg-n small { display: block; margin-top: 2px; font-size: 10.5px; letter-spacing: .2em; color: rgba(216,185,95,.85); }
        .pr-dlg-av { margin: 14px 0 0; font-size: 12.5px; line-height: 1.5; color: rgba(243,234,210,.6); }
        .pr-dlg-b { display: flex; gap: 10px; margin-top: 24px; }
        .pr-dlg-b button { flex: 1; font: inherit; font-size: 13px; padding: 12px 14px; border-radius: 99px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: .2s; }
        .pr-dlg-no { border: 1px solid rgba(216,185,95,.5); background: transparent; color: #ecd07a; }
        .pr-dlg-no:hover { background: rgba(216,185,95,.12); }
        .pr-dlg-si { border: 0; font-weight: 600; color: #fff; background: linear-gradient(135deg, #c65a4d, #a23c32); box-shadow: 0 6px 18px rgba(176,74,63,.4); }
        .pr-dlg-si:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(176,74,63,.5); }
        .pr-dlg-b button:disabled { opacity: .7; cursor: wait; }
        .pr-vacio { text-align: center; padding: 60px 20px; color: #7a857e; background: #faf8f2; border: 1px dashed #d8d3c4; border-radius: 20px; }

        /* ---------- Visor ---------- */
        .pr-visor { position: fixed; inset: 0; z-index: 120; background: rgba(5,14,9,.9); display: grid; place-items: center; padding: 24px; animation: prfade .2s both; }
        @keyframes prfade { from { opacity: 0; } to { opacity: 1; } }
        .pr-visor figure { margin: 0; max-width: 94vw; text-align: center; }
        .pr-visor figure img { max-width: 94vw; max-height: 70vh; object-fit: contain; border-radius: 16px; background: radial-gradient(circle at 50% 38%, #1f6a49, #07241a); box-shadow: 0 30px 80px rgba(0,0,0,.6); }
        .pr-visor figcaption { color: #f1ead3; margin-top: 14px; font-family: var(--jks-serif, Georgia), serif; font-size: 18px; }
        .pr-visor figcaption small { display: block; font-family: inherit; font-size: 11px; letter-spacing: .2em; color: #c9ad62; margin-top: 4px; font-weight: 600; }
        .pr-x { position: absolute; top: 18px; right: 18px; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.1); color: #fff; display: grid; place-items: center; cursor: pointer; }
        .pr-x:hover { background: rgba(255,255,255,.22); }

        /* ---------- Modal ---------- */
        .pr-modal { position: fixed; inset: 0; background: rgba(10,20,15,.55); display: grid; place-items: center; z-index: 100; padding: 16px; }
        .pr-hoja { background: #fff; border-radius: 22px; width: 100%; max-width: 620px; max-height: 92vh; overflow-y: auto; padding: 26px; }
        .pr-hoja h2 { margin: 0 0 4px; font-size: 24px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; }
        .pr-sub { font-size: 13px; color: #7a857e; margin: 0 0 18px; }
        .pr-fotos { display: flex; gap: 16px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
        .pr-prev { width: 110px; height: 130px; border-radius: 16px; overflow: hidden; border: 1px dashed rgba(128,128,128,.5); background: #0e3b27; display: grid; place-items: center; font-size: 12px; color: #9fb3a8; flex-shrink: 0; }
        .pr-prev img { width: 100%; height: 100%; object-fit: contain; }
        .pr-f { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pr-f label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 5px; color: #44514a; }
        .pr-f input, .pr-f select, .pr-f textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); font: inherit; font-size: 14px; background: #fff; }
        .pr-f .full { grid-column: 1 / -1; }
        .pr-est-box { margin-top: 16px; background: #eef4ef; border-radius: 14px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
        .pr-est-box small { color: #5a6b62; font-size: 12px; } .pr-est-box b { font-size: 22px; color: ${VERDE}; }
        .pr-err { color: #a12622; font-size: 13px; margin-top: 12px; }
        .pr-btns { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
        .pr-b2 { font: inherit; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); background: transparent; cursor: pointer; color: inherit; }
        .pr-sp { display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: prgiro .7s linear infinite; vertical-align: -2px; margin-right: 6px; }
        @keyframes prgiro { to { transform: rotate(360deg); } }
        @media (max-width: 560px) {
          .pr-f { grid-template-columns: 1fr; }
          .pr-hint { display: none; }
        }
        @media (prefers-reduced-motion: reduce) { .pc-card, .pr-ov, .pr-dlg, .pr-dlgf, .pr-visor { animation: none; } }

        /* ---------- Tarjeta horizontal compacta: foto a la izquierda, ficha a la derecha ---------- */
        .pc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 16px; align-items: stretch; padding: 8px 0 22px; }
        .pc-card { --c1: #07100c; position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(140px, 36%) minmax(0, 1fr); min-height: 270px;
          border-radius: 15px; background: #0a130f; color: #f1ede0; border: 1px solid rgba(255,255,255,.08); box-shadow: 0 12px 28px rgba(5,18,12,.22);
          transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s; animation: pcentra .5s both; }
        .pc-card:hover { transform: translateY(-3px); border-color: rgba(240,193,75,.4); box-shadow: 0 20px 40px rgba(5,18,12,.34); }
        @keyframes pcentra { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .pc-card button:focus-visible { outline: 2px solid #f0c14b; outline-offset: 2px; }
        .pc-card .pr-foto { aspect-ratio: auto; align-self: stretch; height: auto; min-height: 100%; background: #050a08; }
        .pc-card .pr-foto::after { height: 28%; }

        .pc-pie { position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; pointer-events: none; display: flex; justify-content: space-between; align-items: center; padding: 0 12px 10px;
          font-size: 10px; letter-spacing: .06em; color: rgba(241,237,224,.72); }
        .pc-pie b { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; color: #f0c14b; }

        /* Solo móvil: nombre sobre la foto, resumen y ctl del carrusel (ocultos en PC) */
        .pc-nom-ov, .pc-resumen, .pc-ctl { display: none; }

        .pc-info { min-width: 0; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 14px; background: linear-gradient(180deg, #0e1a15, #0a130f); }
        .pc-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .pc-sku { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .08em; color: #93a09a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pc-est { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 9px; border-radius: 99px; font-size: 10px; font-weight: 600; white-space: nowrap;
          background: rgba(60,170,110,.14); color: #8fdcb0; border: 1px solid rgba(92,190,134,.28); }
        .pc-est i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .pc-est.ul { background: rgba(232,169,79,.14); color: #f0c48f; border-color: rgba(232,169,79,.32); }
        .pc-est.ag { background: rgba(239,100,90,.14); color: #f2a59d; border-color: rgba(239,100,90,.32); }
        .pc-nom { margin: 0; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 19px; line-height: 1.2; color: #fff;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pc-desc { margin: 0; font-size: 12px; line-height: 1.5; color: #b4bdb7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pc-mas { margin-top: 4px; padding: 0; border: 0; background: none; font: inherit; font-size: 11.5px; font-weight: 600; color: #f0c14b; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: gap .2s; }
        .pc-mas:hover { gap: 8px; text-decoration: underline; }
        .pc-mas svg { width: 12px; height: 12px; }

        .pc-tams { display: flex; flex-wrap: wrap; gap: 5px; }
        .pc-tams button { font: inherit; font-size: 11px; padding: 4px 10px; border-radius: 99px; border: 1px solid rgba(255,255,255,.18); background: transparent; color: #c9d1cc; cursor: pointer; transition: .2s; display: inline-flex; align-items: center; }
        .pc-tams button:hover { border-color: #f0c14b; }
        .pc-tams button[aria-pressed="true"] { background: #f0c14b; border-color: #f0c14b; color: #1b1608; font-weight: 600; }
        .pc-tams button i { font-style: normal; font-size: 9.5px; margin-left: 6px; opacity: .65; font-weight: 500; }

        .pc-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .pc-tiles > div { min-width: 0; padding: 8px 11px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.05); }
        .pc-tiles span { display: block; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #93a09a; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pc-tiles b { display: block; margin-top: 3px; font-size: 14px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .pc-precios { display: flex; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.07); }
        .pc-precios > div { flex: 1; min-width: 0; }
        .pc-precios .vip { padding-left: 14px; border-left: 1px solid rgba(240,193,75,.35); }
        .pc-precios span { display: flex; align-items: center; gap: 8px; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #93a09a; font-weight: 600; }
        .pc-precios .vip span { color: #f0c14b; }
        .pc-precios em { font-style: normal; font-size: 8px; letter-spacing: .12em; padding: 1px 6px; border-radius: 99px; border: 1px solid rgba(240,193,75,.45); color: #f0c14b; }
        .pc-precios b { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px; margin-top: 3px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 18px; color: #fff; }
        .pc-precios .vip b { color: #f0c14b; }
        .pc-precios small { font-family: system-ui, sans-serif; font-size: 9.5px; letter-spacing: .08em; color: #93a09a; }

        .pc-acc { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.07); }
        .pc-sw { display: inline-flex; align-items: center; gap: 8px; margin-right: auto; font-size: 11.5px; color: #b4bdb7; }
        .pc-tog { position: relative; flex-shrink: 0; width: 34px; height: 20px; padding: 0; border-radius: 99px; cursor: pointer; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); transition: .2s; }
        .pc-tog::after { content: ""; position: absolute; top: 2px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #cfd6d1; transition: .2s; }
        .pc-tog[aria-checked="true"] { background: #f0c14b; border-color: #f0c14b; }
        .pc-tog[aria-checked="true"]::after { left: 15px; background: #14201a; }
        .pc-b { height: 36px; padding: 0 14px; border-radius: 10px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px; transition: .2s; }
        .pc-b.gold { border: 0; background: #f0c14b; color: #1b1608; }
        .pc-b.gold:hover { background: #f6d06b; transform: translateY(-1px); }
        .pc-b.icon { width: 36px; padding: 0; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #c9d1cc; }
        .pc-b.icon:hover { background: #b04a3f; border-color: #b04a3f; color: #fff; }

        .pc-like { position: absolute; top: 10px; right: 10px; z-index: 4; pointer-events: none; display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px;
          border-radius: 99px; font-size: 11px; font-weight: 600; color: #fff; background: rgba(6,16,11,.62); border: 1px solid rgba(255,255,255,.18); backdrop-filter: blur(6px); }
        .pc-like svg { width: 13px; height: 13px; color: #ff4d5a; }
        .pc-like.cero { color: rgba(255,255,255,.6); }
        .pc-like.cero svg { color: rgba(255,255,255,.45); }
        .pc-like b { font-weight: 600; font-variant-numeric: tabular-nums; animation: pclatido .6s cubic-bezier(.2,.9,.3,1.4) both; }
        @keyframes pclatido { 0% { transform: scale(1.7); color: #ff9aa2; } 100% { transform: none; } }
        .pr-st-like { display: flex !important; align-items: center; gap: 8px; }
        .pr-st-like svg { width: 18px; height: 18px; color: #e5384a; flex-shrink: 0; }
        .pc-nueva { min-height: 270px; border-radius: 15px; border: 1.5px dashed rgba(176,141,60,.5); background: rgba(176,141,60,.05); color: #8a6d25; font: inherit; font-size: 12.5px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: .2s; }
        .pc-nueva span { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; border: 1px solid rgba(176,141,60,.55); background: #fff; }
        .pc-nueva:hover { background: rgba(176,141,60,.12); border-color: #b08d3c; transform: translateY(-2px); }

        .pc-card.off .pr-main { filter: grayscale(.85); opacity: .6; }
        .pc-card.off .pr-bg { filter: blur(22px) grayscale(1) brightness(.6); }
        .pc-card.off .pc-nom, .pc-card.off .pc-precios b { opacity: .6; }

        /* ---------- Móvil: carrusel (80 % pieza actual + 20 % la siguiente), foto a sangre y ficha colapsable ---------- */
        @media (max-width: 640px) {
          /* controles ‹ ● ● ● › junto al título de la categoría */
          .pr-sec-h { gap: 8px; margin: 16px 0 4px; flex-wrap: wrap; }
          .pr-sec-l { display: none; }
          .pc-ctl { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; }
          .pc-ctl button { width: 32px; height: 32px; padding: 0; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
            border: 1px solid rgba(176,141,60,.55); background: #fff; color: #6f5716; transition: .2s; }
          .pc-ctl button:active:not(:disabled) { background: #b08d3c; color: #fff; }
          .pc-ctl button:disabled { opacity: .35; cursor: default; }
          .pc-pts { display: inline-flex; align-items: center; gap: 5px; }
          .pc-pts i { width: 6px; height: 6px; border-radius: 99px; background: rgba(11,45,31,.22); transition: width .25s, background .25s; }
          .pc-pts i.on { width: 18px; background: #b08d3c; }
          .pc-cnt-n { min-width: 38px; text-align: center; font-size: 12px; font-weight: 600; color: #6f5716; font-variant-numeric: tabular-nums; }

          .pc-grid { display: flex; gap: 10px; align-items: flex-start; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-left: 2px;
            padding: 6px 2px 18px; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .pc-grid::-webkit-scrollbar { display: none; }
          .pc-card { flex: 0 0 80%; min-height: 0; grid-template-columns: minmax(0, 1fr); scroll-snap-align: start; }
          .pc-card:hover { transform: none; }

          /* foto: ocupa todo el espacio, sin caja ni fondo desenfocado */
          .pc-card .pr-foto { aspect-ratio: 1 / 1; height: auto; min-height: 0; }
          .pc-card .pr-bg { display: none; }
          .pc-card .pr-main { object-fit: cover; }
          .pc-card .pr-foto::after { height: 62%; background: linear-gradient(to top, rgba(5,12,9,.92) 4%, rgba(5,12,9,0)); }
          .pc-pie { display: none; }
          .pc-card .pr-dots { bottom: 10px; }

          /* nombre sobre la foto */
          .pc-nom-ov { display: block; position: absolute; left: 0; right: 0; bottom: 24px; z-index: 4; padding: 0 14px; pointer-events: none; }
          .pc-nom-ov small { display: block; margin-bottom: 3px; font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase; color: #ecd07a; font-weight: 600; }
          .pc-nom-ov h3 { margin: 0; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 19px; line-height: 1.15; color: #fff;
            text-shadow: 0 2px 8px rgba(0,0,0,.6); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .pc-info > .pc-nom { display: none; }

          /* resumen siempre visible + botón de desplegar */
          .pc-info { padding: 10px 12px 12px; gap: 10px; }
          .pc-resumen { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
          .pc-resumen > div { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; }
          .pc-resumen b { display: flex; align-items: baseline; gap: 5px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 20px; color: #fff; }
          .pc-resumen b small { font-family: system-ui, sans-serif; font-size: 9.5px; letter-spacing: .08em; color: #93a09a; }
          .pc-tg { flex-shrink: 0; height: 36px; padding: 0 14px; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
            display: inline-flex; align-items: center; gap: 4px; color: #f0c14b; border: 1px solid rgba(240,193,75,.5); background: transparent; transition: .2s; }
          .pc-tg svg { transition: transform .25s; transform: rotate(90deg); }
          .pc-tg[aria-expanded="true"] { background: #f0c14b; color: #1b1608; border-color: #f0c14b; }
          .pc-tg[aria-expanded="true"] svg { transform: rotate(-90deg); }

          /* todo lo demás queda oculto hasta desplegar */
          .pc-info:not(.abre) .pc-det { display: none; }
          .pc-info.abre .pc-det { animation: pcentra .3s both; }

          .pc-nueva { flex: 0 0 56%; min-height: 220px; scroll-snap-align: start; align-self: stretch; }
        }
      `}</style>

      <div className="d-cab">
        <div>
          <h1>Prendas</h1>
          <p>Catálogo de piezas en oro certificado. {nActivas} publicada{nActivas === 1 ? '' : 's'} de {lista.length}.</p>
        </div>
        <button type="button" className="d-btn" onClick={() => abrir()}>NUEVA PRENDA</button>
      </div>

      {aviso && <div className="pr-aviso" role="status">{aviso}</div>}

      <div className="pr-stats">
        <div><span>Piezas</span><b>{lista.length}</b></div>
        <div><span>Publicadas</span><b>{nActivas}</b></div>
        <div><span>Inhabilitadas</span><b>{lista.length - nActivas}</b></div>
        <div><span>Me encanta</span><b className="pr-st-like"><IcoCorazon /> {totalLikes}</b></div>
        <div className="gold"><span>Valor publicado</span><b>{cop(valorPublicado)}</b></div>
      </div>

      <div className="pr-bar">
        <input className="pr-bus" placeholder="Buscar por nombre, código o categoría…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="pr-fil" role="group" aria-label="Filtrar">
          <button type="button" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</button>
          <button type="button" aria-pressed={filtro === 'activas'} onClick={() => setFiltro('activas')}>Publicadas</button>
          <button type="button" aria-pressed={filtro === 'borrador'} onClick={() => setFiltro('borrador')}>Inhabilitadas</button>
        </div>
      </div>

      {presentes.length > 1 && (
        <div className="pr-chips" role="group" aria-label="Categorías">
          <button type="button" aria-pressed={catActiva === 'todas'} onClick={() => setCat('todas')}>Todas <i>{visibles.length}</i></button>
          {presentes.map((c) => (
            <button key={c} type="button" aria-pressed={catActiva === c} onClick={() => setCat(c)}>
              {c} <i>{visibles.filter((p) => p.categoria === c).length}</i>
            </button>
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="pr-vacio">
          {lista.length === 0 ? 'Aún no has creado prendas. Pulsa NUEVA PRENDA para empezar.' : 'No hay prendas con ese filtro.'}
        </div>
      ) : (
        secciones.map(({ c, items }) => (
          <Categoria key={c} nombre={c} total={items.length} onNueva={() => abrir(c)}>
            {items.map(tarjeta)}
          </Categoria>
        ))
      )}

      {/* Confirmar eliminación */}
      {aBorrar && (
        <div className="pr-dlgf" onMouseDown={(e) => e.target === e.currentTarget && !borrando && setConfirmar(null)}>
          <div className="pr-dlg" role="alertdialog" aria-modal="true" aria-labelledby="pr-dlg-t" aria-describedby="pr-dlg-d">
            <div className="pr-dlg-foto">
              <div className="pr-dlg-img">
                {portadaBorrar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={portadaBorrar} alt="" />
                ) : (
                  <IcoPapelera />
                )}
              </div>
              <span className="pr-dlg-ic"><IcoPapelera /></span>
            </div>
            <h3 id="pr-dlg-t">¿Eliminar esta prenda?</h3>
            <p className="pr-dlg-n" id="pr-dlg-d">
              <b>{aBorrar.nombre}</b>
              <small>{aBorrar.codigo} · {aBorrar.quilate}K · {cop(aBorrar.precio)}</small>
            </p>
            <p className="pr-dlg-av">Se borrará del catálogo. Esta acción no se puede deshacer.</p>
            <div className="pr-dlg-b">
              <button type="button" className="pr-dlg-no" autoFocus onClick={() => setConfirmar(null)} disabled={borrando}>Cancelar</button>
              <button type="button" className="pr-dlg-si" onClick={() => borrar(aBorrar)} disabled={borrando}>
                {borrando ? <span className="pr-sp" aria-hidden /> : <IcoPapelera />}
                {borrando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de imagen completa (con carrusel) */}
      {visor && (() => {
        const fs = visor.fotos;
        const k = Math.min(visor.i, fs.length - 1);
        const ir = (d: number) => setVisor({ ...visor, i: (k + d + fs.length) % fs.length });
        return (
          <div className="pr-visor" onMouseDown={(e) => e.target === e.currentTarget && setVisor(null)} role="dialog" aria-modal="true" aria-label={visor.p.nombre}>
            <button type="button" className="pr-x" onClick={() => setVisor(null)} aria-label="Cerrar"><IcoCerrar /></button>
            {fs.length > 1 && <button type="button" className="pr-vnav prev" onClick={() => ir(-1)} aria-label="Foto anterior"><IcoChev dir="izq" /></button>}
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={k} className="pr-fade" src={fs[k]} alt={visor.p.nombre} />
              <figcaption>
                {visor.p.nombre}
                <small>{visor.p.categoria} · {visor.p.codigo} · {visor.p.quilate}K · {cop(visor.p.precio)}{fs.length > 1 ? ` · ${k + 1}/${fs.length}` : ''}</small>
              </figcaption>
            </figure>
            {fs.length > 1 && <button type="button" className="pr-vnav next" onClick={() => ir(1)} aria-label="Foto siguiente"><IcoChev dir="der" /></button>}
            {fs.length > 1 && (
              <div className="pr-vtiras">
                {fs.map((u, j) => (
                  <button key={u + j} type="button" className={j === k ? 'on' : ''} onClick={() => setVisor({ ...visor, i: j })} aria-label={`Foto ${j + 1}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Crear / editar */}
      {abierto && (
        <div className="pr-modal" onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="pr-hoja" role="dialog" aria-modal="true" aria-label={editId ? 'Editar prenda' : 'Nueva prenda'}>
            <h2>{editId ? 'Editar prenda' : 'Nueva prenda'}</h2>
            <p className="pr-sub">
              {editId ? 'Modifica los datos y guarda. El estado de publicación no cambia.' : 'Se crea inhabilitada. Tú decides cuándo publicarla con el interruptor de la tarjeta.'}
            </p>

            <div className="pr-f">
              <div className="full"><label htmlFor="pn">Nombre</label><input id="pn" value={form.nombre} onChange={set('nombre')} placeholder="Ej.: Cadena tejido lazo" /></div>
              <div><label htmlFor="pc">Categoría</label>
                <select id="pc" value={form.categoria} onChange={set('categoria')}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label htmlFor="pq">Quilate</label>
                <select id="pq" value={form.quilate} onChange={set('quilate')}>{QUILATES.map((c) => <option key={c} value={c}>{c}K</option>)}</select></div>
              <div className="full"><label htmlFor="pd">Descripción</label><textarea id="pd" rows={3} value={form.descripcion} onChange={set('descripcion')} placeholder="Detalles, acabado, piedras…" /></div>
            </div>

            <label className="pr-multi">
              <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
              <span>
                <b>Esta prenda tiene varios tamaños</b>
                <small>Cada tamaño lleva su foto, peso, stock y precio. En la tarjeta eliges el tamaño y todo cambia.</small>
              </span>
            </label>

            {!multi ? (
              <>
                <GaleriaForm fotos={fotosForm} subiendo={subiendoEn === 's'} onSubir={(e) => subirFotos(e, 's')} onCambio={setFotosSimple} />
                <div className="pr-f">
                  <div><label htmlFor="pp">Peso (gramos)</label><input id="pp" inputMode="decimal" value={form.peso} onChange={set('peso')} placeholder="Ej.: 4.5" /></div>
                  <div><label htmlFor="pt">Tamaño</label><input id="pt" value={form.tamano} onChange={set('tamano')} placeholder="Ej.: Talla 7, 45 cm, 18 mm" /></div>
                  <div><label htmlFor="ps">Stock</label><input id="ps" inputMode="numeric" value={form.stock} onChange={set('stock')} /></div>
                  <div><label htmlFor="pm">Precio manual (opcional)</label><input id="pm" inputMode="numeric" value={form.precio_manual} onChange={set('precio_manual')} placeholder="Déjalo vacío para calcular" /></div>
                </div>
                <div className="pr-est-box">
                  <div>
                    <small>Precio estimado</small><br />
                    <small>{form.precio_manual ? 'Precio manual' : `peso × oro ${form.quilate}K${precios.margen ? ` + ${precios.margen}% margen` : ''}`}</small>
                  </div>
                  <b>{cop(estimado)}</b>
                </div>
              </>
            ) : (
              <div className="pr-vars">
                {vars.map((v, k) => (
                  <div key={k} className="pr-var">
                    <div className="pr-var-h">
                      <span>Tamaño {k + 1}{v.tamano.trim() ? ` · ${v.tamano.trim()}` : ''}</span>
                      {vars.length > 1 && (
                        <button type="button" className="pr-var-x" onClick={() => quitarVar(k)} aria-label={`Quitar tamaño ${k + 1}`}><IcoPapelera /> Quitar</button>
                      )}
                    </div>
                    <div className="pr-f">
                      <div><label htmlFor={`pv${k}t`}>Tamaño</label><input id={`pv${k}t`} value={v.tamano} onChange={(e) => setVar(k, { tamano: e.target.value })} placeholder="Ej.: 45 cm" /></div>
                      <div><label htmlFor={`pv${k}p`}>Peso (gramos)</label><input id={`pv${k}p`} inputMode="decimal" value={v.peso} onChange={(e) => setVar(k, { peso: e.target.value })} placeholder="Ej.: 5.0" /></div>
                      <div><label htmlFor={`pv${k}s`}>Stock</label><input id={`pv${k}s`} inputMode="numeric" value={v.stock} onChange={(e) => setVar(k, { stock: e.target.value })} /></div>
                      <div><label htmlFor={`pv${k}m`}>Precio manual (opcional)</label><input id={`pv${k}m`} inputMode="numeric" value={v.precio_manual} onChange={(e) => setVar(k, { precio_manual: e.target.value })} placeholder="Vacío = calcular" /></div>
                    </div>
                    <GaleriaForm
                      titulo={`Fotos del tamaño ${v.tamano.trim() || k + 1}`}
                      fotos={v.fotos}
                      subiendo={subiendoEn === k}
                      onSubir={(e) => subirFotos(e, k)}
                      onCambio={(f) => setVar(k, { fotos: f })}
                    />
                    <div className="pr-var-p">
                      <small>{v.precio_manual ? 'Precio manual' : `peso × oro ${form.quilate}K${precios.margen ? ` + ${precios.margen}% margen` : ''}`}</small>
                      <b>{cop(calcPrecio(form.quilate, v.peso, v.precio_manual))}</b>
                    </div>
                  </div>
                ))}
                <button type="button" className="pr-var-add" onClick={agregarVar}><IcoMas /> Agregar otro tamaño</button>
              </div>
            )}

            {error && <p className="pr-err" role="alert">{error}</p>}

            <div className="pr-btns">
              <button type="button" className="pr-b2" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="button" className="d-btn" onClick={guardar} disabled={guardando || subiendo}>
                {guardando ? 'GUARDANDO…' : editId ? 'GUARDAR CAMBIOS' : 'CREAR PRENDA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}