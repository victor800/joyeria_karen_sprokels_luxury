// 📁 RUTA: src/app/login/page.tsx
import fs from 'node:fs';
import path from 'node:path';
import { Suspense } from 'react';
import { connection } from 'next/server';
import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import { Inter, Playfair_Display } from 'next/font/google';
import { MARCA } from '@/lib/marca';
import PanelAcceso from '@/components/auth/PanelAcceso';
import AnilloPiezas from '@/components/auth/AnilloPiezas';
import BovedaIntro from '@/components/auth/BovedaIntro';
import './login.css';

const sans = Inter({ subsets: ['latin'], variable: '--jks-sans', display: 'swap' });
const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--jks-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `Acceso · ${MARCA.nombre}`,
  description: `${MARCA.titulo} ${MARCA.acento}`,
};

/** Móvil: ocupa toda la pantalla (incluida la zona del notch) y la barra del navegador queda en negro. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

// Coincide con: pieza.jpeg, pieza1.jpeg, pieza2.jpeg ... pieza6.jpeg
const PIEZA = /^pieza(\d*)\.(png|jpe?g|webp|avif|gif|svg)$/i;

/** Lee public/pieza.jpeg, pieza1.jpeg, pieza2.jpeg ... en orden numérico. */
function buscarPiezas(): string[] {
  try {
    const dir = path.join(process.cwd(), 'public');
    return fs
      .readdirSync(dir)
      .map((n) => ({ n, m: n.match(PIEZA) }))
      .filter((x): x is { n: string; m: RegExpMatchArray } => x.m !== null)
      .sort((a, b) => Number(a.m[1] || 0) - Number(b.m[1] || 0))
      .map((x) => `/${x.n}`);
  } catch {
    return [];
  }
}

/** El año se calcula en cada petición para evitar el error de prerender con new Date(). */
async function AnioActual() {
  await connection();
  return <>{new Date().getFullYear()}</>;
}

export default function LoginPage() {
  const piezas = buscarPiezas();

  return (
    <main className={`jks ${sans.variable} ${serif.variable}`}>
      {/* Intro: la bóveda se abre y revela el logo (una vez por sesión) */}
      <BovedaIntro />

      <div className="jks-layout">
        {/* ── Izquierda: escena ── */}
        <section className="jks-escena" aria-label="Colección patrimonial">
          <header className="jks-cabecera">
            <div className="jks-marca">
              <span className="jks-sello">
                <Image src={MARCA.logo} alt={MARCA.nombre} width={1536} height={1024} priority sizes="56px" />
              </span>
              <div className="jks-marca-texto">
                <small>JOYERÍA JKS</small>
                <h1>
                  {MARCA.titulo} <em>{MARCA.acento}</em>
                </h1>
                <span className="jks-marca-sub">
                  <i /> BÓVEDA DE ORO 18K
                </span>
              </div>
            </div>
            <span className="jks-pastilla">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="9" r="5" />
                <path d="M9 14l-1 7 4-2 4 2-1-7" />
              </svg>
              EXHIBICIÓN PRIVADA
            </span>
          </header>

          <div className="jks-vitrina">
            {piezas.length > 0 && <AnilloPiezas piezas={piezas} />}
          </div>
        </section>

        {/* ── Derecha: acceso ── */}
        <aside className="jks-acceso">
          <div className="jks-acceso-col">
            {/* Logo protagonista del panel de acceso */}
            <div className="jks-logo-panel">
              <span className="jks-logo-panel-sello">
                <Image src={MARCA.logo} alt={MARCA.nombre} width={1536} height={1024} priority sizes="130px" />
              </span>
            </div>

            <PanelAcceso />
          </div>
        </aside>
      </div>

      <footer className="jks-pie">
        ©{' '}
        <Suspense fallback={null}>
          <AnioActual />
        </Suspense>{' '}
        {MARCA.nombre} · Desarrollado por <b>{MARCA.desarrollador}</b>
      </footer>
    </main>
  );
}