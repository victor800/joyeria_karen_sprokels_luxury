import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function obtenerApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltan las variables de Firebase Admin (FIREBASE_*).');
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

let auth: Auth | undefined;

// Se inicia al usarlo, no al importar el archivo (así el build no falla sin llaves)
export const adminAuth = new Proxy({} as Auth, {
  get(_objetivo, propiedad) {
    auth ??= getAuth(obtenerApp());
    const valor = Reflect.get(auth, propiedad);
    return typeof valor === 'function' ? valor.bind(auth) : valor;
  },
});