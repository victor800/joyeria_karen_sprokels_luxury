// 📁 RUTA: src/app/api/inventario/route.ts
import { NextResponse } from 'next/server';
import { crearItem, listarInventario } from '@/lib/inventario';

export const dynamic = 'force-dynamic';

function mensaje(e: unknown, defecto: string) {
  return e instanceof Error && e.message ? e.message : defecto;
}

export async function GET() {
  try {
    return NextResponse.json({ items: await listarInventario() });
  } catch (e) {
    console.error('GET /api/inventario', e);
    return NextResponse.json({ error: mensaje(e, 'No se pudo leer el inventario') }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!String(body.nombre ?? '').trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    return NextResponse.json(await crearItem(body));
  } catch (e) {
    // Se registra el error real (Vercel → Deployments → Logs) y se devuelve al panel
    console.error('POST /api/inventario', e);
    return NextResponse.json({ error: mensaje(e, 'No se pudo crear la pieza') }, { status: 500 });
  }
}