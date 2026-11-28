// 📁 RUTA: src/lib/exportar-csv.ts   (ARCHIVO NUEVO)
// CSV con BOM y separador ";" para que Excel en español lo abra con tildes y columnas correctas.
export function descargarCSV(nombre: string, filas: Record<string, string | number>[]) {
  if (!filas.length) return;
  const cab = Object.keys(filas[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv =
    '\uFEFF' + [cab.map(esc).join(';'), ...filas.map((f) => cab.map((c) => esc(f[c])).join(';'))].join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}