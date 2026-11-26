// 📁 RUTA: src/app/t/[slug]/WhatsAppFlotante.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

/** Opciones que abren WhatsApp con un mensaje ya escrito */
const OPCIONES = [
  { e: '💍', t: 'Cotizar una joya', m: 'Quiero cotizar una joya. ¿Me ayudas?' },
  { e: '✨', t: 'Diseñar mi joya', m: 'Quiero diseñar una joya personalizada.' },
  { e: '🔧', t: 'Reparación o arreglo', m: 'Necesito cotizar una reparación.' },
  { e: '📏', t: 'Ayuda con mi talla', m: 'Necesito ayuda para saber mi talla.' },
];

/** Opciones que llevan a una sección de la misma página */
const SECCIONES = [
  { e: '🛍️', t: 'Ver nuestro catálogo', h: '#catalogo' },
  { e: '🛠️', t: 'Ver taller', h: '#atelier' },
];

/** Mensajes que rotan en el globo (uno por cada notificación del contador) */
const MENSAJES = [
  'Hola 👋 ¿Podemos ayudarte?',
  '¿Necesitas cotizar una joya?',
  'Mira nuestro catálogo y nuestro taller',
];

const NO_LEIDOS = MENSAJES.length; // el contador simulado muestra 3

type Extra = { nombre: string; wa: string };

/** Botón de WhatsApp flotante con contador, globo de mensajes y popup. */
export default function WhatsAppFlotante({ wa, tienda, extra }: { wa: string; tienda: string; extra?: Extra }) {
  const [abierto, setAbierto] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [globo, setGlobo] = useState(false);
  const [leido, setLeido] = useState(false); // el contador se quita al abrir el chat
  const [msg, setMsg] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // El globo aparece a los 2 s y se queda (se quita con la ×)
  useEffect(() => {
    const a = window.setTimeout(() => setGlobo(true), 2000);
    return () => window.clearTimeout(a);
  }, []);

  // Rota los mensajes mientras el globo está visible y el chat cerrado
  useEffect(() => {
    if (!globo || abierto) return;
    const t = window.setInterval(() => setMsg((m) => (m + 1) % MENSAJES.length), 4500);
    return () => window.clearInterval(t);
  }, [globo, abierto]);

  // Cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);

  // Se esconde mientras el cliente escribe en un campo
  useEffect(() => {
    const NO_TEXTO = ['range', 'checkbox', 'radio', 'button', 'submit'];
    const esCampo = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
      return el.tagName === 'INPUT' && !NO_TEXTO.includes((el as HTMLInputElement).type);
    };
    const on = (e: FocusEvent) => { if (esCampo(e.target)) { setOculto(true); setAbierto(false); } };
    const off = () => setOculto(false);
    document.addEventListener('focusin', on);
    document.addEventListener('focusout', off);
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', off); };
  }, []);

  if (wa === '#') return null;

  const enlace = (texto?: string, base: string = wa) => {
    if (!texto) return base;
    const m = `Hola, *${tienda}* 👋\n${texto}`;
    return `${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent(m)}`;
  };

  const abrirPopup = () => { setLeido(true); setAbierto(true); };

  return (
    <>
      <style>{CSS}</style>
      <div className="wf" ref={ref} data-oculto={oculto}>
        {abierto && (
          <div className="wf-card" role="dialog" aria-label="Escríbenos por WhatsApp">
            <div className="wf-top">
              <span className="wf-av" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20" /></svg>
              </span>
              <div><b>{tienda}</b><small>Te respondemos por WhatsApp</small></div>
              <button type="button" className="wf-x" onClick={() => setAbierto(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="wf-body">
              <p className="wf-burbuja">Hola 👋 ¿En qué podemos ayudarte?</p>

              <div className="wf-ops">
                {OPCIONES.map((o) => (
                  <a key={o.t} href={enlace(o.m)} target="_blank" rel="noopener noreferrer" onClick={() => setAbierto(false)}>
                    <span aria-hidden>{o.e}</span>{o.t}
                  </a>
                ))}
              </div>

              <div className="wf-ops wf-sec">
                {SECCIONES.map((s) => (
                  <a key={s.t} href={s.h} onClick={() => setAbierto(false)}>
                    <span aria-hidden>{s.e}</span>{s.t}
                  </a>
                ))}
              </div>

              <a className="wf-libre" href={enlace()} target="_blank" rel="noopener noreferrer" onClick={() => setAbierto(false)}>
                Escribir otro mensaje
              </a>
              {extra && extra.wa !== '#' && (
                <a className="wf-otra" href={enlace('Hola, quisiera más información.', extra.wa)} target="_blank" rel="noopener noreferrer" onClick={() => setAbierto(false)}>
                  {extra.nombre}
                </a>
              )}
            </div>
          </div>
        )}

        {globo && !abierto && (
          <div className="wf-globo" role="status">
            <button type="button" className="wf-gx" aria-label="Cerrar mensaje" onClick={() => setGlobo(false)}>×</button>
            <button type="button" className="wf-gt" onClick={abrirPopup}>
              <b>{tienda}</b>
              <span key={msg} className="wf-gm">{MENSAJES[msg]}</span>
            </button>
          </div>
        )}

        <button type="button" className="wf-fab" aria-expanded={abierto}
          aria-label={abierto ? 'Cerrar WhatsApp' : `Abrir WhatsApp, ${leido ? 0 : NO_LEIDOS} mensajes nuevos`}
          onClick={() => (abierto ? setAbierto(false) : abrirPopup())}>
          {abierto ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="m6 6 12 12M18 6 6 18" /></svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3.5 20.5 5 16A8.5 8.5 0 1 1 8 19z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2.2-1-.9.9c-1-.4-2-1.4-2.4-2.4l.9-.9-1-2.2z" />
            </svg>
          )}
          {!abierto && !leido && <span className="wf-cont" aria-hidden>{NO_LEIDOS}</span>}
        </button>
      </div>
    </>
  );
}

