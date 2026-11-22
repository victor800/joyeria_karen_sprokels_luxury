// 📁 RUTA: src/components/InsigniaContador.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

/** Consulta /api/contadores cada 10 s (solo con la pestaña visible) y al volver a ella */
export function useContadores(intervaloMs = 10000): Record<string, number> {
  const [datos, setDatos] = useState<Record<string, number>>({});

  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/contadores', { cache: 'no-store' });
        if (!res.ok) return;
        const d = await res.json();
        if (vivo && d && typeof d.contadores === 'object' && d.contadores) setDatos(d.contadores as Record<string, number>);
      } catch { /* sin conexión: se reintenta en el siguiente ciclo */ }
    };
    leer();
    const t = setInterval(leer, intervaloMs);
    const vis = () => { if (!document.hidden) leer(); };
    document.addEventListener('visibilitychange', vis);
    return () => { vivo = false; clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [intervaloMs]);

  return datos;
}

/** Círculo dorado con el número. Si es 0 (o aún no carga) no se dibuja; si pasa de 99 muestra 99+ */
export function Insignia({ n, titulo, className }: { n?: number; titulo?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previo = useRef<number | undefined>(undefined);

  // Un pequeño "latido" cuando el número cambia
  useEffect(() => {
    if (previo.current !== undefined && n !== previo.current && (n ?? 0) > 0) {
      ref.current?.animate(
        [{ transform: 'scale(1.55)' }, { transform: 'scale(1)' }],
        { duration: 450, easing: 'cubic-bezier(.2,.9,.3,1.4)' },
      );
    }
    previo.current = n;
  }, [n]);

  if (!n || n <= 0) return null;

  return (
    <span
      ref={ref}
      className={className}
      aria-label={titulo ? `${n} ${titulo}` : String(n)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        minWidth: 22,
        height: 22,
        padding: '0 6px',
        marginLeft: 10,
        boxSizing: 'border-box',
        borderRadius: 999,
        background: 'linear-gradient(135deg, #f0d680, #b08d3c)',
        color: '#0b2d1f',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: 0,
      }}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}