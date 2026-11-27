// 📁 RUTA: src/app/api/domi/logout/route.ts   (ARCHIVO NUEVO)
import { NextResponse } from 'next/server';
import { SESSION_DOMI } from '@/lib/domiciliarios-web';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(SESSION_DOMI, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}