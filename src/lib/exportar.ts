// 📁 RUTA: src/lib/exportar.ts
import type { Cel } from '@/lib/datos-dashboard';

export const textoCelda = (c: Cel): string => (typeof c === 'string' ? c : c.chip);
const sello = () => new Date().toISOString().slice(0, 10);

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV con ; y BOM: Excel en español lo abre bien, con tildes. */
export function exportarCSV(nombre: string, cols: string[], filas: Cel[][]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lineas = [cols, ...filas.map((f) => f.map(textoCelda))].map((l) => l.map(esc).join(';'));
  descargar(new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${nombre}-${sello()}.csv`);
}

/** Excel (.xls) generado como tabla HTML. */
export function exportarExcel(nombre: string, cols: string[], filas: Cel[][]) {
  const h = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tabla =
    `<table border="1"><thead><tr>${cols.map((c) => `<th>${h(c)}</th>`).join('')}</tr></thead>` +
    `<tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${h(textoCelda(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const html = `<html><head><meta charset="utf-8"></head><body>${tabla}</body></html>`;
  descargar(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${nombre}-${sello()}.xls`);
}