import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

export const SESSION_COOKIE = 'joyeria_session';

export function esAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lista = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}


export async function getAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const d = await adminAuth.verifySessionCookie(token, true);
    if (!esAdminEmail(d.email)) return null;
    return { email: d.email as string, nombre: d.name ?? '', foto: d.picture ?? '' };
  } catch {
    return null;
  }
}
