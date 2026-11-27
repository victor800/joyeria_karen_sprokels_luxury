// 📁 RUTA: src/app/domi/[slug]/PanelDomi.tsx   (ARCHIVO NUEVO)
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Estado, PedidoDomi } from '@/lib/pedidos-domi';

/** Ciudad que se agrega a la dirección para ubicarla bien en el mapa */
const CIUDAD = 'Medellín, Antioquia, Colombia';

const ETIQUETA: Record<Estado, string> = {
  asignado: 'Por salir',
  en_ruta: 'En ruta',
  entregado: 'Entregado',
  novedad: 'Novedad',
};
const FILTROS: (Estado | 'todos')[] = ['todos', 'asignado', 'en_ruta', 'novedad', 'entregado'];
const MOTIVOS = ['Cliente no contesta', 'Dirección incorrecta', 'Cliente no está', 'Rechazó el pedido'];

const digitos = (t: string) => t.replace(/\D/g, '');
const mapa = (p: PedidoDomi) => encodeURIComponent([p.direccion, p.barrio, CIUDAD].filter(Boolean).join(', '));

export default function PanelDomi({ slug, nombre }: { slug: string; nombre: string | null }) {
  return (
    <main className="dm">
      <style>{CSS}</style>
      {nombre ? <Panel slug={slug} nombre={nombre} /> : <Login slug={slug} />}
    </main>
  );
}

/* ═════════ Inicio de sesión ═════════ */

