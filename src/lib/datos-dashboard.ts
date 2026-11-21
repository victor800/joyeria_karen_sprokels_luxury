// 📁 RUTA: src/lib/datos-dashboard.ts
// Todo vacío hasta que conectes tu base de datos. Cada arreglo tendrá filas
// con el mismo orden de columnas que la página que lo usa.
export const cop = (n: number) => '$' + n.toLocaleString('es-CO');

export type Cel = string | { chip: string; t: 'ok' | 'warn' | 'mal' | 'info' };

/** Precio del gramo por quilataje (COP). null = sin configurar. */
export const PRECIOS_ORO: Record<'24K' | '18K' | '14K', number | null> = {
  '24K': null,
  '18K': null,
  '14K': null,
};

export const prendas: Cel[][] = [];
export const pedidos: Cel[][] = [];
export const domiciliarios: Cel[][] = [];
export const clientes: Cel[][] = [];
export const boveda: Cel[][] = [];