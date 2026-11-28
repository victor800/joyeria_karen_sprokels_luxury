// 📁 RUTA: src/app/domi/[slug]/PanelDomi.tsx   (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import type { Estado, PedidoDomi } from '@/lib/pedido-tipos';
import './domi.css';

const serif = Playfair_Display({ subsets: ['latin'], weight: ['500', '600'], variable: '--dm-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--dm-sans', display: 'swap' });

type Props = { slug: string; nombre: string | null; foto: string | null };

export default function PanelDomi({ slug, nombre, foto }: Props) {
  return (
    <div className={`dm-root ${serif.variable} ${sans.variable}`}>
      {nombre ? <Panel slug={slug} nombre={nombre} foto={foto} /> : <Login slug={slug} />}
    </div>
  );
}

/* Los logos se piden a Next en tamaño grande para que salgan nítidos en pantallas retina */
function Logos({ hero = false }: { hero?: boolean }) {
  const lado = hero ? 320 : 400;
  const sizes = hero ? '(max-width: 600px) 88px, 132px' : '(max-width: 600px) 34vw, 168px';
  return (
    <div className={`dm-logos ${hero ? 'dm-logos-hero' : ''}`}>
      <Image src="/logo-jks.jpeg" alt="Karen Sprockel's Luxury" width={lado} height={lado} quality={95} sizes={sizes} priority />
      <Image src="/hans.jpeg" alt="Joyería Hans" width={lado} height={lado} quality={95} sizes={sizes} priority />
    </div>
  );
}

/* ═════════ Login ═════════ */
function Login({ slug }: { slug: string }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError('');
    setCargando(true);
    try {
      const r = await fetch('/api/domi/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, usuario, clave }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || 'No fue posible ingresar.');
        setCargando(false);
        return;
      }
      router.refresh(); // el servidor ya ve la cookie y pinta el panel
    } catch {
      setError('Sin conexión. Intente de nuevo.');
      setCargando(false);
    }
  }

  return (
    <main className="dm-login">
      <form className="dm-card" onSubmit={enviar}>
        <Logos />
        <div className="dm-marca">Karen Sprockel&apos;s <span>◆</span> Joyería Hans</div>
        <h1 className="dm-titulo">Mis entregas</h1>
        <p className="dm-sub">Ingrese con su nombre y los últimos 4 dígitos de su teléfono.</p>

        <label className="dm-label" htmlFor="dm-usuario">Usuario</label>
        <input
          id="dm-usuario"
          className="dm-input"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          autoCapitalize="words"
          required
        />

        <label className="dm-label" htmlFor="dm-clave">Clave</label>
        <input
          id="dm-clave"
          className="dm-input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={clave}
          onChange={(e) => setClave(e.target.value.replace(/\D/g, ''))}
          autoComplete="current-password"
          required
        />

        {error && <div className="dm-error" role="alert">{error}</div>}

        <button className="dm-btn" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
        <div className="dm-pie">Acceso exclusivo para domiciliarios</div>
      </form>
    </main>
  );
}

/* ═════════ Utilidades ═════════ */
const iniciales = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'D';

const ETIQUETA: Record<Estado, string> = {
  asignado: 'Asignado',
  en_ruta: 'En ruta',
  entregado: 'Entregado',
  novedad: 'Novedad',
};
const CLASE: Record<Estado, string> = { asignado: 'pen', en_ruta: 'ruta', entregado: 'ok', novedad: 'mal' };
const ORDEN: Record<Estado, number> = { en_ruta: 0, novedad: 1, asignado: 2, entregado: 3 };

