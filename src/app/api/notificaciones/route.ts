// 📁 RUTA: src/app/api/notificaciones/route.ts   (ARCHIVO NUEVO)
import { NextResponse } from 'next/server';
import { obtenerResumen } from '@/lib/resumen-dashboard';
import { construirNotificaciones } from '@/lib/notificaciones';

export const dynamic = 'force-dynamic';

// ⚠️ Protéjala igual que sus otras rutas /api del panel (verificación de sesión/admin).
export async function GET() {
  try {
    const r = await obtenerResumen();
    return NextResponse.json(
      { items: construirNotificaciones(r) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}