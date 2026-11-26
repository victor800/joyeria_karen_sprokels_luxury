// 📁 RUTA: src/app/t/[slug]/HeroVideo.tsx   (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useEffect, useRef, useState } from 'react';

type Props = { src: string; poster?: string };

/**
 * Video de fondo del hero.
 * - iOS: fuerza muted + playsinline desde JavaScript (React no siempre escribe `muted` en el HTML),
 *   oculta el botón de play de Safari y reintenta el play() si iOS lo bloquea.
 * - Android / escritorio: se comporta igual que antes.
 */
export default function HeroVideo({ src, poster }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // iOS solo permite autoplay si el video está silenciado ANTES de llamar a play()
    v.muted = true;
    v.defaultMuted = true;
    v.volume = 0;
    v.loop = true;
    v.controls = false;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');

    let desbloqueado = false;

    const intentar = () => {
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // iOS bloqueó el autoplay (modo ahorro de batería, etc.): se reintenta al primer gesto
        });
      }
    };

    const alGesto = () => {
      if (desbloqueado) return;
      desbloqueado = true;
      intentar();
      limpiarGestos();
    };
    const gestos: (keyof WindowEventMap)[] = ['touchstart', 'touchend', 'pointerdown', 'click', 'scroll', 'keydown'];
    const limpiarGestos = () => gestos.forEach((g) => window.removeEventListener(g, alGesto));
    gestos.forEach((g) => window.addEventListener(g, alGesto, { passive: true, once: false }));

    const mostrar = () => setOn(true);
    const alReproducir = () => { setOn(true); desbloqueado = true; limpiarGestos(); };
    const alVolver = () => { if (document.visibilityState === 'visible' && v.paused) intentar(); };

    v.addEventListener('loadeddata', mostrar);
    v.addEventListener('canplay', intentar);
    v.addEventListener('playing', alReproducir);
    v.addEventListener('pause', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('pageshow', intentar);

    if (v.readyState >= 2) mostrar();
    intentar();

    return () => {
      limpiarGestos();
      v.removeEventListener('loadeddata', mostrar);
      v.removeEventListener('canplay', intentar);
      v.removeEventListener('playing', alReproducir);
      v.removeEventListener('pause', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('pageshow', intentar);
    };
  }, [src]);

  return (
    <>
      <style>{`
        /* Oculta por completo los controles y el botón de play de Safari / iOS */
        .hv::-webkit-media-controls,
        .hv::-webkit-media-controls-panel,
        .hv::-webkit-media-controls-play-button,
        .hv::-webkit-media-controls-start-playback-button,
        .hv::-webkit-media-controls-overlay-play-button,
        .hv::-webkit-media-controls-enclosure { display: none !important; opacity: 0 !important; -webkit-appearance: none; appearance: none; pointer-events: none; }
        .hv { pointer-events: none; -webkit-touch-callout: none; user-select: none; }
      `}</style>
      <video
        ref={ref}
        className={`hv${on ? ' on' : ''}`}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload nofullscreen noremoteplayback"
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  );
}