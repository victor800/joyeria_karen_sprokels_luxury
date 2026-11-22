// 📁 RUTA: src/app/dashboard/layout.tsx
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { MARCA } from '@/lib/marca';
import Sidebar from '@/components/dashboard/Sidebar';
import Reloj from '@/components/dashboard/Reloj';
import TablasMovil from '@/components/dashboard/TablasMovil';
import BarraInferior from '@/components/dashboard/BarraInferior';
import './dashboard.css';

const sans = Inter({ subsets: ['latin'], variable: '--d-sans', display: 'swap' });
const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--d-serif',
  display: 'swap',
});

export const metadata: Metadata = { title: `Panel · ${MARCA.nombre}` };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`dash ${sans.variable} ${serif.variable}`}>
      <Sidebar />
      <div className="d-main">
        <header className="d-top">
          <input className="d-buscar" type="search" placeholder="Buscar prendas, pedidos, socios…" aria-label="Buscar" />

          <div className="d-top-der">
            <span className="d-estado"><i /> Tienda abierta</span>
            <Reloj />
            <button type="button" className="d-campana" aria-label="Notificaciones">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" />
              </svg>
            </button>
            <span className="d-avatar" aria-label="Administradora">KS</span>
          </div>
        </header>
        {children}
      </div>

      {/* Activa tablas en tarjetas y secciones colapsables en el celular */}
      <TablasMovil />

      {/* Barra inferior de navegación (solo móvil, siempre visible; se oculta con el menú lateral abierto) */}
      <BarraInferior />
    </div>
  );
}