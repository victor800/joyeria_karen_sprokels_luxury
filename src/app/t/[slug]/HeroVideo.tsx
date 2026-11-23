// 📁 RUTA: src/app/t/[slug]/HeroVideo.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

/** Acepta un enlace de Google Drive (…/file/d/ID/view, …?id=ID) o una URL directa a un .mp4 (p. ej. /sprokel.mp4) */
const driveId = (u: string) => u.match(/\/d\/([\w-]{10,})/)?.[1] ?? u.match(/[?&]id=([\w-]{10,})/)?.[1] ?? '';
const resolver = (u: string) => {
  const id = driveId(u);
  return id ? `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t` : u;
};

/** Video de fondo: sin sonido, en bucle, con fundido suave. Si no carga, queda el fondo verde. */
export default function HeroVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.playbackRate = 0.6; // cámara lenta suave

    // El video puede arrancar antes de que React enganche los eventos: se revisa el estado real
    const revisar = () => { v.playbackRate = 0.6; if (v.readyState >= 2) setListo(true); };
    revisar();
    v.addEventListener('loadeddata', revisar);
    v.addEventListener('canplay', revisar);

    // Con "reducir movimiento" activo se muestra el primer cuadro, quieto
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.play().then(revisar).catch(() => {});
    }
    return () => { v.removeEventListener('loadeddata', revisar); v.removeEventListener('canplay', revisar); };
  }, [src]);

  if (!src || fallo) return null;
  return (
    <video ref={ref} className={`hv${listo ? ' on' : ''}`} src={resolver(src)}
      autoPlay muted loop playsInline preload="auto" aria-hidden tabIndex={-1}
      onError={() => setFallo(true)} />
  );
}