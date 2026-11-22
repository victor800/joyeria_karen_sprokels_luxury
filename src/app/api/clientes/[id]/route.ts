// 📁 RUTA: src/app/api/clientes/[id]/route.ts
import { NextResponse } from 'next/server';
import { actualizar, eliminar, CedulaDuplicada } from '@/lib/clientes-store';
import { validarCliente } from '@/lib/validar-cliente';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const r = validarCliente(await req.json().catch(() => null));
  if (!r.ok) return NextResponse.json({ errores: r.errores }, { status: 400 });

  try {
    const c = await actualizar(id, r.data);
    if (!c) return NextResponse.json({ error: 'Socio no encontrado.' }, { status: 404 });
    return NextResponse.json(c);
  } catch (e) {
    if (e instanceof CedulaDuplicada) {
      return NextResponse.json({ errores: { cedula: e.message } }, { status: 409 });
    }
    return NextResponse.json({ error: 'No se pudo actualizar el socio.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const ok = await eliminar(id);
    if (!ok) return NextResponse.json({ error: 'Socio no encontrado.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar el socio.' }, { status: 500 });
  }
}