// 📁 RUTA: src/app/api/auth/salir/route.ts   (ARCHIVO NUEVO)
// Cierra la sesión del panel: revoca la sesión en Firebase, borra la cookie y redirige a /login.
// Se llama con una navegación completa (window.location.assign('/api/auth/salir')).
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const d = await adminAuth.verifySessionCookie(token);
      await adminAuth.revokeRefreshTokens(d.sub);
    } catch {
      /* cookie vencida o inválida: solo se borra */
    }
  }

  const res = NextResponse.redirect(new URL('/login', req.url));
  // Mismos atributos con los que se creó la cookie, para que el navegador la reemplace y la elimine
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}