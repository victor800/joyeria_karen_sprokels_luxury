import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!(await getAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const form = await req.formData();
  const archivo = form.get('file');
  if (!(archivo instanceof File)) return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
  if (!archivo.type.startsWith('image/')) return NextResponse.json({ error: 'Solo imágenes.' }, { status: 400 });
  if (archivo.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Máximo 5 MB.' }, { status: 400 });

  const blob = await put(`joyeria/${Date.now()}-${archivo.name}`, archivo, { access: 'public' });
  return NextResponse.json({ url: blob.url });
}
