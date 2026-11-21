// 📁 RUTA: src/components/auth/BovedaAcceso.tsx
'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import { MARCA } from '@/lib/marca';

/**
 * cerrada  → solo se ve el logo como puerta de bóveda
 * girando  → la rueda gira y los pernos se retraen
 * abriendo → la puerta se abre y sale la luz
 * abierta  → el logo queda pequeño y aparece el formulario
 */
type Fase = 'cerrada' | 'girando' | 'abriendo' | 'abierta';

const PERNOS = [0, 45, 90, 135, 180, 225, 270, 315];

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const punteroFino = () => window.matchMedia('(pointer: fine)').matches;

export default function BovedaAcceso({ children }: { children: ReactNode }) {
  const [fase, setFase] = useState<Fase>('cerrada');
  const timers = useRef<number[]>([]);
  const puertaRef = useRef<HTMLButtonElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);

  const limpiar = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const programar = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const enfocarCampo = () => {
    // En celular no enfocamos para que no salte el teclado solo
    if (!punteroFino()) return;
    programar(() => {
      contenidoRef.current?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
    }, 150);
  };

  const abrir = () => {
    if (fase !== 'cerrada') return;
    limpiar();
    if (sinMovimiento()) {
      setFase('abierta');
      enfocarCampo();
      return;
    }
    setFase('girando');
    programar(() => setFase('abriendo'), 900);
    programar(() => {
      setFase('abierta');
      enfocarCampo();
    }, 2000);
  };

  const cerrar = () => {
    if (fase !== 'abierta') return;
    limpiar();
    if (sinMovimiento()) {
      setFase('cerrada');
      puertaRef.current?.focus({ preventScroll: true });
      return;
    }
    setFase('abriendo');
    programar(() => setFase('girando'), 500);
    programar(() => {
      setFase('cerrada');
      puertaRef.current?.focus({ preventScroll: true });
    }, 1400);
  };

  const abierta = fase === 'abierta';

  return (
    <div className="jks-boveda" data-fase={fase}>
      <div className="jks-boveda-zona">
        <div className="jks-boveda-luz" aria-hidden />

        {/* Logo pequeño: aparece al abrir y sirve para cerrar */}
        <button
          type="button"
          className="jks-boveda-mini"
          onClick={cerrar}
          tabIndex={abierta ? 0 : -1}
          aria-label="Cerrar la bóveda"
        >
          <Image src={MARCA.logo} alt="" width={1536} height={1024} sizes="92px" />
        </button>

        {/* Puerta: el logo grande */}
        <button
          ref={puertaRef}
          type="button"
          className="jks-boveda-puerta"
          onClick={abrir}
          aria-disabled={fase !== 'cerrada'}
          tabIndex={fase === 'cerrada' ? 0 : -1}
          aria-label="Abrir la bóveda de acceso"
        >
          <span className="jks-boveda-borde" aria-hidden />
          <span className="jks-boveda-aro" aria-hidden />
          {PERNOS.map((a) => (
            <i key={a} className="jks-boveda-perno" style={{ '--a': `${a}deg` } as CSSProperties} aria-hidden />
          ))}
          <Image
            src={MARCA.logo}
            alt={MARCA.nombre}
            width={1536}
            height={1024}
            priority
            sizes="230px"
            className="jks-boveda-logo"
          />
        </button>

        <p className="jks-boveda-pista" aria-hidden>
          TOQUE PARA ABRIR LA BÓVEDA
        </p>
      </div>

      {/* Contenido: tu PanelAcceso, sin modificar */}
      <div className="jks-boveda-contenido" ref={contenidoRef}>
        <div className="jks-boveda-interior">
          {children}
          <button type="button" className="jks-boveda-cerrar" onClick={cerrar}>
            CERRAR BÓVEDA
          </button>
        </div>
      </div>

      <span className="jks-sr" role="status">
        {abierta ? 'Bóveda abierta' : ''}
      </span>
    </div>
  );
}