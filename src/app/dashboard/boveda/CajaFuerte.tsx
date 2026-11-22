// 📁 RUTA: src/app/dashboard/boveda/CajaFuerte.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SERIE = 'JKS-BV-2026-0417';
const MAX = 8;
type Fase = 'cerrada' | 'abriendo' | 'abierta';

type Props = {
  /** Logo de la joyería (p. ej. config.logo_url). Si falta, se muestra el texto */
  logoUrl?: string;
  /** Endpoint que valida el código. Debe responder 200 si es correcto y 401/400 si no */
  endpoint?: string;
  /** Nombre del campo que recibe el código en el body JSON */
  campo?: string;
  /** Se ejecuta al terminar la animación. Por defecto recarga la página para que cargue la bóveda */
  onAbierta?: () => void;
};

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const;

export default function CajaFuerte({ logoUrl, endpoint = '/api/boveda/abrir', campo = 'codigo', onAbierta }: Props) {
  const [codigo, setCodigo] = useState('');
  const [fase, setFase] = useState<Fase>('cerrada');
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [sacudir, setSacudir] = useState(false);
  const [giro, setGiro] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const libre = fase === 'cerrada' && !verificando;

  const digitar = useCallback((d: string) => {
    if (!libre) return;
    setError('');
    setCodigo((c) => (c.length < MAX ? c + d : c));
    setGiro((g) => g + 36);
  }, [libre]);

  const borrar = useCallback(() => {
    if (!libre) return;
    setError('');
    setCodigo((c) => c.slice(0, -1));
    setGiro((g) => g - 36);
  }, [libre]);

  const abrir = useCallback(() => {
    setFase('abriendo');
    timers.current.push(setTimeout(() => setFase('abierta'), 2500));
    timers.current.push(setTimeout(() => (onAbierta ? onAbierta() : window.location.reload()), 4200));
  }, [onAbierta]);

  const confirmar = useCallback(async () => {
    if (!libre || !codigo) return;
    setVerificando(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: codigo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Código incorrecto');
      }
      abrir();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código incorrecto');
      setCodigo('');
      setSacudir(true);
      timers.current.push(setTimeout(() => setSacudir(false), 520));
    } finally {
      setVerificando(false);
    }
  }, [libre, codigo, endpoint, campo, abrir]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) digitar(e.key);
      else if (e.key === 'Backspace') borrar();
      else if (e.key === 'Enter') confirmar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [digitar, borrar, confirmar]);

  const estadoLed = fase !== 'cerrada' ? 'ok' : error ? 'mal' : verificando ? 'espera' : 'idle';

  return (
    <section className={`cf-escena ${fase}`} aria-label="Caja fuerte de la bóveda">
      <style>{CSS}</style>

      <div className="cf-titulo">
        <h1>Bóveda de oro</h1>
        <p>Piezas en custodia y solicitudes de retiro. Ingresa tu código para abrir.</p>
      </div>

      <div className={`cf-caja ${sacudir ? 'sacude' : ''}`}>
        {/* Remaches del marco */}
        <i className="cf-rem a" /><i className="cf-rem b" /><i className="cf-rem c" /><i className="cf-rem d" />

        {/* Placa de serie */}
        <div className="cf-serie" aria-label={`Número de serie ${SERIE}`}>
          <span>SERIE N.º</span><b>{SERIE}</b><span>MOD. CF-900 · ACERO 24K</span>
        </div>

        <div className="cf-hueco">
          {/* ---------- Interior (se ve al abrir) ---------- */}
          <div className="cf-interior" aria-hidden>
            <div className="cf-luz" />
            {[0, 1, 2].map((n) => (
              <div className="cf-repisa" key={n}>
                {Array.from({ length: n === 1 ? 4 : 3 }).map((_, i) => (
                  <span key={i} className={`cf-lingote l${(n + i) % 3}`} />
                ))}
                {n === 0 && <Gema />}
                {n === 2 && <Gema />}
              </div>
            ))}
            <div className="cf-abierta-txt">BÓVEDA ABIERTA</div>
          </div>

          {/* Bisagras */}
          <i className="cf-bisagra h1" /><i className="cf-bisagra h2" /><i className="cf-bisagra h3" />

          {/* ---------- Puerta ---------- */}
          <div className="cf-puerta">
            <div className="cf-frente">
              <div className="cf-panel">
                <div className="cf-marca">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Karen Sprockel's Luxury" />
                  ) : (
                    <span>KAREN SPROCKEL&apos;S<br /><em>LUXURY</em></span>
                  )}
                </div>

                {/* Dial */}
                <div className="cf-dial" aria-hidden>
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="56" className="d-aro" />
                    <g style={{ transform: `rotate(${giro}deg)`, transformOrigin: '60px 60px', transition: 'transform .35s cubic-bezier(.2,.8,.3,1)' }}>
                      {Array.from({ length: 40 }).map((_, i) => (
                        <line key={i} x1="60" y1="8" x2="60" y2={i % 5 === 0 ? 17 : 13} transform={`rotate(${i * 9} 60 60)`} className="d-tic" />
                      ))}
                      <circle cx="60" cy="60" r="38" className="d-cuerpo" />
                      {[0, 60, 120, 180, 240, 300].map((a) => (
                        <line key={a} x1="60" y1="60" x2="60" y2="26" transform={`rotate(${a} 60 60)`} className="d-radio" />
                      ))}
                      <circle cx="60" cy="60" r="9" className="d-centro" />
                    </g>
                    <path d="M60 2 l5 9 h-10z" className="d-flecha" />
                  </svg>
                </div>

                {/* Pantalla */}
                <div className={`cf-pantalla ${estadoLed}`} role="status" aria-live="polite">
                  <i className="cf-led" />
                  {codigo ? (
                    <span className="cf-puntos">{codigo.split('').map((_, i) => <b key={i} />)}</span>
                  ) : (
                    <span className="cf-ph">
                      {fase !== 'cerrada' ? 'ACCESO CONCEDIDO' : verificando ? 'Verificando…' : error || 'Ingresa el código'}
                    </span>
                  )}
                </div>

                {/* Teclado */}
                <div className="cf-teclas">
                  {TECLAS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={t === 'ok' ? 'ok' : t === 'del' ? 'del' : ''}
                      disabled={!libre}
                      aria-label={t === 'ok' ? 'Confirmar' : t === 'del' ? 'Borrar' : t}
                      onClick={() => (t === 'ok' ? confirmar() : t === 'del' ? borrar() : digitar(t))}
                    >
                      {t === 'ok' ? '✓' : t === 'del' ? '⌫' : t}
                    </button>
                  ))}
                </div>

                <div className="cf-pie"><span>N.º {SERIE}</span><span>● CERRADURA ELECTRÓNICA</span></div>
              </div>

              {/* Pernos (se retraen al abrir) */}
              <i className="cf-perno p1" /><i className="cf-perno p2" /><i className="cf-perno p3" />
            </div>
            <div className="cf-dorso" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Gema() {
  return (
    <svg className="cf-gema" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" />
    </svg>
  );
}

