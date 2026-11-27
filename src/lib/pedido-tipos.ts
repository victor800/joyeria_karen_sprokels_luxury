// 📁 RUTA: src/lib/pedido-tipos.ts   (REEMPLAZA TODO EL ARCHIVO)
// Tipos compartidos entre el servidor y el panel de domiciliarios (sin dependencias de servidor).
export type Estado = 'asignado' | 'en_ruta' | 'entregado' | 'novedad';
export type Tienda = 'karen' | 'hans';

export type PedidoDomi = {
  id: string; // "karen:<n°>" o "hans:<id>" (evita choques entre las dos hojas)
  tienda: Tienda;
  cliente: string;
  telefono: string;
  direccion: string;
  barrio: string;
  total: string;
  metodoPago: string;
  notas: string;
  detalle: string; // piezas del pedido
  estado: Estado;
  novedad: string;
  fecha: string; // YYYY-MM-DD ('' si no se conoce)
};