import { NextResponse } from 'next/server';
import { listar, crear } from '@/lib/domiciliarios-store';
import { obtenerLocales } from '@/lib/locales';
import { validarDomiciliario } from '@/lib/validar-domiciliario';

// GET /api/domiciliarios            -> todos
// GET /api/domiciliarios?localId=X  -> solo los de ese local
export async function GET(req: Request) {
  try {
    const localId = new URL(req.url).searchParams.get('localId');
    return NextResponse.json(await listar(localId));
  } catch {
    return NextResponse.json({ error: 'Error al leer Google Sheets.' }, { status: 500 });
  }
}

// POST /api/domiciliarios -> crea la fila y devuelve el registro con su ID
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  try {
    const locales = await obtenerLocales();
    const v = validarDomiciliario(body, locales.map((l) => l.id));
    if (!v.ok) return NextResponse.json({ errores: v.errores }, { status: 400 });

    return NextResponse.json(await crear(v.data), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al guardar en Google Sheets.' }, { status: 500 });
  }
}