const wa = (tel: string) => {
  const d = tel.replace(/\D/g, '');
  return d.length === 10 ? `57${d}` : d;
};

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (f: string) => {
  const m = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MES[Number(m[2]) - 1]} ${m[1]}` : f;
};

const sinAc = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const CIUDADES = ['envigado', 'sabaneta', 'itagui', 'bello', 'medellin', 'la estrella', 'caldas', 'copacabana', 'rionegro'];

/** Limpia la dirección para que Google Maps la ubique en el Valle de Aburrá */
function consultaMapa(dir: string) {
  const limpia = dir
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && !/^(apto?|apt|apartamento|torre|int|interior|piso|of|oficina|local)\.?\s*[\w#-]*$/i.test(s))
    .join(', ')
    .replace(/\b(cr|cra|kr|carr)\b\.?/gi, 'Carrera')
    .replace(/\b(cl|cll)\b\.?/gi, 'Calle')
    .replace(/\bcirc\b\.?/gi, 'Circular')
    .replace(/\bdiag\b\.?/gi, 'Diagonal')
    .replace(/\b(tv|trans)\b\.?/gi, 'Transversal');
  const n = sinAc(limpia);
  return CIUDADES.some((c) => n.includes(c))
    ? `${limpia}, Antioquia, Colombia`
    : `${limpia}, Medellín, Antioquia, Colombia`;
}

const direccionDe = (p: PedidoDomi) => [p.direccion, p.barrio].filter(Boolean).join(', ');

const ICO = {
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z M12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  caja: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9z M3 7.5l9 4.5 9-4.5 M12 12v9',
  cal: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  tel: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  chat: 'M4 20l1.3-4.2A8 8 0 114 20z M9 9.5c0 3 2.5 5.5 5.5 5.5',
  ruta: 'M5 19a2 2 0 100-4 2 2 0 000 4z M19 9a2 2 0 100-4 2 2 0 000 4z M7 17h7a3 3 0 000-6h-4a3 3 0 010-6h7',
  ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6z',
} as const;

function Ico({ n }: { n: keyof typeof ICO }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICO[n]} />
    </svg>
  );
}

/* ═════════ Panel ═════════ */
type Filtro = 'pend' | 'todos' | Estado;
type Col = 'estado' | 'cliente' | 'fecha';
type Accion = { id: string; estado: Estado } | null;

const FILTROS: { id: Filtro; t: string }[] = [
  { id: 'pend', t: 'Por entregar' },
  { id: 'asignado', t: 'Asignados' },
  { id: 'en_ruta', t: 'En ruta' },
  { id: 'novedad', t: 'Novedades' },
  { id: 'entregado', t: 'Entregados' },
  { id: 'todos', t: 'Todos' },
];

const coincide = (p: PedidoDomi, f: Filtro) =>
  f === 'todos' ? true : f === 'pend' ? p.estado !== 'entregado' : p.estado === f;

function Panel({ slug, nombre, foto }: { slug: string; nombre: string; foto: string | null }) {
  const router = useRouter();

  const [pedidos, setPedidos] = useState<PedidoDomi[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [hora, setHora] = useState<Date | null>(null);
  const [fotoMala, setFotoMala] = useState(false);

  const [filtro, setFiltro] = useState<Filtro>('pend');
  const [busca, setBusca] = useState('');
  const [tienda, setTienda] = useState<'todas' | 'hans' | 'jks'>('todas');
  const [orden, setOrden] = useState<{ col: Col; asc: boolean }>({ col: 'estado', asc: true });

  const [detId, setDetId] = useState<string | null>(null); // pedido abierto en "Ver detalles"
  const [trab, setTrab] = useState<Accion>(null); // acción en curso (el botón gira)
  const [errAcc, setErrAcc] = useState<{ id: string; msg: string } | null>(null);
  const [novedadId, setNovedadId] = useState<string | null>(null);

  const [pag, setPag] = useState(1);
  const [tam, setTam] = useState(10);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch(`/api/domi/pedidos?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (r.status === 401) {
        router.refresh(); // sesión vencida: vuelve al login
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se pudieron cargar los pedidos.');
      setPedidos(j.pedidos);
      setError('');
      setHora(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pedidos.');
    } finally {
      setCargando(false);
    }
  }, [slug, router]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => clearInterval(t);
  }, [cargar]);

  /** Devuelve null si salió bien, o el mensaje de error */
  async function cambiar(id: string, estado: Estado, novedad = ''): Promise<string | null> {
    try {
      const r = await fetch('/api/domi/estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, id, estado, novedad }),
      });
      if (r.status === 401) {
        router.refresh();
        return 'Sesión vencida.';
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return j.error || 'No se pudo actualizar el pedido.';
      await cargar();
      return null;
    } catch {
      return 'Sin conexión. Intente de nuevo.';
    }
  }

  /** Cambia el estado: sin ventanas emergentes, el propio botón gira mientras guarda */
  async function ir(id: string, estado: Estado, novedad = '') {
    if (trab) return;
    setTrab({ id, estado });
    setErrAcc(null);
    const e = await cambiar(id, estado, novedad);
    if (e) setErrAcc({ id, msg: e });
    else setNovedadId((v) => (v === id ? null : v));
    setTrab(null);
  }

  async function salir() {
    await fetch('/api/domi/logout', { method: 'POST' }).catch(() => {});
    router.refresh();
  }

  const abrir = useCallback((id: string) => setDetId(id), []);
  const cerrar = useCallback(() => {
    setDetId(null);
    setNovedadId(null);
  }, []);

  function alternarNovedad(id: string) {
    setNovedadId((v) => (v === id ? null : id));
  }

  function ordenar(col: Col) {
    setOrden((o) => (o.col === col ? { col, asc: !o.asc } : { col, asc: true }));
  }

  const conteos = useMemo(() => {
    const base = pedidos ?? [];
    return Object.fromEntries(FILTROS.map((f) => [f.id, base.filter((p) => coincide(p, f.id)).length])) as Record<Filtro, number>;
  }, [pedidos]);

  const visibles = useMemo(() => {
    const q = sinAc(busca.trim());
    const dir = orden.asc ? 1 : -1;
    return (pedidos ?? [])
      .filter((p) => coincide(p, filtro))
      .filter((p) => (tienda === 'todas' ? true : tienda === 'hans' ? p.tienda === 'hans' : p.tienda !== 'hans'))
      .filter((p) => !q || sinAc([p.cliente, p.direccion, p.barrio, p.detalle, p.telefono].filter(Boolean).join(' ')).includes(q))
      .sort((a, b) => {
        if (orden.col === 'cliente') return dir * (a.cliente || '').localeCompare(b.cliente || '', 'es');
        if (orden.col === 'fecha') return dir * (a.fecha || '').localeCompare(b.fecha || '');
        return dir * (ORDEN[a.estado] - ORDEN[b.estado]) || (a.fecha || '').localeCompare(b.fecha || '');
      });
  }, [pedidos, filtro, busca, tienda, orden]);

  // Al cambiar filtro, búsqueda, tienda, orden o tamaño, se vuelve a la primera página
  useEffect(() => {
    setPag(1);
  }, [filtro, busca, tienda, orden, tam]);

  const totalPag = Math.max(1, Math.ceil(visibles.length / tam));
  const pagActual = Math.min(pag, totalPag); // si al entregar un pedido sobran páginas, se ajusta sola
  const pagina = visibles.slice((pagActual - 1) * tam, pagActual * tam);

  // El pedido abierto se busca en todos los pedidos (no solo en los visibles), así sigue abierto al marcarlo entregado
  const det = detId ? pedidos?.find((p) => p.id === detId) ?? null : null;

  return (
    <main className="dm-panel">
      <header className="dm-hero">
        <Logos hero />

        <div className="dm-hero-txt">
          <div className="dm-marca">Karen Sprockel&apos;s <span>◆</span> Joyería Hans</div>
          <h1>Mis entregas</h1>
          {pedidos && (
            <p className="dm-resumen">
              <b>{conteos.pend}</b> por entregar · <b>{conteos.entregado}</b> entregados
            </p>
          )}
        </div>

        <div className="dm-user">
          {foto && !fotoMala ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="dm-avatar" src={foto} alt={nombre} referrerPolicy="no-referrer" onError={() => setFotoMala(true)} />
          ) : (
            <div className="dm-avatar dm-ini">{iniciales(nombre)}</div>
          )}
          <div className="dm-hola">
            <small>Bienvenido</small>
            <strong>{nombre}</strong>
          </div>
          <button className="dm-salir" onClick={salir}>Salir</button>
        </div>
      </header>

      <nav className="dm-filtros" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className={`dm-chipf ${filtro === f.id ? 'on' : ''}`} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.t}
            <b>{conteos[f.id]}</b>
          </button>
        ))}
      </nav>

      <section className="dm-tabla-wrap" aria-label="Pedidos">
        <div className="dm-herr">
          <input
            className="dm-input dm-buscar"
            type="search"
            placeholder="Buscar cliente, dirección o producto"
            aria-label="Buscar pedidos"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select className="dm-input dm-select" aria-label="Filtrar por tienda" value={tienda} onChange={(e) => setTienda(e.target.value as typeof tienda)}>
            <option value="todas">Todas las tiendas</option>
            <option value="hans">Joyería Hans</option>
            <option value="jks">Karen Sprockel&apos;s</option>
          </select>
          <button className="dm-act" onClick={cargar} disabled={cargando} aria-busy={cargando}>
            {cargando && <span className="dm-spin" aria-hidden="true" />}
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
          {hora && <span className="dm-hora">Actualizado a las {hora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>

        {error && <div className="dm-error" style={{ margin: 16 }}>{error}</div>}
        {!pedidos && !error && <p className="dm-vacio">Cargando pedidos…</p>}

        {pedidos && visibles.length === 0 && (
          <p className="dm-vacio">
            {busca || tienda !== 'todas'
              ? 'Ningún pedido coincide con la búsqueda. Pruebe con otro filtro.'
              : filtro === 'entregado'
                ? 'Aún no ha entregado pedidos.'
                : 'No tiene pedidos en este estado por ahora.'}
          </p>
        )}

        {pedidos && visibles.length > 0 && (
          <>
          <table className="dm-tabla">
            <thead>
              <tr>
                <Th col="cliente" orden={orden} onOrden={ordenar}>Pedido</Th>
                <th>Dirección</th>
                <Th col="fecha" orden={orden} onOrden={ordenar} className="c-fecha">Entrega</Th>
                <th className="c-pago">Pago</th>
                <Th col="estado" orden={orden} onOrden={ordenar}>Estado</Th>
                <th className="c-acc">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((p) => (
                <Fila key={p.id} p={p} trab={trab} onAbrir={abrir} onIr={ir} />
              ))}
            </tbody>
          </table>
          <Paginacion total={visibles.length} pagina={pagActual} totalPag={totalPag} tam={tam} onPagina={setPag} onTam={setTam} />
          </>
        )}
      </section>

      {det && (
        <Drawer onCerrar={cerrar}>
          <Detalle
            key={det.id}
            p={det}
            trab={trab}
            errMsg={errAcc?.id === det.id ? errAcc.msg : ''}
            novedadAbierta={novedadId === det.id}
            onIr={ir}
            onNovedad={alternarNovedad}
          />
        </Drawer>
      )}
    </main>
  );
}