/*  Posición: --wf-sube = distancia al borde inferior. 100px lo deja encima del menú inferior.
    Si lo quieres más arriba o abajo, cambia solo ese valor.  */
const CSS = `
.wf { --wf-sube: 100px; position: fixed; right: 14px; bottom: calc(var(--wf-sube) + env(safe-area-inset-bottom)); z-index: 45; transition: opacity .2s, transform .25s; }
.wf[data-oculto="true"] { opacity: 0; pointer-events: none; transform: translateY(12px); }
.wf-fab { position: relative; width: 52px; height: 52px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; background: #1faa59; color: #fff;
  box-shadow: 0 8px 22px rgba(31,170,89,.45); -webkit-tap-highlight-color: transparent; }
.wf-fab:active { transform: scale(.95); }

/* Contador de mensajes */
.wf-cont { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; display: grid; place-items: center;
  background: #e53935; color: #fff; font: 700 11.5px/1 system-ui, sans-serif; border: 2px solid #fff; animation: wf-lat 2.2s ease-in-out infinite; }
@keyframes wf-lat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }

.wf-card { position: absolute; right: 0; bottom: 64px; width: min(300px, calc(100vw - 28px)); max-height: calc(100dvh - 190px); overflow-y: auto; border-radius: 18px; background: #fff;
  box-shadow: 0 18px 50px rgba(0,0,0,.38); animation: wf-in .22s ease both; transform-origin: bottom right; }
@keyframes wf-in { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
.wf-top { display: flex; align-items: center; gap: 11px; padding: 14px; background: linear-gradient(135deg, #0b4a2e, #06241a); color: #f4efdc; position: sticky; top: 0; z-index: 1; }
.wf-av { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; color: #e0b73f; border: 1px solid rgba(224,183,63,.6); flex: 0 0 auto; }
.wf-top > div { flex: 1; min-width: 0; }
.wf-top b { display: block; font-size: 14px; }
.wf-top small { display: block; font-size: 11.5px; color: #b9cbbf; margin-top: 2px; }
.wf-x { width: 32px; height: 32px; border: 0; border-radius: 50%; background: rgba(255,255,255,.1); color: #f4efdc; font-size: 20px; line-height: 1; cursor: pointer; }
.wf-body { padding: 14px; background: #efe9dd; display: grid; gap: 10px; }
.wf-burbuja { margin: 0; justify-self: start; max-width: 85%; padding: 10px 13px; border-radius: 4px 14px 14px 14px; background: #fff; color: #14201a; font-size: 13.5px; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.wf-ops { display: grid; gap: 7px; }
.wf-ops a { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 12px; border-radius: 12px; background: #fff; color: #14201a; text-decoration: none; font-size: 13.5px; font-weight: 600; border: 1px solid #e3dcc8; }
.wf-ops a:active, .wf-ops a:hover { border-color: #1faa59; background: #f1faf4; }
.wf-sec a { border-style: dashed; }
.wf-libre { display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 12px; background: #1faa59; color: #fff; text-decoration: none; font-size: 13.5px; font-weight: 700; }
.wf-otra { display: flex; align-items: center; justify-content: center; min-height: 40px; border-radius: 12px; border: 1px solid #1faa59; color: #137a3f; text-decoration: none; font-size: 13px; font-weight: 600; background: transparent; }

/* Globo de mensajes */
.wf-globo { position: absolute; right: 64px; bottom: 4px; width: max-content; max-width: min(230px, calc(100vw - 100px)); padding: 10px 30px 10px 14px; border-radius: 14px; background: #fff;
  box-shadow: 0 8px 24px rgba(0,0,0,.22); animation: wf-ent .35s ease both; }
.wf-globo::after { content: ""; position: absolute; right: -6px; bottom: 16px; width: 12px; height: 12px; background: #fff; transform: rotate(45deg); }
.wf-gt { display: block; border: 0; background: none; padding: 0; text-align: left; cursor: pointer; font: inherit; font-size: 13.5px; line-height: 1.35; color: #14201a; }
.wf-gt b { display: block; font-size: 12px; color: #128c7e; margin-bottom: 2px; }
.wf-gm { display: block; animation: wf-ent .35s ease both; }
.wf-gx { position: absolute; top: 4px; right: 6px; border: 0; background: none; font-size: 16px; line-height: 1; color: #8a948e; cursor: pointer; }
@keyframes wf-ent { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .wf, .wf-card, .wf-globo, .wf-gm, .wf-cont { animation: none; transition: none; } }
`;