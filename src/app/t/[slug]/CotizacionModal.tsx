// 📁 RUTA: src/app/t/[slug]/CotizacionModal.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════
   MODAL DE COTIZACIÓN
   - Se abre desde CUALQUIER botón/enlace con  data-cotizar="reparacion" | "personalizado" | "general"
     (opcional: data-pieza="texto para precargar la descripción")
   - O desde código:  window.dispatchEvent(new CustomEvent('abrir-cotizacion', { detail: { tipo: 'reparacion', pieza: '...' } }))
   - POR AHORA solo es el formulario: al enviar se arma el objeto `CotizacionPayload`
     y se muestra la confirmación. Cuando esté listo el panel de administrador, solo hay que
     completar la función `enviarCotizacion` (más abajo).
   ═══════════════════════════════════════════════════════════════ */

export type TipoCotizacion = 'reparacion' | 'personalizado' | 'general';
type Entrega = 'tienda' | 'domicilio' | 'envio';

export type CotizacionPayload = {
  tipo: TipoCotizacion;
  descripcion: string;
  servicios: string[];
  nombre: string;
  celular: string;
  correo: string;
  entrega: Entrega;
  direccion: string;
  notas: string;
  foto: { nombre: string; tamano: number } | null;
  origen: string;
  creadaEn: string;
};

/** 👇 AQUÍ SE ENLAZA CON EL PANEL DE ADMINISTRADOR (pendiente) */
async function enviarCotizacion(p: CotizacionPayload): Promise<{ folio: string }> {
  // TODO(panel-admin): reemplazar este bloque por la llamada real, por ejemplo:
  //   const r = await fetch('/api/cotizaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
  //   if (!r.ok) throw new Error('No se pudo enviar');
  //   return await r.json(); // { folio }
  await new Promise((r) => setTimeout(r, 700));
  console.info('[cotización · pendiente de enlazar al panel]', p);
  return { folio: `COT-${Date.now().toString(36).toUpperCase().slice(-6)}` };
}

type Cfg = { titulo: string; sub: string; campo: string; ph: string; etiquetaSrv: string; servicios: string[] };
const CONFIG: Record<TipoCotizacion, Cfg> = {
  reparacion: {
    titulo: 'Cotizar reparación',
    sub: 'Diagnóstico sin costo y precio confirmado antes de empezar.',
    campo: '¿Qué pieza es y qué le pasó?',
    ph: 'Ej: Cadena de 50 cm, se rompió cerca del broche',
    etiquetaSrv: 'Servicio (elige uno o más)',
    servicios: ['Soldadura', 'Cambio de talla', 'Engaste de piedras', 'Pulido y limpieza', 'Grabado', 'Restauración', 'No estoy seguro'],
  },
  personalizado: {
    titulo: 'Cotizar joya a medida',
    sub: 'Cuéntanos tu idea y te enviamos diseño y valor.',
    campo: 'Describe la joya que imaginas',
    ph: 'Ej: Anillo en oro 18K con la inicial de mi hija y una piedra azul',
    etiquetaSrv: 'Tipo de joya',
    servicios: ['Anillo', 'Cadena', 'Dije', 'Pulsera', 'Aretes', 'Argollas de matrimonio', 'Otro'],
  },
  general: {
    titulo: 'Solicitar cotización',
    sub: 'Cuéntanos qué necesitas y te respondemos por WhatsApp.',
    campo: '¿Qué necesitas cotizar?',
    ph: 'Ej: Quiero cotizar la cadena tejido lazo en 18K',
    etiquetaSrv: 'Interés',
    servicios: ['Una pieza del catálogo', 'Joya personalizada', 'Reparación', 'Compra al por mayor'],
  },
};

const ENTREGAS: { v: Entrega; t: string }[] = [
  { v: 'tienda', t: 'La llevo a la tienda' },
  { v: 'domicilio', t: 'Recojo a domicilio' },
  { v: 'envio', t: 'La envío por mensajería' },
];

