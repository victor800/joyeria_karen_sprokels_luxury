// 📁 RUTA: src/lib/firebase/admin.ts   (si ya existe y exporta `adminAuth`, puedes dejar el tuyo)
import 'server-only';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/** Cuenta de servicio (Firebase → Configuración del proyecto → Cuentas de servicio → Generar clave privada) */
const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // En Vercel la clave llega con "\n" escritos: se convierten en saltos de línea reales
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
      }),
    });

export const adminAuth = getAuth(app);