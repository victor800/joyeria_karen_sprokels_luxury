// 📁 RUTA: src/app/dashboard/hans/HansConfig.tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';

/* ---------- Tipos compartidos con HansPanel ---------- */
export type PF = {
  pesos: { mm: string; g: string; v: string }[]; // v = valor fijo $ por unidad (opcional)
  tipos: { id: string; nombre: string; f: string }[];
  ini: { pequena: string; mediana: string; grande: string };
  dijes: { id: string; nombre: string; g: string }[];
};
type PalT = { hi: string; mid: string; lo: string; edge: string };
type MetalK = 'dorado' | 'plateado' | 'rosado';
type Ini = { txt: string; estilo: 'placa' | 'cuadrada' | 'letra'; tam: 'pequena' | 'mediana' | 'grande' };
export type Draw = {
  metales: Record<MetalK, PalT>;
  dije: (c: CanvasRenderingContext2D, id: string, pal: PalT, back: boolean) => void;
  inicial: (c: CanvasRenderingContext2D, ini: Ini, pal: PalT, back: boolean) => void;
};
type Props = {
  cfg: { oro18: number; oro24: number; actualizado: string };
  cfgForm: { oro18: string; oro24: string };
  setCfgForm: React.Dispatch<React.SetStateAction<{ oro18: string; oro24: string }>>;
  nOro: number;
  pf: PF;
  setPf: React.Dispatch<React.SetStateAction<PF>>;
  calc18desde24: () => void;
  guardarConfig: () => void;
  guardando: boolean;
  draw: Draw;
};

const DENS_24 = 1.24;
const PX_MM = 8; // escala del dibujo de balines: 8 px = 1 mm
const INI_MM = { pequena: 7, mediana: 9, grande: 12 };
const INI_TXT = { pequena: 'Pequeña', mediana: 'Mediana', grande: 'Grande' };
const PRESET_DIJES = ['corazon', 'estrella', 'cruz', 'luna', 'mariposa', 'trebol', 'hamsa', 'infinito', 'ancla', 'medalla'];
const METALES: { k: MetalK; t: string }[] = [
  { k: 'dorado', t: 'Dorado' },
  { k: 'plateado', t: 'Plateado' },
  { k: 'rosado', t: 'Rosado' },
];

