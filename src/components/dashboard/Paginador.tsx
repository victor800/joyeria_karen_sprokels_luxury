// 📁 RUTA: src/components/dashboard/Paginador.tsx   (ARCHIVO NUEVO)
'use client';

import { useMemo, useState } from 'react';
import './extras-dashboard.css';

export function usePaginacion<T>(datos: T[], porPaginaInicial = 5) {
  const [pagina, setPagina] = useState(1);
  const [tam, setTam] = useState(porPaginaInicial);
  const totalPaginas = Math.max(1, Math.ceil(datos.length / tam));
  const actual = Math.min(pagina, totalPaginas);
  const items = useMemo(() => datos.slice((actual - 1) * tam, actual * tam), [datos, actual, tam]);
  return {
    items,
    pagina: actual,
    totalPaginas,
    tam,
    cantidad: datos.length,
    desde: datos.length ? (actual - 1) * tam + 1 : 0,
    hasta: Math.min(actual * tam, datos.length),
    irA: (n: number) => setPagina(Math.min(Math.max(1, n), totalPaginas)),
    cambiarTam: (n: number) => {
      setTam(n);
      setPagina(1);
    },
    reiniciar: () => setPagina(1),
  };
}

type P = ReturnType<typeof usePaginacion>;

export function Paginador({ p, opciones = [5, 10, 25] }: { p: P; opciones?: number[] }) {
  if (p.cantidad === 0) return null;

  // Ventana de números: 1 … 4 5 6 … 12
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= p.totalPaginas; i++) {
    if (i === 1 || i === p.totalPaginas || Math.abs(i - p.pagina) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }

  return (
    <nav className="pg" aria-label="Paginación">
      <span className="pg-info">
        {p.desde}–{p.hasta} de {p.cantidad}
      </span>
      <label className="pg-tam">
        Filas
        <select value={p.tam} onChange={(e) => p.cambiarTam(Number(e.target.value))}>
          {opciones.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </label>
      <div className="pg-nums">
        <button type="button" onClick={() => p.irA(p.pagina - 1)} disabled={p.pagina === 1} aria-label="Página anterior">‹</button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="pg-gap">…</span>
          ) : (
            <button
              key={n}
              type="button"
              className={n === p.pagina ? 'on' : ''}
              aria-current={n === p.pagina ? 'page' : undefined}
              onClick={() => p.irA(n)}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" onClick={() => p.irA(p.pagina + 1)} disabled={p.pagina === p.totalPaginas} aria-label="Página siguiente">›</button>
      </div>
    </nav>
  );
}