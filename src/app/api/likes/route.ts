// 📁 RUTA: src/app/api/likes/route.ts
import { NextResponse } from 'next/server';
import { cambiarLike, esPiezaPublicada, leerLikes } from '@/lib/likes';

export const dynamic = 'force-dynamic';

const SIN_CACHE = { 'Cache-Control': 'no-store' };

/* Límite simple por IP: 30 cambios por minuto (en memoria) */
const ventana = new Map<string, { n: number; desde: number }>();
function permitido(ip: string): boolean {
  const ahora = Date.now();
  const v = ventana.get(ip);
  if (!v || ahora - v.desde > 60_000) {
    ventana.set(ip, { n: 1, desde: ahora });
    if (ventana.size > 5000) ventana.clear();
    return true;
  }
  v.n += 1;
  return v.n <= 30;
}

/** Totales de me encanta por pieza: { "prd_abc123": 12, ... } (lo consulta el panel cada pocos segundos) */
export async function GET() {
  try {
    return NextResponse.json({ likes: await leerLikes() }, { headers: SIN_CACHE });
  } catch {
    return NextResponse.json({ likes: {} }, { status: 500, headers: SIN_CACHE });
  }
}

/** Body: { id: string, accion: 'like' | 'unlike' } */
export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon';
    if (!permitido(ip)) {
      return NextResponse.json({ error: 'Demasiados intentos, espera un momento' }, { status: 429, headers: SIN_CACHE });
    }

    const body = (await req.json().catch(() => null)) as { id?: unknown; accion?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const accion = body?.accion === 'unlike' ? 'unlike' : body?.accion === 'like' ? 'like' : '';
    if (!id || id.length > 60 || !accion) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400, headers: SIN_CACHE });
    }
    if (!(await esPiezaPublicada(id))) {
      return NextResponse.json({ error: 'Pieza no disponible' }, { status: 404, headers: SIN_CACHE });
    }

    const total = await cambiarLike(id, accion === 'like' ? 1 : -1);
    return NextResponse.json({ ok: true, total }, { headers: SIN_CACHE });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500, headers: SIN_CACHE });
  }
}