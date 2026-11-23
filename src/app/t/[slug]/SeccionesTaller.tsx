// 📁 RUTA: src/app/t/[slug]/SeccionesTaller.tsx
'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════
   ⚙️  PRECIOS EDITABLES (COP) — cámbialos a tus valores reales
   ═══════════════════════════════════════════════════════════ */
const MANO_OBRA_BASE = 25000;   // armado fijo
const MANO_OBRA_BALIN = 400;    // armado por cada balín
const HILO_BASE = 12000;        // macramé base
const TERMINALES = 8000;        // 2 balines de punta en las colas
const FACTOR_DIAMANTADO = 1.15; // el balín diamantado cuesta 15% más que el liso

type Metal = { id: string; nombre: string; c1: string; c2: string; c3: string; mult: number };
const METALES: Metal[] = [
  { id: 'amarillo', nombre: 'Oro amarillo', c1: '#fbe8a0', c2: '#e0b73f', c3: '#7a5412', mult: 1 },
  { id: 'blanco', nombre: 'Oro blanco', c1: '#fbfcfd', c2: '#c4cbd2', c3: '#596069', mult: 1.1 },
  { id: 'rosado', nombre: 'Oro rosado', c1: '#fbdccd', c2: '#dc9680', c3: '#7c4234', mult: 1.05 },
];

/** mm de diámetro → precio por balín (oro amarillo, liso) */
const TAMANOS = [
  { mm: 3, precio: 4800 },
  { mm: 4, precio: 8500 },
  { mm: 5, precio: 13500 },
  { mm: 6, precio: 19000 },
];

type Hilo = { id: string; nombre: string; color: string; extra: number };
const HILOS: Hilo[] = [
  { id: 'champagne', nombre: 'Champagne', color: '#d8b878', extra: 0 },
  { id: 'negro', nombre: 'Negro', color: '#25272a', extra: 0 },
  { id: 'cafe', nombre: 'Café', color: '#8a5a34', extra: 0 },
  { id: 'rojo', nombre: 'Rojo', color: '#c62f2f', extra: 0 },
  { id: 'azul', nombre: 'Azul noche', color: '#2a3f8f', extra: 0 },
  { id: 'verde', nombre: 'Verde esmeralda', color: '#1f8a58', extra: 0 },
  { id: 'crema', nombre: 'Crema', color: '#efe6d0', extra: 0 },
  { id: 'rosado', nombre: 'Rosado', color: '#e49aae', extra: 0 },
];

const DIJES = [
  { id: 'ninguno', nombre: 'Sin dije', precio: 0 },
  { id: 'liso', nombre: 'Medallón liso', precio: 38000 },
  { id: 'estrella', nombre: 'Estrella', precio: 45000 },
  { id: 'corazon', nombre: 'Corazón', precio: 45000 },
  { id: 'cruz', nombre: 'Cruz', precio: 48000 },
  { id: 'ojo', nombre: 'Ojo turco', precio: 52000 },
  { id: 'trebol', nombre: 'Trébol', precio: 52000 },
  { id: 'luna', nombre: 'Luna', precio: 46000 },
  { id: 'inicial', nombre: 'Inicial', precio: 55000 },
];

const MUNECAS = [15, 16, 17, 18, 19, 20, 21]; // cm de muñeca
const COLAS = [6, 9, 12];                     // cm de colas
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const TAU = Math.PI * 2;
const RD = 7;          // radio del dije (mm)
const ANCHO = 7;       // ancho del macramé (mm)
const PASO = 2.6;      // largo de cada nudo (mm)
const KH = 9;          // mitad del largo del nudo corredizo (mm)
const PIEL = '#d9a67e';

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

const soloCelular = (t: string) => {
  let d = t.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return d;
};

/** Nombre de la tienda para los mensajes de WhatsApp */
export const TIENDA = "Karen Sploker's";

