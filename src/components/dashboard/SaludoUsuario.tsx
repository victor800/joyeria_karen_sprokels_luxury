// 📁 RUTA: src/components/dashboard/SaludoUsuario.tsx   (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useEffect, useState } from 'react';
import { getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
// Inicializa Firebase en el navegador (el mismo archivo que usa tu login).
// Sin esta línea, al recargar /dashboard la sesión todavía no está inicializada y el nombre no aparece.
import '@/lib/firebase/client';
import { Saludo } from '@/components/dashboard/Reloj';

/** "victor.sky2023@gmail.com" → "Victor" · "karen_sprockel@..." → "Karen" */
export function nombreDeCorreo(correo: string): string {
  const local = correo.split('@')[0] ?? '';
  const palabra = local.split(/[._\-+\s]+/).map((t) => t.replace(/\d+/g, '')).find((t) => t.length >= 2) ?? '';
  return palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase() : '';
}

function useNombreSesion(): string {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (!getApps().length) return;
    return onAuthStateChanged(getAuth(), (u) => {
      if (!u) return setNombre('');
      const deCorreo = u.email ? nombreDeCorreo(u.email) : '';
      // Si el correo no da un nombre usable, cae al nombre de la cuenta (ej. Google)
      setNombre(deCorreo || (u.displayName ?? '').trim().split(/\s+/)[0] || '');
    });
  }, []);

  return nombre;
}

/** "Buenos días, Victor." — sin nombre queda solo "Buenos días." */
export function SaludoUsuario() {
  const nombre = useNombreSesion();
  return (
    <>
      <Saludo />
      {nombre ? <>, <em>{nombre}.</em></> : '.'}
    </>
  );
}