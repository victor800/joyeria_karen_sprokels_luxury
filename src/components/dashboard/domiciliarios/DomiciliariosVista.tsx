'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ESTADOS,
  ESTADO_TEXTO,
  type Domiciliario,
  type EstadoDomiciliario,
  type Local,
} from '@/types/domiciliario';
import { rutaFoto } from '@/lib/foto-url';
import Modal from './Modal';
import ModalDomiciliario from './ModalDomiciliario';
import DomiciliariosKpis from './DomiciliariosKpis';
import { s, Estilos } from './estilos-domiciliarios';

const COLUMNAS = ['Domiciliario', 'Local', 'Zona', 'Vehículo', 'Entregas hoy', 'Estado', 'Acciones'];

type Popup =
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; d: Domiciliario }
  | { tipo: 'eliminar'; d: Domiciliario }
  | { tipo: 'foto'; url: string; titulo: string }
  | null;

/* ───────── Piezas pequeñas ───────── */
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

function Avatar({ d, onVer }: { d: Domiciliario; onVer?: () => void }) {
  const contenido = d.fotoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={rutaFoto(d.fotoUrl)} alt={d.nombre} className={s.avatarImg} loading="lazy" />
  ) : (
    <span>{iniciales(d.nombre)}</span>
  );

  if (onVer && d.fotoUrl) {
    return (
      <button type="button" className={s.avatar} onClick={onVer} aria-label={`Ver foto de ${d.nombre}`}>
        {contenido}
      </button>
    );
  }
  return <span className={s.avatar}>{contenido}</span>;
}

function Badge({ estado }: { estado: EstadoDomiciliario }) {
  return (
    <span className={`${s.badge} ${s[estado]}`}>
      <span className={s.punto} />
      {ESTADO_TEXTO[estado]}
    </span>
  );
}

