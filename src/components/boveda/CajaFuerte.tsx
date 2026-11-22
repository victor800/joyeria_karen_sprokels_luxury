// 📁 RUTA: src/components/boveda/CajaFuerte.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Fase = 'cerrada' | 'desbloqueando' | 'abriendo' | 'saliendo' | 'abierta';

const MIN = 4;
const MAX = 8;
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'entrar'] as const;

export default function CajaFuerte({ abierta, sinCodigo = false, children }: { abierta: boolean; sinCodigo?: boolean; children?: React.ReactNode }) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>(abierta ? 'abierta' : 'cerrada');
  const [codigo, setCodigo] = useState('');
  const [msg, setMsg] = useState('');
  const [mal, setMal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const luego = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const sacudir = () => { setMal(true); luego(() => setMal(false), 600); };

  const pulsar = (t: string) => {
    if (fase !== 'cerrada' || enviando) return;
    setMsg('');
    setCodigo((c) => (c.length < MAX ? c + t : c));
  };
  const borrar = () => {
    if (fase !== 'cerrada' || enviando) return;
    setMsg('');
    setCodigo((c) => c.slice(0, -1));
  };

  function abrirCaja() {
    setFase('desbloqueando'); // pernos se retiran y gira la rueda
    router.refresh();         // el servidor ya ve la cookie y trae el contenido
    luego(() => setFase('abriendo'), 950);  // la puerta se abre
    luego(() => setFase('saliendo'), 2150); // la caja se desvanece
    luego(() => setFase('abierta'), 2700);  // se muestra la bóveda
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

  return (
    <div className="cf-escena">
      <style>{CSS}</style>

      <div className={`cf-persp ${fase === 'saliendo' ? 'fuera' : ''}`}>
        <header className="cf-titulo">
          <h1>Bóveda de oro</h1>
          <p>Piezas en custodia y solicitudes de retiro. Ingresa tu código para abrir.</p>
        </header>

        <div className="cf-marco">
          {/* Interior que se ve al abrir la puerta */}
          <div className="cf-interior" aria-hidden>
            <span>BÓVEDA<br />ABIERTA</span>
          </div>

          <div className={`cf-puerta ${puertaAbre ? 'abre' : ''}`} role="group" aria-label="Caja fuerte">
            {/* Pernos de seguridad: salen de la puerta hacia el marco */}
            {(['i', 'd'] as const).flatMap((lado) =>
              [18, 50, 82].map((top) => (
                <span key={`${lado}${top}`} className={`cf-slot ${lado}`} style={{ top: `${top}%` }} aria-hidden>
                  <span className={`cf-perno ${desbloqueada ? 'suelto' : ''}`} />
                </span>
              )),
            )}

            {/* Rueda / manija */}
            <div className={`cf-rueda ${desbloqueada ? 'gira' : ''}`} aria-hidden>
              <span /><span /><span />
              <b />
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
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.cf-escena { min-height: calc(100vh - 150px); display: grid; place-items: center; padding: 20px 12px 40px; }
.cf-persp { width: min(420px, 100%); perspective: 1500px; transition: opacity .55s ease, transform .55s ease; }
.cf-persp.fuera { opacity: 0; transform: scale(1.06); }

.cf-titulo { text-align: center; margin-bottom: 18px; }
.cf-titulo h1 { margin: 0 0 4px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 28px; color: #14231b; }
.cf-titulo p { margin: 0; font-size: 13px; color: #6b7a72; }

/* Marco de la caja */
.cf-marco { position: relative; padding: 26px; border-radius: 30px;
  background: linear-gradient(145deg, #1d4d37, #0a2619 55%, #07180f);
  border: 1px solid rgba(216,185,95,.5);
  box-shadow: 0 40px 80px rgba(5,28,19,.4), inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 6px rgba(0,0,0,.18); }

/* Interior (se ve cuando la puerta se abre) */
.cf-interior { position: absolute; inset: 26px; border-radius: 18px; display: grid; place-items: center; text-align: center;
  background: radial-gradient(ellipse at 50% 45%, #f6dd8a 0%, #b08d3c 30%, #0d2418 78%);
  box-shadow: inset 0 0 40px rgba(0,0,0,.6); }
.cf-interior span { font-family: var(--jks-serif, Georgia), serif; font-size: 22px; letter-spacing: .24em; line-height: 1.5; color: #1c1608; font-weight: 600; }

/* Puerta */
.cf-puerta { position: relative; z-index: 2; padding: 22px 20px 20px; border-radius: 18px; transform-origin: left center; backface-visibility: hidden;
  background: linear-gradient(160deg, #265c44 0%, #12392a 45%, #0c2a1d 100%);
  border: 1px solid rgba(216,185,95,.6);
  box-shadow: inset 0 0 0 3px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.12), 0 12px 30px rgba(0,0,0,.4);
  transition: transform 1.15s cubic-bezier(.6,.05,.2,1), opacity .35s ease .8s; }
.cf-puerta.abre { transform: rotateY(-100deg); opacity: 0; }

/* Pernos */
.cf-slot { position: absolute; width: 22px; height: 20px; transform: translateY(-50%); overflow: hidden; }
.cf-slot.i { left: -22px; border-radius: 10px 0 0 10px; }
.cf-slot.d { right: -22px; border-radius: 0 10px 10px 0; }
.cf-perno { display: block; width: 100%; height: 100%;
  background: linear-gradient(180deg, #f6dd8a, #b08d3c 55%, #6f5716); box-shadow: 0 2px 6px rgba(0,0,0,.55);
  transition: transform .7s cubic-bezier(.5,0,.2,1); }
.cf-slot.i .cf-perno.suelto { transform: translateX(24px); }
.cf-slot.d .cf-perno.suelto { transform: translateX(-24px); }

/* Rueda */
.cf-rueda { position: relative; width: 92px; height: 92px; margin: 0 auto 16px; border-radius: 50%;
  border: 3px solid #c9a548; background: radial-gradient(circle at 35% 30%, #1d4d37, #0a2619);
  box-shadow: 0 6px 16px rgba(0,0,0,.5), inset 0 0 0 5px rgba(0,0,0,.25); transition: transform .95s cubic-bezier(.4,0,.2,1); }
.cf-rueda.gira { transform: rotate(-300deg); }
.cf-rueda span { position: absolute; left: 8px; right: 8px; top: 50%; height: 6px; margin-top: -3px; border-radius: 3px;
  background: linear-gradient(180deg, #f6dd8a, #b08d3c); }
.cf-rueda span:nth-child(2) { transform: rotate(60deg); }
.cf-rueda span:nth-child(3) { transform: rotate(120deg); }
.cf-rueda b { position: absolute; left: 50%; top: 50%; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f6dd8a, #8a6d25); box-shadow: 0 2px 6px rgba(0,0,0,.6); }

/* Visor */
.cf-visor { display: flex; align-items: center; gap: 12px; height: 54px; padding: 0 16px; border-radius: 14px;
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
.cf-msg { min-height: 20px; margin: 10px 0 12px; text-align: center; font-size: 12.5px; color: rgba(243,234,210,.7); }
.cf-msg.mal { color: #ff9a90; }

/* Teclado */
.cf-teclas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.cf-teclas button { height: 54px; border-radius: 14px; cursor: pointer; font: inherit; font-size: 20px; font-weight: 600; color: #ecd07a;
  border: 1px solid rgba(216,185,95,.35); background: linear-gradient(180deg, #1d4d37, #0f3324);
  box-shadow: 0 3px 0 rgba(0,0,0,.4); display: grid; place-items: center; transition: transform .08s, box-shadow .08s, filter .15s; }
.cf-teclas button:hover:not(:disabled) { filter: brightness(1.15); }
.cf-teclas button:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,.4); }
.cf-teclas button:disabled { opacity: .55; cursor: default; }
.cf-teclas button.ok { color: #1c1608; border-color: transparent; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); }
.cf-teclas button:focus-visible { outline: 2px solid #f0d680; outline-offset: 2px; }
.cf-sp { width: 18px; height: 18px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: cfgiro .7s linear infinite; }
@keyframes cfgiro { to { transform: rotate(360deg); } }

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
  .cf-marco { padding: 22px; }
  .cf-interior { inset: 22px; }
  .cf-teclas button { height: 52px; }
}
@media (prefers-reduced-motion: reduce) {
  .cf-puerta, .cf-perno, .cf-rueda, .cf-persp { transition-duration: .01s !important; transition-delay: 0s !important; }
  .cf-visor.mal, .cf-abierta { animation: none; }
}
`;