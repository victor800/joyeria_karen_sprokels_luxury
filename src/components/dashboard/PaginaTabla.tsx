'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { Cel } from '@/lib/datos-dashboard';

export type Campo = {
  name: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'select' | 'textarea';
  opciones?: (string | { value: string; label: string })[];
  requerido?: boolean;
  placeholder?: string;
  completo?: boolean; // ocupa las 2 columnas del formulario
};

type Props = {
  titulo: string;
  sub: string;
  accion: string;
  cols: string[];
  filas: Cel[][];
  /** Si se pasan campos + onCrear, el botón abre el formulario de alta */
  campos?: Campo[];
  onCrear?: (datos: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;
  aviso?: string;
  /** Qué columna es el título, subtítulo y estado en las tarjetas del móvil */
  movil?: { titulo?: number; subtitulo?: number; estado?: number };
};

const texto = (c: Cel) => (typeof c === 'string' ? c : c.chip);
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function PaginaTabla({ titulo, sub, accion, cols, filas, campos, onCrear, aviso, movil }: Props) {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [abierta, setAbierta] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  // Columnas con rol especial (título, estado y subtítulo en móvil)
  const iT = movil?.titulo ?? 0;
  const iE = movil?.estado ?? cols.length - 1;
  const iS = movil?.subtitulo;

  // El filtro solo mira la columna de estado (no la de pago)
  const estados = useMemo(() => {
    const s = new Set<string>();
    filas.forEach((f) => {
      const c = f[iE];
      if (c && typeof c !== 'string') s.add(c.chip);
    });
    return [...s];
  }, [filas, iE]);

  const filtradas = useMemo(() => {
    const t = norm(q.trim());
    return filas.filter(
      (f) =>
        (estado === 'todos' || (f[iE] != null && texto(f[iE]) === estado)) &&
        (!t || f.some((c) => norm(texto(c)).includes(t))),
    );
  }, [filas, q, estado, iE]);

  useEffect(() => {
    if (!modal) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setModal(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [modal]);

  function exportar() {
    const esc = (s: string) => `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    const lineas = [cols, ...filtradas.map((f) => f.map(texto))].map((r) => r.map(esc).join(';'));
    const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${norm(titulo)}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!onCrear) return;
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

  const rol = (j: number) => (j === iT ? 'titulo' : j === iE ? 'estado' : j === iS ? 'subtitulo' : 'detalle');
  const hayFiltro = q.trim() !== '' || estado !== 'todos';

  return (
    <main className="d-cont simple">
      <div className="d-cab">
        <div>
          <h1>{titulo}</h1>
          <p>{sub}</p>
        </div>
        <button
          type="button"
          className="d-btn"
          onClick={() => {
            setError(null);
            setModal(true);
          }}
          disabled={!campos || !onCrear}
        >
          + {accion.toUpperCase()}
        </button>
      </div>

      {aviso && <p className="d-aviso" role="alert">{aviso}</p>}

      <div className="d-card d-tabla-wrap">
        <div className="d-barra">
          <input
            className="d-buscar"
            type="search"
            placeholder={`Buscar en ${titulo.toLowerCase()}…`}
            aria-label="Buscar"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setAbierta(null);
            }}
          />
          <select
            className="d-filtro"
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setAbierta(null);
            }}
          >
            <option value="todos">Todos los estados</option>
            {estados.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="d-conteo">
            {filtradas.length} {filtradas.length === 1 ? 'registro' : 'registros'}
          </span>
          <button type="button" className="d-btn linea d-btn-sm" onClick={exportar} disabled={filtradas.length === 0}>
            EXPORTAR
          </button>
        </div>

        <table className="d-tabla">
          <thead>
            <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={cols.length} data-rol="vacio">
                  <div className="d-vacio">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                      <path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6" />
                    </svg>
                    {hayFiltro ? (
                      <p>No hay resultados con esos filtros.</p>
                    ) : (
                      <p>Aún no hay registros en {titulo.toLowerCase()}.<br />Cuando agregue el primero aparecerá aquí.</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtradas.map((f, i) => (
                <tr
                  key={`${i}-${texto(f[0])}`}
                  data-abierta={abierta === i}
                  onClick={() => setAbierta(abierta === i ? null : i)}
                >
                  {f.map((c, j) => (
                    <td key={j} data-rol={rol(j)} data-label={cols[j]}>
                      {typeof c === 'string' ? c : <span className="chip" data-t={c.t}>{c.chip}</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && campos && (
        <div className="d-modal-fondo" onClick={() => !guardando && setModal(false)}>
          <form
            className="d-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="d-modal-t"
            onClick={(e) => e.stopPropagation()}
            onSubmit={enviar}
          >
            <h3 id="d-modal-t">{accion}</h3>
            <p className="d-modal-sub">Se guardará en la hoja de {titulo.toLowerCase()} de tu joyería.</p>

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
              <button type="button" className="d-btn linea" onClick={() => setModal(false)} disabled={guardando}>
                CANCELAR
              </button>
              <button type="submit" className="d-btn" disabled={guardando}>
                {guardando ? 'GUARDANDO…' : 'GUARDAR'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}