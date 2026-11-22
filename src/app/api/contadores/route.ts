// 📁 RUTA: src/app/api/contadores/route.ts
import { NextResponse } from 'next/server';
import { leerContadores } from '@/lib/contadores';

export const dynamic = 'force-dynamic';

/** { contadores: { prendas: 4, pedidos: 2, ... } } */
export async function GET() {
  try {
    return NextResponse.json({ contadores: await leerContadores() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ contadores: {} }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}