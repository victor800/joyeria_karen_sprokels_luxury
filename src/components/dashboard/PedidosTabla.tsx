'use client';
import { Fragment, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Cel } from '@/lib/datos-dashboard';
import type { Campo } from '@/lib/campos';
import './pedidos-tabla.css';

type Props = {
  filas: Cel[][];
  campos: Campo[];
  onCrear: (datos: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;
  aviso?: string;
};

// Orden de columnas que entrega leerPedidos()
const C = { num: 0, cliente: 1, prenda: 2, total: 3, entrega: 4, estado: 5, pago: 6, domi: 7, valorDomi: 8, nota: 9 };

const texto = (c?: Cel) => (c == null ? '' : typeof c === 'string' ? c : c.chip);
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Acepta dd/mm/aaaa o aaaa-mm-dd y devuelve un número comparable aaaammdd */
function fechaNum(s: string): number | null {
  const a = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (a) return Number(a[3]) * 10000 + Number(a[2]) * 100 + Number(a[1]);
  const b = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (b) return Number(b[1]) * 10000 + Number(b[2]) * 100 + Number(b[3]);
  return null;
}
const hoyNum = (d: Date, extra = 0) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + extra);
  return x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate();
};

function tono(estado: string) {
  const e = norm(estado);
  if (/entregad|complet/.test(e)) return 'verde';
  if (/camino|ruta|despach/.test(e)) return 'naranja';
  if (/cancel|anulad/.test(e)) return 'rojo';
  if (/prepar|proceso|recibid/.test(e)) return 'azul';
  if (/nuevo|pendiente/.test(e)) return 'amarillo';
  return 'gris';
}

