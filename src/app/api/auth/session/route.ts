import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, esAdminEmail } from '@/lib/auth';

const CINCO_DIAS = 60 * 60 * 24 * 5;

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: 'Falta el token.' }, { status: 400 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!esAdminEmail(decoded.email))
      return NextResponse.json({ error: 'Este correo no tiene acceso al panel.' }, { status: 403 });

    const cookie = await adminAuth.createSessionCookie(idToken, { expiresIn: CINCO_DIAS * 1000 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CINCO_DIAS,
    });
    return res;
  } catch (err) {
    console.error('[POST /api/auth/session]', err);
    return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