function Acciones({
  d,
  onEditar,
  onEliminar,
  conTexto,
}: {
  d: Domiciliario;
  onEditar: () => void;
  onEliminar: () => void;
  conTexto?: boolean;
}) {
  const extra = conTexto ? s.btnIconoTxt : '';
  return (
    <div className={s.acciones}>
      <button
        type="button"
        className={`${s.btnIcono} ${s.icoEditar} ${extra}`}
        onClick={onEditar}
        title="Editar"
        aria-label={`Editar a ${d.nombre}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        </svg>
        {conTexto && <span>Editar</span>}
      </button>
      <button
        type="button"
        className={`${s.btnIcono} ${s.icoEliminar} ${extra}`}
        onClick={onEliminar}
        title="Eliminar"
        aria-label={`Eliminar a ${d.nombre}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
        {conTexto && <span>Eliminar</span>}
      </button>
    </div>
  );
}

function Vacio({ hayDatos }: { hayDatos: boolean }) {
  return (
    <div className={s.vacio}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a64a" strokeWidth="1.3">
        <path d="M6 3h12l4 6-10 12L2 9l4-6Z" />
        <path d="M2 9h20M9 3l-2 6 5 12M15 3l2 6-5 12" />
      </svg>
      {hayDatos ? (
        <span>No hay resultados para tu búsqueda.</span>
      ) : (
        <>
          <span>Aún no hay registros en domiciliarios.</span>
          <span>Cuando agregue el primero aparecerá aquí.</span>
        </>
      )}
    </div>
  );
}

/* ───────── Confirmación de eliminar ───────── */
function ConfirmarEliminar({
  d,
  onCerrar,
  onEliminado,
}: {
  d: Domiciliario;
  onCerrar: () => void;
  onEliminado: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function eliminar() {
    setCargando(true);
    setError('');
    try {
      const res = await fetch(`/api/domiciliarios/${d.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onEliminado();
    } catch {
      setError('No se pudo eliminar. Intenta de nuevo.');
      setCargando(false);
    }
  }

  return (
    <Modal titulo="Eliminar domiciliario" chico onCerrar={onCerrar}>
      <div className={s.modalCuerpo}>
        <p className={s.texto}>
          ¿Seguro que deseas eliminar a <strong>{d.nombre}</strong> ({d.id})? Se borrarán también sus fotos. Esta
          acción no se puede deshacer.
        </p>
        {error && <p className={s.errorCaja}>{error}</p>}
      </div>
      <div className={s.modalPie}>
        <button type="button" className={s.btnGhost} onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className={s.btnPeligro} onClick={eliminar} disabled={cargando}>
          {cargando ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </Modal>
  );
}

/* ───────── Vista principal ───────── */
export default function DomiciliariosVista({
  filas,
  locales,
}: {
  filas: Domiciliario[];
  locales: Local[];
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<'todos' | EstadoDomiciliario>('todos');
  const [popup, setPopup] = useState<Popup>(null);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  const nombres = useMemo(() => new Map(locales.map((l) => [l.id, l.nombre])), [locales]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter((d) => {
      if (estado !== 'todos' && d.estado !== estado) return false;
      if (!t) return true;
      return [d.id, d.nombre, d.zona, d.vehiculo, d.placa, d.localId, nombres.get(d.localId) ?? '']
        .join(' ')
        .toLowerCase()
        .includes(t);
    });
  }, [filas, q, estado, nombres]);

  function cerrarYRefrescar() {
    setPopup(null);
    router.refresh();
  }

  function verFoto(url: string, titulo: string) {
    setPopup({ tipo: 'foto', url, titulo });
  }

  function exportar() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lineas = [
      ['ID', 'Nombre', 'Local ID', 'Local', 'Zona', 'Vehículo', 'Placa', 'Entregas hoy', 'Estado', 'Foto', 'Foto vehículo'],
      ...visibles.map((d) => [
        d.id,
        d.nombre,
        d.localId,
        nombres.get(d.localId) ?? '',
        d.zona,
        d.vehiculo,
        d.placa,
        d.entregasHoy,
        ESTADO_TEXTO[d.estado],
        d.fotoUrl,
        d.fotoVehiculoUrl,
      ]),
    ].map((f) => f.map(esc).join(','));

    const blob = new Blob(['\uFEFF' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'domiciliarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={s.pagina}>
      <Estilos />

      <div className={s.cabecera}>
        <div>
          <h1 className={s.titulo}>Domiciliarios</h1>
          <p className={s.sub}>Equipo de entregas: zona, vehículo y estado en tiempo real.</p>
        </div>
        <button type="button" className={s.btnOro} onClick={() => setPopup({ tipo: 'nuevo' })}>
          + Nuevo domiciliario
        </button>
      </div>

      {/* Resumen del equipo (usa todos los registros, sin filtros) */}
      <DomiciliariosKpis filas={filas} />

      <div className={s.tarjeta}>
        {/* Barra de búsqueda y filtros */}
        <div className={s.barra}>
          <input
            className={`${s.campo} ${s.buscar}`}
            placeholder="Buscar en domiciliarios..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={`${s.campo} ${s.filtro}`}
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'todos' | EstadoDomiciliario)}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_TEXTO[e]}
              </option>
            ))}
          </select>

          <div className={s.barraDer}>
            <span className={s.contador}>
              {visibles.length} {visibles.length === 1 ? 'registro' : 'registros'}
            </span>
            <button type="button" className={s.btnExportar} onClick={exportar} disabled={visibles.length === 0}>
              Exportar
            </button>
          </div>
        </div>

        {/* Escritorio: tabla */}
        <div className={s.escritorio}>
          <div className={s.scroll}>
            <table className={s.tabla}>
              <thead>
                <tr>
                  {COLUMNAS.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNAS.length}>
                      <Vacio hayDatos={filas.length > 0} />
                    </td>
                  </tr>
                )}

                {visibles.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className={s.celdaNombre}>
                        <Avatar d={d} onVer={() => verFoto(d.fotoUrl, d.nombre)} />
                        <div className={s.nombreBox}>
                          <span className={s.nombre}>{d.nombre}</span>
                          <span className={s.mono}>{d.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={s.mono}>{d.localId}</span>
                      <span className={s.localNombre}>{nombres.get(d.localId) ?? ''}</span>
                    </td>
                    <td>{d.zona}</td>
                    <td>
                      <div className={s.veh}>
                        {d.fotoVehiculoUrl && (
                          <button
                            type="button"
                            className={s.miniFoto}
                            onClick={() => verFoto(d.fotoVehiculoUrl, `Vehículo de ${d.nombre}`)}
                            aria-label={`Ver foto del vehículo de ${d.nombre}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={rutaFoto(d.fotoVehiculoUrl)} alt="" loading="lazy" />
                          </button>
                        )}
                        <div>
                          <span className={s.vehTipo}>{d.vehiculo}</span>
                          {d.placa && <span className={s.placaChip}>{d.placa}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{d.entregasHoy}</td>
                    <td>
                      <Badge estado={d.estado} />
                    </td>
                    <td>
                      <Acciones
                        d={d}
                        onEditar={() => setPopup({ tipo: 'editar', d })}
                        onEliminar={() => setPopup({ tipo: 'eliminar', d })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Móvil: tarjetas desplegables */}
        <div className={s.movil}>
          {visibles.length === 0 ? (
            <Vacio hayDatos={filas.length > 0} />
          ) : (
            <ul className={s.lista}>
              {visibles.map((d) => {
                const abierto = abiertoId === d.id;
                return (
                  <li key={d.id} className={`${s.item} ${abierto ? s.itemAbierto : ''}`}>
                    <button
                      type="button"
                      className={s.itemCab}
                      aria-expanded={abierto}
                      onClick={() => setAbiertoId(abierto ? null : d.id)}
                    >
                      <Avatar d={d} />
                      <span className={s.itemTxt}>
                        <span className={s.itemNombre}>{d.nombre}</span>
                        <span className={s.itemSub}>
                          {d.vehiculo}
                          {d.placa ? ` · ${d.placa}` : ''}
                        </span>
                      </span>
                      <Badge estado={d.estado} />
                      <svg className={s.chev} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    <div className={s.panel}>
                      <div className={s.panelInt}>
                        <div className={s.panelCont}>
                          <dl className={s.detalles}>
                            <div>
                              <dt>ID</dt>
                              <dd className={s.mono}>{d.id}</dd>
                            </div>
                            <div>
                              <dt>Local</dt>
                              <dd>{nombres.get(d.localId) ?? d.localId}</dd>
                            </div>
                            <div>
                              <dt>Zona</dt>
                              <dd>{d.zona}</dd>
                            </div>
                            <div>
                              <dt>Entregas hoy</dt>
                              <dd>{d.entregasHoy}</dd>
                            </div>
                            <div>
                              <dt>Vehículo</dt>
                              <dd>{d.vehiculo}</dd>
                            </div>
                            <div>
                              <dt>Placa</dt>
                              <dd>{d.placa ? <span className={s.placaChip}>{d.placa}</span> : '—'}</dd>
                            </div>
                          </dl>

                          {(d.fotoUrl || d.fotoVehiculoUrl) && (
                            <div className={s.fotosPanel}>
                              {d.fotoUrl && (
                                <div className={s.fotoItem}>
                                  <button
                                    type="button"
                                    className={s.miniFoto}
                                    onClick={() => verFoto(d.fotoUrl, d.nombre)}
                                    aria-label={`Ver foto de ${d.nombre}`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={rutaFoto(d.fotoUrl)} alt="" loading="lazy" />
                                  </button>
                                  <span>Domiciliario</span>
                                </div>
                              )}
                              {d.fotoVehiculoUrl && (
                                <div className={s.fotoItem}>
                                  <button
                                    type="button"
                                    className={s.miniFoto}
                                    onClick={() => verFoto(d.fotoVehiculoUrl, `Vehículo de ${d.nombre}`)}
                                    aria-label={`Ver foto del vehículo de ${d.nombre}`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={rutaFoto(d.fotoVehiculoUrl)} alt="" loading="lazy" />
                                  </button>
                                  <span>Vehículo</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className={s.panelAcciones}>
                            <Acciones
                              d={d}
                              conTexto
                              onEditar={() => setPopup({ tipo: 'editar', d })}
                              onEliminar={() => setPopup({ tipo: 'eliminar', d })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {popup?.tipo === 'nuevo' && (
        <ModalDomiciliario locales={locales} onCerrar={() => setPopup(null)} onGuardado={cerrarYRefrescar} />
      )}
      {popup?.tipo === 'editar' && (
        <ModalDomiciliario
          locales={locales}
          inicial={popup.d}
          onCerrar={() => setPopup(null)}
          onGuardado={cerrarYRefrescar}
        />
      )}
      {popup?.tipo === 'eliminar' && (
        <ConfirmarEliminar d={popup.d} onCerrar={() => setPopup(null)} onEliminado={cerrarYRefrescar} />
      )}
      {popup?.tipo === 'foto' && (
        <Modal titulo={popup.titulo} chico onCerrar={() => setPopup(null)}>
          <div className={s.modalCuerpo} style={{ paddingBottom: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rutaFoto(popup.url)} alt={popup.titulo} className={s.fotoGrande} />
          </div>
        </Modal>
      )}
    </div>
  );
}