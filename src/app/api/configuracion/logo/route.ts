// 📁 RUTA: src/app/api/configuracion/logo/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { autorizada } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const TIPOS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request) {
  if (!(await autorizada(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No llegó ninguna imagen' }, { status: 400 });

    const ext = TIPOS[file.type];
    if (!ext) return NextResponse.json({ error: 'Usa una imagen PNG, JPG o WEBP' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'La imagen pesa más de 2 MB' }, { status: 400 });

    const blob = await put(`logos/logo.${ext}`, file, { access: 'public', addRandomSuffix: true });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error('[logo POST]', e);
    return NextResponse.json({ error: 'No se pudo subir la imagen' }, { status: 500 });
  }
}