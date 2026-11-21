// 📁 RUTA: src/components/auth/BovedaIntro.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import Image from 'next/image';
import { MARCA } from '@/lib/marca';

type Fase = 'cerrada' | 'abriendo' | 'abierta' | 'fuera';
type Audio = { ctx: AudioContext; out: AudioNode };

// La bóveda se muestra SIEMPRE: cada vez que se abre la app o el login.
const CLAVE_SONIDO = 'jks-boveda-silencio';
const UMBRAL = 220; // grados de giro necesarios para abrir
const T_PUERTA = 6300; // ms hasta que la puerta termina de abrirse
const T_FIN = 7300; // ms hasta quitar el overlay
const T_AUTO = 1100; // ms: se abre sola, sin tocar nada
/** Combinación nueva en cada apertura: 3 números distintos entre 10 y 99 */
function nuevaCombinacion(): number[] {
  const lista: number[] = [];
  while (lista.length < 3) {
    const n = 10 + Math.floor(Math.random() * 90);
    if (!lista.includes(n)) lista.push(n);
  }
  return lista;
}

const PERNOS = Array.from({ length: 8 }, (_, i) => i);
const REMACHES = Array.from({ length: 16 }, (_, i) => i * 22.5);
const DIAL = Array.from({ length: 100 }, (_, i) => i); // 0..99
const RAYOS = [0, 60, 120, 180, 240, 300];

const dos = (n: number) => String(n).padStart(2, '0');

/* ═════════════ Motor de sonido (síntesis, sin archivos) ═════════════ */

function ruido(ctx: AudioContext, dur: number) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  return s;
}

