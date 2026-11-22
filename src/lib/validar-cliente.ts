// 📁 RUTA: src/lib/validar-cliente.ts
import { ESTADOS_CLIENTE, type ClienteInput, type EstadoCliente } from '@/types/cliente';

export type ErroresCliente = Partial<Record<keyof ClienteInput, string>>;

export type ResultadoCliente =
  | { ok: true; data: ClienteInput }
  | { ok: false; errores: ErroresCliente };

export function validarCliente(body: unknown): ResultadoCliente {
  const b = (body ?? {}) as Record<string, unknown>;
  const errores: ErroresCliente = {};

  const nombre = typeof b.nombre === 'string' ? b.nombre.trim() : '';
  const cedula = (typeof b.cedula === 'string' ? b.cedula : String(b.cedula ?? '')).replace(/[\s.\-]/g, '');
  const telefono = (typeof b.telefono === 'string' ? b.telefono : '').replace(/[\s()\-]/g, '');
  const estado = b.estado as EstadoCliente;

  if (nombre.length < 3) errores.nombre = 'El nombre debe tener al menos 3 caracteres.';
  if (!/^\d{5,12}$/.test(cedula)) errores.cedula = 'Ingresa una cédula válida (solo números, 5 a 12 dígitos).';
  if (telefono && !/^\+?\d{7,15}$/.test(telefono)) errores.telefono = 'Teléfono inválido.';
  if (!(ESTADOS_CLIENTE as readonly string[]).includes(estado)) errores.estado = 'Estado inválido.';

  const piezas = b.piezas === undefined || b.piezas === '' ? 0 : Number(b.piezas);
  if (!Number.isInteger(piezas) || piezas < 0) errores.piezas = 'Debe ser un número entero mayor o igual a 0.';

  const gramos = b.gramos === undefined || b.gramos === '' ? 0 : Number(String(b.gramos).replace(',', '.'));
  if (!Number.isFinite(gramos) || gramos < 0) errores.gramos = 'Debe ser un número mayor o igual a 0.';

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, data: { nombre, cedula, telefono, piezas, gramos: Math.round(gramos * 100) / 100, estado } };
}