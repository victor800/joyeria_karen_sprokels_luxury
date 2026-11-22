// 📁 RUTA: src/app/api/boveda/acceso/route.ts
import { NextResponse } from 'next/server';
import { COOKIE, DURACION_SEG, codigoConfigurado, codigoCorrecto, crearToken } from '@/lib/boveda-acceso';

export const dynamic = 'force-dynamic';

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 60_000;
const intentos = new Map<string, { n: number; hasta: number }>();

const ipDe = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';

/** Abre la bóveda: valida el código y guarda la cookie firmada */
export async function POST(req: Request) {
  // Modo temporal: sin BOVEDA_CODIGO la bóveda ya está abierta, no hay nada que validar
  if (!codigoConfigurado()) return NextResponse.json({ ok: true });

  const ip = ipDe(req);
  const ahora = Date.now();
  let reg = intentos.get(ip);
  if (reg && reg.hasta && reg.hasta <= ahora) { intentos.delete(ip); reg = undefined; }
  if (reg && reg.n >= MAX_INTENTOS) {
    const seg = Math.ceil((reg.hasta - ahora) / 1000);
    return NextResponse.json({ error: `Demasiados intentos. Espera ${seg} s` }, { status: 429 });
  }

  let codigo = '';
  try {
    const body = (await req.json()) as { codigo?: unknown };
    codigo = String(body.codigo ?? '').replace(/\D/g, '').slice(0, 12);
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  if (!codigo || !codigoCorrecto(codigo)) {
    const n = (reg?.n ?? 0) + 1;
    intentos.set(ip, { n, hasta: n >= MAX_INTENTOS ? ahora + BLOQUEO_MS : 0 });
    const quedan = MAX_INTENTOS - n;
    return NextResponse.json(
      { error: quedan > 0 ? `Código incorrecto (${quedan} intento${quedan === 1 ? '' : 's'} restante${quedan === 1 ? '' : 's'})` : 'Bóveda bloqueada 1 minuto' },
      { status: 401 },
    );
  }

  intentos.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, crearToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_SEG,
  });
  return res;
}

/** Cierra la bóveda: borra la cookie */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}