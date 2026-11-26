// 📁 RUTA: src/types/domiciliario.ts   (REEMPLAZA TODO EL ARCHIVO)
export type EstadoDomiciliario =
  | 'creado'
  | 'disponible'
  | 'en_ruta'
  | 'en_pausa'
  | 'offline'
  | 'suspendido';

export const ESTADOS: EstadoDomiciliario[] = [
  'creado',
  'disponible',
  'en_ruta',
  'en_pausa',
  'offline',
  'suspendido',
];

export const ESTADO_TEXTO: Record<EstadoDomiciliario, string> = {
  creado: 'Creado',
  disponible: 'Disponible',
  en_ruta: 'En ruta',
  en_pausa: 'En pausa',
  offline: 'Offline',
  suspendido: 'Suspendido',
};

export const VEHICULOS = ['Moto', 'Carro', 'Bicicleta', 'A pie'] as const;
export const VEHICULOS_CON_PLACA: readonly string[] = ['Moto', 'Carro'];

export interface Local {
  id: string;
  nombre: string;
}

export interface Domiciliario {
  id: string;               // ID del domiciliario (lo genera el servidor)
  localId: string;          // ID del local (cfg.id de la configuración)
  nombre: string;
  telefono: string;         // celular / WhatsApp (solo dígitos, con + opcional al inicio)
  zona: string;
  vehiculo: string;
  placa: string;
  entregasHoy: number;
  estado: EstadoDomiciliario;
  fotoUrl: string;          // URL corta de la foto del domiciliario
  fotoVehiculoUrl: string;  // URL corta de la foto del vehículo
  creadoEn: string;
}

export interface DomiciliarioInput {
  localId: string;
  nombre: string;
  telefono: string;
  zona: string;
  vehiculo: string;
  placa: string;
  estado: EstadoDomiciliario;
  fotoUrl: string;
  fotoVehiculoUrl: string;
  entregasHoy?: number;
}