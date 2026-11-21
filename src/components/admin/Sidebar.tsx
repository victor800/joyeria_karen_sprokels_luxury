'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';

const ENLACES = [
  { href: '/admin', label: 'Dashboard', icono: '📊' },
  { href: '/admin/pedidos', label: 'Pedidos', icono: '🧾' },
  { href: '/admin/productos', label: 'Productos', icono: '💍' },
  { href: '/admin/mi-web', label: 'Mi web', icono: '🌐' },
  { href: '/admin/configuracion', label: 'Configuración', icono: '⚙️' },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const salir = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(getClientAuth());
    router.replace('/login');
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="px-5 py-6 text-lg font-semibold tracking-wide">💎 Joyería</div>
      <nav className="flex-1 space-y-1 px-3">
        {ENLACES.map((l) => {
          const activo = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                activo ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <span>{l.icono}</span> {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-200 p-4 text-xs text-neutral-500">
        <p className="truncate">{email}</p>
        <button onClick={salir} className="mt-2 font-semibold text-red-600 hover:underline">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
