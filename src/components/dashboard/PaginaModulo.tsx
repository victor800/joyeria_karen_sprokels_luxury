// src/components/dashboard/PaginaModulo.tsx  (la ruta va aquí, fuera del código)
import './modulo.css';

type Kpi = { t: string; v: string };

type Props = {
  titulo: string;
  descripcion: string;
  kpis: Kpi[];
  columnas: string[];
  accion?: string;
  vacio?: string;
};

export default function PaginaModulo({ titulo, descripcion, kpis, columnas, accion, vacio }: Props) {
  return (
    <section className="mod d-cont simple">
      <header className="mod-head">
        <div>
          <h1>{titulo}</h1>
          <p>{descripcion}</p>
        </div>
        {accion && (
          <button type="button" className="mod-btn">
            + {accion}
          </button>
        )}
      </header>

      <div className="mod-kpis">
        {kpis.map((k) => (
          <article key={k.t}>
            <small>{k.t}</small>
            <b>{k.v}</b>
          </article>
        ))}
      </div>

      <div className="mod-card">
        <div className="mod-tools">
          <input type="search" placeholder="Buscar…" aria-label="Buscar" />
        </div>
        <div className="mod-scroll">
          <table>
            <thead>
              <tr>
                {columnas.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columnas.length} className="mod-vacio">
                  {vacio ?? 'Aún no hay registros en esta sección.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}