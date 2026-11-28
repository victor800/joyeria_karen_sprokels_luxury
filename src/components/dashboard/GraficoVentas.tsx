// 📁 RUTA: src/components/dashboard/GraficoVentas.tsx   (ARCHIVO NUEVO)
'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import './extras-dashboard.css';

export type PuntoVenta = { letra: string; total: number };

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dinero = (n: number) => (n > 0 ? pesos.format(n).replace(/\s/g, '') : '$0');
const corto = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.', ',')}M` : n >= 1_000 ? `${Math.round(n / 1_000)}k` : String(n);

/** Escala "redonda" para el eje Y: 4 divisiones con valores como 250k, 500k, 1M… */
function escala(max: number) {
  if (max <= 0) return { paso: 100_000, tope: 400_000 };
  const crudo = max / 4;
  const mag = 10 ** Math.floor(Math.log10(crudo));
  const norm = crudo / mag;
  const bonito = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return { paso: bonito * mag, tope: bonito * mag * 4 };
}

/**
 * datos: ventas por día, del más antiguo al más reciente (el último es hoy).
 * hoy: fecha de hoy "AAAA-MM-DD" (la calcula el servidor en hora de Bogotá).
 */
export default function GraficoVentas({ datos, hoy }: { datos: PuntoVenta[]; hoy: string }) {
  const id = useId().replace(/:/g, '');
  const caja = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [modo, setModo] = useState<'linea' | 'barras'>('linea');
  const [activo, setActivo] = useState<number | null>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = datos.length;
  const fechas = useMemo(() => {
    const [a, m, d] = hoy.split('-').map(Number);
    return datos.map((_, i) => new Date(Date.UTC(a, m - 1, d - (n - 1 - i))));
  }, [hoy, datos, n]);

  const larga = (f: Date) => {
    const t = f.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const total = datos.reduce((a, d) => a + d.total, 0);
  const prom = n ? total / n : 0;
  const mejor = datos.reduce((mi, d, i) => (d.total > datos[mi].total ? i : mi), 0);

  // Geometría
  const chico = w < 420;
  const H = chico ? 220 : 260;
  const m = { l: chico ? 40 : 50, r: 12, t: 14, b: 44 };
  const iw = w - m.l - m.r;
  const ih = H - m.t - m.b;
  const { paso, tope } = escala(Math.max(...datos.map((d) => d.total), 0));
  const x = (i: number) => m.l + (iw / n) * (i + 0.5);
  const y = (v: number) => m.t + ih - (v / tope) * ih;
  const ticks = [0, 1, 2, 3, 4].map((k) => k * paso);
  const bw = Math.min(36, (iw / n) * 0.56);

  const trazo = datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.total).toFixed(1)}`).join(' ');
  const area = `${trazo} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  const mover = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - r.left - m.l) / (iw / n) - 0.5);
    setActivo(Math.min(n - 1, Math.max(0, i)));
  };
  const teclas = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setActivo((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActivo((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === 'Home') setActivo(0);
    else if (e.key === 'End') setActivo(n - 1);
    else if (e.key === 'Escape') setActivo(null);
    else return;
    e.preventDefault();
  };

  if (!n) return <p className="d-nada">Aún no hay datos de ventas.</p>;

  const v = activo !== null ? datos[activo].total : 0;
  const dif = v - prom;
  const tipX = activo !== null ? Math.min(Math.max(x(activo), 92), w - 92) : 0;
  const tipY = activo !== null ? y(v) : 0;
  const arriba = tipY > 120;

  return (
    <>
      <div className="tb-head">
        <h3>Ventas de los últimos {n} días</h3>
        <div className="gr-modos" role="group" aria-label="Tipo de gráfico">
          <button type="button" aria-pressed={modo === 'linea'} onClick={() => setModo('linea')}>Línea</button>
          <button type="button" aria-pressed={modo === 'barras'} onClick={() => setModo('barras')}>Barras</button>
        </div>
      </div>

      <dl className="gr-stats">
        <div><dt>Total</dt><dd>{dinero(total)}</dd></div>
        <div><dt>Promedio por día</dt><dd>{dinero(Math.round(prom))}</dd></div>
        <div>
          <dt>Mejor día</dt>
          <dd>{total > 0 ? <>{dinero(datos[mejor].total)}<small>{larga(fechas[mejor]).split(',')[0]}</small></> : '—'}</dd>
        </div>
      </dl>

      <div
        ref={caja}
        className="gr gr-lienzo"
        tabIndex={0}
        role="group"
        aria-label={`Gráfico de ventas de los últimos ${n} días. Use las flechas para recorrer los días.`}
        onKeyDown={teclas}
        onBlur={() => setActivo(null)}
      >
        <svg
          width={w}
          height={H}
          onPointerMove={mover}
          onPointerDown={mover}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActivo(null)}
        >
          <defs>
            <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--x-oro)', stopOpacity: 0.34 }} />
              <stop offset="100%" style={{ stopColor: 'var(--x-oro)', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--x-oro)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--x-oro)', stopOpacity: 0.55 }} />
            </linearGradient>
          </defs>

          {/* Cuadrícula y eje Y */}
          {ticks.map((t) => (
            <g key={t}>
              <line className={`gr-grid${t === 0 ? ' base' : ''}`} x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} />
              <text className="gr-eje" x={m.l - 8} y={y(t) + 3} textAnchor="end">{t === 0 ? '0' : corto(t)}</text>
            </g>
          ))}

          {/* Línea del promedio */}
          {total > 0 && (
            <g>
              <line className="gr-prom" x1={m.l} x2={w - m.r} y1={y(prom)} y2={y(prom)} />
              <text className="gr-prom-t" x={w - m.r} y={y(prom) - 5} textAnchor="end">Promedio {corto(Math.round(prom))}</text>
            </g>
          )}

          {/* Cruz vertical del día activo */}
          {activo !== null && <line className="gr-cruz" x1={x(activo)} x2={x(activo)} y1={m.t} y2={y(0)} />}

          {modo === 'linea' ? (
            <>
              <path d={area} fill={`url(#${id}-a)`} />
              <path d={trazo} className="gr-linea" />
              {datos.map((d, i) => (
                <circle key={i} className={`gr-punto${activo === i ? ' on' : ''}`} cx={x(i)} cy={y(d.total)} r={activo === i ? 5.5 : 3.5} />
              ))}
            </>
          ) : (
            datos.map((d, i) => {
              const alto = d.total > 0 ? Math.max(y(0) - y(d.total), 3) : 0;
              return (
                <rect
                  key={i}
                  x={x(i) - bw / 2}
                  y={y(0) - alto}
                  width={bw}
                  height={alto}
                  rx={3}
                  fill={`url(#${id}-b)`}
                  opacity={activo === null || activo === i ? 1 : 0.55}
                />
              );
            })
          )}

          {/* Eje X: letra del día, número y "Hoy" */}
          {datos.map((d, i) => {
            const esHoy = i === n - 1;
            return (
              <g key={i}>
                <text className={`gr-eje${esHoy ? ' hoy' : ''}`} x={x(i)} y={H - 24} textAnchor="middle">{d.letra}</text>
                <text className={`gr-eje2${esHoy ? ' hoy' : ''}`} x={x(i)} y={H - 10} textAnchor="middle">
                  {esHoy ? 'Hoy' : fechas[i].getUTCDate()}
                </text>
              </g>
            );
          })}

          {total === 0 && (
            <text className="gr-eje" x={m.l + iw / 2} y={m.t + ih / 2} textAnchor="middle">Aún no hay ventas en este periodo</text>
          )}
        </svg>

        {activo !== null && (
          <div
            className="gr-tip"
            style={{ left: tipX, top: arriba ? tipY - 14 : tipY + 18, transform: arriba ? 'translate(-50%,-100%)' : 'translate(-50%,0)' }}
          >
            <small>{larga(fechas[activo])}</small>
            <strong>{dinero(v)}</strong>
            <span>{total > 0 ? `${Math.round((v / total) * 100)}% de las ventas del periodo` : 'Sin ventas'}</span>
            <span className={dif >= 0 ? 'sube' : 'baja'}>
              {dif >= 0 ? '▲' : '▼'} {dinero(Math.abs(Math.round(dif)))} {dif >= 0 ? 'sobre' : 'bajo'} el promedio
            </span>
          </div>
        )}

        <p className="gr-sr" aria-live="polite">
          {activo !== null ? `${larga(fechas[activo])}: ${dinero(v)}` : ''}
        </p>
      </div>
    </>
  );
}