// 📁 RUTA: src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

const PUBLICAS = ['/login', '/t', '/api/auth'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Rutas públicas: pasan sin revisar nada
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // 2) ...aquí sigue lo que ya tenías (redirecciones, revisar cookie, etc.)
}