// 📁 RUTA: src/components/dashboard/promociones/PromocionesVista.tsx
'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  ESTADOS_PROMO,
  ESTADO_PROMO_TEXTO,
  estadoPromo,
  type EstadoPromo,
  type Promocion,
  type TipoDescuento,
} from '@/types/promocion';
import { rutaFoto } from '@/lib/foto-url';
import { subirFoto } from '@/lib/subir-foto-cliente';

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
type Popup =
  | { tipo: 'nueva' }
  | { tipo: 'editar'; p: Promocion }
  | { tipo: 'eliminar'; p: Promocion }
  | { tipo: 'ver'; p: Promocion }
  | null;

type Form = {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: TipoDescuento;
  valor: string;
  desde: string;
  hasta: string;
  usosMax: string;
  activa: boolean;
  fotoUrl: string;
};

/* ───────── Utilidades ───────── */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function partes(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function fechaCorta(iso: string) {
  const { m, d } = partes(iso);
  return m && d ? `${d} ${MESES[m - 1]}` : iso;
}

function fechaLarga(iso: string) {
  const { y, m, d } = partes(iso);
  return m && d ? `${d} ${MESES[m - 1]} ${y}` : iso;
}

/** Valor y unidad del descuento: porcentaje -> "−20%"; monto -> "−1.500.000" + "COP" */
function descuento(p: Pick<Promocion, 'tipo' | 'valor'>) {
  return p.tipo === 'porcentaje'
    ? { valor: `−${p.valor}%`, unidad: '' }
    : { valor: `−${numero.format(p.valor)}`, unidad: 'COP' };
}

/** Logo que viene de la configuración (logo_url). Si falla al cargar, se oculta. */
function Logo({ src, className }: { src: string; className: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={src} alt="" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = 'none')} />
  );
}

function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function pista(p: Promocion, estado: EstadoPromo, hoy: string) {
  if (estado === 'programada') {
    const n = diasEntre(hoy, p.desde);
    return n === 1 ? 'Empieza mañana' : `Empieza en ${n} días`;
  }
  if (estado === 'activa') {
    const n = diasEntre(hoy, p.hasta);
    if (n === 0) return 'Termina hoy';
    return n === 1 ? 'Termina mañana' : `Quedan ${n} días`;
  }
  if (estado === 'vencida') return 'Terminó';
  if (estado === 'agotada') return 'Sin usos disponibles';
  return 'En pausa';
}

function sugerirCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'JKS';
  for (let i = 0; i < 4; i++) s += letras[Math.floor(Math.random() * letras.length)];
  return s;
}

const IC = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Bloquea el scroll del fondo y cierra con Escape */
function useBloqueo(onCerrar: () => void) {
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
}

