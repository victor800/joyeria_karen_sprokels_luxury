// 📁 RUTA: src/components/auth/AnilloPiezas.tsx
'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import Image from 'next/image';

/** Encuadre de la foto en la card */
const ZOOM = 1;
const POS_Y = 0.2;

/** Lupa (solo ratón / computador) */
const RADIO = 70;
const AUMENTO_MIN = 1.6;
const AUMENTO_MAX = 4;

/** Velocidad del recorrido por cada pieza */
const DURACION_MS = 13000;
const EASE = 'cubic-bezier(0.45, 0, 0.25, 1)';

/** ─────────── Configuración POR PIEZA ───────────
 *  El orden coincide con tus archivos: pieza.jpeg = 0, pieza1.jpeg = 1, pieza2.jpeg = 2 ...
 *
 *  focos   = a dónde se acerca la cámara, en orden (puedes poner 1, 2, 3 o 4)
 *            x, y = punto de la foto (0 a 1) · z = acercamiento (1 = foto completa)
 *  brillos = chispas de oro en plano general
 *            x, y = posición (0 a 1) · s = tamaño en px · d = retraso en segundos
 */
type Foco = { x: number; y: number; z: number };
type Brillo = { x: number; y: number; s: number; d: number };
type Config = { focos: Foco[]; brillos: Brillo[] };

const CONFIG: Config[] = [
  // Pieza 0: colgante sobre maniquí
  {
    focos: [
      { x: 0.5, y: 0.66, z: 2.8 }, // llega al colgante
      { x: 0.5, y: 0.66, z: 3.1 }, // detalle del colgante
      { x: 0.46, y: 0.42, z: 2.3 }, // sube por la cadena
    ],
    brillos: [
      { x: 0.5, y: 0.66, s: 34, d: 0 },
      { x: 0.4, y: 0.44, s: 18, d: 0.7 },
      { x: 0.6, y: 0.4, s: 16, d: 1.3 },
      { x: 0.5, y: 0.66, s: 14, d: 1.9 },
    ],
  },

    // Pieza 1: recorrido suave, de izquierda a derecha
  {
    focos: [
      { x: 0.35, y: 0.4, z: 1.7 },
      { x: 0.5, y: 0.5, z: 1.9 },
      { x: 0.65, y: 0.6, z: 1.7 },
    ],
    brillos: [
      { x: 0.35, y: 0.4, s: 26, d: 0.2 },
      { x: 0.5, y: 0.5, s: 30, d: 0.9 },
      { x: 0.65, y: 0.6, s: 24, d: 1.5 },
    ],
  },
  // Pieza 2: recorrido suave, de arriba hacia abajo
  {
    focos: [
      { x: 0.5, y: 0.3, z: 1.7 },
      { x: 0.5, y: 0.5, z: 1.9 },
      { x: 0.5, y: 0.7, z: 1.7 },
    ],
    brillos: [
      { x: 0.4, y: 0.3, s: 26, d: 0.3 },
      { x: 0.55, y: 0.5, s: 30, d: 1.0 },
      { x: 0.45, y: 0.7, s: 24, d: 1.6 },
    ],
  },
];

/** Para las piezas 3, 4, 5... que no tengan configuración propia */
const DEFECTO: Config = {
  focos: [
    { x: 0.4, y: 0.45, z: 1.7 },
    { x: 0.6, y: 0.55, z: 1.7 },
  ],
  brillos: [
    { x: 0.4, y: 0.45, s: 26, d: 0 },
    { x: 0.6, y: 0.55, s: 26, d: 1.0 },
  ],
};

/** Arma el recorrido: plano general → focos → vuelve al plano general */
function construirPlanos(focos: Foco[]) {
  const planos = [
    { t: 0.0, x: 0.5, y: 0.5, z: 1 },
    { t: 0.1, x: 0.5, y: 0.5, z: 1 },
  ];
  const n = focos.length;
  focos.forEach((f, i) => {
    const t = n === 1 ? 0.3 : 0.3 + (i * 0.48) / (n - 1);
    planos.push({ t, ...f });
  });
  if (n === 1) planos.push({ t: 0.7, ...focos[0], z: focos[0].z * 1.1 });
  planos.push({ t: 0.9, x: 0.5, y: 0.5, z: 1.15 });
  planos.push({ t: 1.0, x: 0.5, y: 0.5, z: 1 });
  return planos;
}

/** Cuándo se ven los destellos dentro del recorrido (solo en plano general) */
const VISIBLE = [
  { t: 0.0, o: 0 },
  { t: 0.04, o: 1 },
  { t: 0.1, o: 1 },
  { t: 0.16, o: 0 },
  { t: 0.84, o: 0 },
  { t: 0.9, o: 1 },
  { t: 0.97, o: 1 },
  { t: 1.0, o: 0 },
];

type Cursor = { x: number; y: number; w: number; h: number };
type Dim = { w: number; h: number };

const VACIO: string[] = [];

