// 📁 RUTA: src/lib/firebase/client.ts   (REEMPLAZA TODO EL ARCHIVO)
// Firebase del navegador. Se inicia "perezoso" (solo cuando se usa), así el build y el render del
// servidor no fallan. Mantiene getClientAuth() porque ya lo usan otros componentes (ej. admin/Sidebar).
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, type Auth } from 'firebase/auth';

/** Datos públicos del proyecto (Firebase → Configuración del proyecto → Tus apps → Web) */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _auth: Auth | null = null;

export function getClientApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

/** Auth de Firebase en el navegador (misma instancia siempre) */
export function getClientAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getClientApp());
    _auth.languageCode = 'es';
  }
  return _auth;
}

export const proveedorGoogle = new GoogleAuthProvider();
proveedorGoogle.setCustomParameters({ prompt: 'select_account' });

export const proveedorApple = new OAuthProvider('apple.com');
proveedorApple.addScope('email');
proveedorApple.addScope('name');
proveedorApple.setCustomParameters({ locale: 'es' });