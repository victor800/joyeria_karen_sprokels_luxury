// 📁 RUTA: src/app/api/domi/estado/route.ts   (ARCHIVO NUEVO)
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_DOMI, sesionVigente, slugValido } from '@/lib/domiciliarios-web';
import { cambiarEstado, type Estado } from '@/lib/pedidos-domi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (cuerpo: object, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });

const ESTADOS: Estado[] = ['asignado', 'en_ruta', 'entregado', 'novedad'];

export async function POST(req: NextRequest) {
  let datos: { slug?: unknown; id?: unknown; estado?: unknown; novedad?: unknown };
  try {
    datos = await req.json();
  } catch {
    return json({ error: 'Solicitud no válida.' }, 400);
  }

  const slug = String(datos.slug ?? '');
  const id = String(datos.id ?? '');
  const estado = String(datos.estado ?? '') as Estado;
  const novedad = String(datos.novedad ?? '');

  if (!slugValido(slug)) return json({ error: 'Enlace no válido.' }, 404);
  if (!id || !ESTADOS.includes(estado)) return json({ error: 'Solicitud no válida.' }, 400);

  try {
    const d = await sesionVigente(req.cookies.get(SESSION_DOMI)?.value, slug);
    if (!d) return json({ error: 'Sesión vencida.' }, 401);

    const r = await cambiarEstado(d, slug, id, estado, novedad);
    if (!r.ok) return json({ error: r.error }, r.status);
    return json({ ok: true });
  } catch (err) {
    console.error('[POST /api/domi/estado]', err);
    return json({ error: 'No se pudo actualizar el pedido. Intente de nuevo.' }, 500);
  }
}