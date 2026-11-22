// 📁 RUTA: src/types/cliente.ts
export const ESTADOS_CLIENTE = ['activo', 'inactivo', 'suspendido'] as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number];

export const ESTADO_CLIENTE_TEXTO: Record<EstadoCliente, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  suspendido: 'Suspendido',
};

export interface Cliente {
  id: string; // lo genera el servidor (CLI-XXXXXX)
  nombre: string;
  cedula: string;
  telefono: string;
  piezas: number; // piezas que tiene en la bóveda
  gramos: number; // gramos de oro en custodia
  estado: EstadoCliente;
  creadoEn: string;
}

export interface ClienteInput {
  nombre: string;
  cedula: string;
  telefono: string;
  piezas: number;
  gramos: number;
  estado: EstadoCliente;
}