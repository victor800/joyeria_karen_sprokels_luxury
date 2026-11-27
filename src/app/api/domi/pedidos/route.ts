// 📁 RUTA: src/app/api/domi/pedidos/route.ts   (ARCHIVO NUEVO)
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_DOMI, sesionVigente, slugValido } from '@/lib/domiciliarios-web';
import { cambiarEstado, pedidosDe, type Estado } from '@/lib/pedidos-domi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const respuesta = (cuerpo: object, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });

const ESTADOS: Estado[] = ['asignado', 'en_ruta', 'entregado', 'novedad'];

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slugValido(slug)) return respuesta({ error: 'Enlace no válido.' }, 404);
  const d = await sesionVigente(req.cookies.get(SESSION_DOMI)?.value, slug!);
  if (!d) return respuesta({ error: 'Sesión vencida.' }, 401);
  try {
    return respuesta({ pedidos: await pedidosDe(d, slug!) });
  } catch (err) {
    console.error('[GET /api/domi/pedidos]', err);
    return respuesta({ error: 'No fue posible cargar los pedidos.' }, 500);
  }
}

export async function POST(req: NextRequest) {
  let b: { slug?: unknown; id?: unknown; estado?: unknown; novedad?: unknown };
  try {
    b = await req.json();
  } catch {
    return respuesta({ error: 'Solicitud no válida.' }, 400);
  }
  const slug = String(b.slug ?? '');
  const id = String(b.id ?? '');
  const estado = String(b.estado ?? '') as Estado;
  if (!slugValido(slug)) return respuesta({ error: 'Enlace no válido.' }, 404);
  if (!id || !ESTADOS.includes(estado)) return respuesta({ error: 'Solicitud no válida.' }, 400);

  const d = await sesionVigente(req.cookies.get(SESSION_DOMI)?.value, slug);
  if (!d) return respuesta({ error: 'Sesión vencida.' }, 401);

  try {
    const r = await cambiarEstado(d, slug, id, estado, String(b.novedad ?? ''));
    return r.ok ? respuesta({ ok: true }) : respuesta({ error: r.error }, r.status);
  } catch (err) {
    console.error('[POST /api/domi/pedidos]', err);
    return respuesta({ error: 'No fue posible guardar el cambio.' }, 500);
  }
}