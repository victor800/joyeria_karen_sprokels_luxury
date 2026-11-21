// 📁 RUTA: src/components/dashboard/PaginaTabla.tsx
import type { Cel } from '@/lib/datos-dashboard';

type Props = { titulo: string; sub: string; accion: string; cols: string[]; filas: Cel[][] };

export default function PaginaTabla({ titulo, sub, accion, cols, filas }: Props) {
  return (
    <main className="d-cont simple">
      <div className="d-cab">
        <div>
          <h1>{titulo}</h1>
          <p>{sub}</p>
        </div>
        <button type="button" className="d-btn">+ {accion.toUpperCase()}</button>
      </div>

      <div className="d-card d-tabla-wrap">
        <div className="d-barra">
          <input className="d-buscar" type="search" placeholder={`Buscar en ${titulo.toLowerCase()}…`} aria-label="Buscar" />
          <select className="d-filtro" aria-label="Filtrar por estado" defaultValue="todos">
            <option value="todos">Todos los estados</option>
          </select>
          <span className="d-conteo">{filas.length} registros</span>
          <button type="button" className="d-btn linea d-btn-sm">EXPORTAR</button>
        </div>

        <table className="d-tabla">
          <thead>
            <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={cols.length}>
                  <div className="d-vacio">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                      <path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6" />
                    </svg>
                    <p>Aún no hay registros en {titulo.toLowerCase()}.<br />Cuando agregue el primero aparecerá aquí.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filas.map((f, i) => (
                <tr key={i}>
                  {f.map((c, j) => (
                    <td key={j}>
                      {typeof c === 'string' ? c : <span className="chip" data-t={c.t}>{c.chip}</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}