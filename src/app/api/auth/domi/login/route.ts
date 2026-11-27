// 📁 RUTA: src/app/api/domi/login/route.ts   (ARCHIVO NUEVO)
// Inicio de sesión público de domiciliarios. Recuerda agregar '/api/domi' a APIS_PUBLICAS en src/proxy.ts.
import { NextRequest, NextResponse } from 'next/server';
import {
  DIAS_SESION,
  SESSION_DOMI,
  firmarSesion,
  limpiarFallos,
  registrarFallo,
  segundosBloqueo,
  slugValido,
  validar,
} from '@/lib/domiciliarios-web';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const respuesta = (cuerpo: object, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  let datos: { slug?: unknown; usuario?: unknown; clave?: unknown };
  try {
    datos = await req.json();
  } catch {
    return respuesta({ error: 'Solicitud no válida.' }, 400);
  }

  const slug = String(datos.slug ?? '');
  const usuario = String(datos.usuario ?? '').trim().slice(0, 80);
  const clave = String(datos.clave ?? '').trim().slice(0, 20);

  if (!slugValido(slug)) return respuesta({ error: 'Enlace no válido.' }, 404);
  if (!usuario || !clave) return respuesta({ error: 'Escriba su usuario y su clave.' }, 400);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'sin-ip';
  const espera = segundosBloqueo(ip, usuario);
  if (espera > 0) {
    return respuesta({ error: `Demasiados intentos. Intente de nuevo en ${Math.ceil(espera / 60)} min.` }, 429);
  }

  try {
    const d = await validar(usuario, clave);
    if (!d) {
      registrarFallo(ip, usuario);
      return respuesta({ error: 'Usuario o clave incorrectos.' }, 401);
    }

    limpiarFallos(usuario);
    const res = respuesta({ ok: true, nombre: d.usuario });
    res.cookies.set(SESSION_DOMI, firmarSesion(d, slug), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DIAS_SESION * 86400,
    });
    return res;
  } catch (err) {
    console.error('[POST /api/domi/login]', err);
    return respuesta({ error: 'No fue posible validar su acceso. Intente más tarde.' }, 500);
  }
}