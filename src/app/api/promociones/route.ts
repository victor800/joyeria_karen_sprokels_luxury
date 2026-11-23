// 📁 RUTA: src/app/api/promociones/route.ts
import { NextResponse } from 'next/server';
import { listar, crear, CodigoDuplicado } from '@/lib/promociones-store';
import { validarPromocion } from '@/lib/validar-promocion';

export const dynamic = 'force-dynamic';

// ⚠️ Si tus rutas de /api/domiciliarios verifican la sesión del admin, copia aquí esa misma verificación.

export async function GET() {
  try {
    return NextResponse.json(await listar(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo leer la hoja de promociones.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const r = validarPromocion(await req.json().catch(() => null));
  if (!r.ok) return NextResponse.json({ errores: r.errores }, { status: 400 });

  try {
    return NextResponse.json(await crear(r.data), { status: 201 });
  } catch (e) {
    if (e instanceof CodigoDuplicado) return NextResponse.json({ errores: { codigo: e.message } }, { status: 409 });
    return NextResponse.json({ error: 'No se pudo guardar la promoción.' }, { status: 500 });
  }
}