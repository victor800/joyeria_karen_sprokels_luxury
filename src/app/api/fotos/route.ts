import { NextResponse } from 'next/server';
import { guardarFoto, imagenValida } from '@/lib/fotos-store';

// POST /api/fotos { imagen: "data:image/jpeg;base64,..." } -> { codigo, url }
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const imagen = (body as { imagen?: unknown } | null)?.imagen;
  if (!imagenValida(imagen)) {
    return NextResponse.json({ error: 'La imagen no es válida o pesa demasiado.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await guardarFoto(imagen), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar la foto en Google Sheets.' }, { status: 500 });
  }
}