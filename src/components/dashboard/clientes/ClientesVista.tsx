// 📁 RUTA: src/components/dashboard/clientes/ClientesVista.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  ESTADOS_CLIENTE,
  ESTADO_CLIENTE_TEXTO,
  type Cliente,
  type EstadoCliente,
} from '@/types/cliente';

type Col = 'nombre' | 'cedula' | 'piezas' | 'gramos' | 'estado';
const COLUMNAS: { t: string; k?: Col }[] = [
  { t: 'Socio', k: 'nombre' },
  { t: 'Cédula', k: 'cedula' },
  { t: 'Piezas en bóveda', k: 'piezas' },
  { t: 'Gramos', k: 'gramos' },
  { t: 'Estado', k: 'estado' },
  { t: 'Acciones' },
];
const POR_PAGINA = [10, 25, 50];

function fmtDesde(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric', timeZone: 'America/Bogota' });
}

/** Número para wa.me: si son 10 dígitos que empiezan por 3 (celular colombiano) antepone 57 */
function numeroWhatsapp(tel: string) {
  const d = tel.replace(/\D/g, '');
  return d.length === 10 && d.startsWith('3') ? `57${d}` : d;
}
const fmtGramos = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

type Popup = { tipo: 'nuevo' } | { tipo: 'editar'; c: Cliente } | { tipo: 'eliminar'; c: Cliente } | null;

type Form = {
  nombre: string;
  cedula: string;
  telefono: string;
  piezas: string;
  gramos: string;
  estado: EstadoCliente;
};

const FORM_VACIO: Form = { nombre: '', cedula: '', telefono: '', piezas: '0', gramos: '0', estado: 'activo' };

