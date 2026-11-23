// 📁 RUTA: src/app/t/[slug]/WhatsAppFlotante.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

const OPCIONES = [
  { e: '💍', t: 'Cotizar una joya', m: 'Quiero cotizar una joya. ¿Me ayudas?' },
  { e: '✨', t: 'Diseñar mi joya', m: 'Quiero diseñar una joya personalizada.' },
  { e: '🔧', t: 'Reparación o arreglo', m: 'Necesito cotizar una reparación.' },
  { e: '📏', t: 'Ayuda con mi talla', m: 'Necesito ayuda para saber mi talla.' },
];

/** Botón de WhatsApp flotante con popup. Va encima del botón del carrito. `wa` viene del teléfono de Configuración. */
export default function WhatsAppFlotante({ wa, tienda }: { wa: string; tienda: string }) {
  const [abierto, setAbierto] = useState(false);
  const [oculto, setOculto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const enlace = (texto?: string) => {
    if (!texto) return wa;
    const msg = `Hola, *${tienda}* 👋\n${texto}`;
    return `${wa}${wa.includes('?') ? '&' : '?'}text=${encodeURIComponent(msg)}`;
  };

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
              <a className="wf-libre" href={enlace()} target="_blank" rel="noopener noreferrer" onClick={() => setAbierto(false)}>
                Escribir otro mensaje
              </a>
            </div>
          </div>
        )}
        <button type="button" className="wf-fab" aria-expanded={abierto} aria-label={abierto ? 'Cerrar WhatsApp' : 'Abrir WhatsApp'} onClick={() => setAbierto((a) => !a)}>
          {abierto ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="m6 6 12 12M18 6 6 18" /></svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3.5 20.5 5 16A8.5 8.5 0 1 1 8 19z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2.2-1-.9.9c-1-.4-2-1.4-2.4-2.4l.9-.9-1-2.2z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}

/*  Posición: queda ~146px sobre el borde inferior para ir ENCIMA del botón del carrito (que está a ~82px y mide ~52px).
    Si en tu pantalla se cruzan, cambia solo el valor de --wf-sube.  */
const CSS = `
.wf { --wf-sube: 146px; position: fixed; right: 14px; bottom: var(--wf-sube); z-index: 45; transition: opacity .2s, transform .25s; }
.wf[data-oculto="true"] { opacity: 0; pointer-events: none; transform: translateY(12px); }
.wf-fab { width: 52px; height: 52px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; background: #1faa59; color: #fff;
  box-shadow: 0 8px 22px rgba(31,170,89,.45); -webkit-tap-highlight-color: transparent; }
.wf-fab:active { transform: scale(.95); }
.wf-card { position: absolute; right: 0; bottom: 64px; width: min(300px, calc(100vw - 28px)); border-radius: 18px; overflow: hidden; background: #fff;
  box-shadow: 0 18px 50px rgba(0,0,0,.38); animation: wf-in .22s ease both; transform-origin: bottom right; }
@keyframes wf-in { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
.wf-top { display: flex; align-items: center; gap: 11px; padding: 14px 14px; background: linear-gradient(135deg, #0b4a2e, #06241a); color: #f4efdc; }
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
.wf-libre { display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 12px; background: #1faa59; color: #fff; text-decoration: none; font-size: 13.5px; font-weight: 700; }
@media (prefers-reduced-motion: reduce) { .wf, .wf-card { animation: none; transition: none; } }
`;