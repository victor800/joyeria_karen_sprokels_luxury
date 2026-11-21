// 📁 RUTA: src/components/dashboard/MenuExportar.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Cel } from '@/lib/datos-dashboard';
import { exportarCSV, exportarExcel } from '@/lib/exportar';

type Props = { nombre: string; cols: string[]; filas: Cel[][]; etiqueta?: string };

export default function MenuExportar({ nombre, cols, filas, etiqueta = 'EXPORTAR' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const accion = (fn: () => void) => () => {
    fn();
    setAbierto(false);
  };

  return (
    <div className="d-menu" ref={ref}>
      <button
        type="button"
        className="d-btn linea d-btn-sm"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {etiqueta} ▾
      </button>
      {abierto && (
        <div className="d-menu-lista" role="menu">
          <button type="button" role="menuitem" onClick={accion(() => exportarCSV(nombre, cols, filas))}>
            <b>CSV</b><small>Para Excel y Google Sheets</small>
          </button>
          <button type="button" role="menuitem" onClick={accion(() => exportarExcel(nombre, cols, filas))}>
            <b>Excel (.xls)</b><small>Hoja de cálculo</small>
          </button>
          <button type="button" role="menuitem" onClick={accion(() => window.print())}>
            <b>Imprimir / PDF</b><small>Guardar como PDF desde el diálogo</small>
          </button>
        </div>
      )}
    </div>
  );
}