/* ───────── Ventana emergente (portal) ───────── */
function Ventana({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  useBloqueo(onCerrar);

  return createPortal(
    <div className="pr-fondo" onClick={onCerrar}>
      <div className="pr-caja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="pr-caja-cab">
          <h2>{titulo}</h2>
          <button type="button" className="pr-x" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ───────── Visor de imagen (lupa) ───────── */
function Visor({ p, logo, onCerrar }: { p: Promocion; logo: string; onCerrar: () => void }) {
  useBloqueo(onCerrar);

  return createPortal(
    <div className="pr-fondo pr-visor" onClick={onCerrar} role="dialog" aria-modal="true" aria-label={`Foto de ${p.nombre}`}>
      <button type="button" className="pr-visor-x" onClick={onCerrar} aria-label="Cerrar">
        ×
      </button>
      <div className="pr-visor-marco" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pr-visor-foto" src={rutaFoto(p.fotoUrl)} alt={p.nombre} decoding="async" />
        <Logo src={logo} className="pr-visor-logo" />
      </div>
      <p onClick={(e) => e.stopPropagation()}>{p.nombre}</p>
    </div>,
    document.body,
  );
}

/* ───────── Formulario nueva / editar ───────── */
function FormularioPromo({
  inicial,
  hoy,
  onCerrar,
  onGuardado,
}: {
  inicial?: Promocion;
  hoy: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [f, setF] = useState<Form>(
    inicial
      ? {
          codigo: inicial.codigo,
          nombre: inicial.nombre,
          descripcion: inicial.descripcion,
          tipo: inicial.tipo,
          valor: String(inicial.valor),
          desde: inicial.desde,
          hasta: inicial.hasta,
          usosMax: String(inicial.usosMax),
          activa: inicial.activa,
          fotoUrl: inicial.fotoUrl,
        }
      : {
          codigo: '',
          nombre: '',
          descripcion: '',
          tipo: 'porcentaje',
          valor: '',
          desde: hoy,
          hasta: '',
          usosMax: '0',
          activa: false, // se crea inactiva: el admin la activa cuando esté lista
          fotoUrl: '',
        },
  );
  const [errores, setErrores] = useState<Partial<Record<keyof Form, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  const poner = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  async function alElegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setSubiendo(true);
    setErrores((x) => ({ ...x, fotoUrl: undefined }));
    try {
      const url = await subirFoto(archivo);
      setF((prev) => ({ ...prev, fotoUrl: url }));
    } catch (err) {
      setErrores((x) => ({ ...x, fotoUrl: err instanceof Error ? err.message : 'No se pudo subir la foto.' }));
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setErrores({});
    setErrorGeneral('');
    try {
      const res = await fetch(inicial ? `/api/promociones/${inicial.id}` : '/api/promociones', {
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
    <Ventana titulo={inicial ? 'Editar promoción' : 'Nueva promoción'} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <div className="pr-form">
          {/* Foto */}
          <div className="pr-campo pr-ancho">
            <span>Foto de la promoción</span>
            <div className="pr-foto-fila">
              <div className="pr-foto-prev">
                {f.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rutaFoto(f.fotoUrl)} alt="Vista previa" decoding="async" />
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" {...IC} aria-hidden>
                    <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01" />
                  </svg>
                )}
              </div>
              <div className="pr-foto-btns">
                <input ref={inputFoto} type="file" accept="image/*" hidden onChange={alElegirFoto} />
                <button type="button" className="pr-btn-linea" onClick={() => inputFoto.current?.click()} disabled={subiendo}>
                  {subiendo ? 'Subiendo…' : f.fotoUrl ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {f.fotoUrl && !subiendo && (
                  <button type="button" className="pr-btn-texto" onClick={() => setF((p) => ({ ...p, fotoUrl: '' }))}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
            {errores.fotoUrl && <em>{errores.fotoUrl}</em>}
          </div>

          <label className="pr-campo">
            <span>Código del cupón</span>
            <div className="pr-con-btn">
              <input
                value={f.codigo}
                onChange={(e) => setF((p) => ({ ...p, codigo: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                placeholder="VERANO20"
                maxLength={20}
                autoFocus
              />
              <button type="button" className="pr-btn-linea" onClick={() => setF((p) => ({ ...p, codigo: sugerirCodigo() }))}>
                Generar
              </button>
            </div>
            {errores.codigo && <em>{errores.codigo}</em>}
          </label>

          <label className="pr-campo">
            <span>Nombre de la promoción</span>
            <input value={f.nombre} onChange={poner('nombre')} placeholder="Ej: Festival de verano" />
            {errores.nombre && <em>{errores.nombre}</em>}
          </label>

          <label className="pr-campo pr-ancho">
            <span>Descripción (opcional)</span>
            <textarea value={f.descripcion} onChange={poner('descripcion')} rows={2} maxLength={160} placeholder="Qué incluye la oferta y a quién aplica" />
            {errores.descripcion && <em>{errores.descripcion}</em>}
          </label>

          <div className="pr-campo">
            <span>Tipo de descuento</span>
            <div className="pr-seg" role="group" aria-label="Tipo de descuento">
              <button type="button" className={f.tipo === 'porcentaje' ? 'on' : ''} onClick={() => setF((p) => ({ ...p, tipo: 'porcentaje' }))}>
                Porcentaje %
              </button>
              <button type="button" className={f.tipo === 'monto' ? 'on' : ''} onClick={() => setF((p) => ({ ...p, tipo: 'monto' }))}>
                Monto COP
              </button>
            </div>
            {errores.tipo && <em>{errores.tipo}</em>}
          </div>

          <label className="pr-campo">
            <span>{f.tipo === 'porcentaje' ? 'Descuento (%)' : 'Descuento (COP)'}</span>
            <input value={f.valor} onChange={poner('valor')} inputMode="decimal" placeholder={f.tipo === 'porcentaje' ? '20' : '50000'} />
            {errores.valor && <em>{errores.valor}</em>}
          </label>

          <label className="pr-campo">
            <span>Válida desde</span>
            <input type="date" value={f.desde} onChange={poner('desde')} />
            {errores.desde && <em>{errores.desde}</em>}
          </label>

          <label className="pr-campo">
            <span>Válida hasta</span>
            <input type="date" value={f.hasta} min={f.desde} onChange={poner('hasta')} />
            {errores.hasta && <em>{errores.hasta}</em>}
          </label>

          <label className="pr-campo">
            <span>Usos máximos (0 = ilimitado)</span>
            <input value={f.usosMax} onChange={poner('usosMax')} inputMode="numeric" />
            {errores.usosMax && <em>{errores.usosMax}</em>}
          </label>

          <label className="pr-check pr-ancho">
            <input type="checkbox" checked={f.activa} onChange={(e) => setF((p) => ({ ...p, activa: e.target.checked }))} />
            <span>Activar promoción (se podrá usar dentro de sus fechas)</span>
          </label>
          {!inicial && !f.activa && <p className="pr-nota pr-ancho">Se creará inactiva. Podrás activarla cuando esté lista desde su tarjeta.</p>}
        </div>

        {errorGeneral && <p className="pr-error">{errorGeneral}</p>}

        <div className="pr-pie">
          <button type="button" className="pr-btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="pr-btn-oro" disabled={cargando || subiendo}>
            {cargando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Crear promoción'}
          </button>
        </div>
      </form>
    </Ventana>
  );
}

/* ───────── Confirmar eliminar ───────── */
function ConfirmarEliminar({ p, onCerrar, onEliminado }: { p: Promocion; onCerrar: () => void; onEliminado: () => void }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function eliminar() {
    setCargando(true);
    setError('');
    try {
      const res = await fetch(`/api/promociones/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onEliminado();
    } catch {
      setError('No se pudo eliminar. Intenta de nuevo.');
      setCargando(false);
    }
  }

  return (
    <Ventana titulo="Eliminar promoción" onCerrar={onCerrar}>
      <p className="pr-texto">
        ¿Seguro que deseas eliminar <strong>{p.nombre}</strong> ({p.codigo})? Se borrará también su foto. Esta acción no se
        puede deshacer.
      </p>
      {error && <p className="pr-error">{error}</p>}
      <div className="pr-pie">
        <button type="button" className="pr-btn-ghost" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className="pr-btn-rojo" onClick={eliminar} disabled={cargando}>
          {cargando ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </Ventana>
  );
}

/* ───────── Tarjeta de promoción ───────── */
const Tarjeta = memo(function Tarjeta({
  p,
  hoy,
  logo,
  onEditar,
  onEliminar,
  onAlternar,
  onVer,
}: {
  p: Promocion;
  hoy: string;
  logo: string;
  onEditar: (p: Promocion) => void;
  onEliminar: (p: Promocion) => void;
  onAlternar: (p: Promocion) => void;
  onVer: (p: Promocion) => void;
}) {
  const estado = estadoPromo(p, hoy);
  const [copiado, setCopiado] = useState(false);
  const pct = p.usosMax > 0 ? Math.min(100, Math.round((p.usos / p.usosMax) * 100)) : 0;
  const d = descuento(p);
  // "Me gusta" que llegan desde la app (campo opcional `likes` de la promoción)
  const likes = (p as Promocion & { likes?: number }).likes ?? 0;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(p.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {}
  }

  return (
    <article className={`pr-card pr-e-${estado}`}>
      <div className="pr-media">
        <div className="pr-vista">
        {p.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pr-foto" src={rutaFoto(p.fotoUrl)} alt={p.nombre} loading="lazy" decoding="async" />
        ) : (
          <span className="pr-media-vacio" aria-hidden>
            <svg width="38" height="38" viewBox="0 0 24 24" {...IC}>
              <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01" />
            </svg>
          </span>
        )}

        {/* Al pasar el cursor la foto se acerca sola (efecto lupa, sin icono); al hacer clic se abre grande */}
        {p.fotoUrl && <button type="button" className="pr-zoom" onClick={() => onVer(p)} aria-label="Ver foto ampliada" />}

        {/* Logo de la marca como respaldo */}
        <Logo src={logo} className="pr-logo" />

        <span className="pr-pista">{pista(p, estado, hoy)}</span>

        <span className="pr-like" title="Me gusta desde la app" aria-label={`${likes} me gusta desde la app`}>
          <svg width="13" height="13" viewBox="0 0 24 24" {...IC} fill={likes > 0 ? 'currentColor' : 'none'} aria-hidden>
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          {likes}
        </span>
        </div>

        {/* Precio / descuento debajo de la foto, en color distinto */}
        <div className="pr-precio">
          <small>Descuento</small>
          <b>
            {d.valor}
            {d.unidad && <i>{d.unidad}</i>}
          </b>
        </div>
      </div>

      <div className="pr-cuerpo">
        <div className="pr-fila-sup">
          <button type="button" className="pr-codigo" onClick={copiar} title="Copiar código" aria-label={`Copiar código ${p.codigo}`}>
            <span>{p.codigo}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" {...IC} aria-hidden>
              {copiado ? <path d="M5 12l4 4 10-10" /> : <path d="M9 9h11v11H9zM5 15V5h10" />}
            </svg>
          </button>
          <span className={`pr-estado pr-estado-${estado}`}>
            <i />
            {ESTADO_PROMO_TEXTO[estado]}
          </span>
        </div>

        <h3 className="pr-titulo">{p.nombre}</h3>
        <div className="pr-orn" aria-hidden>
          ◆
        </div>
        <p className="pr-detalle">{p.descripcion || 'Sin descripción'}</p>

        <details className="pr-det">
          <summary>
            <svg width="14" height="14" viewBox="0 0 24 24" {...IC} aria-hidden>
              <rect x="3" y="4" width="18" height="17" rx="3" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>
              {fechaCorta(p.desde)} → {fechaCorta(p.hasta)}
            </span>
            <svg className="pr-chev" width="14" height="14" viewBox="0 0 24 24" {...IC} aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="pr-det-cuerpo">
            <div>
              <small>Desde</small>
              <b>{fechaLarga(p.desde)}</b>
            </div>
            <div>
              <small>Hasta</small>
              <b>{fechaLarga(p.hasta)}</b>
            </div>
            <div className="pr-usos">
              <div className="pr-usos-txt">
                <small>Usos</small>
                <b>
                  {p.usos}
                  <span>{p.usosMax > 0 ? ` / ${p.usosMax}` : ' · ilimitado'}</span>
                </b>
              </div>
              {p.usosMax > 0 && (
                <div className="pr-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          </div>
        </details>

        <div className="pr-pie-card">
          <button type="button" className={`pr-switch ${p.activa ? 'on' : ''}`} onClick={() => onAlternar(p)} aria-pressed={p.activa} aria-label={p.activa ? 'Pausar promoción' : 'Activar promoción'}>
            <span className="pr-switch-riel">
              <span className="pr-switch-bola" />
            </span>
            <span className="pr-switch-txt">{p.activa ? 'Activa' : 'Inactiva'}</span>
          </button>
          <div className="pr-acc">
            <button type="button" className="pr-btn-editar" onClick={() => onEditar(p)}>
              <svg width="15" height="15" viewBox="0 0 24 24" {...IC} aria-hidden>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
              </svg>
              Editar
            </button>
            <button type="button" className="pr-btn-borrar" onClick={() => onEliminar(p)} title="Eliminar" aria-label={`Eliminar ${p.nombre}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" {...IC} aria-hidden>
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

/* ───────── Vista principal ───────── */
export default function PromocionesVista({ filas, hoy, logoUrl = '' }: { filas: Promocion[]; hoy: string; logoUrl?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<'todos' | EstadoPromo>('todos');
  const [popup, setPopup] = useState<Popup>(null);
  const [aviso, setAviso] = useState('');

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter((p) => {
      if (estado !== 'todos' && estadoPromo(p, hoy) !== estado) return false;
      if (!t) return true;
      return [p.codigo, p.nombre, p.descripcion].join(' ').toLowerCase().includes(t);
    });
  }, [filas, q, estado, hoy]);

  const activas = filas.filter((p) => estadoPromo(p, hoy) === 'activa').length;
  const programadas = filas.filter((p) => estadoPromo(p, hoy) === 'programada').length;
  const usosTotales = filas.reduce((suma, p) => suma + p.usos, 0);

  const cerrarPopup = useCallback(() => setPopup(null), []);

  const cerrarYRefrescar = useCallback(() => {
    setPopup(null);
    router.refresh();
  }, [router]);

  const alternar = useCallback(
    async (p: Promocion) => {
      setAviso('');
      try {
        const res = await fetch(`/api/promociones/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...p, activa: !p.activa }),
        });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setAviso('No se pudo cambiar el estado. Intenta de nuevo.');
      }
    },
    [router],
  );

  const editar = useCallback((p: Promocion) => setPopup({ tipo: 'editar', p }), []);
  const eliminar = useCallback((p: Promocion) => setPopup({ tipo: 'eliminar', p }), []);
  const ver = useCallback((p: Promocion) => setPopup({ tipo: 'ver', p }), []);

  const kpis = [
    {
      t: 'Promociones activas',
      v: activas,
      sub: `${filas.length} en total`,
      icono: <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01" />,
    },
    {
      t: 'Cupones usados',
      v: usosTotales,
      icono: <path d="M2 9a3 3 0 0 0 0 6v3h20v-3a3 3 0 0 1 0-6V6H2zM13 6v12" />,
    },
    {
      t: 'Programadas',
      v: programadas,
      icono: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" />,
    },
  ];

  return (
    <div className="pr-pagina">
      <style>{CSS}</style>

      <div className="pr-cab">
        <div>
          <h1>Promociones y cupones</h1>
          <p>Descuentos, códigos y ofertas por temporada.</p>
        </div>
        <button type="button" className="pr-btn-oro" onClick={() => setPopup({ tipo: 'nueva' })}>
          + Nuevo cupón
        </button>
      </div>

      <div className="pr-kpis">
        {kpis.map((k, i) => (
          <article key={k.t} className={i === 0 ? 'pr-kpi-dest' : ''}>
            <span className="pr-kpi-ico">
              <svg width="22" height="22" viewBox="0 0 24 24" {...IC} aria-hidden>
                {k.icono}
              </svg>
            </span>
            <div className="pr-kpi-txt">
              <small>{k.t}</small>
              <b>{k.v}</b>
              {k.sub && <em>{k.sub}</em>}
            </div>
          </article>
        ))}
      </div>

      <div className="pr-barra-filtros">
        <input className="pr-buscar" placeholder="Buscar por código o nombre..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="pr-filtro" value={estado} onChange={(e) => setEstado(e.target.value as 'todos' | EstadoPromo)}>
          <option value="todos">Todos los estados</option>
          {ESTADOS_PROMO.map((e) => (
            <option key={e} value={e}>
              {ESTADO_PROMO_TEXTO[e]}
            </option>
          ))}
        </select>
        <span className="pr-conteo">
          {visibles.length} {visibles.length === 1 ? 'promoción' : 'promociones'}
        </span>
      </div>

      {aviso && <p className="pr-error pr-aviso">{aviso}</p>}

      {visibles.length === 0 ? (
        <div className="pr-vacio">
          <svg width="34" height="34" viewBox="0 0 24 24" {...IC} aria-hidden>
            <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01" />
          </svg>
          <p>
            {filas.length > 0
              ? 'No hay promociones que coincidan con tu búsqueda.'
              : 'Aún no hay promociones. Crea la primera con “Nuevo cupón”.'}
          </p>
        </div>
      ) : (
        <div className="pr-grid">
          {visibles.map((p) => (
            <Tarjeta key={p.id} p={p} hoy={hoy} logo={logoUrl} onEditar={editar} onEliminar={eliminar} onAlternar={alternar} onVer={ver} />
          ))}
        </div>
      )}

      {popup?.tipo === 'nueva' && <FormularioPromo hoy={hoy} onCerrar={cerrarPopup} onGuardado={cerrarYRefrescar} />}
      {popup?.tipo === 'editar' && <FormularioPromo inicial={popup.p} hoy={hoy} onCerrar={cerrarPopup} onGuardado={cerrarYRefrescar} />}
      {popup?.tipo === 'eliminar' && <ConfirmarEliminar p={popup.p} onCerrar={cerrarPopup} onEliminado={cerrarYRefrescar} />}
      {popup?.tipo === 'ver' && <Visor p={popup.p} logo={logoUrl} onCerrar={cerrarPopup} />}
    </div>
  );
}

/* ───────── Estilos (autocontenidos, prefijo pr-) ───────── */
const CSS = `
.pr-pagina,.pr-pagina *,.pr-fondo,.pr-fondo *{box-sizing:border-box}
.pr-pagina{display:flex;flex-direction:column;gap:20px;padding:26px 26px 48px;width:100%;max-width:1400px;margin:0 auto}
.pr-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.pr-cab h1{margin:0;font-family:var(--font-playfair),serif;font-size:2rem;font-weight:500;color:#12372e}
.pr-cab p{margin:4px 0 0;color:#5d6f68;font-size:.9rem}

.pr-btn-oro{padding:12px 22px;border:0;border-radius:999px;cursor:pointer;font:inherit;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#12372e;background:linear-gradient(180deg,#d9b95a,#b8923a);box-shadow:0 4px 12px rgba(184,146,58,.35)}
.pr-btn-oro:disabled{opacity:.6;cursor:default}
.pr-btn-ghost{padding:11px 20px;border-radius:999px;cursor:pointer;font:inherit;font-weight:600;background:transparent;border:1px solid #d5dfda;color:#12372e}
.pr-btn-rojo{padding:11px 20px;border:0;border-radius:999px;cursor:pointer;font:inherit;font-weight:600;background:#b3372f;color:#fff}
.pr-btn-rojo:disabled{opacity:.6}
.pr-btn-linea{padding:9px 16px;border-radius:999px;cursor:pointer;font:inherit;font-size:.78rem;font-weight:700;background:transparent;border:1px solid #e2d3a4;color:#b8923a;white-space:nowrap}
.pr-btn-linea:disabled{opacity:.5;cursor:default}
.pr-btn-texto{border:0;background:none;cursor:pointer;font:inherit;font-size:.8rem;color:#a3342c;padding:6px 4px}

/* KPIs */
.pr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.pr-kpis article{display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:16px;border:1px solid #ebdfb8;background:linear-gradient(160deg,#fffdf6,#f6efd9);box-shadow:0 6px 16px rgba(18,55,46,.05)}
.pr-kpi-ico{width:46px;height:46px;flex:0 0 auto;display:grid;place-items:center;border-radius:14px;color:#12372e;background:linear-gradient(180deg,#e8d38a,#c9a64a);box-shadow:0 4px 10px rgba(184,146,58,.3)}
.pr-kpi-txt{min-width:0}
.pr-kpis small{display:block;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#6c7d76}
.pr-kpis b{display:block;margin-top:4px;font-size:1.5rem;color:#12372e}
.pr-kpis em{display:block;margin-top:2px;font-style:normal;font-size:.78rem;color:#1d6b43}
.pr-kpis .pr-kpi-dest{background:linear-gradient(160deg,#164a3d,#0d2b24);border-color:#0d2b24;box-shadow:0 8px 20px rgba(13,43,36,.28)}
.pr-kpi-dest small{color:#d9c88f !important}
.pr-kpi-dest b{color:#f3e2a6 !important}
.pr-kpi-dest em{color:#9fd3b4 !important}

/* Filtros */
.pr-barra-filtros{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pr-buscar,.pr-filtro{padding:10px 16px;border-radius:999px;border:1px solid #e6dfc9;background:#f1ece0;font:inherit;font-size:.88rem;outline:none;color:#12372e}
.pr-buscar{flex:1 1 220px;max-width:340px}
.pr-buscar:focus,.pr-filtro:focus{border-color:#12372e}
.pr-conteo{margin-left:auto;font-size:.8rem;color:#6c7d76}

/* Rejilla de tarjetas */
.pr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(390px,1fr));gap:18px;align-items:start}

/* Tarjeta: borde dorado fino + fondo esmeralda */
.pr-card{position:relative;display:grid;grid-template-columns:36% 1fr;min-height:290px;overflow:hidden;border-radius:20px;color:#efe9d6;border:1px solid transparent;
  background:linear-gradient(160deg,#10291f,#0a1d17) padding-box,linear-gradient(140deg,rgba(240,220,148,.65),rgba(201,166,74,.14) 42%,rgba(201,166,74,.4)) border-box;
  box-shadow:0 10px 26px rgba(8,28,22,.32);transition:transform .25s ease,box-shadow .25s ease;content-visibility:auto;contain-intrinsic-size:auto 300px}
.pr-card.pr-e-vencida .pr-foto,.pr-card.pr-e-pausada .pr-foto{filter:grayscale(.55)}
@media (hover:hover){
  .pr-card:hover{transform:translateY(-3px);box-shadow:0 18px 36px rgba(8,28,22,.4),0 0 0 1px rgba(201,166,74,.25)}
  .pr-vista:hover .pr-foto{transform:scale(1.18)}
}

/* Columna de la foto: foto arriba (ocupa todo su espacio) + banda de precio abajo */
.pr-media{display:flex;flex-direction:column;min-height:100%;background:linear-gradient(160deg,#1a3b30,#0e241c);overflow:hidden}
.pr-vista{position:relative;flex:1 1 auto;min-height:220px;overflow:hidden}
.pr-foto{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s ease}

/* Toda la foto es clicable; sin cursor de lupa */
.pr-zoom{position:absolute;inset:0;z-index:1;padding:0;border:0;background:transparent;cursor:pointer}

/* Logo de marca (viene de la configuración) en la esquina de la foto */
.pr-media .pr-logo{position:absolute;top:10px;left:10px;z-index:2;width:38px;height:38px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(240,220,148,.75);box-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none;background:#0a3d2a}
.pr-media-vacio{position:absolute;inset:0;display:grid;place-items:center;color:#c9a64a;opacity:.55}

/* Banda de descuento debajo de la foto, en dorado */
.pr-precio{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:10px 8px 11px;text-align:center;color:#12372e;background:linear-gradient(135deg,#f6e7aa,#d6b550 55%,#b8923a);border-top:1px solid rgba(255,255,255,.35)}
.pr-precio small{font-size:.56rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;opacity:.72}
.pr-precio b{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;gap:2px 8px;font-family:inherit;font-variant-numeric:lining-nums tabular-nums;font-size:1.25rem;font-weight:800;letter-spacing:-.01em;line-height:1.1}
.pr-precio i{font-family:inherit;font-style:normal;font-size:.7rem;font-weight:800;letter-spacing:.12em}

.pr-pista{position:absolute;left:0;right:0;bottom:0;z-index:2;pointer-events:none;padding:24px 12px 10px;font-size:.68rem;font-weight:600;color:#f3e2a6;background:linear-gradient(180deg,transparent,rgba(5,16,12,.88))}
.pr-like{position:absolute;right:10px;bottom:8px;z-index:2;pointer-events:none;display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:.7rem;font-weight:700;color:#f2b6b0;background:rgba(8,24,19,.66);border:1px solid rgba(242,182,176,.3)}

/* Cuerpo */
.pr-cuerpo{display:flex;flex-direction:column;gap:8px;padding:15px 16px 14px;min-width:0;border-left:1px dashed rgba(201,166,74,.3)}
.pr-fila-sup{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.pr-codigo{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:8px;cursor:pointer;font-family:ui-monospace,monospace;font-size:.66rem;font-weight:700;letter-spacing:.1em;color:#e8d38a;background:rgba(201,166,74,.07);border:1px dashed rgba(201,166,74,.5)}
.pr-codigo:hover{background:rgba(201,166,74,.16);color:#f6e7aa}
.pr-estado{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:.68rem;font-weight:600;border:1px solid rgba(201,166,74,.4);background:rgba(201,166,74,.1);color:#e8d38a}
.pr-estado i{width:6px;height:6px;border-radius:50%;background:currentColor}
.pr-estado-activa{color:#8fe0b0;border-color:rgba(143,224,176,.4);background:rgba(143,224,176,.1)}
.pr-estado-activa i{animation:pr-pulso 2.2s ease-out infinite}
.pr-estado-programada{color:#9cc7f0;border-color:rgba(156,199,240,.4);background:rgba(156,199,240,.1)}
.pr-estado-agotada{color:#f0b27a;border-color:rgba(240,178,122,.4);background:rgba(240,178,122,.1)}
.pr-estado-vencida{color:#e89a94;border-color:rgba(232,154,148,.4);background:rgba(232,154,148,.1)}
.pr-estado-pausada{color:#b6bdb9;border-color:rgba(182,189,185,.35);background:rgba(182,189,185,.08)}
@keyframes pr-pulso{0%{box-shadow:0 0 0 0 rgba(143,224,176,.55)}70%,100%{box-shadow:0 0 0 6px rgba(143,224,176,0)}}

.pr-titulo{margin:2px 0 0;font-family:var(--font-playfair),serif;font-size:1.3rem;font-weight:500;line-height:1.2;color:#f6efd9}
.pr-orn{display:flex;align-items:center;gap:8px;max-width:110px;font-size:.5rem;color:#c9a64a}
.pr-orn::before,.pr-orn::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(201,166,74,.6))}
.pr-orn::after{transform:scaleX(-1)}
.pr-detalle{margin:0;font-size:.8rem;line-height:1.4;color:#a9b5ad;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

/* Colapsable: fechas y usos */
.pr-det{border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035)}
.pr-det summary{list-style:none;display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;font-size:.76rem;font-weight:600;color:#e8d38a;user-select:none}
.pr-det summary::-webkit-details-marker{display:none}
.pr-det summary span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-chev{transition:transform .2s ease;color:#8d9b93}
.pr-det[open] .pr-chev{transform:rotate(180deg)}
.pr-det-cuerpo{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:2px 12px 12px}
.pr-det-cuerpo small,.pr-usos small{display:block;font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;color:#8d9b93}
.pr-det-cuerpo>div>b{display:block;margin-top:2px;font-size:.84rem;color:#f6efd9}
.pr-usos{grid-column:1/-1;display:flex;align-items:center;gap:12px}
.pr-usos-txt{flex:0 0 auto}
.pr-usos b{display:block;margin-top:2px;font-size:.86rem;color:#e8d38a}
.pr-usos b span{font-weight:400;color:#8d9b93;font-size:.78rem}
.pr-barra{flex:1;height:6px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.pr-barra i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#c9a64a,#f0dc94)}

.pr-pie-card{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}
.pr-switch{display:inline-flex;align-items:center;gap:9px;border:0;background:none;padding:0;cursor:pointer;color:#cfd6d1;font:inherit;font-size:.76rem}
.pr-switch-riel{width:38px;height:22px;border-radius:999px;background:rgba(255,255,255,.18);position:relative;transition:background .2s}
.pr-switch-bola{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#0a1d17;transition:transform .2s}
.pr-switch.on .pr-switch-riel{background:#e2b946}
.pr-switch.on .pr-switch-bola{transform:translateX(16px)}
.pr-acc{display:flex;align-items:center;gap:8px}
.pr-btn-editar{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border:0;border-radius:10px;cursor:pointer;font:inherit;font-size:.82rem;font-weight:700;color:#12372e;background:linear-gradient(180deg,#f0cf5c,#e0b53a)}
.pr-btn-borrar{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;cursor:pointer;color:#c9d1cc;background:transparent;border:1px solid rgba(255,255,255,.14)}
.pr-btn-borrar:hover{color:#ff9d96;border-color:rgba(255,157,150,.5)}

.pr-vacio{display:flex;flex-direction:column;align-items:center;gap:10px;padding:56px 16px;border:1px dashed #d8cba0;border-radius:18px;color:#8a9a94;text-align:center}
.pr-vacio svg{color:#c9a64a}
.pr-vacio p{margin:0}

/* Ventana emergente */
.pr-fondo{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:rgba(8,28,22,.72)}
.pr-caja{width:100%;max-width:600px;max-height:92vh;overflow:auto;background:#fffdf8;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.3)}
.pr-caja-cab{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #efe8d6}
.pr-caja-cab h2{margin:0;font-family:var(--font-playfair),serif;font-size:1.3rem;font-weight:500;color:#12372e}
.pr-x{width:34px;height:34px;border:0;border-radius:50%;background:transparent;font-size:1.5rem;line-height:1;cursor:pointer;color:#6c7d76}
.pr-x:hover{background:#f1ece0}
.pr-form{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px 22px}
.pr-ancho{grid-column:1/-1}
.pr-caja .pr-campo{display:flex;flex-direction:column;gap:6px;margin:0}
.pr-caja .pr-campo>span{display:block;font-size:.75rem;font-weight:600;letter-spacing:.04em;color:#4f6159}
.pr-caja .pr-campo input,.pr-caja .pr-campo select,.pr-caja .pr-campo textarea{width:100%;padding:11px 14px;border-radius:12px;border:1px solid #ddd5bd;background:#fff;font:inherit;font-size:.92rem;outline:none;color:#12372e;resize:vertical}
.pr-caja .pr-campo input:focus,.pr-caja .pr-campo select:focus,.pr-caja .pr-campo textarea:focus{border-color:#12372e}
.pr-caja .pr-campo em{font-style:normal;font-size:.76rem;color:#b3372f}
.pr-con-btn{display:flex;gap:8px}
.pr-con-btn input{flex:1;min-width:0}
.pr-seg{display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:12px;background:#f1ece0;gap:4px}
.pr-seg button{padding:9px 6px;border:0;border-radius:9px;cursor:pointer;font:inherit;font-size:.82rem;font-weight:600;background:transparent;color:#5d6f68}
.pr-seg button.on{background:#12372e;color:#f3e2a6}
.pr-foto-fila{display:flex;align-items:center;gap:14px}
.pr-foto-prev{width:84px;height:84px;flex:0 0 auto;display:grid;place-items:center;border-radius:14px;border:1px dashed #d8cba0;background:#f7f2e4;color:#c9a64a;overflow:hidden}
.pr-foto-prev img{width:100%;height:100%;object-fit:cover}
.pr-foto-btns{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pr-check{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.88rem;color:#35493f}
.pr-check input{width:18px;height:18px;accent-color:#12372e}
.pr-nota{margin:-6px 0 0;font-size:.78rem;color:#8a7a3e}
.pr-texto{margin:0;padding:20px 22px;color:#35493f;line-height:1.5}
.pr-error{margin:0 22px 8px;padding:10px 14px;border-radius:10px;background:#f8e3e1;color:#a3342c;font-size:.85rem}
.pr-aviso{margin:0}
.pr-pie{display:flex;justify-content:flex-end;gap:10px;padding:14px 22px 20px}

/* Visor de foto */
.pr-visor{background:rgba(5,14,11,.93);cursor:zoom-out;grid-template-rows:1fr auto;gap:10px;padding:20px 16px}
.pr-visor-marco{position:relative;margin:auto;max-width:min(94vw,900px);cursor:default}
.pr-visor-foto{display:block;max-width:100%;max-height:80dvh;width:auto;height:auto;margin:0 auto;object-fit:contain;border-radius:14px;border:1px solid rgba(240,220,148,.35);box-shadow:0 20px 60px rgba(0,0,0,.6)}
.pr-visor-logo{position:absolute;right:12px;bottom:12px;width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid rgba(240,220,148,.8);box-shadow:0 3px 12px rgba(0,0,0,.55);pointer-events:none}
.pr-visor p{margin:0;text-align:center;font-family:var(--font-playfair),serif;font-size:1.1rem;color:#f3e2a6}
.pr-visor-x{position:absolute;top:14px;right:14px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(240,220,148,.4);background:rgba(8,24,19,.8);color:#f3e2a6;font-size:1.6rem;line-height:1;cursor:pointer}

@media (prefers-reduced-motion:reduce){
  .pr-card,.pr-foto,.pr-chev{transition:none !important}
  .pr-estado-activa i{animation:none}
}

@media (max-width:900px){
  .pr-grid{grid-template-columns:1fr}
}
@media (max-width:640px){
  .pr-pagina{padding:16px 14px calc(40px + env(safe-area-inset-bottom));gap:16px}
  .pr-cab{flex-direction:column;align-items:stretch;gap:12px}
  .pr-cab h1{font-size:1.6rem}
  .pr-cab .pr-btn-oro{width:100%;min-height:48px}

  /* KPIs: 3 columnas compactas */
  .pr-kpis{grid-template-columns:repeat(3,1fr);gap:8px}
  .pr-kpis article{flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:12px 6px}
  .pr-kpi-ico{width:34px;height:34px;border-radius:11px}
  .pr-kpi-ico svg{width:18px;height:18px}
  .pr-kpi-txt{width:100%}
  .pr-kpis small{font-size:.58rem;letter-spacing:.04em;line-height:1.25}
  .pr-kpis b{font-size:1.2rem}
  .pr-kpis em{font-size:.64rem}

  /* Filtros (16px evita el zoom automático de iOS) */
  .pr-buscar{flex:1 1 100%;max-width:none;font-size:16px;min-height:44px}
  .pr-filtro{flex:1 1 0;min-width:0;font-size:16px;min-height:44px}
  .pr-conteo{margin-left:0}

  /* Tarjeta apilada: foto arriba, contenido abajo */
  .pr-card{grid-template-columns:1fr;min-height:0;contain-intrinsic-size:auto 520px}
  .pr-media{min-height:0}
  .pr-vista{flex:none;height:210px;min-height:210px}
  .pr-cuerpo{padding:14px 14px 16px;border-left:0;border-top:1px dashed rgba(201,166,74,.3)}
  .pr-titulo{font-size:1.2rem}
  .pr-det summary{min-height:44px;padding:0 12px}
  .pr-pie-card{flex-wrap:wrap;gap:12px}
  .pr-acc{flex:1;justify-content:flex-end}
  .pr-btn-editar{flex:1;justify-content:center;min-height:44px}
  .pr-btn-borrar{width:44px;height:44px}
  .pr-switch{min-height:44px}
  .pr-media .pr-logo{width:42px;height:42px}
  .pr-precio{flex-direction:row;justify-content:space-between;padding:10px 16px}
  .pr-precio b{font-size:1.4rem}

  /* Ventana emergente como hoja inferior */
  .pr-fondo{align-items:end;padding:0}
  .pr-visor{align-items:center;padding:16px 10px}
  .pr-caja{max-width:none;max-height:92dvh;border-radius:20px 20px 0 0;display:flex;flex-direction:column}
  .pr-caja form{display:flex;flex-direction:column;min-height:0;flex:1}
  .pr-caja-cab{padding:14px 16px;position:sticky;top:0;background:#fffdf8;z-index:2}
  .pr-form{grid-template-columns:1fr;padding:16px;gap:14px;overflow:auto}
  .pr-caja .pr-campo input,.pr-caja .pr-campo select,.pr-caja .pr-campo textarea{font-size:16px;min-height:46px}
  .pr-caja .pr-campo textarea{min-height:76px}
  .pr-con-btn{flex-wrap:nowrap}
  .pr-seg button{min-height:42px}
  .pr-foto-prev{width:92px;height:92px}
  .pr-btn-linea{min-height:42px}
  .pr-check{min-height:44px}
  .pr-error{margin:0 16px 8px}
  .pr-pie{position:sticky;bottom:0;background:#fffdf8;border-top:1px solid #efe8d6;padding:12px 16px calc(14px + env(safe-area-inset-bottom))}
  .pr-pie button{flex:1;min-height:48px}
}
`;