const num = (s?: string) => Number(String(s || '').replace(/\D/g, '')) || 0;
const gr = (s?: string) => Number(String(s || '').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
const copN = (n: number) => (n > 0 ? `$${Math.round(n).toLocaleString('es-CO')}` : '—');
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const kindOf = (id: string) =>
  id.includes('diamant') ? 'diamantado' : id.includes('facet') ? 'facetado' : id.includes('martill') ? 'martillado'
    : id.includes('estri') || id.includes('rayad') ? 'estriado' : 'liso';

/* ---------- Balín dibujado (SVG, diámetro en px) ---------- */
function BeadSvg({ d, kind, pal }: { d: number; kind: string; pal: PalT }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const r = d / 2;
  const lines: React.ReactNode[] = [];
  if (kind === 'diamantado' || kind === 'facetado') {
    const step = Math.max(3, r * (kind === 'diamantado' ? 0.55 : 1));
    for (let t = -d, i = 0; t <= d; t += step, i++) {
      lines.push(<line key={`a${i}`} x1={t - d} y1={0} x2={t + d} y2={d} stroke="rgba(255,255,255,.55)" strokeWidth={Math.max(0.5, r * 0.05)} />);
      if (kind === 'diamantado') lines.push(<line key={`b${i}`} x1={t + d} y1={0} x2={t - d} y2={d} stroke="rgba(40,20,0,.32)" strokeWidth={Math.max(0.5, r * 0.05)} />);
      else lines.push(<line key={`b${i}`} x1={0} y1={t + d / 2} x2={d} y2={t + d / 2} stroke="rgba(40,20,0,.28)" strokeWidth={Math.max(0.5, r * 0.05)} />);
    }
  } else if (kind === 'martillado') {
    for (let j = 0; j < 12; j++) {
      const ang = j * 2.4 + 1, rad = r * (0.2 + 0.65 * (((j * 37) % 10) / 10));
      const x = r + Math.cos(ang) * rad, y = r + Math.sin(ang) * rad;
      lines.push(<circle key={`m${j}`} cx={x} cy={y} r={r * 0.17} fill="rgba(40,20,0,.28)" />);
      lines.push(<circle key={`n${j}`} cx={x - r * 0.04} cy={y - r * 0.05} r={r * 0.08} fill="rgba(255,255,255,.3)" />);
    }
  } else if (kind === 'estriado') {
    for (let t = r * 0.2, i = 0; t < d; t += r * 0.38, i++) lines.push(<line key={`e${i}`} x1={0} y1={t} x2={d} y2={t} stroke="rgba(40,20,0,.35)" strokeWidth={Math.max(0.6, r * 0.07)} />);
  }
  return (
    <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} aria-hidden="true" style={{ display: 'block', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.45))' }}>
      <defs>
        <radialGradient id={`g${uid}`} cx="35%" cy="32%" r="78%">
          <stop offset="0" stopColor={pal.hi} /><stop offset=".5" stopColor={pal.mid} /><stop offset="1" stopColor={pal.lo} />
        </radialGradient>
        <clipPath id={`c${uid}`}><circle cx={r} cy={r} r={r} /></clipPath>
      </defs>
      <circle cx={r} cy={r} r={Math.max(0.5, r - 0.4)} fill={`url(#g${uid})`} stroke={pal.edge} strokeWidth=".6" />
      <g clipPath={`url(#c${uid})`}>{lines}</g>
      <ellipse cx={r * 0.64} cy={r * 0.6} rx={r * 0.2} ry={r * 0.13} fill="rgba(255,255,255,.6)" transform={`rotate(-35 ${r * 0.64} ${r * 0.6})`} />
    </svg>
  );
}

/* ---------- Pieza dibujada en canvas (dijes / inicial) ---------- */
function Pieza({ w, h, s, dy = 0, fn }: { w: number; h: number; s: number; dy?: number; fn: (c: CanvasRenderingContext2D) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.translate(w / 2, h / 2 + dy);
    c.scale(s, s);
    fn(c);
  });
  return <canvas ref={ref} style={{ width: w, height: h, display: 'block' }} aria-hidden="true" />;
}

