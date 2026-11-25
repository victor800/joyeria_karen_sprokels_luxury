// 📁 RUTA: src/app/dashboard/hans/HansPanel.tsx  (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HansConfig, { type PF } from './HansConfig';
import HansPedidos, { type Pedido } from './HansPedidos';

const LOGO_HANS = '/hans.jpeg';

type Tipo = 'menudeo' | 'mayorista' | 'ambos' | 'tejida';
type Oro = '' | '18k' | '24k';
type Metal = 'dorado' | 'plateado' | 'rosado' | 'negro';
type Item = {
  id: string; codigo: string; nombre: string; categoria: string; tipo: Tipo; material: string;
  precio_menudeo: string; precio_mayorista: string; min_mayorista: string; stock: string;
  descripcion: string; foto_url: string; video_url: string; activo: string; creado: string;
  oro?: Oro; gramos?: string; mano_obra?: string; mano_obra_mayor?: string;
  diseno?: string; // JSON del diseñador de pulsera
};
type Config = { oro18: number; oro24: number; actualizado: string };

/* ---------- Diseño de pulsera ---------- */
type Dis = {
  v: 1; longitud: number; ancho: number; hilo1: string; hilo2: string; metal: Metal;
  balines: { tipo: string; mm: number; cant: number; metal?: Metal }[];
  inicial: { txt: string; estilo: 'placa' | 'cuadrada' | 'letra'; tam: 'pequena' | 'mediana' | 'grande' } | null;
  dije: { id: string } | null;
};
type TipoB = { id: string; nombre: string; factor: number };
type DijeCfg = { id: string; nombre: string; gramos: number };
type Piezas = {
  tipos: TipoB[];
  pesos: Record<string, number>; // mm -> gramos (oro 18k, balín liso)
  valores: Record<string, number>; // mm -> valor fijo $ por unidad (opcional)
  inicial: { pequena: number; mediana: number; grande: number };
  dijes: DijeCfg[];
};

const DENS_24 = 1.24; // el oro 24k pesa ~24 % más que el 18k para la misma pieza
const INI_MM = { pequena: 7, mediana: 9, grande: 12 };
const INI_TXT = { pequena: 'Pequeña (7 mm)', mediana: 'Mediana (9 mm)', grande: 'Grande (12 mm)' };
const METALES: Metal[] = ['dorado', 'plateado', 'rosado', 'negro'];

const DEF_PIEZAS: Piezas = {
  tipos: [
    { id: 'liso', nombre: 'Liso', factor: 1 },
    { id: 'diamantado', nombre: 'Diamantado', factor: 0.92 },
    { id: 'facetado', nombre: 'Facetado', factor: 0.95 },
    { id: 'martillado', nombre: 'Martillado', factor: 0.97 },
    { id: 'estriado', nombre: 'Estriado (rayado)', factor: 0.94 },
  ],
  pesos: { '2': 0.03, '2.5': 0.05, '3': 0.07, '4': 0.15, '5': 0.28, '6': 0.48, '8': 1.1, '10': 2.1 },
  valores: {},
  inicial: { pequena: 0.3, mediana: 0.6, grande: 1.0 },
  dijes: [
    { id: 'corazon', nombre: 'Corazón', gramos: 0.5 },
    { id: 'estrella', nombre: 'Estrella', gramos: 0.5 },
    { id: 'cruz', nombre: 'Cruz', gramos: 0.6 },
    { id: 'luna', nombre: 'Luna', gramos: 0.5 },
    { id: 'mariposa', nombre: 'Mariposa', gramos: 0.6 },
    { id: 'trebol', nombre: 'Trébol', gramos: 0.6 },
    { id: 'hamsa', nombre: 'Mano de Fátima', gramos: 0.9 },
    { id: 'infinito', nombre: 'Infinito', gramos: 0.5 },
    { id: 'ancla', nombre: 'Ancla', gramos: 0.7 },
    { id: 'medalla', nombre: 'Medalla redonda', gramos: 0.5 },
  ],
};

const HILOS = [
  { n: 'Negro', c: '#1a1a1a' }, { n: 'Blanco', c: '#f4f1ea' }, { n: 'Rojo', c: '#c0272d' }, { n: 'Azul', c: '#1f4fa3' },
  { n: 'Verde', c: '#1d7a46' }, { n: 'Café', c: '#6b4226' }, { n: 'Morado', c: '#6a3d9a' }, { n: 'Rosado', c: '#e86ea0' },
  { n: 'Amarillo', c: '#f2c230' }, { n: 'Naranja', c: '#ef7d22' }, { n: 'Turquesa', c: '#20b2aa' }, { n: 'Gris', c: '#7b838a' },
];
const LETRAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

const defDis = (): Dis => ({
  v: 1, longitud: 17, ancho: 4, hilo1: '#1a1a1a', hilo2: '', metal: 'dorado',
  balines: [{ tipo: 'liso', mm: 4, cant: 5 }], inicial: null, dije: null,
});

const esMetal = (m: unknown): m is Metal => m === 'dorado' || m === 'plateado' || m === 'rosado' || m === 'negro';

function parseDis(s?: string): Dis | null {
  if (!s) return null;
  try {
    const d = JSON.parse(s);
    if (!d || typeof d !== 'object' || !Array.isArray(d.balines)) return null;
    const base = defDis();
    return {
      ...base, ...d,
      balines: d.balines.map((b: { tipo?: string; mm?: number; cant?: number; metal?: string }) => ({
        tipo: String(b.tipo || 'liso'), mm: Number(b.mm) || 4, cant: Math.max(0, Math.min(60, Number(b.cant) || 0)),
        metal: esMetal(b.metal) ? b.metal : undefined,
      })),
      inicial: d.inicial && d.inicial.txt ? { txt: String(d.inicial.txt).slice(0, 2), estilo: d.inicial.estilo || 'placa', tam: d.inicial.tam || 'mediana' } : null,
      dije: d.dije && d.dije.id ? { id: String(d.dije.id) } : null,
    };
  } catch { return null; }
}