/** Abre WhatsApp con el mensaje ya escrito. `wa` viene del teléfono de Configuración (wa.me/57…). */
const abrirWA = (wa: string, msg: string) => {
  const sep = wa.includes('?') ? '&' : '?';
  window.open(`${wa}${sep}text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
};
/** Quita las líneas `false` y evita dobles saltos de línea */
const armarMensaje = (lineas: (string | false)[]) =>
  lineas.filter((l): l is string => l !== false).join('\n').replace(/\n{3,}/g, '\n\n');

/* ═══════════════════════════════════════════════════════════
   Utilidades de color y geometría
   ═══════════════════════════════════════════════════════════ */
const tono = (h: string, f: number) => {
  const n = parseInt(h.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

type Ancla = { s: number; t: 'b' | 'd' };

/** Geometría de la manilla. s = distancia en mm sobre el aro, medida desde el centro del dije. */
function geom(tam: number, n: number, muneca: number, tieneDije: boolean) {
  const Rw = (muneca * 10) / TAU;                 // radio de la muñeca
  const R = Rw + Math.max(1.4, tam / 2);          // radio del cordón
  const Lc = TAU * R;                             // largo del aro cerrado
  const dh = tieneDije ? RD + 0.4 : 0;
  const anclas: Ancla[] = [];
  let eL = 0, eR = 0;
  if (tieneDije) {
    const nL = Math.floor(n / 2), nR = n - nL;
    anclas.push({ s: 0, t: 'd' });
    for (let i = 0; i < nL; i++) anclas.push({ s: -(dh + (i + 0.5) * tam), t: 'b' });
    for (let i = 0; i < nR; i++) anclas.push({ s: dh + (i + 0.5) * tam, t: 'b' });
    eL = -(dh + nL * tam); eR = dh + nR * tam;
  } else {
    for (let i = 0; i < n; i++) anclas.push({ s: -(n * tam) / 2 + (i + 0.5) * tam, t: 'b' });
    eL = -(n * tam) / 2; eR = (n * tam) / 2;
  }
  anclas.sort((a, b) => a.s - b.s);
  return { Rw, R, Lc, anclas, eL, eR };
}

/** Máximo de balines que caben dejando macramé suficiente */
const maxBalines = (tam: number, muneca: number, tieneDije: boolean) => {
  const { Lc } = geom(tam, 0, muneca, tieneDije);
  const libre = 0.7 * Lc - (tieneDije ? 2 * RD + 0.8 : 0);
  return Math.max(0, Math.floor(libre / tam));
};

/* ═══════════════════════════════════════════════════════════
   Motor 3D (canvas, sin dependencias)
   ═══════════════════════════════════════════════════════════ */
type Cfg = {
  metal: Metal; dijeMetal: Metal; tam: number; n: number; diamante: boolean;
  dije: string; letra: string; hilo: Hilo; muneca: number; cola: number;
  puesta: boolean; zoom: number;
};

/** Balín: liso (esfera brillante) o diamantado (facetas + destellos) */
function bola(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, m: Metal, fase: number, idx: number, diamante: boolean) {
  if (r < 0.4) return;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  g.addColorStop(0, m.c1); g.addColorStop(0.55, m.c2); g.addColorStop(1, m.c3);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();

  if (diamante && r >= 4) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const N = 10, paso = TAU / N;
    for (let k = 0; k < N; k++) {
      const a0 = fase + k * paso, a1 = a0 + paso;
      const luz = Math.cos((a0 + a1) / 2 + 2.2);
      const f = k % 2 ? 1 : 0.62;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a0) * r * 1.15, y + Math.sin(a0) * r * 1.15);
      ctx.lineTo(x + Math.cos(a1) * r * 1.15, y + Math.sin(a1) * r * 1.15);
      ctx.closePath();
      ctx.fillStyle = luz > 0 ? `rgba(255,255,255,${(0.06 + 0.3 * luz) * f})` : `rgba(0,0,0,${(0.05 + 0.3 * -luz) * f})`;
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let k = 0; k <= N; k++) {
      const a = fase + paso / 2 + k * paso;
      const px = x + Math.cos(a) * r * 0.52, py = y + Math.sin(a) * r * 0.52;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  } else if (r >= 3) {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.38, r * 0.28, r * 0.16, -0.6, 0, TAU); ctx.fill();
  }

  if (r > 2) {
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }

  if (diamante) {
    const s = Math.sin(fase * 3 + idx * 1.7);
    if (s > 0.9) {
      const a = (s - 0.9) * 10;
      ctx.save();
      ctx.globalAlpha = Math.min(1, a);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.lineCap = 'round';
      const bx = x - r * 0.3, by = y - r * 0.35, q = r * 0.8;
      ctx.beginPath();
      ctx.moveTo(bx - q, by); ctx.lineTo(bx + q, by);
      ctx.moveTo(bx, by - q); ctx.lineTo(bx, by + q);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Dibuja el dije en coordenadas locales (mm). u = derecha, v = arriba. */
function pintarDije(ctx: CanvasRenderingContext2D, id: string, letra: string, m: Metal, frente: boolean) {
  const r = RD;
  ctx.beginPath(); ctx.arc(0, 0, r + 0.5, 0, TAU); ctx.fillStyle = m.c3; ctx.fill();
  const g = ctx.createLinearGradient(-r, r, r, -r);
  g.addColorStop(0, m.c1); g.addColorStop(0.5, m.c2); g.addColorStop(1, m.c3);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  if (!frente) return;

  ctx.strokeStyle = m.c3; ctx.lineWidth = 0.3;
  ctx.setLineDash([0.3, 0.45]);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, TAU); ctx.stroke();

  const pintar = (fn: () => void) => {
    ctx.save(); ctx.translate(0.16, -0.16); ctx.fillStyle = m.c1; ctx.strokeStyle = m.c1; fn(); ctx.restore();
    ctx.fillStyle = m.c3; ctx.strokeStyle = m.c3; fn();
  };

  switch (id) {
    case 'estrella':
      pintar(() => {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = Math.PI / 2 + (i * Math.PI) / 5;
          const rad = i % 2 ? r * 0.24 : r * 0.6;
          const X = Math.cos(a) * rad, Y = Math.sin(a) * rad;
          if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.closePath(); ctx.fill();
      });
      break;
    case 'corazon':
      pintar(() => {
        const s = r * 0.034;
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) {
          const t = (i / 48) * TAU;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          if (i) ctx.lineTo(x * s, (y + 2.5) * s); else ctx.moveTo(x * s, (y + 2.5) * s);
        }
        ctx.closePath(); ctx.fill();
      });
      break;
    case 'cruz':
      pintar(() => {
        ctx.fillRect(-0.11 * r, -0.55 * r, 0.22 * r, 1.1 * r);
        ctx.fillRect(-0.4 * r, 0.1 * r, 0.8 * r, 0.22 * r);
      });
      break;
    case 'ojo':
      pintar(() => {
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-0.62 * r, 0);
        ctx.quadraticCurveTo(0, 0.58 * r, 0.62 * r, 0);
        ctx.quadraticCurveTo(0, -0.58 * r, -0.62 * r, 0);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 0.24 * r, 0, TAU); ctx.fill();
      });
      ctx.fillStyle = m.c1;
      ctx.beginPath(); ctx.arc(-0.05 * r, 0.06 * r, 0.07 * r, 0, TAU); ctx.fill();
      break;
    case 'trebol':
      pintar(() => {
        const q = 0.21 * r;
        for (const [x, y] of [[q, 0], [-q, 0], [0, q], [0, -q]]) { ctx.beginPath(); ctx.arc(x, y, 0.2 * r, 0, TAU); ctx.fill(); }
        ctx.lineWidth = 0.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -0.1 * r); ctx.lineTo(0.16 * r, -0.62 * r); ctx.stroke();
      });
      break;
    case 'luna':
      pintar(() => {
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, 0.55 * r, 0, TAU); ctx.clip();
        ctx.beginPath();
        ctx.rect(-r, -r, 2 * r, 2 * r);
        ctx.arc(0.24 * r, 0.1 * r, 0.46 * r, 0, TAU);
        ctx.fill('evenodd');
        ctx.restore();
      });
      break;
    case 'inicial':
      pintar(() => {
        ctx.font = `700 ${r * 1.2}px Georgia, "Times New Roman", serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(letra || 'A', 0, -0.05 * r);
      });
      break;
    default:
      pintar(() => { ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(0, 0, 0.6 * r, 0, TAU); ctx.stroke(); });
  }
}

const LN = Math.hypot(-0.35, 0.55, 0.75);
const LX = -0.35 / LN, LY = 0.55 / LN, LZ = 0.75 / LN;

