import { NextResponse } from 'next/server';
import { obtener, actualizar, eliminar } from '@/lib/domiciliarios-store';
import { obtenerLocales } from '@/lib/locales';
import { validarDomiciliario } from '@/lib/validar-domiciliario';

type Ctx = { params: Promise<{ id: string }> };
const fallo = () => NextResponse.json({ error: 'Error con Google Sheets.' }, { status: 500 });

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const d = await obtener(id);
    if (!d) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
    return NextResponse.json(d);
  } catch {
    return fallo();
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;

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

    const d = await actualizar(id, v.data);
    if (!d) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
    return NextResponse.json(d);
  } catch {
    return fallo();
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    if (!(await eliminar(id))) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return fallo();
  }
}