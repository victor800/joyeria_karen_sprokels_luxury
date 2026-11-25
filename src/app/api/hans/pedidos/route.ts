// 📁 RUTA: src/app/api/hans/pedidos/route.ts
import { NextResponse } from 'next/server';
import { listarPedidosHans, crearPedidoHans, actualizarPedidoHans } from '@/lib/hans';
import { autorizada } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    return NextResponse.json({ items: await listarPedidosHans() });
  } catch (e) {
    console.error('[hans pedidos GET]', e);
    return NextResponse.json({ error: 'No se pudieron leer los pedidos' }, { status: 500 });
  }
}

// Lo usa el panel (pedido manual) y, más adelante, la web de Hans con la cabecera x-hans-token.
export async function POST(req: Request) {
  const token = process.env.HANS_PEDIDOS_TOKEN;
  const desdeWeb = !!token && req.headers.get('x-hans-token') === token;
  if (!desdeWeb && !(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const cuerpo = await req.json();
    return NextResponse.json(await crearPedidoHans(cuerpo, desdeWeb), { status: 201 });
  } catch (e) {
    console.error('[hans pedidos POST]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo crear el pedido' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { id, ...cambios } = await req.json();
    if (!id) return NextResponse.json({ error: 'Falta el id del pedido' }, { status: 400 });
    return NextResponse.json(await actualizarPedidoHans(String(id), cambios));
  } catch (e) {
    console.error('[hans pedidos PATCH]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo actualizar' }, { status: 400 });
  }
}