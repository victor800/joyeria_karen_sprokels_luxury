// 📁 RUTA: src/app/api/boveda/registros/route.ts
import { NextResponse } from 'next/server';
import { bovedaAbierta } from '@/lib/boveda-acceso';
import { crearRegistro, listarRegistros } from '@/lib/boveda-registros';

export const dynamic = 'force-dynamic';

const CERRADA = { error: 'La bóveda está cerrada. Vuelve a abrirla con tu código.' };
const msg = (e: unknown, d: string) => (e instanceof Error && e.message ? e.message : d);

export async function GET() {
  if (!(await bovedaAbierta())) return NextResponse.json(CERRADA, { status: 401 });
  try {
    return NextResponse.json({ items: await listarRegistros() });
  } catch (e) {
    console.error('GET /api/boveda/registros', e);
    return NextResponse.json({ error: msg(e, 'No se pudo leer la bóveda') }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await bovedaAbierta())) return NextResponse.json(CERRADA, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!String(body.socio ?? '').trim()) return NextResponse.json({ error: 'Escribe el nombre del socio' }, { status: 400 });
    if (!String(body.pieza ?? '').trim()) return NextResponse.json({ error: 'Escribe el nombre de la pieza' }, { status: 400 });
    return NextResponse.json(await crearRegistro(body));
  } catch (e) {
    console.error('POST /api/boveda/registros', e);
    return NextResponse.json({ error: msg(e, 'No se pudo registrar la custodia') }, { status: 500 });
  }
}