function dibujar(ctx: CanvasRenderingContext2D, W: number, H: number, c: Cfg, yaw: number, pitch: number) {
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H / 2, W * 0.8);
  bg.addColorStop(0, '#223329'); bg.addColorStop(1, '#070c09');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const tieneDije = c.dije !== 'ninguno';
  const g = geom(c.tam, c.n, c.muneca, tieneDije);
  const { R, Rw, Lc } = g;
  const L = c.cola * 10;

  const escala = ((Math.min(W, H) * 0.46) / (R * 1.15 + L * 0.45)) * c.zoom;
  const f = Math.max(0, Math.min(1, (c.zoom - 1) / 1.5)); // al acercar, el visor se centra en el dije
  const o = { x: 0, y: -L * 0.45 * (1 - f) + R * f, z: 0 };

  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const D = 900;
  const rot = (x: number, y: number, z: number) => {
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    return { x1, y2: y * cp - z1 * sp, z2: y * sp + z1 * cp };
  };
  const p = (x: number, y: number, z: number) => {
    const r = rot(x - o.x, y - o.y, z - o.z);
    const k = D / (D - r.z2 * escala);
    return { x: W / 2 + r.x1 * escala * k, y: H / 2 - r.y2 * escala * k, z: r.z2, k };
  };
  const nz = (x: number, y: number, z: number) => rot(x, y, z).z2;
  const luz = (x: number, y: number, z: number) => {
    const r = rot(x, y, z);
    return 0.42 + 0.7 * Math.max(0, r.x1 * LX + r.y2 * LY + r.z2 * LZ);
  };

  const it: { z: number; d: () => void }[] = [];
  const pos = (s: number, rad = R) => { const th = s / R; return { x: 0, y: rad * Math.cos(th), z: rad * Math.sin(th) }; };

  /* ── Muñeca ── */
  if (c.puesta) {
    const SEG = 44, XL = 58;
    for (let j = 0; j < SEG; j++) {
      const t0 = (j * TAU) / SEG, t1 = ((j + 1) * TAU) / SEG, tm = (t0 + t1) / 2;
      if (nz(0, Math.cos(tm), Math.sin(tm)) <= 0.02) continue;
      const a = p(-XL, Rw * Math.cos(t0), Rw * Math.sin(t0));
      const b = p(XL, Rw * Math.cos(t0), Rw * Math.sin(t0));
      const d = p(XL, Rw * Math.cos(t1), Rw * Math.sin(t1));
      const e = p(-XL, Rw * Math.cos(t1), Rw * Math.sin(t1));
      const zc = p(0, Rw * Math.cos(tm), Rw * Math.sin(tm)).z - 10;
      const col = tono(PIEL, luz(0, Math.cos(tm), Math.sin(tm)));
      it.push({ z: zc, d: () => {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
        ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.stroke();
      } });
    }
    for (const sg of [-1, 1]) {
      if (nz(sg, 0, 0) <= 0.02) continue;
      const pts = Array.from({ length: SEG }, (_, j) => p(sg * XL, Rw * Math.cos((j * TAU) / SEG), Rw * Math.sin((j * TAU) / SEG)));
      const zc = p(sg * XL, 0, 0).z - 10;
      it.push({ z: zc, d: () => {
        ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
        ctx.fillStyle = tono(PIEL, 0.78); ctx.fill();
      } });
    }
  }

  /* ── Macramé: un nudo cuadrado ── */
  const nudo = (s: number, escW: number, paso: number, par: number) => {
    const th = s / R, cs = Math.cos(th), sn = Math.sin(th);
    const C = p(0, R * cs, R * sn);
    const Pt = p(0, R * cs - sn, R * sn + cs);
    const Px = p(1, R * cs, R * sn);
    const lz = luz(0, cs, sn) * (nz(0, cs, sn) < 0 ? 0.62 : 1);
    const a = Pt.x - C.x, b = Pt.y - C.y, cc = Px.x - C.x, d = Px.y - C.y;
    it.push({ z: C.z, d: () => {
      const w = ANCHO * escW, st = paso * 1.18;
      ctx.save();
      ctx.translate(C.x, C.y);
      ctx.transform(a, b, cc, d, 0, 0);
      ctx.fillStyle = tono(c.hilo.color, lz * 0.62);
      ctx.fillRect(-st / 2, -w / 2, st, w);
      for (const sg of [-1, 1]) {
        ctx.save();
        ctx.translate(0, sg * w * 0.23);
        ctx.rotate(sg * (par ? 0.5 : -0.5));
        ctx.beginPath(); ctx.ellipse(0, 0, st * 0.6, w * 0.28, 0, 0, TAU);
        ctx.fillStyle = tono(c.hilo.color, lz); ctx.fill();
        ctx.lineWidth = 0.22; ctx.strokeStyle = tono(c.hilo.color, lz * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-st * 0.08, -w * 0.05, st * 0.34, w * 0.13, 0, 0, TAU);
        ctx.fillStyle = tono(c.hilo.color, lz * 1.3); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    } });
  };

  const lim = Lc / 2 - KH - 1;
  for (const side of [-1, 1]) {
    const edge = Math.abs(side < 0 ? g.eL : g.eR);
    const nk = Math.max(0, Math.floor((lim - edge) / PASO));
    for (let k = 0; k < nk; k++) {
      nudo(side * (edge + 0.6 + (k + 0.5) * PASO), k < 3 ? 0.6 + 0.13 * k : 1, PASO, k & 1);
    }
  }
  /* Nudo corredizo (parte de atrás) */
  for (let i = -3; i <= 3; i++) nudo(Lc / 2 + i * 2.2, 1.3, 2.2, i & 1);

  /* ── Colas ── */
  for (const side of [1, -1]) {
    const th0 = Math.PI + (side * KH) / R;
    const ax = 0, ay = R * Math.cos(th0), az = R * Math.sin(th0);
    const dirz = -side;
    const N = 18;
    const curva = (off: number) => Array.from({ length: N + 1 }, (_, i) => {
      const t = i / N;
      return p(ax + side * 1.6 * t + off, ay - L * Math.pow(t, 1.45), az + dirz * L * 0.3 * (1 - (1 - t) * (1 - t)));
    });
    const hebras = [curva(-0.75), curva(0.75)];
    const mid = hebras[0][Math.floor(N / 2)];
    const kk = mid.k;
    it.push({ z: mid.z, d: () => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      hebras.forEach((h, idx) => {
        ctx.beginPath(); h.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.strokeStyle = tono(c.hilo.color, idx ? 0.8 : 1);
        ctx.lineWidth = 1.5 * escala * kk; ctx.stroke();
      });
    } });
    const tip = hebras[0][N], pre = hebras[0][N - 1];
    const tx = (hebras[0][N].x + hebras[1][N].x) / 2, ty = (hebras[0][N].y + hebras[1][N].y) / 2;
    const rB = 2.5 * escala * tip.k;
    it.push({ z: tip.z + 0.1, d: () => {
      ctx.fillStyle = tono(c.hilo.color, 0.7);
      ctx.beginPath(); ctx.arc(pre.x, pre.y, 1.3 * escala * pre.k, 0, TAU); ctx.fill();
      bola(ctx, tx, ty + rB * 0.6, rB, c.metal, 1.3, side, false);
    } });
  }

  /* ── Hilo visible entre balines ── */
  const marcas = [g.eL - 1.2, ...g.anclas.map((a) => a.s), g.eR + 1.2].sort((a, b) => a - b);
  for (let i = 0; i < marcas.length - 1; i++) {
    const A = pos(marcas[i]), B = pos(marcas[i + 1]);
    const Pa = p(A.x, A.y, A.z), Pb = p(B.x, B.y, B.z);
    it.push({ z: Math.min(Pa.z, Pb.z) - 0.4, d: () => {
      ctx.strokeStyle = tono(c.hilo.color, 0.85); ctx.lineCap = 'round';
      ctx.lineWidth = 1.5 * escala * ((Pa.k + Pb.k) / 2);
      ctx.beginPath(); ctx.moveTo(Pa.x, Pa.y); ctx.lineTo(Pb.x, Pb.y); ctx.stroke();
    } });
  }

  /* ── Balines ── */
  let bi = 0;
  for (const a of g.anclas) {
    if (a.t !== 'b') continue;
    const q = pos(a.s);
    const P = p(q.x, q.y, q.z);
    const r = (c.tam / 2) * escala * P.k;
    const idx = bi++;
    it.push({ z: P.z, d: () => bola(ctx, P.x, P.y, r, c.metal, idx * 0.9 + yaw * 2.2, idx, c.diamante) });
  }

  /* ── Dije ── */
  if (tieneDije) {
    const rr = R + 0.8;
    const C = p(0, rr, 0), Pu = p(0, rr, -1), Pv = p(-1, rr, 0);
    const frente = nz(0, 1, 0) > 0.04;
    it.push({ z: C.z + 0.2, d: () => {
      ctx.save();
      ctx.translate(C.x, C.y);
      ctx.transform(Pu.x - C.x, Pu.y - C.y, Pv.x - C.x, Pv.y - C.y, 0, 0);
      pintarDije(ctx, c.dije, c.letra, c.dijeMetal, frente);
      ctx.restore();
    } });
  }

  it.sort((a, b) => a.z - b.z);
  for (const x of it) x.d();
}

/* ═══════════════════════════════════════════════════════════
   ACORDEÓN COMPARTIDO (malla + taller)
   - tema: 'oscuro' (malla) | 'claro' (formulario)
   - alerta: marca la sección en rojo (error de validación)
   - fijaEscritorio: en pantallas grandes se ve siempre abierta y sin cabecera
   ═══════════════════════════════════════════════════════════ */
export type DatosMalla = { key: string; nombre: string; tamano: string; precio: number; foto: string };

function Seccion({ id, titulo, resumen, abierta, onToggle, children, tema = 'oscuro', alerta = false, fijaEscritorio = false }: {
  id: string; titulo: string; resumen: ReactNode; abierta: boolean; onToggle: (id: string) => void; children: ReactNode;
  tema?: 'oscuro' | 'claro'; alerta?: boolean; fijaEscritorio?: boolean;
}) {
  return (
    <div className={`mm-ac mm-ac--${tema}`} data-open={abierta} data-alerta={alerta} data-fija={fijaEscritorio}>
      <button type="button" className="mm-ac-h" aria-expanded={abierta} aria-controls={`mm-ac-${id}`} onClick={() => onToggle(id)}>
        <span className="mm-ac-t">{titulo}</span>
        <span className="mm-ac-r">{resumen}</span>
        <svg className="mm-ac-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="mm-ac-b" id={`mm-ac-${id}`} role="region" aria-label={titulo}>
        <div className="mm-ac-in">
          <div className="mm-ac-pad">{children}</div>
        </div>
      </div>
    </div>
  );
}

