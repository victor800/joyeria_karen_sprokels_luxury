// 📁 RUTA: src/lib/admin.ts
import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, esAdminEmail } from '@/lib/auth';

/**
 * true solo si hay una sesión de Firebase válida (no revocada)
 * y el correo pertenece a una administradora.
 */
export async function autorizada(_req?: Request): Promise<boolean> {
  try {
    const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!cookie) return false;
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return esAdminEmail(decoded.email);
  } catch {
    return false;
  }
}