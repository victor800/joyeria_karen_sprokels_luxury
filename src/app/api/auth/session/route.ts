// 📁 RUTA: src/app/api/auth/session/route.ts   (REEMPLAZA TODO EL ARCHIVO)
// Recibe el token de Firebase (correo/clave, Google o Apple), verifica que el correo esté en ADMIN_EMAILS
// y crea la cookie de sesión del panel. DELETE = cerrar sesión.
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, esAdminEmail } from '@/lib/auth';

export const runtime = 'nodejs';

const CINCO_DIAS = 60 * 60 * 24 * 5;

export async function POST(req: NextRequest) {
  try {
    const { idToken, recordar = true } = await req.json();
    if (!idToken) return NextResponse.json({ error: 'Falta el token.' }, { status: 400 });

    const decoded = await adminAuth.verifyIdToken(idToken, true);

    // Solo se acepta un inicio de sesión recién hecho (evita reutilizar tokens viejos)
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60)
      return NextResponse.json({ error: 'Vuelva a iniciar sesión.' }, { status: 401 });

    if (!esAdminEmail(decoded.email))
      return NextResponse.json({ error: 'Este correo no tiene acceso al panel.' }, { status: 403 });

    const cookie = await adminAuth.createSessionCookie(idToken, { expiresIn: CINCO_DIAS * 1000 });
    const res = NextResponse.json({ ok: true, redirect: '/dashboard' });
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // "Recordar credencial" desmarcado → la sesión termina al cerrar el navegador
      ...(recordar ? { maxAge: CINCO_DIAS } : {}),
    });
    return res;
  } catch (err) {
    console.error('[POST /api/auth/session]', err);
    return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  // Revoca la sesión en Firebase (cierra también otros dispositivos) y borra la cookie
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const d = await adminAuth.verifySessionCookie(token);
      await adminAuth.revokeRefreshTokens(d.sub);
    } catch { /* cookie vencida o inválida: solo se borra */ }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}