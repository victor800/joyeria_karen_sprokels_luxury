// 📁 RUTA: src/components/CargandoNavegacion.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { MARCA } from '@/lib/marca';

const R = 56; // radio del arco de progreso
const C = 2 * Math.PI * R;
const MAX_ESPERA = 10000; // si una navegación nunca termina, la pantalla se oculta sola

/**
 * Pantalla de carga al navegar: un anillo dorado que se llena hasta 100 %
 * con tu logo al centro. Detecta solo cualquier clic en un enlace interno
 * (menú, tarjetas, botones con <Link>) y se cierra cuando la nueva ruta carga.
 */
export default function CargandoNavegacion() {
  const ruta = usePathname() ?? '';
  const [activo, setActivo] = useState(false);
  const [zona, setZona] = useState({ left: 0, top: 0 });

  const arco = useRef<SVGCircleElement>(null);
  const numero = useRef<HTMLSpanElement>(null);
  const prog = useRef(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  const estado = useRef<'quieto' | 'cargando' | 'terminando'>('quieto');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rutaPrevia = useRef(ruta);

  // El progreso se pinta directo en el DOM (sin re-renderizar React en cada cuadro)
  const pintar = useCallback((p: number) => {
    prog.current = p;
    arco.current?.style.setProperty('stroke-dashoffset', String(C * (1 - p / 100)));
    if (numero.current) numero.current.textContent = `${Math.round(p)}%`;
  }, []);

  const limpiar = useCallback(() => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Llega la página nueva: el anillo se completa al 100 % y se desvanece
  const terminar = useCallback(() => {
    if (estado.current !== 'cargando') return;
    estado.current = 'terminando';
    limpiar();
    const desde = prog.current;
    const ini = performance.now();
    const paso = (t: number) => {
      const k = Math.min((t - ini) / 240, 1);
      pintar(desde + (100 - desde) * k);
      if (k < 1) {
        raf.current = requestAnimationFrame(paso);
        return;
      }
      timers.current.push(
        setTimeout(() => {
          setActivo(false);
          estado.current = 'quieto';
        }, 180),
      );
    };
    raf.current = requestAnimationFrame(paso);
  }, [limpiar, pintar]);

  // Empieza a navegar: el anillo avanza suave y se acerca al 92 % mientras espera
  const iniciar = useCallback(() => {
    if (estado.current === 'cargando') return;
    limpiar();
    estado.current = 'cargando';

    // Se centra en el área de contenido (a la derecha del menú, debajo de la barra superior)
    const lado = document.querySelector('.d-side');
    const main = document.querySelector('.d-cont');
    const escritorio = !window.matchMedia('(max-width: 900px)').matches;
    setZona({
      left: escritorio && lado ? Math.max(0, Math.round(lado.getBoundingClientRect().right)) : 0,
      top: main ? Math.min(Math.max(0, Math.round(main.getBoundingClientRect().top)), Math.round(window.innerHeight * 0.4)) : 0,
    });

    pintar(0);
    setActivo(true);
    t0.current = performance.now();
    const paso = (t: number) => {
      pintar(92 * (1 - Math.exp(-(t - t0.current) / 1100)));
      raf.current = requestAnimationFrame(paso);
    };
    raf.current = requestAnimationFrame(paso);
    timers.current.push(setTimeout(terminar, MAX_ESPERA));
  }, [limpiar, pintar, terminar]);

  // Detecta los clics en enlaces internos y el botón "atrás/adelante" del navegador
  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a') as HTMLAnchorElement | null;
      if (!a || typeof a.href !== 'string' || !a.href) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // misma página: no hay nada que cargar
      iniciar();
    };
    const alVolver = () => {
      if (window.location.pathname !== rutaPrevia.current) iniciar();
    };
    document.addEventListener('click', alClic, true); // captura: corre antes que el router
    window.addEventListener('popstate', alVolver);
    return () => {
      document.removeEventListener('click', alClic, true);
      window.removeEventListener('popstate', alVolver);
      limpiar();
    };
  }, [iniciar, limpiar]);

  // La ruta cambió: la página nueva ya está lista
  useEffect(() => {
    if (rutaPrevia.current === ruta) return;
    rutaPrevia.current = ruta;
    terminar();
  }, [ruta, terminar]);

  return (
    <div className="nc" data-activo={activo ? '1' : '0'} style={{ left: zona.left, top: zona.top }} role="status" aria-live="polite" aria-hidden={!activo} aria-label="Cargando página">
      <style>{CSS}</style>
      <div className="nc-caja">
        <div className="nc-anillo">
          <svg viewBox="0 0 140 140" aria-hidden="true">
            <defs>
              <linearGradient id="nc-oro" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f6dd8a" />
                <stop offset="1" stopColor="#b08d3c" />
              </linearGradient>
            </defs>
            <circle className="nc-orbita" cx="70" cy="70" r="66" />
            <circle className="nc-pista" cx="70" cy="70" r={R} />
            <circle ref={arco} className="nc-arco" cx="70" cy="70" r={R} strokeDasharray={C} strokeDashoffset={C} transform="rotate(-90 70 70)" />
          </svg>
          <span className="nc-logo">
            <Image src={MARCA.logo} alt="" width={1536} height={1024} sizes="480px" quality={95} priority />
          </span>
        </div>
        <span ref={numero} className="nc-pct" aria-hidden="true">0%</span>
      </div>
    </div>
  );
}

const CSS = `
  .nc { position: fixed; right: 0; bottom: 0; z-index: 60; display: grid; place-items: center; pointer-events: none;
    background: rgba(252,251,247,.97);
    opacity: 0; visibility: hidden; transition: opacity .3s ease, visibility 0s linear .3s; }
  .nc[data-activo="1"] { opacity: 1; visibility: visible; transition: opacity .15s ease; }
  .nc-caja { display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .nc-anillo { position: relative; width: 168px; height: 168px; }
  .nc-anillo svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; shape-rendering: geometricPrecision; }
  .nc-orbita { fill: none; stroke: #b08d3c; stroke-opacity: .6; stroke-width: 2; stroke-dasharray: .1 9.6; stroke-linecap: round;
    transform-box: fill-box; transform-origin: center; animation: ncgira 10s linear infinite; }
  .nc-pista { fill: none; stroke: rgba(11,45,31,.10); stroke-width: 4; }
  .nc-arco { fill: none; stroke: url(#nc-oro); stroke-width: 4.5; stroke-linecap: round; }
  .nc-logo { position: absolute; inset: 27px; border-radius: 50%; overflow: hidden; background: #0b2d1f;
    box-shadow: 0 0 0 1.5px #d8b95f, 0 12px 32px rgba(5,28,19,.28); }
  .nc-logo img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
  .nc-pct { font-family: var(--font-jakarta), system-ui, sans-serif; font-size: 13px; font-weight: 600; letter-spacing: .24em; text-indent: .24em;
    color: #0b2d1f; font-variant-numeric: tabular-nums; text-rendering: geometricPrecision; }
  @keyframes ncgira { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .nc-orbita { animation: none; }
    .nc { transition: none; }
  }
`;