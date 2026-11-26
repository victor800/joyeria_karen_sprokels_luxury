// 📁 RUTA: src/lib/prendas-publicas.ts   (ARCHIVO NUEVO)
// Convierte las filas de la hoja de prendas en tarjetas con precio.
// La usan la página pública (para mostrar) y /api/pedido-web (para recalcular precios en el servidor).
import type { PrendaP, VarianteP } from '@/app/t/[slug]/CatalogoPublico';

const SEP = '|';
const parseFotos = (v: unknown): string[] =>
  (Array.isArray(v) ? v.map(String) : String(v ?? '').split(SEP)).map((x) => x.trim()).filter(Boolean);
const primerasFotos = (...vs: unknown[]): string[] => {
  for (const v of vs) { const f = parseFotos(v); if (f.length) return f; }
  return [];
};
const soloDigitos = (v: unknown) => Number(String(v ?? '').replace(/\D/g, '')) || 0;

type VarCruda = { t?: unknown; p?: unknown; s?: unknown; m?: unknown; f?: unknown };
function parseVariantes(tamano: unknown): VarCruda[] | null {
  const t = String(tamano ?? '').trim();
  if (!t.startsWith('[')) return null;
  try {
    const arr = JSON.parse(t);
    return Array.isArray(arr) && arr.length ? arr : null;
  } catch {
    return null;
  }
}

export function normalizarPrendas(crudas: unknown[], precios: Record<string, unknown>): PrendaP[] {
  const margen = Number(String(precios.margen ?? '0').replace(',', '.')) || 0;
  const calc = (quilate: string, peso: unknown, manual: unknown) => {
    const m = soloDigitos(manual);
    if (m > 0) return m;
    const gramo = soloDigitos(precios[`p${quilate}`]);
    const pe = Number(String(peso ?? '').replace(',', '.'));
    return pe > 0 && gramo > 0 ? Math.round(pe * gramo * (1 + margen / 100)) : 0;
  };

  const salida: PrendaP[] = [];
  for (const raw of crudas) {
    const r = raw as Record<string, unknown>;
    const nombre = String(r.nombre ?? '').trim();
    if (!nombre) continue;
    if (r.activo !== undefined && String(r.activo) !== 'true') continue;

    const quilate = String(r.quilate ?? '18');
    const fotosBase = primerasFotos(r.foto_url, r.foto, r.fotos, r.imagen_url, r.imagen);
    const crudasVar = parseVariantes(r.tamano);

    let variantes: VarianteP[];
    if (crudasVar) {
      const vs = crudasVar.map((x) => ({
        tamano: String(x.t ?? ''),
        peso: String(x.p ?? ''),
        stock: Number(x.s ?? 0) || 0,
        precio: calc(quilate, x.p, x.m),
        fotos: parseFotos(x.f),
      }));
      const respaldo = vs.find((x) => x.fotos.length)?.fotos ?? fotosBase;
      variantes = vs.map((x) => ({ ...x, fotos: x.fotos.length ? x.fotos : respaldo }));
    } else {
      const precio = Number(r.precio) > 0 ? Number(r.precio) : soloDigitos(r.precio) || calc(quilate, r.peso, r.precio_manual);
      variantes = [{
        tamano: String(r.tamano ?? ''),
        peso: String(r.peso ?? ''),
        stock: Number(r.stock ?? 1) || 0,
        precio,
        fotos: fotosBase,
      }];
    }

    salida.push({
      id: String(r.id ?? r.codigo ?? nombre),
      codigo: String(r.codigo ?? ''),
      nombre,
      categoria: String(r.categoria ?? ''),
      quilate,
      descripcion: String(r.descripcion ?? r.detalle ?? ''),
      variantes,
    });
  }
  return salida;
}