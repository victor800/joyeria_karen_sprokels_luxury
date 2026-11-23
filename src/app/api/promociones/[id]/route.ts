// 📁 RUTA: src/app/api/promociones/[id]/route.ts
import { NextResponse } from 'next/server';
import { actualizar, eliminar, CodigoDuplicado } from '@/lib/promociones-store';
import { validarPromocion } from '@/lib/validar-promocion';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const r = validarPromocion(await req.json().catch(() => null));
  if (!r.ok) return NextResponse.json({ errores: r.errores }, { status: 400 });

  try {
    const p = await actualizar(id, r.data);
    if (!p) return NextResponse.json({ error: 'Promoción no encontrada.' }, { status: 404 });
    return NextResponse.json(p);
  } catch (e) {
    if (e instanceof CodigoDuplicado) return NextResponse.json({ errores: { codigo: e.message } }, { status: 409 });
    return NextResponse.json({ error: 'No se pudo actualizar la promoción.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const ok = await eliminar(id);
    if (!ok) return NextResponse.json({ error: 'Promoción no encontrada.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar la promoción.' }, { status: 500 });
  }
}