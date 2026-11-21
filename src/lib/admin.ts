// 📁 RUTA: src/lib/admin.ts
import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, esAdminEmail } from '@/lib/auth';

/**
 * MODO DEMO: mientras sea true, el panel no exige sesión.
 * Ponlo en false cuando conectes Firebase o Apple.
 */
const MODO_DEMO = true;

export async function autorizada(_req?: Request): Promise<boolean> {
  if (MODO_DEMO) return true;
  try {
    const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!cookie) return false;
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return esAdminEmail(decoded.email);
  } catch {
    return false;
  }
}