function normPiezas(raw: unknown): Piezas {
  const r = raw as Partial<Piezas> | null;
  if (!r || typeof r !== 'object' || !r.pesos || !Array.isArray(r.tipos) || !Array.isArray(r.dijes)) return DEF_PIEZAS;
  const valores: Record<string, number> = {};
  if (r.valores && typeof r.valores === 'object') {
    Object.entries(r.valores).forEach(([k, v]) => { const n = Number(v); if (n > 0) valores[k] = n; });
  }
  return {
    tipos: r.tipos.length ? r.tipos : DEF_PIEZAS.tipos,
    pesos: Object.keys(r.pesos).length ? r.pesos : DEF_PIEZAS.pesos,
    valores,
    inicial: { ...DEF_PIEZAS.inicial, ...(r.inicial || {}) },
    dijes: r.dijes.length ? r.dijes : DEF_PIEZAS.dijes,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const sizesOf = (p: Piezas) => Object.keys(p.pesos).map(Number).filter((n) => n > 0).sort((a, b) => a - b);

function pesoBalin(b: { tipo: string; mm: number }, p: Piezas, oro?: string) {
  let base = p.pesos[String(b.mm)];
  if (base == null) {
    const sz = sizesOf(p);
    if (sz.length) {
      const n = sz.reduce((a, c) => (Math.abs(c - b.mm) < Math.abs(a - b.mm) ? c : a));
      base = p.pesos[String(n)] * Math.pow(b.mm / n, 3);
    }
  }
  const f = p.tipos.find((t) => t.id === b.tipo)?.factor ?? 1;
  return (base || 0) * f * (oro === '24k' ? DENS_24 : 1);
}

function totalGramos(d: Dis, p: Piezas, oro?: string) {
  const dens = oro === '24k' ? DENS_24 : 1;
  const bal = d.balines.reduce((s, b) => s + pesoBalin(b, p, oro) * b.cant, 0);
  const ini = d.inicial ? (p.inicial[d.inicial.tam] || 0) * dens : 0;
  const dij = d.dije ? (p.dijes.find((x) => x.id === d.dije!.id)?.gramos || 0) * dens : 0;
  return { balines: r2(bal), inicial: r2(ini), dije: r2(dij), total: r2(bal + ini + dij) };
}

/** Valor en $ de los balines/inicial/dije: balín con valor fijo por tamaño o peso × precio del gramo. */
function valorOro(d: Dis, p: Piezas, oro: string, c: Config) {
  const pg = precioGramo(oro, c);
  const bal = d.balines.reduce((s, b) => {
    const fijo = p.valores[String(b.mm)];
    const f = p.tipos.find((t) => t.id === b.tipo)?.factor ?? 1;
    const unit = fijo && fijo > 0 ? fijo * f : pesoBalin(b, p, oro) * pg;
    return s + unit * b.cant;
  }, 0);
  const t = totalGramos(d, p, oro);
  return bal + (t.inicial + t.dije) * pg;
}

function largoBalines(d: Dis) {
  const bal = d.balines.reduce((s, b) => s + (b.mm / 10 + 0.03) * b.cant, 0);
  const ini = d.inicial ? (INI_MM[d.inicial.tam] / 10) * (d.inicial.estilo === 'letra' ? 0.85 : 1) : 0;
  return bal + ini;
}

const TIPOS: { v: Tipo; t: string }[] = [
  { v: 'menudeo', t: 'Menudeo' },
  { v: 'mayorista', t: 'Al por mayor' },
  { v: 'ambos', t: 'Mayor y menudeo' },
  { v: 'tejida', t: 'Pulsera tejida (elaboración)' },
];
const CATS_BASE = ['Pulseras tejidas', 'Anillos', 'Collares', 'Aretes', 'Cadenas', 'Dijes'];
const SEP = '|';
const MAX_FOTOS = 6;
const MAX_VIDEO_MB = 50;
const VERDE = '#0b4a2e';
const FACTOR_18K = 0.75;

const FORM_VACIO = {
  nombre: '', categoria: '', tipo: 'ambos' as Tipo, material: '', precio_menudeo: '', precio_mayorista: '',
  min_mayorista: '', stock: '1', descripcion: '', foto_url: '', video_url: '',
  oro: '' as Oro, gramos: '', mano_obra: '', mano_obra_mayor: '', diseno: '',
};

const parseFotos = (v: string) => (v || '').split(SEP).map((x) => x.trim()).filter(Boolean);
const num = (s?: string) => Number(String(s || '').replace(/\D/g, '')) || 0;
const gr = (s?: string) => Number(String(s || '').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
const copN = (n: number) => (n > 0 ? `$${Math.round(n).toLocaleString('es-CO')}` : '—');
const tipoTxt = (t: string) => TIPOS.find((x) => x.v === t)?.t ?? t;

function precioGramo(oro: string | undefined, c: Config) { return oro === '18k' ? c.oro18 : oro === '24k' ? c.oro24 : 0; }

type PrecioX = { oro?: string; gramos?: string; mano_obra?: string; mano_obra_mayor?: string; precio_menudeo: string; precio_mayorista: string };
function precioItem(x: PrecioX, cual: 'menudeo' | 'mayorista', c: Config): { valor: number; auto: boolean } {
  const pg = precioGramo(x.oro, c);
  const g = gr(x.gramos);
  if (x.oro && pg > 0 && g > 0) {
    const mo = num(cual === 'menudeo' ? x.mano_obra : x.mano_obra_mayor);
    return { valor: Math.round((g * pg + mo) / 100) * 100, auto: true };
  }
  return { valor: num(cual === 'menudeo' ? x.precio_menudeo : x.precio_mayorista), auto: false };
}
/** Precio final: si la prenda tiene diseño usa el valor por balín (fijo o por peso) + mano de obra. */
function precioDe(x: PrecioX & { diseno?: string }, cual: 'menudeo' | 'mayorista', c: Config, p: Piezas) {
  const d = parseDis(x.diseno);
  if (d && x.oro && precioGramo(x.oro, c) > 0 && gr(x.gramos) > 0) {
    const mo = num(cual === 'menudeo' ? x.mano_obra : x.mano_obra_mayor);
    return { valor: Math.round((valorOro(d, p, x.oro, c) + mo) / 100) * 100, auto: true };
  }
  return precioItem(x, cual, c);
}
/** Si la prenda tiene diseño, los gramos salen del diseño con los pesos vigentes. */
const conG = <T extends { diseno?: string; oro?: string; gramos?: string }>(x: T, p: Piezas): T => {
  const d = parseDis(x.diseno);
  return d ? { ...x, gramos: String(totalGramos(d, p, x.oro).total) } : x;
};


type Pal = { hi: string; mid: string; lo: string; edge: string };
export const METAL: Record<Metal, Pal> = {
  dorado: { hi: '#fff3b0', mid: '#e6b422', lo: '#8a5a00', edge: '#6b4300' },
  plateado: { hi: '#ffffff', mid: '#c4cbd2', lo: '#5d6670', edge: '#46505a' },
  rosado: { hi: '#ffe3d6', mid: '#e0a08a', lo: '#8c4a3a', edge: '#6b3328' },
  negro: { hi: '#8a9099', mid: '#2a2d33', lo: '#07080a', edge: '#000000' },
};
const hex2rgb = (h: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec((h || '').trim());
  if (!m) return [40, 40, 40];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const shade = (h: string, a: number) => {
  const [r, g, b] = hex2rgb(h);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(a >= 0 ? v + (255 - v) * a : v * (1 + a))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
const palHilo = (c: string): Pal => ({ hi: shade(c, 0.38), mid: c, lo: shade(c, -0.5), edge: shade(c, -0.6) });
const kindOf = (id: string) =>
  id.includes('diamant') ? 'diamantado' : id.includes('facet') ? 'facetado' : id.includes('martill') ? 'martillado'
    : id.includes('estri') || id.includes('rayad') ? 'estriado' : 'liso';

type V3 = [number, number, number];
type Scene = {
  R: number; metal: Metal; hasDije: boolean;
  spheres: { p: V3; r: number; col: string | null; kind: string; seed: number; mt?: Metal }[];
  planes: { c: V3; u: V3; t: 'ini' | 'dije'; ini: Dis['inicial']; dijeId: string }[];
};
const EMPTY: Scene = { R: 2.7, metal: 'dorado', hasDije: false, spheres: [], planes: [] };

function buildScene(d: Dis): Scene {
  const R = Math.max(4, d.longitud) / (2 * Math.PI);
  const thr = d.ancho / 20; // radio del hilo en cm
  const gap = 0.03;
  const at = (s: number): { p: V3; u: V3 } => {
    const th = s / R;
    return { p: [R * Math.sin(th), 0, R * Math.cos(th)], u: [Math.cos(th), 0, -Math.sin(th)] };
  };
  const spheres: Scene['spheres'] = [];
  const planes: Scene['planes'] = [];
  const ini = d.inicial;
  const iw = ini ? (INI_MM[ini.tam] / 10) * (ini.estilo === 'letra' ? 0.85 : 1) : 0;
  let L = 0, Rr = 0;
  if (ini) {
    L = -iw / 2 - gap; Rr = iw / 2 + gap;
    const a = at(0);
    planes.push({ c: a.p, u: a.u, t: 'ini', ini, dijeId: '' });
  }
  const seq = d.balines.flatMap((b) => Array(Math.max(0, Math.min(60, b.cant | 0))).fill(b) as typeof d.balines).slice(0, 90);
  let side = 1;
  seq.forEach((b, i) => {
    const dm = b.mm / 10;
    let s: number;
    if (!ini && i === 0) { s = 0; L = -dm / 2 - gap; Rr = dm / 2 + gap; }
    else if (side === 1) { s = Rr + dm / 2; Rr = s + dm / 2 + gap; side = -1; }
    else { s = L - dm / 2; L = s - dm / 2 - gap; side = 1; }
    if (Math.abs(s) > Math.PI * R * 0.88) return;
    spheres.push({ p: at(s).p, r: dm / 2, col: null, kind: kindOf(b.tipo), seed: i, mt: b.metal });
  });
  // hilo trenzado
  const N = Math.max(40, Math.round((2 * Math.PI * R) / (thr * 1.1)));
  for (let i = 0; i < N; i++) {
    const th = -Math.PI + ((i + 0.5) / N) * 2 * Math.PI;
    const s = th * R;
    if (seq.length + (ini ? 1 : 0) > 0 && s >= L - 0.02 && s <= Rr + 0.02) continue;
    const alt = Math.floor(i / 2) % 2 === 0;
    const col = d.hilo2 ? (alt ? d.hilo1 : d.hilo2) : alt ? d.hilo1 : shade(d.hilo1, 0.12);
    spheres.push({ p: at(s).p, r: thr, col, kind: 'hilo', seed: i });
  }
  // cierre (nudo metálico atrás)
  [-0.07, 0.07].forEach((o) => spheres.push({ p: at(Math.PI * R + o * R).p, r: thr * 1.25, col: null, kind: 'liso', seed: 1 }));
  // dije
  let hasDije = false;
  if (d.dije) {
    hasDije = true;
    const attachY = ini ? -(INI_MM[ini.tam] / 20) : -thr;
    planes.push({ c: [0, attachY - 0.8, R + 0.06], u: [1, 0, 0], t: 'dije', ini: null, dijeId: d.dije.id });
  }
  return { R, metal: d.metal, hasDije, spheres, planes };
}

function drawBead(c: CanvasRenderingContext2D, X: number, Y: number, r: number, pal: Pal, kind: string, seed: number) {
  if (r < 0.4) return;
  const g = c.createRadialGradient(X - r * 0.35, Y - r * 0.4, r * 0.1, X, Y, r);
  g.addColorStop(0, pal.hi); g.addColorStop(0.5, pal.mid); g.addColorStop(1, pal.lo);
  c.fillStyle = g;
  c.beginPath(); c.arc(X, Y, r, 0, Math.PI * 2); c.fill();
  if (kind !== 'hilo') {
    c.save();
    c.beginPath(); c.arc(X, Y, r, 0, Math.PI * 2); c.clip();
    c.translate(X, Y); c.rotate(seed * 0.7);
    c.lineWidth = Math.max(0.5, r * 0.05);
    if (kind === 'diamantado' || kind === 'facetado') {
      const step = Math.max(2.2, r * (kind === 'diamantado' ? 0.55 : 1.0));
      for (let t = -2 * r; t <= 2 * r; t += step) {
        c.strokeStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(t - 2 * r, -2 * r); c.lineTo(t + 2 * r, 2 * r); c.stroke();
        if (kind === 'diamantado') { c.strokeStyle = 'rgba(70,35,0,.3)'; c.beginPath(); c.moveTo(t + 2 * r, -2 * r); c.lineTo(t - 2 * r, 2 * r); c.stroke(); }
        else { c.strokeStyle = 'rgba(70,35,0,.25)'; c.beginPath(); c.moveTo(-2 * r, t); c.lineTo(2 * r, t); c.stroke(); }
      }
    } else if (kind === 'martillado') {
      for (let j = 0; j < 11; j++) {
        const ang = j * 2.4 + 1, rad = r * (0.2 + 0.65 * (((j * 37) % 10) / 10));
        c.fillStyle = 'rgba(80,40,0,.25)'; c.beginPath(); c.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, r * 0.17, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(Math.cos(ang) * rad - r * 0.04, Math.sin(ang) * rad - r * 0.05, r * 0.08, 0, Math.PI * 2); c.fill();
      }
    } else if (kind === 'estriado') {
      c.strokeStyle = 'rgba(70,35,0,.32)'; c.lineWidth = Math.max(0.6, r * 0.07);
      for (let t = -r; t <= r; t += r * 0.38) { c.beginPath(); c.moveTo(-2 * r, t); c.lineTo(2 * r, t); c.stroke(); }
    }
    c.restore();
  }
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.ellipse(X - r * 0.38, Y - r * 0.42, r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2); c.fill();
}

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}

/** Dibuja el dije en milímetros, con el eje y hacia abajo. */
export function drawDije(c: CanvasRenderingContext2D, id: string, pal: Pal, back: boolean) {
  const g = c.createLinearGradient(-6, -7, 6, 7);
  g.addColorStop(0, back ? pal.mid : pal.hi); g.addColorStop(0.5, pal.mid); g.addColorStop(1, pal.lo);
  c.fillStyle = g; c.strokeStyle = pal.edge; c.lineWidth = 0.45; c.lineJoin = 'round'; c.lineCap = 'round';
  const part = (fn: () => void) => { c.beginPath(); fn(); c.fill(); c.stroke(); };
  const line = (fn: () => void) => { c.save(); c.strokeStyle = g; c.lineWidth = 1.7; c.beginPath(); fn(); c.stroke(); c.restore(); };
  switch (id) {
    case 'corazon':
      part(() => { c.moveTo(0, 5.5); c.bezierCurveTo(-9, -1, -5, -7.5, 0, -3); c.bezierCurveTo(5, -7.5, 9, -1, 0, 5.5); }); break;
    case 'estrella':
      part(() => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 2.8 : 6.6; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }); break;
    case 'cruz':
      part(() => { [[-1.7, -6.5], [1.7, -6.5], [1.7, -3], [4.8, -3], [4.8, 0.2], [1.7, 0.2], [1.7, 6.5], [-1.7, 6.5], [-1.7, 0.2], [-4.8, 0.2], [-4.8, -3], [-1.7, -3]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }); break;
    case 'luna':
      part(() => { c.moveTo(1.5, -6.4); c.bezierCurveTo(-8, -5.5, -8, 5.5, 1.5, 6.4); c.bezierCurveTo(-4, 3.2, -4, -3.2, 1.5, -6.4); }); break;
    case 'mariposa':
      part(() => c.ellipse(-3.5, -2.6, 3.4, 3.2, -0.5, 0, Math.PI * 2));
      part(() => c.ellipse(3.5, -2.6, 3.4, 3.2, 0.5, 0, Math.PI * 2));
      part(() => c.ellipse(-2.7, 3, 2.7, 2.4, 0.4, 0, Math.PI * 2));
      part(() => c.ellipse(2.7, 3, 2.7, 2.4, -0.4, 0, Math.PI * 2));
      part(() => c.ellipse(0, 0.4, 0.9, 4.8, 0, 0, Math.PI * 2)); break;
    case 'trebol':
      [[-2.3, 0], [2.3, 0], [0, -2.3], [0, 2.3]].forEach(([x, y]) => part(() => c.arc(x, y, 2.7, 0, Math.PI * 2)));
      part(() => rr(c, -0.5, 1, 1.1, 5.6, 0.5)); break;
    case 'hamsa':
      [[-5.4, -1.5, 2, 5], [-3.2, -6, 1.9, 8.5], [-0.95, -7.4, 1.9, 9.8], [1.3, -6, 1.9, 8.5], [3.4, -1.5, 2, 5]].forEach(([x, y, w, h]) => part(() => rr(c, x, y, w, h, 0.9)));
      part(() => rr(c, -4.8, -0.6, 9.6, 7.4, 2.6)); break;
    case 'infinito':
      line(() => { for (let t = 0; t <= Math.PI * 2 + 0.05; t += 0.08) { const d = 1 + Math.sin(t) ** 2, x = (6.6 * Math.cos(t)) / d, y = (6.6 * Math.sin(t) * Math.cos(t)) / d; t ? c.lineTo(x, y) : c.moveTo(x, y); } }); break;
    case 'ancla':
      line(() => { c.moveTo(0, -4.5); c.lineTo(0, 5.2); c.moveTo(-2.6, -2); c.lineTo(2.6, -2); c.moveTo(-5.2, 1.2); c.arc(0, 0.4, 5.2, Math.PI * 0.08, Math.PI * 0.92); c.moveTo(5.2, 0.4); c.lineTo(5.2, 1.6); c.moveTo(-5.2, 0.4); c.lineTo(-5.2, 1.6); });
      line(() => { c.arc(0, -5.6, 1.2, 0, Math.PI * 2); }); break;
    case 'medalla':
      part(() => c.arc(0, 0, 5.8, 0, Math.PI * 2));
      c.save(); c.strokeStyle = back ? pal.mid : pal.lo; c.globalAlpha = 0.6; c.lineWidth = 0.5; c.beginPath(); c.arc(0, 0, 4.4, 0, Math.PI * 2); c.stroke(); c.restore(); break;
    default:
      part(() => rr(c, -4.5, -5.8, 9, 11.6, 2.6));
      c.save(); c.strokeStyle = pal.lo; c.globalAlpha = 0.5; c.lineWidth = 0.5; c.beginPath(); rr(c, -3.3, -4.6, 6.6, 9.2, 1.8); c.stroke(); c.restore();
  }
  // argolla
  c.save(); c.strokeStyle = g; c.lineWidth = 0.9; c.beginPath(); c.arc(0, -7.6, 1.3, 0, Math.PI * 2); c.stroke(); c.restore();
}

export function drawInicial(c: CanvasRenderingContext2D, ini: NonNullable<Dis['inicial']>, pal: Pal, back: boolean) {
  const s = INI_MM[ini.tam];
  const g = c.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
  g.addColorStop(0, back ? pal.mid : pal.hi); g.addColorStop(0.5, pal.mid); g.addColorStop(1, pal.lo);
  c.lineJoin = 'round'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const one = ini.txt.length < 2;
  if (ini.estilo === 'letra') {
    if (back) return;
    c.font = `700 ${s * (one ? 1.15 : 0.8)}px Georgia, 'Times New Roman', serif`;
    c.lineWidth = 0.5; c.strokeStyle = pal.edge; c.fillStyle = g;
    c.strokeText(ini.txt, 0, 0.3); c.fillText(ini.txt, 0, 0.3); return;
  }
  c.fillStyle = g; c.strokeStyle = pal.edge; c.lineWidth = 0.45;
  c.beginPath();
  if (ini.estilo === 'placa') c.arc(0, 0, s / 2, 0, Math.PI * 2); else rr(c, -s / 2, -s / 2, s, s, s * 0.22);
  c.fill(); c.stroke();
  c.save(); c.globalAlpha = 0.5; c.strokeStyle = back ? pal.mid : pal.lo; c.lineWidth = 0.35; c.beginPath();
  if (ini.estilo === 'placa') c.arc(0, 0, s / 2 - 0.9, 0, Math.PI * 2); else rr(c, -s / 2 + 0.9, -s / 2 + 0.9, s - 1.8, s - 1.8, s * 0.15);
  c.stroke(); c.restore();
  if (back) return;
  c.font = `700 ${s * (one ? 0.62 : 0.44)}px Georgia, 'Times New Roman', serif`;
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText(ini.txt, 0.18, 0.38);
  c.fillStyle = pal.lo; c.fillText(ini.txt, 0, 0.1);
}

function render(c: CanvasRenderingContext2D, w: number, h: number, sc: Scene, yaw: number, pitch: number, time: number) {
  c.clearRect(0, 0, w, h);
  const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#14573f'); bg.addColorStop(1, '#06191a');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  const gl = c.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, Math.max(w, h) * 0.6);
  gl.addColorStop(0, 'rgba(240,193,75,.2)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gl; c.fillRect(0, 0, w, h);

  const R = sc.R, sp0 = Math.sin(0.6), cp0 = Math.cos(0.6);
  const top = R * sp0 + 0.4, bot = R * sp0 + (sc.hasDije ? 2.6 * cp0 : 0.6);
  const S = Math.min(w / (2 * R + 2.2), (h * 0.84) / (top + bot));
  const cx = w / 2, cy = h * 0.06 + (h * 0.84 - (top + bot) * S) / 2 + top * S;
  const D = 26;
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const proj = (x: number, y: number, z: number) => {
    const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const k = D / (D - z2);
    return { x: cx + x1 * S * k, y: cy - y2 * S * k, z: z2, k };
  };
  const pal = METAL[sc.metal];

  // sombra en el piso
  const f = proj(0, sc.hasDije ? -2.9 : -1.3, 0);
  c.save(); c.translate(f.x, f.y); c.scale(1, 0.26);
  const sh = c.createRadialGradient(0, 0, 0, 0, 0, R * S * 1.15); sh.addColorStop(0, 'rgba(0,0,0,.4)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sh; c.beginPath(); c.arc(0, 0, R * S * 1.15, 0, Math.PI * 2); c.fill(); c.restore();

  const items: { z: number; f: () => void }[] = [];
  sc.spheres.forEach((s) => {
    const p = proj(...s.p);
    items.push({ z: p.z, f: () => drawBead(c, p.x, p.y, s.r * S * p.k, s.col ? palHilo(s.col) : METAL[s.mt ?? sc.metal], s.kind, s.seed) });
  });
  sc.planes.forEach((pl) => {
    const P0 = proj(...pl.c);
    const Pu = proj(pl.c[0] + pl.u[0] * 0.1, pl.c[1] + pl.u[1] * 0.1, pl.c[2] + pl.u[2] * 0.1);
    const Pw = proj(pl.c[0], pl.c[1] - 0.1, pl.c[2]);
    const a = Pu.x - P0.x, b = Pu.y - P0.y, cc = Pw.x - P0.x, d = Pw.y - P0.y;
    const back = a * d - b * cc < 0;
    items.push({
      z: P0.z + 0.03,
      f: () => {
        c.save();
        c.transform(a, b, cc, d, P0.x, P0.y);
        if (pl.t === 'dije') {
          c.translate(0, -8.5); c.rotate(Math.sin(time * 1.6) * 0.07); c.translate(0, 8.5);
          drawDije(c, pl.dijeId, pal, back);
        } else if (pl.ini) drawInicial(c, pl.ini, pal, back);
        c.restore();
      },
    });
  });
  items.sort((p, q) => p.z - q.z).forEach((i) => i.f());

  c.fillStyle = 'rgba(255,255,255,.45)'; c.font = '11px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText('Arrastra para girar', w / 2, h - 10);
}

function Pulsera3D({ dis, h = 320 }: { dis: Dis; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const disRef = useRef(dis);
  disRef.current = dis;
  const st = useRef({ yaw: 0, pitch: 0.6, drag: false, lx: 0, ly: 0, idle: 0 });

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, key = '', scene: Scene = EMPTY;
    const t0 = performance.now();
    const loop = (now: number) => {
      const w = cv.clientWidth || 300;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const k = JSON.stringify(disRef.current);
      if (k !== key) { key = k; scene = buildScene(disRef.current); }
      const s = st.current;
      if (!reduce && !s.drag && now - s.idle > 1500) s.yaw += 0.008;
      render(ctx, w, h, scene, s.yaw, s.pitch, (now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [h]);

  return (
    <canvas
      ref={ref}
      aria-label="Vista 3D de la pulsera"
      style={{ width: '100%', height: h, display: 'block', borderRadius: 16, touchAction: 'none', cursor: 'grab' }}
      onPointerDown={(e) => { const s = st.current; s.drag = true; s.lx = e.clientX; s.ly = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        const s = st.current;
        if (!s.drag) return;
        s.yaw += (e.clientX - s.lx) * 0.01;
        s.pitch = Math.max(0.05, Math.min(1.35, s.pitch + (e.clientY - s.ly) * 0.008));
        s.lx = e.clientX; s.ly = e.clientY; s.idle = performance.now();
      }}
      onPointerUp={() => { st.current.drag = false; st.current.idle = performance.now(); }}
      onPointerCancel={() => { st.current.drag = false; st.current.idle = performance.now(); }}
    />
  );
}

/* ---------- Foto con efecto lupa (zoom que sigue al cursor) ---------- */
function FotoZoom({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const [z, setZ] = useState<{ x: number; y: number } | null>(null);
  const n = fotos.length;
  const idx = Math.min(i, Math.max(n - 1, 0));
  const src = fotos[idx];
  const ir = (d: number) => setI((idx + d + n) % n);
  const tx = useRef<number | null>(null);
  return (
    <div
      className="hn-zoom"
      onTouchStart={(e) => { tx.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (tx.current == null || n < 2) return;
        const dx = e.changedTouches[0].clientX - tx.current;
        tx.current = null;
        if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
      }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setZ({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseLeave={() => setZ(null)}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ transformOrigin: z ? `${z.x}% ${z.y}%` : '50% 50%', transform: z ? 'scale(2.4)' : 'scale(1)' }}
        />
      ) : (
        <span className="hn-nofoto">Sin foto</span>
      )}
      {n > 1 && (
        <>
          <button type="button" className="hn-arr prev" aria-label="Foto anterior" onClick={() => ir(-1)}>‹</button>
          <button type="button" className="hn-arr next" aria-label="Foto siguiente" onClick={() => ir(1)}>›</button>
          <div className="hn-thumbs">
            {fotos.map((u, k) => (
              <button key={u + k} type="button" aria-label={`Ver foto ${k + 1}`} aria-pressed={k === idx} onClick={() => setI(k)} />
            ))}
          </div>
          <span className="hn-pos">{idx + 1} / {n}</span>
        </>
      )}
      {src && <span className="hn-lupa" aria-hidden="true">🔍 pasa el cursor</span>}
    </div>
  );
}

/* ---------- Pantalla pequeña (se actualiza al girar o redimensionar) ---------- */
function useMovil(px = 760) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px}px)`);
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [px]);
  return m;
}

/* ---------- Carrusel de tarjetas (móvil): contador + flechas arriba, tarjetas deslizables ---------- */
function Desliza({ total, children }: { total: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState({ i: 1, ini: true, fin: false });
  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const w = (card?.offsetWidth ?? 240) + 12;
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
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 240) + 12), behavior: 'smooth' });
  };
  return (
    <div>
      <div className="hn-cbar">
        <span className="hn-cc">{st.i} / {total}</span>
        <div className="hn-cbtns">
          <button type="button" aria-label="Anterior" disabled={st.ini} onClick={() => mover(-1)}>‹</button>
          <button type="button" aria-label="Siguiente" disabled={st.fin} onClick={() => mover(1)}>›</button>
        </div>
      </div>
      <div className="hn-trk" ref={ref} onScroll={medir}>{children}</div>
    </div>
  );
}

/* ---------- Formulario de piezas (config) ---------- */
const pfFrom = (p: Piezas): PF => ({
  pesos: sizesOf(p).map((n) => ({ mm: String(n), g: String(p.pesos[String(n)]), v: p.valores[String(n)] ? String(p.valores[String(n)]) : '' })),
  tipos: p.tipos.map((t) => ({ id: t.id, nombre: t.nombre, f: String(Math.round(t.factor * 1000) / 10) })),
  ini: { pequena: String(p.inicial.pequena), mediana: String(p.inicial.mediana), grande: String(p.inicial.grande) },
  dijes: p.dijes.map((d) => ({ id: d.id, nombre: d.nombre, g: String(d.gramos) })),
});
function pfTo(pf: PF): Piezas | null {
  const pesos: Record<string, number> = {};
  const valores: Record<string, number> = {};
  pf.pesos.forEach((r) => {
    const mm = gr(r.mm), g = gr(r.g), v = num(r.v);
    if (mm > 0 && g > 0) { pesos[String(mm)] = g; if (v > 0) valores[String(mm)] = v; }
  });
  const tipos = pf.tipos.filter((t) => t.id).map((t) => ({ id: t.id, nombre: t.nombre.trim() || t.id, factor: (gr(t.f) || 100) / 100 }));
  if (!Object.keys(pesos).length || !tipos.length) return null;
  return {
    pesos, valores, tipos,
    inicial: { pequena: gr(pf.ini.pequena), mediana: gr(pf.ini.mediana), grande: gr(pf.ini.grande) },
    dijes: pf.dijes.filter((d) => d.id).map((d) => ({ id: d.id, nombre: d.nombre.trim() || d.id, gramos: gr(d.g) })),
  };
}

export default function HansPanel() {
  const movil = useMovil(760);
  const [tab, setTab] = useState<'catalogo' | 'config' | 'pedidos'>('catalogo');
  const [lista, setLista] = useState<Item[]>([]);
  const [cats, setCats] = useState<string[]>(CATS_BASE);
  const [cfg, setCfg] = useState<Config>({ oro18: 0, oro24: 0, actualizado: '' });
  const [cfgForm, setCfgForm] = useState({ oro18: '', oro24: '' });
  const [piezas, setPiezas] = useState<Piezas>(DEF_PIEZAS);
  const [pf, setPf] = useState<PF>(pfFrom(DEF_PIEZAS));
  const [guardandoCfg, setGuardandoCfg] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errCarga, setErrCarga] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [nuevaCat, setNuevaCat] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subFoto, setSubFoto] = useState(false);
  const [subVideo, setSubVideo] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [borrar, setBorrar] = useState<Item | null>(null);
  const [ver3d, setVer3d] = useState<Item | null>(null);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargandoPed, setCargandoPed] = useState(true);
  const [ultPed, setUltPed] = useState<Date | null>(null);

  const cargarPedidos = useCallback(async () => {
    try {
      const r = await fetch('/api/hans/pedidos', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setPedidos(Array.isArray(d.items) ? d.items : []);
      setUltPed(new Date());
    } catch {
      /* si falla, se conserva la lista actual */
    } finally {
      setCargandoPed(false);
    }
  }, []);

  // Carga al abrir y refresca cada 30 s para que el contador vea los pedidos nuevos de la web
  useEffect(() => {
    cargarPedidos();
    const t = setInterval(() => { if (!document.hidden) cargarPedidos(); }, 30000);
    return () => clearInterval(t);
  }, [cargarPedidos]);

  const avisar = (t: string, ms = 3500) => { setAviso(t); setTimeout(() => setAviso(''), ms); };

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c] = await Promise.all([
          fetch('/api/hans', { cache: 'no-store' }),
          fetch('/api/hans/categorias', { cache: 'no-store' }),
          fetch('/api/hans/config', { cache: 'no-store' }),
        ]);
        if (!a.ok) throw new Error();
        const d = await a.json();
        setLista(Array.isArray(d.items) ? d.items : []);
        if (b.ok) {
          const cc = await b.json();
          if (Array.isArray(cc.categorias) && cc.categorias.length) setCats(cc.categorias);
        }
        if (c.ok) {
          const k = await c.json();
          const n: Config = { oro18: num(String(k.oro18)), oro24: num(String(k.oro24)), actualizado: k.actualizado || '' };
          setCfg(n);
          setCfgForm({ oro18: n.oro18 ? String(n.oro18) : '', oro24: n.oro24 ? String(n.oro24) : '' });
          const pz = normPiezas(k.piezas);
          setPiezas(pz); setPf(pfFrom(pz));
        }
      } catch {
        setErrCarga('No se pudo cargar Joyería Hans (el backend se crea en el Paso 2).');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!abierto && !borrar && !ver3d) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (borrar) setBorrar(null); else if (ver3d) setVer3d(null); else setAbierto(false);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto, borrar, ver3d]);

  const set = (k: keyof typeof FORM_VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const presentes = useMemo(() => Array.from(new Set([...cats, ...lista.map((x) => x.categoria).filter(Boolean)])), [cats, lista]);
  const visibles = lista.filter((x) => {
    if (cat === '__revisar') { if (x.activo === 'true') return false; }
    else if (cat !== 'todas' && x.categoria !== cat) return false;
    return !q || `${x.nombre} ${x.codigo} ${x.categoria}`.toLowerCase().includes(q.toLowerCase());
  });
  const nActivos = lista.filter((x) => x.activo === 'true').length;
  const nRevisar = lista.length - nActivos;
  const nOro = lista.filter((x) => x.oro).length;

  const nNuevos = pedidos.filter((p) => p.estado === 'nuevo').length;
  const catalogo = useMemo(
    () => lista.map((x) => {
      const xe = conG(x, piezas);
      return {
        codigo: x.codigo,
        nombre: x.nombre,
        menudeo: precioDe(xe, 'menudeo', cfg, piezas).valor,
        mayorista: precioDe(xe, 'mayorista', cfg, piezas).valor,
      };
    }),
    [lista, piezas, cfg],
  );

  /** Grupos por categoría (con su tarjeta "Nueva en ..."). */
  const grupos = useMemo(() => {
    const g = presentes
      .map((c) => ({ c, items: visibles.filter((x) => x.categoria === c) }))
      .filter((x) => x.items.length > 0 || cat === x.c || (cat === 'todas' && !q));
    const sin = visibles.filter((x) => !x.categoria);
    if (sin.length) g.push({ c: '', items: sin });
    return g;
  }, [presentes, visibles, cat, q]);

  function abrir(categoria?: string) {
    setEditId(null);
    setForm({ ...FORM_VACIO, categoria: categoria || presentes[0] || '' });
    setError('');
    setAbierto(true);
  }
  function abrirEditar(x: Item) {
    setEditId(x.id);
    setForm({
      nombre: x.nombre, categoria: x.categoria, tipo: x.tipo || 'ambos', material: x.material || '',
      precio_menudeo: x.precio_menudeo || '', precio_mayorista: x.precio_mayorista || '', min_mayorista: x.min_mayorista || '',
      stock: x.stock || '1', descripcion: x.descripcion || '', foto_url: x.foto_url || '', video_url: x.video_url || '',
      oro: (x.oro as Oro) || '', gramos: x.gramos || '', mano_obra: x.mano_obra || '', mano_obra_mayor: x.mano_obra_mayor || '',
      diseno: x.diseno || '',
    });
    setError('');
    setAbierto(true);
  }

  async function crearCategoria() {
    const nombre = nuevaCat.trim();
    if (!nombre) return;
    if (presentes.some((c) => c.toLowerCase() === nombre.toLowerCase())) {
      setForm((f) => ({ ...f, categoria: presentes.find((c) => c.toLowerCase() === nombre.toLowerCase())! }));
      setNuevaCat('');
      return;
    }
    try {
      const res = await fetch('/api/hans/categorias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo crear la categoría');
      setCats(Array.isArray(d.categorias) ? d.categorias : [...cats, nombre]);
      setForm((f) => ({ ...f, categoria: nombre }));
      setNuevaCat('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la categoría');
    }
  }

  async function subirFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const libres = MAX_FOTOS - parseFotos(form.foto_url).length;
    const lote = files.slice(0, Math.max(libres, 0));
    setSubFoto(true);
    setError(files.length > lote.length ? `Máximo ${MAX_FOTOS} fotos` : '');
    const nuevas: string[] = [];
    try {
      for (const file of lote) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Usa imágenes PNG, JPG o WEBP');
        if (file.size > 4 * 1024 * 1024) throw new Error(`"${file.name}" pesa más de 4 MB`);
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/hans/foto', { method: 'POST', body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'No se pudo subir la foto');
        nuevas.push(d.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      if (nuevas.length) setForm((f) => ({ ...f, foto_url: [...parseFotos(f.foto_url), ...nuevas].join(SEP) }));
      setSubFoto(false);
    }
  }

  async function subirVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) return setError('Usa un video MP4, WEBM o MOV');
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return setError(`El video pesa más de ${MAX_VIDEO_MB} MB`);
    setSubVideo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/hans/video', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo subir el video');
      setForm((f) => ({ ...f, video_url: d.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el video');
    } finally {
      setSubVideo(false);
    }
  }

  /* ---------- Diseñador ---------- */
  const dis = useMemo(() => parseDis(form.diseno), [form.diseno]);
  const disOn = !!dis;
  const upDis = (fn: (d: Dis) => Dis) => setForm((f) => ({ ...f, diseno: JSON.stringify(fn(parseDis(f.diseno) ?? defDis())) }));
  const toggleDis = (on: boolean) => setForm((f) => ({ ...f, diseno: on ? JSON.stringify(defDis()) : '' }));
  const pesoDis = dis ? totalGramos(dis, piezas, form.oro) : null;
  const formEf = { ...form, gramos: pesoDis ? String(pesoDis.total) : form.gramos };
  const sizes = sizesOf(piezas);

  async function guardar() {
    setError('');
    if (!form.nombre.trim()) return setError('Ponle un nombre al artículo');
    if (!form.categoria.trim()) return setError('Elige o crea una categoría');
    if (form.oro && !gr(formEf.gramos)) return setError(disOn ? 'El diseño no tiene piezas: agrega balines, inicial o dije' : 'Indica los gramos de oro de la prenda');
    setGuardando(true);
    try {
      const editando = editId !== null;
      const payload: Record<string, string> = { ...formEf };
      if (form.oro) {
        const m = precioDe(formEf, 'menudeo', cfg, piezas);
        const w = precioDe(formEf, 'mayorista', cfg, piezas);
        if (m.auto) payload.precio_menudeo = String(m.valor);
        if (w.auto) payload.precio_mayorista = String(w.valor);
      }
      if (!editando) payload.activo = 'false';

      const res = await fetch(editando ? `/api/hans/${editId}` : '/api/hans', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar');

      if (editando) {
        setLista((l) => l.map((x) => (x.id === editId ? d : x)));
        avisar('Cambios guardados.');
      } else {
        if (d.activo !== 'false') {
          try {
            const r2 = await fetch(`/api/hans/${d.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: 'false' }),
            });
            if (r2.ok) d = await r2.json(); else d = { ...d, activo: 'false' };
          } catch { d = { ...d, activo: 'false' }; }
        }
        setLista((l) => [d, ...l]);
        avisar(`Artículo creado en «${d.categoria || form.categoria}» (en revisión). Revísalo y enciende el interruptor para publicarlo.`, 5500);
      }
      setAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(x: Item) {
    const nuevo = x.activo === 'true' ? 'false' : 'true';
    setLista((l) => l.map((y) => (y.id === x.id ? { ...y, activo: nuevo } : y)));
    try {
      const res = await fetch(`/api/hans/${x.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: nuevo }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error();
      setLista((l) => l.map((y) => (y.id === x.id ? d : y)));
    } catch {
      setLista((l) => l.map((y) => (y.id === x.id ? { ...y, activo: x.activo } : y)));
      avisar('No se pudo cambiar el estado.');
    }
  }

  async function eliminar(x: Item) {
    try {
      const res = await fetch(`/api/hans/${x.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLista((l) => l.filter((y) => y.id !== x.id));
      avisar(`"${x.nombre}" eliminado.`);
    } catch {
      avisar('No se pudo eliminar.');
    } finally {
      setBorrar(null);
    }
  }

  /* ---------- Configuración ---------- */
  const calc18desde24 = () => {
    const v24 = num(cfgForm.oro24);
    if (!v24) return avisar('Primero escribe el precio del oro 24k.');
    setCfgForm((f) => ({ ...f, oro18: String(Math.round((v24 * FACTOR_18K) / 100) * 100) }));
  };

  async function guardarConfig() {
    const nuevo: Config = { oro18: num(cfgForm.oro18), oro24: num(cfgForm.oro24), actualizado: new Date().toISOString() };
    if (!nuevo.oro18 && !nuevo.oro24) return avisar('Escribe al menos un precio de oro por gramo.');
    const pn = pfTo(pf);
    if (!pn) return avisar('Revisa la tabla de balines: debe haber al menos un tamaño con peso y un tipo.');
    setGuardandoCfg(true);
    try {
      const res = await fetch('/api/hans/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oro18: nuevo.oro18, oro24: nuevo.oro24, piezas: pn }),
      });
      if (!res.ok) throw new Error();
      setCfg(nuevo); setPiezas(pn);

      const afectadas = lista.filter((x) => x.oro && precioGramo(x.oro, nuevo) > 0 && gr(conG(x, pn).gramos) > 0);
      let fallos = 0;
      const resultados: (Item | null)[] = [];
      for (const x of afectadas) {
        const xe = conG(x, pn);
        const m = precioDe(xe, 'menudeo', nuevo, pn).valor;
        const w = precioDe(xe, 'mayorista', nuevo, pn).valor;
        try {
          const r = await fetch(`/api/hans/${x.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gramos: xe.gramos || '', precio_menudeo: String(m), precio_mayorista: String(w) }),
          });
          if (!r.ok) throw new Error();
          resultados.push(await r.json());
        } catch { fallos++; resultados.push(null); }
      }

      const mapa = new Map<string, Item>();
      resultados.forEach((r) => { if (r?.id) mapa.set(r.id, r); });
      setLista((l) => l.map((x) => mapa.get(x.id) ?? x));
      avisar(
        fallos
          ? `Configuración guardada. ${afectadas.length - fallos} prendas actualizadas, ${fallos} fallaron: reintenta.`
          : `Configuración guardada. ${afectadas.length} prenda${afectadas.length === 1 ? '' : 's'} recalculada${afectadas.length === 1 ? '' : 's'}.`,
        5000,
      );
    } catch {
      avisar('No se pudo guardar la configuración.');
    } finally {
      setGuardandoCfg(false);
    }
  }

  const fotosForm = parseFotos(form.foto_url);
  const verMayor = form.tipo === 'mayorista' || form.tipo === 'ambos';
  const verMenudeo = form.tipo !== 'mayorista';
  const prevM = precioDe(formEf, 'menudeo', cfg, piezas);
  const prevW = precioDe(formEf, 'mayorista', cfg, piezas);
  const sinPrecioOro = !!form.oro && precioGramo(form.oro, cfg) === 0;
  const exceso = dis ? largoBalines(dis) > dis.longitud * 0.85 : false;
  const nombreTipo = (id: string) => piezas.tipos.find((t) => t.id === id)?.nombre ?? id;
  const nombreDije = (id: string) => piezas.dijes.find((t) => t.id === id)?.nombre ?? id;
  const catActual = cat !== 'todas' && cat !== '__revisar' ? cat : undefined;

  /* ---------- Tarjeta del catálogo ---------- */
  const tarjeta = (x: Item) => {
    const fotos = parseFotos(x.foto_url);
    const on = x.activo === 'true';
    const xe = conG(x, piezas);
    const pm = precioDe(xe, 'menudeo', cfg, piezas);
    const pw = precioDe(xe, 'mayorista', cfg, piezas);
    const tiene3d = !!parseDis(x.diseno);

    const precios = (
      <div className="hn-pre">
        {x.tipo !== 'mayorista' && x.tipo !== 'tejida' && <div><span>Menudeo</span><b>{copN(pm.valor)}</b></div>}
        {x.tipo === 'tejida' && <div><span>Precio</span><b>{copN(pm.valor)}</b></div>}
        {(x.tipo === 'mayorista' || x.tipo === 'ambos') && (
          <div>
            <span>Mayorista</span><b>{copN(pw.valor)}</b>
            {x.min_mayorista && <em>desde {x.min_mayorista} u.</em>}
          </div>
        )}
        {!movil && <div><span>Stock</span><b>{x.stock || 0}</b></div>}
      </div>
    );
    const detalle = (
      <>
        <p>{x.descripcion || 'Sin descripción.'}</p>
        {movil && (
          <div className="hn-ex">
            <span>Stock: <b>{x.stock || 0}</b></span>
            {tiene3d && <button type="button" className="hn-b v" onClick={() => setVer3d(x)}>Ver 3D</button>}
          </div>
        )}
      </>
    );

    return (
      <article key={x.id} className={`hn-card ${on ? '' : 'off'}`}>
        <div className="hn-fwrap">
          <FotoZoom fotos={fotos} alt={x.nombre} />
          {fotos.length > 1 && <span className="hn-cnt">{fotos.length} fotos</span>}
        </div>
        <div className="hn-info">
          <div className="hn-top">
            <small className="hn-sku">SKU: {x.codigo}</small>
            <span className="hn-pill">{tipoTxt(x.tipo)}</span>
          </div>
          <h3>{x.nombre}</h3>
          <div className="hn-pills">
            {!on && <span className="hn-pill rev">EN REVISIÓN</span>}
            {x.oro && <span className="hn-pill oro">Oro {x.oro}{gr(xe.gramos) ? ` · ${gr(xe.gramos)} g` : ''}</span>}
            {x.video_url && <a className="hn-pill vid" href={x.video_url} target="_blank" rel="noreferrer">▶ Video</a>}
          </div>

          {!movil && detalle}
          {precios}
          {movil && (
            <details className="hn-more">
              <summary>Más detalles</summary>
              {detalle}
            </details>
          )}

          <div className="hn-acc">
            <div className="hn-sw">
              <button type="button" role="switch" aria-checked={on} className="hn-tog" onClick={() => alternar(x)} aria-label={on ? 'Inhabilitar' : 'Publicar'} />
              <span>{on ? 'Publicado' : 'Inhabilitado'}</span>
            </div>
            {tiene3d && !movil && <button type="button" className="hn-b v" onClick={() => setVer3d(x)}>Ver 3D</button>}
            <button type="button" className="hn-b" onClick={() => abrirEditar(x)}>Editar</button>
            <button type="button" className="hn-b x" onClick={() => setBorrar(x)} aria-label={`Eliminar ${x.nombre}`}>✕</button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="d-cont simple">
      <style>{`
        /* ===== HERO: logo sobre fondo negro ===== */
        .hn-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 18px; padding: 18px 28px; border-radius: 24px; background: linear-gradient(115deg, #000 0%, #030a07 42%, #0b2d1f 100%); border: 1px solid rgba(216,185,95,.6); box-shadow: 0 10px 30px rgba(7,33,26,.25); }
        .hn-marca { display: flex; align-items: center; gap: 24px; min-width: 0; }
        .hn-logo { width: 132px; height: 132px; flex-shrink: 0; border-radius: 26px; overflow: hidden; background: #000; border: 3px solid #d8b95f; box-shadow: 0 0 0 6px rgba(216,185,95,.14), 0 0 40px rgba(240,193,75,.26), 0 12px 28px rgba(0,0,0,.6); display: grid; place-items: center; padding: 0; box-sizing: border-box; }
        .hn-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 22px; }
        .hn-marca h1 { margin: 0; font-size: 36px; line-height: 1.1; font-weight: 500; color: #f6e7b4; letter-spacing: .01em; }
        .hn-marca p { margin: 8px 0 0; font-size: 13.5px; color: rgba(243,234,210,.78); }
        .hn-hero .d-btn { background: #f0c14b; color: #1b1608; }
        .hn-tabs { display: flex; gap: 6px; margin-bottom: 16px; border-bottom: 1px solid #ece7d6; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .hn-tabs::-webkit-scrollbar { display: none; }
        .hn-tabs button { position: relative; flex-shrink: 0; white-space: nowrap; font: inherit; font-size: 14px; font-weight: 600; padding: 10px 20px; border: 0; background: transparent; cursor: pointer; color: #7a857e; border-bottom: 3px solid transparent; margin-bottom: -1px; }
        .hn-tabs .hn-badge { position: absolute; top: 4px; right: 4px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: #f0c14b; color: #1b1608; font-size: 11px; font-weight: 700; display: grid; place-items: center; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
        .hn-tabs .hn-badge.cero { background: #e6e1cf; color: #8a978f; box-shadow: none; }
        .hn-tabs button[aria-selected="true"] { color: #0b2d1f; border-bottom-color: #d8b95f; }

        .hn-aviso { background: #e6f4ea; color: #1e6b34; padding: 9px 13px; border-radius: 10px; font-size: 12.5px; margin-bottom: 12px; }
        .hn-errc { background: #fdecea; color: #a12622; padding: 9px 13px; border-radius: 10px; font-size: 12.5px; margin-bottom: 12px; }
        .hn-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin: 4px 0 16px; }
        .hn-stats > div { background: #fff; border: 1px solid #ece7d6; border-radius: 14px; padding: 10px 14px; }
        .hn-stats span { display: block; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #8a978f; font-weight: 600; }
        .hn-stats b { display: block; margin-top: 4px; font-size: 21px; font-weight: 500; color: #0b2d1f; }
        .hn-stats .rev b { color: #b7791f; }
        .hn-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
        .hn-bus { flex: 1 1 260px; max-width: 420px; padding: 8px 14px; border-radius: 99px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13px; }
        .hn-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
        .hn-chips button { font: inherit; font-size: 12px; padding: 6px 13px; border-radius: 99px; border: 1px solid rgba(176,141,60,.4); background: #fff; cursor: pointer; }
        .hn-chips button[aria-pressed="true"] { background: #0b2d1f; border-color: #0b2d1f; color: #f3ead2; }
        .hn-chips button.rev { border-color: #e0a526; color: #8a5a00; background: #fff8e6; }
        .hn-chips button.rev[aria-pressed="true"] { background: #e0a526; color: #1b1608; border-color: #e0a526; }

        /* ===== Catálogo por categorías ===== */
        .hn-sec-h { display: flex; align-items: baseline; gap: 12px; margin: 26px 0 14px; }
        .hn-sec-h h2 { margin: 0; font-size: 26px; font-weight: 500; color: #0b2d1f; }
        .hn-sec-h small { font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; color: #8a6d1f; font-weight: 600; white-space: nowrap; }
        .hn-sec-h i { flex: 1; height: 1px; background: #d8d3c4; }
        .hn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; align-items: stretch; }
        .hn-card { display: grid; grid-template-columns: minmax(150px, 38%) minmax(0, 1fr); border-radius: 20px; overflow: hidden; background: linear-gradient(135deg, #0a1511, #0e1f18); color: #f1ede0; border: 1px solid rgba(255,255,255,.08); box-shadow: 0 10px 26px rgba(7,33,26,.2); min-height: 250px; }
        .hn-card.off { border-color: rgba(240,193,75,.5); }
        .hn-fwrap { position: relative; min-height: 220px; background: #07241a; }
        .hn-zoom { position: absolute; inset: 0; overflow: hidden; cursor: zoom-in; background: #07241a; display: grid; place-items: center; }
        .hn-zoom img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .18s ease-out; will-change: transform; user-select: none; }
        .hn-nofoto { color: #b08d3c; font-size: 13px; }
        .hn-lupa { position: absolute; right: 8px; top: 8px; font-size: 10.5px; padding: 3px 9px; border-radius: 99px; background: rgba(6,16,11,.62); color: #f3ead2; opacity: 0; transition: opacity .2s; pointer-events: none; }
        .hn-zoom:hover .hn-lupa { opacity: 1; }
        .hn-thumbs { position: absolute; left: 50%; transform: translateX(-50%); bottom: 10px; display: flex; gap: 6px; z-index: 2; padding: 4px 8px; border-radius: 99px; background: rgba(6,16,11,.45); }
        .hn-arr { position: absolute; top: 50%; transform: translateY(-50%); z-index: 3; width: 32px; height: 32px; padding: 0 0 3px; border-radius: 50%; border: 1px solid rgba(255,255,255,.35); background: rgba(6,16,11,.6); color: #fff; font-size: 22px; line-height: 1; cursor: pointer; display: grid; place-items: center; opacity: .85; transition: background .15s, opacity .15s; }
        .hn-arr:hover { background: #f0c14b; color: #1b1608; opacity: 1; border-color: #f0c14b; }
        .hn-arr.prev { left: 8px; }
        .hn-arr.next { right: 8px; }
        .hn-pos { position: absolute; right: 8px; bottom: 10px; z-index: 2; font-size: 10.5px; padding: 3px 8px; border-radius: 99px; background: rgba(6,16,11,.6); color: #f3ead2; pointer-events: none; }
        .hn-thumbs button { width: 9px; height: 9px; padding: 0; border-radius: 50%; border: 1px solid rgba(255,255,255,.8); background: rgba(0,0,0,.35); cursor: pointer; }
        .hn-thumbs button[aria-pressed="true"] { background: #f0c14b; border-color: #f0c14b; }
        .hn-cnt { position: absolute; top: 8px; left: 8px; z-index: 2; font-size: 11px; padding: 3px 9px; border-radius: 99px; background: rgba(6,16,11,.65); color: #f3ead2; pointer-events: none; }
        .hn-info { padding: 16px 16px 14px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .hn-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .hn-sku { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; letter-spacing: .08em; color: #93a09a; }
        .hn-pill { font-size: 10.5px; padding: 3px 10px; border-radius: 99px; background: rgba(240,193,75,.14); color: #f0c14b; border: 1px solid rgba(240,193,75,.45); font-weight: 600; white-space: nowrap; text-decoration: none; }
        .hn-pill.rev { background: #e0a526; color: #1b1608; border-color: #e0a526; font-weight: 700; letter-spacing: .04em; }
        .hn-pill.oro { background: rgba(6,16,11,.6); }
        .hn-pill.vid { cursor: pointer; }
        .hn-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .hn-info h3 { margin: 0; font-size: 22px; font-weight: 500; color: #fff; line-height: 1.2; }
        .hn-info p { margin: 0; font-size: 12.5px; line-height: 1.5; color: #b4bdb7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .hn-pre { display: grid; grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); gap: 8px; margin-top: 2px; }
        .hn-pre > div { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); border-radius: 12px; padding: 8px 11px; }
        .hn-pre span { display: block; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #93a09a; font-weight: 600; }
        .hn-pre b { font-size: 17px; font-weight: 500; color: #f0c14b; }
        .hn-pre em { font-style: normal; font-size: 10.5px; color: #93a09a; display: block; }
        .hn-acc { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.08); flex-wrap: wrap; }
        .hn-sw { display: inline-flex; align-items: center; gap: 8px; margin-right: auto; font-size: 11.5px; color: #b4bdb7; }
        .hn-tog { position: relative; width: 34px; height: 20px; padding: 0; border-radius: 99px; cursor: pointer; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); }
        .hn-tog::after { content: ""; position: absolute; top: 2px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #cfd6d1; transition: .2s; }
        .hn-tog[aria-checked="true"] { background: #f0c14b; border-color: #f0c14b; }
        .hn-tog[aria-checked="true"]::after { left: 15px; background: #14201a; }
        .hn-b { height: 34px; padding: 0 14px; border-radius: 10px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; border: 0; background: #f0c14b; color: #1b1608; }
        .hn-b.v { background: transparent; color: #f0c14b; border: 1px solid rgba(240,193,75,.6); }
        .hn-b.x { width: 34px; padding: 0; background: rgba(255,255,255,.06); color: #c9d1cc; border: 1px solid rgba(255,255,255,.12); }
        .hn-b.x:hover { background: #b04a3f; color: #fff; }
        .hn-nueva { min-height: 250px; border-radius: 20px; border: 2px dashed #d8b95f; background: #fffdf8; color: #7a6a30; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; font: inherit; font-size: 13px; transition: background .2s, border-color .2s; }
        .hn-nueva span { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #b08d3c; display: grid; place-items: center; font-size: 22px; line-height: 1; }
        .hn-nueva:hover { background: #fff6dc; border-color: #b08d3c; }
        .hn-vacio { text-align: center; padding: 60px 20px; color: #7a857e; background: #faf8f2; border: 1px dashed #d8d3c4; border-radius: 20px; }

        /* ===== Carrusel de tarjetas (móvil) y "Más detalles" ===== */
        .hn-cbar { display: flex; align-items: center; justify-content: space-between; margin: 0 2px 8px; }
        .hn-cc { font-size: 12px; font-weight: 600; color: #7a6a30; letter-spacing: .06em; }
        .hn-cbtns { display: flex; gap: 8px; }
        .hn-cbtns button { width: 38px; height: 38px; padding: 0 0 3px; border-radius: 50%; display: grid; place-items: center; border: 1px solid #b08d3c; background: #fff; color: #0b2d1f; font-size: 24px; line-height: 1; cursor: pointer; }
        .hn-cbtns button:disabled { opacity: .3; cursor: default; }
        .hn-trk { display: flex; gap: 12px; align-items: flex-start; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 2px 12px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .hn-trk::-webkit-scrollbar { display: none; }
        .hn-trk > * { flex: 0 0 84%; min-width: 0; scroll-snap-align: start; }
        .hn-trk > .hn-nueva { align-self: stretch; min-height: 160px; }
        .hn-more > summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: 12px; font-weight: 600; color: #f0c14b; -webkit-tap-highlight-color: transparent; }
        .hn-more > summary::-webkit-details-marker { display: none; }
        .hn-more > summary::after { content: "⌄"; font-size: 20px; line-height: 1; transition: transform .2s; }
        .hn-more[open] > summary::after { transform: rotate(180deg); }
        .hn-more p { display: block; -webkit-line-clamp: unset; margin-top: 6px; }
        .hn-ex { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; font-size: 12.5px; color: #b4bdb7; }
        .hn-ex b { color: #f0c14b; font-weight: 600; }

        /* ===== Modales y formulario ===== */
        .hn-modal { position: fixed; inset: 0; background: rgba(10,20,15,.55); display: grid; place-items: center; z-index: 100; padding: 16px; }
        .hn-hoja { background: #fff; border-radius: 22px; width: 100%; max-width: 720px; max-height: 92vh; overflow-y: auto; padding: 26px; }
        .hn-hoja h2 { margin: 0 0 4px; font-size: 24px; font-weight: 500; }
        .hn-sub { font-size: 13px; color: #7a857e; margin: 0 0 18px; }
        .hn-catpill { display: inline-block; margin-left: 6px; padding: 2px 10px; border-radius: 99px; background: #0b2d1f; color: #f6e7b4; font-size: 12px; font-weight: 600; }
        .hn-f { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 14px; margin-bottom: 14px; }
        .hn-f label, .hn-lb { display: block; font-size: 12px; font-weight: 600; margin-bottom: 5px; color: #44514a; }
        .hn-f input, .hn-f select, .hn-f textarea, .hn-in { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); font: inherit; font-size: 14px; background: #fff; box-sizing: border-box; }
        .hn-f .full { grid-column: 1 / -1; }
        .hn-nc { display: flex; gap: 8px; }
        .hn-nc button { flex-shrink: 0; padding: 0 14px; border-radius: 10px; border: 1px solid #b08d3c; background: #fffdf8; color: #7a6a30; cursor: pointer; font: inherit; font-size: 12.5px; }
        .hn-sec { margin: 6px 0 14px; padding: 14px; border-radius: 14px; background: #faf8f2; border: 1px solid #ece7d6; }
        .hn-sec strong { display: block; font-size: 13px; margin-bottom: 4px; }
        .hn-sec > span { display: block; font-size: 12px; color: #7a857e; margin-bottom: 10px; }
        .hn-sec.oro { background: #fffaf0; border-color: #ecd9a3; }
        .hn-sec.dis { background: #f3faf5; border-color: #bfdcc9; }
        .hn-chk { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 6px; }
        .hn-chk input { width: 18px; height: 18px; accent-color: ${VERDE}; }
        .hn-calc { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: #0b2d1f; color: #f6e7b4; font-size: 13px; display: flex; gap: 18px; flex-wrap: wrap; }
        .hn-calc b { color: #f0c14b; font-weight: 600; }
        .hn-warn { margin-top: 10px; font-size: 12.5px; color: #8a5a00; background: #fff3d6; padding: 8px 12px; border-radius: 10px; }
        .hn-sws { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
        .hn-swc { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.25); cursor: pointer; padding: 0; }
        .hn-swc[aria-pressed="true"] { box-shadow: 0 0 0 2px ${VERDE}, 0 0 0 4px #f0c14b; }
        .hn-swc.none { background: #fff; font-size: 11px; color: #777; display: grid; place-items: center; }
        .hn-col { width: 34px; height: 30px; padding: 0; border: 1px solid rgba(128,128,128,.4); border-radius: 8px; background: #fff; cursor: pointer; }
        .hn-seg { display: inline-flex; border: 1px solid rgba(128,128,128,.4); border-radius: 10px; overflow: hidden; }
        .hn-seg button { font: inherit; font-size: 12.5px; padding: 8px 14px; border: 0; background: #fff; cursor: pointer; }
        .hn-seg button[aria-pressed="true"] { background: ${VERDE}; color: #f6e7b4; }
        .hn-rowb { display: grid; grid-template-columns: 1.2fr .75fr 1fr .6fr 1fr auto; gap: 8px; align-items: center; margin-bottom: 8px; }
        .hn-rowb .res { font-size: 12px; color: #44514a; }
        .hn-mini { height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid #b08d3c; background: #fffdf8; color: #7a6a30; cursor: pointer; font: inherit; font-size: 12.5px; }
        .hn-mini.d { width: 36px; padding: 0; border-color: rgba(176,74,63,.5); color: #b04a3f; }
        .hn-az { display: grid; grid-template-columns: repeat(9, 1fr); gap: 5px; margin-bottom: 10px; }
        .hn-az button { font: inherit; font-size: 13px; font-weight: 600; padding: 6px 0; border-radius: 8px; border: 1px solid rgba(128,128,128,.35); background: #fff; cursor: pointer; }
        .hn-az button[aria-pressed="true"] { background: ${VERDE}; color: #f6e7b4; border-color: ${VERDE}; }
        .hn-resumen { margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: #fff; border: 1px solid #bfdcc9; font-size: 13px; display: grid; gap: 4px; }
        .hn-resumen div { display: flex; justify-content: space-between; }
        .hn-resumen .t { border-top: 1px solid #e3eee7; padding-top: 6px; margin-top: 2px; font-weight: 700; color: ${VERDE}; }
        .hn-ths { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; }
        .hn-th { position: relative; aspect-ratio: 4 / 5; border-radius: 12px; overflow: hidden; background: #0e3b27; border: 1px solid rgba(128,128,128,.35); }
        .hn-th img { width: 100%; height: 100%; object-fit: cover; }
        .hn-th button { position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; border-radius: 50%; border: 0; background: rgba(6,24,17,.75); color: #fff; cursor: pointer; padding: 0; line-height: 1; }
        .hn-th.add { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 12px; background: #fff; border: 1px dashed #c9bd94; color: #7a6a30; cursor: pointer; padding: 6px; }
        .hn-vid { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .hn-vid video { width: 100%; max-height: 220px; border-radius: 12px; background: #000; }
        .hn-vid .add { padding: 10px 16px; border-radius: 10px; border: 1px dashed #c9bd94; background: #fff; color: #7a6a30; cursor: pointer; font-size: 13px; }
        .hn-vid .rm { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(176,74,63,.5); background: #fff; color: #b04a3f; cursor: pointer; font: inherit; font-size: 12.5px; }
        .hn-url { font-size: 11.5px; color: #5a6b62; word-break: break-all; }
        .hn-err { color: #a12622; font-size: 13px; margin: 8px 0 0; }
        .hn-btns { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
        .hn-b2 { font: inherit; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); background: transparent; cursor: pointer; color: inherit; }
        .hn-dlg { width: 100%; max-width: 360px; text-align: center; padding: 28px 24px 22px; border-radius: 22px; color: #f3ead2; background: linear-gradient(180deg, #0d3324, #07211a); border: 1px solid rgba(216,185,95,.4); }
        .hn-dlg h3 { margin: 0 0 8px; font-weight: 500; font-size: 21px; }
        .hn-dlg p { margin: 0 0 20px; font-size: 13.5px; color: rgba(243,234,210,.8); }
        .hn-dlg .b { display: flex; gap: 10px; }
        .hn-dlg .b button { flex: 1; font: inherit; font-size: 13px; padding: 11px; border-radius: 99px; cursor: pointer; }
        .hn-no { border: 1px solid rgba(216,185,95,.5); background: transparent; color: #ecd07a; }
        .hn-si { border: 0; font-weight: 600; color: #fff; background: linear-gradient(135deg, #c65a4d, #a23c32); }
        .hn-v3 { width: 100%; max-width: 640px; background: #fff; border-radius: 24px; padding: 16px; max-height: 94vh; overflow-y: auto; }
        .hn-v3 h3 { margin: 4px 4px 10px; font-size: 20px; font-weight: 500; }
        .hn-v3 ul { margin: 12px 4px 4px; padding: 0 0 0 18px; font-size: 13px; line-height: 1.7; color: #33433a; }

        /* ===== Diseñador: bloques colapsables ===== */
        .hn-ds { margin-top: 12px; border: 1px solid #cfe3d6; border-radius: 12px; background: #fff; padding: 0 14px; }
        .hn-ds[open] { padding-bottom: 14px; }
        .hn-ds > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 10px; -webkit-tap-highlight-color: transparent; padding: 13px 0; font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #2f5d46; }
        .hn-ds > summary::-webkit-details-marker { display: none; }
        .hn-ds > summary::after { content: "⌄"; font-size: 24px; line-height: 1; color: #b08d3c; transition: transform .2s; }
        .hn-ds[open] > summary::after { transform: rotate(180deg); }
        .hn-ds > summary span { flex: 1; }
        .hn-ds > summary small { font-weight: 500; letter-spacing: 0; text-transform: none; color: #7a857e; font-size: 12px; }
        .hn-ds[open] > summary { border-bottom: 1px solid #e3eee7; margin-bottom: 12px; }
        .hn-p3 { position: sticky; top: -1px; z-index: 4; padding: 6px 0; background: #f3faf5; }

        @media (max-width: 760px) {
          .hn-grid { grid-template-columns: 1fr; }
          .hn-card { grid-template-columns: 1fr; min-height: 0; border-radius: 18px; }
          .hn-fwrap { min-height: 170px; height: 170px; }
          .hn-zoom { touch-action: pan-y; }
          .hn-lupa { display: none; }
          .hn-info { padding: 12px; gap: 7px; }
          .hn-info h3 { font-size: 19px; }
          .hn-pre { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
          .hn-pre > div { padding: 6px 9px; }
          .hn-pre b { font-size: 15px; }
          .hn-acc { padding-top: 8px; gap: 6px; }
        }
        @media (max-width: 640px) {
          .hn-f { grid-template-columns: 1fr; }
          .hn-tabs button { padding: 10px 14px; font-size: 13px; }
          .hn-hero { padding: 16px 14px; flex-direction: column; align-items: stretch; gap: 14px; text-align: left; }
          .hn-marca { flex-direction: row; align-items: center; gap: 14px; }
          .hn-logo { width: 92px; height: 92px; border-radius: 22px; border-width: 2px; }
          .hn-marca h1 { font-size: 26px; }
          .hn-marca p { font-size: 12.5px; margin-top: 6px; }
          .hn-hero .d-btn { width: 100%; }
          .hn-sec-h h2 { font-size: 22px; }
          .hn-modal { padding: 0; align-items: end; }
          .hn-hoja, .hn-v3 { max-width: 100%; max-height: 94vh; border-radius: 22px 22px 0 0; padding: 18px 14px; }
          .hn-rowb { grid-template-columns: 1fr 1fr 1fr 64px 36px; }
          .hn-rowb .res { order: 5; grid-column: 1 / -1; text-align: center; background: #f3faf5; padding: 5px; border-radius: 8px; }
        }
      `}</style>

      <div className="hn-hero">
        <div className="hn-marca">
          <span className="hn-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_HANS} alt="Joyería Hans" />
          </span>
          <div>
            <h1>Joyería Hans</h1>
            <p>Venta al por mayor y menudeo · pulseras tejidas.<br />{nActivos} publicado{nActivos === 1 ? '' : 's'} de {lista.length}.</p>
          </div>
        </div>
        {tab === 'catalogo' && <button type="button" className="d-btn" onClick={() => abrir(catActual)}>NUEVO ARTÍCULO{catActual ? ` EN ${catActual.toUpperCase()}` : ''}</button>}
      </div>

      <div className="hn-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'catalogo'} onClick={() => setTab('catalogo')}>Catálogo</button>
        <button type="button" role="tab" aria-selected={tab === 'config'} onClick={() => setTab('config')}>⚙ Configuración</button>
        <button type="button" role="tab" aria-selected={tab === 'pedidos'} onClick={() => setTab('pedidos')} style={{ paddingRight: 30 }}>
          Pedidos
          <span className={`hn-badge ${nNuevos ? '' : 'cero'}`} aria-label={`${nNuevos} pedidos nuevos`}>{nNuevos}</span>
        </button>
      </div>

      {aviso && <div className="hn-aviso" role="status">{aviso}</div>}
      {errCarga && <div className="hn-errc" role="alert">{errCarga}</div>}

      {tab === 'config' && (
        <HansConfig
          cfg={cfg}
          cfgForm={cfgForm}
          setCfgForm={setCfgForm}
          nOro={nOro}
          pf={pf}
          setPf={setPf}
          calc18desde24={calc18desde24}
          guardarConfig={guardarConfig}
          guardando={guardandoCfg}
          draw={{ metales: METAL, dije: drawDije, inicial: drawInicial }}
        />
      )}

      {tab === 'pedidos' && (
        <HansPedidos
          pedidos={pedidos}
          setPedidos={setPedidos}
          catalogo={catalogo}
          avisar={avisar}
          cargando={cargandoPed}
          recargar={cargarPedidos}
          ultima={ultPed}
        />
      )}

      {tab === 'catalogo' && (
        <>
          <div className="hn-stats">
            <div><span>Artículos</span><b>{lista.length}</b></div>
            <div><span>Publicados</span><b>{nActivos}</b></div>
            <div className="rev"><span>Por revisar</span><b>{nRevisar}</b></div>
            <div><span>Categorías</span><b>{presentes.length}</b></div>
            <div><span>Con video</span><b>{lista.filter((x) => x.video_url).length}</b></div>
          </div>

          <div className="hn-bar">
            <input className="hn-bus" placeholder="Buscar por nombre, código o categoría…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="hn-chips" role="group" aria-label="Categorías">
            <button type="button" aria-pressed={cat === 'todas'} onClick={() => setCat('todas')}>Todas</button>
            <button type="button" className="rev" aria-pressed={cat === '__revisar'} onClick={() => setCat('__revisar')}>Por revisar ({nRevisar})</button>
            {presentes.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>

          {cargando ? (
            <div className="hn-vacio">Cargando…</div>
          ) : grupos.length === 0 ? (
            <div className="hn-vacio">{lista.length === 0 ? 'Aún no hay artículos. Pulsa NUEVO ARTÍCULO para empezar.' : 'No hay artículos con ese filtro.'}</div>
          ) : (
            grupos.map((g) => (
              <section key={g.c || '__sin'} className="hn-grp">
                <div className="hn-sec-h">
                  <h2>{g.c || 'Sin categoría'}</h2>
                  <small>{g.items.length} pieza{g.items.length === 1 ? '' : 's'}</small>
                  <i />
                </div>
                {movil ? (
                  <Desliza total={g.items.length + (g.c ? 1 : 0)}>
                    {g.items.map(tarjeta)}
                    {g.c && (
                      <button key="nueva" type="button" className="hn-nueva" onClick={() => abrir(g.c)}>
                        <span>+</span>
                        Nueva en {g.c}
                      </button>
                    )}
                  </Desliza>
                ) : (
                  <div className="hn-grid">
                    {g.items.map(tarjeta)}
                    {g.c && (
                      <button type="button" className="hn-nueva" onClick={() => abrir(g.c)}>
                        <span>+</span>
                        Nueva en {g.c}
                      </button>
                    )}
                  </div>
                )}
              </section>
            ))
          )}
        </>
      )}

      {ver3d && (() => {
        const d = parseDis(ver3d.diseno);
        if (!d) return null;
        const t = totalGramos(d, piezas, ver3d.oro);
        return (
          <div className="hn-modal" onMouseDown={(e) => e.target === e.currentTarget && setVer3d(null)}>
            <div className="hn-v3" role="dialog" aria-modal="true" aria-label={`Vista 3D de ${ver3d.nombre}`}>
              <h3>{ver3d.nombre}</h3>
              <Pulsera3D dis={d} h={400} />
              <ul>
                <li>Largo {d.longitud} cm · ancho {d.ancho} mm · acabado {d.metal}</li>
                {d.balines.filter((b) => b.cant > 0).map((b, i) => <li key={i}>{b.cant} balín{b.cant === 1 ? '' : 'es'} {nombreTipo(b.tipo).toLowerCase()} de {b.mm} mm{b.metal ? ` · ${b.metal}` : ''}</li>)}
                {d.inicial && <li>Inicial «{d.inicial.txt}» · {d.inicial.estilo} · {INI_TXT[d.inicial.tam]}</li>}
                {d.dije && <li>Dije: {nombreDije(d.dije.id)}</li>}
                <li><b>Peso total en oro: {t.total} g</b></li>
              </ul>
              <div className="hn-btns"><button type="button" className="hn-b2" onClick={() => setVer3d(null)}>Cerrar</button></div>
            </div>
          </div>
        );
      })()}

      {borrar && (
        <div className="hn-modal" onMouseDown={(e) => e.target === e.currentTarget && setBorrar(null)}>
          <div className="hn-dlg" role="alertdialog" aria-modal="true">
            <h3>¿Eliminar este artículo?</h3>
            <p><b>{borrar.nombre}</b><br />Esta acción no se puede deshacer.</p>
            <div className="b">
              <button type="button" className="hn-no" autoFocus onClick={() => setBorrar(null)}>Cancelar</button>
              <button type="button" className="hn-si" onClick={() => eliminar(borrar)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {abierto && (
        <div className="hn-modal" onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="hn-hoja" role="dialog" aria-modal="true" aria-label={editId ? 'Editar artículo' : 'Nuevo artículo'}>
            <h2>{editId ? 'Editar artículo' : 'Nuevo artículo'}</h2>
            <p className="hn-sub">
              {editId
                ? 'Modifica los datos y guarda.'
                : 'Se crea inhabilitado (en revisión). Cuando lo revises y se vea bien, lo publicas con el interruptor de la tarjeta.'}
              {form.categoria && <> Categoría:<span className="hn-catpill">{form.categoria}</span></>}
            </p>

            <div className="hn-f">
              <div className="full"><label htmlFor="hn-n">Nombre</label><input id="hn-n" value={form.nombre} onChange={set('nombre')} placeholder="Ej.: Pulsera tejida hilo encerado" /></div>
              <div>
                <label htmlFor="hn-c">Categoría</label>
                <select id="hn-c" value={form.categoria} onChange={set('categoria')}>
                  {!presentes.includes(form.categoria) && <option value={form.categoria}>{form.categoria || 'Selecciona…'}</option>}
                  {presentes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="hn-nc">Crear categoría nueva</label>
                <div className="hn-nc">
                  <input id="hn-nc" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); crearCategoria(); } }} placeholder="Ej.: Tobilleras" />
                  <button type="button" onClick={crearCategoria}>Crear</button>
                </div>
              </div>
              <div>
                <label htmlFor="hn-t">Tipo de venta</label>
                <select id="hn-t" value={form.tipo} onChange={(e) => {
                  const v = e.target.value as Tipo;
                  setForm((f) => ({ ...f, tipo: v, diseno: v === 'tejida' && !f.diseno ? JSON.stringify(defDis()) : f.diseno }));
                }}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}</select>
              </div>
              <div><label htmlFor="hn-m">Material</label><input id="hn-m" value={form.material} onChange={set('material')} placeholder="Ej.: Acero, hilo encerado, plata" /></div>
            </div>

            <div className="hn-sec dis">
              <label className="hn-chk">
                <input type="checkbox" checked={disOn} onChange={(e) => toggleDis(e.target.checked)} />
                Diseñador de pulsera (balines, inicial, dije y vista 3D)
              </label>
              {!disOn && <span>Actívalo para armar la pulsera pieza por pieza: el peso en oro se calcula solo y ves cómo queda en 3D.</span>}

              {dis && (
                <>
                  <div className="hn-p3"><Pulsera3D dis={dis} h={280} /></div>

                  <details className="hn-ds" open>
                    <summary><span>Hilo y medidas</span><small>{dis.longitud} cm · {dis.ancho} mm</small></summary>
                    <label className="hn-lb">Color del hilo</label>
                    <div className="hn-sws">
                      {HILOS.map((h) => (
                        <button key={h.c} type="button" className="hn-swc" title={h.n} aria-label={h.n} aria-pressed={dis.hilo1 === h.c} style={{ background: h.c }} onClick={() => upDis((d) => ({ ...d, hilo1: h.c }))} />
                      ))}
                      <input type="color" className="hn-col" aria-label="Color personalizado" value={/^#[0-9a-f]{6}$/i.test(dis.hilo1) ? dis.hilo1 : '#1a1a1a'} onChange={(e) => upDis((d) => ({ ...d, hilo1: e.target.value }))} />
                    </div>
                    <label className="hn-lb" style={{ marginTop: 10 }}>Segundo color (trenzado, opcional)</label>
                    <div className="hn-sws">
                      <button type="button" className="hn-swc none" aria-pressed={!dis.hilo2} onClick={() => upDis((d) => ({ ...d, hilo2: '' }))}>—</button>
                      {HILOS.map((h) => (
                        <button key={h.c} type="button" className="hn-swc" title={h.n} aria-label={`${h.n} (segundo color)`} aria-pressed={dis.hilo2 === h.c} style={{ background: h.c }} onClick={() => upDis((d) => ({ ...d, hilo2: h.c }))} />
                      ))}
                      <input type="color" className="hn-col" aria-label="Segundo color personalizado" value={/^#[0-9a-f]{6}$/i.test(dis.hilo2) ? dis.hilo2 : '#ffffff'} onChange={(e) => upDis((d) => ({ ...d, hilo2: e.target.value }))} />
                    </div>
                    <div className="hn-f" style={{ marginTop: 12, marginBottom: 0 }}>
                      <div>
                        <label htmlFor="d-l">Largo de la pulsera (cm)</label>
                        <select id="d-l" value={dis.longitud} onChange={(e) => upDis((d) => ({ ...d, longitud: Number(e.target.value) }))}>
                          {[14, 15, 16, 17, 18, 19, 20, 21, 22].map((n) => <option key={n} value={n}>{n} cm</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="d-a">Ancho del tejido (mm)</label>
                        <select id="d-a" value={dis.ancho} onChange={(e) => upDis((d) => ({ ...d, ancho: Number(e.target.value) }))}>
                          {[3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} mm</option>)}
                        </select>
                      </div>
                    </div>
                    <label className="hn-lb" style={{ marginTop: 12 }}>Acabado del metal (general: balines sin color propio, inicial y dije)</label>
                    <div className="hn-seg" role="group" aria-label="Acabado del metal">
                      {METALES.map((m) => (
                        <button key={m} type="button" aria-pressed={dis.metal === m} onClick={() => upDis((d) => ({ ...d, metal: m }))}>{m[0].toUpperCase() + m.slice(1)}</button>
                      ))}
                    </div>
                  </details>

                  <details className="hn-ds" open>
                    <summary><span>Balines</span><small>{dis.balines.reduce((s, b) => s + b.cant, 0)} u.</small></summary>
                    {dis.balines.map((b, i) => (
                      <div className="hn-rowb" key={i}>
                        <select className="hn-in" aria-label="Tipo de balín" value={b.tipo} onChange={(e) => upDis((d) => ({ ...d, balines: d.balines.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)) }))}>
                          {!piezas.tipos.some((t) => t.id === b.tipo) && <option value={b.tipo}>{b.tipo}</option>}
                          {piezas.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                        <select className="hn-in" aria-label="Tamaño" value={b.mm} onChange={(e) => upDis((d) => ({ ...d, balines: d.balines.map((x, j) => (j === i ? { ...x, mm: Number(e.target.value) } : x)) }))}>
                          {!sizes.includes(b.mm) && <option value={b.mm}>{b.mm} mm</option>}
                          {sizes.map((s) => <option key={s} value={s}>{s} mm</option>)}
                        </select>
                        <select className="hn-in" aria-label="Color del balín" value={b.metal || ''} onChange={(e) => upDis((d) => ({ ...d, balines: d.balines.map((x, j) => (j === i ? { ...x, metal: esMetal(e.target.value) ? e.target.value : undefined } : x)) }))}>
                          <option value="">General ({dis.metal})</option>
                          {METALES.map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
                        </select>
                        <input className="hn-in" type="number" min={0} max={60} aria-label="Cantidad" value={b.cant} onChange={(e) => upDis((d) => ({ ...d, balines: d.balines.map((x, j) => (j === i ? { ...x, cant: Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0)) } : x)) }))} />
                        <span className="res">{r2(pesoBalin(b, piezas, form.oro))} g c/u · {r2(pesoBalin(b, piezas, form.oro) * b.cant)} g</span>
                        <button type="button" className="hn-mini d" aria-label="Quitar balín" onClick={() => upDis((d) => ({ ...d, balines: d.balines.filter((_, j) => j !== i) }))}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="hn-mini" onClick={() => upDis((d) => ({ ...d, balines: [...d.balines, { tipo: piezas.tipos[0]?.id || 'liso', mm: sizes[Math.min(2, sizes.length - 1)] || 4, cant: 2 }] }))}>+ Agregar balín</button>
                    {exceso && <div className="hn-warn">Los balines y la inicial miden unos {largoBalines(dis).toFixed(1)} cm y la pulsera {dis.longitud} cm: no caben bien. Reduce cantidades o alarga la pulsera.</div>}
                  </details>

                  <details className="hn-ds">
                    <summary><span>Inicial</span><small>{dis.inicial ? `«${dis.inicial.txt}»` : 'Sin inicial'}</small></summary>
                    <label className="hn-chk">
                      <input type="checkbox" checked={!!dis.inicial} onChange={(e) => upDis((d) => ({ ...d, inicial: e.target.checked ? { txt: 'A', estilo: 'placa', tam: 'mediana' } : null }))} />
                      Incluir inicial al centro
                    </label>
                    {dis.inicial && (
                      <>
                        <div className="hn-az" role="group" aria-label="Elegir letra">
                          {LETRAS.map((l) => (
                            <button key={l} type="button" aria-pressed={dis.inicial?.txt === l} onClick={() => upDis((d) => ({ ...d, inicial: d.inicial ? { ...d.inicial, txt: l } : d.inicial }))}>{l}</button>
                          ))}
                        </div>
                        <div className="hn-f" style={{ marginBottom: 0 }}>
                          <div>
                            <label htmlFor="d-it">Texto (1 o 2 letras)</label>
                            <input id="d-it" maxLength={2} value={dis.inicial.txt} onChange={(e) => upDis((d) => ({ ...d, inicial: d.inicial ? { ...d.inicial, txt: e.target.value.toUpperCase().slice(0, 2) || 'A' } : d.inicial }))} />
                          </div>
                          <div>
                            <label htmlFor="d-ie">Estilo</label>
                            <select id="d-ie" value={dis.inicial.estilo} onChange={(e) => upDis((d) => ({ ...d, inicial: d.inicial ? { ...d.inicial, estilo: e.target.value as 'placa' | 'cuadrada' | 'letra' } : d.inicial }))}>
                              <option value="placa">Placa redonda</option>
                              <option value="cuadrada">Placa cuadrada</option>
                              <option value="letra">Letra suelta</option>
                            </select>
                          </div>
                          <div className="full">
                            <label htmlFor="d-iz">Tamaño</label>
                            <select id="d-iz" value={dis.inicial.tam} onChange={(e) => upDis((d) => ({ ...d, inicial: d.inicial ? { ...d.inicial, tam: e.target.value as 'pequena' | 'mediana' | 'grande' } : d.inicial }))}>
                              {(['pequena', 'mediana', 'grande'] as const).map((k) => <option key={k} value={k}>{INI_TXT[k]} · {piezas.inicial[k]} g</option>)}
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </details>

                  <details className="hn-ds">
                    <summary><span>Dije</span><small>{dis.dije ? nombreDije(dis.dije.id) : 'Sin dije'}</small></summary>
                    <select className="hn-in" aria-label="Dije" value={dis.dije?.id || ''} onChange={(e) => upDis((d) => ({ ...d, dije: e.target.value ? { id: e.target.value } : null }))}>
                      <option value="">Sin dije</option>
                      {piezas.dijes.map((x) => <option key={x.id} value={x.id}>{x.nombre} · {x.gramos} g</option>)}
                    </select>
                  </details>

                  {pesoDis && (
                    <div className="hn-resumen">
                      <div><span>Balines ({dis.balines.reduce((s, b) => s + b.cant, 0)} u.)</span><span>{pesoDis.balines} g</span></div>
                      <div><span>Inicial</span><span>{pesoDis.inicial} g</span></div>
                      <div><span>Dije</span><span>{pesoDis.dije} g</span></div>
                      <div className="t"><span>Peso total{form.oro ? ` en oro ${form.oro}` : ' (elige quilataje abajo)'}</span><span>{pesoDis.total} g</span></div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="hn-sec oro">
              <strong>Oro (precio automático)</strong>
              <span>Si la prenda es de oro, el precio se calcula con el precio del gramo y los valores por balín de la pestaña Configuración.</span>
              <div className="hn-f" style={{ marginBottom: 0 }}>
                <div>
                  <label htmlFor="hn-o">Quilataje</label>
                  <select id="hn-o" value={form.oro} onChange={set('oro')}>
                    <option value="">Sin oro (precio manual)</option>
                    <option value="18k">Oro 18 k</option>
                    <option value="24k">Oro 24 k</option>
                  </select>
                </div>
                {form.oro && !disOn && <div><label htmlFor="hn-g">Gramos de oro</label><input id="hn-g" inputMode="decimal" value={form.gramos} onChange={set('gramos')} placeholder="Ej.: 3.5" /></div>}
                {form.oro && disOn && <div><label>Gramos de oro (del diseño)</label><input readOnly value={`${formEf.gramos} g`} /></div>}
                {form.oro && verMenudeo && <div><label htmlFor="hn-mo">Mano de obra menudeo ($)</label><input id="hn-mo" inputMode="numeric" value={form.mano_obra} onChange={set('mano_obra')} placeholder="Ej.: 40000" /></div>}
                {form.oro && verMayor && <div><label htmlFor="hn-mw">Mano de obra mayorista ($)</label><input id="hn-mw" inputMode="numeric" value={form.mano_obra_mayor} onChange={set('mano_obra_mayor')} placeholder="Ej.: 25000" /></div>}
              </div>
              {sinPrecioOro && <div className="hn-warn">Aún no hay precio de oro {form.oro} configurado. Ve a ⚙ Configuración.</div>}
              {form.oro && !sinPrecioOro && prevM.auto && (
                <div className="hn-calc">
                  {verMenudeo && <div>Menudeo: <b>{copN(prevM.valor)}</b></div>}
                  {verMayor && <div>Mayorista: <b>{copN(prevW.valor)}</b></div>}
                </div>
              )}
            </div>

            <div className="hn-f">
              {!form.oro && verMenudeo && <div><label htmlFor="hn-pm">{form.tipo === 'tejida' ? 'Precio' : 'Precio menudeo'}</label><input id="hn-pm" inputMode="numeric" value={form.precio_menudeo} onChange={set('precio_menudeo')} placeholder="Ej.: 25000" /></div>}
              {!form.oro && verMayor && <div><label htmlFor="hn-pw">Precio mayorista (c/u)</label><input id="hn-pw" inputMode="numeric" value={form.precio_mayorista} onChange={set('precio_mayorista')} placeholder="Ej.: 15000" /></div>}
              {verMayor && <div><label htmlFor="hn-mm">Compra mínima mayorista (unidades)</label><input id="hn-mm" inputMode="numeric" value={form.min_mayorista} onChange={set('min_mayorista')} placeholder="Ej.: 12" /></div>}
              <div><label htmlFor="hn-s">Stock</label><input id="hn-s" inputMode="numeric" value={form.stock} onChange={set('stock')} /></div>
              <div className="full"><label htmlFor="hn-d">Descripción</label><textarea id="hn-d" rows={3} value={form.descripcion} onChange={set('descripcion')} placeholder="Colores, medidas, detalles…" /></div>
            </div>

            <div className="hn-sec">
              <strong>Fotos</strong>
              <span>{fotosForm.length}/{MAX_FOTOS} · PNG, JPG o WEBP · máx. 4 MB c/u · la primera es la portada</span>
              <div className="hn-ths">
                {fotosForm.map((u, k) => (
                  <div key={u + k} className="hn-th">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Foto ${k + 1}`} />
                    <button type="button" aria-label={`Quitar foto ${k + 1}`} onClick={() => setForm((f) => ({ ...f, foto_url: fotosForm.filter((_, j) => j !== k).join(SEP) }))}>×</button>
                  </div>
                ))}
                {fotosForm.length < MAX_FOTOS && (
                  <label className="hn-th add">
                    {subFoto ? 'Subiendo…' : '+ Agregar fotos'}
                    <input type="file" multiple accept="image/png,image/jpeg,image/webp" hidden onChange={subirFotos} disabled={subFoto} />
                  </label>
                )}
              </div>
            </div>

            <div className="hn-sec">
              <strong>Video (opcional)</strong>
              <span>MP4, WEBM o MOV · máx. {MAX_VIDEO_MB} MB. Se guarda en la carpeta y se devuelve una URL corta para verlo.</span>
              <div className="hn-vid">
                {form.video_url && (
                  <>
                    <video src={form.video_url} controls preload="metadata" playsInline />
                    <div className="hn-url">{form.video_url}</div>
                    <button type="button" className="rm" onClick={() => setForm((f) => ({ ...f, video_url: '' }))}>Quitar video</button>
                  </>
                )}
                {!form.video_url && (
                  <label className="add">
                    {subVideo ? 'Subiendo video…' : '+ Subir video'}
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={subirVideo} disabled={subVideo} />
                  </label>
                )}
              </div>
            </div>

            {error && <p className="hn-err" role="alert">{error}</p>}

            <div className="hn-btns">
              <button type="button" className="hn-b2" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="button" className="d-btn" onClick={guardar} disabled={guardando || subFoto || subVideo} style={{ background: VERDE }}>
                {guardando ? 'GUARDANDO…' : editId ? 'GUARDAR CAMBIOS' : 'CREAR ARTÍCULO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}