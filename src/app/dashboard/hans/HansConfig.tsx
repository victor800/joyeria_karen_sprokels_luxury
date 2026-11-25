// 📁 RUTA: src/app/dashboard/hans/HansConfig.tsx  (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

/* ---------- Tipos compartidos con HansPanel ---------- */
export type PF = {
  pesos: { mm: string; g: string; v: string }[]; // v = valor fijo $ por unidad (opcional)
  tipos: { id: string; nombre: string; f: string }[];
  ini: { pequena: string; mediana: string; grande: string };
  dijes: { id: string; nombre: string; g: string }[];
};
type PalT = { hi: string; mid: string; lo: string; edge: string };
type MetalK = 'dorado' | 'plateado' | 'rosado' | 'negro';
type Ini = { txt: string; estilo: 'placa' | 'cuadrada' | 'letra'; tam: 'pequena' | 'mediana' | 'grande' };
export type Draw = {
  metales: Partial<Record<MetalK, PalT>>;
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
const INI_MM = { pequena: 7, mediana: 9, grande: 12 };
const INI_TXT = { pequena: 'Pequeña', mediana: 'Mediana', grande: 'Grande' };
const PRESET_DIJES = ['corazon', 'estrella', 'cruz', 'luna', 'mariposa', 'trebol', 'hamsa', 'infinito', 'ancla', 'medalla'];
const METALES: { k: MetalK; t: string }[] = [
  { k: 'dorado', t: 'Dorado' },
  { k: 'plateado', t: 'Plateado' },
  { k: 'rosado', t: 'Rosado' },
  { k: 'negro', t: 'Negro' },
];

/** Paleta para los dibujos en canvas (dijes / inicial) si el panel no trae el negro */
const PAL_NEGRO: PalT = { hi: '#8a9099', mid: '#2a2d33', lo: '#07080a', edge: '#000000' };

/** Paletas "fotográficas" para los balines (brillo, luz rebotada y borde oscuro) */
type Real = { hi: string; light: string; mid: string; dark: string; rim: string; bounce: string };
const REAL: Record<MetalK, Real> = {
  dorado: { hi: '#fffbe3', light: '#f9e27d', mid: '#e3b73f', dark: '#a8741a', rim: '#7a4f0c', bounce: '#ffe59a' },
  plateado: { hi: '#ffffff', light: '#eef1f4', mid: '#c3cad1', dark: '#7e8892', rim: '#4f5963', bounce: '#eaf0f5' },
  rosado: { hi: '#fff3ec', light: '#f6cdbb', mid: '#dc9f89', dark: '#a45f4d', rim: '#6e3a2d', bounce: '#ffdccb' },
  negro: { hi: '#a4aab2', light: '#4f545c', mid: '#1f2227', dark: '#08090b', rim: '#000000', bounce: '#3d424a' },
};

const num = (s?: string) => Number(String(s || '').replace(/\D/g, '')) || 0;
const gr = (s?: string) => Number(String(s || '').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
const copN = (n: number) => (n > 0 ? `$${Math.round(n).toLocaleString('es-CO')}` : '—');
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const kindOf = (id: string) =>
  id.includes('diamant') ? 'diamantado' : id.includes('facet') ? 'facetado' : id.includes('martill') ? 'martillado'
    : id.includes('estri') || id.includes('rayad') ? 'estriado' : 'liso';

/** true en pantallas pequeñas (se actualiza al girar o redimensionar) */
function useMovil(px = 700) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${px}px)`).matches);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px}px)`);
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [px]);
  return m;
}

