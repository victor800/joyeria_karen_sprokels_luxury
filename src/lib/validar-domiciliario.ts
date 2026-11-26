// 📁 RUTA: src/lib/validar-domiciliario.ts   (REEMPLAZA TODO EL ARCHIVO)
import {
  ESTADOS,
  VEHICULOS,
  VEHICULOS_CON_PLACA,
  type DomiciliarioInput,
  type EstadoDomiciliario,
} from '@/types/domiciliario';

export type Errores = Partial<Record<keyof DomiciliarioInput, string>>;

export type Resultado =
  | { ok: true; data: DomiciliarioInput }
  | { ok: false; errores: Errores };

// Solo se aceptan URLs cortas con la forma  [https://dominio]/f/<8 caracteres>
const PATRON_URL_FOTO = /^(https?:\/\/[^\s/]+)?\/f\/[A-Za-z0-9_-]{8}$/;

function urlFoto(v: unknown): string | null {
  const t = typeof v === 'string' ? v.trim() : '';
  if (!t) return '';
  return PATRON_URL_FOTO.test(t) ? t : null;
}

export function validarDomiciliario(body: unknown, idsLocalesValidos: string[]): Resultado {
  const b = (body ?? {}) as Record<string, unknown>;
  const errores: Errores = {};

  const nombre = typeof b.nombre === 'string' ? b.nombre.trim() : '';
  const zona = typeof b.zona === 'string' ? b.zona.trim() : '';
  const vehiculo = typeof b.vehiculo === 'string' ? b.vehiculo.trim() : '';
  const localId = typeof b.localId === 'string' ? b.localId.trim() : '';
  const estado = b.estado as EstadoDomiciliario;

  if (nombre.length < 3) errores.nombre = 'El nombre debe tener al menos 3 caracteres.';
  if (!zona) errores.zona = 'La zona es obligatoria.';
  if (!(VEHICULOS as readonly string[]).includes(vehiculo)) errores.vehiculo = 'Selecciona un vehículo válido.';
  if (!localId || !idsLocalesValidos.includes(localId)) errores.localId = 'Selecciona un local válido.';
  if (!ESTADOS.includes(estado)) errores.estado = 'Estado inválido.';

  // Teléfono: opcional; si se escribe, se guarda compacto (solo dígitos y un + inicial)
  let telefono = '';
  const telCrudo = typeof b.telefono === 'string' ? b.telefono.trim() : '';
  if (telCrudo) {
    telefono = telCrudo.replace(/[\s()-]/g, '');
    if (!/^\+?\d{7,15}$/.test(telefono)) {
      errores.telefono = 'Ingresa un teléfono válido (ej: 300 000 0000).';
      telefono = '';
    }
  }

  // Placa: obligatoria para moto y carro, se ignora para bicicleta / a pie
  let placa = '';
  if (VEHICULOS_CON_PLACA.includes(vehiculo)) {
    placa = (typeof b.placa === 'string' ? b.placa : '').toUpperCase().replace(/[\s-]/g, '');
    if (!/^[A-Z0-9]{5,7}$/.test(placa)) errores.placa = 'Ingresa una placa válida (ej: ABC123 o ABC12D).';
  }

  const fotoUrl = urlFoto(b.fotoUrl);
  const fotoVehiculoUrl = urlFoto(b.fotoVehiculoUrl);
  if (fotoUrl === null) errores.fotoUrl = 'Foto inválida.';
  if (fotoVehiculoUrl === null) errores.fotoVehiculoUrl = 'Foto inválida.';

  let entregasHoy: number | undefined;
  if (b.entregasHoy !== undefined && b.entregasHoy !== '') {
    entregasHoy = Number(b.entregasHoy);
    if (!Number.isInteger(entregasHoy) || entregasHoy < 0) {
      errores.entregasHoy = 'Debe ser un número entero mayor o igual a 0.';
    }
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    data: {
      nombre,
      telefono,
      zona,
      vehiculo,
      localId,
      estado,
      placa,
      fotoUrl: fotoUrl ?? '',
      fotoVehiculoUrl: fotoVehiculoUrl ?? '',
      entregasHoy,
    },
  };
}