/** Golpe tonal con caída de frecuencia (clank, thud) */
function golpe(a: Audio, t: number, f0: number, f1: number, dur: number, vol: number, tipo: OscillatorType = 'sine') {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(a.out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Ruido filtrado con barrido (deslizar metal, vapor hidráulico) */
function barrido(a: Audio, t: number, dur: number, f0: number, f1: number, vol: number, q = 4) {
  const s = ruido(a.ctx, dur + 0.05);
  const f = a.ctx.createBiquadFilter();
  const g = a.ctx.createGain();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f).connect(g).connect(a.out);
  s.start(t);
  s.stop(t + dur + 0.05);
}

/** Resonancia metálica inarmónica (el "ring" del acero tras un golpe) */
function resonancia(a: Audio, t: number, f: number, vol: number, dur = 1.1) {
  for (const [mult, v] of [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.15]] as const) {
    const o = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur / (1 + mult * 0.12));
    o.connect(g).connect(a.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

/** Un perno que se desliza (raspado grave + metal) y topa con golpe seco */
function perno(a: Audio, ts: number, k: number) {
  barrido(a, ts, 0.7, 780, 210, 0.5, 3);
  const o = a.ctx.createOscillator();
  const lp = a.ctx.createBiquadFilter();
  const g = a.ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(95 - k * 4, ts);
  o.frequency.linearRampToValueAtTime(62, ts + 0.7);
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  g.gain.setValueAtTime(0.0001, ts);
  g.gain.exponentialRampToValueAtTime(0.28, ts + 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, ts + 0.72);
  o.connect(lp).connect(g).connect(a.out);
  o.start(ts);
  o.stop(ts + 0.75);

  const ti = ts + 0.68; // tope del perno
  golpe(a, ti, 230, 70, 0.12, 0.5, 'square');
  golpe(a, ti, 115, 42, 0.32, 0.8, 'sine');
  barrido(a, ti, 0.06, 2400, 1300, 0.45, 1.2);
  resonancia(a, ti, 520 + k * 38, 0.07, 0.9);
}

/** Apertura: SOLO el sonido de los pernos, 4 etapas sincronizadas con la animación CSS */
function apertura(a: Audio) {
  const t0 = a.ctx.currentTime;
  for (let k = 0; k < 4; k++) perno(a, t0 + 0.3 + k * 0.35, k);
}

/* ═════════════ Componente ═════════════ */

export default function BovedaIntro() {
  const [fase, setFase] = useState<Fase>('cerrada');
  const [giro, setGiro] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [silencio, setSilencio] = useState(false);
  const [combinacion, setCombinacion] = useState<number[]>([0, 0, 0]);

  const faseRef = useRef<Fase>('cerrada');
  const silencioRef = useRef(false);
  const rueda = useRef<HTMLButtonElement>(null);
  const audio = useRef<Audio | null>(null);
  const timers = useRef<number[]>([]);
  const drag = useRef({ activo: false, ultimo: 0, movido: 0 });
  const acumulado = useRef(0);

  /* Número que marca el dial (0-99) según el giro de la rueda */
  const valor = (((Math.round((giro * 0.5) / 3.6) % 100) + 100) % 100) as number;
  const bloqueados = fase !== 'cerrada' ? 3 : Math.min(2, Math.floor(progreso * 3));

  const preparar = useCallback((): Audio | null => {
    try {
      if (!audio.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        const ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.connect(ctx.destination);
        audio.current = { ctx, out: comp };
      }
      void audio.current.ctx.resume();
      return audio.current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setCombinacion(nuevaCombinacion()); // código distinto cada vez (solo en cliente)
    try {
      if (localStorage.getItem(CLAVE_SONIDO) === '1') {
        silencioRef.current = true;
        setSilencio(true);
      }
    } catch {
      /* ignorar */
    }
  }, []);

  /* Bloquea el scroll mientras la bóveda está visible */
  useEffect(() => {
    if (fase === 'fuera') return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [fase]);

  useEffect(() => {
    const lista = timers.current;
    return () => lista.forEach((t) => window.clearTimeout(t));
  }, []);

  const abrir = useCallback(
    (conGesto: boolean) => {
      if (faseRef.current !== 'cerrada') return;
      faseRef.current = 'abriendo';
      setFase('abriendo');
      setProgreso(1);
      setGiro((g) => g + 320);

      if (conGesto) {
        try {
          navigator.vibrate?.([40, 920, 70, 280, 70, 280, 70, 280, 70, 470, 500, 120, 700, 150]);
        } catch {
          /* ignorar */
        }
      }
      // Con gesto suena siempre; sin gesto solo si el navegador ya permite audio
      if (!silencioRef.current) {
        const a = preparar();
        if (a && (conGesto || a.ctx.state === 'running')) apertura(a);
      }

      timers.current.push(
        window.setTimeout(() => {
          faseRef.current = 'abierta';
          setFase('abierta');
        }, T_PUERTA),
        window.setTimeout(() => {
          faseRef.current = 'fuera';
          setFase('fuera');
        }, T_FIN),
      );
    },
    [preparar],
  );

  /* Si nadie la toca, se abre sola (sin sonido: el navegador no lo permite sin gesto) */
  useEffect(() => {
    const t = window.setTimeout(() => abrir(false), T_AUTO);
    return () => window.clearTimeout(t);
  }, [abrir]);

  /* ── Interacción: arrastrar la rueda en círculo ── */
  const angulo = (e: ReactPointerEvent) => {
    const r = rueda.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  const alPresionar = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (faseRef.current !== 'cerrada') return;
    preparar(); // el audio se habilita con este gesto
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { activo: true, ultimo: angulo(e), movido: 0 };
    setArrastrando(true);
  };

  const alMover = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.activo || faseRef.current !== 'cerrada') return;
    const a = angulo(e);
    let delta = a - d.ultimo;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.ultimo = a;
    d.movido += Math.abs(delta);
    acumulado.current += Math.abs(delta);
    setGiro((g) => g + delta);
    setProgreso(Math.min(1, acumulado.current / UMBRAL));
    if (acumulado.current >= UMBRAL) {
      d.activo = false;
      setArrastrando(false);
      abrir(true);
    }
  };

  const alSoltar = () => {
    const d = drag.current;
    if (!d.activo) return;
    d.activo = false;
    setArrastrando(false);
    if (d.movido < 6) abrir(true); // un toque / clic también abre
  };

  const alternarSonido = () => {
    const nuevo = !silencioRef.current;
    silencioRef.current = nuevo;
    setSilencio(nuevo);
    try {
      localStorage.setItem(CLAVE_SONIDO, nuevo ? '1' : '0');
    } catch {
      /* ignorar */
    }
    if (!nuevo) {
      const a = preparar();
      if (a) perno(a, a.ctx.currentTime, 0);
    }
  };

  if (fase === 'fuera') return null;

  const estado =
    fase === 'cerrada' ? (
      <>
        Verificando <em>acceso…</em>
      </>
    ) : fase === 'abriendo' ? (
      <>
        Abriendo <em>bóveda…</em>
      </>
    ) : (
      <>
        Acceso <em>concedido</em>
      </>
    );

  return (
    <div
      className="jks-boveda"
      data-fase={fase}
      role="dialog"
      aria-modal="true"
      aria-label="Apertura de la bóveda"
    >
      <button
        type="button"
        className="jks-boveda-sonido"
        onClick={alternarSonido}
        aria-pressed={!silencio}
        aria-label={silencio ? 'Activar sonido' : 'Silenciar sonido'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          {silencio ? (
            <path d="m16 9 5 6M21 9l-5 6" />
          ) : (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          )}
        </svg>
      </button>

      <div className="jks-boveda-marco">
        {/* Interior: lo que se revela al abrir */}
        <div className="jks-boveda-interior" aria-hidden>
          <div className="jks-boveda-rayos" />
          <div className="jks-boveda-logo">
            <Image src={MARCA.logo} alt="" width={1536} height={1024} priority sizes="(max-width: 600px) 45vw, 260px" />
          </div>
        </div>

        {/* Bisagras */}
        <span className="jks-bisagra" style={{ top: '24%' }} aria-hidden />
        <span className="jks-bisagra" style={{ top: '68%' }} aria-hidden />

        {/* Puerta */}
        <div className="jks-boveda-puerta">
          <svg className="jks-puerta-cara" viewBox="0 0 200 200" aria-hidden>
            <defs>
              <radialGradient id="jkMetal" cx="35%" cy="30%" r="85%">
                <stop offset="0" stopColor="#4a4026" />
                <stop offset=".55" stopColor="#17130a" />
                <stop offset="1" stopColor="#070604" />
              </radialGradient>
              <linearGradient id="jkOro" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f3d77a" />
                <stop offset=".45" stopColor="#b8892a" />
                <stop offset=".7" stopColor="#e9c552" />
                <stop offset="1" stopColor="#8a6414" />
              </linearGradient>
              <radialGradient id="jkPlaca" cx="50%" cy="40%" r="60%">
                <stop offset="0" stopColor="#2a2414" />
                <stop offset="1" stopColor="#090703" />
              </radialGradient>
            </defs>

            <circle cx="100" cy="100" r="99" fill="url(#jkMetal)" />
            <circle cx="100" cy="100" r="97" fill="none" stroke="url(#jkOro)" strokeWidth="2.4" />
            <circle cx="100" cy="100" r="92" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="1.5" />
            {REMACHES.map((a) => (
              <circle
                key={a}
                cx="100"
                cy="100"
                r="2.4"
                fill="url(#jkOro)"
                transform={`rotate(${a} 100 100) translate(0 -85)`}
              />
            ))}

            {/* Anillo del dial: gira en sentido contrario a la rueda */}
            <g
              className="jks-anillo"
              style={{ transform: `rotate(${-giro * 0.5}deg)`, transformOrigin: '100px 100px' }}
            >
              <circle cx="100" cy="100" r="76" fill="none" stroke="url(#jkOro)" strokeWidth=".8" strokeOpacity=".7" />
              {DIAL.map((n) => {
                const mayor = n % 10 === 0;
                const medio = n % 5 === 0;
                return (
                  <line
                    key={n}
                    x1="100"
                    y1="25"
                    x2="100"
                    y2={mayor ? 35 : medio ? 31 : 28.5}
                    stroke={mayor ? '#f3d77a' : '#c9a24a'}
                    strokeWidth={mayor ? 1.5 : medio ? 0.9 : 0.5}
                    transform={`rotate(${n * 3.6} 100 100)`}
                  />
                );
              })}
              {DIAL.filter((n) => n % 10 === 0).map((n) => (
                <text
                  key={n}
                  x="100"
                  y="49"
                  textAnchor="middle"
                  fontSize="8.2"
                  fontWeight="600"
                  fill="#e9c552"
                  style={{ fontFamily: 'var(--jks-serif), serif' }}
                  transform={`rotate(${n * 3.6} 100 100)`}
                >
                  {n}
                </text>
              ))}
            </g>

            {/* Marcador fijo (aguja roja) */}
            <polygon points="95.5,16.5 104.5,16.5 100,27" fill="#e5484d" stroke="#2a0c0c" strokeWidth=".7" />

            <circle cx="100" cy="100" r="49" fill="url(#jkPlaca)" stroke="url(#jkOro)" strokeWidth="1.6" />
          </svg>

          {/* Pernos que se retraen en cascada */}
          {PERNOS.map((i) => (
            <span
              key={i}
              className="jks-bol"
              style={{ '--a': `${i * 45}deg`, '--s': i % 4 } as CSSProperties}
              aria-hidden
            >
              <i />
            </span>
          ))}

          {/* Rueda interactiva */}
          <button
            ref={rueda}
            type="button"
            className="jks-rueda"
            data-arrastrando={arrastrando}
            data-reposo={fase === 'cerrada' && !arrastrando}
            style={{ '--giro': giro } as CSSProperties}
            aria-label="Abrir la bóveda"
            onPointerDown={alPresionar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
            onClick={(e) => {
              if (e.detail === 0) abrir(true); // teclado: Enter / Espacio
            }}
          >
            <svg viewBox="-54 -54 108 108" aria-hidden>
              {RAYOS.map((a) => (
                <g key={a} transform={`rotate(${a})`}>
                  <line x1="0" y1="0" x2="0" y2="-46" stroke="url(#jkOro)" strokeWidth="5.5" strokeLinecap="round" />
                  <circle cx="0" cy="-48" r="5.2" fill="url(#jkOro)" stroke="#3b2c0a" strokeWidth=".8" />
                </g>
              ))}
              <circle r="38" fill="none" stroke="url(#jkOro)" strokeWidth="5" />
              <circle r="38" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="1" />
              <circle r="14" fill="url(#jkOro)" stroke="#3b2c0a" strokeWidth="1" />
              <circle r="6" fill="#120d04" />
              <circle r="2.2" fill="#e0b73f" />
            </svg>
          </button>
        </div>

        <div className="jks-boveda-destello" aria-hidden />
      </div>

      <div className="jks-boveda-textos">
        {/* Combinación: se bloquea un número por cada tercio del giro */}
        <div className="jks-boveda-combo" aria-hidden>
          {combinacion.map((n, i) => {
            const bloq = i < bloqueados;
            const activo = !bloq && i === bloqueados && fase === 'cerrada';
            return (
              <span
                key={i}
                className="jks-combo-caja"
                data-estado={bloq ? 'bloqueado' : activo ? 'activo' : 'pendiente'}
              >
                {bloq ? dos(n) : activo ? dos(valor) : '––'}
              </span>
            );
          })}
        </div>
        <p className="jks-boveda-estado" aria-live="polite">
          {estado}
        </p>
        <div className="jks-boveda-barra" aria-hidden>
          <i style={{ '--p': progreso } as CSSProperties} />
        </div>
        <button
          type="button"
          className="jks-boveda-saltar"
          onClick={() => abrir(true)}
          disabled={fase !== 'cerrada'}
        >
          ENTRAR
        </button>
      </div>
    </div>
  );
}