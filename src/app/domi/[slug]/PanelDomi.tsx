// 📁 RUTA: src/app/domi/[slug]/PanelDomi.tsx   (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
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

/* Los logos se piden a Next en tamaño grande (width/height + quality + sizes) para que salgan nítidos en pantallas retina */
function Logos({ mini = false }: { mini?: boolean }) {
  const lado = mini ? 240 : 400;
  const sizes = mini ? '(max-width: 600px) 20vw, 96px' : '(max-width: 600px) 34vw, 168px';
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

const ICO = {
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z M12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  caja: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9z M3 7.5l9 4.5 9-4.5 M12 12v9',
  cal: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  tel: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  chat: 'M4 20l1.3-4.2A8 8 0 114 20z M9 9.5c0 3 2.5 5.5 5.5 5.5',
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14',
} as const;

function Ico({ n }: { n: keyof typeof ICO }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICO[n]} />
    </svg>
  );
}

/* ═════════ Panel ═════════ */
type Filtro = 'pend' | 'ok';
const ORDEN: Record<Estado, number> = { en_ruta: 0, novedad: 1, asignado: 2, entregado: 3 };

function Panel({ slug, nombre, foto }: { slug: string; nombre: string; foto: string | null }) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoDomi[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [hora, setHora] = useState<Date | null>(null);
  const [fotoMala, setFotoMala] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('pend');

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

  async function salir() {
    await fetch('/api/domi/logout', { method: 'POST' }).catch(() => {});
    router.refresh();
  }

  const pendientes = pedidos?.filter((p) => p.estado !== 'entregado').length ?? 0;
  const entregados = pedidos?.filter((p) => p.estado === 'entregado').length ?? 0;
  const visibles = (pedidos ?? [])
    .filter((p) => (filtro === 'ok' ? p.estado === 'entregado' : p.estado !== 'entregado'))
    .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado]);

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

      <section className="dm-stats" aria-label="Filtrar pedidos">
        <button type="button" className={filtro === 'pend' ? 'on' : ''} onClick={() => setFiltro('pend')}>
          <b>{pendientes}</b><span>Por entregar</span>
        </button>
        <button type="button" className={filtro === 'ok' ? 'on' : ''} onClick={() => setFiltro('ok')}>
          <b>{entregados}</b><span>Entregados</span>
        </button>
      </section>

      <div className="dm-barra">
        <h2 className="dm-titulo dm-h2">{filtro === 'ok' ? 'Entregados' : 'Por entregar'}</h2>
        <button className="dm-act" onClick={cargar} disabled={cargando}>{cargando ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
      {hora && <p className="dm-hora">Actualizado a las {hora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>}

      {error && <div className="dm-error">{error}</div>}
      {!pedidos && !error && <p className="dm-vacio">Cargando pedidos…</p>}
      {pedidos && visibles.length === 0 && (
        <p className="dm-vacio">
          {filtro === 'ok' ? 'Aún no ha entregado pedidos.' : 'No tiene pedidos por entregar por ahora.'}
        </p>
      )}

      <div className="dm-lista">
        {visibles.map((p) => (
          <Tarjeta key={p.id} p={p} onCambiar={cambiar} />
        ))}
      </div>
    </main>
  );
}

/* ═════════ Barra de progreso: siempre arranca en "Asignado" ═════════ */
const PASOS = ['Asignado', 'En ruta', 'Entregado'];

function Progreso({ estado }: { estado: Estado }) {
  const actual = estado === 'asignado' ? 0 : estado === 'entregado' ? 2 : 1;
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

/* ═════════ Tarjeta de pedido ═════════ */
function Tarjeta({
  p,
  onCambiar,
}: {
  p: PedidoDomi;
  onCambiar: (id: string, estado: Estado, novedad?: string) => Promise<string | null>;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [err, setErr] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const [mapa, setMapa] = useState(false);

  async function ir(estado: Estado, novedad = '') {
    if (ocupado) return;
    setOcupado(true);
    setErr('');
    const e = await onCambiar(p.id, estado, novedad);
    if (e) setErr(e);
    else {
      setAbierta(false);
      setTexto('');
    }
    setOcupado(false);
  }

  function entregado() {
    if (window.confirm('¿Confirma que este pedido fue entregado?')) ir('entregado');
  }

  const dir = [p.direccion, p.barrio].filter(Boolean).join(', ');
  const q = dir ? consultaMapa(dir) : '';
  const cerrado = p.estado === 'entregado';
  const efectivo = /efectivo/i.test(p.metodoPago || '');

  return (
    <article className={`dm-ped e-${p.estado} ${cerrado ? 'cerrado' : ''}`}>
      <div className="dm-ped-head">
        <div>
          <div className="dm-tienda">{p.tienda === 'hans' ? 'Joyería Hans' : "Karen Sprockel's"}</div>
          <h3 className="dm-cliente">{p.cliente || 'Cliente'}</h3>
        </div>
        <span className={`dm-badge ${CLASE[p.estado]}`}>{ETIQUETA[p.estado]}</span>
      </div>

      <Progreso estado={p.estado} />

      <div className="dm-info">
        {p.detalle && <div className="dm-fila"><Ico n="caja" /><span>{p.detalle}</span></div>}
        {dir && <div className="dm-fila"><Ico n="pin" /><span>{dir}</span></div>}
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

      {(dir || p.telefono) && (
        <div className="dm-acciones">
          {p.telefono && (
            <a className="dm-acc" href={`tel:${p.telefono.replace(/\s/g, '')}`}><Ico n="tel" />Llamar</a>
          )}
          {p.telefono && (
            <a className="dm-acc" href={`https://wa.me/${wa(p.telefono)}`} target="_blank" rel="noreferrer"><Ico n="chat" />WhatsApp</a>
          )}
          {dir && (
            <button type="button" className={`dm-acc ${mapa ? 'on' : ''}`} onClick={() => setMapa((v) => !v)} aria-expanded={mapa}>
              <Ico n="mapa" />{mapa ? 'Ocultar mapa' : 'Ver mapa'}
            </button>
          )}
        </div>
      )}

      {mapa && q && (
        <div className="dm-mapa">
          <iframe
            title={`Mapa de ${p.cliente || 'la entrega'}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">
            Abrir ruta en Google Maps
          </a>
        </div>
      )}

      {!cerrado && (
        <div className="dm-estados">
          {p.estado === 'asignado' && (
            <button className="dm-es" disabled={ocupado} onClick={() => ir('en_ruta')}>Salir a ruta</button>
          )}
          {p.estado === 'en_ruta' && (
            <>
              <button className="dm-es" disabled={ocupado} onClick={entregado}>Entregado</button>
              <button className="dm-es sec" disabled={ocupado} onClick={() => setAbierta((v) => !v)}>Novedad</button>
            </>
          )}
          {p.estado === 'novedad' && (
            <>
              <button className="dm-es sec" disabled={ocupado} onClick={() => ir('en_ruta')}>Retomar ruta</button>
              <button className="dm-es" disabled={ocupado} onClick={entregado}>Entregado</button>
            </>
          )}
        </div>
      )}

      {abierta && (
        <div className="dm-nov">
          <textarea
            className="dm-input"
            rows={3}
            maxLength={300}
            placeholder="Cuente qué pasó (cliente no responde, dirección incorrecta…)"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button className="dm-es" disabled={ocupado || texto.trim().length < 3} onClick={() => ir('novedad', texto)}>
            {ocupado ? 'Guardando…' : 'Guardar novedad'}
          </button>
        </div>
      )}

      {err && <div className="dm-error">{err}</div>}
    </article>
  );
}