export default function PedidosTabla({ filas, campos, onCrear, aviso }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [domi, setDomi] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [porPagina, setPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();
  const [ahora, setAhora] = useState<Date | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  // Marca de "última actualización" (en cliente para evitar desajustes de hidratación)
  useEffect(() => {
    setAhora(new Date());
    setRefrescando(false);
  }, [filas]);

  // Auto-refresco cada 30 s (pausado mientras el formulario está abierto)
  useEffect(() => {
    if (modal) return;
    const id = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(id);
  }, [modal, router]);

  useEffect(() => {
    if (!modal) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setModal(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [modal]);

  const estados = useMemo(() => [...new Set(filas.map((f) => texto(f[C.estado])).filter(Boolean))], [filas]);
  const domis = useMemo(
    () => [...new Set(filas.map((f) => texto(f[C.domi])).filter((d) => d && norm(d) !== 'sin asignar' && d !== '-'))],
    [filas],
  );
  const conteo = useMemo(() => {
    const m: Record<string, number> = {};
    filas.forEach((f) => {
      const e = texto(f[C.estado]);
      m[e] = (m[e] ?? 0) + 1;
    });
    return m;
  }, [filas]);

  const filtradas = useMemo(() => {
    const t = norm(q.trim());
    const d = desde ? Number(desde.replace(/-/g, '')) : null;
    const h = hasta ? Number(hasta.replace(/-/g, '')) : null;
    return filas.filter((f) => {
      if (estado !== 'todos' && texto(f[C.estado]) !== estado) return false;
      if (domi !== 'todos' && texto(f[C.domi]) !== domi) return false;
      if (d || h) {
        const n = fechaNum(texto(f[C.entrega]));
        if (n == null) return false;
        if (d && n < d) return false;
        if (h && n > h) return false;
      }
      return !t || f.some((c) => norm(texto(c)).includes(t));
    });
  }, [filas, q, estado, domi, desde, hasta]);

  const totalPag = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const pag = Math.min(pagina, totalPag);
  const ini = (pag - 1) * porPagina;
  const visibles = filtradas.slice(ini, ini + porPagina);
  const hayFiltro = q.trim() !== '' || estado !== 'todos' || domi !== 'todos' || desde !== '' || hasta !== '';

  const cambiar = (fn: () => void) => {
    fn();
    setPagina(1);
    setAbierta(null);
  };

  function refrescar() {
    setRefrescando(true);
    router.refresh();
    setTimeout(() => setRefrescando(false), 1200);
  }

  function exportar() {
    const cols = ['N°', 'Cliente', 'Prenda', 'Total', 'Entrega', 'Estado', 'Pago', 'Domiciliario', 'Domicilio', 'Nota'];
    const esc = (s: string) => `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    const lineas = [cols, ...filtradas.map((f) => f.map(texto))].map((r) => r.map(esc).join(';'));
    const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = Object.fromEntries([...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, String(v)]));
    setError(null);
    iniciar(async () => {
      try {
        const r = await onCrear(datos);
        if (r.ok) setModal(false);
        else setError(r.error ?? 'No se pudo guardar.');
      } catch {
        setError('No se pudo guardar. Intenta de nuevo.');
      }
    });
  }

  function badgeEntrega(s: string) {
    if (!ahora) return null;
    const n = fechaNum(s);
    if (n == null) return null;
    if (n === hoyNum(ahora)) return <span className="pt-dia hoy">Hoy</span>;
    if (n === hoyNum(ahora, 1)) return <span className="pt-dia manana">Mañana</span>;
    if (n < hoyNum(ahora)) return <span className="pt-dia vencido">Vencido</span>;
    return null;
  }

  const paginas = useMemo(() => {
    const out: (number | '…')[] = [];
    for (let i = 1; i <= totalPag; i++) {
      if (i === 1 || i === totalPag || Math.abs(i - pag) <= 1) out.push(i);
      else if (out[out.length - 1] !== '…') out.push('…');
    }
    return out;
  }, [totalPag, pag]);

  return (
    <main className="d-cont simple pt">
      <div className="d-cab">
        <div>
          <h1>Pedidos</h1>
          <p>Ventas en tienda y domicilios, del pedido a la entrega.</p>
        </div>
      </div>

      {aviso && <p className="d-aviso" role="alert">{aviso}</p>}

      {/* Filtros */}
      <div className="pt-filtros">
        <input
          className="pt-input pt-buscar"
          type="search"
          placeholder="Buscar cliente, código, teléfono…"
          aria-label="Buscar"
          value={q}
          onChange={(e) => cambiar(() => setQ(e.target.value))}
        />
        <select className="pt-input" aria-label="Domiciliario" value={domi} onChange={(e) => cambiar(() => setDomi(e.target.value))}>
          <option value="todos">Todos los domiciliarios</option>
          {domis.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <label className="pt-fecha">
          <span>Desde</span>
          <input className="pt-input" type="date" value={desde} max={hasta || undefined} onChange={(e) => cambiar(() => setDesde(e.target.value))} />
        </label>
        <label className="pt-fecha">
          <span>Hasta</span>
          <input className="pt-input" type="date" value={hasta} min={desde || undefined} onChange={(e) => cambiar(() => setHasta(e.target.value))} />
        </label>
        <div className="pt-acciones">
          <button type="button" className="pt-btn linea" onClick={refrescar} disabled={refrescando}>
            <span className={refrescando ? 'pt-giro' : undefined}>↻</span> Actualizar
          </button>
          <button type="button" className="pt-btn oscuro" onClick={exportar} disabled={filtradas.length === 0}>
            ⬇ Exportar CSV ({filtradas.length})
          </button>
          <button
            type="button"
            className="pt-btn dorado"
            onClick={() => {
              setError(null);
              setModal(true);
            }}
          >
            + Nuevo pedido
          </button>
        </div>
      </div>

      {/* Chips de estado con conteo */}
      <div className="pt-chips" role="tablist" aria-label="Filtrar por estado">
        <button type="button" role="tab" aria-selected={estado === 'todos'} className="pt-chipf" onClick={() => cambiar(() => setEstado('todos'))}>
          Todos <b>{filas.length}</b>
        </button>
        {estados.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={estado === s} className="pt-chipf" onClick={() => cambiar(() => setEstado(s))}>
            {s} <b>{conteo[s] ?? 0}</b>
          </button>
        ))}
        {hayFiltro && (
          <button
            type="button"
            className="pt-limpiar"
            onClick={() => cambiar(() => { setQ(''); setEstado('todos'); setDomi('todos'); setDesde(''); setHasta(''); })}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="pt-card">
        <table className="pt-tabla">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Artículos</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Domiciliario</th>
              <th>Entrega</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={8} className="pt-vacio">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                    <path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6" />
                  </svg>
                  {hayFiltro ? (
                    <p>No hay pedidos con esos filtros.</p>
                  ) : (
                    <p>Aún no hay pedidos.<br />Cuando agregues el primero aparecerá aquí.</p>
                  )}
                </td>
              </tr>
            ) : (
              visibles.map((f, i) => {
                const key = `${texto(f[C.num])}-${ini + i}`;
                const dom = texto(f[C.domi]);
                const sinDom = !dom || norm(dom) === 'sin asignar' || dom === '-';
                const pago = texto(f[C.pago]);
                const pagado = /^pag/.test(norm(pago)) || /pagado|cancelado/.test(norm(pago));
                const abierto = abierta === key;
                return (
                  <Fragment key={key}>
                    <tr data-abierta={abierto}>
                      <td data-label="Pedido">
                        <div className="pt-cod">{texto(f[C.num])}</div>
                      </td>
                      <td data-label="Cliente">
                        <div className="pt-fuerte">{texto(f[C.cliente])}</div>
                      </td>
                      <td data-label="Artículos">
                        <div>{texto(f[C.prenda])}</div>
                      </td>
                      <td data-label="Total">
                        <div className="pt-fuerte">{texto(f[C.total])}</div>
                        <div className={`pt-pago ${pagado ? 'ok' : 'pend'}`}>{pagado ? pago : `Pago ${pago.toLowerCase()}`}</div>
                      </td>
                      <td data-label="Estado">
                        <span className="pt-estado" data-t={tono(texto(f[C.estado]))}>{texto(f[C.estado])}</span>
                      </td>
                      <td data-label="Domiciliario">
                        <span className={sinDom ? 'pt-sec' : 'pt-dom'}>{sinDom ? 'Sin asignar' : dom}</span>
                      </td>
                      <td data-label="Entrega">
                        <div className="pt-fuerte">{texto(f[C.entrega]) || '—'}</div>
                        {badgeEntrega(texto(f[C.entrega]))}
                      </td>
                      <td className="pt-celda-acc">
                        <button type="button" className="pt-ver" aria-expanded={abierto} onClick={() => setAbierta(abierto ? null : key)}>
                          {abierto ? 'Cerrar' : 'Ver'}
                        </button>
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="pt-detalle">
                        <td colSpan={8}>
                          <dl>
                            <div><dt>Prenda</dt><dd>{texto(f[C.prenda]) || '—'}</dd></div>
                            <div><dt>Valor domicilio</dt><dd>{texto(f[C.valorDomi]) || '—'}</dd></div>
                            <div><dt>Pago</dt><dd>{pago || '—'}</dd></div>
                            <div className="ancho"><dt>Nota</dt><dd>{texto(f[C.nota]) || '—'}</dd></div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie: conteo + paginación */}
      <div className="pt-pie">
        <span className="pt-sec">
          {filtradas.length === 0 ? 'Mostrando 0 de 0' : `Mostrando ${ini + 1}–${ini + visibles.length} de ${filtradas.length}`}
        </span>
        <div className="pt-pag">
          <label className="pt-filas">
            Filas
            <select className="pt-input" value={porPagina} onChange={(e) => cambiar(() => setPorPagina(Number(e.target.value)))}>
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button type="button" className="pt-pg" aria-label="Anterior" disabled={pag <= 1} onClick={() => setPagina(pag - 1)}>‹</button>
          {paginas.map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="pt-sec">…</span>
            ) : (
              <button key={p} type="button" className="pt-pg" aria-current={p === pag ? 'page' : undefined} onClick={() => setPagina(p)}>
                {p}
              </button>
            ),
          )}
          <button type="button" className="pt-pg" aria-label="Siguiente" disabled={pag >= totalPag} onClick={() => setPagina(pag + 1)}>›</button>
        </div>
      </div>

      <p className="pt-nota">
        {ahora ? `Última actualización: ${ahora.toLocaleString('es-CO')} · ` : ''}se refresca sola cada 30 s. Exportar descarga todos los pedidos filtrados (no solo la página visible).
      </p>

      {/* Formulario de alta */}
      {modal && (
        <div className="d-modal-fondo" onClick={() => !guardando && setModal(false)}>
          <form className="d-modal" role="dialog" aria-modal="true" aria-labelledby="d-modal-t" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
            <h3 id="d-modal-t">Nuevo pedido</h3>
            <p className="d-modal-sub">Se guardará en la hoja de pedidos de tu joyería.</p>

            <div className="d-form">
              {campos.map((c) => (
                <div key={c.name} className={c.completo ? 'completo' : undefined}>
                  <label htmlFor={`f-${c.name}`}>{c.label}</label>
                  {c.tipo === 'select' ? (
                    <select
                      id={`f-${c.name}`}
                      name={c.name}
                      defaultValue={typeof c.opciones?.[0] === 'string' ? c.opciones?.[0] : c.opciones?.[0]?.value}
                    >
                      {c.opciones?.map((o) => {
                        const v = typeof o === 'string' ? o : o.value;
                        const l = typeof o === 'string' ? o : o.label;
                        return <option key={v} value={v}>{l}</option>;
                      })}
                    </select>
                  ) : c.tipo === 'textarea' ? (
                    <textarea id={`f-${c.name}`} name={c.name} rows={3} maxLength={300} placeholder={c.placeholder} />
                  ) : (
                    <input
                      id={`f-${c.name}`}
                      name={c.name}
                      type={c.tipo}
                      required={c.requerido}
                      placeholder={c.placeholder}
                      min={c.tipo === 'number' ? 0 : undefined}
                      inputMode={c.tipo === 'number' ? 'numeric' : undefined}
                      autoFocus={c === campos[0]}
                    />
                  )}
                </div>
              ))}
            </div>

            {error && <p className="d-error" role="alert">{error}</p>}

            <div className="d-modal-pie">
              <button type="button" className="d-btn linea" onClick={() => setModal(false)} disabled={guardando}>CANCELAR</button>
              <button type="submit" className="d-btn" disabled={guardando}>{guardando ? 'GUARDANDO…' : 'GUARDAR'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}