/* ---------- Balín realista (SVG). `medir` dibuja la llave de medida como en las fotos de producto ---------- */
function Bead({ d, kind, real, medir }: { d: number; kind: string; real: Real; medir?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const r = d / 2;
  const sh = Math.max(5, Math.round(d * 0.2));
  const padL = medir ? 52 : 0;
  const W = padL + d + 2;
  const H = d + sh;
  const lines: React.ReactNode[] = [];
  if (kind === 'diamantado' || kind === 'facetado') {
    const step = Math.max(3, r * (kind === 'diamantado' ? 0.55 : 1));
    for (let t = -d, i = 0; t <= d; t += step, i++) {
      lines.push(<line key={`a${i}`} x1={t - d} y1={0} x2={t + d} y2={d} stroke="rgba(255,255,255,.6)" strokeWidth={Math.max(0.5, r * 0.05)} />);
      if (kind === 'diamantado') lines.push(<line key={`b${i}`} x1={t + d} y1={0} x2={t - d} y2={d} stroke="rgba(30,15,0,.34)" strokeWidth={Math.max(0.5, r * 0.05)} />);
      else lines.push(<line key={`b${i}`} x1={0} y1={t + d / 2} x2={d} y2={t + d / 2} stroke="rgba(30,15,0,.3)" strokeWidth={Math.max(0.5, r * 0.05)} />);
    }
  } else if (kind === 'martillado') {
    for (let j = 0; j < 12; j++) {
      const ang = j * 2.4 + 1, rad = r * (0.2 + 0.65 * (((j * 37) % 10) / 10));
      const x = r + Math.cos(ang) * rad, y = r + Math.sin(ang) * rad;
      lines.push(<circle key={`m${j}`} cx={x} cy={y} r={r * 0.17} fill="rgba(30,15,0,.3)" />);
      lines.push(<circle key={`n${j}`} cx={x - r * 0.04} cy={y - r * 0.05} r={r * 0.08} fill="rgba(255,255,255,.4)" />);
    }
  } else if (kind === 'estriado') {
    for (let t = r * 0.2, i = 0; t < d; t += r * 0.38, i++) lines.push(<line key={`e${i}`} x1={0} y1={t} x2={d} y2={t} stroke="rgba(30,15,0,.36)" strokeWidth={Math.max(0.6, r * 0.07)} />);
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`g${uid}`} cx="34%" cy="28%" r="82%">
          <stop offset="0" stopColor={real.hi} />
          <stop offset=".16" stopColor={real.light} />
          <stop offset=".5" stopColor={real.mid} />
          <stop offset=".82" stopColor={real.dark} />
          <stop offset="1" stopColor={real.rim} />
        </radialGradient>
        <radialGradient id={`b${uid}`} cx="55%" cy="98%" r="58%">
          <stop offset="0" stopColor={real.bounce} stopOpacity=".6" />
          <stop offset="1" stopColor={real.bounce} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`s${uid}`}>
          <stop offset="0" stopColor="#000" stopOpacity=".4" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={`f${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={Math.max(0.3, r * 0.05)} />
        </filter>
        <clipPath id={`c${uid}`}><circle cx={r} cy={r} r={r} /></clipPath>
      </defs>

      {medir && (
        <g>
          <text x={40} y={r + 1} textAnchor="end" dominantBaseline="middle" fontSize="10.5" fontWeight="800" fill="#1b1b1b" letterSpacing=".02em">{medir}</text>
          <path d={`M47,1 H43 V${Math.max(2, d - 1)} H47`} fill="none" stroke="#1b1b1b" strokeWidth="1.6" />
        </g>
      )}

      {/* sombra de contacto */}
      <ellipse cx={padL + r} cy={d + sh * 0.35} rx={r * 0.9} ry={sh * 0.55} fill={`url(#s${uid})`} />

      <g transform={`translate(${padL},0)`}>
        <circle cx={r} cy={r} r={Math.max(0.5, r - 0.3)} fill={`url(#g${uid})`} />
        <circle cx={r} cy={r} r={Math.max(0.5, r - 0.3)} fill={`url(#b${uid})`} />
        <g clipPath={`url(#c${uid})`}>{lines}</g>
        <ellipse cx={r * 0.62} cy={r * 0.5} rx={r * 0.3} ry={r * 0.18} fill="rgba(255,255,255,.85)" filter={`url(#f${uid})`} transform={`rotate(-32 ${r * 0.62} ${r * 0.5})`} />
        <ellipse cx={r * 1.3} cy={r * 1.55} rx={r * 0.14} ry={r * 0.07} fill="rgba(255,255,255,.38)" transform={`rotate(-20 ${r * 1.3} ${r * 1.55})`} />
      </g>
    </svg>
  );
}

/* ---------- Tira de tamaños a escala (como la foto de 3MM / 4MM / 5MM…) ---------- */
function Escala({ mms, real }: { mms: number[]; real: Real }) {
  const S = 9; // px por mm
  const lista = mms.filter((m) => m > 0);
  if (!lista.length) return null;
  const mayor = Math.max(...lista) * S;
  const alto = Math.round(mayor + mayor * 0.2 + 4);
  return (
    <div className="cf-strip" role="img" aria-label="Tamaños de balín a escala relativa">
      <div className="in">
        {lista.map((mm, i) => (
          <div className="cf-sz" key={i}>
            <span className="cf-szl">{mm}MM</span>
            <div className="cf-szs" style={{ height: alto }}>
              <Bead d={Math.max(6, Math.round(mm * S))} kind="liso" real={real} />
            </div>
          </div>
        ))}
      </div>
    </div>
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

/* ---------- Sección colapsable: en el encabezado solo va el nombre ---------- */
function Sec({ icon, titulo, cuenta, abierto, onToggle, children }: {
  icon: string; titulo: string; cuenta?: number; abierto: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section className={`cf-card ${abierto ? 'open' : ''}`}>
      <button type="button" className="cf-sh" aria-expanded={abierto} aria-controls={id} onClick={onToggle}>
        <span className="cf-ic" aria-hidden="true">{icon}</span>
        <span className="cf-st">{titulo}</span>
        {cuenta != null && <span className="cf-cn">{cuenta}</span>}
        <span className="cf-chev" aria-hidden="true" />
      </button>
      {abierto && <div id={id} className="cf-sb">{children}</div>}
    </section>
  );
}

function Ayuda({ children }: { children: React.ReactNode }) {
  return (
    <details className="cf-help">
      <summary>ⓘ Cómo funciona</summary>
      <div>{children}</div>
    </details>
  );
}

/* ---------- Carrusel: en móvil se desliza con flechas; en pantallas grandes es una cuadrícula ---------- */
function Carrusel({ total, children }: { total: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState({ i: 1, ini: true, fin: false });
  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const w = (card?.offsetWidth ?? 200) + 12;
    const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setSt({ i: fin ? total : Math.min(total, Math.round(el.scrollLeft / w) + 1), ini: el.scrollLeft <= 4, fin });
  }, [total]);
  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [medir]);
  const mover = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 200) + 12), behavior: 'smooth' });
  };
  return (
    <div className="cf-carw">
      <button type="button" className="cf-ar l" aria-label="Dije anterior" disabled={st.ini} onClick={() => mover(-1)}>‹</button>
      <div className="cf-car" ref={ref} onScroll={medir}>{children}</div>
      <button type="button" className="cf-ar r" aria-label="Dije siguiente" disabled={st.fin} onClick={() => mover(1)}>›</button>
      <div className="cf-cnt">{st.i} / {total}</div>
    </div>
  );
}

