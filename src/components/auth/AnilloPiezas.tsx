// 📁 RUTA: src/components/auth/AnilloPiezas.tsx
'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import Image from 'next/image';

/** Encuadre de la foto en la card */
const ZOOM = 1;  // más alto = más cerca (1 = sin zoom)
const POS_Y = 0.2;  // más bajo = la foto sube más (0 = pegada arriba, 0.5 = centrada)

/** Lupa */
const RADIO = 70;        // radio del círculo en px
const AUMENTO_MIN = 1.6; // aumento mínimo
const AUMENTO_MAX = 4;   // tope; solo se alcanza con fotos de alta resolución

type Cursor = { x: number; y: number; w: number; h: number };
type Dim = { w: number; h: number };

const VACIO: string[] = [];

export default function AnilloPiezas({ piezas = VACIO }: { piezas?: string[] }) {
  const lista = Array.isArray(piezas) ? piezas : VACIO;
  const total = lista.length;

  const [activa, setActiva] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [dims, setDims] = useState<Record<string, Dim>>({});
  const vista = useRef<HTMLDivElement>(null);

  // Carga las fotos ORIGINALES: dan el tamaño real y quedan en caché para la lupa
  useEffect(() => {
    lista.forEach((src) => {
      const im = new window.Image();
      im.onload = () =>
        setDims((p) => (p[src] ? p : { ...p, [src]: { w: im.naturalWidth, h: im.naturalHeight } }));
      im.src = src;
    });
  }, [lista]);

  useEffect(() => {
    if (total < 2 || pausa) return;
    const t = setInterval(() => setActiva((v) => (v + 1) % total), 4500);
    return () => clearInterval(t);
  }, [total, pausa]);

  if (total === 0) return null;

  function mover(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return; // sin lupa en pantallas táctiles
    const el = vista.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  }

  function salir() {
    setCursor(null);
    setPausa(false);
  }

  /** Replica el encuadre de la card (cover + posición + zoom) y lo amplía con la foto original */
  function estiloLupa(): { caja: CSSProperties; imagen: CSSProperties } | null {
    const src = lista[activa];
    const d = src ? dims[src] : undefined;
    if (!cursor || !d) return null;

    const { x, y, w: W, h: H } = cursor;

    // Tamaño y posición de la foto con object-fit: cover y object-position: 50% POS_Y
    const s = Math.max(W / d.w, H / d.h);
    const w0 = d.w * s;
    const h0 = d.h * s;
    const x0 = (W - w0) / 2;
    const y0 = (H - h0) * POS_Y;

    // El zoom de la card se aplica desde el punto (50%, POS_Y)
    const ox = W / 2;
    const oy = H * POS_Y;
    const dx0 = ox + ZOOM * (x0 - ox);
    const dy0 = oy + ZOOM * (y0 - oy);

    // Aumento para que 1 píxel de la foto = 1 píxel físico de la pantalla (máxima nitidez real)
    const dpr = window.devicePixelRatio || 1;
    const pxFotoPorPxCss = d.w / (w0 * ZOOM);
    const aumento = Math.min(AUMENTO_MAX, Math.max(AUMENTO_MIN, pxFotoPorPxCss / dpr));

    return {
      caja: {
        position: 'absolute',
        zIndex: 5,
        overflow: 'hidden',
        borderRadius: '50%',
        pointerEvents: 'none',
        background: '#000',
        boxShadow: '0 0 0 2px #e0b73f, 0 10px 30px rgba(0,0,0,.7), 0 0 24px rgba(224,183,63,.35)',
        width: RADIO * 2,
        height: RADIO * 2,
        left: x - RADIO,
        top: y - RADIO,
      },
      imagen: {
        position: 'absolute',
        inset: 0,
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url("${src}")`,
        backgroundSize: `${w0 * ZOOM * aumento}px ${h0 * ZOOM * aumento}px`,
        backgroundPosition: `${RADIO + aumento * (dx0 - x)}px ${RADIO + aumento * (dy0 - y)}px`,
        // (se quitó el filtro SVG: era lo que dejaba la lupa en negro)
      },
    };
  }

  const lupa = estiloLupa();

  return (
    <div
      className="jks-card"
      style={{ '--zoom': ZOOM, '--pos-y': `${POS_Y * 100}%` } as CSSProperties}
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={salir}
      aria-roledescription="carrusel"
      aria-label="Piezas de la colección"
    >
      {/* Filtro de nitidez (ya no se usa en la lupa; se deja para no alterar el resto) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id="jks-nitidez" colorInterpolationFilters="sRGB">
          <feConvolveMatrix
            order="3"
            preserveAlpha="true"
            kernelMatrix="0 -0.4 0  -0.4 2.6 -0.4  0 -0.4 0"
          />
        </filter>
      </svg>

      <div
        ref={vista}
        className="jks-card-vista"
        style={{ cursor: 'crosshair' }}
        onPointerMove={mover}
      >
        {lista.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`Pieza ${i + 1}`}
            fill
            quality={95}
            priority={i === 0}
            sizes="(max-width: 900px) 100vw, 1400px"
            className="jks-card-img"
            data-activa={i === activa}
            style={{
              objectFit: 'cover',
              objectPosition: `50% ${POS_Y * 100}%`,
              transform: `scale(${ZOOM})`,
              transformOrigin: `50% ${POS_Y * 100}%`,
            }}
          />
        ))}

        {lupa && (
          <div aria-hidden="true" style={lupa.caja}>
            <div style={lupa.imagen} />
          </div>
        )}

        {total > 1 && (
          <div className="jks-card-puntos" role="tablist" aria-label="Seleccionar pieza">
            {lista.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === activa}
                aria-label={`Ver pieza ${i + 1}`}
                data-activa={i === activa}
                onClick={() => setActiva(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}