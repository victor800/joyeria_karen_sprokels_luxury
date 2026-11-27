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


function Logos() {
  return (
    <div className="dm-logos">
      <Image src="/logo-jks.jpeg" alt="Karen Sprockel's Luxury" width={96} height={96} priority />
      <Image src="/hans.jpeg" alt="Joyería Hans" width={96} height={96} priority />
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

/* ═════════ Panel ═════════ */
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

function Panel({ slug, nombre, foto }: { slug: string; nombre: string; foto: string | null }) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoDomi[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [hora, setHora] = useState<Date | null>(null);
  const [fotoMala, setFotoMala] = useState(false);

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

      <div className="dm-logos dm-logos-mini">
        <Image src="/logo-jks.jpeg" alt="Karen Sprockel's Luxury" width={44} height={44} />
        <Image src="/hans.jpeg" alt="Joyería Hans" width={44} height={44} />
      </div>

      <section className="dm-stats">
        <div><b>{pendientes}</b><span>Por entregar</span></div>
        <div><b>{entregados}</b><span>Entregados</span></div>
      </section>

      <div className="dm-barra">
        <h2 className="dm-titulo dm-h2">Mis entregas</h2>
        <button className="dm-act" onClick={cargar} disabled={cargando}>{cargando ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
      {hora && <p className="dm-hora">Actualizado a las {hora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>}

      {error && <div className="dm-error">{error}</div>}
      {!pedidos && !error && <p className="dm-vacio">Cargando pedidos…</p>}
      {pedidos && pedidos.length === 0 && <p className="dm-vacio">No tiene pedidos asignados por ahora.</p>}

      <div className="dm-lista">
        {pedidos?.map((p) => (
          <Tarjeta key={p.id} p={p} onCambiar={cambiar} />
        ))}
      </div>
    </main>
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
  const cerrado = p.estado === 'entregado';

  return (
    <article className={`dm-ped ${cerrado ? 'cerrado' : ''}`}>
      <div className="dm-ped-top">
        <span className="dm-tienda">{p.tienda === 'hans' ? 'Joyería Hans' : "Karen Sprockel's"}</span>
        <span className={`dm-badge ${CLASE[p.estado]}`}>{ETIQUETA[p.estado]}</span>
      </div>

      {p.cliente && <div className="dm-cliente">{p.cliente}</div>}
      {p.detalle && <div className="dm-dato">{p.detalle}</div>}
      {dir && <div className="dm-dato">📍 {dir}</div>}
      {p.fecha && <div className="dm-dato fecha">{p.fecha}</div>}
      {p.total && (
        <div className="dm-total">
          {p.total}
          {p.metodoPago && <small> · {p.metodoPago}</small>}
        </div>
      )}
      {p.notas && <div className="dm-notas">{p.notas}</div>}

      <div className="dm-acciones">
        {dir && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`} target="_blank" rel="noreferrer">Mapa</a>
        )}
        {p.telefono && <a href={`tel:${p.telefono.replace(/\s/g, '')}`}>Llamar</a>}
        {p.telefono && <a href={`https://wa.me/${wa(p.telefono)}`} target="_blank" rel="noreferrer">WhatsApp</a>}
      </div>

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