// 📁 RUTA: src/app/t/[slug]/GuiaTallas.tsx
'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';

/** Tallas de anillo (sistema US): diámetro interior y contorno en mm */
const ANILLOS = [
  { t: 4, d: 14.9, c: 46.8 },
  { t: 5, d: 15.7, c: 49.3 },
  { t: 6, d: 16.5, c: 51.9 },
  { t: 7, d: 17.3, c: 54.4 },
  { t: 8, d: 18.2, c: 57.0 },
  { t: 9, d: 19.0, c: 59.5 },
  { t: 10, d: 19.8, c: 62.1 },
  { t: 11, d: 20.6, c: 64.6 },
  { t: 12, d: 21.4, c: 67.2 },
];

const CADENAS = [
  { cm: 40, n: 'Ajustada', d: 'Queda pegada al cuello. Ideal para dijes pequeños.' },
  { cm: 45, n: 'La más usada', d: 'Cae sobre la clavícula. Va con casi todo.' },
  { cm: 50, n: 'Clásica', d: 'Llega al inicio del pecho. Resalta dijes medianos.' },
  { cm: 60, n: 'Larga', d: 'Para lucirla sola o combinarla con otras cadenas.' },
];

type Tab = 'anillos' | 'cadenas' | 'pulseras';
type Modo = 'diametro' | 'contorno';

/** Bloque plegable: en móvil/tablet se abre y cierra; en escritorio se ve siempre abierto y sin cabecera */
function Desplegable({ titulo, resumen, abierto: inicial = false, children }: { titulo: string; resumen?: string; abierto?: boolean; children: ReactNode }) {
  const [abierto, setAbierto] = useState(inicial);
  const id = useId();
  return (
    <div className="dp" data-open={abierto}>
      <button type="button" className="dp-h" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto((a) => !a)}>
        <span className="dp-t">{titulo}</span>
        {resumen && <span className="dp-r">{resumen}</span>}
        <svg className="dp-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="dp-b" id={id}>
        <div className="dp-in"><div className="dp-pad">{children}</div></div>
      </div>
    </div>
  );
}

