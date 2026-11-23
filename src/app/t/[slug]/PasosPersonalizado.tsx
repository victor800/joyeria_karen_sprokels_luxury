// 📁 RUTA: src/app/t/[slug]/PasosPersonalizado.tsx
'use client';

import { useId, useState, type ReactNode } from 'react';

export type Paso = { titulo: string; texto: string; icono: ReactNode };

const ic = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

/** Pasos por defecto. El 4.º es un texto de ejemplo: cámbialo por el real. */
export const PASOS_BASE: Paso[] = [
  { titulo: 'Cuéntanos tu idea', texto: 'Describe la joya o envíanos una foto de referencia.', icono: ic(<path d="M4 5h16v11H9l-5 4z" />) },
  { titulo: 'Diseño y cotización', texto: 'Te mostramos el diseño y el valor antes de empezar.', icono: ic(<><path d="m4 20 1-4L16 5l3 3L8 19z" /><path d="m14 7 3 3" /></>) },
  { titulo: 'La elaboramos', texto: 'Nuestros joyeros la trabajan a mano en oro certificado.', icono: ic(<><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20" /></>) },
  { titulo: 'Te la entregamos', texto: 'Te avisamos por WhatsApp cuando esté lista.', icono: ic(<><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M12 8v12M3 12h18M12 8c-2-4-6-3-5 0 .6 1.5 5 0 5 0zm0 0c2-4 6-3 5 0-.6 1.5-5 0-5 0z" /></>) },
];

/** "Cómo funciona": tarjetas en 2 columnas. En móvil es colapsable (cerrado); en escritorio se ve siempre abierto en 4 columnas. */
export default function PasosPersonalizado({ pasos = PASOS_BASE, titulo = 'Cómo lo hacemos' }: { pasos?: Paso[]; titulo?: string }) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();

  return (
    <>
      <style>{CSS}</style>
      <div className="pp" data-open={abierto}>
        <button type="button" className="pp-h" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto((a) => !a)}>
          <span className="pp-hl">
            <small>Proceso · {pasos.length} pasos</small>
            <b>{titulo}</b>
            <span className="pp-dots" aria-hidden>
              {pasos.map((_, i) => <i key={i}>{i + 1}</i>)}
            </span>
          </span>
          <svg className="pp-chev" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div className="pp-b" id={id}>
          <div className="pp-in">
            <ol className="pp-grid">
              {pasos.map((p, i) => (
                <li key={p.titulo} className="pp-card">
                  <span className="pp-num" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                  <span className="pp-ico">{p.icono}</span>
                  <b>{p.titulo}</b>
                  <span className="pp-tx">{p.texto}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
.pp { --pp-o: #e0b73f; --pp-o3: #f0d680; }
.pp-h { display: none; }
.pp-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.pp-card { position: relative; display: grid; align-content: start; gap: 8px; padding: 18px 16px 16px; border-radius: 18px; overflow: hidden;
  background: linear-gradient(160deg, rgba(15,95,59,.5), rgba(3,12,8,.85) 70%); border: 1px solid rgba(224,183,63,.3); box-shadow: 0 10px 26px rgba(0,0,0,.28); transition: transform .25s, border-color .25s; }
.pp-card:hover { transform: translateY(-3px); border-color: var(--pp-o); }
.pp-card::after { content: ""; position: absolute; right: -28px; bottom: -28px; width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle, rgba(224,183,63,.16), transparent 70%); pointer-events: none; }
.pp-num { position: absolute; top: 10px; right: 14px; font: 500 26px/1 Georgia, 'Times New Roman', serif; color: rgba(224,183,63,.38); letter-spacing: .02em; }
.pp-ico { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; color: var(--pp-o3); border: 1px solid rgba(224,183,63,.55); background: rgba(224,183,63,.08); }
.pp-card b { margin-top: 4px; font-size: 14.5px; line-height: 1.25; color: #f4efdc; }
.pp-tx { font-size: 12.5px; line-height: 1.5; color: #a9b8ae; }

@media (max-width: 860px) {
  .pp { border-radius: 18px; border: 1px solid rgba(224,183,63,.35); background: linear-gradient(135deg, rgba(15,95,59,.35), rgba(3,12,8,.6)); overflow: hidden; transition: border-color .2s; }
  .pp[data-open="true"] { border-color: var(--pp-o); }
  .pp-h { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border: 0; background: none; cursor: pointer; color: #f4efdc; text-align: left; font: inherit; min-height: 84px; -webkit-tap-highlight-color: transparent; }
  .pp-h:focus-visible { outline: 2px solid var(--pp-o); outline-offset: -2px; }
  .pp-hl { display: grid; gap: 6px; min-width: 0; }
  .pp-hl small { font-size: 10.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--pp-o); }
  .pp-hl b { font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 20px; line-height: 1.2; }
  .pp-dots { display: flex; align-items: center; gap: 0; margin-top: 4px; }
  .pp-dots i { position: relative; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; font: 700 10.5px/1 system-ui, sans-serif; font-style: normal; color: #1a1405; background: linear-gradient(135deg, var(--pp-o3), var(--pp-o)); }
  .pp-dots i + i { margin-left: 14px; }
  .pp-dots i + i::before { content: ""; position: absolute; right: 100%; top: 50%; width: 14px; height: 1px; background: rgba(224,183,63,.55); }
  .pp-chev { flex: 0 0 auto; color: var(--pp-o); transition: transform .25s ease; }
  .pp[data-open="true"] .pp-chev { transform: rotate(180deg); }
  .pp[data-open="true"] .pp-dots { display: none; }

  .pp-b { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .3s ease; }
  .pp[data-open="true"] .pp-b { grid-template-rows: 1fr; }
  .pp-in { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear .3s; }
  .pp[data-open="true"] .pp-in { visibility: visible; transition-delay: 0s; }
  .pp-grid { grid-template-columns: 1fr 1fr; gap: 10px; padding: 2px 14px 16px; }
  .pp-card { padding: 16px 13px 14px; border-radius: 16px; gap: 6px; }
  .pp-card:hover { transform: none; }
  .pp-num { top: 8px; right: 11px; font-size: 22px; }
  .pp-ico { width: 38px; height: 38px; }
  .pp-card b { font-size: 13.5px; }
  .pp-tx { font-size: 12px; line-height: 1.45; }
}
@media (min-width: 861px) and (max-width: 1060px) {
  .pp-grid { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) { .pp-b, .pp-chev, .pp-in, .pp-card { transition: none; } }
`;