export default function AnilloPiezas({ piezas = VACIO }: { piezas?: string[] }) {
  const lista = Array.isArray(piezas) ? piezas : VACIO;
  const total = lista.length;

  const [activa, setActiva] = useState(0);
  const [pausa, setPausa] = useState(false); // true mientras el mouse está encima
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [dims, setDims] = useState<Record<string, Dim>>({});
  const [tactil, setTactil] = useState(false);
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null);
  const vista = useRef<HTMLDivElement>(null);
  const imgAuto = useRef<HTMLImageElement>(null);
  const brillo = useRef<HTMLDivElement>(null);

  // ¿Pantalla táctil? (solo para decidir si hay lupa de mouse)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const f = () => setTactil(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);

  // Tamaño real de la card
  useEffect(() => {
    const el = vista.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      setTam((p) => (p && p.w === w && p.h === h ? p : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [total]);

  // Carga las fotos ORIGINALES: dan el tamaño real y quedan en caché
  useEffect(() => {
    lista.forEach((src) => {
      const im = new window.Image();
      im.onload = () =>
        setDims((p) => (p[src] ? p : { ...p, [src]: { w: im.naturalWidth, h: im.naturalHeight } }));
      im.src = src;
    });
  }, [lista]);

  const srcActiva = lista[activa];
  const dActiva = srcActiva ? dims[srcActiva] : undefined;
  const cfg = CONFIG[activa] ?? DEFECTO;

  /** Geometría de la foto dentro de la card (equivale a object-fit: cover + POS_Y) */
  function geometria(d: Dim, W: number, H: number) {
    const s = Math.max(W / d.w, H / d.h);
    const w0 = d.w * s;
    const h0 = d.h * s;
    return { w0, h0, x0: (W - w0) / 2, y0: (H - h0) * POS_Y };
  }

  // Recorrido automático + destellos de la pieza activa
  useEffect(() => {
    if (pausa || !tam || !dActiva) return;
    const el = imgAuto.current;
    if (!el || typeof el.animate !== 'function') return;

    const { w: W, h: H } = tam;
    const g = geometria(dActiva, W, H);
    const dpr = window.devicePixelRatio || 1;
    // Límite de acercamiento según la resolución real de la foto (evita que se pixele)
    const zMax = Math.max(1.4, (1.5 * dActiva.w) / (g.w0 * dpr));
    const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

    const keyframes = construirPlanos(cfg.focos).map((p) => {
      const z = Math.min(p.z, zMax);
      let transform = 'translate(0px, 0px) scale(1)';
      if (z > 1.001) {
        const tx = clamp(W / 2 - g.x0 - z * p.x * g.w0, W - g.x0 - z * g.w0, -g.x0);
        const ty = clamp(H / 2 - g.y0 - z * p.y * g.h0, H - g.y0 - z * g.h0, -g.y0);
        transform = `translate(${tx}px, ${ty}px) scale(${z})`;
      }
      return { transform, offset: p.t, easing: EASE };
    });

    // Con 1 pieza el recorrido se repite; con 2 o más, al terminar pasa a la siguiente
    const anim = el.animate(keyframes, {
      duration: DURACION_MS,
      fill: 'both',
      iterations: total > 1 ? 1 : Infinity,
    });
    anim.onfinish = () => {
      if (total > 1) setActiva((v) => (v + 1) % total);
    };

    const b = brillo.current;
    const animBrillo =
      b && typeof b.animate === 'function'
        ? b.animate(
            VISIBLE.map((v) => ({ opacity: v.o, offset: v.t, easing: 'linear' })),
            { duration: DURACION_MS, fill: 'both', iterations: total > 1 ? 1 : Infinity },
          )
        : null;

    return () => {
      anim.cancel();
      animBrillo?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausa, activa, dActiva, tam, total]);

  if (total === 0) return null;

  // Lupa manual: solo ratón
  function mover(e: PointerEvent<HTMLDivElement>) {
    if (tactil || e.pointerType !== 'mouse') return;
    const el = vista.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  }

  function entrar() {
    if (!tactil) setPausa(true);
  }

  function salir() {
    setCursor(null);
    setPausa(false);
  }

  function estiloLupa(): { caja: CSSProperties; imagen: CSSProperties } | null {
    const src = lista[activa];
    const d = src ? dims[src] : undefined;
    if (!cursor || !d) return null;

    const { x, y, w: W, h: H } = cursor;
    const { w0, h0, x0, y0 } = geometria(d, W, H);

    const ox = W / 2;
    const oy = H * POS_Y;
    const dx0 = ox + ZOOM * (x0 - ox);
    const dy0 = oy + ZOOM * (y0 - oy);

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
      },
    };
  }

  const lupa = tactil ? null : estiloLupa();
  // El recorrido se muestra siempre, salvo mientras el mouse usa la lupa
  const gAuto = !pausa && tam && dActiva ? geometria(dActiva, tam.w, tam.h) : null;

  return (
    <div
      className="jks-card"
      style={{ '--zoom': ZOOM, '--pos-y': `${POS_Y * 100}%` } as CSSProperties}
      onMouseEnter={entrar}
      onMouseLeave={salir}
      aria-roledescription="carrusel"
      aria-label="Piezas de la colección"
    >
      <div
        ref={vista}
        className="jks-card-vista"
        style={{ cursor: tactil ? 'default' : 'crosshair' }}
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

        {/* Recorrido automático de la pieza activa (foto original) */}
        {gAuto && (
          <>
            {/* key = pieza: cada pieza entra con su propio fundido */}
            <div key={`a-${srcActiva}`} className="jks-auto" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgAuto}
                src={srcActiva}
                alt=""
                draggable={false}
                style={{ left: gAuto.x0, top: gAuto.y0, width: gAuto.w0, height: gAuto.h0 }}
              />
            </div>

            {/* Destellos de oro propios de cada pieza */}
            <div key={`b-${srcActiva}`} ref={brillo} className="jks-brillo" aria-hidden="true">
              {cfg.brillos.map((b, i) => (
                <span
                  key={i}
                  className="jks-chispa"
                  style={
                    {
                      left: gAuto.x0 + b.x * gAuto.w0,
                      top: gAuto.y0 + b.y * gAuto.h0,
                      '--t': `${b.s}px`,
                      '--d': `${b.d}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          </>
        )}

        {lupa && (
          <div aria-hidden="true" style={lupa.caja}>
            <div style={lupa.imagen} />
          </div>
        )}

      
      </div>
    </div>
  );
}