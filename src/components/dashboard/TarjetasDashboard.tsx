// 📁 RUTA: src/components/dashboard/TarjetasDashboard.tsx   (ARCHIVO NUEVO)
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Paginador, usePaginacion } from '@/components/dashboard/Paginador';
import { descargarCSV } from '@/lib/exportar-csv';
import './extras-dashboard.css';

const ESTADO: Record<string, string> = {
  nuevo: 'Nuevo',
  recibido: 'Recibido',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

// Formato local (no importamos datos-dashboard aquí para no mezclar código de servidor en el cliente)
const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dinero = (n: number) => (n > 0 ? pesos.format(n).replace(/\s/g, '') : '$0');

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export type PedidoFila = {
  id: string | number;
  cliente?: string;
  codigo: string;
  cuando: string;
  total: number;
  estado: string;
};
export type ActividadFila = { texto: string; cuando: string };

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="d-vacio">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
        <path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6" />
      </svg>
      <p>{texto}</p>
    </div>
  );
}

export function PedidosRecientes({ pedidos }: { pedidos: PedidoFila[] }) {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');

  const filtrados = useMemo(() => {
    const t = norm(q.trim());
    return pedidos.filter(
      (p) =>
        (estado === 'todos' || p.estado === estado) &&
        (!t || norm(`${p.codigo} ${p.cliente ?? ''}`).includes(t)),
    );
  }, [pedidos, q, estado]);

  const pg = usePaginacion(filtrados, 5);
  const hayFiltro = q !== '' || estado !== 'todos';

  const exportar = () =>
    descargarCSV(
      'pedidos',
      filtrados.map((p) => ({
        Codigo: p.codigo,
        Cliente: p.cliente ?? '',
        Fecha: p.cuando,
        Total: p.total,
        Estado: ESTADO[p.estado] ?? p.estado,
      })),
    );

  return (
    <section className="d-card">
      <div className="tb-head">
        <h3>Pedidos recientes</h3>
        <button type="button" className="tb-btn" onClick={exportar} disabled={!filtrados.length} title="Descargar lo que ve en la lista (abre en Excel)">
          Exportar CSV
        </button>
      </div>

      <div className="tb-filtros">
        <input
          type="search"
          placeholder="Buscar por código o cliente"
          aria-label="Buscar pedidos"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            pg.reiniciar();
          }}
        />
        <select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            pg.reiniciar();
          }}
        >
          <option value="todos">Todos los estados</option>
          {Object.entries(ESTADO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {hayFiltro && (
          <button
            type="button"
            className="tb-chip"
            onClick={() => {
              setQ('');
              setEstado('todos');
              pg.reiniciar();
            }}
          >
            Quitar filtros ×
          </button>
        )}
      </div>

      {pedidos.length === 0 ? (
        <Vacio texto="Aún no hay pedidos." />
      ) : filtrados.length === 0 ? (
        <Vacio texto="Ningún pedido coincide con la búsqueda." />
      ) : (
        <>
          <ul className="d-lista">
            {pg.items.map((p) => (
              <li key={p.id}>
                <Link href="/dashboard/hans">
                  <span className="d-l-main">
                    <b>{p.cliente || 'Cliente'}</b>
                    <small>{p.codigo} · {p.cuando}</small>
                  </span>
                  <span className="d-l-der">
                    <b>{dinero(p.total)}</b>
                    <em className={`d-est e-${p.estado}`}>{ESTADO[p.estado] ?? p.estado}</em>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Paginador p={pg} />
        </>
      )}
    </section>
  );
}

export function ActividadReciente({ actividad }: { actividad: ActividadFila[] }) {
  const [q, setQ] = useState('');

  const filtrada = useMemo(() => {
    const t = norm(q.trim());
    return t ? actividad.filter((a) => norm(a.texto).includes(t)) : actividad;
  }, [actividad, q]);

  const pg = usePaginacion(filtrada, 8);

  const exportar = () =>
    descargarCSV(
      'actividad',
      filtrada.map((a) => ({ Movimiento: a.texto, Fecha: a.cuando })),
    );

  return (
    <section className="d-card">
      <div className="tb-head">
        <h3>Actividad reciente</h3>
        <button type="button" className="tb-btn" onClick={exportar} disabled={!filtrada.length}>
          Exportar CSV
        </button>
      </div>

      <div className="tb-filtros">
        <input
          type="search"
          placeholder="Buscar en la actividad"
          aria-label="Buscar actividad"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            pg.reiniciar();
          }}
        />
      </div>

      {actividad.length === 0 ? (
        <Vacio texto="Aquí verá cada movimiento: ventas, retiros y entregas." />
      ) : filtrada.length === 0 ? (
        <Vacio texto="Ningún movimiento coincide con la búsqueda." />
      ) : (
        <>
          <ul className="d-feed">
            {pg.items.map((a, i) => (
              <li key={`${a.texto}-${i}`}>
                <span className="d-l-main"><b>{a.texto}</b></span>
                <small>{a.cuando}</small>
              </li>
            ))}
          </ul>
          <Paginador p={pg} opciones={[8, 15, 30]} />
        </>
      )}
    </section>
  );
}