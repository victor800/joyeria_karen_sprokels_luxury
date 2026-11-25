// 📁 RUTA: src/app/api/hans/config/route.ts
import { NextResponse } from 'next/server';
import { leerConfigHans, guardarConfigHans } from '@/lib/hans';
import { autorizada } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validación básica de la tabla de piezas (balines, inicial, dijes)
function piezasValidas(p: unknown): boolean {
  const x = p as { tipos?: unknown; pesos?: unknown; inicial?: unknown; dijes?: unknown };
  if (!x || typeof x !== 'object') return false;
  if (!Array.isArray(x.tipos) || !Array.isArray(x.dijes)) return false;
  if (x.tipos.length > 60 || x.dijes.length > 80) return false;
  if (!x.pesos || typeof x.pesos !== 'object' || Object.keys(x.pesos as object).length > 60) return false;
  return !!x.inicial && typeof x.inicial === 'object';
}

export async function GET() {
  try {
    return NextResponse.json(await leerConfigHans(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[hans config GET]', e);
    return NextResponse.json({ error: 'No se pudo leer la configuración' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const b = await req.json();
    const oro18 = Math.round(Number(b.oro18) || 0);
    const oro24 = Math.round(Number(b.oro24) || 0);
    if (oro18 < 0 || oro24 < 0 || (!oro18 && !oro24)) {
      return NextResponse.json({ error: 'Precio de oro inválido' }, { status: 400 });
    }
    if (b.piezas !== undefined && !piezasValidas(b.piezas)) {
      return NextResponse.json({ error: 'Tabla de piezas inválida' }, { status: 400 });
    }
    const prev = await leerConfigHans();
    const cfg = {
      oro18,
      oro24,
      actualizado: new Date().toISOString(),
      piezas: b.piezas !== undefined ? b.piezas : prev.piezas,
    };
    await guardarConfigHans(cfg);
    return NextResponse.json(cfg);
  } catch (e) {
    console.error('[hans config PUT]', e);
    return NextResponse.json({ error: 'No se pudo guardar la configuración' }, { status: 500 });
  }
}