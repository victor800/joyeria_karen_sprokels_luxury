// 📁 RUTA: src/components/dashboard/PedidosEnVivo.tsx   (ARCHIVO NUEVO)
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Pedidos en vivo para el panel:
 * - Cada pocos segundos pide al servidor la lista nueva (router.refresh): sin recargar la página
 *   y sin cerrar ventanas abiertas ni perder lo que se está escribiendo.
 * - Si llegó un pedido nuevo: suena un timbre, aparece un aviso y el título de la pestaña muestra (1).
 * - El navegador solo deja sonar audio después de un primer clic en la página; el botón 🔔 lo activa.
 */
export default function PedidosEnVivo({ cantidad, cadaSegundos = 8 }: { cantidad: number; cadaSegundos?: number }) {
  const router = useRouter();
  const previa = useRef(cantidad);
  const audio = useRef<AudioContext | null>(null);
  const tituloBase = useRef('');
  const [sonido, setSonido] = useState(false);
  const [nuevos, setNuevos] = useState(0);
  const [aviso, setAviso] = useState('');

  /* Activar el audio con la primera interacción (requisito de Chrome/Safari) */
  const activarAudio = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audio.current ??= new Ctx();
      void audio.current.resume();
      setSonido(true);
    } catch { /* sin audio */ }
  };

  useEffect(() => {
    tituloBase.current = document.title.replace(/^\(\d+\)\s*/, '');
    const unaVez = () => activarAudio();
    window.addEventListener('pointerdown', unaVez, { once: true });
    window.addEventListener('keydown', unaVez, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unaVez);
      window.removeEventListener('keydown', unaVez);
    };
  }, []);

  /* Timbre de dos tonos, generado (no necesita archivo de sonido) */
  const timbre = () => {
    const ctx = audio.current;
    if (!ctx || ctx.state !== 'running') return;
    const nota = (frec: number, inicio: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = frec;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + inicio + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + inicio);
      o.stop(ctx.currentTime + inicio + dur + 0.05);
    };
    nota(880, 0, 0.35);
    nota(1318.5, 0.18, 0.5);
    nota(880, 0.75, 0.35);
    nota(1318.5, 0.93, 0.6);
  };

  /* Cuando el servidor trae más pedidos que antes → aviso */
  useEffect(() => {
    const llegaron = cantidad - previa.current;
    previa.current = cantidad;
    if (llegaron <= 0) return;
    timbre();
    setNuevos((n) => n + llegaron);
    setAviso(llegaron === 1 ? '¡Llegó un pedido nuevo!' : `¡Llegaron ${llegaron} pedidos nuevos!`);
    const t = window.setTimeout(() => setAviso(''), 7000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cantidad]);

  /* Contador en el título de la pestaña */
  useEffect(() => {
    if (!tituloBase.current) return;
    document.title = nuevos > 0 ? `(${nuevos}) ${tituloBase.current}` : tituloBase.current;
  }, [nuevos]);

  /* Consulta periódica (se pausa con la pestaña oculta y se pone al día al volver) */
  useEffect(() => {
    const tick = () => { if (!document.hidden) router.refresh(); };
    const id = window.setInterval(tick, Math.max(4, cadaSegundos) * 1000);
    const alVolver = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [router, cadaSegundos]);

  const verlos = () => { setNuevos(0); setAviso(''); };

  return (
    <>
      <style>{`
        .pev-bar { position: fixed; right: 16px; bottom: 16px; z-index: 80; display: flex; align-items: center; gap: 8px; }
        .pev-btn { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 14px; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
          color: #f3e2a6; background: #0b4a2e; border: 1px solid rgba(224,183,63,.55); box-shadow: 0 8px 22px rgba(0,0,0,.25); }
        .pev-btn i { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 0 0 rgba(74,222,128,.6); animation: pev-vivo 2s ease-out infinite; }
        .pev-btn.off { color: #1a1405; background: linear-gradient(135deg, #f0d680, #e0b73f); border-color: transparent; }
        .pev-btn b { min-width: 20px; height: 20px; padding: 0 6px; display: grid; place-items: center; border-radius: 99px; font-size: 11px; color: #0b4a2e; background: #f0d680; }
        @keyframes pev-vivo { to { box-shadow: 0 0 0 9px rgba(74,222,128,0); } }
        .pev-aviso { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); z-index: 90; max-width: calc(100vw - 32px); display: flex; align-items: center; gap: 12px;
          padding: 12px 18px; border-radius: 14px; font-size: 14px; font-weight: 700; color: #f4efdc; background: #06241a; border: 1px solid #e0b73f;
          box-shadow: 0 16px 40px rgba(0,0,0,.35); animation: pev-in .35s cubic-bezier(.2,.7,.2,1) both; }
        .pev-aviso button { border: 0; cursor: pointer; padding: 6px 12px; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 700; color: #1a1405; background: #e0b73f; }
        @keyframes pev-in { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @media (prefers-reduced-motion: reduce) { .pev-btn i, .pev-aviso { animation: none; } }
      `}</style>

      {aviso && (
        <div className="pev-aviso" role="status" aria-live="assertive">
          🔔 {aviso}
          <button type="button" onClick={verlos}>Ver</button>
        </div>
      )}

      <div className="pev-bar">
        <button
          type="button"
          className={`pev-btn${sonido ? '' : ' off'}`}
          onClick={() => { activarAudio(); verlos(); }}
          title={sonido ? 'Pedidos en vivo con sonido' : 'Toca para activar el sonido de pedidos nuevos'}
        >
          <i aria-hidden /> {sonido ? 'En vivo' : '🔔 Activar sonido'}
          {nuevos > 0 && <b>{nuevos}</b>}
        </button>
      </div>
    </>
  );
}