const CSS_ACC = `
.mm-ac { border: 1px solid rgba(255,255,255,.1); border-radius: 14px; background: #101c16; overflow: hidden; transition: border-color .2s; }
.mm-ac[data-open="true"] { border-color: rgba(224,183,63,.4); }
.mm-ac-h { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px; border: 0; background: none; cursor: pointer; color: #ece7d4; text-align: left; font: inherit; min-height: 52px; }
.mm-ac-h:hover { background: rgba(255,255,255,.03); }
.mm-ac-h:focus-visible { outline: 2px solid #e0b73f; outline-offset: -2px; }
.mm-ac-t { flex: 0 0 auto; font: 700 10.5px/1 system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #e0b73f; }
.mm-ac-r { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 7px; font-size: 12.5px; color: #b9b9aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mm-pt { width: 12px; height: 12px; border-radius: 50%; display: inline-block; flex: 0 0 auto; box-shadow: inset 0 0 0 1px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.18); }
.mm-ac-chev { flex: 0 0 auto; color: #e0b73f; transition: transform .25s ease; }
.mm-ac[data-open="true"] .mm-ac-chev { transform: rotate(180deg); }
.mm-ac-b { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .28s ease; }
.mm-ac[data-open="true"] .mm-ac-b { grid-template-rows: 1fr; }
.mm-ac-in { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear .28s; }
.mm-ac[data-open="true"] .mm-ac-in { visibility: visible; transition-delay: 0s; }
.mm-ac-pad { padding: 2px 14px 14px; display: grid; gap: 12px; }

/* Tema claro (formulario) */
.mm-ac--claro { border-color: #e6e2d6; background: #fff; }
.mm-ac--claro[data-open="true"] { border-color: var(--v); box-shadow: 0 0 0 3px rgba(11,74,46,.07); }
.mm-ac--claro .mm-ac-h { color: var(--tx); }
.mm-ac--claro .mm-ac-h:hover { background: rgba(11,74,46,.04); }
.mm-ac--claro .mm-ac-h:focus-visible { outline-color: var(--v); }
.mm-ac--claro .mm-ac-t { color: var(--o); }
.mm-ac--claro .mm-ac-r { color: #6b7a72; }
.mm-ac--claro .mm-ac-chev { color: var(--o); }

/* Error de validación */
.mm-ac[data-alerta="true"] { border-color: #c4453c; }
.mm-ac[data-alerta="true"] .mm-ac-r { color: #b3372f; font-weight: 600; }

/* En escritorio, la sección "fija" se ve siempre abierta y sin cabecera */
@media (min-width: 861px) {
  .mm-ac[data-fija="true"] { border: 0; background: none; box-shadow: none; overflow: visible; }
  .mm-ac[data-fija="true"] .mm-ac-h { display: none; }
  .mm-ac[data-fija="true"] .mm-ac-b { grid-template-rows: 1fr; transition: none; }
  .mm-ac[data-fija="true"] .mm-ac-in { visibility: visible; overflow: visible; transition: none; }
  .mm-ac[data-fija="true"] .mm-ac-pad { padding: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .mm-ac-b, .mm-ac-chev, .mm-ac-in { transition: none; }
}
`;

/* ═══════════════════════════════════════════════════════════
   ARMA TU MANILLA
   ═══════════════════════════════════════════════════════════ */
