// 📁 RUTA: src/components/dashboard/BotonSalir.tsx   (ARCHIVO NUEVO — ponlo en la cabecera o menú del panel)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';

export default function BotonSalir({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      await signOut(getClientAuth()).catch(() => {});
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={salir} disabled={saliendo} className={className}
      style={className ? undefined : { padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(224,183,63,.55)', background: 'transparent', color: '#e0b73f', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600 }}>
      {saliendo ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  );
}