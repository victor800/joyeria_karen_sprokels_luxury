// 📁 RUTA: src/components/dashboard/Sidebar.tsx  (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { MARCA } from '@/lib/marca';
import './sidebar.css';
import CargandoNavegacion from '@/components/CargandoNavegacion';
import { Insignia, useContadores } from '@/components/InsigniaContador';

const ICONOS: Record<string, string> = {
  inicio: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  prendas: 'M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6',
  hans: 'M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 13v3M9 21h6M10 16l-1 5M14 16l1 5',
  pedidos: 'M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0',
  domi: 'M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clientes: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  boveda: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  web: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18',
  config: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
  pagos: 'M2 6h20v12H2zM2 10h20M6 15h4',
  inventario: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  apartados: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  personalizados: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  garantias: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  promos: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01',
  proveedores: 'M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  reportes: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  usuarios: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  salir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};

// contador: clave del número que se muestra en el círculo (se define en src/lib/contadores.ts)
type Item = { href: string; t: string; i: string; contador?: string };
type Grupo = { titulo: string; items: Item[] };

const GRUPOS: Grupo[] = [
  {
    titulo: 'Principal',
    items: [
      { href: '/dashboard', t: 'Inicio', i: 'inicio' },
      { href: '/dashboard/pedidos', t: 'Pedidos', i: 'pedidos', contador: 'pedidos' },
      { href: '/dashboard/domiciliarios', t: 'Domiciliarios', i: 'domi', contador: 'domiciliarios' },
      { href: '/dashboard/pagos', t: 'Pagos', i: 'pagos' },
    ],
  },
  {
    titulo: 'Catálogo',
    items: [
      { href: '/dashboard/prendas', t: 'Prendas', i: 'prendas', contador: 'prendas' },
      { href: '/dashboard/hans', t: 'Joyería Hans', i: 'hans', contador: 'hans' },
      { href: '/dashboard/inventario', t: 'Inventario', i: 'inventario', contador: 'inventario' },
      { href: '/dashboard/boveda', t: 'Bóveda de oro', i: 'boveda' },
    ],
  },
  {
    titulo: 'Clientes y ventas',
    items: [
      { href: '/dashboard/clientes', t: 'Clientes VIP', i: 'clientes', contador: 'clientes' },
      { href: '/dashboard/apartados', t: 'Apartados', i: 'apartados' },
      { href: '/dashboard/personalizados', t: 'Personalizados', i: 'personalizados' },
      { href: '/dashboard/garantias', t: 'Garantías', i: 'garantias' },
    ],
  },
  {
    titulo: 'Marketing',
    items: [
      { href: '/dashboard/promociones', t: 'Promociones', i: 'promos' },
      { href: '/dashboard/tienda-web', t: 'Mi tienda web', i: 'web' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { href: '/dashboard/proveedores', t: 'Proveedores', i: 'proveedores' },
      { href: '/dashboard/reportes', t: 'Reportes', i: 'reportes' },
      { href: '/dashboard/usuarios', t: 'Usuarios y roles', i: 'usuarios' },
      { href: '/dashboard/configuracion', t: 'Configuración', i: 'config' },
    ],
  },
];

const CLAVE_GRUPOS = 'sb-compactos';
const CLAVE_MINI = 'sb-mini';

export default function Sidebar() {
  const ruta = usePathname() ?? '';
  const router = useRouter();

  const [abierto, setAbierto] = useState(false); // móvil: menú deslizable
  const [mini, setMini] = useState(false); // escritorio: barra de íconos
  const [compactos, setCompactos] = useState<string[]>([]);
  const [destino, setDestino] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false); // popup de cerrar sesión
  const contadores = useContadores(); // números de los círculos del menú

  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE_GRUPOS);
      if (g) setCompactos(JSON.parse(g));
      setMini(localStorage.getItem(CLAVE_MINI) === '1');
    } catch {}
  }, []);

  useEffect(() => {
    setDestino(null);
  }, [ruta]);

  // Marca el contenedor .dash para que el grid cambie el ancho del menú
  useEffect(() => {
    const dash = document.querySelector('.dash');
    dash?.classList.remove('dash-oculto');
    dash?.classList.toggle('dash-mini', mini);
  }, [mini]);

  // Popup: Escape para cerrar y bloqueo del scroll de la página
  useEffect(() => {
    if (!confirmar) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmar(false);
    };
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alTeclear);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [confirmar]);

  const cerrarSesion = () => {
    setConfirmar(false);
    // Si tienes logout real (Supabase, NextAuth, cookie...), llámalo aquí antes del push
    router.push('/login');
  };

  const alternarGrupo = (titulo: string) =>
    setCompactos((prev) => {
      const nuevo = prev.includes(titulo) ? prev.filter((x) => x !== titulo) : [...prev, titulo];
      try {
        localStorage.setItem(CLAVE_GRUPOS, JSON.stringify(nuevo));
      } catch {}
      return nuevo;
    });

  const alternarMenu = () => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      setAbierto((v) => !v);
    } else {
      setMini((v) => {
        try {
          localStorage.setItem(CLAVE_MINI, v ? '0' : '1');
        } catch {}
        return !v;
      });
    }
  };

  const actual = destino ?? ruta;
  const esActivo = (href: string) =>
    href === '/dashboard' ? actual === href : actual === href || actual.startsWith(href + '/');

  const claseMenu = ['d-side', 'sb', abierto ? 'abierto' : '', actual === '/dashboard' ? 'en-inicio' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{`
        /* Menú expandido: todos los círculos pegados al borde derecho, con el mismo ancho y alineados en columna */
        .dash:not(.dash-mini) .sb-nav a .sb-t { flex: 1 1 auto; min-width: 0; }
        .dash:not(.dash-mini) .sb-nav a .sb-ins {
          margin-left: auto !important; margin-right: 20px !important; flex: 0 0 auto;
          min-width: 26px !important; height: 26px !important; padding: 0 6px !important;
          display: inline-flex !important; align-items: center; justify-content: center;
          box-sizing: border-box; text-align: center; font-variant-numeric: tabular-nums;
        }

        /* Menú reducido (solo íconos): el círculo pasa a la esquina del ícono */
        .dash-mini .sb-nav a { position: relative; }
        .dash-mini .sb-nav a .sb-ins { position: absolute !important; top: 3px; right: 4px; margin: 0 !important;
          min-width: 16px !important; height: 16px !important; padding: 0 4px !important; font-size: 9px !important; }
      `}</style>

      <button
        type="button"
        className="d-burger"
        onClick={alternarMenu}
        aria-label="Expandir o reducir el menú"
        aria-expanded={abierto || !mini}
      >
        ☰
      </button>

      <aside className={claseMenu}>
        <div className="d-logo">
          <span className="d-sello">
            <Image src={MARCA.logo} alt={MARCA.nombre} width={1536} height={1024} priority sizes="92px" />
            <span className="d-boveda" aria-hidden>
              <span className="d-manija" />
            </span>
          </span>
          <b>
            {MARCA.titulo} <em>{MARCA.acento}</em>
          </b>
          <small>PANEL DE ADMINISTRACIÓN</small>
        </div>

        <nav className="sb-nav" aria-label="Principal">
          {GRUPOS.map((g) => {
            const compacto = compactos.includes(g.titulo);
            return (
              <div key={g.titulo} className={compacto ? 'sb-bloque compacto' : 'sb-bloque'}>
                <button
                  type="button"
                  className="sb-grupo"
                  onClick={() => alternarGrupo(g.titulo)}
                  aria-expanded={!compacto}
                  title={compacto ? 'Expandir' : 'Colapsar'}
                >
                  <span>{g.titulo}</span>
                  <svg viewBox="0 0 24 24" aria-hidden className="sb-chev">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {g.items.map((e) => {
                  const n = e.contador ? contadores[e.contador] : 0;
                  return (
                    <Link
                      key={e.href}
                      href={e.href}
                      title={e.t}
                      aria-label={n > 0 ? `${e.t}, ${n}` : e.t}
                      prefetch
                      onClick={() => {
                        setDestino(e.href);
                        setAbierto(false);
                      }}
                      aria-current={esActivo(e.href) ? 'page' : undefined}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <path d={ICONOS[e.i]} />
                      </svg>
                      <span className="sb-t">{e.t}</span>
                      {e.contador && <Insignia className="sb-ins" n={n} titulo={e.t} />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <button
          type="button"
          className="d-salir"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          onClick={() => {
            setAbierto(false);
            setConfirmar(true);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d={ICONOS.salir} />
          </svg>
          <span className="sb-t">CERRAR SESIÓN</span>
        </button>
      </aside>

      {/* Pantalla de carga al navegar: anillo hasta 100 % con el logo */}
      <CargandoNavegacion />

      {/* Popup FUERA del <aside>: así no depende del menú deslizable en móvil */}
      {confirmar && (
        <div className="sb-modal" onClick={() => setConfirmar(false)}>
          <div
            className="sb-modal-caja"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sb-modal-t"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sb-modal-icono" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path d={ICONOS.salir} />
              </svg>
            </span>
            <h2 id="sb-modal-t">¿Cerrar sesión?</h2>
            <p>Saldrás del panel de administración. Podrás volver a entrar cuando quieras.</p>
            <div className="sb-modal-acciones">
              <button type="button" className="sb-modal-cancelar" onClick={() => setConfirmar(false)} autoFocus>
                CANCELAR
              </button>
              <button type="button" className="sb-modal-ok" onClick={cerrarSesion}>
                SÍ, CERRAR SESIÓN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}