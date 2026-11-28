// 📁 RUTA: src/lib/notificaciones.ts   (ARCHIVO NUEVO)
// Convierte el resumen del dashboard en una lista de notificaciones.
// Cada notificación tiene un id ESTABLE: mientras el id no cambie, no vuelve a sonar.
import type { obtenerResumen } from '@/lib/resumen-dashboard';
import { cop } from '@/lib/datos-dashboard';

export type Notificacion = {
  id: string;
  tipo: 'pedido' | 'domicilio' | 'stock';
  titulo: string;
  detalle: string;
  cuando: string;
  href: string;
  urgente?: boolean;
};

type Resumen = Awaited<ReturnType<typeof obtenerResumen>>;

export function construirNotificaciones(r: Resumen): Notificacion[] {
  const out: Notificacion[] = [];

  // 1) Un aviso por cada pedido NUEVO
  for (const p of r.recientes) {
    if (p.estado !== 'nuevo') continue;
    out.push({
      id: `pedido:${p.id}`,
      tipo: 'pedido',
      titulo: `Nuevo pedido ${p.codigo}`,
      detalle: `${p.cliente || 'Cliente'} · ${cop(p.total)}`,
      cuando: p.cuando,
      href: '/dashboard/hans',
      urgente: true,
    });
  }

  // 2) Domicilios sin asignar (el id incluye la cantidad: si cambia, vuelve a avisar)
  if (r.kpis.sinAsignar > 0) {
    out.push({
      id: `sin-asignar:${r.kpis.sinAsignar}`,
      tipo: 'domicilio',
      titulo: `${r.kpis.sinAsignar} ${r.kpis.sinAsignar === 1 ? 'domicilio' : 'domicilios'} sin asignar`,
      detalle: 'Asigne un domiciliario para despacharlos.',
      cuando: 'Ahora',
      href: '/dashboard/hans',
      urgente: true,
    });
  }

  // 3) Stock bajo
  if (r.kpis.stockBajo > 0) {
    out.push({
      id: `stock:${r.kpis.stockBajo}`,
      tipo: 'stock',
      titulo: `Stock bajo en ${r.kpis.stockBajo} ${r.kpis.stockBajo === 1 ? 'artículo' : 'artículos'}`,
      detalle: 'Quedan 1 o menos unidades.',
      cuando: 'Ahora',
      href: '/dashboard/prendas',
    });
  }

  return out;
}