const CSS = `
.cf-escena { min-height: calc(100vh - 150px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 18px 12px 30px; }
.cf-titulo { text-align: center; }
.cf-titulo h1 { margin: 0 0 4px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 28px; color: #0b2d1f; }
.cf-titulo p { margin: 0; font-size: 13px; color: #6b7a72; }

.cf-caja { position: relative; width: min(94vw, 600px); padding: 30px 30px 26px; border-radius: 30px;
  background: linear-gradient(145deg, #3a4a42 0%, #1d2a24 40%, #101a15 100%);
  box-shadow: 0 40px 80px rgba(5,20,13,.45), 0 0 0 2px #0a120e, inset 0 2px 0 rgba(255,255,255,.18), inset 0 -3px 8px rgba(0,0,0,.5); }
.cf-caja.sacude { animation: cfsac .5s both; }
@keyframes cfsac { 0%,100% { transform: none; } 20% { transform: translateX(-10px); } 40% { transform: translateX(9px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(4px); } }

.cf-rem { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #f0d680, #8a6d25); box-shadow: 0 1px 2px #000; }
.cf-rem.a { top: 12px; left: 12px; } .cf-rem.b { top: 12px; right: 12px; } .cf-rem.c { bottom: 12px; left: 12px; } .cf-rem.d { bottom: 12px; right: 12px; }

.cf-serie { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 6px 16px; border-radius: 8px; white-space: nowrap; z-index: 5;
  background: linear-gradient(180deg, #e9d28a, #b08d3c); color: #2a2008; box-shadow: 0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.6); }
.cf-serie span { font-size: 8.5px; letter-spacing: .16em; font-weight: 700; opacity: .8; }
.cf-serie b { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; letter-spacing: .1em; }

.cf-hueco { position: relative; perspective: 1700px; border-radius: 20px; background: #050b08; box-shadow: inset 0 0 0 3px #0a120e, inset 0 10px 30px #000; }

/* Interior */
.cf-interior { position: absolute; inset: 6px; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-evenly; padding: 14px 18px;
  background: linear-gradient(180deg, #0d2a1e, #061610); }
.cf-luz { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 30%, rgba(236,208,122,.35), transparent 65%); opacity: 0; transition: opacity 1.2s .8s; }
.abriendo .cf-luz, .abierta .cf-luz { opacity: 1; }
.cf-repisa { position: relative; display: flex; align-items: flex-end; justify-content: center; gap: 10px; height: 26%; border-bottom: 5px solid #1b3a2b; padding-bottom: 4px; box-shadow: 0 6px 10px -6px rgba(0,0,0,.8); }
.cf-lingote { display: block; width: 62px; height: 26px; border-radius: 4px 4px 2px 2px; clip-path: polygon(10% 0, 90% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, #f6e3a0, #c9a548 55%, #8a6d25); box-shadow: 0 2px 6px rgba(0,0,0,.6); }
.cf-lingote.l1 { height: 22px; width: 54px; } .cf-lingote.l2 { height: 30px; }
.cf-gema { color: #8fe3c0; filter: drop-shadow(0 0 8px rgba(143,227,192,.7)); margin-left: 8px; }
.cf-abierta-txt { position: absolute; left: 0; right: 0; bottom: 8px; text-align: center; font-size: 10px; letter-spacing: .4em; color: #ecd07a; opacity: 0; transition: opacity .6s 1.6s; }
.abierta .cf-abierta-txt { opacity: 1; }

/* Bisagras */
.cf-bisagra { position: absolute; left: -12px; width: 16px; height: 48px; border-radius: 6px; z-index: 4;
  background: linear-gradient(90deg, #6f5716, #ecd07a 45%, #8a6d25); box-shadow: 0 3px 6px rgba(0,0,0,.6); }
.cf-bisagra.h1 { top: 12%; } .cf-bisagra.h2 { top: 44%; } .cf-bisagra.h3 { bottom: 12%; }

/* Puerta */
.cf-puerta { position: relative; transform-origin: left center; transform-style: preserve-3d; transition: transform 1.5s cubic-bezier(.5,0,.25,1) .95s; }
.abriendo .cf-puerta, .abierta .cf-puerta { transform: rotateY(-100deg); }
.cf-frente, .cf-dorso { backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 20px; }
.cf-frente { position: relative; padding: 14px;
  background: linear-gradient(150deg, #2a6a4a 0%, #1b4a34 35%, #0f3022 100%);
  box-shadow: inset 0 0 0 2px #0a291d, inset 0 2px 0 rgba(255,255,255,.18), inset 0 -6px 14px rgba(0,0,0,.45); }
.cf-dorso { position: absolute; inset: 0; transform: rotateY(180deg); background: linear-gradient(90deg, #12251c, #26382f); box-shadow: inset 0 0 40px #000; }

.cf-panel { padding: 18px 20px 14px; border-radius: 14px; border: 1.5px solid rgba(216,185,95,.65); display: grid; gap: 14px; justify-items: center;
  background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,.18)); }

.cf-marca { min-height: 42px; display: grid; place-items: center; text-align: center; }
.cf-marca img { max-height: 54px; max-width: 150px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,.5)); }
.cf-marca span { font-size: 12px; letter-spacing: .26em; color: #ecd07a; font-weight: 600; line-height: 1.5; }
.cf-marca em { font-family: var(--jks-serif, Georgia), serif; letter-spacing: .18em; font-size: 13px; }

.cf-dial { width: 132px; height: 132px; border-radius: 50%; padding: 4px; background: radial-gradient(circle at 35% 30%, #4f8a6c, #14392a 70%); box-shadow: 0 10px 22px rgba(0,0,0,.55), inset 0 2px 3px rgba(255,255,255,.25); }
.cf-dial svg { width: 100%; height: 100%; display: block; }
.d-aro { fill: none; stroke: #c9a548; stroke-width: 2; }
.d-tic { stroke: #ecd07a; stroke-width: 1.3; stroke-linecap: round; }
.d-cuerpo { fill: url(#none); fill: #123a29; stroke: #c9a548; stroke-width: 1.5; }
.d-radio { stroke: #d8b95f; stroke-width: 5; stroke-linecap: round; }
.d-centro { fill: #ecd07a; stroke: #8a6d25; stroke-width: 2; }
.d-flecha { fill: #ecd07a; }

.cf-pantalla { width: 100%; height: 50px; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 16px; background: #04100b; border: 1px solid rgba(216,185,95,.3); box-shadow: inset 0 4px 12px #000; }
.cf-led { flex-shrink: 0; width: 10px; height: 10px; border-radius: 50%; background: #e0951d; box-shadow: 0 0 8px #e0951d; }
.cf-pantalla.mal .cf-led { background: #e5473a; box-shadow: 0 0 10px #e5473a; }
.cf-pantalla.ok .cf-led { background: #44e08a; box-shadow: 0 0 12px #44e08a; }
.cf-pantalla.espera .cf-led { animation: cfpar .6s infinite alternate; }
@keyframes cfpar { to { opacity: .25; } }
.cf-ph { flex: 1; text-align: center; font-size: 13.5px; letter-spacing: .06em; color: rgba(216,185,95,.7); }
.cf-pantalla.mal .cf-ph { color: #ff8b80; } .cf-pantalla.ok .cf-ph { color: #7dffb4; letter-spacing: .2em; font-weight: 700; }
.cf-puntos { flex: 1; display: flex; justify-content: center; gap: 10px; }
.cf-puntos b { width: 11px; height: 11px; border-radius: 50%; background: #ecd07a; box-shadow: 0 0 8px rgba(236,208,122,.8); }

.cf-teclas { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.cf-teclas button { height: 52px; border-radius: 12px; cursor: pointer; font: inherit; font-size: 19px; font-weight: 600; color: #ecd07a;
  background: linear-gradient(180deg, #1f5a3f, #123a29); border: 1px solid rgba(216,185,95,.4);
  box-shadow: 0 4px 0 #07211a, 0 6px 10px rgba(0,0,0,.4); transition: transform .08s, box-shadow .08s, filter .15s; }
.cf-teclas button:hover:not(:disabled) { filter: brightness(1.2); }
.cf-teclas button:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 #07211a; }
.cf-teclas button:disabled { opacity: .55; cursor: not-allowed; }
.cf-teclas button:focus-visible { outline: 2px solid #ecd07a; outline-offset: 2px; }
.cf-teclas .ok { color: #1c1608; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); box-shadow: 0 4px 0 #6f5716, 0 6px 10px rgba(0,0,0,.4); }
.cf-teclas .ok:active:not(:disabled) { box-shadow: 0 1px 0 #6f5716; }

.cf-pie { width: 100%; display: flex; justify-content: space-between; gap: 8px; font-family: ui-monospace, Menlo, monospace; font-size: 9px; letter-spacing: .1em; color: rgba(216,185,95,.6); }

/* Pernos */
.cf-perno { position: absolute; right: -16px; width: 30px; height: 40px; border-radius: 6px; z-index: 3;
  background: linear-gradient(180deg, #f6e3a0, #b08d3c 55%, #6f5716); box-shadow: 0 3px 8px rgba(0,0,0,.6);
  transition: transform .7s cubic-bezier(.6,0,.3,1); }
.cf-perno.p1 { top: 16%; } .cf-perno.p2 { top: 47%; } .cf-perno.p3 { bottom: 16%; }
.abriendo .cf-perno, .abierta .cf-perno { transform: translateX(-26px); }

.abierta .cf-caja { animation: cfsal .6s 1.2s both; }
@keyframes cfsal { to { opacity: .0; transform: scale(1.05); } }

@media (max-width: 480px) {
  .cf-caja { padding: 26px 16px 20px; border-radius: 24px; }
  .cf-panel { padding: 14px 12px 10px; gap: 12px; }
  .cf-dial { width: 108px; height: 108px; }
  .cf-teclas button { height: 48px; }
  .cf-serie { gap: 6px; padding: 5px 10px; } .cf-serie span:last-child { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .cf-puerta, .cf-perno, .cf-luz, .cf-abierta-txt { transition-duration: .01s !important; transition-delay: 0s !important; }
  .cf-caja.sacude, .abierta .cf-caja { animation: none !important; }
}
`;