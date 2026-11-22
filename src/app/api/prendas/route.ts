// 📁 RUTA: src/app/api/prendas/route.ts
import { NextResponse } from 'next/server';
import { listarPrendas, crearPrenda } from '@/lib/prendas';
import { autorizada } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    return NextResponse.json(await listarPrendas());
  } catch (e) {
    console.error('[prendas GET]', e);
    return NextResponse.json({ error: 'No se pudieron leer las prendas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const cuerpo = await req.json();
    return NextResponse.json(await crearPrenda(cuerpo), { status: 201 });
  } catch (e) {
    console.error('[prendas POST]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo crear' }, { status: 400 });
  }
}