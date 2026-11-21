// 📁 RUTA: components/auth/Boveda.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Icono } from './iconos';

/**
 * Escena completa del login:
 *  1) Cerrada: solo la pieza en exhibición (rotación suave + foco de luz) y el sello (logo).
 *  2) Al tocar el sello: los pernos giran, la puerta de la bóveda se abre, un destello de luz
 *     y el panel de acceso se revela en círculo desde el sello.
 */
type Fase = 'cerrada' | 'abriendo' | 'abierta' | 'cerrando';

const PERNOS = Array.from({ length: 12 }, (_, i) => i);
// Motas de polvo dentro del haz de luz: [posición X %, posición Y vh, duración s, retraso s]
const POLVO: [number, number, number, number][] = [
  [45, 58, 9, 0], [51, 70, 11, 2], [55, 52, 10, 4], [48, 78, 12, 1],
  [42, 66, 13, 3], [58, 74, 9, 5], [50, 46, 14, 6], [54, 82, 10, 7],
];

type Props = {
  pieza: string | null;
  logo: string;
  alt: string;
  credito: string;
  className?: string;
  children: ReactNode;
};

export default function Boveda({ pieza, logo, alt, credito, className = '', children }: Props) {
  const [fase, setFase] = useState<Fase>('cerrada');
  const selloRef = useRef<HTMLButtonElement>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const temporizadores = useRef<number[]>([]);
  const animRef = useRef<Animation | null>(null);

  const libre = fase === 'abriendo' || fase === 'abierta';
  const visible = fase !== 'cerrada';

  const limpiar = () => {
    temporizadores.current.forEach((t) => window.clearTimeout(t));
    temporizadores.current = [];
  };
  const esperar = (fn: () => void, ms: number) => {
    temporizadores.current.push(window.setTimeout(fn, ms));
  };
  const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enfocar = () =>
    tarjetaRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });

  /** Revela / oculta el panel en círculo a partir de la posición del sello. */
  function iris(modo: 'abrir' | 'cerrar') {
    const tarjeta = tarjetaRef.current;
    const sello = selloRef.current;
    if (!tarjeta || !sello) return;
    const a = sello.getBoundingClientRect();
    const b = tarjeta.getBoundingClientRect();
    const k = b.width / (tarjeta.offsetWidth || b.width) || 1; // compensa el scale() de entrada
    const ox = (a.left + a.width / 2 - b.left) / k;
    const oy = (a.top + a.height / 2 - b.top) / k;
    const w = tarjeta.offsetWidth;
    const h = tarjeta.offsetHeight;
    const radio = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) + 60;
    const cerrado = `circle(0px at ${ox}px ${oy}px)`;
    const abierto = `circle(${radio}px at ${ox}px ${oy}px)`;
    animRef.current?.cancel(); // evita que un recorte anterior (fill) tape el panel al reabrir
    const anim = tarjeta.animate(
      modo === 'abrir' ? [{ clipPath: cerrado }, { clipPath: abierto }] : [{ clipPath: abierto }, { clipPath: cerrado }],
      {
        duration: modo === 'abrir' ? 1000 : 750,
        delay: modo === 'abrir' ? 600 : 0,
        easing: 'cubic-bezier(.4,0,.2,1)',
        fill: 'both',
      },
    );
    animRef.current = anim;
    if (modo === 'abrir') anim.onfinish = () => anim.cancel(); // quita el recorte para no cortar sombras
  }

  function abrir() {
    if (fase !== 'cerrada') return;
    limpiar();
    if (reducido()) {
      setFase('abierta');
      esperar(enfocar, 60);
      return;
    }
    setFase('abriendo');
    requestAnimationFrame(() => iris('abrir'));
    esperar(() => {
      setFase('abierta');
      enfocar();
    }, 1700);
  }

  function cerrar() {
    if (fase !== 'abierta') return;
    limpiar();
    if (reducido()) {
      setFase('cerrada');
      selloRef.current?.focus();
      return;
    }
    setFase('cerrando');
    iris('cerrar');
    esperar(() => {
      setFase('cerrada');
      selloRef.current?.focus();
    }, 1300);
  }

  useEffect(() => {
    if (fase !== 'abierta') return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  useEffect(() => limpiar, []);

  return (
    <main className={`jks ${className}`} data-fase={fase} data-libre={libre} data-vis={visible}>
      <div className="jks-fondo" />

      {/* ───────── Escenario: la pieza bajo el foco ───────── */}
      <div className="jks-escenario" aria-hidden={libre}>
        <div className="jks-foco" />
        <div className="jks-lampara" />
        <div className="jks-pozo" />

        <div className="jks-pieza-caja">
          <div className="jks-pieza-giro">
            {pieza && (
              <Image
                src={pieza}
                alt="Pieza de la colección patrimonial"
                fill
                priority
                quality={100}
                sizes="(min-width: 900px) 760px, 92vw"
                className="jks-pieza-img"
              />
            )}
            <div className="jks-pieza-luz" />
            <div className="jks-pieza-brillo" />
          </div>
        </div>

        <div className="jks-polvo" aria-hidden="true">
          {POLVO.map(([x, y, d, r], i) => (
            <span key={i} style={{ left: `${x}%`, top: `${y}vh`, animationDuration: `${d}s`, animationDelay: `${r}s` }} />
          ))}
        </div>
      </div>
      <div className="jks-vineta" />

      {/* ───────── Sello = puerta de la bóveda ───────── */}
      <div className="jks-sello-caja">
        <div className="jks-sello-escena">
          <div className="jks-hueco" />
          <div className="jks-pernos" aria-hidden="true">
            {PERNOS.map((i) => (
              <i key={i} style={{ transform: `rotate(${i * 30}deg) translateY(calc(var(--d) * -0.64))` }} />
            ))}
          </div>
          <span className="jks-latido" aria-hidden="true" />
          <button
            ref={selloRef}
            type="button"
            className="jks-puerta"
            onClick={abrir}
            aria-label="Abrir la bóveda de acceso"
            aria-expanded={libre}
          >
            <Image src={logo} alt={alt} width={1536} height={1024} priority quality={90} sizes="140px" />
          </button>
          <i className="jks-destello" aria-hidden="true" />
        </div>
        <span className="jks-pista">Toque el sello para ingresar</span>
      </div>

      {/* ───────── Interior de la bóveda: el login ───────── */}
      <div
        ref={tarjetaRef}
        className="jks-tarjeta"
        role="dialog"
        aria-label="Acceso a la bóveda"
        aria-hidden={!visible}
      >
        <button type="button" className="jks-cerrar" onClick={cerrar} aria-label="Cerrar bóveda">
          <Icono nombre="x" />
        </button>
        <div className="jks-logo">
          <Image src={logo} alt={alt} width={1536} height={1024} sizes="96px" />
        </div>
        {children}
        <p className="jks-credito">{credito}</p>
      </div>
    </main>
  );
}