export default function CotizacionModal({ marca, wa }: { marca: string; wa: string }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoCotizacion>('reparacion');
  const [descripcion, setDescripcion] = useState('');
  const [servicios, setServicios] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [entrega, setEntrega] = useState<Entrega>('tienda');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [falla, setFalla] = useState('');
  const [resumen, setResumen] = useState<{ folio: string; p: CotizacionPayload } | null>(null);

  const cuerpo = useRef<HTMLDivElement>(null);
  const primero = useRef<HTMLTextAreaElement>(null);
  const cfg = CONFIG[tipo];

  const limpiar = useCallback(() => {
    setDescripcion(''); setServicios([]); setNombre(''); setCelular(''); setCorreo('');
    setEntrega('tienda'); setDireccion(''); setNotas(''); setFoto(null);
    setErrores({}); setFalla(''); setResumen(null);
  }, []);

  const abrir = useCallback((t: TipoCotizacion, pieza?: string) => {
    limpiar();
    setTipo(t);
    if (pieza) setDescripcion(pieza);
    setAbierto(true);
  }, [limpiar]);

  /* Abrir desde cualquier [data-cotizar] o desde el evento 'abrir-cotizacion' */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-cotizar]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      const t = el.dataset.cotizar;
      abrir(t === 'reparacion' || t === 'personalizado' ? t : 'general', el.dataset.pieza);
    };
    const onEvt = (e: Event) => {
      const d = ((e as CustomEvent).detail ?? {}) as { tipo?: TipoCotizacion; pieza?: string };
      abrir(d.tipo ?? 'general', d.pieza);
    };
    document.addEventListener('click', onClick);
    window.addEventListener('abrir-cotizacion', onEvt);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('abrir-cotizacion', onEvt);
    };
  }, [abrir]);

  /* Escape, bloqueo de scroll y foco inicial */
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => primero.current?.focus(), 80);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [abierto]);

  /* Vista previa de la foto */
  useEffect(() => {
    if (!foto) { setFotoUrl(''); return; }
    const u = URL.createObjectURL(foto);
    setFotoUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [foto]);

  const alternar = (s: string) =>
    setServicios((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (descripcion.trim().length < 5) er.descripcion = 'Cuéntanos un poco más para poder cotizar.';
    if (!nombre.trim()) er.nombre = 'Escribe tu nombre.';
    if (celular.replace(/\D/g, '').length < 10) er.celular = 'Escribe un celular válido (10 dígitos).';
    if (correo.trim() && !/^\S+@\S+\.\S+$/.test(correo.trim())) er.correo = 'Revisa el correo.';
    if (entrega !== 'tienda' && !direccion.trim()) er.direccion = 'Indícanos la dirección.';
    setErrores(er);
    if (Object.keys(er).length) {
      window.setTimeout(() => cuerpo.current?.querySelector('.cq-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
      return;
    }
    const payload: CotizacionPayload = {
      tipo,
      descripcion: descripcion.trim(),
      servicios,
      nombre: nombre.trim(),
      celular: celular.replace(/\D/g, ''),
      correo: correo.trim(),
      entrega,
      direccion: entrega === 'tienda' ? '' : direccion.trim(),
      notas: notas.trim(),
      foto: foto ? { nombre: foto.name, tamano: foto.size } : null,
      origen: typeof window !== 'undefined' ? window.location.pathname : '',
      creadaEn: new Date().toISOString(),
    };
    setEnviando(true);
    setFalla('');
    try {
      const { folio } = await enviarCotizacion(payload);
      setResumen({ folio, p: payload });
      cuerpo.current?.scrollTo({ top: 0 });
    } catch {
      setFalla('No pudimos enviar tu solicitud. Inténtalo de nuevo en un momento.');
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) return null;

  const entregaTxt = (v: Entrega) => ENTREGAS.find((x) => x.v === v)?.t ?? v;
  const waMsg = resumen
    ? `${wa}?text=${encodeURIComponent(`Hola ${marca}, acabo de enviar la cotización ${resumen.folio}. Soy ${resumen.p.nombre}.`)}`
    : '#';

  return (
    <div className="cq-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
      <style>{CSS}</style>
      <div className="cq-modal" role="dialog" aria-modal="true" aria-labelledby="cq-titulo">
        <header className="cq-head">
          <div>
            <small>{marca}</small>
            <h2 id="cq-titulo">{resumen ? '¡Solicitud recibida!' : cfg.titulo}</h2>
            {!resumen && <p>{cfg.sub}</p>}
          </div>
          <button type="button" className="cq-x" onClick={() => setAbierto(false)} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>

        {resumen ? (
          <>
            <div className="cq-body" ref={cuerpo}>
              <div className="cq-ok">
                <span className="cq-check">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                </span>
                <p>Tu número de solicitud es <b>{resumen.folio}</b>. Te contactaremos al <b>{resumen.p.celular}</b> con el valor y los tiempos.</p>
              </div>
              <dl className="cq-res">
                <div><dt>Tipo</dt><dd>{CONFIG[resumen.p.tipo].titulo.replace('Cotizar ', '').replace('Solicitar ', '')}</dd></div>
                <div><dt>Descripción</dt><dd>{resumen.p.descripcion}</dd></div>
                {resumen.p.servicios.length > 0 && <div><dt>Servicio</dt><dd>{resumen.p.servicios.join(' · ')}</dd></div>}
                <div><dt>Cliente</dt><dd>{resumen.p.nombre}{resumen.p.correo ? ` · ${resumen.p.correo}` : ''}</dd></div>
                <div><dt>Entrega</dt><dd>{entregaTxt(resumen.p.entrega)}{resumen.p.direccion ? ` · ${resumen.p.direccion}` : ''}</dd></div>
                {resumen.p.foto && <div><dt>Foto</dt><dd>{resumen.p.foto.nombre}</dd></div>}
                {resumen.p.notas && <div><dt>Notas</dt><dd>{resumen.p.notas}</dd></div>}
              </dl>
            </div>
            <footer className="cq-foot">
              <button type="button" className="cq-btn ghost" onClick={() => abrir(tipo)}>Nueva solicitud</button>
              {wa !== '#' && <a className="cq-btn" href={waMsg} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>}
              <button type="button" className="cq-btn solid" onClick={() => setAbierto(false)}>Listo</button>
            </footer>
          </>
        ) : (
          <form onSubmit={enviar} noValidate>
            <div className="cq-body" ref={cuerpo}>
              {/* 1 · La pieza */}
              <section className="cq-sec">
                <h3><i>1</i> Tu pieza</h3>
                <label className="cq-l" htmlFor="cq-desc">{cfg.campo}</label>
                <textarea id="cq-desc" ref={primero} rows={4} value={descripcion} placeholder={cfg.ph}
                  onChange={(e) => setDescripcion(e.target.value)} aria-invalid={!!errores.descripcion} />
                {errores.descripcion && <p className="cq-err">{errores.descripcion}</p>}

                <span className="cq-l">{cfg.etiquetaSrv}</span>
                <div className="cq-chips" role="group" aria-label={cfg.etiquetaSrv}>
                  {cfg.servicios.map((s) => (
                    <button type="button" key={s} className={servicios.includes(s) ? 'on' : ''} aria-pressed={servicios.includes(s)} onClick={() => alternar(s)}>{s}</button>
                  ))}
                </div>

                <span className="cq-l">Foto de referencia <em>(opcional)</em></span>
                <label className="cq-foto">
                  <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
                  {fotoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <><img src={fotoUrl} alt="Vista previa" /><span>{foto?.name}<small>Toca para cambiarla</small></span></>
                    : <span>Adjuntar una foto<small>Nos ayuda a cotizar más rápido</small></span>}
                </label>
              </section>

              {/* 2 · Datos */}
              <section className="cq-sec">
                <h3><i>2</i> Tus datos</h3>
                <div className="cq-dos">
                  <div>
                    <label className="cq-l" htmlFor="cq-nom">Nombre</label>
                    <input id="cq-nom" value={nombre} autoComplete="name" onChange={(e) => setNombre(e.target.value)} aria-invalid={!!errores.nombre} />
                    {errores.nombre && <p className="cq-err">{errores.nombre}</p>}
                  </div>
                  <div>
                    <label className="cq-l" htmlFor="cq-cel">Celular / WhatsApp</label>
                    <input id="cq-cel" inputMode="tel" autoComplete="tel" value={celular} placeholder="300 000 0000"
                      onChange={(e) => setCelular(e.target.value)} aria-invalid={!!errores.celular} />
                    {errores.celular && <p className="cq-err">{errores.celular}</p>}
                  </div>
                </div>
                <label className="cq-l" htmlFor="cq-mail">Correo <em>(opcional)</em></label>
                <input id="cq-mail" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} aria-invalid={!!errores.correo} />
                {errores.correo && <p className="cq-err">{errores.correo}</p>}
              </section>

              {/* 3 · Entrega */}
              <section className="cq-sec">
                <h3><i>3</i> Entrega</h3>
                <div className="cq-radios" role="radiogroup" aria-label="Entrega">
                  {ENTREGAS.map((o) => (
                    <label key={o.v} className={entrega === o.v ? 'on' : ''}>
                      <input type="radio" name="cq-ent" checked={entrega === o.v} onChange={() => setEntrega(o.v)} />
                      <span>{o.t}</span>
                    </label>
                  ))}
                </div>
                {entrega !== 'tienda' && (
                  <>
                    <label className="cq-l" htmlFor="cq-dir">Dirección y ciudad</label>
                    <input id="cq-dir" value={direccion} autoComplete="street-address" onChange={(e) => setDireccion(e.target.value)} aria-invalid={!!errores.direccion} />
                    {errores.direccion && <p className="cq-err">{errores.direccion}</p>}
                  </>
                )}
                <label className="cq-l" htmlFor="cq-not">Notas <em>(opcional)</em></label>
                <textarea id="cq-not" rows={2} value={notas} placeholder="Fecha que la necesitas, presupuesto, detalles…" onChange={(e) => setNotas(e.target.value)} />
              </section>
              {falla && <p className="cq-err cq-falla" role="alert">{falla}</p>}
            </div>
            <footer className="cq-foot">
              <button type="button" className="cq-btn ghost" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="submit" className="cq-btn solid" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

const CSS = `
.cq-fondo { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgba(3,12,8,.74); backdrop-filter: blur(8px); animation: cq-in .25s ease both; }
@keyframes cq-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes cq-up { from { opacity: 0; transform: translateY(24px) scale(.98); } to { opacity: 1; transform: none; } }
.cq-modal { width: min(100%, 660px); max-height: min(92vh, 900px); display: flex; flex-direction: column; overflow: hidden; color: #dfe5e1; border-radius: 22px;
  border: 1px solid rgba(224,183,63,.4); background: linear-gradient(170deg, #0f1a14, #080e0b 60%); box-shadow: 0 40px 90px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.03) inset; animation: cq-up .35s cubic-bezier(.2,.7,.2,1) both; }
.cq-modal form { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.cq-head { display: flex; justify-content: space-between; gap: 16px; padding: 22px 24px 18px; border-bottom: 1px solid rgba(224,183,63,.22);
  background: linear-gradient(135deg, rgba(15,95,59,.55), rgba(8,14,11,.4)); }
.cq-head small { display: block; font-size: 10.5px; letter-spacing: .26em; text-transform: uppercase; color: #e0b73f; margin-bottom: 6px; }
.cq-head h2 { margin: 0; font: 500 clamp(22px, 3vw, 28px)/1.15 var(--serif), Georgia, serif; color: #fbf6e6; }
.cq-head p { margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: #aab6af; }
.cq-x { flex: 0 0 auto; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; cursor: pointer; color: #cfd6d2; background: rgba(255,255,255,.05); border: 1px solid rgba(190,200,194,.25); transition: .2s; }
.cq-x:hover { background: #e0b73f; color: #1a1405; border-color: #e0b73f; }
.cq-body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 24px 6px; overscroll-behavior: contain; }
.cq-sec { padding: 16px 0 12px; border-bottom: 1px solid rgba(190,200,194,.12); }
.cq-sec:last-of-type { border-bottom: 0; }
.cq-sec h3 { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font: 600 11px/1 system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: #e0b73f; }
.cq-sec h3 i { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; font: 700 11px/1 system-ui; letter-spacing: 0; color: #1a1405; background: linear-gradient(135deg, #f0d680, #e0b73f); }
.cq-l { display: block; margin: 14px 0 7px; font-size: 12.5px; font-weight: 600; color: #b9c4be; }
.cq-l em { font-style: normal; font-weight: 400; color: #7f8d86; }
.cq-modal input:not([type=radio]):not([type=file]), .cq-modal textarea { width: 100%; padding: 12px 14px; font: inherit; font-size: 14px; color: #e8ede9; background: #18211d; border: 1px solid #33423b; border-radius: 12px; transition: border-color .2s, box-shadow .2s; }
.cq-modal textarea { resize: vertical; min-height: 56px; }
.cq-modal ::placeholder { color: #7f8d86; }
.cq-modal input:focus-visible, .cq-modal textarea:focus-visible { outline: none; border-color: #e0b73f; box-shadow: 0 0 0 3px rgba(224,183,63,.2); }
.cq-modal [aria-invalid="true"] { border-color: #e0856b !important; }
.cq-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cq-err { margin: 6px 0 0; font-size: 12px; color: #f0a48f; }
.cq-falla { padding: 10px 12px; border-radius: 10px; background: rgba(224,133,107,.1); border: 1px solid rgba(224,133,107,.4); }
.cq-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.cq-chips button { cursor: pointer; padding: 8px 14px; font: inherit; font-size: 12.5px; color: #cfd6d2; background: #18211d; border: 1px solid #33423b; border-radius: 999px; transition: .2s; }
.cq-chips button:hover { border-color: #e0b73f; color: #fff; }
.cq-chips button.on { color: #1a1405; font-weight: 600; background: linear-gradient(135deg, #f0d680, #e0b73f); border-color: transparent; }
.cq-foto { display: flex; align-items: center; gap: 14px; padding: 12px; cursor: pointer; border: 1px dashed #4a5b52; border-radius: 14px; background: rgba(24,33,29,.6); transition: .2s; }
.cq-foto:hover { border-color: #e0b73f; }
.cq-foto input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.cq-foto img { width: 54px; height: 54px; border-radius: 10px; object-fit: cover; border: 1px solid #e0b73f; }
.cq-foto span { font-size: 13px; color: #cfd6d2; } .cq-foto small { display: block; margin-top: 2px; font-size: 11.5px; color: #7f8d86; }
.cq-foto:focus-within { border-color: #e0b73f; box-shadow: 0 0 0 3px rgba(224,183,63,.2); }
.cq-radios { display: grid; gap: 8px; }
.cq-radios label { display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer; font-size: 13.5px; color: #cfd6d2; background: #18211d; border: 1px solid #33423b; border-radius: 12px; transition: .2s; }
.cq-radios label::before { content: ""; flex: 0 0 16px; height: 16px; border-radius: 50%; border: 2px solid #5d6e65; transition: .2s; }
.cq-radios label.on { border-color: #e0b73f; background: rgba(224,183,63,.07); color: #fff; }
.cq-radios label.on::before { border-color: #e0b73f; background: radial-gradient(circle, #e0b73f 45%, transparent 50%); }
.cq-radios input { position: absolute; opacity: 0; pointer-events: none; }
.cq-radios label:focus-within { box-shadow: 0 0 0 3px rgba(224,183,63,.2); }
.cq-foot { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; padding: 14px 24px 18px; border-top: 1px solid rgba(224,183,63,.22); background: rgba(3,12,8,.55); }
.cq-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 22px; cursor: pointer; font: 600 11.5px/1 system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #f4efdc; border-radius: 10px; border: 1px solid rgba(224,183,63,.6); background: transparent; transition: .2s; text-decoration: none; }
.cq-btn:hover { background: rgba(224,183,63,.12); }
.cq-btn.ghost { border-color: #4a5b52; color: #b9c4be; }
.cq-btn.solid { color: #1a1405; border-color: transparent; background: linear-gradient(135deg, #f0d680, #e0b73f 55%, #b08d3c); }
.cq-btn.solid:hover { filter: brightness(1.08); }
.cq-btn:disabled { opacity: .6; cursor: progress; }
.cq-btn:focus-visible, .cq-x:focus-visible { outline: 2px solid #f0d680; outline-offset: 2px; }
.cq-ok { display: flex; align-items: center; gap: 16px; margin: 18px 0 8px; padding: 16px; border-radius: 16px; background: rgba(15,95,59,.3); border: 1px solid rgba(224,183,63,.35); }
.cq-ok p { margin: 0; font-size: 14px; line-height: 1.55; color: #dfe5e1; } .cq-ok b { color: #f0d680; }
.cq-check { flex: 0 0 56px; height: 56px; display: grid; place-items: center; border-radius: 50%; color: #1a1405; background: linear-gradient(135deg, #f0d680, #e0b73f); box-shadow: 0 0 0 6px rgba(224,183,63,.15); }
.cq-res { margin: 8px 0 14px; display: grid; gap: 1px; border-radius: 14px; overflow: hidden; border: 1px solid #33423b; background: #33423b; }
.cq-res div { display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 11px 14px; background: #131c17; }
.cq-res dt { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #8a9990; } .cq-res dd { margin: 0; font-size: 13.5px; color: #e4e9e6; overflow-wrap: anywhere; }
@media (max-width: 600px) {
  .cq-fondo { align-items: end; padding: 0; }
  .cq-modal { width: 100%; max-height: 94dvh; border-radius: 22px 22px 0 0; }
  .cq-head, .cq-body, .cq-foot { padding-left: 16px; padding-right: 16px; }
  .cq-dos { grid-template-columns: 1fr; gap: 0; }
  .cq-foot { padding-bottom: calc(18px + env(safe-area-inset-bottom)); } .cq-foot .cq-btn { flex: 1 1 100%; }
  .cq-res div { grid-template-columns: 1fr; gap: 2px; }
}
@media (prefers-reduced-motion: reduce) { .cq-fondo, .cq-modal { animation: none; } }
`;