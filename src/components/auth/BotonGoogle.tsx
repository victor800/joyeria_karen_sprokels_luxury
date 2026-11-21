'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, signOut } from 'firebase/auth';
import { getClientAuth, crearProveedorGoogle } from '@/lib/firebase/client';
import Icono from '@/components/ui/Icono';

function mensajeDeError(e: unknown): string | null {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  if (code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana. Permite las ventanas emergentes e inténtalo de nuevo.';
  if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found')
    return 'Falta configurar Firebase en .env.local (claves NEXT_PUBLIC_FIREBASE_*).';
  if (code === 'auth/unauthorized-domain') return 'Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).';
  return e instanceof Error ? e.message : 'No se pudo iniciar sesión.';
}

export default function BotonGoogle() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async () => {
    setCargando(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const cred = await signInWithPopup(auth, crearProveedorGoogle());
      const idToken = await cred.user.getIdToken();

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        await signOut(auth);
        throw new Error(data?.error ?? 'No se pudo iniciar sesión.');
      }
      router.replace('/admin');
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={entrar}
        disabled={cargando}
        className="flex w-full cursor-pointer items-center justify-center space-x-3 rounded-lg bg-gradient-to-r from-primary-container via-primary to-primary-container py-4 font-label-lg text-label-lg font-bold uppercase tracking-widest text-on-primary shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
      >
        {cargando ? (
          <>
            <Icono nombre="hourglass_empty" className="animate-spin text-xl" />
            <span>Verificando bóveda…</span>
          </>
        ) : (
          <>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white">
              <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
                <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
            </span>
            <span>Ingresar con Google</span>
            <Icono nombre="arrow_forward" className="text-xl" />
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="flex items-start space-x-2 rounded-lg border border-error/40 bg-error-container/30 p-3 font-body-sm text-body-sm text-error"
        >
          <Icono nombre="error" className="mt-0.5 text-base" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