export function ArmaMalla({ onAdd, wa = '#', tienda = TIENDA }: { onAdd: (d: DatosMalla) => void; wa?: string; tienda?: string }) {
  const [metalId, setMetalId] = useState('amarillo');
  const [dijeMetalId, setDijeMetalId] = useState('amarillo');
  const [acabado, setAcabado] = useState<'diamantado' | 'liso'>('diamantado');
  const [tam, setTam] = useState(4);
  const [cant, setCant] = useState(12);
  const [dijeId, setDijeId] = useState('liso');
  const [letra, setLetra] = useState('A');
  const [hiloId, setHiloId] = useState('champagne');
  const [muneca, setMuneca] = useState(17);
  const [cola, setCola] = useState(9);
  const [puesta, setPuesta] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [abierta, setAbierta] = useState<string | null>('dije');
  const [desglose, setDesglose] = useState(false);

  const alternar = (id: string) => setAbierta((a) => (a === id ? null : id));

  const metal = METALES.find((m) => m.id === metalId) ?? METALES[0];
  const dijeMetal = METALES.find((m) => m.id === dijeMetalId) ?? METALES[0];
  const hilo = HILOS.find((h) => h.id === hiloId) ?? HILOS[0];
  const dijeInfo = DIJES.find((d) => d.id === dijeId) ?? DIJES[0];
  const tamInfo = TAMANOS.find((t) => t.mm === tam) ?? TAMANOS[1];
  const tieneDije = dijeId !== 'ninguno';
  const diamante = acabado === 'diamantado';

  const max = useMemo(() => maxBalines(tam, muneca, tieneDije), [tam, muneca, tieneDije]);
  const n = Math.min(cant, max);

  const cfg: Cfg = { metal, dijeMetal, tam, n, diamante, dije: dijeId, letra, hilo, muneca, cola, puesta, zoom };
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const cv = useRef<HTMLCanvasElement>(null);
  const dprRef = useRef(1);
  const v = useRef({ yaw: -1.0, pitch: 0.5, arrastrando: false, ultimo: 0, x: 0, y: 0 });

  useEffect(() => {
    const canvas = cv.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let visible = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const medir = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      dprRef.current = dpr;
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const s = v.current;
      if (!reduce && !s.arrastrando && t - s.ultimo > 3000) s.yaw += 0.004;
      const d = dprRef.current;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      dibujar(ctx, canvas.width / d, canvas.height / d, cfgRef.current, s.yaw, s.pitch);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    v.current.arrastrando = true; v.current.x = e.clientX; v.current.y = e.clientY;
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = v.current;
    if (!s.arrastrando) return;
    s.yaw += (e.clientX - s.x) * 0.01;
    s.pitch = Math.max(-1.4, Math.min(1.4, s.pitch + (e.clientY - s.y) * 0.01));
    s.x = e.clientX; s.y = e.clientY;
  };
  const up = () => { v.current.arrastrando = false; v.current.ultimo = performance.now(); };

  const vistaGeneral = () => { v.current.yaw = -1.0; v.current.pitch = 0.5; v.current.ultimo = performance.now(); setZoom(1); };
  const vistaDije = () => { v.current.yaw = -0.5; v.current.pitch = 0.75; v.current.ultimo = performance.now(); setZoom(2.4); };

  const calc = useMemo(() => {
    const pb = tamInfo.precio * (diamante ? FACTOR_DIAMANTADO : 1) * metal.mult;
    const balines = n * pb;
    const dije = dijeInfo.precio * dijeMetal.mult;
    const hiloP = HILO_BASE + hilo.extra;
    const term = TERMINALES * metal.mult;
    const mano = MANO_OBRA_BASE + n * MANO_OBRA_BALIN;
    const bruto = balines + dije + hiloP + term + mano;
    return { pb, balines, dije, hiloP, term, mano, total: Math.round(bruto / 100) * 100 };
  }, [n, tamInfo.precio, diamante, metal.mult, dijeInfo.precio, dijeMetal.mult, hilo.extra]);

  const descripcion = [
    `${n} balines ${diamante ? 'diamantados' : 'lisos'} ${tam} mm`,
    metal.nombre,
    tieneDije ? `dije ${dijeInfo.nombre.toLowerCase()}${dijeId === 'inicial' ? ` ${letra}` : ''} (${dijeMetal.nombre.toLowerCase()})` : 'sin dije',
    `hilo ${hilo.nombre.toLowerCase()}`,
    `muñeca ${muneca} cm`,
    `colas ${cola} cm`,
  ].join(' · ');

  const agregar = () => {
    let foto = '';
    const c = cv.current;
    if (c) {
      try {
        const t = document.createElement('canvas');
        t.width = t.height = 160;
        const x = t.getContext('2d');
        if (x) {
          const s = Math.min(c.width, c.height);
          x.drawImage(c, (c.width - s) / 2, (c.height - s) / 2, s, s, 0, 0, 160, 160);
          foto = t.toDataURL('image/jpeg', 0.72);
        }
      } catch { /* sin foto */ }
    }
    const key = ['manilla', metalId, acabado, tam, n, dijeId, dijeId === 'inicial' ? letra : '-', tieneDije ? dijeMetalId : '-', hiloId, muneca, cola].join('|');
    onAdd({ key, nombre: 'Manilla personalizada', tamano: descripcion, precio: calc.total, foto });
  };

  /** Cotización completa lista para enviar por WhatsApp */
  const cotizar = () => {
    const msg = armarMensaje([
      `Hola, *${tienda}* 👋`,
      'Quiero cotizar una *manilla personalizada*:',
      '',
      '✨ *Mi diseño*',
      `• Balines: ${n} ${diamante ? 'diamantados' : 'lisos'} de ${tam} mm · ${metal.nombre}`,
      tieneDije ? `• Dije: ${dijeInfo.nombre}${dijeId === 'inicial' ? ` "${letra}"` : ''} · ${dijeMetal.nombre}` : '• Sin dije',
      `• Hilo macramé: ${hilo.nombre}`,
      `• Muñeca: ${muneca} cm`,
      `• Colas: ${cola} cm`,
      '',
      '💰 *Cotización estimada*',
      `• Balines (${n} × ${cop(calc.pb)}): ${cop(calc.balines)}`,
      tieneDije && `• Dije: ${cop(calc.dije)}`,
      `• Macramé: ${cop(calc.hiloP)}`,
      `• Terminales dorados: ${cop(calc.term)}`,
      `• Armado a mano: ${cop(calc.mano)}`,
      `*Total: ${cop(calc.total)}*`,
      '',
      '¿Me confirmas el valor final y el tiempo de elaboración? ¡Gracias!',
    ]);
    abrirWA(wa, msg);
  };

  const swMetal = (m: Metal) => ({ background: `radial-gradient(circle at 35% 30%, ${m.c1}, ${m.c2} 55%, ${m.c3})` });
  const puntoMetal = (m: Metal) => <><i className="mm-pt" style={swMetal(m)} />{m.nombre}</>;

  return (
    <>
      <style>{CSS_ACC + CSS_MALLA}</style>
      <div className="mm">
        <div className="mm-col-visor">
          <div className="mm-visor">
            <canvas ref={cv} className="mm-cv" aria-label="Vista 3D de tu manilla"
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
            <div className="mm-modos" role="group" aria-label="Tipo de vista">
              <button type="button" data-on={puesta} onClick={() => setPuesta(true)}>Puesta</button>
              <button type="button" data-on={!puesta} onClick={() => setPuesta(false)}>Sola</button>
            </div>
            <div className="mm-vistas">
              <button type="button" onClick={vistaGeneral}>General</button>
              <button type="button" onClick={vistaDije}>Ver dije</button>
            </div>
            <span className="mm-hint">Arrastra para girar</span>
          </div>
          <label className="mm-zoom">
            <span>Zoom</span>
            <input type="range" min={0.8} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>
        </div>

        <div className="mm-panel">
          <div>
            <h3 className="mm-tit">Arma tu manilla</h3>
            <p className="mm-sub">Macramé ajustable con balines de oro y dije. Elige cada detalle y míralo en 3D.</p>
          </div>

          <div className="mm-acs">
            <Seccion id="dije" titulo="Dije" resumen={dijeInfo.nombre + (dijeId === 'inicial' ? ` ${letra}` : '')} abierta={abierta === 'dije'} onToggle={alternar}>
              <div className="mm-chips">
                {DIJES.map((d) => (
                  <button key={d.id} type="button" className="mm-chip" data-on={d.id === dijeId} onClick={() => setDijeId(d.id)}>{d.nombre}</button>
                ))}
              </div>
              {dijeId === 'inicial' && (
                <div className="mm-letras" role="group" aria-label="Letra del dije">
                  {LETRAS.map((l) => (
                    <button key={l} type="button" data-on={l === letra} onClick={() => setLetra(l)}>{l}</button>
                  ))}
                </div>
              )}
            </Seccion>

            {tieneDije && (
              <Seccion id="orodije" titulo="Oro del dije" resumen={puntoMetal(dijeMetal)} abierta={abierta === 'orodije'} onToggle={alternar}>
                <div className="mm-chips">
                  {METALES.map((m) => (
                    <button key={m.id} type="button" className="mm-chip" data-on={m.id === dijeMetalId} onClick={() => setDijeMetalId(m.id)}>
                      <i style={swMetal(m)} />{m.nombre}
                    </button>
                  ))}
                </div>
              </Seccion>
            )}

            <Seccion id="acabado" titulo="Acabado del balín" resumen={diamante ? 'Diamantado' : 'Liso'} abierta={abierta === 'acabado'} onToggle={alternar}>
              <div className="mm-chips">
                <button type="button" className="mm-chip" data-on={diamante} onClick={() => setAcabado('diamantado')}>Diamantado</button>
                <button type="button" className="mm-chip" data-on={!diamante} onClick={() => setAcabado('liso')}>Liso</button>
              </div>
            </Seccion>

            <Seccion id="tamano" titulo="Tamaño del balín" resumen={`${tam} mm`} abierta={abierta === 'tamano'} onToggle={alternar}>
              <div className="mm-chips">
                {TAMANOS.map((t) => (
                  <button key={t.mm} type="button" className="mm-chip" data-on={t.mm === tam} onClick={() => setTam(t.mm)}>{t.mm} mm</button>
                ))}
              </div>
            </Seccion>

            <Seccion id="cantidad" titulo="Cantidad de balines" resumen={`${n} de máx. ${max}`} abierta={abierta === 'cantidad'} onToggle={alternar}>
              <div className="mm-cant">
                <div className="mm-num">
                  <button type="button" aria-label="Menos balines" onClick={() => setCant(Math.max(0, n - 1))}>−</button>
                  <b>{n}</b>
                  <button type="button" aria-label="Más balines" onClick={() => setCant(Math.min(max, n + 1))}>+</button>
                </div>
                <input className="mm-rango" type="range" min={0} max={Math.max(1, max)} step={1} value={n}
                  aria-label="Cantidad de balines" onChange={(e) => setCant(Number(e.target.value))} />
              </div>
              <p className="mm-mini">El máximo depende del largo de tu muñeca y del tamaño del balín.</p>
            </Seccion>

            <Seccion id="oro" titulo="Color del oro (balines)" resumen={puntoMetal(metal)} abierta={abierta === 'oro'} onToggle={alternar}>
              <div className="mm-chips">
                {METALES.map((m) => (
                  <button key={m.id} type="button" className="mm-chip" data-on={m.id === metalId} onClick={() => setMetalId(m.id)}>
                    <i style={swMetal(m)} />{m.nombre}
                  </button>
                ))}
              </div>
            </Seccion>

            <Seccion id="hilo" titulo="Hilo macramé" resumen={<><i className="mm-pt" style={{ background: hilo.color }} />{hilo.nombre}</>} abierta={abierta === 'hilo'} onToggle={alternar}>
              <div className="mm-chips">
                {HILOS.map((h) => (
                  <button key={h.id} type="button" className="mm-hilo" data-on={h.id === hiloId} aria-label={h.nombre} title={h.nombre}
                    onClick={() => setHiloId(h.id)}>
                    <i style={{ background: h.color }} />
                  </button>
                ))}
              </div>
            </Seccion>

            <Seccion id="muneca" titulo="Tu muñeca" resumen={`${muneca} cm`} abierta={abierta === 'muneca'} onToggle={alternar}>
              <div className="mm-chips">
                {MUNECAS.map((l) => (
                  <button key={l} type="button" className="mm-chip" data-on={l === muneca} onClick={() => setMuneca(l)}>{l} cm</button>
                ))}
              </div>
            </Seccion>

            <Seccion id="colas" titulo="Largo de las colas" resumen={`${cola} cm`} abierta={abierta === 'colas'} onToggle={alternar}>
              <div className="mm-chips">
                {COLAS.map((l) => (
                  <button key={l} type="button" className="mm-chip" data-on={l === cola} onClick={() => setCola(l)}>{l} cm</button>
                ))}
              </div>
              <p className="mm-mini">El nudo corredizo permite abrir o cerrar la manilla. Las colas terminan con un balín dorado.</p>
            </Seccion>
          </div>

          <div className="mm-resumen">
            <button type="button" className="mm-tot mm-tot-btn" aria-expanded={desglose} aria-controls="mm-desglose" onClick={() => setDesglose((d) => !d)}>
              <span>
                Total
                <small>
                  {desglose ? 'Ocultar desglose' : 'Ver desglose'}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                </small>
              </span>
              <b>{cop(calc.total)}</b>
            </button>
            <div className="mm-desg" id="mm-desglose" data-open={desglose}>
              <div className="mm-desg-in">
                <div className="mm-desg-pad">
                  <div className="mm-rl">
                    <span>{n} balines {diamante ? 'diamantados' : 'lisos'} {tam} mm × {cop(calc.pb)}</span>
                    <b>{cop(calc.balines)}</b>
                  </div>
                  {tieneDije && <div className="mm-rl"><span>Dije · {dijeInfo.nombre}{dijeId === 'inicial' ? ` ${letra}` : ''}</span><b>{cop(calc.dije)}</b></div>}
                  <div className="mm-rl"><span>Macramé · {hilo.nombre}</span><b>{cop(calc.hiloP)}</b></div>
                  <div className="mm-rl"><span>Terminales dorados</span><b>{cop(calc.term)}</b></div>
                  <div className="mm-rl"><span>Armado a mano</span><b>{cop(calc.mano)}</b></div>
                </div>
              </div>
            </div>
            <button type="button" className="mm-add" onClick={agregar}>Agregar manilla al carrito</button>
            {wa !== '#' && <button type="button" className="mm-wa" onClick={cotizar}>Cotizar por WhatsApp</button>}
            <p className="mm-nota">Precio estimado. Confirmamos el valor final y el tiempo de elaboración por WhatsApp.</p>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS_MALLA = `
.mm { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 22px; align-items: start; }
.mm-col-visor { position: sticky; top: 76px; display: grid; gap: 10px; }
.mm-visor { position: relative; aspect-ratio: 1 / 1; border-radius: 20px; overflow: hidden; background: #070c09; border: 1px solid rgba(224,183,63,.25); box-shadow: 0 14px 40px rgba(0,0,0,.25); }
.mm-cv { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.mm-cv:active { cursor: grabbing; }
.mm-modos { position: absolute; top: 12px; left: 12px; display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.14); }
.mm-modos button { border: 0; background: transparent; color: #d6d1bd; font-size: 12px; padding: 6px 12px; border-radius: 999px; cursor: pointer; }
.mm-modos button[data-on="true"] { background: #e0b73f; color: #1a1405; font-weight: 700; }
.mm-vistas { position: absolute; top: 12px; right: 12px; display: flex; gap: 4px; }
.mm-vistas button { border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.55); color: #e9e3cc; font-size: 12px; padding: 7px 12px; border-radius: 999px; cursor: pointer; }
.mm-vistas button:hover { border-color: #e0b73f; color: #e0b73f; }
.mm-hint { position: absolute; bottom: 12px; left: 0; right: 0; text-align: center; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: rgba(236,231,212,.55); pointer-events: none; }
.mm-zoom { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #55645b; }
.mm-zoom input { flex: 1; accent-color: #b08d3c; }

.mm-panel { background: #0c1511; color: #ece7d4; border: 1px solid rgba(224,183,63,.2); border-radius: 20px; padding: 20px 16px 18px; display: grid; gap: 16px; }
.mm-tit { margin: 0; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 28px; color: #f4efdc; }
.mm-sub { margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: #b9b9aa; }

.mm-acs { display: grid; gap: 8px; }

.mm-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.mm-chip { display: inline-flex; align-items: center; gap: 7px; border: 1px solid rgba(255,255,255,.14); background: transparent; color: #d6d1bd; border-radius: 10px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
.mm-chip i { width: 14px; height: 14px; border-radius: 50%; display: block; box-shadow: inset 0 0 0 1px rgba(0,0,0,.35); }
.mm-chip[data-on="true"] { border-color: #e0b73f; color: #e0b73f; background: rgba(224,183,63,.1); }
.mm-hilo { width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,.18); background: transparent; display: grid; place-items: center; cursor: pointer; padding: 0; }
.mm-hilo i { width: 20px; height: 20px; border-radius: 50%; display: block; box-shadow: inset 0 0 0 1px rgba(0,0,0,.35); }
.mm-hilo[data-on="true"] { border-color: #e0b73f; box-shadow: 0 0 0 2px rgba(224,183,63,.35); }

.mm-letras { display: grid; grid-template-columns: repeat(9, 1fr); gap: 5px; }
.mm-letras button { padding: 7px 0; border: 1px solid rgba(255,255,255,.14); background: transparent; color: #d6d1bd; border-radius: 8px; font: 600 13px/1 Georgia, serif; cursor: pointer; }
.mm-letras button[data-on="true"] { border-color: #e0b73f; color: #e0b73f; background: rgba(224,183,63,.1); }

.mm-cant { display: flex; align-items: center; gap: 14px; }
.mm-num { display: inline-flex; align-items: center; border: 1px solid rgba(255,255,255,.18); border-radius: 10px; overflow: hidden; flex: 0 0 auto; }
.mm-num button { width: 38px; height: 38px; border: 0; background: transparent; color: #e0b73f; font-size: 20px; cursor: pointer; }
.mm-num b { min-width: 46px; text-align: center; font-size: 16px; color: #f4efdc; }
.mm-rango { flex: 1; min-width: 0; accent-color: #e0b73f; }
.mm-mini { margin: 0; font-size: 12px; line-height: 1.5; color: #7f8a82; }

.mm-resumen { display: grid; gap: 8px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.1); }
.mm-rl { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: #b9b9aa; }
.mm-rl b { color: #ece7d4; font-weight: 600; white-space: nowrap; }
.mm-tot { display: flex; justify-content: space-between; align-items: center; margin: 0; padding: 0; border: 0; font-size: 14px; }
.mm-tot b { font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 28px; color: #f0c24a; }
.mm-tot-btn { width: 100%; background: none; color: #ece7d4; cursor: pointer; text-align: left; font: inherit; padding: 4px 0; }
.mm-tot-btn > span { display: grid; gap: 4px; }
.mm-tot-btn small { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #e0b73f; }
.mm-tot-btn small svg { transition: transform .25s ease; }
.mm-tot-btn[aria-expanded="true"] small svg { transform: rotate(180deg); }
.mm-tot-btn:focus-visible { outline: 2px solid #e0b73f; outline-offset: 4px; border-radius: 6px; }
.mm-desg { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .28s ease; }
.mm-desg[data-open="true"] { grid-template-rows: 1fr; }
.mm-desg-in { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear .28s; }
.mm-desg[data-open="true"] .mm-desg-in { visibility: visible; transition-delay: 0s; }
.mm-desg-pad { display: grid; gap: 8px; padding: 6px 0 10px; }
@media (prefers-reduced-motion: reduce) { .mm-desg, .mm-tot-btn small svg, .mm-desg-in { transition: none; } }
.mm-add { width: 100%; min-height: 50px; margin-top: 4px; border: 0; border-radius: 10px; cursor: pointer; font: 700 14px/1 system-ui, sans-serif; background: linear-gradient(135deg, #f0d680, #e0b73f 55%, #b08d3c); color: #1a1405; transition: filter .2s; }
.mm-add:hover { filter: brightness(1.06); }
.mm-wa { width: 100%; min-height: 46px; border: 1px solid rgba(224,183,63,.6); border-radius: 10px; cursor: pointer; background: transparent; color: #f0d680; font: 600 13px/1 system-ui, sans-serif; }
.mm-wa:hover { background: rgba(224,183,63,.12); }
.mm-nota { margin: 0; font-size: 12px; color: #7f8a82; text-align: center; }

@media (max-width: 860px) {
  .mm { grid-template-columns: 1fr; }
  .mm-col-visor { position: static; }
}
@media (max-width: 420px) {
  .mm-ac-r { font-size: 12px; }
}
`;

/* ═══════════════════════════════════════════════════════════
   TALLER DE REPARACIÓN
   ═══════════════════════════════════════════════════════════ */
const SERVICIOS = [
  { id: 'soldadura', nombre: 'Soldadura de cadena o argolla', desde: 25000 },
  { id: 'broche', nombre: 'Cambio de broche o cierre', desde: 30000 },
  { id: 'limpieza', nombre: 'Limpieza y pulido', desde: 20000 },
  { id: 'talla', nombre: 'Ajuste de talla (anillos)', desde: 35000 },
  { id: 'bano', nombre: 'Baño de oro o rodio', desde: 60000 },
  { id: 'engaste', nombre: 'Engaste / cambio de piedra', desde: 40000 },
  { id: 'reenhebrado', nombre: 'Reenhebrado de manilla', desde: 35000 },
  { id: 'otro', nombre: 'Otro (te lo revisamos)', desde: 0 },
];

export function TallerReparacion({ wa, tienda = TIENDA }: { wa: string; tienda?: string }) {
  const [sel, setSel] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [tel, setTel] = useState('');
  const [pieza, setPieza] = useState('');
  const [entrega, setEntrega] = useState<'tienda' | 'envio'>('tienda');
  const [notas, setNotas] = useState('');
  const [intento, setIntento] = useState(false);
  const [abierta, setAbierta] = useState<string | null>('pieza'); // la idea principal arranca abierta
  const [comoAbierto, setComoAbierto] = useState(false);          // "¿Cómo funciona?" arranca cerrado

  const alternar = (id: string) => setAbierta((a) => (a === id ? null : id));
  const abrir = (id: string) => setAbierta(id);
  const alternarServicio = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const errores = {
    servicios: sel.length === 0 ? 'Elige al menos un servicio' : '',
    nombre: nombre.trim().length < 5 || nombre.trim().split(/\s+/).length < 2 ? 'Escribe tu nombre y apellido' : '',
    tel: /^3\d{9}$/.test(soloCelular(tel)) ? '' : 'Celular de 10 dígitos. Ej: 3001234567',
    pieza: pieza.trim().length < 4 ? 'Cuéntanos qué pieza es y qué le pasó' : '',
  };
  const valido = !Object.values(errores).some(Boolean);
  const waOk = wa !== '#';
  const desde = SERVICIOS.filter((s) => sel.includes(s.id)).reduce((a, s) => a + s.desde, 0);

  const errPieza = intento && !!errores.pieza;
  const errServ = intento && !!errores.servicios;
  const errDatos = intento && (!!errores.nombre || !!errores.tel);

  const enviar = () => {
    setIntento(true);
    if (!valido) {
      // Abre la primera sección con error y lleva al cliente hasta ella
      const primera = errores.pieza ? 'pieza' : errores.servicios ? 'servicios' : 'datos';
      setAbierta(primera);
      requestAnimationFrame(() => {
        document.getElementById(`mm-ac-${primera}`)?.closest('.mm-ac')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (!waOk) return;
    const lista = SERVICIOS.filter((s) => sel.includes(s.id)).map((s) => `• ${s.nombre}`).join('\n');
    const msg = armarMensaje([
      `Hola, *${tienda}* 👋`,
      'Quiero cotizar una *reparación*:',
      '',
      '🔧 *Servicios*',
      lista,
      '',
      `💍 *Pieza y daño:* ${pieza.trim()}`,
      `📦 *Entrega:* ${entrega === 'tienda' ? 'Llevo la pieza a la tienda' : 'Prefiero enviarla'}`,
      notas.trim() !== '' && `📝 *Notas:* ${notas.trim()}`,
      '',
      `👤 *Nombre:* ${nombre.trim()}`,
      `📱 *Celular:* ${soloCelular(tel)}`,
      desde > 0 && '',
      desde > 0 && `💰 Valor de referencia: desde ${cop(desde)} (se confirma tras el diagnóstico)`,
      '',
      'Quedo atento a tu respuesta. ¡Gracias!',
    ]);
    abrirWA(wa, msg);
  };

  const e = (k: keyof typeof errores) => (intento && errores[k] ? <small className="tr-err" role="alert">{errores[k]}</small> : null);
  const sig = (id: string, texto = 'Continuar') => (
    <button type="button" className="tr-next" onClick={() => abrir(id)}>{texto}</button>
  );

  const nombreCorto = nombre.trim().split(/\s+/)[0];
  const resDatos = errDatos
    ? 'Revisa tus datos'
    : nombreCorto && /^3\d{9}$/.test(soloCelular(tel)) ? `${nombreCorto} · ${soloCelular(tel)}` : 'Nombre y celular';

  return (
    <>
      <style>{CSS_ACC + CSS_TALLER}</style>
      <div className="tr">
        <div className="tr-info">
          <div>
            <h3 className="tr-tit">Taller de reparación</h3>
            <p className="tr-sub">Devolvemos la vida a tus joyas. Diagnóstico sin costo y precio confirmado antes de empezar.</p>
          </div>

          {/* En móvil es colapsable; en escritorio se ve siempre abierto */}
          <Seccion id="como" titulo="¿Cómo funciona?" resumen="3 pasos" abierta={comoAbierto} onToggle={() => setComoAbierto((x) => !x)} fijaEscritorio>
            <ol className="tr-pasos">
              <li><i>1</i><div><b>Cuéntanos</b><span>Elige el servicio y describe la pieza.</span></div></li>
              <li><i>2</i><div><b>Diagnóstico gratis</b><span>La revisamos y te damos el valor final.</span></div></li>
              <li><i>3</i><div><b>Reparamos</b><span>Te avisamos por WhatsApp cuando esté lista.</span></div></li>
            </ol>
            <p className="tr-foto">Tip: después de enviar, comparte una foto de la pieza por el chat para cotizar más rápido.</p>
          </Seccion>
        </div>

        <form className="tr-form" noValidate onSubmit={(ev) => { ev.preventDefault(); enviar(); }}>
          <div className="tr-acs">
            {/* ── Item principal: la idea / el caso ── */}
            <Seccion id="pieza" tema="claro" alerta={errPieza} titulo="Tu pieza"
              resumen={errPieza ? 'Cuéntanos qué le pasó' : pieza.trim() || 'Cuéntanos qué le pasó'}
              abierta={abierta === 'pieza'} onToggle={alternar}>
              <div className="tr-c">
                <label htmlFor="tr-pieza">¿Qué pieza es y qué le pasó?</label>
                <textarea id="tr-pieza" rows={3} maxLength={300} value={pieza} placeholder="Ej: Cadena de 50 cm, se rompió cerca del broche"
                  aria-invalid={errPieza} onChange={(x) => setPieza(x.target.value)} />
                {e('pieza')}
              </div>
              {sig('servicios')}
            </Seccion>

            <Seccion id="servicios" tema="claro" alerta={errServ} titulo="Servicio"
              resumen={errServ ? 'Elige al menos uno' : sel.length ? `${sel.length} ${sel.length === 1 ? 'elegido' : 'elegidos'}` : 'Elige uno o más'}
              abierta={abierta === 'servicios'} onToggle={alternar}>
              <div className="tr-serv">
                {SERVICIOS.map((s) => (
                  <button key={s.id} type="button" data-on={sel.includes(s.id)} aria-pressed={sel.includes(s.id)} onClick={() => alternarServicio(s.id)}>
                    <span>{s.nombre}</span>
                    <em>{s.desde > 0 ? `desde ${cop(s.desde)}` : 'A cotizar'}</em>
                  </button>
                ))}
              </div>
              {e('servicios')}
              {sig('datos')}
            </Seccion>

            <Seccion id="datos" tema="claro" alerta={errDatos} titulo="Tus datos" resumen={resDatos}
              abierta={abierta === 'datos'} onToggle={alternar}>
              <div className="tr-dos">
                <div className="tr-c">
                  <label htmlFor="tr-nombre">Nombre y apellido</label>
                  <input id="tr-nombre" value={nombre} autoComplete="name" placeholder="Ej: María Gómez"
                    aria-invalid={intento && !!errores.nombre} onChange={(x) => setNombre(x.target.value)} />
                  {e('nombre')}
                </div>
                <div className="tr-c">
                  <label htmlFor="tr-tel">Celular / WhatsApp</label>
                  <input id="tr-tel" value={tel} inputMode="tel" autoComplete="tel" placeholder="3001234567"
                    aria-invalid={intento && !!errores.tel} onChange={(x) => setTel(x.target.value)} />
                  {e('tel')}
                </div>
              </div>
              {sig('entrega')}
            </Seccion>

            <Seccion id="entrega" tema="claro" titulo="Entrega" resumen={entrega === 'tienda' ? 'La llevo a la tienda' : 'La envío'}
              abierta={abierta === 'entrega'} onToggle={alternar}>
              <div className="tr-ent" role="group" aria-label="Entrega de la pieza">
                <button type="button" className={entrega === 'tienda' ? 'on' : ''} onClick={() => setEntrega('tienda')}>La llevo a la tienda</button>
                <button type="button" className={entrega === 'envio' ? 'on' : ''} onClick={() => setEntrega('envio')}>Prefiero enviarla</button>
              </div>
            </Seccion>

            <Seccion id="notas" tema="claro" titulo="Notas" resumen={notas.trim() ? 'Agregadas' : 'Opcional'}
              abierta={abierta === 'notas'} onToggle={alternar}>
              <div className="tr-c">
                <label htmlFor="tr-notas">Urgencia, material, recuerdo especial…</label>
                <textarea id="tr-notas" rows={2} maxLength={200} value={notas} placeholder="Cuéntanos lo que quieras que sepamos"
                  onChange={(x) => setNotas(x.target.value)} />
              </div>
            </Seccion>
          </div>

          <div className="tr-pie">
            {desde > 0 && <p className="tr-desde">Valor de referencia: <b>desde {cop(desde)}</b></p>}
            <button type="submit" className="tr-send" disabled={!waOk}>Solicitar cotización por WhatsApp</button>
            <p className="tr-nota">{waOk ? 'El valor final se confirma después del diagnóstico.' : 'La tienda aún no tiene WhatsApp configurado.'}</p>
          </div>
        </form>
      </div>
    </>
  );
}

const CSS_TALLER = `
.tr { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 22px; align-items: start; }
.tr-info { background: #0c1511; color: #ece7d4; border: 1px solid rgba(224,183,63,.2); border-radius: 20px; padding: 22px 20px; display: grid; gap: 14px; position: sticky; top: 76px; }
.tr-tit { margin: 0; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 28px; color: #f4efdc; }
.tr-sub { margin: 6px 0 0; font-size: 14px; line-height: 1.55; color: #b9b9aa; }
.tr-pasos { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 14px; }
.tr-pasos li { display: grid; grid-template-columns: 30px 1fr; gap: 12px; align-items: start; }
.tr-pasos i { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-style: normal; font-weight: 700; font-size: 13px; background: #e0b73f; color: #1a1405; }
.tr-pasos b { display: block; font-size: 14px; color: #f4efdc; }
.tr-pasos span { display: block; font-size: 13px; line-height: 1.45; color: #b9b9aa; }
.tr-foto { margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 12.5px; line-height: 1.5; color: #e9c552; background: rgba(224,183,63,.08); border: 1px dashed rgba(224,183,63,.4); }

.tr-form { background: #fff; border: 1px solid #e6e2d6; border-radius: 20px; padding: 16px 14px; display: grid; gap: 16px; color: var(--tx); }
.tr-acs { display: grid; gap: 8px; }
.tr-serv { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tr-serv button { text-align: left; display: grid; gap: 3px; padding: 11px 12px; border-radius: 12px; border: 1px solid #ddd5bd; background: #fff; cursor: pointer; font: inherit; color: var(--tx); }
.tr-serv button span { font-size: 13px; font-weight: 600; line-height: 1.25; }
.tr-serv button em { font-style: normal; font-size: 11.5px; color: #8a7a3e; }
.tr-serv button[data-on="true"] { border-color: var(--v); background: #f1f6f2; box-shadow: 0 0 0 2px rgba(11,74,46,.12); }
.tr-c { display: flex; flex-direction: column; gap: 6px; }
.tr-c label { font-size: 12px; font-weight: 600; letter-spacing: .03em; color: #4f6159; }
.tr-c input, .tr-c textarea { width: 100%; padding: 11px 13px; border-radius: 11px; border: 1px solid #ddd5bd; background: #fff; font: inherit; font-size: 16px; color: var(--tx); outline: none; resize: vertical; }
.tr-c input:focus, .tr-c textarea:focus { border-color: var(--v); box-shadow: 0 0 0 3px rgba(11,74,46,.1); }
.tr-c input[aria-invalid="true"], .tr-c textarea[aria-invalid="true"] { border-color: #c4453c; }
.tr-err { font-size: 12px; color: #b3372f; }
.tr-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tr-ent { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: #f1ece0; }
.tr-ent button { padding: 11px 6px; border: 0; border-radius: 9px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; background: transparent; color: #5d6f68; }
.tr-ent button.on { background: var(--v); color: #f3e2a6; }
.tr-next { justify-self: end; border: 0; border-radius: 9px; padding: 9px 16px; cursor: pointer; font: 700 13px/1 system-ui, sans-serif; background: #f1f6f2; color: var(--v); }
.tr-next:hover { background: #e3eee6; }
.tr-pie { display: grid; gap: 10px; }
.tr-desde { margin: 0; font-size: 13px; color: #55645b; text-align: center; }
.tr-desde b { color: var(--v); }
.tr-send { width: 100%; min-height: 52px; border: 0; border-radius: 10px; cursor: pointer; font: 700 14px/1 system-ui, sans-serif; background: linear-gradient(135deg, #f0d680, #e0b73f 55%, #b08d3c); color: #1a1405; }
.tr-send:disabled { opacity: .45; cursor: not-allowed; }
.tr-nota { margin: 0; font-size: 12px; color: #6b7a72; text-align: center; }

@media (max-width: 860px) {
  .tr { grid-template-columns: 1fr; gap: 14px; }
  .tr-info { position: static; padding: 18px 16px; gap: 12px; }
  .tr-tit { font-size: 24px; }
}
@media (max-width: 520px) {
  .tr-serv, .tr-dos { grid-template-columns: 1fr; }
}
`;