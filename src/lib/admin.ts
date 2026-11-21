// 📁 RUTA: src/lib/admin.ts
import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, esAdminEmail } from '@/lib/auth';

export async function autorizada(_req?: Request): Promise<boolean> {
  try {
    const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!cookie) {
      console.warn(`[autorizada] No existe la cookie "${SESSION_COOKIE}"`);
      return false;
    }
    const decoded = await adminAuth.verifySessionCookie(cookie, false);
    if (!esAdminEmail(decoded.email)) {
      console.warn(`[autorizada] Correo no admin: ${decoded.email}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[autorizada] Cookie inválida:', e);
    return false;
  }
}