export default function HansConfig({ cfg, cfgForm, setCfgForm, nOro, pf, setPf, calc18desde24, guardarConfig, guardando, draw }: Props) {
  const [nuevoMm, setNuevoMm] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [nuevoDije, setNuevoDije] = useState('');
  const [metal, setMetal] = useState<MetalK>('dorado');
  const movil = useMovil();
  // En escritorio las secciones arrancan abiertas; en móvil, colapsadas
  const [ab, setAb] = useState(() => {
    const d = typeof window !== 'undefined' && window.matchMedia('(min-width: 701px)').matches;
    return { balines: d, tipos: d, inicial: d, dijes: d };
  });
  const tg = (k: keyof typeof ab) => setAb((a) => ({ ...a, [k]: !a[k] }));

  const metales = { negro: PAL_NEGRO, ...draw.metales } as Record<MetalK, PalT>;
  const pal = metales[metal];
  const real = REAL[metal];
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
        .cf { width: 100%; padding-bottom: 96px; display: grid; gap: 14px; }
        .cf * { box-sizing: border-box; }

        /* ===== Secciones colapsables ===== */
        .cf-card { background: #fff; border: 1px solid #ece7d6; border-radius: 20px; box-shadow: 0 2px 14px rgba(11,45,31,.05); overflow: hidden; }
        .cf-sh { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 0; background: transparent; cursor: pointer; font: inherit; text-align: left; -webkit-tap-highlight-color: transparent; }
        .cf-ic { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; font-size: 16px; background: linear-gradient(135deg, #0b2d1f, #14573f); color: #f0c14b; flex-shrink: 0; }
        .cf-st { flex: 1; min-width: 0; font-size: 20px; font-weight: 500; color: #0b2d1f; line-height: 1.2; }
        .cf-cn { min-width: 26px; height: 26px; padding: 0 8px; border-radius: 99px; background: #f6efd6; color: #7a6a30; font-size: 12px; font-weight: 700; display: grid; place-items: center; }
        .cf-chev { width: 9px; height: 9px; border-right: 2.5px solid #b08d3c; border-bottom: 2.5px solid #b08d3c; transform: rotate(45deg); transition: transform .2s; flex-shrink: 0; margin: -3px 4px 0 2px; }
        .cf-card.open > .cf-sh .cf-chev { transform: rotate(-135deg); margin-top: 3px; }
        .cf-sb { padding: 4px 18px 18px; border-top: 1px solid #f0ecdd; }
        .cf-help { margin: 10px 0 12px; border: 1px dashed #d8b95f; border-radius: 12px; background: #fffdf6; }
        .cf-help > summary { list-style: none; cursor: pointer; padding: 9px 12px; font-size: 12.5px; font-weight: 600; color: #7a6a30; -webkit-tap-highlight-color: transparent; }
        .cf-help > summary::-webkit-details-marker { display: none; }
        .cf-help > div { padding: 0 12px 11px; font-size: 12.5px; color: #5a6b62; line-height: 1.55; }
        .cf-2 { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 14px; align-items: start; }
        .cf-scale { margin: 12px 0 0; font-size: 11.5px; color: #8a978f; text-align: center; line-height: 1.5; }

        /* ===== Color de vista previa (centrado) ===== */
        .cf-metal { display: grid; justify-items: center; gap: 7px; }
        .cf-mt { font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: #8a978f; font-weight: 700; }
        .cf-seg { display: inline-flex; max-width: 100%; border: 1px solid #d8b95f; border-radius: 99px; overflow: hidden; background: #fffdf8; }
        .cf-seg button { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 12.5px; font-weight: 600; padding: 9px 14px; border: 0; background: transparent; cursor: pointer; color: #7a6a30; white-space: nowrap; }
        .cf-seg button i { width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,.22); flex-shrink: 0; }
        .cf-seg button[aria-pressed="true"] { background: #0b2d1f; color: #f6e7b4; }

        /* ===== ORO ===== */
        .cf-oro { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .cf-gold { position: relative; overflow: hidden; border-radius: 22px; padding: 20px 22px; color: #f6e7b4; background: linear-gradient(135deg, #000 0%, #07241a 55%, #0f3d2a 100%); border: 1px solid rgba(216,185,95,.65); box-shadow: 0 10px 26px rgba(7,33,26,.25); }
        .cf-gold::before { content: ""; position: absolute; right: -50px; top: -50px; width: 170px; height: 170px; border-radius: 50%; background: radial-gradient(circle, rgba(240,193,75,.32), transparent 70%); pointer-events: none; }
        .cf-gold small { display: block; font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; color: rgba(246,231,180,.7); font-weight: 700; }
        .cf-gold h3 { margin: 4px 0 12px; font-size: 30px; font-weight: 500; color: #f0c14b; }
        .cf-gin { position: relative; display: flex; align-items: center; background: rgba(255,255,255,.07); border: 1px solid rgba(240,193,75,.55); border-radius: 14px; overflow: hidden; }
        .cf-gin span { padding: 0 4px 0 14px; color: #f0c14b; font-size: 20px; }
        .cf-gin input { flex: 1; min-width: 0; width: 100%; background: transparent; border: 0; outline: 0; color: #fff; font: inherit; font-size: 26px; padding: 12px 8px; }
        .cf-gin em { font-style: normal; font-size: 11.5px; color: rgba(246,231,180,.65); padding-right: 14px; }
        .cf-cap { display: none; margin-top: 6px; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: rgba(246,231,180,.6); }
        .cf-gold button { margin-top: 12px; font: inherit; font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 99px; cursor: pointer; border: 1px solid rgba(240,193,75,.6); background: transparent; color: #f0c14b; }
        .cf-gold button:hover { background: rgba(240,193,75,.15); }
        .cf-info { border-radius: 22px; padding: 20px 22px; background: #faf8f2; border: 1px dashed #d8b95f; display: grid; gap: 12px; align-content: center; }
        .cf-info div { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 13px; color: #44514a; border-bottom: 1px solid #ece7d6; padding-bottom: 9px; }
        .cf-info div:last-child { border: 0; padding: 0; }
        .cf-info b { font-size: 18px; font-weight: 500; color: #0b2d1f; text-align: right; }

        /* ===== Tira de tamaños a escala ===== */
        .cf-strip-t { font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: #8a6d1f; font-weight: 700; margin: 4px 2px 8px; }
        .cf-strip { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 12px 6px 8px; margin-bottom: 14px; border-radius: 16px; border: 1px solid #ece7d6; background: radial-gradient(circle at 50% 30%, #ffffff, #f3eedd 95%); scrollbar-width: thin; }
        .cf-strip .in { display: flex; width: max-content; margin: 0 auto; }
        .cf-sz { flex: 0 0 auto; min-width: 58px; padding: 0 10px; display: grid; justify-items: center; gap: 8px; }
        .cf-szl { font-size: 13px; font-weight: 800; letter-spacing: .01em; color: #141414; }
        .cf-szs { display: flex; align-items: center; }

        /* ===== Tarjetas compactas ===== */
        .cf-bgrid, .cf-tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; align-items: start; }
        .cf-b, .cf-t, .cf-i, .cf-dc { position: relative; border-radius: 16px; overflow: hidden; border: 1px solid #ece7d6; background: #fff; }
        .cf-stage { height: 92px; display: grid; place-items: center; position: relative; background: radial-gradient(circle at 50% 35%, #ffffff, #efe9d8 92%); }
        .cf-stage.sm { height: 78px; }
        .cf-x { position: absolute; top: 5px; right: 5px; width: 24px; height: 24px; border-radius: 50%; border: 0; cursor: pointer; padding: 0; background: rgba(20,30,25,.55); color: #fff; line-height: 1; font-size: 11px; z-index: 2; }
        .cf-x:hover { background: #b04a3f; }
        .cf-bd > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 8px 10px 9px; border-top: 1px solid #f0ecdd; -webkit-tap-highlight-color: transparent; }
        .cf-bd > summary::-webkit-details-marker { display: none; }
        .cf-bd[open] > summary .cf-chev { transform: rotate(-135deg); margin-top: 3px; }
        .cf-sm { flex: 1; min-width: 0; display: grid; gap: 1px; font-size: 11px; color: #5a6b62; line-height: 1.35; }
        .cf-sm b { font-size: 13px; color: #0b2d1f; font-weight: 700; }
        .cf-sm em { font-style: normal; color: #0b4a2e; font-weight: 600; }
        .cf-sm .fix { color: #8a5a00; font-weight: 700; }
        .cf-ed { padding: 8px 10px 12px; display: grid; gap: 8px; background: #fffdf8; border-top: 1px dashed #e6dfc6; }
        .cf-ed .l { display: block; margin-bottom: 3px; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: #8a978f; }
        .cf-r2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .cf-fld { display: flex; align-items: center; border: 1px solid rgba(128,128,128,.35); border-radius: 10px; background: #fff; overflow: hidden; }
        .cf-fld input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; padding: 8px 4px 8px 10px; }
        .cf-fld em { font-style: normal; font-size: 11px; color: #8a978f; padding-right: 9px; }
        .cf-fld.money { border-color: #d8b95f; background: #fff9e8; }
        .cf-fld.money em { padding: 0 0 0 10px; color: #7a6a30; font-weight: 700; }
        .cf-addc { border-radius: 16px; border: 2px dashed #d8b95f; background: #fffdf8; padding: 12px; display: grid; gap: 8px; align-content: center; text-align: center; font-size: 12px; color: #7a6a30; min-height: 150px; }
        .cf-btn { font: inherit; font-size: 12.5px; font-weight: 600; height: 36px; padding: 0 14px; border-radius: 10px; cursor: pointer; border: 1px solid #b08d3c; background: #0b2d1f; color: #f6e7b4; }
        .cf-btn:hover { background: #14573f; }

        /* Tipos */
        .cf-tb { padding: 9px 10px 11px; display: grid; gap: 7px; }
        .cf-tb > input { width: 100%; text-align: center; border: 0; border-bottom: 1px solid #e3dcc2; background: transparent; font: inherit; font-size: 14px; font-weight: 600; color: #0b2d1f; padding: 3px; outline: 0; }
        .cf-bar { width: 100%; height: 6px; border-radius: 99px; background: #efe9d3; overflow: hidden; }
        .cf-bar i { display: block; height: 100%; background: linear-gradient(90deg, #e6b422, #b7791f); border-radius: 99px; }

        /* Inicial */
        .cf-igrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .cf-ib { padding: 8px 8px 10px; display: grid; gap: 6px; text-align: center; }
        .cf-ib strong { font-size: 12.5px; color: #0b2d1f; font-weight: 600; }
        .cf-mm { position: absolute; left: 8px; top: 6px; font-size: 10.5px; font-weight: 800; color: #7a6a30; letter-spacing: .04em; }
        .cf-val { text-align: center; font-size: 11px; color: #5a6b62; line-height: 1.45; }
        .cf-val b { color: #0b4a2e; font-weight: 600; }

        /* Dijes (carrusel en móvil) */
        .cf-carw { position: relative; }
        .cf-car { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; align-items: start; }
        .cf-ar, .cf-cnt { display: none; }
        .cf-dc { border-color: #e9dfb8; box-shadow: 0 6px 16px rgba(11,45,31,.08); }
        .cf-dc .cf-stage { height: 104px; }
        .cf-db { padding: 10px 12px 13px; display: grid; gap: 7px; text-align: center; }
        .cf-db > input { width: 100%; text-align: center; border: 0; border-bottom: 1px solid #e3dcc2; background: transparent; font: inherit; font-size: 14px; font-weight: 600; color: #0b2d1f; padding: 4px; outline: 0; }

        /* Guardar */
        .cf-sticky { position: sticky; bottom: 12px; z-index: 5; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; background: #0b2d1f; border: 1px solid rgba(216,185,95,.5); border-radius: 18px; padding: 12px 18px; box-shadow: 0 8px 24px rgba(0,0,0,.28); }
        .cf-sticky span { color: #f3ead2; font-size: 13px; flex: 1 1 220px; }
        .cf-sticky button { font: inherit; font-size: 12px; font-weight: 700; letter-spacing: .1em; padding: 12px 22px; border-radius: 99px; border: 1px solid #d8b95f; cursor: pointer; background: #f0c14b; color: #1b1608; }
        .cf-sticky button:disabled { opacity: .6; cursor: wait; }

        @media (max-width: 1000px) {
          .cf-oro { grid-template-columns: 1fr 1fr; }
          .cf-info { grid-column: 1 / -1; }
          .cf-2 { grid-template-columns: 1fr; }
        }

        @media (max-width: 700px) {
          .cf { gap: 12px; }

          /* oro compacto: 24K y 18K lado a lado */
          .cf-oro { grid-template-columns: 1fr 1fr; gap: 10px; }
          .cf-gold { padding: 14px; border-radius: 18px; }
          .cf-gold small { font-size: 9.5px; letter-spacing: .14em; }
          .cf-gold h3 { font-size: 24px; margin: 2px 0 8px; }
          .cf-gin span { padding-left: 10px; font-size: 16px; }
          .cf-gin input { font-size: 18px; padding: 9px 6px; }
          .cf-gin em { display: none; }
          .cf-cap { display: block; }
          .cf-gold button { width: 100%; font-size: 11px; padding: 7px 8px; margin-top: 8px; }
          .cf-info { grid-column: 1 / -1; grid-template-columns: 1fr 1fr; gap: 10px 16px; padding: 12px 14px; border-radius: 18px; }
          .cf-info div { flex-direction: column; align-items: flex-start; gap: 2px; border: 0; padding: 0; }
          .cf-info b { font-size: 16px; text-align: left; }

          /* secciones */
          .cf-sh { padding: 12px 14px; }
          .cf-st { font-size: 18px; }
          .cf-sb { padding: 2px 12px 14px; }
          .cf-seg button { padding: 9px 10px; gap: 5px; font-size: 12px; }

          /* tarjetas pequeñas: 2 por fila */
          .cf-bgrid, .cf-tgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .cf-stage { height: 84px; }
          .cf-fld input { font-size: 16px; }
          .cf-addc { min-height: 120px; }
          .cf-igrid { gap: 8px; }
          .cf-ib { padding: 7px 6px 9px; }
          .cf-ib .cf-fld input { padding-left: 6px; }

          /* dijes: carrusel con flechas */
          .cf-car { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 12px; padding: 4px 2px 12px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
          .cf-car::-webkit-scrollbar { display: none; }
          .cf-car > * { flex: 0 0 min(230px, 68%); scroll-snap-align: start; }
          .cf-dc .cf-stage { height: 128px; }
          .cf-ar { display: grid; place-items: center; position: absolute; top: 52px; z-index: 3; width: 38px; height: 38px; padding: 0 0 3px; border-radius: 50%; border: 1px solid rgba(176,141,60,.55); background: rgba(255,255,255,.95); color: #0b2d1f; font-size: 24px; line-height: 1; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
          .cf-ar.l { left: -4px; }
          .cf-ar.r { right: -4px; }
          .cf-ar:disabled { opacity: .3; cursor: default; }
          .cf-cnt { display: block; text-align: center; font-size: 12px; font-weight: 600; color: #7a6a30; }

          /* guardar: botón centrado y flotante */
          .cf { padding-bottom: 84px; }
          .cf-sticky { background: transparent; border: 0; box-shadow: none; padding: 0; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); pointer-events: none; }
          .cf-sticky span { display: none; }
          .cf-sticky button { pointer-events: auto; width: min(100%, 340px); padding: 15px 22px; box-shadow: 0 8px 22px rgba(0,0,0,.35); }
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
          <div className="cf-cap">por gramo</div>
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
          <div className="cf-cap">por gramo</div>
          <button type="button" onClick={calc18desde24}>Calcular desde 24k (75 %)</button>
        </div>
        <div className="cf-info">
          <div><span>Vigente 24k</span><b>{copN(cfg.oro24)}</b></div>
          <div><span>Vigente 18k</span><b>{copN(cfg.oro18)}</b></div>
          <div><span>Prendas con oro</span><b>{nOro}</b></div>
          <div><span>Actualizado</span><b style={{ fontSize: 13 }}>{fecha}</b></div>
        </div>
      </section>

      {/* ===== COLOR DE VISTA PREVIA (aplica a balines, tipos, inicial y dijes) ===== */}
      <div className="cf-metal">
        <span className="cf-mt">Vista previa en</span>
        <div className="cf-seg" role="group" aria-label="Color de vista previa">
          {METALES.map((m) => {
            const R = REAL[m.k];
            return (
              <button key={m.k} type="button" aria-pressed={metal === m.k} onClick={() => setMetal(m.k)}>
                <i style={{ background: `radial-gradient(circle at 35% 30%, ${R.hi}, ${R.mid} 55%, ${R.dark})` }} />
                {m.t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== BALINES ===== */}
      <Sec icon="●" titulo="Balines" cuenta={pf.pesos.length} abierto={ab.balines} onToggle={() => tg('balines')}>
        <Ayuda>
          Peso de un balín <b>liso en oro 18 k</b> según su diámetro (el 24 k se calcula ×{DENS_24}). El <b>valor fijo $</b> es opcional:
          si lo escribes, ese balín vale siempre ese precio por unidad; si lo dejas vacío, vale <b>peso × precio del gramo</b>.
          Toca el peso de cada tarjeta para editarlo. Todo se guarda en la hoja y, al cambiar el oro, con <b>Guardar y aplicar</b> se recalculan todas las prendas.
        </Ayuda>

        <div className="cf-strip-t">Tamaños a escala</div>
        <Escala mms={pf.pesos.map((r) => gr(r.mm))} real={real} />

        <div className="cf-bgrid">
          {pf.pesos.map((r, i) => {
            const mm = gr(r.mm), g = gr(r.g), v = num(r.v);
            const dc = Math.max(10, Math.min(58, mm * 6));
            return (
              <article className="cf-b" key={i}>
                <div className="cf-stage">
                  <button type="button" className="cf-x" aria-label="Quitar tamaño" onClick={() => setPf((p) => ({ ...p, pesos: p.pesos.filter((_, j) => j !== i) }))}>✕</button>
                  <Bead d={dc} kind="liso" real={real} medir={mm ? `${mm} MM` : undefined} />
                </div>
                <details className="cf-bd">
                  <summary>
                    <span className="cf-sm">
                      <b>{g > 0 ? `${g} g` : '— g'}</b>
                      {v > 0 ? (
                        <span><span className="fix">Fijo</span> <em>{copN(v)}</em></span>
                      ) : (
                        <>
                          <span>18k <em>{p18 > 0 && g > 0 ? copN(g * p18) : '—'}</em></span>
                          <span>24k <em>{p24 > 0 && g > 0 ? copN(g * DENS_24 * p24) : '—'}</em></span>
                        </>
                      )}
                    </span>
                    <span className="cf-chev" aria-hidden="true" />
                  </summary>
                  <div className="cf-ed">
                    <div className="cf-r2">
                      <div>
                        <span className="l">Diámetro</span>
                        <label className="cf-fld"><input aria-label="Diámetro" inputMode="decimal" value={r.mm} onChange={(e) => setPeso(i, 'mm', e.target.value)} /><em>mm</em></label>
                      </div>
                      <div>
                        <span className="l">Peso</span>
                        <label className="cf-fld"><input aria-label="Peso" inputMode="decimal" value={r.g} onChange={(e) => setPeso(i, 'g', e.target.value)} /><em>g</em></label>
                      </div>
                    </div>
                    <div>
                      <span className="l">Valor fijo (opcional)</span>
                      <label className="cf-fld money"><em>$</em><input aria-label="Valor fijo por unidad" inputMode="numeric" placeholder="automático" value={v ? v.toLocaleString('es-CO') : ''} onChange={(e) => setPeso(i, 'v', e.target.value.replace(/\D/g, ''))} /></label>
                    </div>
                  </div>
                </details>
              </article>
            );
          })}
          <div className="cf-addc">
            <strong style={{ fontSize: 13 }}>Nuevo tamaño</strong>
            <label className="cf-fld"><input inputMode="decimal" placeholder="ej. 3.5" value={nuevoMm} onChange={(e) => setNuevoMm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTam()} /><em>mm</em></label>
            <button type="button" className="cf-btn" onClick={addTam}>+ Agregar</button>
          </div>
        </div>
        <p className="cf-scale">La tira de arriba muestra los tamaños a escala entre sí. El valor en $ es solo el oro, sin mano de obra.</p>
      </Sec>

      {/* ===== TIPOS + INICIAL ===== */}
      <div className="cf-2">
        <Sec icon="◆" titulo="Tipos de balín" cuenta={pf.tipos.length} abierto={ab.tipos} onToggle={() => tg('tipos')}>
          <Ayuda>
            El % indica cuánto pesa frente al liso (100 %). Un diamantado pesa menos porque pierde metal al tallarse. También afecta el valor fijo.
            El aspecto se reconoce por el nombre: diamantado, facetado, martillado, estriado/rayado. Otros se ven lisos.
          </Ayuda>
          <div className="cf-tgrid">
            {pf.tipos.map((t, i) => {
              const f = Math.max(0, Math.min(130, gr(t.f) || 0));
              return (
                <div className="cf-t" key={t.id}>
                  <div className="cf-stage sm">
                    {t.id !== 'liso' && <button type="button" className="cf-x" aria-label="Quitar tipo" onClick={() => setPf((p) => ({ ...p, tipos: p.tipos.filter((_, j) => j !== i) }))}>✕</button>}
                    <Bead d={52} kind={kindOf(`${t.id} ${t.nombre.toLowerCase()}`)} real={real} />
                  </div>
                  <div className="cf-tb">
                    <input aria-label="Nombre del tipo" value={t.nombre} onChange={(e) => setTipo(i, 'nombre', e.target.value)} />
                    <label className="cf-fld"><input aria-label="Peso vs liso" inputMode="decimal" value={t.f} onChange={(e) => setTipo(i, 'f', e.target.value)} /><em>%</em></label>
                    <div className="cf-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (f / 130) * 100)}%` }} /></div>
                  </div>
                </div>
              );
            })}
            <div className="cf-addc">
              <strong style={{ fontSize: 13 }}>Nuevo tipo</strong>
              <label className="cf-fld"><input placeholder="ej. Diamantado fino" value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTipo()} /></label>
              <button type="button" className="cf-btn" onClick={addTipo}>+ Agregar</button>
            </div>
          </div>
        </Sec>

        <Sec icon="A" titulo="Placa de inicial" cuenta={3} abierto={ab.inicial} onToggle={() => tg('inicial')}>
          <Ayuda>Peso en gramos (oro 18 k) según el tamaño. Dibujadas a escala real.</Ayuda>
          <div className="cf-igrid">
            {(['pequena', 'mediana', 'grande'] as const).map((k) => (
              <div className="cf-i" key={k}>
                <div className="cf-stage sm" style={{ height: movil ? 84 : 120 }}>
                  <span className="cf-mm">{INI_MM[k]} mm</span>
                  <Pieza w={movil ? 74 : 96} h={movil ? 74 : 96} s={movil ? 4.6 : 6} dy={movil ? 4 : 0} fn={(c) => draw.inicial(c, { txt: 'A', estilo: 'placa', tam: k }, pal, false)} />
                </div>
                <div className="cf-ib">
                  <strong>{INI_TXT[k]}</strong>
                  <label className="cf-fld"><input aria-label={`Peso inicial ${INI_TXT[k]}`} inputMode="decimal" value={pf.ini[k]} onChange={(e) => setPf((p) => ({ ...p, ini: { ...p.ini, [k]: e.target.value } }))} /><em>g</em></label>
                  <div className="cf-val">
                    {p18 > 0 && gr(pf.ini[k]) > 0 ? <>18k <b>{copN(gr(pf.ini[k]) * p18)}</b></> : <>&nbsp;</>}
                    <br />
                    {p24 > 0 && gr(pf.ini[k]) > 0 ? <>24k <b>{copN(gr(pf.ini[k]) * DENS_24 * p24)}</b></> : <>&nbsp;</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Sec>
      </div>

      {/* ===== DIJES (carrusel en móvil) ===== */}
      <Sec icon="♥" titulo="Dijes" cuenta={pf.dijes.length} abierto={ab.dijes} onToggle={() => tg('dijes')}>
        <Ayuda>Peso en gramos (oro 18 k) de cada dije. Los que agregues se muestran como una placa genérica. En el celular, desliza o usa las flechas.</Ayuda>
        <Carrusel total={pf.dijes.length + 1}>
          {pf.dijes.map((d, i) => (
            <div className="cf-dc" key={d.id}>
              <div className="cf-stage">
                {!PRESET_DIJES.includes(d.id) && <button type="button" className="cf-x" aria-label="Quitar dije" onClick={() => setPf((p) => ({ ...p, dijes: p.dijes.filter((_, j) => j !== i) }))}>✕</button>}
                <Pieza w={movil ? 112 : 92} h={movil ? 112 : 92} s={movil ? 6.2 : 5.2} dy={2} fn={(c) => draw.dije(c, d.id, pal, false)} />
              </div>
              <div className="cf-db">
                <input aria-label="Nombre del dije" value={d.nombre} onChange={(e) => setDije(i, 'nombre', e.target.value)} />
                <label className="cf-fld"><input aria-label="Peso del dije" inputMode="decimal" value={d.g} onChange={(e) => setDije(i, 'g', e.target.value)} /><em>g</em></label>
                <div className="cf-val">
                  {p18 > 0 && gr(d.g) > 0 ? <>18k <b>{copN(gr(d.g) * p18)}</b></> : <>&nbsp;</>}
                  <br />
                  {p24 > 0 && gr(d.g) > 0 ? <>24k <b>{copN(gr(d.g) * DENS_24 * p24)}</b></> : <>&nbsp;</>}
                </div>
              </div>
            </div>
          ))}
          <div className="cf-addc" key="nuevo-dije">
            <strong style={{ fontSize: 13 }}>Nuevo dije</strong>
            <label className="cf-fld"><input placeholder="ej. Tortuga" value={nuevoDije} onChange={(e) => setNuevoDije(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDije()} /></label>
            <button type="button" className="cf-btn" onClick={addDije}>+ Agregar</button>
          </div>
        </Carrusel>
      </Sec>

      <div className="cf-sticky">
        <span>Si cambió el oro, escribe el nuevo precio y guarda: se recalculan pesos y precios de todas las prendas con oro.</span>
        <button type="button" onClick={guardarConfig} disabled={guardando}>{guardando ? 'APLICANDO…' : 'GUARDAR Y APLICAR A TODAS'}</button>
      </div>
    </div>
  );
}