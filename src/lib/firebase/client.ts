// 📁 RUTA: src/lib/firebase/client.ts   (ARCHIVO NUEVO — si ya tienes uno igual, deja el tuyo)
'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

/** Datos públicos del proyecto (Firebase → Configuración del proyecto → Tus apps → Web) */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(firebaseApp);
auth.languageCode = 'es';

export const proveedorGoogle = new GoogleAuthProvider();
proveedorGoogle.setCustomParameters({ prompt: 'select_account' });

export const proveedorApple = new OAuthProvider('apple.com');
proveedorApple.addScope('email');
proveedorApple.addScope('name');
proveedorApple.setCustomParameters({ locale: 'es' });