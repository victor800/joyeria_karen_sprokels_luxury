// 📁 RUTA: src/app/t/[slug]/HeroVideo.tsx   (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useEffect, useRef, useState } from 'react';

type Props = { src: string; poster?: string };

/**
 * Video de fondo del hero, en bucle continuo.
 * - iOS: muted + playsinline como ATRIBUTOS antes de play().
 * - Solo se muestra cuando REALMENTE reproduce (no queda un fotograma congelado).
 * - Ahorro de batería / autoplay bloqueado: arranca con el primer toque o clic (scroll NO cuenta en iOS).
 * - Vigilante: si se pausa o el tiempo deja de avanzar (buffer o loop trabado), lo reanuda.
 * - Solo insiste mientras el hero está en pantalla y la pestaña visible.
 */
export default function HeroVideo({ src, poster }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.controls = false;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('x-webkit-airplay', 'deny');

    let vivo = true;
    let visible = true;
    let ultimo = -1;
    let trabado = 0;

    const reproducir = () => {
      if (!vivo || document.hidden || !visible) return;
      if (!v.paused && !v.ended) return;
      if (v.ended) v.currentTime = 0;
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => { /* bloqueado: reintenta el toque o el vigilante */ });
    };

    /* Gestos válidos para iOS (scroll NO desbloquea la reproducción) */
    const gestos: (keyof DocumentEventMap)[] = ['touchend', 'click', 'keydown'];
    const alGesto = () => reproducir();
    const quitarGestos = () => gestos.forEach((g) => document.removeEventListener(g, alGesto));
    gestos.forEach((g) => document.addEventListener(g, alGesto, { passive: true }));

    const alReproducir = () => { setOn(true); trabado = 0; quitarGestos(); };
    const alTerminar = () => { v.currentTime = 0; reproducir(); };
    const alPausar = () => { if (!document.hidden && visible) window.setTimeout(reproducir, 120); };
    const alVolver = () => { if (!document.hidden) reproducir(); };

    v.addEventListener('playing', alReproducir);
    v.addEventListener('ended', alTerminar);
    v.addEventListener('pause', alPausar);
    v.addEventListener('canplay', reproducir);
    v.addEventListener('loadedmetadata', reproducir);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('pageshow', alVolver);
    window.addEventListener('focus', alVolver);

    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) reproducir();
      }, { threshold: 0.05 });
      io.observe(v);
    }

    const vigilante = window.setInterval(() => {
      if (!vivo || document.hidden || !visible) return;
      if (v.paused || v.ended) { reproducir(); return; }
      if (v.currentTime === ultimo && v.readyState >= 2) {
        if (++trabado >= 2) {
          trabado = 0;
          const d = v.duration;
          v.currentTime = Number.isFinite(d) && d - v.currentTime < 0.3 ? 0 : v.currentTime + 0.01;
          reproducir();
        }
      } else {
        trabado = 0;
      }
      ultimo = v.currentTime;
    }, 1500);

    reproducir();

    return () => {
      vivo = false;
      window.clearInterval(vigilante);
      io?.disconnect();
      quitarGestos();
      v.removeEventListener('playing', alReproducir);
      v.removeEventListener('ended', alTerminar);
      v.removeEventListener('pause', alPausar);
      v.removeEventListener('canplay', reproducir);
      v.removeEventListener('loadedmetadata', reproducir);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('pageshow', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [src]);

  return (
    <>
      <style>{`
        /* Oculta controles y el botón de play de Safari / iOS */
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
      >
        <source src={src} type="video/mp4" />
      </video>
    </>
  );
}