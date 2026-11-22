// 📁 RUTA: src/components/boveda/CajaFuerte.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Fase = 'cerrada' | 'desbloqueando' | 'abriendo' | 'saliendo' | 'abierta';

const MIN = 4;
const MAX = 8;
const SERIE = 'JKS-BV-2026-0417';
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'entrar'] as const;

export default function CajaFuerte({
  abierta,
  sinCodigo = false,
  logoUrl,
  children,
}: {
  abierta: boolean;
  sinCodigo?: boolean;
  /** Logo de la joyería (opcional). Si no se pasa, se muestra el nombre en texto */
  logoUrl?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>(abierta ? 'abierta' : 'cerrada');
  const [codigo, setCodigo] = useState('');
  const [msg, setMsg] = useState('');
  const [mal, setMal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [giro, setGiro] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const luego = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const sacudir = () => { setMal(true); luego(() => setMal(false), 600); };

  const pulsar = (t: string) => {
    if (fase !== 'cerrada' || enviando) return;
    setMsg('');
    setCodigo((c) => {
      if (c.length >= MAX) return c;
      setGiro((g) => g + 36);
      return c + t;
    });
  };
  const borrar = () => {
    if (fase !== 'cerrada' || enviando) return;
    setMsg('');
    setCodigo((c) => {
      if (!c) return c;
      setGiro((g) => g - 36);
      return c.slice(0, -1);
    });
  };

  function abrirCaja() {
    setFase('desbloqueando'); // pernos se retiran y gira la rueda
    router.refresh();         // el servidor ya ve la cookie y trae el contenido
    luego(() => setFase('abriendo'), 950);  // la puerta se abre
    luego(() => setFase('saliendo'), 2400); // la caja se desvanece
    luego(() => setFase('abierta'), 2950);  // se muestra la bóveda
  }

  async function entrar() {
    if (fase !== 'cerrada' || enviando) return;
    if (codigo.length < MIN) { setMsg(`El código tiene al menos ${MIN} dígitos`); sacudir(); return; }
    setEnviando(true);
    setMsg('');
    try {
      const res = await fetch('/api/boveda/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Código incorrecto');
      abrirCaja();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo verificar el código');
      setCodigo('');
      sacudir();
    } finally {
      setEnviando(false);
    }
  }

  async function cerrar() {
    try { await fetch('/api/boveda/acceso', { method: 'DELETE' }); } catch { /* sin conexión: igual se cierra la vista */ }
    setCodigo('');
    setMsg('');
    setFase('cerrada');
    router.refresh();
  }

  // Teclado físico (solo mientras la caja está cerrada y sin escribir en otro campo)
  const acciones = useRef({ pulsar, borrar, entrar });
  acciones.current = { pulsar, borrar, entrar };
  useEffect(() => {
    if (fase !== 'cerrada') return;
    const alTeclear = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (/^\d$/.test(e.key)) acciones.current.pulsar(e.key);
      else if (e.key === 'Backspace') acciones.current.borrar();
      else if (e.key === 'Enter') acciones.current.entrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [fase]);

  /* ---------- Bóveda abierta: muestra el contenido real ---------- */
  if (fase === 'abierta') {
    return (
      <div className="cf-abierta">
        <style>{CSS}</style>
        <div className={`cf-barra ${sinCodigo ? 'aviso' : ''}`}>
          {sinCodigo ? (
            <span><i aria-hidden /> Modo temporal: la bóveda está abierta sin código. Configura BOVEDA_CODIGO para activarlo.</span>
          ) : (
            <span><i aria-hidden /> Bóveda abierta · se cierra sola a los 30 minutos</span>
          )}
          {!sinCodigo && <button type="button" onClick={cerrar}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Cerrar bóveda
          </button>}
        </div>
        {children ?? <p className="cf-carga">Abriendo la bóveda…</p>}
      </div>
    );
  }

  /* ---------- Caja fuerte cerrada / abriéndose ---------- */
  const desbloqueada = fase !== 'cerrada';
  const puertaAbre = fase === 'abriendo' || fase === 'saliendo';
  const led = desbloqueada ? 'verde' : mal ? 'rojo' : 'ambar';
  const anguloDial = desbloqueada ? giro - 300 : giro;

  return (
    <div className="cf-escena">
      <style>{CSS}</style>

      <div className={`cf-persp ${fase === 'saliendo' ? 'fuera' : ''}`}>
        <header className="cf-titulo">
          <h1>Bóveda de oro</h1>
          <p>Piezas en custodia y solicitudes de retiro. Ingresa tu código para abrir.</p>
        </header>

        <div className="cf-marco">
          {/* Remaches del marco */}
          <i className="cf-rem a" aria-hidden /><i className="cf-rem b" aria-hidden />
          <i className="cf-rem c" aria-hidden /><i className="cf-rem d" aria-hidden />

          {/* Placa con número de serie */}
          <div className="cf-serie" aria-label={`Número de serie ${SERIE}`}>
            <span>SERIE N.º</span><b>{SERIE}</b>
          </div>

          <div className="cf-hueco">
            {/* Interior que se ve al abrir la puerta */}
            <div className="cf-interior" aria-hidden>
              <div className={`cf-luz ${puertaAbre ? 'on' : ''}`} />
              {[0, 1, 2].map((n) => (
                <div className="cf-repisa" key={n}>
                  {Array.from({ length: n === 1 ? 4 : 3 }).map((_, i) => (
                    <span key={i} className={`cf-lingote l${(n + i) % 3}`} />
                  ))}
                  {n !== 1 && (
                    <svg className="cf-gema" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" />
                    </svg>
                  )}
                </div>
              ))}
              <div className="cf-abierta-txt">BÓVEDA ABIERTA</div>
            </div>

            {/* Bisagras (fijas al marco) */}
            <i className="cf-bisagra h1" aria-hidden /><i className="cf-bisagra h2" aria-hidden /><i className="cf-bisagra h3" aria-hidden />

            <div className={`cf-puerta ${puertaAbre ? 'abre' : ''}`} role="group" aria-label="Caja fuerte">
              {/* Pernos de seguridad: salen de la puerta hacia el marco */}
              {[18, 50, 82].map((top) => (
                <span key={top} className="cf-slot" style={{ top: `${top}%` }} aria-hidden>
                  <span className={`cf-perno ${desbloqueada ? 'suelto' : ''}`} />
                </span>
              ))}

              <div className="cf-panel">
                {/* Marca */}
                <div className="cf-marca">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Karen Sprockel's Luxury" />
                  ) : (
                    <span>KAREN SPROCKEL&apos;S<br /><em>LUXURY</em></span>
                  )}
                </div>

                {/* Dial: gira con cada tecla y se abre al desbloquear */}
                <div className="cf-dial" aria-hidden>
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="56" className="d-aro" />
                    <g style={{ transform: `rotate(${anguloDial}deg)`, transformOrigin: '60px 60px', transition: `transform ${desbloqueada ? '.95s' : '.35s'} cubic-bezier(.3,.8,.3,1)` }}>
                      {Array.from({ length: 40 }).map((_, i) => (
                        <line key={i} x1="60" y1="8" x2="60" y2={i % 5 === 0 ? 17 : 13} transform={`rotate(${i * 9} 60 60)`} className="d-tic" />
                      ))}
                      <circle cx="60" cy="60" r="38" className="d-cuerpo" />
                      {[0, 60, 120].map((a) => (
                        <line key={a} x1="60" y1="24" x2="60" y2="96" transform={`rotate(${a} 60 60)`} className="d-radio" />
                      ))}
                      <circle cx="60" cy="60" r="9" className="d-centro" />
                    </g>
                    <path d="M60 2 l5 9 h-10z" className="d-flecha" />
                  </svg>
                </div>

                {/* Visor */}
                <div className={`cf-visor ${mal ? 'mal' : ''}`} aria-live="polite">
                  <span className={`cf-led ${led}`} aria-hidden />
                  <div className="cf-puntos">
                    {codigo ? Array.from({ length: codigo.length }).map((_, i) => <i key={i} />) : <em>Ingresa el código</em>}
                  </div>
                </div>
                <p className={`cf-msg ${mal ? 'mal' : ''}`} role="status">
                  {desbloqueada ? 'Código correcto' : msg || '\u00a0'}
                </p>

                {/* Teclado */}
                <div className="cf-teclas">
                  {TECLAS.map((t) =>
                    t === 'borrar' ? (
                      <button key={t} type="button" onClick={borrar} disabled={desbloqueada || enviando} aria-label="Borrar último dígito">⌫</button>
                    ) : t === 'entrar' ? (
                      <button key={t} type="button" className="ok" onClick={entrar} disabled={desbloqueada || enviando} aria-label="Abrir bóveda">
                        {enviando ? <span className="cf-sp" aria-hidden /> : '✓'}
                      </button>
                    ) : (
                      <button key={t} type="button" onClick={() => pulsar(t)} disabled={desbloqueada || enviando}>{t}</button>
                    ),
                  )}
                </div>

                <div className="cf-pie"><span>N.º {SERIE}</span><span>● CERRADURA ELECTRÓNICA</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.cf-escena { min-height: calc(100vh - 150px); display: grid; place-items: center; padding: 28px 12px 40px; }
.cf-persp { width: min(560px, 100%); transition: opacity .55s ease, transform .55s ease; }
.cf-persp.fuera { opacity: 0; transform: scale(1.06); }

.cf-titulo { text-align: center; margin-bottom: 26px; }
.cf-titulo h1 { margin: 0 0 4px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 28px; color: #14231b; }
.cf-titulo p { margin: 0; font-size: 13px; color: #6b7a72; }

/* Marco de acero */
.cf-marco { position: relative; padding: 30px; border-radius: 32px;
  background: linear-gradient(145deg, #3a4a42 0%, #1d2a24 42%, #101a15 100%);
  box-shadow: 0 40px 80px rgba(5,28,19,.42), 0 0 0 2px #0a120e, inset 0 2px 0 rgba(255,255,255,.18), inset 0 -3px 8px rgba(0,0,0,.5); }
.cf-rem { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #f0d680, #8a6d25); box-shadow: 0 1px 2px #000; }
.cf-rem.a { top: 12px; left: 12px; } .cf-rem.b { top: 12px; right: 12px; } .cf-rem.c { bottom: 12px; left: 12px; } .cf-rem.d { bottom: 12px; right: 12px; }

/* Placa de serie */
.cf-serie { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); z-index: 6; display: flex; align-items: center; gap: 10px; padding: 7px 18px; border-radius: 8px; white-space: nowrap;
  background: linear-gradient(180deg, #ebd48e, #b08d3c); color: #2a2008; box-shadow: 0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.6); }
.cf-serie span { font-size: 9px; letter-spacing: .16em; font-weight: 700; opacity: .8; }
.cf-serie b { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; letter-spacing: .1em; }

/* Hueco con perspectiva 3D */
.cf-hueco { position: relative; perspective: 1700px; border-radius: 22px; background: #050b08; box-shadow: inset 0 0 0 3px #0a120e, inset 0 10px 30px #000; }

/* Interior (se ve cuando la puerta se abre) */
.cf-interior { position: absolute; inset: 6px; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-evenly; padding: 18px 22px 30px;
  background: linear-gradient(180deg, #0d2a1e, #061610); }
.cf-luz { position: absolute; inset: 0; opacity: 0; transition: opacity 1.1s ease .4s; background: radial-gradient(ellipse at 50% 30%, rgba(236,208,122,.4), transparent 65%); }
.cf-luz.on { opacity: 1; }
.cf-repisa { position: relative; display: flex; align-items: flex-end; justify-content: center; gap: 12px; height: 26%; padding-bottom: 4px; border-bottom: 6px solid #1b3a2b; box-shadow: 0 8px 12px -8px rgba(0,0,0,.9); }
.cf-lingote { display: block; width: 68px; height: 28px; clip-path: polygon(10% 0, 90% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, #f6e3a0, #c9a548 55%, #8a6d25); box-shadow: 0 2px 6px rgba(0,0,0,.6); }
.cf-lingote.l1 { height: 23px; width: 58px; } .cf-lingote.l2 { height: 33px; }
.cf-gema { color: #8fe3c0; filter: drop-shadow(0 0 8px rgba(143,227,192,.7)); margin-left: 8px; }
.cf-abierta-txt { position: absolute; left: 0; right: 0; bottom: 10px; text-align: center; font-size: 10px; letter-spacing: .4em; color: #ecd07a; opacity: 0; transition: opacity .6s 1.4s; }
.cf-luz.on ~ .cf-abierta-txt { opacity: 1; }

/* Bisagras */
.cf-bisagra { position: absolute; left: -13px; width: 17px; height: 52px; border-radius: 6px; z-index: 4;
  background: linear-gradient(90deg, #6f5716, #ecd07a 45%, #8a6d25); box-shadow: 0 3px 6px rgba(0,0,0,.6); }
.cf-bisagra.h1 { top: 11%; } .cf-bisagra.h2 { top: 45%; } .cf-bisagra.h3 { bottom: 11%; }

/* Puerta */
.cf-puerta { position: relative; z-index: 2; padding: 14px; border-radius: 20px; transform-origin: left center; backface-visibility: hidden;
  background: linear-gradient(150deg, #2a6a4a 0%, #1b4a34 38%, #0f3022 100%);
  box-shadow: inset 0 0 0 2px #0a291d, inset 0 2px 0 rgba(255,255,255,.18), inset 0 -6px 14px rgba(0,0,0,.45), 0 12px 30px rgba(0,0,0,.4);
  transition: transform 1.3s cubic-bezier(.55,.05,.2,1), opacity .4s ease 1s; }
.cf-puerta.abre { transform: rotateY(-100deg); opacity: 0; }

.cf-panel { display: grid; gap: 12px; justify-items: center; padding: 20px 22px 14px; border-radius: 14px; border: 1.5px solid rgba(216,185,95,.65);
  background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,.18)); }

.cf-marca { min-height: 44px; display: grid; place-items: center; text-align: center; }
.cf-marca img { max-height: 58px; max-width: 160px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,.5)); }
.cf-marca span { font-size: 12px; letter-spacing: .26em; color: #ecd07a; font-weight: 600; line-height: 1.5; }
.cf-marca em { font-family: var(--jks-serif, Georgia), serif; letter-spacing: .18em; font-size: 13px; }

/* Dial */
.cf-dial { width: 128px; height: 128px; padding: 4px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #4f8a6c, #14392a 70%); box-shadow: 0 10px 22px rgba(0,0,0,.55), inset 0 2px 3px rgba(255,255,255,.25); }
.cf-dial svg { width: 100%; height: 100%; display: block; }
.d-aro { fill: none; stroke: #c9a548; stroke-width: 2; }
.d-tic { stroke: #ecd07a; stroke-width: 1.3; stroke-linecap: round; }
.d-cuerpo { fill: #123a29; stroke: #c9a548; stroke-width: 1.5; }
.d-radio { stroke: #d8b95f; stroke-width: 5; stroke-linecap: round; }
.d-centro { fill: #ecd07a; stroke: #8a6d25; stroke-width: 2; }
.d-flecha { fill: #ecd07a; }

/* Pernos (salen del borde derecho de la puerta hacia el marco) */
.cf-slot { position: absolute; right: -24px; width: 24px; height: 22px; transform: translateY(-50%); overflow: hidden; border-radius: 0 10px 10px 0; z-index: 3; }
.cf-perno { display: block; width: 100%; height: 100%; background: linear-gradient(180deg, #f6e3a0, #b08d3c 55%, #6f5716); box-shadow: 0 2px 6px rgba(0,0,0,.55); transition: transform .7s cubic-bezier(.5,0,.2,1); }
.cf-perno.suelto { transform: translateX(-26px); }

/* Visor */
.cf-visor { width: 100%; display: flex; align-items: center; gap: 12px; height: 54px; padding: 0 16px; border-radius: 14px;
  background: #06130c; border: 1px solid rgba(216,185,95,.35); box-shadow: inset 0 3px 10px rgba(0,0,0,.7); }
.cf-visor.mal { animation: cfsacude .5s ease; }
@keyframes cfsacude { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-9px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(4px); } }
.cf-led { flex-shrink: 0; width: 11px; height: 11px; border-radius: 50%; transition: background .25s, box-shadow .25s; }
.cf-led.ambar { background: #d89a2b; box-shadow: 0 0 8px rgba(216,154,43,.8); }
.cf-led.rojo { background: #e0483c; box-shadow: 0 0 10px rgba(224,72,60,.9); }
.cf-led.verde { background: #3ddc84; box-shadow: 0 0 12px rgba(61,220,132,.95); }
.cf-puntos { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 20px; }
.cf-puntos i { width: 12px; height: 12px; border-radius: 50%; background: #ecd07a; box-shadow: 0 0 8px rgba(236,208,122,.6); }
.cf-puntos em { font-style: normal; font-size: 13px; letter-spacing: .06em; color: rgba(236,208,122,.45); }
.cf-msg { min-height: 18px; margin: 0; text-align: center; font-size: 12.5px; color: rgba(243,234,210,.7); }
.cf-msg.mal { color: #ff9a90; }

/* Teclado */
.cf-teclas { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.cf-teclas button { height: 56px; border-radius: 14px; cursor: pointer; font: inherit; font-size: 21px; font-weight: 600; color: #ecd07a;
  border: 1px solid rgba(216,185,95,.4); background: linear-gradient(180deg, #1f5a3f, #123a29);
  box-shadow: 0 4px 0 #07211a, 0 6px 10px rgba(0,0,0,.4); display: grid; place-items: center; transition: transform .08s, box-shadow .08s, filter .15s; }
.cf-teclas button:hover:not(:disabled) { filter: brightness(1.2); }
.cf-teclas button:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 #07211a; }
.cf-teclas button:disabled { opacity: .55; cursor: default; }
.cf-teclas button.ok { color: #1c1608; border-color: transparent; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); box-shadow: 0 4px 0 #6f5716, 0 6px 10px rgba(0,0,0,.4); }
.cf-teclas button.ok:active:not(:disabled) { box-shadow: 0 1px 0 #6f5716; }
.cf-teclas button:focus-visible { outline: 2px solid #f0d680; outline-offset: 2px; }
.cf-sp { width: 18px; height: 18px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: cfgiro .7s linear infinite; }
@keyframes cfgiro { to { transform: rotate(360deg); } }

.cf-pie { width: 100%; display: flex; justify-content: space-between; gap: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px; letter-spacing: .1em; color: rgba(216,185,95,.6); }

/* Bóveda abierta */
.cf-abierta { animation: cfentra .6s ease both; }
@keyframes cfentra { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.cf-barra { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 0 14px; padding: 10px 14px; border-radius: 14px;
  background: linear-gradient(120deg, #0d3324, #07211a); border: 1px solid rgba(216,185,95,.35); color: rgba(243,234,210,.85); font-size: 12.5px; }
.cf-barra.aviso { background: #fdf1dc; border-color: #e3c27a; color: #7a4f0c; }
.cf-barra.aviso i { background: #d89a2b; box-shadow: 0 0 8px rgba(216,154,43,.8); }
.cf-barra span { display: inline-flex; align-items: center; gap: 9px; }
.cf-barra i { width: 8px; height: 8px; border-radius: 50%; background: #3ddc84; box-shadow: 0 0 8px rgba(61,220,132,.9); }
.cf-barra button { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: #1c1608; border: 0; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); }
.cf-carga { padding: 40px 0; text-align: center; color: #7a857e; }

@media (max-width: 480px) {
  .cf-marco { padding: 24px 16px 18px; border-radius: 26px; }
  .cf-panel { padding: 16px 12px 12px; }
  .cf-dial { width: 104px; height: 104px; }
  .cf-teclas button { height: 52px; }
  .cf-serie { gap: 6px; padding: 6px 12px; }
  .cf-interior { padding: 14px 14px 28px; }
}
@media (prefers-reduced-motion: reduce) {
  .cf-puerta, .cf-perno, .cf-luz, .cf-abierta-txt, .cf-persp { transition-duration: .01s !important; transition-delay: 0s !important; }
  .cf-visor.mal, .cf-abierta { animation: none; }
}
`;