function Login({ slug }: { slug: string }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setCargando(true);
    setError('');
    try {
      const r = await fetch('/api/domi/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, usuario, clave }),
      });
      const j = await r.json();
      if (!r.ok) return setError(j.error ?? 'No fue posible ingresar.');
      router.refresh();
    } catch {
      setError('Sin conexión. Revise su internet e intente de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="dm-login">
      <h1>Mis entregas</h1>
      <p className="dm-sub">Ingrese con su nombre y los últimos 4 dígitos de su teléfono.</p>
      <label>
        Usuario
        <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" />
      </label>
      <label>
        Clave
        <input
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          inputMode="numeric"
          type="password"
          maxLength={4}
          autoComplete="current-password"
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
        />
      </label>
      {error && <p className="dm-error" role="alert">{error}</p>}
      <button className="dm-btn dm-primario" disabled={cargando || !usuario || !clave} onClick={entrar}>
        {cargando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </section>
  );
}

/* ═════════ Panel ═════════ */

function Panel({ slug, nombre }: { slug: string; nombre: string }) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoDomi[]>([]);
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos');
  const [selId, setSelId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [modoNovedad, setModoNovedad] = useState(false);
  const [textoNovedad, setTextoNovedad] = useState('');

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/api/domi/pedidos?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (r.status === 401) return router.refresh();
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setPedidos(j.pedidos);
      setError('');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No fue posible actualizar los pedidos.');
    } finally {
      setCargando(false);
    }
  }, [slug, router]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30_000);
    const vis = () => document.visibilityState === 'visible' && cargar();
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [cargar]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = { todos: pedidos.length };
    for (const p of pedidos) c[p.estado] = (c[p.estado] ?? 0) + 1;
    return c;
  }, [pedidos]);

  const visibles = pedidos.filter((p) => filtro === 'todos' || p.estado === filtro);
  const sel = pedidos.find((p) => p.id === selId) ?? null;

  async function cambiar(p: PedidoDomi, estado: Estado, novedad = '') {
    if (estado === 'entregado' && !window.confirm(`¿Confirma que el pedido de ${p.cliente} fue entregado completo?`)) return;
    setGuardando(true);
    setError('');
    try {
      const r = await fetch('/api/domi/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, id: p.id, estado, novedad }),
      });
      const j = await r.json();
      if (!r.ok) return setError(j.error ?? 'No fue posible guardar el cambio.');
      setModoNovedad(false);
      setTextoNovedad('');
      await cargar();
    } catch {
      setError('Sin conexión. El cambio no se guardó.');
    } finally {
      setGuardando(false);
    }
  }

  async function salir() {
    await fetch('/api/domi/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <>
      <header className="dm-top">
        <div>
          <h1>Hola, {nombre}</h1>
          <p className="dm-sub">
            {cargando ? 'Cargando pedidos…' : `${conteo.asignado ?? 0} por salir · ${conteo.en_ruta ?? 0} en ruta`}
          </p>
        </div>
        <div className="dm-acciones-top">
          <button className="dm-btn" onClick={cargar}>Actualizar</button>
          <button className="dm-btn" onClick={salir}>Salir</button>
        </div>
      </header>

      {error && <p className="dm-error" role="alert">{error}</p>}

      <nav className="dm-filtros" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <button key={f} className={`dm-filtro${filtro === f ? ' on' : ''}`} onClick={() => setFiltro(f)}>
            {f === 'todos' ? 'Todos' : ETIQUETA[f]} <b>{conteo[f] ?? 0}</b>
          </button>
        ))}
      </nav>

      <div className="dm-cuerpo">
        <div className="dm-tabla-caja">
          {visibles.length === 0 ? (
            <p className="dm-vacio">{cargando ? '' : 'No tiene pedidos en este estado.'}</p>
          ) : (
            <table className="dm-tabla">
              <thead>
                <tr><th>Cliente</th><th>Dirección</th><th>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr
                    key={p.id}
                    className={selId === p.id ? 'sel' : ''}
                    onClick={() => { setSelId(p.id); setModoNovedad(false); }}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelId(p.id)}
                  >
                    <td data-l="Cliente"><b>{p.cliente}</b><small>#{p.id}</small></td>
                    <td data-l="Dirección">{p.direccion}<small>{p.barrio}</small></td>
                    <td data-l="Total">{p.total}<small>{p.metodoPago}</small></td>
                    <td data-l="Estado"><span className={`dm-chip e-${p.estado}`}>{ETIQUETA[p.estado]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="dm-detalle">
          {!sel ? (
            <p className="dm-vacio">Toque un pedido para ver el mapa y las acciones.</p>
          ) : (
            <>
              <div className="dm-det-cab">
                <h2>{sel.cliente}</h2>
                <span className={`dm-chip e-${sel.estado}`}>{ETIQUETA[sel.estado]}</span>
              </div>
              <p className="dm-dir">{[sel.direccion, sel.barrio].filter(Boolean).join(', ')}</p>
              {sel.detalle && <p className="dm-nota">Lleva: {sel.detalle}</p>}
              {sel.notas && <p className="dm-nota">Nota del pedido: {sel.notas}</p>}
              {sel.estado === 'novedad' && sel.novedad && <p className="dm-nota rojo">Novedad: {sel.novedad}</p>}

              <iframe
                className="dm-mapa"
                title={`Mapa de ${sel.direccion}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${mapa(sel)}&output=embed`}
              />

              <div className="dm-enlaces">
                <a className="dm-btn" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${mapa(sel)}`}>Cómo llegar</a>
                <a className="dm-btn" target="_blank" rel="noreferrer" href={`https://waze.com/ul?q=${mapa(sel)}&navigate=yes`}>Waze</a>
                <a className="dm-btn" href={`tel:+${digitos(sel.telefono).length === 10 ? '57' : ''}${digitos(sel.telefono)}`}>Llamar</a>
                <a className="dm-btn" target="_blank" rel="noreferrer" href={`https://wa.me/${digitos(sel.telefono).length === 10 ? '57' : ''}${digitos(sel.telefono)}`}>WhatsApp</a>
              </div>

              {modoNovedad ? (
                <div className="dm-novedad">
                  <p>¿Qué pasó con esta entrega?</p>
                  <div className="dm-motivos">
                    {MOTIVOS.map((m) => (
                      <button key={m} className={`dm-filtro${textoNovedad === m ? ' on' : ''}`} onClick={() => setTextoNovedad(m)}>{m}</button>
                    ))}
                  </div>
                  <textarea
                    value={textoNovedad}
                    onChange={(e) => setTextoNovedad(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Escriba el detalle de la novedad"
                  />
                  <div className="dm-fila">
                    <button className="dm-btn" onClick={() => setModoNovedad(false)}>Cancelar</button>
                    <button className="dm-btn dm-peligro" disabled={guardando || textoNovedad.trim().length < 3} onClick={() => cambiar(sel, 'novedad', textoNovedad)}>
                      Guardar novedad
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dm-fila">
                  {sel.estado === 'asignado' && (
                    <button className="dm-btn dm-primario" disabled={guardando} onClick={() => cambiar(sel, 'en_ruta')}>Salir a ruta</button>
                  )}
                  {sel.estado === 'novedad' && (
                    <button className="dm-btn" disabled={guardando} onClick={() => cambiar(sel, 'en_ruta')}>Retomar ruta</button>
                  )}
                  {(sel.estado === 'en_ruta' || sel.estado === 'novedad') && (
                    <button className="dm-btn dm-ok" disabled={guardando} onClick={() => cambiar(sel, 'entregado')}>Entregado</button>
                  )}
                  {sel.estado === 'en_ruta' && (
                    <button className="dm-btn dm-peligro" disabled={guardando} onClick={() => setModoNovedad(true)}>Reportar novedad</button>
                  )}
                  {sel.estado === 'entregado' && <p className="dm-vacio">Pedido entregado. Buen trabajo.</p>}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}

const CSS = `
.dm{--tinta:#10241c;--papel:#eef1ef;--card:#fff;--linea:#d3dad6;--suave:#5b6b63;--ruta:#f2b705;--ok:#1f8a4c;--rojo:#c43d2f;--azul:#2f5d8a;
min-height:100dvh;background:var(--papel);color:var(--tinta);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:16px;max-width:1100px;margin:0 auto}
.dm *{box-sizing:border-box}
.dm h1{font-size:1.4rem;margin:0}.dm h2{font-size:1.15rem;margin:0}
.dm-sub{color:var(--suave);margin:2px 0 0;font-size:.9rem}
.dm-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
.dm-acciones-top{display:flex;gap:8px}
.dm-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:10px;border:1.5px solid var(--tinta);background:var(--card);color:var(--tinta);font:600 .95rem inherit;font-family:inherit;text-decoration:none;cursor:pointer}
.dm-btn:disabled{opacity:.5;cursor:not-allowed}
.dm-btn:focus-visible,.dm-filtro:focus-visible,.dm-tabla tr:focus-visible,.dm input:focus-visible,.dm textarea:focus-visible{outline:3px solid var(--azul);outline-offset:2px}
.dm-primario{background:var(--ruta);border-color:var(--ruta)}
.dm-ok{background:var(--ok);border-color:var(--ok);color:#fff}
.dm-peligro{background:var(--card);border-color:var(--rojo);color:var(--rojo)}
.dm-peligro:not(:disabled):hover{background:var(--rojo);color:#fff}
.dm-error{background:#fbe6e3;color:#8f2a20;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:.92rem}
.dm-filtros{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px}
.dm-filtro{flex:none;min-height:40px;padding:0 14px;border-radius:999px;border:1.5px solid var(--linea);background:var(--card);color:var(--tinta);font:600 .88rem inherit;font-family:inherit;cursor:pointer}
.dm-filtro.on{background:var(--tinta);border-color:var(--tinta);color:#fff}
.dm-filtro b{margin-left:4px;opacity:.7}
.dm-cuerpo{display:grid;gap:16px;grid-template-columns:1fr}
@media(min-width:900px){.dm-cuerpo{grid-template-columns:1.15fr 1fr;align-items:start}.dm-detalle{position:sticky;top:16px}}
.dm-tabla-caja,.dm-detalle{background:var(--card);border:1px solid var(--linea);border-radius:14px;padding:6px}
.dm-detalle{padding:16px}
.dm-tabla{width:100%;border-collapse:collapse}
.dm-tabla th{text-align:left;font-size:.8rem;color:var(--suave);padding:10px;border-bottom:1px solid var(--linea)}
.dm-tabla td{padding:12px 10px;border-bottom:1px solid var(--linea);vertical-align:top;font-size:.93rem}
.dm-tabla tr:last-child td{border-bottom:0}
.dm-tabla tbody tr{cursor:pointer}.dm-tabla tbody tr:hover,.dm-tabla tr.sel{background:#f3f6f4}
.dm-tabla tr.sel td:first-child{box-shadow:inset 4px 0 0 var(--tinta)}
.dm-tabla small{display:block;color:var(--suave);font-size:.8rem;margin-top:2px}
.dm-chip{display:inline-block;padding:4px 10px;border-radius:999px;font-size:.8rem;font-weight:700;white-space:nowrap}
.e-asignado{background:#e0e9f2;color:var(--azul)}.e-en_ruta{background:#fdf0c2;color:#7a5a00}
.e-entregado{background:#d9f0e2;color:#15663a}.e-novedad{background:#fbe0dc;color:var(--rojo)}
.dm-det-cab{display:flex;justify-content:space-between;align-items:center;gap:8px}
.dm-dir{margin:6px 0 10px;font-size:1rem}
.dm-nota{background:#f3f6f4;border-radius:8px;padding:8px 10px;font-size:.9rem;margin:0 0 10px}.dm-nota.rojo{background:#fbe6e3;color:#8f2a20}
.dm-mapa{width:100%;height:260px;border:1px solid var(--linea);border-radius:12px;margin-bottom:10px}
.dm-enlaces{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px}
@media(min-width:500px){.dm-enlaces{grid-template-columns:repeat(4,1fr)}}
.dm-fila{display:flex;gap:8px;flex-wrap:wrap}.dm-fila .dm-btn{flex:1 1 140px}
.dm-novedad p{margin:0 0 8px;font-weight:600}
.dm-motivos{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.dm textarea,.dm input{width:100%;border:1.5px solid var(--linea);border-radius:10px;padding:10px 12px;font:inherit;background:#fff;color:var(--tinta);margin-bottom:10px}
.dm-vacio{color:var(--suave);text-align:center;padding:24px 12px;margin:0}
.dm-login{max-width:380px;margin:12vh auto 0;background:var(--card);border:1px solid var(--linea);border-radius:14px;padding:24px}
.dm-login h1{margin-bottom:4px}.dm-login .dm-sub{margin-bottom:16px}
.dm-login label{display:block;font-weight:600;font-size:.9rem}.dm-login label input{margin-top:6px}
.dm-login .dm-btn{width:100%}
@media(max-width:640px){
 .dm-tabla thead{display:none}.dm-tabla,.dm-tabla tbody,.dm-tabla tr,.dm-tabla td{display:block;width:100%}
 .dm-tabla tr{padding:10px;border-bottom:1px solid var(--linea)}.dm-tabla td{border:0;padding:3px 0}
 .dm-tabla tr.sel td:first-child{box-shadow:none}.dm-tabla tr.sel{box-shadow:inset 4px 0 0 var(--tinta)}
}
@media(prefers-reduced-motion:reduce){.dm *{transition:none!important}}
`;