// 📁 RUTA: src/app/api/inventario/[id]/route.ts
import { NextResponse } from 'next/server';
import { actualizarItem, eliminarItem } from '@/lib/inventario';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    if (body.nombre !== undefined && !String(body.nombre).trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    const item = await actualizarItem(id, body);
    if (!item) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const ok = await eliminarItem(id);
    if (!ok) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  }
}