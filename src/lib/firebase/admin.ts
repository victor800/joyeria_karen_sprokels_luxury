// 📁 RUTA: src/lib/firebase/admin.ts   (REEMPLAZA TODO EL ARCHIVO)
// Firebase Admin (servidor). Se inicia SOLO cuando se usa, así `next build` no falla.
// Acepta la cuenta de servicio de cualquiera de estas formas (usa la que ya tengas en Vercel):
//   A) FIREBASE_SERVICE_ACCOUNT        = el JSON completo de la cuenta de servicio
//   B) FIREBASE_SERVICE_ACCOUNT_BASE64 = ese mismo JSON en base64
//   C) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
//      (también sirven con prefijo FIREBASE_ADMIN_..., y el project id puede salir de NEXT_PUBLIC_FIREBASE_PROJECT_ID)
import 'server-only';
import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

const env = (...nombres: string[]) => {
  for (const n of nombres) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return '';
};

/** Quita comillas sobrantes y convierte los "\n" escritos en saltos de línea reales */
const limpiarClave = (k: string) => k.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

function cuentaDeServicio(): ServiceAccount {
  const json = env('FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_SERVICE_ACCOUNT_KEY', 'GOOGLE_SERVICE_ACCOUNT_JSON');
  const b64 = env('FIREBASE_SERVICE_ACCOUNT_BASE64');
  const crudo = json || (b64 ? Buffer.from(b64, 'base64').toString('utf8') : '');
  if (crudo) {
    const j = JSON.parse(crudo) as { project_id?: string; client_email?: string; private_key?: string };
    return { projectId: j.project_id, clientEmail: j.client_email, privateKey: limpiarClave(j.private_key ?? '') };
  }

  const projectId = env('FIREBASE_PROJECT_ID', 'FIREBASE_ADMIN_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  const clientEmail = env('FIREBASE_CLIENT_EMAIL', 'FIREBASE_ADMIN_CLIENT_EMAIL');
  const privateKey = limpiarClave(env('FIREBASE_PRIVATE_KEY', 'FIREBASE_ADMIN_PRIVATE_KEY'));
  const faltan = [!projectId && 'FIREBASE_PROJECT_ID', !clientEmail && 'FIREBASE_CLIENT_EMAIL', !privateKey && 'FIREBASE_PRIVATE_KEY'].filter(Boolean);
  if (faltan.length) throw new Error(`Firebase Admin: faltan variables de entorno: ${faltan.join(', ')}`);
  return { projectId, clientEmail, privateKey };
}

let _app: App | null = null;
let _auth: Auth | null = null;

export function getAdminApp(): App {
  if (!_app) _app = getApps().length ? getApp() : initializeApp({ credential: cert(cuentaDeServicio()) });
  return _app;
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp());
  return _auth;
}

/** Igual que antes: `adminAuth.verifyIdToken(...)`, pero se inicia en el primer uso (no al importar) */
export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    const a = getAdminAuth();
    const v = Reflect.get(a, prop, a);
    return typeof v === 'function' ? v.bind(a) : v;
  },
});