// 📁 RUTA: components/auth/FondoJoya.tsx
/**
 * Pieza de fondo: una esmeralda de corte "emerald cut" dibujada en línea de oro,
 * con rayos de luz giratorios, brillo que la recorre y destellos.
 * Es SVG + CSS puro (sin imágenes, sin JS). Se posiciona detrás del logo.
 */
import type { ReactElement } from 'react';

const A = 260; // semiancho
const B = 320; // semialto
const C = 110; // chaflán de las esquinas
const BASE: [number, number][] = [
  [-A + C, -B], [A - C, -B], [A, -B + C], [A, B - C],
  [A - C, B], [-A + C, B], [-A, B - C], [-A, -B + C],
];
const ESCALAS = [1, 0.8, 0.6, 0.4];

const pt = (i: number, s: number) => [450 + BASE[i][0] * s, 450 + BASE[i][1] * s] as const;
const poligono = (s: number) => BASE.map((_, i) => pt(i, s).join(',')).join(' ');

const RELLENOS = [
  { c: '#0d5a35', o: 0.55 },
  { c: '#3ddc97', o: 0.1 },
  { c: '#04140c', o: 0.45 },
];

const CHISPAS: [number, number, number, string][] = [
  [235, 190, 1.3, '0s'],
  [690, 250, 0.9, '1.4s'],
  [160, 540, 0.8, '2.6s'],
  [735, 610, 1.2, '0.8s'],
  [450, 120, 0.9, '3.2s'],
  [560, 800, 0.8, '2s'],
];

export default function FondoJoya() {
  const facetas: ReactElement[] = [];
  for (let k = 0; k < ESCALAS.length - 1; k++) {
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      const a = pt(i, ESCALAS[k]);
      const b = pt(j, ESCALAS[k]);
      const c = pt(j, ESCALAS[k + 1]);
      const d = pt(i, ESCALAS[k + 1]);
      const r = RELLENOS[(i + k) % 3];
      facetas.push(
        <polygon
          key={`f${k}-${i}`}
          points={`${a} ${b} ${c} ${d}`}
          fill={r.c}
          fillOpacity={r.o}
          stroke="#d9b648"
          strokeOpacity={0.38}
          strokeWidth={1}
          strokeLinejoin="round"
        />,
      );
    }
  }

  return (
    <div className="jks-joya" aria-hidden="true">
      <div className="jks-rayos" />
      <svg viewBox="0 0 900 900" className="jks-gema" role="presentation">
        <defs>
          <radialGradient id="jg-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#12804a" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#0a3b24" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0a3b24" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="jg-mesa" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1fa968" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06210f" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="jg-brillo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="50%" stopColor="#f4dc8a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="jg-recorte">
            <polygon points={poligono(1)} />
          </clipPath>
        </defs>

        <circle cx="450" cy="450" r="430" fill="url(#jg-halo)" />

        <g className="jks-gema-cuerpo">
          <polygon points={poligono(1)} fill="#06180f" fillOpacity="0.55" />
          {facetas}
          <polygon points={poligono(0.4)} fill="url(#jg-mesa)" stroke="#f4dc8a" strokeOpacity="0.55" strokeWidth="1.2" />
          {/* contorno exterior dorado */}
          <polygon points={poligono(1)} fill="none" stroke="#d9b648" strokeOpacity="0.7" strokeWidth="2" strokeLinejoin="round" />

          {/* brillo que barre la gema */}
          <g clipPath="url(#jg-recorte)">
            <g className="jks-brillo">
              <rect x="-260" y="60" width="150" height="800" fill="url(#jg-brillo)" transform="rotate(22 -185 460)" />
            </g>
          </g>

          {/* destellos */}
          {CHISPAS.map(([x, y, s, d], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <path
                className="jks-chispa"
                style={{ animationDelay: d }}
                d="M0,-14 C1.5,-4 4,-1.5 14,0 C4,1.5 1.5,4 0,14 C-1.5,4 -4,1.5 -14,0 C-4,-1.5 -1.5,-4 0,-14Z"
                fill="#f4dc8a"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}