function iniciales(nombre: string) {
  return (
    nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

/* ───────── Ventana emergente ───────── */
function Ventana({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alTeclear);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  return createPortal(
    <div className="cl-fondo" onClick={onCerrar}>
      <style>{CSS}</style>
      <div className="cl-caja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="cl-caja-cab">
          <h2>{titulo}</h2>
          <button type="button" className="cl-x" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ───────── Formulario nuevo / editar ───────── */
function FormularioCliente({
  inicial,
  onCerrar,
  onGuardado,
}: {
  inicial?: Cliente;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [f, setF] = useState<Form>(
    inicial
      ? {
          nombre: inicial.nombre,
          cedula: inicial.cedula,
          telefono: inicial.telefono,
          piezas: String(inicial.piezas),
          gramos: String(inicial.gramos),
          estado: inicial.estado,
        }
      : FORM_VACIO,
  );
  const [errores, setErrores] = useState<Partial<Record<keyof Form, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);

  const poner = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setErrores({});
    setErrorGeneral('');
    try {
      const res = await fetch(inicial ? `/api/clientes/${inicial.id}` : '/api/clientes', {
        method: inicial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errores) setErrores(data.errores);
        else setErrorGeneral(data.error ?? 'No se pudo guardar. Intenta de nuevo.');
        setCargando(false);
        return;
      }
      onGuardado();
    } catch {
      setErrorGeneral('No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
      setCargando(false);
    }
  }

  return (
    <Ventana titulo={inicial ? 'Editar socio' : 'Nuevo socio'} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <div className="cl-form">
          <label className="cl-campo cl-ancho">
            <span>Nombre completo</span>
            <input value={f.nombre} onChange={poner('nombre')} placeholder="Ej: María Fernanda López" autoFocus />
            {errores.nombre && <em>{errores.nombre}</em>}
          </label>

          <label className="cl-campo">
            <span>Cédula</span>
            <input value={f.cedula} onChange={poner('cedula')} inputMode="numeric" placeholder="Solo números" />
            {errores.cedula && <em>{errores.cedula}</em>}
          </label>

          <label className="cl-campo">
            <span>Teléfono (opcional)</span>
            <input value={f.telefono} onChange={poner('telefono')} inputMode="tel" placeholder="3001234567" />
            {errores.telefono && <em>{errores.telefono}</em>}
          </label>

          <label className="cl-campo">
            <span>Piezas en bóveda</span>
            <input value={f.piezas} onChange={poner('piezas')} inputMode="numeric" />
            {errores.piezas && <em>{errores.piezas}</em>}
          </label>

          <label className="cl-campo">
            <span>Gramos de oro</span>
            <input value={f.gramos} onChange={poner('gramos')} inputMode="decimal" />
            {errores.gramos && <em>{errores.gramos}</em>}
          </label>

          <label className="cl-campo cl-ancho">
            <span>Estado</span>
            <select value={f.estado} onChange={poner('estado')}>
              {ESTADOS_CLIENTE.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_CLIENTE_TEXTO[e]}
                </option>
              ))}
            </select>
            {errores.estado && <em>{errores.estado}</em>}
          </label>
        </div>

        {errorGeneral && <p className="cl-error">{errorGeneral}</p>}

        <div className="cl-pie">
          <button type="button" className="cl-btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="cl-btn-oro" disabled={cargando}>
            {cargando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Guardar socio'}
          </button>
        </div>
      </form>
    </Ventana>
  );
}

/* ───────── Confirmar eliminar ───────── */
function ConfirmarEliminar({
  c,
  onCerrar,
  onEliminado,
}: {
  c: Cliente;
  onCerrar: () => void;
  onEliminado: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function eliminar() {
    setCargando(true);
    setError('');
    try {
      const res = await fetch(`/api/clientes/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onEliminado();
    } catch {
      setError('No se pudo eliminar. Intenta de nuevo.');
      setCargando(false);
    }
  }

  return (
    <Ventana titulo="Eliminar socio" onCerrar={onCerrar}>
      <p className="cl-texto">
        ¿Seguro que deseas eliminar a <strong>{c.nombre}</strong> ({c.id})? Esta acción no se puede deshacer.
      </p>
      {error && <p className="cl-error">{error}</p>}
      <div className="cl-pie">
        <button type="button" className="cl-btn-ghost" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className="cl-btn-rojo" onClick={eliminar} disabled={cargando}>
          {cargando ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </Ventana>
  );
}

/* ───────── Vista principal ───────── */
export default function ClientesVista({ filas }: { filas: Cliente[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<'todos' | EstadoCliente>('todos');
  const [popup, setPopup] = useState<Popup>(null);
  const [orden, setOrden] = useState<{ k: Col; dir: 'asc' | 'desc' } | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter((c) => {
      if (estado !== 'todos' && c.estado !== estado) return false;
      if (!t) return true;
      return [c.id, c.nombre, c.cedula, c.telefono].join(' ').toLowerCase().includes(t);
    });
  }, [filas, q, estado]);

  const ordenados = useMemo(() => {
    if (!orden) return visibles;
    const f = orden.dir === 'asc' ? 1 : -1;
    return [...visibles].sort((a, b) => {
      const x = a[orden.k];
      const y = b[orden.k];
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * f;
    });
  }, [visibles, orden]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * porPagina;
  const paginados = ordenados.slice(desde, desde + porPagina);

  function ordenarPor(k: Col) {
    setPagina(1);
    setOrden((o) => (o?.k !== k ? { k, dir: 'asc' } : o.dir === 'asc' ? { k, dir: 'desc' } : null));
  }

  const activos = filas.filter((c) => c.estado === 'activo').length;
  const totalGramos = filas.reduce((suma, c) => suma + c.gramos, 0);
  const totalPiezas = filas.reduce((suma, c) => suma + c.piezas, 0);

  function cerrarYRefrescar() {
    setPopup(null);
    router.refresh();
  }

  function exportar() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lineas = [
      ['ID', 'Nombre', 'Cédula', 'Teléfono', 'Piezas en bóveda', 'Gramos', 'Estado'],
      ...visibles.map((c) => [c.id, c.nombre, c.cedula, c.telefono, c.piezas, c.gramos, ESTADO_CLIENTE_TEXTO[c.estado]]),
    ].map((f) => f.map(esc).join(','));

    const blob = new Blob(['\uFEFF' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes-vip.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cl-pagina">
      <style>{CSS}</style>

      <div className="cl-cab">
        <div>
          <h1>Clientes VIP</h1>
          <p>Socios del club, su cédula y el oro que tienen en custodia.</p>
        </div>
        <button type="button" className="cl-btn-oro" onClick={() => setPopup({ tipo: 'nuevo' })}>
          + Nuevo socio
        </button>
      </div>

      <div className="cl-kpis">
        <article>
          <span className="cl-kpi-ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
            </svg>
          </span>
          <div className="cl-kpi-txt">
            <small>Socios</small>
            <b>{filas.length}</b>
            <em>
              {activos} {activos === 1 ? 'activo' : 'activos'}
            </em>
          </div>
        </article>
        <article>
          <span className="cl-kpi-ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6" />
            </svg>
          </span>
          <div className="cl-kpi-txt">
            <small>Piezas en bóveda</small>
            <b>{totalPiezas}</b>
          </div>
        </article>
        <article className="cl-kpi-dest">
          <span className="cl-kpi-ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z" />
            </svg>
          </span>
          <div className="cl-kpi-txt">
            <small>Gramos en custodia</small>
            <b>{fmtGramos.format(totalGramos)} g</b>
          </div>
        </article>
      </div>

      <div className="cl-tarjeta">
        <div className="cl-barra">
          <input
            className="cl-buscar"
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPagina(1);
            }}
          />
          <select className="cl-filtro" value={estado} onChange={(e) => {
              setEstado(e.target.value as 'todos' | EstadoCliente);
              setPagina(1);
            }}>
            <option value="todos">Todos los estados</option>
            {ESTADOS_CLIENTE.map((e) => (
              <option key={e} value={e}>
                {ESTADO_CLIENTE_TEXTO[e]}
              </option>
            ))}
          </select>
          <select
            className="cl-filtro cl-orden-movil"
            aria-label="Ordenar por"
            value={orden ? (orden.k === 'nombre' || orden.k === 'gramos' || orden.k === 'piezas' ? orden.k : '') : 'recientes'}
            onChange={(e) => {
              const v = e.target.value;
              setPagina(1);
              if (v === 'nombre') setOrden({ k: 'nombre', dir: 'asc' });
              else if (v === 'gramos') setOrden({ k: 'gramos', dir: 'desc' });
              else if (v === 'piezas') setOrden({ k: 'piezas', dir: 'desc' });
              else setOrden(null);
            }}
          >
            <option value="recientes">Más recientes</option>
            <option value="nombre">Nombre A–Z</option>
            <option value="gramos">Más gramos</option>
            <option value="piezas">Más piezas</option>
          </select>
          <div className="cl-der">
            <span className="cl-conteo">
              {visibles.length} {visibles.length === 1 ? 'registro' : 'registros'}
            </span>
            <button type="button" className="cl-btn-linea" onClick={exportar} disabled={visibles.length === 0}>
              Exportar
            </button>
          </div>
        </div>

        <div className="cl-scroll">
          <table className="cl-tabla">
            <thead>
              <tr>
                {COLUMNAS.map((c) => {
                  const activa = c.k && orden?.k === c.k;
                  return (
                    <th key={c.t} aria-sort={activa ? (orden?.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {c.k ? (
                        <button type="button" className={`cl-th ${activa ? 'cl-th-on' : ''}`} onClick={() => ordenarPor(c.k!)}>
                          {c.t}
                          <span aria-hidden>{activa ? (orden?.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      ) : (
                        c.t
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={COLUMNAS.length} className="cl-vacio">
                    {filas.length > 0
                      ? 'No hay resultados para tu búsqueda.'
                      : 'Aún no hay socios. Crea el primero con “Nuevo socio”.'}
                  </td>
                </tr>
              )}
              {paginados.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cl-socio">
                      <span className="cl-avatar">{iniciales(c.nombre)}</span>
                      <div>
                        <b>{c.nombre}</b>
                        <small>{c.telefono ? `${c.id} · ${c.telefono}` : c.id}</small>
                        {fmtDesde(c.creadoEn) && <small className="cl-desde">Socio desde {fmtDesde(c.creadoEn)}</small>}
                      </div>
                    </div>
                  </td>
                  <td>{c.cedula}</td>
                  <td>{c.piezas}</td>
                  <td>{fmtGramos.format(c.gramos)} g</td>
                  <td>
                    <span className={`cl-badge cl-${c.estado}`}>
                      <i />
                      {ESTADO_CLIENTE_TEXTO[c.estado]}
                    </span>
                  </td>
                  <td>
                    <div className="cl-acciones">
                      {c.telefono && (
                        <a
                          className="cl-ico cl-ico-wa"
                          href={`https://wa.me/${numeroWhatsapp(c.telefono)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Escribir por WhatsApp"
                          aria-label={`Escribir por WhatsApp a ${c.nombre}`}
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.2-5.4A8.4 8.4 0 1 1 21 11.5Z" />
                            <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.4-2-1-.9.7a3.5 3.5 0 0 1-1.7-1.7l.7-.9-1-2L9 9.5Z" />
                          </svg>
                        </a>
                      )}
                      <button
                        type="button"
                        className="cl-ico cl-ico-editar"
                        title="Editar"
                        aria-label={`Editar a ${c.nombre}`}
                        onClick={() => setPopup({ tipo: 'editar', c })}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="cl-ico cl-ico-borrar"
                        title="Eliminar"
                        aria-label={`Eliminar a ${c.nombre}`}
                        onClick={() => setPopup({ tipo: 'eliminar', c })}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Móvil: tarjetas */}
        <div className="cl-cards">
          {paginados.length === 0 && (
            <p className="cl-vacio">
              {filas.length > 0 ? 'No hay resultados para tu búsqueda.' : 'Aún no hay socios. Crea el primero con “Nuevo socio”.'}
            </p>
          )}
          {paginados.map((c) => (
            <article key={c.id} className="cl-card">
              <header className="cl-card-cab">
                <span className="cl-avatar">{iniciales(c.nombre)}</span>
                <div className="cl-card-nom">
                  <b>{c.nombre}</b>
                  <small>{c.id}</small>
                </div>
                <span className={`cl-badge cl-${c.estado}`}>
                  <i />
                  {ESTADO_CLIENTE_TEXTO[c.estado]}
                </span>
              </header>

              <dl className="cl-card-datos">
                <div>
                  <dt>Cédula</dt>
                  <dd>{c.cedula}</dd>
                </div>
                <div>
                  <dt>Piezas</dt>
                  <dd>{c.piezas}</dd>
                </div>
                <div>
                  <dt>Gramos</dt>
                  <dd>{fmtGramos.format(c.gramos)} g</dd>
                </div>
              </dl>

              <footer className="cl-card-pie">
                <p className="cl-card-meta">
                  {c.telefono && <span>{c.telefono}</span>}
                  {fmtDesde(c.creadoEn) && <span>Socio desde {fmtDesde(c.creadoEn)}</span>}
                </p>
                <div className="cl-card-acc">
                  {c.telefono && (
                    <a
                      className="cl-card-btn cl-card-wa"
                      href={`https://wa.me/${numeroWhatsapp(c.telefono)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Escribir por WhatsApp"
                      aria-label={`Escribir por WhatsApp a ${c.nombre}`}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.2-5.4A8.4 8.4 0 1 1 21 11.5Z" />
                        <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.4-2-1-.9.7a3.5 3.5 0 0 1-1.7-1.7l.7-.9-1-2L9 9.5Z" />
                      </svg>
                    </a>
                  )}
                  <button
                    type="button"
                    className="cl-card-btn cl-card-ed"
                    title="Editar"
                    aria-label={`Editar a ${c.nombre}`}
                    onClick={() => setPopup({ tipo: 'editar', c })}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="cl-card-btn cl-card-del"
                    title="Eliminar"
                    aria-label={`Eliminar a ${c.nombre}`}
                    onClick={() => setPopup({ tipo: 'eliminar', c })}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>

        {ordenados.length > 0 && (
          <div className="cl-pag">
            <label className="cl-pag-sel">
              Filas
              <select
                value={porPagina}
                onChange={(e) => {
                  setPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
              >
                {POR_PAGINA.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="cl-pag-info">
              {desde + 1}–{desde + paginados.length} de {ordenados.length}
            </span>
            <div className="cl-pag-btns">
              <button type="button" onClick={() => setPagina(1)} disabled={paginaActual === 1} aria-label="Primera página">
                «
              </button>
              <button type="button" onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 1} aria-label="Página anterior">
                ‹
              </button>
              <span className="cl-pag-n">
                {paginaActual} / {totalPaginas}
              </span>
              <button type="button" onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} aria-label="Página siguiente">
                ›
              </button>
              <button type="button" onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas} aria-label="Última página">
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {popup?.tipo === 'nuevo' && <FormularioCliente onCerrar={() => setPopup(null)} onGuardado={cerrarYRefrescar} />}
      {popup?.tipo === 'editar' && (
        <FormularioCliente inicial={popup.c} onCerrar={() => setPopup(null)} onGuardado={cerrarYRefrescar} />
      )}
      {popup?.tipo === 'eliminar' && (
        <ConfirmarEliminar c={popup.c} onCerrar={() => setPopup(null)} onEliminado={cerrarYRefrescar} />
      )}
    </div>
  );
}

/* ───────── Estilos (autocontenidos, prefijo cl-) ───────── */
const CSS = `
.cl-pagina,.cl-pagina *,.cl-fondo,.cl-fondo *{box-sizing:border-box}
.cl-pagina{display:flex;flex-direction:column;gap:20px;padding:26px 26px 48px;width:100%;max-width:1400px;margin:0 auto}
.cl-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.cl-cab h1{margin:0;font-family:var(--font-playfair),serif;font-size:2rem;font-weight:500;color:#12372e}
.cl-cab p{margin:4px 0 0;color:#5d6f68;font-size:.9rem}

.cl-btn-oro{padding:12px 22px;border:0;border-radius:999px;cursor:pointer;font:inherit;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#12372e;background:linear-gradient(180deg,#d9b95a,#b8923a);box-shadow:0 4px 12px rgba(184,146,58,.35)}
.cl-btn-oro:disabled{opacity:.6;cursor:default}
.cl-btn-ghost{padding:11px 20px;border-radius:999px;cursor:pointer;font:inherit;font-weight:600;background:transparent;border:1px solid #d5dfda;color:#12372e}
.cl-btn-rojo{padding:11px 20px;border:0;border-radius:999px;cursor:pointer;font:inherit;font-weight:600;background:#b3372f;color:#fff}
.cl-btn-rojo:disabled{opacity:.6}
.cl-btn-linea{padding:8px 18px;border-radius:999px;cursor:pointer;font:inherit;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:transparent;border:1px solid #e2d3a4;color:#b8923a}
.cl-btn-linea:disabled{opacity:.5;cursor:default}

.cl-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.cl-kpis article{background:#fbf8f0;border:1px solid #ece4cd;border-radius:16px;padding:16px 20px}
.cl-kpis small{display:block;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#6c7d76}
.cl-kpis b{display:block;margin-top:6px;font-size:1.5rem;color:#12372e}

.cl-tarjeta{background:#fbf8f0;border:1px solid #ece4cd;border-radius:20px;box-shadow:0 8px 24px rgba(18,55,46,.06);overflow:hidden}
.cl-barra{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 16px}
.cl-buscar,.cl-filtro{padding:10px 16px;border-radius:999px;border:1px solid #e6dfc9;background:#f1ece0;font:inherit;font-size:.88rem;outline:none;color:#12372e}
.cl-buscar{flex:1 1 220px;max-width:340px}
.cl-buscar:focus,.cl-filtro:focus{border-color:#12372e}
.cl-der{margin-left:auto;display:flex;align-items:center;gap:12px}
.cl-conteo{font-size:.8rem;color:#6c7d76}

.cl-scroll{overflow-x:auto}
.cl-cards,.cl-orden-movil{display:none}
.cl-card{background:#fff;border:1px solid #ece4cd;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px}
.cl-card-cab{display:flex;align-items:center;gap:12px}
.cl-card-nom{flex:1;min-width:0}
.cl-card-nom b{display:block;font-size:.98rem;color:#12372e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cl-card-nom small{display:block;margin-top:2px;font-family:ui-monospace,monospace;font-size:.72rem;color:#6c7d76}
.cl-card-datos{margin:0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px;border-radius:12px;background:#f7f2e4}
.cl-card-datos dt{font-size:.64rem;letter-spacing:.08em;text-transform:uppercase;color:#6c7d76}
.cl-card-datos dd{margin:3px 0 0;font-weight:700;font-size:.92rem;color:#12372e;overflow-wrap:anywhere}
.cl-card-meta{margin:0;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.78rem;color:#6c7d76}
.cl-card-acc{display:flex;gap:8px}
.cl-card-btn{flex:1;min-height:42px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;border:1px solid #e2d3a4;background:#fff;color:#12372e;font:inherit;font-size:.82rem;font-weight:600;text-decoration:none;cursor:pointer}
.cl-card-wa{border-color:#bfe3cc;color:#1d6b43;background:#eef8f1}
.cl-card-del{border-color:#efc9c5;color:#a3342c;background:#fdf1f0}
.cl-card-ed{border-color:#e6d49a;color:#b8923a;background:#fbf5e1}
.cl-card-pie{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:12px;border-top:1px solid #f0e9d6}
.cl-card-meta{flex-direction:column;gap:2px !important;min-width:0}
.cl-card-acc{flex:0 0 auto}
.cl-card-btn{flex:0 0 auto;width:42px;height:42px;min-height:0;padding:0;border-radius:50%;transition:transform .12s}
.cl-card-btn:active{transform:scale(.92)}
.cl-tabla{width:100%;border-collapse:collapse;min-width:720px}
.cl-tabla th{text-align:left;padding:13px 16px;background:#f1ece0;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:#6c7d76}
.cl-tabla td{padding:14px 16px;border-top:1px solid #efe8d6;font-size:.92rem;color:#12372e}
.cl-vacio{text-align:center;color:#8a9a94 !important;padding:44px 16px !important}

.cl-socio{display:flex;align-items:center;gap:12px}
.cl-socio b{display:block;font-size:.92rem}
.cl-socio small{display:block;margin-top:2px;font-family:ui-monospace,monospace;font-size:.72rem;color:#6c7d76}
.cl-avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;font-weight:700;font-size:.8rem;color:#12372e;background:linear-gradient(180deg,#e6cf84,#c9a64a)}

.cl-badge{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;font-size:.75rem;font-weight:600}
.cl-badge i{width:7px;height:7px;border-radius:50%;background:currentColor}
.cl-activo{background:#e1f1e7;color:#1d6b43}
.cl-inactivo{background:#e8ecef;color:#4f5d68}
.cl-suspendido{background:#f8e3e1;color:#a3342c}

.cl-acciones{display:flex;gap:6px;align-items:center}
.cl-ico-wa{color:#1d8f4e;text-decoration:none}
.cl-desde{font-family:inherit !important;font-size:.7rem !important;color:#8a9a94 !important}
.cl-kpis em{display:block;margin-top:2px;font-style:normal;font-size:.78rem;color:#1d6b43}
.cl-kpis article{display:flex;align-items:center;gap:14px;background:linear-gradient(160deg,#fffdf6,#f6efd9);border-color:#ebdfb8;box-shadow:0 6px 16px rgba(18,55,46,.05)}
.cl-kpi-ico{width:46px;height:46px;flex:0 0 auto;display:grid;place-items:center;border-radius:14px;color:#12372e;background:linear-gradient(180deg,#e8d38a,#c9a64a);box-shadow:0 4px 10px rgba(184,146,58,.3)}
.cl-kpi-txt{min-width:0}
.cl-kpis .cl-kpi-dest{background:linear-gradient(160deg,#164a3d,#0d2b24);border-color:#0d2b24;box-shadow:0 8px 20px rgba(13,43,36,.28)}
.cl-kpi-dest small{color:#d9c88f !important}
.cl-kpi-dest b{color:#f3e2a6 !important}
.cl-kpi-dest .cl-kpi-ico{background:linear-gradient(180deg,#f0dc94,#cfab4c)}
.cl-th{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:#6c7d76}
.cl-th span{font-size:.8rem;opacity:.45}
.cl-th-on{color:#12372e;font-weight:700}
.cl-th-on span{opacity:1;color:#b8923a}
.cl-th:focus-visible{outline:2px solid #b8923a;outline-offset:3px;border-radius:4px}
.cl-pag{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid #efe8d6;font-size:.82rem;color:#5d6f68}
.cl-pag-sel{display:flex;align-items:center;gap:8px}
.cl-pag-sel select{padding:5px 10px;border-radius:8px;border:1px solid #e6dfc9;background:#f1ece0;font:inherit;color:#12372e}
.cl-pag-info{margin-left:auto}
.cl-pag-btns{display:flex;align-items:center;gap:6px}
.cl-pag-btns button{width:32px;height:32px;border-radius:50%;border:1px solid #e6dfc9;background:#fff;cursor:pointer;font-size:1rem;line-height:1;color:#12372e}
.cl-pag-btns button:hover:not(:disabled){background:#f1ece0}
.cl-pag-btns button:disabled{opacity:.35;cursor:default}
.cl-pag-n{min-width:52px;text-align:center;font-weight:600;color:#12372e}
.cl-ico{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:10px;background:transparent;cursor:pointer}
.cl-ico-editar{color:#b8923a}
.cl-ico-borrar{color:#b3372f}
.cl-ico:hover{background:#f1ece0}

.cl-fondo{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:rgba(10,35,29,.55);backdrop-filter:blur(2px)}
.cl-caja{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:#fffdf8;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.3)}
.cl-caja-cab{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #efe8d6}
.cl-caja-cab h2{margin:0;font-family:var(--font-playfair),serif;font-size:1.3rem;font-weight:500;color:#12372e}
.cl-x{width:34px;height:34px;border:0;border-radius:50%;background:transparent;font-size:1.5rem;line-height:1;cursor:pointer;color:#6c7d76}
.cl-x:hover{background:#f1ece0}

.cl-form{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px 22px}
.cl-ancho{grid-column:1/-1}
.cl-caja .cl-campo{display:flex;flex-direction:column;gap:6px;margin:0}
.cl-caja .cl-campo span{display:block;font-size:.75rem;font-weight:600;letter-spacing:.04em;color:#4f6159}
.cl-caja .cl-campo input,.cl-caja .cl-campo select{width:100%;padding:11px 14px;border-radius:12px;border:1px solid #ddd5bd;background:#fff;font:inherit;font-size:.92rem;outline:none;color:#12372e}
.cl-caja .cl-campo input:focus,.cl-caja .cl-campo select:focus{border-color:#12372e}
.cl-campo em{font-style:normal;font-size:.76rem;color:#b3372f}
.cl-texto{margin:0;padding:20px 22px;color:#35493f;line-height:1.5}
.cl-error{margin:0 22px 8px;padding:10px 14px;border-radius:10px;background:#f8e3e1;color:#a3342c;font-size:.85rem}
.cl-pie{display:flex;justify-content:flex-end;gap:10px;padding:14px 22px 20px}

@media (max-width:768px){
  .cl-scroll{display:none}
  .cl-cards{display:flex;flex-direction:column;gap:12px;padding:0 12px 12px}
  .cl-cards .cl-vacio{padding:32px 8px !important}
  .cl-orden-movil{display:block}
  .cl-barra{padding:12px}
  .cl-buscar{flex:1 1 100%;max-width:none}
  .cl-filtro{flex:1 1 0;min-width:0}
  .cl-der{flex:1 1 100%;margin-left:0;justify-content:space-between}
  .cl-cab .cl-btn-oro{width:100%;min-height:46px}
  .cl-kpis{grid-template-columns:repeat(3,1fr);gap:8px}
  .cl-kpis article{flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:14px 8px;border-radius:16px}
  .cl-kpi-txt{width:100%;text-align:center}
  .cl-kpi-ico{width:34px;height:34px;border-radius:11px}
  .cl-kpi-ico svg{width:18px;height:18px}
  .cl-kpis small{font-size:.58rem;letter-spacing:.05em;line-height:1.25}
  .cl-kpis b{font-size:1.2rem;margin-top:4px}
  .cl-kpis em{font-size:.66rem}
  .cl-pag{justify-content:space-between;gap:10px}
  .cl-pag-info{order:3;margin-left:0;width:100%;text-align:center}
  .cl-fondo{align-items:end;padding:0}
  .cl-caja{max-width:none;max-height:90vh;border-radius:20px 20px 0 0}
  .cl-pie{position:sticky;bottom:0;background:#fffdf8;border-top:1px solid #efe8d6}
  .cl-pie button{flex:1;min-height:46px}
}

@media (max-width:600px){
  .cl-pagina{padding:16px 14px 40px}
  .cl-form{grid-template-columns:1fr}
  .cl-der{margin-left:0;width:100%;justify-content:space-between}
  .cl-buscar{max-width:none}
}
`;