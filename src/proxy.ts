// 📁 RUTA: src/proxy.ts   (ARCHIVO NUEVO — en Next 16 reemplaza a middleware.ts)
// Protege el panel: sin sesión válida de un correo de ADMIN_EMAILS, /dashboard y /admin mandan a /login.
// Si ya hay sesión, /login manda directo a /dashboard.
import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, esAdminEmail } from '@/lib/auth';

async function sesionValida(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    const d = await adminAuth.verifySessionCookie(token, true);
    return esAdminEmail(d.email);
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const ok = await sesionValida(req);

  const privada = ['/dashboard', '/admin'].some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (privada && !ok) {
    const url = new URL('/login', req.url);
    url.searchParams.set('volver', pathname + search);
    const res = NextResponse.redirect(url);
    if (req.cookies.has(SESSION_COOKIE)) res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  }

  if (pathname === '/login' && ok) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/admin', '/admin/:path*', '/login'],
};