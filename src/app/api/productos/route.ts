import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Lectura pública o privada según el módulo; aquí se conectará con Google Sheets.
  return NextResponse.json({ productos: [] });
}

export async function POST() {
  if (!(await getAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  return NextResponse.json({ ok: true });
}
