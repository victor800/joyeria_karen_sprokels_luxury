// 📁 RUTA: src/app/t/[slug]/PersonalizacionTrabajos.tsx
'use client';

import { useState } from 'react';

const ic = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

const TIPOS = ['Anillo', 'Collar', 'Aretes', 'Pulsera', 'Dije', 'Otro'];
const QUILATES = ['14K', '18K', '24K'];

const PASOS = [
  { t: 'Cuéntanos tu idea', d: 'Describe la joya o envíanos una foto de referencia.', i: <path d="M4 5h16v11H8l-4 4z" /> },
  { t: 'Diseño y cotización', d: 'Te mostramos el diseño y el valor antes de empezar.', i: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></> },
  { t: 'La elaboramos', d: 'Nuestros joyeros la trabajan a mano en oro certificado.', i: <><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20" /></> },
  { t: 'La recibes', d: 'Te la entregamos o la envías a domicilio.', i: <><path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></> },
];

const SERVICIOS = ['Diseño exclusivo', 'Grabado personalizado', 'Ajuste de tallas', 'Reparación y pulido'];

export default function PersonalizacionTrabajos({ wa, nombre = 'la joyería' }: { wa: string; nombre?: string }) {
  const [f, setF] = useState({ nombre: '', tipo: 'Anillo', quilate: '18K', idea: '', presupuesto: '' });
  const listo = f.nombre.trim().length >= 2 && f.idea.trim().length >= 8;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!listo) return;
    const msg = [
      `Hola ${nombre}, soy ${f.nombre.trim()}. Quiero cotizar una joya personalizada.`,
      `• Tipo: ${f.tipo}`,
      `• Oro: ${f.quilate}`,
      `• Mi idea: ${f.idea.trim()}`,
      f.presupuesto.trim() ? `• Presupuesto aproximado: ${f.presupuesto.trim()}` : '',
    ].filter(Boolean).join('\n');
    const base = wa && wa !== '#' ? wa : '';
    if (!base) return;
    window.open(`${base}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="pz" id="personalizado">
      <style>{CSS}</style>
      <div className="pz-in">
        <div className="pz-izq">
          <span className="pz-ey">Hecho a tu medida</span>
          <h3>De tu idea a una joya única</h3>
          <p>Diseñamos y elaboramos piezas personalizadas en oro certificado: un regalo con significado, una alianza propia o la réplica de esa joya que no encuentras.</p>

          <ol className="pz-pasos">
            {PASOS.map((p, i) => (
              <li key={p.t}>
                <span className="pz-ico"><svg {...ic}>{p.i}</svg></span>
                <div><b>{p.t}</b><small>{p.d}</small></div>
                <em aria-hidden>{i + 1}</em>
              </li>
            ))}
          </ol>

          <ul className="pz-serv" aria-label="Servicios">
            {SERVICIOS.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>

        <form className="pz-form" onSubmit={enviar}>
          <h4>Cuéntanos tu idea</h4>
          <p className="pz-sub">Te respondemos por WhatsApp con el diseño y la cotización.</p>

          <label className="pz-campo">
            <span>Tu nombre</span>
            <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej: María Gómez" autoComplete="name" />
          </label>

          <div className="pz-campo">
            <span>¿Qué joya quieres?</span>
            <div className="pz-chips" role="group" aria-label="Tipo de joya">
              {TIPOS.map((t) => (
                <button type="button" key={t} className={f.tipo === t ? 'on' : ''} onClick={() => setF({ ...f, tipo: t })}>{t}</button>
              ))}
            </div>
          </div>

          <div className="pz-campo">
            <span>Oro</span>
            <div className="pz-chips" role="group" aria-label="Quilates">
              {QUILATES.map((q) => (
                <button type="button" key={q} className={f.quilate === q ? 'on' : ''} onClick={() => setF({ ...f, quilate: q })}>{q}</button>
              ))}
            </div>
          </div>

          <label className="pz-campo">
            <span>Describe tu idea</span>
            <textarea value={f.idea} onChange={(e) => setF({ ...f, idea: e.target.value })} rows={3} maxLength={400} placeholder="Piedras, grabado, tamaño, ocasión…" />
          </label>

          <label className="pz-campo">
            <span>Presupuesto aproximado (opcional)</span>
            <input value={f.presupuesto} onChange={(e) => setF({ ...f, presupuesto: e.target.value })} inputMode="numeric" placeholder="Ej: 2.000.000" />
          </label>

          <button type="submit" className="pz-btn" disabled={!listo}>Solicitar cotización</button>
          {!listo && <small className="pz-ayuda">Escribe tu nombre y cuéntanos tu idea para continuar.</small>}
        </form>
      </div>
    </section>
  );
}

const CSS = `
  .pz { position: relative; padding: 84px 0; color: #f4efdc; overflow: hidden; scroll-margin-top: 68px;
    background: radial-gradient(ellipse 50% 60% at 100% 0%, rgba(224,183,63,.16), transparent 70%), radial-gradient(ellipse 55% 70% at 0% 100%, rgba(15,95,59,.55), transparent 70%), linear-gradient(160deg, #030c08, #06241a 55%, #030c08); }
  .pz-in { max-width: 1180px; margin: 0 auto; padding: 0 28px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: 56px; align-items: start; }

  .pz-ey { display: inline-flex; align-items: center; gap: 12px; font-size: 10.5px; letter-spacing: .3em; text-transform: uppercase; color: #e0b73f; }
  .pz-ey::before { content: ""; width: 28px; height: 1px; background: #e0b73f; }
  .pz-izq h3 { margin: 16px 0 16px; font-family: var(--serif, Georgia, serif); font-weight: 500; font-size: clamp(28px, 3.4vw, 44px); line-height: 1.12; letter-spacing: .05em; text-transform: uppercase; color: #f6efd9; }
  .pz-izq > p { margin: 0 0 30px; max-width: 520px; font-size: 14.5px; line-height: 1.65; color: #b9c6bd; }

  .pz-pasos { list-style: none; margin: 0 0 26px; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pz-pasos li { position: relative; display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 14px; align-items: start; padding: 16px; border-radius: 14px;
    border: 1px solid rgba(224,183,63,.25); background: rgba(255,255,255,.03); }
  .pz-ico { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; color: #e0b73f; border: 1px solid rgba(224,183,63,.55); background: rgba(224,183,63,.07); }
  .pz-pasos b { display: block; font-size: 14px; color: #f6efd9; }
  .pz-pasos small { display: block; margin-top: 4px; font-size: 12.5px; line-height: 1.45; color: #a9b8ae; }
  .pz-pasos em { position: absolute; top: 10px; right: 14px; font-style: normal; font-family: var(--serif, Georgia, serif); font-size: 18px; color: rgba(224,183,63,.45); }

  .pz-serv { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
  .pz-serv li { padding: 8px 16px; border-radius: 99px; font-size: 12px; letter-spacing: .04em; color: #ecd07a; border: 1px solid rgba(224,183,63,.4); }

  /* Formulario */
  .pz-form { display: flex; flex-direction: column; gap: 16px; padding: 28px; border-radius: 20px; color: #14201a; background: #fffdf8; border: 1px solid #e8dcb4; box-shadow: 0 24px 60px rgba(0,0,0,.4); }
  .pz-form h4 { margin: 0; font-family: var(--serif, Georgia, serif); font-size: 24px; font-weight: 500; color: #0b4a2e; }
  .pz-sub { margin: -8px 0 4px; font-size: 13px; color: #6b7a72; }
  .pz-campo { display: flex; flex-direction: column; gap: 7px; margin: 0; }
  .pz-campo > span { font-size: 12px; font-weight: 600; letter-spacing: .04em; color: #4f6159; }
  .pz-campo input, .pz-campo textarea { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #ddd5bd; background: #fff; font: inherit; font-size: 14px; color: #14201a; outline: none; resize: vertical; }
  .pz-campo input:focus, .pz-campo textarea:focus { border-color: #0b4a2e; box-shadow: 0 0 0 3px rgba(11,74,46,.1); }
  .pz-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .pz-chips button { padding: 8px 16px; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12.5px; color: #4f6159; background: #fff; border: 1px solid #ddd5bd; transition: .15s; }
  .pz-chips button:hover { border-color: #b08d3c; }
  .pz-chips button.on { color: #f3e2a6; background: #0b4a2e; border-color: #0b4a2e; }
  .pz-btn { min-height: 50px; border: 0; border-radius: 99px; cursor: pointer; font: 800 12px/1 system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #1c1608;
    background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); box-shadow: 0 8px 20px rgba(176,141,60,.35); }
  .pz-btn:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
  .pz-ayuda { text-align: center; font-size: 12px; color: #8a7a3e; }
  .pz-btn:focus-visible, .pz-chips button:focus-visible { outline: 2px solid #b08d3c; outline-offset: 2px; }

  @media (max-width: 960px) {
    .pz-in { grid-template-columns: 1fr; gap: 36px; }
  }
  @media (max-width: 600px) {
    .pz { padding: 52px 0; }
    .pz-in { padding: 0 16px; }
    .pz-pasos { grid-template-columns: 1fr; }
    .pz-form { padding: 22px 18px; }
  }
`;