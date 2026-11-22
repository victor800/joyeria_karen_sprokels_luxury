// 📁 RUTA: src/components/dashboard/domiciliarios/DomiciliariosKpis.tsx
import '../modulo.css';
import type { Domiciliario } from '@/types/domiciliario';

export default function DomiciliariosKpis({ filas }: { filas: Domiciliario[] }) {
  const total = filas.length;
  const disponibles = filas.filter((d) => d.estado === 'disponible').length;
  const enRuta = filas.filter((d) => d.estado === 'en_ruta').length;
  const entregasHoy = filas.reduce((suma, d) => suma + d.entregasHoy, 0);

  const kpis = [
    { t: 'Domiciliarios', v: total },
    { t: 'Disponibles', v: disponibles },
    { t: 'En ruta', v: enRuta },
    { t: 'Entregas hoy', v: entregasHoy },
  ];

  return (
    <div className="mod-kpis">
      {kpis.map((k) => (
        <article key={k.t}>
          <small>{k.t}</small>
          <b>{k.v}</b>
        </article>
      ))}
    </div>
  );
}