export default function HansConfig({ cfg, cfgForm, setCfgForm, nOro, pf, setPf, calc18desde24, guardarConfig, guardando, draw }: Props) {
  const [nuevoMm, setNuevoMm] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [nuevoDije, setNuevoDije] = useState('');
  const [metal, setMetal] = useState<MetalK>('dorado');
  const pal = draw.metales[metal];
  const p18 = num(cfgForm.oro18);
  const p24 = num(cfgForm.oro24);

  const setPeso = (i: number, k: 'mm' | 'g' | 'v', v: string) => setPf((p) => ({ ...p, pesos: p.pesos.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const setTipo = (i: number, k: 'nombre' | 'f', v: string) => setPf((p) => ({ ...p, tipos: p.tipos.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const setDije = (i: number, k: 'nombre' | 'g', v: string) => setPf((p) => ({ ...p, dijes: p.dijes.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  function addTam() {
    const mm = gr(nuevoMm);
    if (!mm) return;
    if (pf.pesos.some((r) => gr(r.mm) === mm)) return setNuevoMm('');
    const ref = pf.pesos.map((r) => ({ mm: gr(r.mm), g: gr(r.g) })).filter((r) => r.mm > 0 && r.g > 0)
      .sort((a, b) => Math.abs(a.mm - mm) - Math.abs(b.mm - mm))[0];
    const est = ref ? Math.round(ref.g * Math.pow(mm / ref.mm, 3) * 1000) / 1000 : 0.1;
    setPf((p) => ({ ...p, pesos: [...p.pesos, { mm: String(mm), g: String(est), v: '' }].sort((a, b) => gr(a.mm) - gr(b.mm)) }));
    setNuevoMm('');
  }
  function addTipo() {
    const n = nuevoTipo.trim();
    if (!n) return;
    const id = slug(n) || `t${Date.now().toString(36)}`;
    if (pf.tipos.some((t) => t.id === id)) return setNuevoTipo('');
    setPf((p) => ({ ...p, tipos: [...p.tipos, { id, nombre: n, f: '100' }] }));
    setNuevoTipo('');
  }
  function addDije() {
    const n = nuevoDije.trim();
    if (!n) return;
    const id = `c-${slug(n) || Date.now().toString(36)}`;
    if (pf.dijes.some((d) => d.id === id)) return setNuevoDije('');
    setPf((p) => ({ ...p, dijes: [...p.dijes, { id, nombre: n, g: '0.5' }] }));
    setNuevoDije('');
  }

  const fecha = cfg.actualizado ? new Date(cfg.actualizado).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'sin guardar';

  return (
    <div className="cf">
      <style>{`
        .cf { width: 100%; padding-bottom: 96px; display: grid; gap: 18px; }
        .cf * { box-sizing: border-box; }
        .cf-card { background: #fff; border: 1px solid #ece7d6; border-radius: 22px; padding: 22px 24px; box-shadow: 0 2px 14px rgba(11,45,31,.05); }
        .cf-h { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
        .cf-hx { flex: 1; min-width: 220px; }
        .cf-ic { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; background: linear-gradient(135deg, #0b2d1f, #14573f); color: #f0c14b; flex-shrink: 0; }
        .cf-h h2 { margin: 0; font-size: 22px; font-weight: 500; color: #0b2d1f; }
        .cf-h p { margin: 3px 0 0; font-size: 12.5px; color: #7a857e; line-height: 1.5; max-width: 700px; }
        .cf-2 { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 18px; align-items: start; }
        .cf-seg { display: inline-flex; border: 1px solid #d8b95f; border-radius: 99px; overflow: hidden; background: #fffdf8; flex-shrink: 0; }
        .cf-seg button { font: inherit; font-size: 12px; font-weight: 600; padding: 7px 14px; border: 0; background: transparent; cursor: pointer; color: #7a6a30; }
        .cf-seg button[aria-pressed="true"] { background: #0b2d1f; color: #f6e7b4; }

        /* ORO */
        .cf-oro { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .cf-gold { position: relative; overflow: hidden; border-radius: 22px; padding: 20px 22px; color: #f6e7b4; background: linear-gradient(135deg, #000 0%, #07241a 55%, #0f3d2a 100%); border: 1px solid rgba(216,185,95,.65); box-shadow: 0 10px 26px rgba(7,33,26,.25); }
        .cf-gold::before { content: ""; position: absolute; right: -50px; top: -50px; width: 170px; height: 170px; border-radius: 50%; background: radial-gradient(circle, rgba(240,193,75,.32), transparent 70%); }
        .cf-gold small { display: block; font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; color: rgba(246,231,180,.7); font-weight: 700; }
        .cf-gold h3 { margin: 4px 0 12px; font-size: 30px; font-weight: 500; color: #f0c14b; }
        .cf-gin { position: relative; display: flex; align-items: center; background: rgba(255,255,255,.07); border: 1px solid rgba(240,193,75,.55); border-radius: 14px; overflow: hidden; }
        .cf-gin span { padding: 0 4px 0 14px; color: #f0c14b; font-size: 20px; }
        .cf-gin input { flex: 1; min-width: 0; width: 100%; background: transparent; border: 0; outline: 0; color: #fff; font: inherit; font-size: 26px; padding: 12px 8px; }
        .cf-gin em { font-style: normal; font-size: 11.5px; color: rgba(246,231,180,.65); padding-right: 14px; }
        .cf-gold button { margin-top: 12px; font: inherit; font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 99px; cursor: pointer; border: 1px solid rgba(240,193,75,.6); background: transparent; color: #f0c14b; }
        .cf-gold button:hover { background: rgba(240,193,75,.15); }
        .cf-info { border-radius: 22px; padding: 20px 22px; background: #faf8f2; border: 1px dashed #d8b95f; display: grid; gap: 12px; align-content: center; }
        .cf-info div { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 13px; color: #44514a; border-bottom: 1px solid #ece7d6; padding-bottom: 9px; }
        .cf-info div:last-child { border: 0; padding: 0; }
        .cf-info b { font-size: 18px; font-weight: 500; color: #0b2d1f; text-align: right; }

        /* BALINES */
        .cf-bgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(146px, 1fr)); gap: 12px; }
        .cf-b { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid #ece7d6; background: #fff; display: flex; flex-direction: column; }
        .cf-stage { height: 110px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 40%, #14573f, #06191a 85%); position: relative; }
        .cf-stage::after { content: attr(data-mm); position: absolute; left: 8px; top: 6px; font-size: 11px; font-weight: 700; color: #f0c14b; letter-spacing: .04em; }
        .cf-body { padding: 10px; display: grid; gap: 6px; }
        .cf-fld { display: flex; align-items: center; border: 1px solid rgba(128,128,128,.35); border-radius: 10px; background: #fffdf8; overflow: hidden; }
        .cf-fld input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; padding: 8px 6px 8px 10px; text-align: center; }
        .cf-fld em { font-style: normal; font-size: 11px; color: #8a978f; padding-right: 10px; }
        .cf-fld.money { border-color: #d8b95f; background: #fff9e8; }
        .cf-fld.money em { padding: 0 0 0 10px; color: #7a6a30; font-weight: 700; }
        .cf-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #8a978f; font-weight: 700; text-align: center; margin-top: 2px; }
        .cf-val { text-align: center; font-size: 11px; color: #5a6b62; line-height: 1.5; }
        .cf-val b { color: #0b4a2e; font-weight: 600; }
        .cf-val .fix { color: #8a5a00; }
        .cf-x { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; border: 0; cursor: pointer; padding: 0; background: rgba(255,255,255,.14); color: #fff; line-height: 1; font-size: 12px; z-index: 2; }
        .cf-x:hover { background: #b04a3f; }
        .cf-addc { border-radius: 18px; border: 2px dashed #d8b95f; background: #fffdf8; padding: 14px; display: flex; flex-direction: column; gap: 8px; justify-content: center; min-height: 190px; text-align: center; font-size: 12px; color: #7a6a30; }
        .cf-btn { font: inherit; font-size: 12.5px; font-weight: 600; height: 38px; padding: 0 14px; border-radius: 10px; cursor: pointer; border: 1px solid #b08d3c; background: #0b2d1f; color: #f6e7b4; }
        .cf-btn:hover { background: #14573f; }
        .cf-scale { margin: 14px 0 0; font-size: 11.5px; color: #8a978f; text-align: center; line-height: 1.5; }

        /* TIPOS */
        .cf-tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
        .cf-t { position: relative; border-radius: 18px; border: 1px solid #ece7d6; padding: 14px 12px 12px; display: grid; gap: 9px; justify-items: center; background: linear-gradient(180deg, #fffdf8, #fff); }
        .cf-t .cf-stage { width: 100%; height: 96px; border-radius: 14px; }
        .cf-t .cf-x { background: rgba(176,74,63,.85); }
        .cf-t > input { width: 100%; text-align: center; border: 0; border-bottom: 1px solid #e3dcc2; background: transparent; font: inherit; font-size: 14px; font-weight: 600; color: #0b2d1f; padding: 4px; outline: 0; }
        .cf-t .cf-fld { width: 100%; }
        .cf-bar { width: 100%; height: 6px; border-radius: 99px; background: #efe9d3; overflow: hidden; }
        .cf-bar i { display: block; height: 100%; background: linear-gradient(90deg, #e6b422, #b7791f); border-radius: 99px; }

        /* INICIAL */
        .cf-igrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .cf-i { border-radius: 18px; overflow: hidden; border: 1px solid #ece7d6; display: flex; flex-direction: column; background: #fff; }
        .cf-i .cf-stage { height: 120px; }
        .cf-i .cf-body > strong { text-align: center; font-size: 13px; color: #0b2d1f; font-weight: 600; }

        /* DIJES */
        .cf-dgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
        .cf-d { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid #ece7d6; background: #fff; display: flex; flex-direction: column; }
        .cf-d .cf-stage { height: 104px; }
        .cf-d .cf-body > input { width: 100%; text-align: center; border: 0; border-bottom: 1px solid #e3dcc2; background: transparent; font: inherit; font-size: 13.5px; font-weight: 600; color: #0b2d1f; padding: 4px; outline: 0; }

        .cf-sticky { position: sticky; bottom: 12px; z-index: 5; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; background: #0b2d1f; border: 1px solid rgba(216,185,95,.5); border-radius: 18px; padding: 12px 18px; box-shadow: 0 8px 24px rgba(0,0,0,.28); }
        .cf-sticky span { color: #f3ead2; font-size: 13px; flex: 1 1 220px; }
        .cf-sticky button { font: inherit; font-size: 12px; font-weight: 700; letter-spacing: .1em; padding: 12px 22px; border-radius: 99px; border: 0; cursor: pointer; background: #f0c14b; color: #1b1608; }
        .cf-sticky button:disabled { opacity: .6; cursor: wait; }

        @media (max-width: 1000px) {
          .cf-oro { grid-template-columns: 1fr 1fr; }
          .cf-info { grid-column: 1 / -1; }
          .cf-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .cf-oro { grid-template-columns: 1fr; }
          .cf-card { padding: 16px 14px; }
          .cf-h h2 { font-size: 19px; }
          .cf-bgrid, .cf-tgrid, .cf-dgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .cf-igrid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ===== PRECIO DEL ORO ===== */}
      <section className="cf-oro" aria-label="Precio del oro">
        <div className="cf-gold">
          <small>Oro · pureza máxima</small>
          <h3>24 K</h3>
          <label className="cf-gin">
            <span>$</span>
            <input aria-label="Precio oro 24k por gramo" inputMode="numeric" placeholder="0"
              value={p24 ? p24.toLocaleString('es-CO') : ''} onChange={(e) => setCfgForm((f) => ({ ...f, oro24: e.target.value.replace(/\D/g, '') }))} />
            <em>/ gramo</em>
          </label>
        </div>
        <div className="cf-gold">
          <small>Oro · el más vendido</small>
          <h3>18 K</h3>
          <label className="cf-gin">
            <span>$</span>
            <input aria-label="Precio oro 18k por gramo" inputMode="numeric" placeholder="0"
              value={p18 ? p18.toLocaleString('es-CO') : ''} onChange={(e) => setCfgForm((f) => ({ ...f, oro18: e.target.value.replace(/\D/g, '') }))} />
            <em>/ gramo</em>
          </label>
          <button type="button" onClick={calc18desde24}>Calcular desde 24k (75 %)</button>
        </div>
        <div className="cf-info">
          <div><span>Vigente 24k</span><b>{copN(cfg.oro24)}</b></div>
          <div><span>Vigente 18k</span><b>{copN(cfg.oro18)}</b></div>
          <div><span>Prendas con oro</span><b>{nOro}</b></div>
          <div><span>Actualizado</span><b style={{ fontSize: 13 }}>{fecha}</b></div>
        </div>
      </section>

      {/* ===== BALINES ===== */}
      <section className="cf-card">
        <div className="cf-h">
          <div className="cf-ic">●</div>
          <div className="cf-hx">
            <h2>Balines: peso y valor por tamaño</h2>
            <p>
              Peso de un balín <b>liso en oro 18 k</b> según su diámetro (el 24 k se calcula ×{DENS_24}). El <b>valor fijo $</b> es opcional:
              si lo escribes, ese balín vale siempre ese precio por unidad; si lo dejas vacío, vale <b>peso × precio del gramo</b>.
              Todo se guarda en la hoja y, al cambiar el oro, con <b>Guardar y aplicar</b> se recalculan todas las prendas.
            </p>
          </div>
          <div className="cf-seg" role="group" aria-label="Color de vista previa">
            {METALES.map((m) => (
              <button key={m.k} type="button" aria-pressed={metal === m.k} onClick={() => setMetal(m.k)}>{m.t}</button>
            ))}
          </div>
        </div>
        <div className="cf-bgrid">
          {pf.pesos.map((r, i) => {
            const mm = gr(r.mm), g = gr(r.g), v = num(r.v);
            const d = Math.max(8, Math.min(100, mm * PX_MM));
            return (
              <div className="cf-b" key={i}>
                <div className="cf-stage" data-mm={mm ? `${mm} mm` : ''}>
                  <button type="button" className="cf-x" aria-label="Quitar tamaño" onClick={() => setPf((p) => ({ ...p, pesos: p.pesos.filter((_, j) => j !== i) }))}>✕</button>
                  <BeadSvg d={d} kind="liso" pal={pal} />
                </div>
                <div className="cf-body">
                  <label className="cf-fld"><input aria-label="Diámetro" inputMode="decimal" value={r.mm} onChange={(e) => setPeso(i, 'mm', e.target.value)} /><em>mm</em></label>
                  <label className="cf-fld"><input aria-label="Peso" inputMode="decimal" value={r.g} onChange={(e) => setPeso(i, 'g', e.target.value)} /><em>g</em></label>
                  <div className="cf-lbl">Valor fijo (opcional)</div>
                  <label className="cf-fld money"><em>$</em><input aria-label="Valor fijo por unidad" inputMode="numeric" placeholder="automático" value={v ? v.toLocaleString('es-CO') : ''} onChange={(e) => setPeso(i, 'v', e.target.value.replace(/\D/g, ''))} /></label>
                  <div className="cf-val">
                    {v > 0 ? (
                      <><span className="fix">Valor fijo</span> <b>{copN(v)}</b><br />&nbsp;</>
                    ) : (
                      <>
                        {p18 > 0 && g > 0 ? <>18k <b>{copN(g * p18)}</b></> : <>&nbsp;</>}
                        <br />
                        {p24 > 0 && g > 0 ? <>24k <b>{copN(g * DENS_24 * p24)}</b></> : <>&nbsp;</>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="cf-addc">
            <strong style={{ fontSize: 13 }}>Nuevo tamaño</strong>
            <label className="cf-fld"><input inputMode="decimal" placeholder="ej. 3.5" value={nuevoMm} onChange={(e) => setNuevoMm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTam()} /><em>mm</em></label>
            <button type="button" className="cf-btn" onClick={addTam}>+ Agregar</button>
          </div>
        </div>
        <p className="cf-scale">Los balines están dibujados a escala relativa entre sí (8 px = 1 mm). El valor en $ es solo el oro, sin mano de obra.</p>
      </section>

      {/* ===== TIPOS + INICIAL ===== */}
      <div className="cf-2">
        <section className="cf-card">
          <div className="cf-h">
            <div className="cf-ic">◆</div>
            <div className="cf-hx">
              <h2>Tipos de balín</h2>
              <p>El % indica cuánto pesa frente al liso (100 %). Un diamantado pesa menos porque pierde metal al tallarse. También afecta el valor fijo.</p>
            </div>
          </div>
          <div className="cf-tgrid">
            {pf.tipos.map((t, i) => {
              const f = Math.max(0, Math.min(130, gr(t.f) || 0));
              return (
                <div className="cf-t" key={t.id}>
                  <div className="cf-stage">
                    {t.id !== 'liso' && <button type="button" className="cf-x" aria-label="Quitar tipo" onClick={() => setPf((p) => ({ ...p, tipos: p.tipos.filter((_, j) => j !== i) }))}>✕</button>}
                    <BeadSvg d={72} kind={kindOf(`${t.id} ${t.nombre.toLowerCase()}`)} pal={pal} />
                  </div>
                  <input aria-label="Nombre del tipo" value={t.nombre} onChange={(e) => setTipo(i, 'nombre', e.target.value)} />
                  <label className="cf-fld"><input aria-label="Peso vs liso" inputMode="decimal" value={t.f} onChange={(e) => setTipo(i, 'f', e.target.value)} /><em>%</em></label>
                  <div className="cf-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (f / 130) * 100)}%` }} /></div>
                </div>
              );
            })}
            <div className="cf-addc" style={{ minHeight: 0 }}>
              <strong style={{ fontSize: 13 }}>Nuevo tipo</strong>
              <label className="cf-fld"><input placeholder="ej. Diamantado fino" value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTipo()} /></label>
              <button type="button" className="cf-btn" onClick={addTipo}>+ Agregar</button>
            </div>
          </div>
          <p className="cf-scale">El aspecto se reconoce por el nombre: diamantado, facetado, martillado, estriado/rayado. Otros se ven lisos.</p>
        </section>

        <section className="cf-card">
          <div className="cf-h">
            <div className="cf-ic">A</div>
            <div className="cf-hx">
              <h2>Placa de inicial</h2>
              <p>Peso en gramos (oro 18 k) según el tamaño. Dibujadas a escala real.</p>
            </div>
          </div>
          <div className="cf-igrid">
            {(['pequena', 'mediana', 'grande'] as const).map((k) => (
              <div className="cf-i" key={k}>
                <div className="cf-stage" data-mm={`${INI_MM[k]} mm`}>
                  <Pieza w={96} h={96} s={6} fn={(c) => draw.inicial(c, { txt: 'A', estilo: 'placa', tam: k }, pal, false)} />
                </div>
                <div className="cf-body">
                  <strong>{INI_TXT[k]}</strong>
                  <label className="cf-fld"><input aria-label={`Peso inicial ${INI_TXT[k]}`} inputMode="decimal" value={pf.ini[k]} onChange={(e) => setPf((p) => ({ ...p, ini: { ...p.ini, [k]: e.target.value } }))} /><em>g</em></label>
                  <div className="cf-val">{p18 > 0 && gr(pf.ini[k]) > 0 ? <>18k <b>{copN(gr(pf.ini[k]) * p18)}</b></> : <>&nbsp;</>}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ===== DIJES ===== */}
      <section className="cf-card">
        <div className="cf-h">
          <div className="cf-ic">♥</div>
          <div className="cf-hx">
            <h2>Dijes</h2>
            <p>Peso en gramos (oro 18 k) de cada dije. Los que agregues se muestran como una placa genérica.</p>
          </div>
        </div>
        <div className="cf-dgrid">
          {pf.dijes.map((d, i) => (
            <div className="cf-d" key={d.id}>
              <div className="cf-stage">
                {!PRESET_DIJES.includes(d.id) && <button type="button" className="cf-x" aria-label="Quitar dije" onClick={() => setPf((p) => ({ ...p, dijes: p.dijes.filter((_, j) => j !== i) }))}>✕</button>}
                <Pieza w={90} h={90} s={5.2} dy={2} fn={(c) => draw.dije(c, d.id, pal, false)} />
              </div>
              <div className="cf-body">
                <input aria-label="Nombre del dije" value={d.nombre} onChange={(e) => setDije(i, 'nombre', e.target.value)} />
                <label className="cf-fld"><input aria-label="Peso del dije" inputMode="decimal" value={d.g} onChange={(e) => setDije(i, 'g', e.target.value)} /><em>g</em></label>
                <div className="cf-val">{p18 > 0 && gr(d.g) > 0 ? <>18k <b>{copN(gr(d.g) * p18)}</b></> : <>&nbsp;</>}</div>
              </div>
            </div>
          ))}
          <div className="cf-addc">
            <strong style={{ fontSize: 13 }}>Nuevo dije</strong>
            <label className="cf-fld"><input placeholder="ej. Tortuga" value={nuevoDije} onChange={(e) => setNuevoDije(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDije()} /></label>
            <button type="button" className="cf-btn" onClick={addDije}>+ Agregar</button>
          </div>
        </div>
      </section>

      <div className="cf-sticky">
        <span>Si cambió el oro, escribe el nuevo precio y guarda: se recalculan pesos y precios de todas las prendas con oro.</span>
        <button type="button" onClick={guardarConfig} disabled={guardando}>{guardando ? 'APLICANDO…' : 'GUARDAR Y APLICAR A TODAS'}</button>
      </div>
    </div>
  );
}