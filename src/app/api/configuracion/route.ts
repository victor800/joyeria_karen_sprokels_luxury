// 📁 RUTA: src/app/api/configuracion/route.ts
import { NextResponse } from 'next/server';
import { leerConfig, guardarConfig, urlTienda, origenSitio } from '@/lib/configuracion';
import { autorizada } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const cfg = await leerConfig();
    return NextResponse.json({ ...cfg, url_tienda: urlTienda(origenSitio(), cfg.slug) });
  } catch (e) {
    console.error('[configuracion GET]', e);
    return NextResponse.json({ error: 'No se pudo leer la configuración' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const cuerpo = await req.json();
    const cfg = await guardarConfig(cuerpo, origenSitio());
    return NextResponse.json(cfg);
  } catch (e) {
    console.error('[configuracion PUT]', e);
    const msg = e instanceof Error ? e.message : 'No se pudo guardar';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}