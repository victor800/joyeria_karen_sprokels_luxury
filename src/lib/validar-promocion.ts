// 📁 RUTA: src/lib/validar-promocion.ts
import type { PromocionInput, TipoDescuento } from '@/types/promocion';

export type ErroresPromo = Partial<Record<keyof PromocionInput, string>>;
export type ResultadoPromo = { ok: true; data: PromocionInput } | { ok: false; errores: ErroresPromo };

// Solo URLs cortas con la forma  [https://dominio]/f/<8 caracteres>
const PATRON_URL_FOTO = /^(https?:\/\/[^\s/]+)?\/f\/[A-Za-z0-9_-]{8}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function fechaValida(v: string) {
  if (!FECHA.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function validarPromocion(body: unknown): ResultadoPromo {
  const b = (body ?? {}) as Record<string, unknown>;
  const errores: ErroresPromo = {};

  const codigo = (typeof b.codigo === 'string' ? b.codigo : '').toUpperCase().replace(/\s+/g, '');
  const nombre = typeof b.nombre === 'string' ? b.nombre.trim() : '';
  const descripcion = typeof b.descripcion === 'string' ? b.descripcion.trim() : '';
  const tipo = b.tipo as TipoDescuento;
  const desde = typeof b.desde === 'string' ? b.desde : '';
  const hasta = typeof b.hasta === 'string' ? b.hasta : '';
  const fotoUrl = typeof b.fotoUrl === 'string' ? b.fotoUrl.trim() : '';

  if (!/^[A-Z0-9_-]{3,20}$/.test(codigo)) errores.codigo = 'Usa de 3 a 20 letras, números, guion o guion bajo.';
  if (nombre.length < 3) errores.nombre = 'El nombre debe tener al menos 3 caracteres.';
  if (descripcion.length > 160) errores.descripcion = 'Máximo 160 caracteres.';
  if (tipo !== 'porcentaje' && tipo !== 'monto') errores.tipo = 'Tipo de descuento inválido.';

  const valor = Number(String(b.valor ?? '').replace(',', '.'));
  if (!Number.isFinite(valor) || valor <= 0) errores.valor = 'Ingresa un descuento mayor a 0.';
  else if (tipo === 'porcentaje' && valor > 100) errores.valor = 'El porcentaje no puede pasar de 100.';

  if (!fechaValida(desde)) errores.desde = 'Fecha de inicio inválida.';
  if (!fechaValida(hasta)) errores.hasta = 'Fecha de fin inválida.';
  else if (fechaValida(desde) && hasta < desde) errores.hasta = 'Debe ser igual o posterior al inicio.';

  const usosMax = b.usosMax === undefined || b.usosMax === '' ? 0 : Number(b.usosMax);
  if (!Number.isInteger(usosMax) || usosMax < 0) errores.usosMax = 'Número entero mayor o igual a 0 (0 = ilimitado).';

  if (fotoUrl && !PATRON_URL_FOTO.test(fotoUrl)) errores.fotoUrl = 'Foto inválida.';

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    data: {
      codigo, nombre, descripcion, tipo,
      valor: tipo === 'porcentaje' ? Math.round(valor * 100) / 100 : Math.round(valor),
      desde, hasta, usosMax,
      activa: b.activa !== false && b.activa !== 'false',
      fotoUrl,
    },
  };
}