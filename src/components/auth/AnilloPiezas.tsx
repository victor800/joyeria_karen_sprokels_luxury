// 📁 RUTA: src/components/auth/AnilloPiezas.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import './anillo-piezas.css';

/** Grados por segundo. 3 ≈ una vuelta cada 2 minutos. */
const VELOCIDAD = 3;
/** Ancho máximo de cada pieza en px. */
const ANCHO_MAX = 360;
/** Proporción alto/ancho de cada pieza. */
const PROPORCION = 1.15;
/** Aumento de la lupa. */
const ZOOM = 2.8;
/** Diámetro máximo de la lupa en px. */
const LENTE_MAX = 190;
/** Espacio extra dentro de la vitrina (arriba + piso). */
const EXTRA = 96;
/** Altura del piso de la vitrina. */
const PISO = 56;

export default function AnilloPiezas({ piezas }: { piezas: string[] }) {
  const cajaRef = useRef<HTMLDivElement>(null);
  const anilloRef = useRef<HTMLDivElement>(null);
  const capaRef = useRef<HTMLDivElement>(null);
  const lenteRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  const angRef = useRef(0);
  const selRef = useRef<number | null>(null);
  const listoRef = useRef(false);
  const natRef = useRef<{ w: number; h: number } | null>(null);
  const punteroRef = useRef<{ x: number; y: number } | null>(null);

  const [ancho, setAncho] = useState(ANCHO_MAX);
  const [sel, setSel] = useState<number | null>(null);
  const [listo, setListo] = useState(false);

  const n = piezas.length;
  const paso = 360 / n;
  const alto = Math.round(ancho * PROPORCION);
  const escenaAlto = alto + EXTRA;
  // Las piezas se apoyan justo sobre el piso
  const arriba = escenaAlto - PISO - alto + 6;
  const lente = Math.min(LENTE_MAX, Math.round(ancho * 0.5));
  const radio = n > 1 ? Math.round((ancho / 2 / Math.tan(Math.PI / n)) * 1.08) : 0;

  // Ajusta el tamaño al ancho disponible
  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    const medir = () => setAncho(Math.min(ANCHO_MAX, Math.round(caja.clientWidth * 0.6)));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(caja);
    return () => ro.disconnect();
  }, []);

  // Carga el tamaño real de la imagen (para calcular la lupa)
  useEffect(() => {
    natRef.current = null;
    if (sel === null) return;
    const im = new window.Image();
    im.onload = () => {
      natRef.current = { w: im.naturalWidth, h: im.naturalHeight };
      pintarLupa();
    };
    im.src = piezas[sel];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, piezas]);

  // Animación: giro continuo lento; al pasar el cursor frena y centra la pieza
  useEffect(() => {
    const anillo = anilloRef.current;
    if (!anillo || n < 1) return;

    let raf = 0;
    let ultimo = performance.now();

    const tick = (ahora: number) => {
      const dt = Math.min((ahora - ultimo) / 1000, 0.1);
      ultimo = ahora;

      if (selRef.current === null) {
        angRef.current = (angRef.current + VELOCIDAD * dt) % 360;
      } else {
        const objetivo = selRef.current * paso;
        const d = ((objetivo - angRef.current + 540) % 360) - 180;
        if (Math.abs(d) < 0.3) {
          angRef.current = objetivo;
          if (!listoRef.current) {
            listoRef.current = true;
            setListo(true);
          }
        } else {
          angRef.current = (((angRef.current + d * (1 - Math.exp(-9 * dt))) % 360) + 360) % 360;
        }
      }

      const ang = angRef.current;
      anillo.style.transform = `translateZ(${-radio}px) rotateY(${-ang}deg)`;

      for (let i = 0; i < n; i++) {
        const el = itemsRef.current[i];
        if (!el) continue;
        const diff = ((i * paso - ang + 540) % 360) - 180;
        const c = Math.max(0, Math.cos((diff * Math.PI) / 180));
        el.style.opacity = String(0.3 + 0.7 * c);
        el.style.filter = `brightness(${0.45 + 0.55 * c})`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, paso, radio]);

  // Dibuja el lente en la última posición conocida del cursor
  const pintarLupa = () => {
    const lens = lenteRef.current;
    const capa = capaRef.current;
    const nat = natRef.current;
    const p = punteroRef.current;
    const i = selRef.current;
    if (!lens || !capa || !nat || !p || i === null || !listoRef.current) return;

    // La capa cubre toda la escena; la pieza central está centrada en ella
    const r = capa.getBoundingClientRect();
    const mx = p.x - r.left;
    const my = p.y - r.top;
    const px = mx - (r.width - ancho) / 2; // posición dentro de la pieza
    const py = my - arriba;

    // Si el cursor está fuera de la pieza central, se oculta el lente
    if (px < 0 || px > ancho || py < 0 || py > alto) {
      lens.style.display = 'none';
      capa.style.cursor = 'default';
      return;
    }

    // Tamaño real con el que se ve la imagen (object-fit: cover)
    const s = Math.max(ancho / nat.w, alto / nat.h);
    const w = nat.w * s;
    const h = nat.h * s;
    const ox = (ancho - w) / 2;
    const oy = (alto - h) / 2;

    capa.style.cursor = 'none';
    lens.style.display = 'block';
    lens.style.left = `${mx - lente / 2}px`;
    lens.style.top = `${my - lente / 2}px`;
    lens.style.backgroundImage = `url("${piezas[i]}")`;
    lens.style.backgroundSize = `${w * ZOOM}px ${h * ZOOM}px`;
    lens.style.backgroundPosition = `${-((px - ox) * ZOOM - lente / 2)}px ${-((py - oy) * ZOOM - lente / 2)}px`;
  };

  // Cuando la pieza termina de centrarse, muestra la lupa si el cursor está encima
  useEffect(() => {
    if (listo) pintarLupa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo]);

  const entrar = (e: React.PointerEvent<HTMLDivElement>) => {
    punteroRef.current = { x: e.clientX, y: e.clientY };
    if (selRef.current !== null) return;
    const i = Math.round(angRef.current / paso) % n;
    selRef.current = i;
    listoRef.current = false;
    setListo(false);
    setSel(i);
  };

  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    punteroRef.current = { x: e.clientX, y: e.clientY };
    // Por si el evento de entrada no llegó (p. ej. táctil)
    if (selRef.current === null) entrar(e);
    pintarLupa();
  };

  const salir = () => {
    punteroRef.current = null;
    selRef.current = null;
    listoRef.current = false;
    setListo(false);
    setSel(null);
    if (lenteRef.current) lenteRef.current.style.display = 'none';
    if (capaRef.current) capaRef.current.style.cursor = 'default';
  };

  if (n === 0) return null;

  // Posición exacta y centrada de la pieza frontal
  const posicion = {
    width: ancho,
    height: alto,
    left: `calc(50% - ${ancho / 2}px)`,
    top: arriba,
  } as const;

  return (
    <div className="anillo" ref={cajaRef}>
      <div className="vitrina">
        {/* Marco dorado metálico */}
        <div className="vitrina-marco">
          {/* Bisel oscuro */}
          <div className="vitrina-bisel">
            {/* Ventana de cristal */}
            <div className="anillo-escena" style={{ height: escenaAlto }}>
              <div className="vitrina-lampara" aria-hidden />
              <div className="vitrina-foco" aria-hidden />

              <div
                className="anillo-giro"
                ref={anilloRef}
                style={{ ...posicion, transform: `translateZ(${-radio}px)` }}
              >
                {piezas.map((src, i) => (
                  <div
                    key={src}
                    ref={(el) => {
                      itemsRef.current[i] = el;
                    }}
                    className="anillo-pieza"
                    style={{
                      width: ancho,
                      height: alto,
                      transform: `rotateY(${i * paso}deg) translateZ(${radio}px)`,
                    }}
                  >
                    <Image
                      src={src}
                      alt={`Pieza ${i + 1}`}
                      fill
                      sizes={`${ancho}px`}
                      quality={95}
                      priority={i < 2}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>

              <div className="vitrina-piso" style={{ height: PISO }} aria-hidden>
                <span className="vitrina-sombra" style={{ width: ancho * 0.9 }} />
              </div>

              {/* Capa que cubre toda la escena: al pasar el cursor frena el giro,
                  centra la pieza más cercana y muestra la lupa sobre ella */}
              <div
                ref={capaRef}
                className="anillo-lupa-capa"
                onPointerEnter={entrar}
                onPointerMove={mover}
                onPointerLeave={salir}
              >
                <div ref={lenteRef} className="anillo-lente" style={{ width: lente, height: lente }} />
              </div>

              {/* Reflejo del cristal */}
              <div className="vitrina-cristal" aria-hidden />
            </div>
          </div>
        </div>

        {/* Base / pedestal */}
        <div className="vitrina-base" aria-hidden />
      </div>
    </div>
  );
}