// 📁 RUTA: src/app/api/prendas/[id]/route.ts
import { NextResponse } from 'next/server';
import { actualizarPrenda, eliminarPrenda } from '@/lib/prendas';
import { autorizada } from '@/lib/admin';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await params;
    const cuerpo = await req.json();
    return NextResponse.json(await actualizarPrenda(id, cuerpo));
  } catch (e) {
    console.error('[prendas PATCH]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo actualizar' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await params;
    await eliminarPrenda(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[prendas DELETE]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo eliminar' }, { status: 400 });
  }
}