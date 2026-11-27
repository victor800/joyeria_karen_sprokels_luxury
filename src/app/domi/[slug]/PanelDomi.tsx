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
function Logos({ mini = false }: { mini?: boolean }) {
  const lado = mini ? 240 : 400;
  const sizes = mini ? '(max-width: 600px) 16vw, 84px' : '(max-width: 600px) 34vw, 168px';
  return (
    <div className={`dm-logos ${mini ? 'dm-logos-mini' : ''}`}>
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
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14',
  ruta: 'M5 19a2 2 0 100-4 2 2 0 000 4z M19 9a2 2 0 100-4 2 2 0 000 4z M7 17h7a3 3 0 000-6h-4a3 3 0 010-6h7',
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
  const detRef = useRef<HTMLElement>(null);

  const [pedidos, setPedidos] = useState<PedidoDomi[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [hora, setHora] = useState<Date | null>(null);
  const [fotoMala, setFotoMala] = useState(false);

  const [filtro, setFiltro] = useState<Filtro>('pend');
  const [busca, setBusca] = useState('');
  const [tienda, setTienda] = useState<'todas' | 'hans' | 'jks'>('todas');
  const [orden, setOrden] = useState<{ col: Col; asc: boolean }>({ col: 'estado', asc: true });

  const [selId, setSelId] = useState<string | null>(null);
  const [trab, setTrab] = useState<Accion>(null); // acción en curso (el botón gira)
  const [errAcc, setErrAcc] = useState<{ id: string; msg: string } | null>(null);
  const [novedadId, setNovedadId] = useState<string | null>(null);

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

  /** Cambia el estado: sin ventanas emergentes, el propio botón muestra el giro mientras guarda */
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

  /** Selecciona el pedido y, en pantallas chicas, sube al mapa */
  function ver(id: string) {
    setSelId(id);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 999px)').matches) {
      requestAnimationFrame(() => detRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function abrirNovedad(id: string) {
    ver(id);
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

  // Siempre hay un pedido seleccionado si existe alguno visible: así el mapa nunca queda vacío
  const sel = visibles.find((p) => p.id === selId) ?? visibles[0] ?? null;

  return (
    <main className="dm-panel">
      <header className="dm-top">
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
      </header>

      <Logos mini />

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
      </div>
      {hora && <p className="dm-hora">Actualizado a las {hora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>}

      <nav className="dm-filtros" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className={`dm-chipf ${filtro === f.id ? 'on' : ''}`} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.t}
            <b>{conteos[f.id]}</b>
          </button>
        ))}
      </nav>

      {error && <div className="dm-error">{error}</div>}
      {!pedidos && !error && <p className="dm-vacio">Cargando pedidos…</p>}

      {pedidos && (
        <div className="dm-main">
          <div className="dm-tabla-wrap">
            {visibles.length === 0 ? (
              <p className="dm-vacio">
                {busca || tienda !== 'todas'
                  ? 'Ningún pedido coincide con la búsqueda. Pruebe con otro filtro.'
                  : filtro === 'entregado'
                    ? 'Aún no ha entregado pedidos.'
                    : 'No tiene pedidos en este estado por ahora.'}
              </p>
            ) : (
              <table className="dm-tabla">
                <thead>
                  <tr>
                    <Th col="cliente" orden={orden} onOrden={ordenar}>Cliente</Th>
                    <th>Dirección</th>
                    <Th col="fecha" orden={orden} onOrden={ordenar} className="c-fecha">Entrega</Th>
                    <th className="c-pago">Pago</th>
                    <Th col="estado" orden={orden} onOrden={ordenar}>Estado</Th>
                    <th className="c-acc">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => (
                    <Fila
                      key={p.id}
                      p={p}
                      activa={sel?.id === p.id}
                      trab={trab}
                      novedadAbierta={novedadId === p.id}
                      onVer={ver}
                      onIr={ir}
                      onNovedad={abrirNovedad}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside className="dm-det" ref={detRef} aria-label="Detalle y mapa del pedido">
            {sel ? (
              <Detalle
                key={sel.id}
                p={sel}
                trab={trab}
                errMsg={errAcc?.id === sel.id ? errAcc.msg : ''}
                novedadAbierta={novedadId === sel.id}
                onIr={ir}
                onNovedad={abrirNovedad}
              />
            ) : (
              <p className="dm-det-vacio">Elija un pedido de la tabla para ver su ubicación en el mapa.</p>
            )}
          </aside>
        </div>
      )}
    </main>
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

/** Barra grande del panel de detalle: siempre arranca en "Asignado" */
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
  p, activa, trab, novedadAbierta, onVer, onIr, onNovedad,
}: {
  p: PedidoDomi;
  activa: boolean;
  trab: Accion;
  novedadAbierta: boolean;
  onVer: (id: string) => void;
  onIr: (id: string, estado: Estado) => void;
  onNovedad: (id: string) => void;
}) {
  const dir = direccionDe(p);
  const cerrado = p.estado === 'entregado';
  const efectivo = /efectivo/i.test(p.metodoPago || '');

  return (
    <tr
      className={`dm-trow e-${p.estado} ${activa ? 'sel' : ''} ${cerrado ? 'cerrado' : ''}`}
      tabIndex={0}
      aria-current={activa ? 'true' : undefined}
      onClick={() => onVer(p.id)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onVer(p.id);
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
          {p.estado === 'en_ruta' && (
            <>
              <BtnEstado p={p} estado="entregado" trab={trab} onIr={onIr} mini>Entregado</BtnEstado>
              <button
                type="button"
                className={`dm-mini sec ${novedadAbierta ? 'on' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onNovedad(p.id);
                }}
              >
                Novedad
              </button>
            </>
          )}
          {p.estado === 'novedad' && (
            <>
              <BtnEstado p={p} estado="en_ruta" trab={trab} onIr={onIr} mini sec>Retomar</BtnEstado>
              <BtnEstado p={p} estado="entregado" trab={trab} onIr={onIr} mini>Entregado</BtnEstado>
            </>
          )}
          {!cerrado && dir && (
            <button
              type="button"
              className={`dm-mini sec ${activa ? 'on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onVer(p.id);
              }}
            >
              <Ico n="mapa" />Mapa
            </button>
          )}
          {cerrado && <span className="dm-hora">Completado</span>}
        </div>
      </td>
    </tr>
  );
}

/* ═════════ Detalle del pedido seleccionado + mapa ═════════ */
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
            <div className="dm-tienda">{p.tienda === 'hans' ? 'Joyería Hans' : "Karen Sprockel's"}</div>
            <h3 className="dm-cliente">{p.cliente || 'Cliente'}</h3>
          </div>
          <span className={`dm-badge ${CLASE[p.estado]}`}>{ETIQUETA[p.estado]}</span>
        </div>
      </div>

      {q ? (
        <div className="dm-mapa">
          <iframe
            key={q}
            title={`Mapa de ${p.cliente || 'la entrega'}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="dm-mapa">
          <p className="dm-mapa-vacio">Este pedido no tiene dirección para mostrar en el mapa.</p>
        </div>
      )}

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