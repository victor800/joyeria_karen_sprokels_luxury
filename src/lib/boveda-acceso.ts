// 📁 RUTA: src/lib/boveda-acceso.ts
// Acceso a la bóveda: el código se valida SIEMPRE en el servidor y se guarda una cookie firmada (30 min).
import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'boveda_acceso';
export const DURACION_SEG = 30 * 60;

// BOVEDA_SECRET es opcional pero recomendado (una cadena larga y aleatoria). Si no existe, se usa el código.
const secreto = () => process.env.BOVEDA_SECRET || process.env.BOVEDA_CODIGO || '';
const firmar = (exp: string) => createHmac('sha256', secreto()).update(`boveda.${exp}`).digest('hex');

export function crearToken() {
  const exp = String(Date.now() + DURACION_SEG * 1000);
  return `${exp}.${firmar(exp)}`;
}

export function tokenValido(token?: string | null) {
  if (!token || !secreto()) return false;
  const [exp, firma] = token.split('.');
  if (!exp || !firma || !(Number(exp) > Date.now())) return false;
  const a = Buffer.from(firma);
  const b = Buffer.from(firmar(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function codigoConfigurado() {
  return Boolean(process.env.BOVEDA_CODIGO);
}

/** Comparación en tiempo constante del código ingresado con BOVEDA_CODIGO */
export function codigoCorrecto(ingresado: string) {
  const real = process.env.BOVEDA_CODIGO || '';
  if (!real) return false;
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(ingresado), h(real));
}

/**
 * true si la bóveda está abierta para esta petición.
 * TEMPORAL: mientras BOVEDA_CODIGO no esté configurada, la bóveda queda abierta sin pedir código.
 * En cuanto se configure la variable, vuelve a exigirse el código automáticamente.
 */
export async function bovedaAbierta() {
  if (!codigoConfigurado()) return true;
  return tokenValido((await cookies()).get(COOKIE)?.value);
}