// 📁 RUTA: src/app/api/domi/pedidos/route.ts   (REEMPLAZA TODO EL ARCHIVO)
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_DOMI, sesionVigente, slugValido } from '@/lib/domiciliarios-web';
import { pedidosDe } from '@/lib/pedidos-domi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (cuerpo: object, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  if (!slugValido(slug)) return json({ error: 'Enlace no válido.' }, 404);

  let d;
  try {
    d = await sesionVigente(req.cookies.get(SESSION_DOMI)?.value, slug);
  } catch (err) {
    console.error('[GET /api/domi/pedidos] sesión:', err);
    return json({ error: 'No fue posible validar su sesión.' }, 500);
  }
  if (!d) return json({ error: 'Sesión vencida.' }, 401);

  try {
    return json({ ok: true, pedidos: await pedidosDe(d, slug) });
  } catch (err) {
    console.error('[GET /api/domi/pedidos]', err);
    return json({ error: 'No se pudieron cargar sus pedidos. Intente más tarde.' }, 500);
  }
}