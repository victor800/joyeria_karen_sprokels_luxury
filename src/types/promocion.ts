// 📁 RUTA: src/types/promocion.ts
export type TipoDescuento = 'porcentaje' | 'monto';
export type EstadoPromo = 'activa' | 'programada' | 'vencida' | 'agotada' | 'pausada';

export const ESTADOS_PROMO: EstadoPromo[] = ['activa', 'programada', 'pausada', 'agotada', 'vencida'];

export const ESTADO_PROMO_TEXTO: Record<EstadoPromo, string> = {
  activa: 'Activa',
  programada: 'Programada',
  pausada: 'Pausada',
  agotada: 'Agotada',
  vencida: 'Vencida',
};

export interface Promocion {
  id: string; // PRM-XXXXXX, lo genera el servidor
  codigo: string; // cupón, en mayúsculas (VERANO20)
  nombre: string; // título de la tarjeta
  descripcion: string;
  tipo: TipoDescuento;
  valor: number; // 20 (%) o 50000 (COP)
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  usosMax: number; // 0 = ilimitado
  usos: number; // veces que se ha usado
  activa: boolean; // interruptor manual
  fotoUrl: string; // URL corta /f/xxxxxxxx
  creadoEn: string;
}

export interface PromocionInput {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: TipoDescuento;
  valor: number;
  desde: string;
  hasta: string;
  usosMax: number;
  activa: boolean;
  fotoUrl: string;
}

/** Fecha de hoy en Colombia, formato YYYY-MM-DD */
export function hoyBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

/** Estado real de la promoción según el interruptor, las fechas y los usos */
export function estadoPromo(p: Promocion, hoy: string = hoyBogota()): EstadoPromo {
  if (!p.activa) return 'pausada';
  if (hoy < p.desde) return 'programada';
  if (hoy > p.hasta) return 'vencida';
  if (p.usosMax > 0 && p.usos >= p.usosMax) return 'agotada';
  return 'activa';
}