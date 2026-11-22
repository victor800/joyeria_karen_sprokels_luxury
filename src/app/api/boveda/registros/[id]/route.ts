// 📁 RUTA: src/app/api/boveda/registros/[id]/route.ts
import { NextResponse } from 'next/server';
import { bovedaAbierta } from '@/lib/boveda-acceso';
import { actualizarRegistro, eliminarRegistro } from '@/lib/boveda-registros';

export const dynamic = 'force-dynamic';

const CERRADA = { error: 'La bóveda está cerrada. Vuelve a abrirla con tu código.' };
const msg = (e: unknown, d: string) => (e instanceof Error && e.message ? e.message : d);
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await bovedaAbierta())) return NextResponse.json(CERRADA, { status: 401 });
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const r = await actualizarRegistro(id, body);
    return r ? NextResponse.json(r) : NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
  } catch (e) {
    console.error('PATCH /api/boveda/registros/[id]', e);
    return NextResponse.json({ error: msg(e, 'No se pudo guardar') }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await bovedaAbierta())) return NextResponse.json(CERRADA, { status: 401 });
  try {
    const { id } = await params;
    const ok = await eliminarRegistro(id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
  } catch (e) {
    console.error('DELETE /api/boveda/registros/[id]', e);
    return NextResponse.json({ error: msg(e, 'No se pudo eliminar') }, { status: 500 });
  }
}