export default function GuiaTallas({ wa, nombre = "Karen Sploker's" }: { wa: string; nombre?: string }) {
  const [tab, setTab] = useState<Tab>('anillos');
  const [modo, setModo] = useState<Modo>('contorno');
  const [medida, setMedida] = useState('');
  const [muneca, setMuneca] = useState('');

  const resultado = useMemo(() => {
    const v = Number(medida.replace(',', '.'));
    if (!medida || !Number.isFinite(v) || v <= 0) return null;
    const campo = modo === 'diametro' ? 'd' : 'c';
    const rango = modo === 'diametro' ? [13.5, 22.5] : [43, 70];
    if (v < rango[0] || v > rango[1]) return { fuera: true as const, talla: 0 };
    const cercana = ANILLOS.reduce((a, b) => (Math.abs(b[campo] - v) < Math.abs(a[campo] - v) ? b : a));
    return { fuera: false as const, talla: cercana.t };
  }, [medida, modo]);

  const mu = Number(muneca.replace(',', '.'));
  const munecaOk = Number.isFinite(mu) && mu >= 12 && mu <= 24;

  /** Mensaje de WhatsApp con lo que el cliente ya calculó */
  const linkWa = useMemo(() => {
    if (!wa || wa === '#') return '#';
    let detalle = 'Necesito ayuda para elegir mi talla.';
    if (tab === 'anillos' && resultado && !resultado.fuera) {
      detalle = `Para un *anillo* medí mi dedo (${modo === 'contorno' ? 'contorno' : 'diámetro'}: ${medida} mm) y me salió *talla ${resultado.talla}*. ¿Me la confirmas?`;
    } else if (tab === 'anillos') {
      detalle = 'Necesito ayuda para saber mi talla de *anillo*.';
    } else if (tab === 'pulseras' && munecaOk) {
      detalle = `Mi muñeca mide *${mu} cm*. ¿Qué largo de *pulsera* me recomiendas? (ajustada ${(mu + 1).toFixed(1)} cm · cómoda ${(mu + 2).toFixed(1)} cm)`;
    } else if (tab === 'pulseras') {
      detalle = 'Necesito ayuda para saber el largo de mi *pulsera*.';
    } else {
      detalle = 'Quiero ayuda para elegir el largo de una *cadena o collar*.';
    }
    const sep = wa.includes('?') ? '&' : '?';
    return `${wa}${sep}text=${encodeURIComponent(`Hola, *${nombre}* 👋\n${detalle}`)}`;
  }, [wa, nombre, tab, resultado, modo, medida, munecaOk, mu]);

  return (
    <section className="tl" id="tallas">
      <style>{CSS}</style>
      <div className="tl-in">
        <div className="tl-cab">
          <span>Guía de tallas</span>
          <h3>Encuentra tu medida ideal</h3>
          <p>Mide en casa con una tira de papel y descubre tu talla en segundos.</p>
        </div>

        <div className="tl-tabs" role="tablist" aria-label="Tipo de joya">
          {([['anillos', 'Anillos'], ['cadenas', 'Cadenas'], ['pulseras', 'Pulseras']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        <div className="tl-caja">
          {tab === 'anillos' && (
            <div className="tl-dos">
              <div className="tl-col">
                <h4>Calcula tu talla</h4>
                <Desplegable titulo="¿Cómo medir?" resumen="3 pasos">
                  <ol className="tl-como">
                    <li>Rodea la base del dedo con una tira de papel y marca donde se cruza.</li>
                    <li>Mide la tira con una regla, en milímetros (contorno).</li>
                    <li>Escribe la medida aquí abajo.</li>
                  </ol>
                </Desplegable>
                <div className="tl-seg" role="group" aria-label="Tipo de medida">
                  <button type="button" className={modo === 'contorno' ? 'on' : ''} onClick={() => { setModo('contorno'); setMedida(''); }}>Contorno (mm)</button>
                  <button type="button" className={modo === 'diametro' ? 'on' : ''} onClick={() => { setModo('diametro'); setMedida(''); }}>Diámetro (mm)</button>
                </div>
                <input className="tl-in-num" value={medida} onChange={(e) => setMedida(e.target.value)} inputMode="decimal" placeholder={modo === 'contorno' ? 'Ej: 54' : 'Ej: 17.3'} aria-label="Medida en milímetros" />
                <div className="tl-res" aria-live="polite">
                  {resultado === null && <span>Tu talla aparecerá aquí.</span>}
                  {resultado?.fuera && <span>Esa medida está fuera del rango. Escríbenos y te ayudamos.</span>}
                  {resultado && !resultado.fuera && <><small>Tu talla</small><b>{resultado.talla}</b></>}
                </div>
              </div>

              <Desplegable titulo="Tabla de tallas" resumen="Talla · diámetro · contorno">
                <div className="tl-tabla" role="region" aria-label="Tabla de tallas" tabIndex={0}>
                  <table>
                    <thead><tr><th>Talla</th><th>Diámetro</th><th>Contorno</th></tr></thead>
                    <tbody>
                      {ANILLOS.map((a) => (
                        <tr key={a.t} className={resultado && !resultado.fuera && resultado.talla === a.t ? 'sel' : ''}>
                          <td>{a.t}</td><td>{a.d.toFixed(1)} mm</td><td>{a.c.toFixed(1)} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Desplegable>
            </div>
          )}

          {tab === 'cadenas' && (
            <div>
              <h4>Largo de cadenas y collares</h4>
              <div className="tl-cadenas">
                {CADENAS.map((c) => (
                  <article key={c.cm}>
                    <b>{c.cm}<small> cm</small></b>
                    <strong>{c.n}</strong>
                    <p>{c.d}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === 'pulseras' && (
            <div className="tl-dos">
              <div className="tl-col">
                <h4>Largo de tu pulsera</h4>
                <Desplegable titulo="¿Cómo medir?" resumen="3 pasos">
                  <ol className="tl-como">
                    <li>Rodea tu muñeca con una tira de papel, justo sobre el hueso.</li>
                    <li>Mide la tira en centímetros.</li>
                    <li>Escribe la medida aquí abajo.</li>
                  </ol>
                </Desplegable>
                <input className="tl-in-num" value={muneca} onChange={(e) => setMuneca(e.target.value)} inputMode="decimal" placeholder="Muñeca en cm. Ej: 16" aria-label="Medida de la muñeca en centímetros" />
              </div>
              <div className="tl-res tl-res2" aria-live="polite">
                {!muneca && <span>Tu largo ideal aparecerá aquí.</span>}
                {muneca && !munecaOk && <span>Escribe una medida entre 12 y 24 cm.</span>}
                {muneca && munecaOk && (
                  <>
                    <div><small>Ajustada</small><b>{(mu + 1).toFixed(1)} cm</b></div>
                    <div><small>Cómoda</small><b>{(mu + 2).toFixed(1)} cm</b></div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="tl-ayuda">
          ¿Dudas con tu talla? <a href={linkWa} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a> y te asesoramos.
        </p>
      </div>
    </section>
  );
}

const CSS = `
  .tl { padding: 84px 0 76px; scroll-margin-top: 68px; background: var(--crema, #f6f4ee); }
  .tl-in { max-width: 980px; margin: 0 auto; padding: 0 28px; }
  .tl-cab { text-align: center; margin-bottom: 28px; }
  .tl-cab span { display: block; font-size: 11px; letter-spacing: .26em; text-transform: uppercase; color: #b08d3c; }
  .tl-cab h3 { margin: 10px 0 8px; font-family: var(--serif, Georgia, serif); font-weight: 500; font-size: clamp(26px, 3.2vw, 38px); letter-spacing: .04em; color: #0b4a2e; }
  .tl-cab p { margin: 0; font-size: 14px; color: #6b7a72; }

  .tl-tabs { display: flex; justify-content: center; gap: 8px; margin-bottom: 20px; }
  .tl-tabs button { padding: 10px 24px; border-radius: 99px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; color: #0b4a2e; background: transparent; border: 1px solid #d9cfa8; transition: .2s; }
  .tl-tabs button:hover { border-color: #b08d3c; }
  .tl-tabs button.on { color: #f3e2a6; background: #0b4a2e; border-color: #0b4a2e; }

  .tl-caja { padding: 30px; border-radius: 22px; background: #fffdf8; border: 1px solid #e8dcb4; box-shadow: 0 14px 34px rgba(11,74,46,.08); }
  .tl-caja h4 { margin: 0 0 14px; font-family: var(--serif, Georgia, serif); font-weight: 500; font-size: 22px; color: #0b4a2e; }
  .tl-dos { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 36px; align-items: start; }
  .tl-col { display: grid; gap: 12px; }
  .tl-col h4 { margin: 0; }
  .tl-como { margin: 0 0 6px; padding-left: 18px; display: grid; gap: 6px; font-size: 13.5px; line-height: 1.5; color: #4f6159; }
  .tl-como li::marker { color: #b08d3c; font-weight: 700; }

  .tl-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: #f1ece0; }
  .tl-seg button { padding: 10px 6px; border: 0; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600; background: transparent; color: #5d6f68; }
  .tl-seg button.on { background: #0b4a2e; color: #f3e2a6; }
  .tl-in-num { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #ddd5bd; background: #fff; font: inherit; font-size: 16px; color: #14201a; outline: none; }
  .tl-in-num:focus { border-color: #0b4a2e; box-shadow: 0 0 0 3px rgba(11,74,46,.1); }

  .tl-res { min-height: 84px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 12px; border-radius: 14px; text-align: center;
    font-size: 13px; color: #6b7a72; background: linear-gradient(160deg, #fffdf6, #f6efd9); border: 1px dashed #d8cba0; }
  .tl-res small { font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; color: #8a7a3e; }
  .tl-res b { font-family: var(--serif, Georgia, serif); font-size: 44px; font-weight: 500; line-height: 1; color: #0b4a2e; }
  .tl-res2 { flex-direction: row; gap: 14px; min-height: 150px; }
  .tl-res2 > div { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 18px 8px; border-radius: 12px; background: #fff; border: 1px solid #e8dcb4; }
  .tl-res2 b { font-size: 30px; }

  .tl-tabla { overflow-x: auto; border-radius: 14px; border: 1px solid #e8dcb4; outline: none; }
  .tl-tabla table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .tl-tabla th { padding: 10px 14px; text-align: left; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #f3e2a6; background: #0b4a2e; }
  .tl-tabla td { padding: 10px 14px; border-top: 1px solid #efe8d6; color: #35493f; font-variant-numeric: tabular-nums; }
  .tl-tabla td:first-child { font-weight: 700; color: #0b4a2e; }
  .tl-tabla tr.sel td { background: #f6e7aa; color: #14201a; font-weight: 700; }

  .tl-cadenas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .tl-cadenas article { padding: 20px 16px; border-radius: 16px; text-align: center; background: linear-gradient(160deg, #fffdf6, #f6efd9); border: 1px solid #e8dcb4; }
  .tl-cadenas b { display: block; font-family: var(--serif, Georgia, serif); font-size: 36px; font-weight: 500; color: #0b4a2e; }
  .tl-cadenas b small { font-size: 14px; color: #8a7a3e; }
  .tl-cadenas strong { display: block; margin: 4px 0 8px; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #b08d3c; }
  .tl-cadenas p { margin: 0; font-size: 12.5px; line-height: 1.5; color: #5d6f68; }

  .tl-ayuda { margin: 22px 0 0; text-align: center; font-size: 13.5px; color: #6b7a72; }
  .tl-ayuda a { color: #0b4a2e; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .tl-tabs button:focus-visible, .tl-seg button:focus-visible, .tl-ayuda a:focus-visible, .tl-tabla:focus-visible { outline: 2px solid #b08d3c; outline-offset: 2px; }

  /* Bloques plegables (escritorio: siempre abiertos y sin cabecera) */
  .dp-h { display: none; }
  .dp-pad { display: block; }

  @media (max-width: 860px) {
    .tl { padding: 14px 0 28px; }
    /* el título ya está en la tarjeta plegable de la página: aquí solo queda la frase */
    .tl-cab span, .tl-cab h3 { display: none; }
    .tl-cab { margin-bottom: 14px; }
    .tl-cab p { font-size: 13px; line-height: 1.45; }
    .tl-dos { grid-template-columns: 1fr; gap: 14px; }
    .tl-cadenas { grid-template-columns: 1fr 1fr; gap: 10px; }
    .tl-tabs { justify-content: stretch; }
    .tl-tabs button { flex: 1; padding: 10px 8px; }

    .dp { border: 1px solid #e8dcb4; border-radius: 14px; background: #fff; overflow: hidden; transition: border-color .2s; }
    .dp[data-open="true"] { border-color: #0b4a2e; }
    .dp-h { width: 100%; display: flex; align-items: center; gap: 10px; min-height: 50px; padding: 0 14px; border: 0; background: none; cursor: pointer; font: inherit; text-align: left; color: #14201a; -webkit-tap-highlight-color: transparent; }
    .dp-h:focus-visible { outline: 2px solid #b08d3c; outline-offset: -2px; }
    .dp-t { flex: 0 0 auto; font: 700 10.5px/1 system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #b08d3c; }
    .dp-r { flex: 1; min-width: 0; text-align: right; font-size: 12px; color: #6b7a72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dp-chev { flex: 0 0 auto; color: #b08d3c; transition: transform .25s ease; }
    .dp[data-open="true"] .dp-chev { transform: rotate(180deg); }
    .dp-b { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .28s ease; }
    .dp[data-open="true"] .dp-b { grid-template-rows: 1fr; }
    .dp-in { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear .28s; }
    .dp[data-open="true"] .dp-in { visibility: visible; transition-delay: 0s; }
    .dp-pad { padding: 2px 14px 14px; }
    .dp .tl-como { margin: 0; }
  }
  @media (max-width: 600px) {
    .tl-in { padding: 0 16px; }
    .tl-caja { padding: 18px 14px; }
    .tl-caja h4 { font-size: 20px; margin-bottom: 0; }
    .tl-res b { font-size: 38px; }
    .tl-res { min-height: 74px; }
  }
  @media (prefers-reduced-motion: reduce) { .dp-b, .dp-chev, .dp-in { transition: none; } }
`;