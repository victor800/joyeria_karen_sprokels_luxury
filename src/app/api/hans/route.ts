// 📁 RUTA: src/app/api/hans/route.ts
import { NextResponse } from 'next/server';
import { listarHans, crearHans } from '@/lib/hans';
import { autorizada } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    return NextResponse.json({ items: await listarHans() });
  } catch (e) {
    console.error('[hans GET]', e);
    return NextResponse.json({ error: 'No se pudieron leer los artículos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const cuerpo = await req.json();
    return NextResponse.json(await crearHans(cuerpo), { status: 201 });
  } catch (e) {
    console.error('[hans POST]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo crear' }, { status: 400 });
  }
}