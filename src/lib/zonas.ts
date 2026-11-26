// 📁 RUTA: src/lib/zonas.ts   (ARCHIVO NUEVO)
// Zonas de cobertura y valor del domicilio, tomados de la hoja Configuración
// (fila "cobertura": "Medellin, Envigado , Sabaneta, Norte" · fila "domicilio": "18000").
// Sirve igual en el servidor y en el navegador.

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** "Medellin, Envigado , Sabaneta, Norte" → ['Medellin', 'Envigado', 'Sabaneta', 'Norte'] (sin repetidas) */
export function parseZonas(cobertura?: unknown): string[] {
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const z of String(cobertura ?? '').split(/[,;|\n]/)) {
    const t = z.trim().replace(/\s+/g, ' ');
    if (!t || vistas.has(norm(t))) continue;
    vistas.add(norm(t));
    out.push(t);
  }
  return out;
}

/** "18000" / "18.000" / "$18,000" → 18000 */
export const valorDomicilio = (v?: unknown) => Number(String(v ?? '').replace(/\D/g, '')) || 0;

/** Compara zonas sin importar mayúsculas, tildes ni espacios ("medellín" = "Medellin") */
export const mismaZona = (a?: string, b?: string) => !!a && !!b && norm(a) === norm(b);