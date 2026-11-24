// 📁 RUTA: src/app/api/hans/categorias/route.ts
import { NextResponse } from 'next/server';
import { listarCategoriasHans, crearCategoriaHans } from '@/lib/hans';
import { autorizada } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    return NextResponse.json({ categorias: await listarCategoriasHans() });
  } catch (e) {
    console.error('[hans categorias GET]', e);
    return NextResponse.json({ error: 'No se pudieron leer las categorías' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { nombre } = await req.json();
    return NextResponse.json({ categorias: await crearCategoriaHans(String(nombre ?? '')) }, { status: 201 });
  } catch (e) {
    console.error('[hans categorias POST]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo crear la categoría' }, { status: 400 });
  }
}