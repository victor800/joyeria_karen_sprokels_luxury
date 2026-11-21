// 📁 RUTA: src/app/api/configuracion/route.ts
import { NextResponse } from 'next/server';
import { leerConfig, guardarConfig } from '@/lib/configuracion';

export const dynamic = 'force-dynamic';

/**
 * ⚠️ SEGURIDAD: esta ruta modifica datos de la tienda.
 * Debe validar la sesión de la administradora antes de leer o guardar.
 */
async function autorizada(_req: Request): Promise<boolean> {
  // TODO: devolver true solo si hay una sesión de administradora válida
  return process.env.NODE_ENV !== 'production';
}

export async function GET(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    return NextResponse.json(await leerConfig());
  } catch (e) {
    console.error('[configuracion GET]', e);
    return NextResponse.json({ error: 'No se pudo leer la configuración' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const cuerpo = await req.json();
    return NextResponse.json(await guardarConfig(cuerpo));
  } catch (e) {
    console.error('[configuracion PUT]', e);
    const msg = e instanceof Error ? e.message : 'No se pudo guardar';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}