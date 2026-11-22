// 📁 RUTA: src/app/api/inventario/precios/route.ts
// Aplica el precio del oro de hoy a todas las piezas con un solo clic.
import { NextResponse } from 'next/server';
import { aplicarPreciosOro, listarInventario, type Precios } from '@/lib/inventario';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const precios: Precios = { p24: String(b.p24 ?? ''), p18: String(b.p18 ?? ''), p14: String(b.p14 ?? ''), margen: String(b.margen ?? '0') };
    const hay = [precios.p24, precios.p18, precios.p14].some((v) => Number(v.replace(/\D/g, '')) > 0);
    if (!hay) return NextResponse.json({ error: 'Configura primero el precio del oro' }, { status: 400 });
    const r = await aplicarPreciosOro(precios);
    return NextResponse.json({ ...r, items: await listarInventario() });
  } catch {
    return NextResponse.json({ error: 'No se pudieron actualizar los precios' }, { status: 500 });
  }
}