/* ═════════ Paginación ═════════ */
const TAMANOS = [10, 25, 50];

/** Números de página con puntos suspensivos: 1 … 4 5 6 … 12 */
function numerosPagina(actual: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const base = Array.from(new Set([1, total, actual - 1, actual, actual + 1]))
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  base.forEach((n, i) => {
    if (i > 0 && n - base[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

function Paginacion({
  total, pagina, totalPag, tam, onPagina, onTam,
}: {
  total: number;
  pagina: number;
  totalPag: number;
  tam: number;
  onPagina: (n: number) => void;
  onTam: (n: number) => void;
}) {
  const desde = (pagina - 1) * tam + 1;
  const hasta = Math.min(pagina * tam, total);

  return (
    <div className="dm-pag">
      <span className="dm-pag-info">
        Mostrando <b>{desde}–{hasta}</b> de <b>{total}</b>
      </span>

      {total > TAMANOS[0] && (
        <label className="dm-pag-tam">
          Filas por página
          <select value={tam} onChange={(e) => onTam(Number(e.target.value))}>
            {TAMANOS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}

      {totalPag > 1 && (
        <nav className="dm-pag-nav" aria-label="Paginación">
          <button type="button" className="dm-pag-b" disabled={pagina === 1} onClick={() => onPagina(pagina - 1)} aria-label="Página anterior">‹</button>
          {numerosPagina(pagina, totalPag).map((n, i) =>
            n === '…' ? (
              <span key={`p${i}`} className="dm-pag-pt" aria-hidden="true">…</span>
            ) : (
              <button
                key={n}
                type="button"
                className={`dm-pag-b ${n === pagina ? 'on' : ''}`}
                aria-current={n === pagina ? 'page' : undefined}
                aria-label={`Página ${n}`}
                onClick={() => onPagina(n)}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" className="dm-pag-b" disabled={pagina === totalPag} onClick={() => onPagina(pagina + 1)} aria-label="Página siguiente">›</button>
        </nav>
      )}
    </div>
  );
}

/* ═════════ Encabezado ordenable ═════════ */
function Th({
  col, orden, onOrden, className = '', children,
}: {
  col: Col;
  orden: { col: Col; asc: boolean };
  onOrden: (c: Col) => void;
  className?: string;
  children: ReactNode;
}) {
  const act = orden.col === col;
  return (
    <th className={`ord ${className}`} aria-sort={act ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="dm-th" onClick={() => onOrden(col)}>
        {children}
        <span aria-hidden="true">{act ? (orden.asc ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

/* ═════════ Panel emergente (detalles) ═════════ */
function Drawer({ onCerrar, children }: { onCerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const cerrarRef = useRef(onCerrar);

  useEffect(() => {
    cerrarRef.current = onCerrar;
  });

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarRef.current();
    };
    document.addEventListener('keydown', tecla);
    ref.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', tecla);
      previo?.focus?.();
    };
  }, []);

  return (
    <div className="dm-overlay" onClick={onCerrar}>
      <aside className="dm-drawer" role="dialog" aria-modal="true" aria-label="Detalle del pedido" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="dm-dr-top">
          <span>Detalle del pedido</span>
          <button type="button" className="dm-cerrar" aria-label="Cerrar detalles" onClick={onCerrar}>✕</button>
        </div>
        <div className="dm-dr-body">{children}</div>
      </aside>
    </div>
  );
}

/* ═════════ Progreso ═════════ */
const PASOS = ['Asignado', 'En ruta', 'Entregado'];
const pasoActual = (e: Estado) => (e === 'asignado' ? 0 : e === 'entregado' ? 2 : 1);

/** Barra chica para la tabla */
function Barra({ estado }: { estado: Estado }) {
  const actual = pasoActual(estado);
  return (
    <div className={`dm-bar b-${estado}`} role="img" aria-label={`Progreso: ${ETIQUETA[estado]}`}>
      {PASOS.map((t, i) => (
        <span key={t} className={`${i <= actual ? 'on' : ''} ${i === actual ? 'cur' : ''}`} />
      ))}
    </div>
  );
}

/** Barra grande del detalle: siempre arranca en "Asignado" */
function Progreso({ estado }: { estado: Estado }) {
  const actual = pasoActual(estado);
  const nov = estado === 'novedad';
  const fin = estado === 'entregado';
  return (
    <ol className={`dm-prog ${nov ? 'nov' : ''}`} aria-label={`Estado del pedido: ${ETIQUETA[estado]}`}>
      {PASOS.map((t, i) => {
        const hecho = i < actual || (fin && i === 2);
        const clase = [i <= actual ? 'alc' : '', hecho ? 'hecho' : '', i === actual && !fin ? 'actual' : ''].join(' ');
        return (
          <li key={t} className={clase} aria-current={i === actual ? 'step' : undefined}>
            <span className="dm-punto">{hecho ? '✓' : i + 1}</span>
            <em>{nov && i === 1 ? 'Novedad' : t}</em>
          </li>
        );
      })}
    </ol>
  );
}

/* ═════════ Botón de estado con giro ═════════ */
function BtnEstado({
  p, estado, trab, onIr, sec = false, mini = false, children,
}: {
  p: PedidoDomi;
  estado: Estado;
  trab: Accion;
  onIr: (id: string, estado: Estado) => void;
  sec?: boolean;
  mini?: boolean;
  children: ReactNode;
}) {
  const enCurso = trab?.id === p.id && trab.estado === estado;
  return (
    <button
      type="button"
      className={`${mini ? 'dm-mini' : 'dm-es'} ${sec ? 'sec' : ''}`}
      disabled={trab?.id === p.id}
      aria-busy={enCurso}
      onClick={(e) => {
        e.stopPropagation();
        onIr(p.id, estado);
      }}
    >
      {enCurso ? (
        <>
          <span className="dm-spin" aria-hidden="true" />
          <span>Actualizando…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/* ═════════ Fila de la tabla ═════════ */
function Fila({
  p, trab, onAbrir, onIr,
}: {
  p: PedidoDomi;
  trab: Accion;
  onAbrir: (id: string) => void;
  onIr: (id: string, estado: Estado) => void;
}) {
  const dir = direccionDe(p);
  const cerrado = p.estado === 'entregado';
  const efectivo = /efectivo/i.test(p.metodoPago || '');

  return (
    <tr
      className={`dm-trow e-${p.estado} ${cerrado ? 'cerrado' : ''}`}
      tabIndex={0}
      onClick={() => onAbrir(p.id)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onAbrir(p.id);
        }
      }}
    >
      <td className="c-cli">
        <span className="dm-tienda">{p.tienda === 'hans' ? 'Joyería Hans' : "Karen Sprockel's"}</span>
        <strong>{p.cliente || 'Cliente'}</strong>
        {p.detalle && <small>{p.detalle}</small>}
      </td>
      <td className="c-dir">{dir || <span className="dm-hora">Sin dirección</span>}</td>
      <td className="c-fecha">{p.fecha ? <><span className="m-l">Entrega: </span>{fechaCorta(p.fecha)}</> : '—'}</td>
      <td className="c-pago">
        {p.total ? <span className="tot">{p.total}</span> : '—'}
        {p.metodoPago && <span className={`dm-chip ${efectivo ? 'efe' : ''}`}>{p.metodoPago}</span>}
      </td>
      <td className="c-est">
        <span className={`dm-badge ${CLASE[p.estado]}`}>{ETIQUETA[p.estado]}</span>
        <Barra estado={p.estado} />
      </td>
      <td className="c-acc">
        <div className="acc-w">
          {p.estado === 'asignado' && (
            <BtnEstado p={p} estado="en_ruta" trab={trab} onIr={onIr} mini>Salir a ruta</BtnEstado>
          )}
          {(p.estado === 'en_ruta' || p.estado === 'novedad') && (
            <BtnEstado p={p} estado="entregado" trab={trab} onIr={onIr} mini>Entregado</BtnEstado>
          )}
          <button
            type="button"
            className="dm-mini sec"
            onClick={(e) => {
              e.stopPropagation();
              onAbrir(p.id);
            }}
          >
            <Ico n="ojo" />Ver detalles
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ═════════ Detalle del pedido + mapa ═════════ */
function Detalle({
  p, trab, errMsg, novedadAbierta, onIr, onNovedad,
}: {
  p: PedidoDomi;
  trab: Accion;
  errMsg: string;
  novedadAbierta: boolean;
  onIr: (id: string, estado: Estado, novedad?: string) => void;
  onNovedad: (id: string) => void;
}) {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (!novedadAbierta) setTexto('');
  }, [novedadAbierta]);

  const dir = direccionDe(p);
  const q = dir ? consultaMapa(dir) : '';
  const cerrado = p.estado === 'entregado';
  const efectivo = /efectivo/i.test(p.metodoPago || '');
  const guardando = trab?.id === p.id && trab.estado === 'novedad';

  return (
    <>
      <div className="dm-pad">
        <div className="dm-det-head">
          <div>
            <span className="dm-tienda">{p.tienda === 'hans' ? 'Joyería Hans' : "Karen Sprockel's"}</span>
            <h3 className="dm-cliente">{p.cliente || 'Cliente'}</h3>
          </div>
          <span className={`dm-badge ${CLASE[p.estado]}`}>{ETIQUETA[p.estado]}</span>
        </div>
      </div>

      <div className="dm-mapa">
        {q ? (
          <iframe
            key={q}
            title={`Mapa de ${p.cliente || 'la entrega'}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <p className="dm-mapa-vacio">Este pedido no tiene dirección para mostrar en el mapa.</p>
        )}
      </div>

      <div className="dm-pad">
        <Progreso estado={p.estado} />

        <div className="dm-info">
          {dir && <div className="dm-fila"><Ico n="pin" /><span>{dir}</span></div>}
          {p.detalle && <div className="dm-fila"><Ico n="caja" /><span>{p.detalle}</span></div>}
          {p.fecha && <div className="dm-fila suave"><Ico n="cal" /><span>Entrega: {fechaCorta(p.fecha)}</span></div>}
        </div>

        {p.total && (
          <div className="dm-pago">
            <span className="dm-total">{p.total}</span>
            {p.metodoPago && <span className={`dm-chip ${efectivo ? 'efe' : ''}`}>{p.metodoPago}</span>}
          </div>
        )}

        {p.notas && (
          <details className="dm-notas-d">
            <summary>Notas del pedido</summary>
            <p>{p.notas}</p>
          </details>
        )}

        {(q || p.telefono) && (
          <div className="dm-acciones">
            {p.telefono && (
              <a className="dm-acc" href={`tel:${p.telefono.replace(/\s/g, '')}`}><Ico n="tel" />Llamar</a>
            )}
            {p.telefono && (
              <a className="dm-acc" href={`https://wa.me/${wa(p.telefono)}`} target="_blank" rel="noreferrer"><Ico n="chat" />WhatsApp</a>
            )}
            {q && (
              <a className="dm-acc" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">
                <Ico n="ruta" />Ruta
              </a>
            )}
          </div>
        )}

        {cerrado ? (
          <div className="dm-listo">Pedido entregado ✓</div>
        ) : (
          <div className="dm-estados">
            {p.estado === 'asignado' && (
              <BtnEstado p={p} estado="en_ruta" trab={trab} onIr={onIr}>Salir a ruta</BtnEstado>
            )}
            {p.estado === 'en_ruta' && (
              <>
                <BtnEstado p={p} estado="entregado" trab={trab} onIr={onIr}>Entregado</BtnEstado>
                <button type="button" className="dm-es sec" disabled={trab?.id === p.id} onClick={() => onNovedad(p.id)}>
                  {novedadAbierta ? 'Cancelar' : 'Novedad'}
                </button>
              </>
            )}
            {p.estado === 'novedad' && (
              <>
                <BtnEstado p={p} estado="en_ruta" trab={trab} onIr={onIr} sec>Retomar ruta</BtnEstado>
                <BtnEstado p={p} estado="entregado" trab={trab} onIr={onIr}>Entregado</BtnEstado>
              </>
            )}
          </div>
        )}

        {novedadAbierta && !cerrado && (
          <div className="dm-nov">
            <textarea
              className="dm-input"
              rows={3}
              maxLength={300}
              placeholder="Cuente qué pasó (cliente no responde, dirección incorrecta…)"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="dm-es"
              disabled={!!trab || texto.trim().length < 3}
              aria-busy={guardando}
              onClick={() => onIr(p.id, 'novedad', texto)}
            >
              {guardando ? (
                <>
                  <span className="dm-spin" aria-hidden="true" />
                  <span>Guardando…</span>
                </>
              ) : (
                'Guardar novedad'
              )}
            </button>
          </div>
        )}

        {errMsg && <div className="dm-error" role="alert">{errMsg}</div>}
      </div>
    </>
  );
}