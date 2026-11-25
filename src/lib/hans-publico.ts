// 📁 RUTA: src/lib/hans-publico.ts   (ARCHIVO NUEVO)
import 'server-only';
import { listarHans, leerConfigHans } from '@/lib/hans';

export type HansPub = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  tipo: 'menudeo' | 'mayorista' | 'ambos' | 'tejida';
  material: string;
  menudeo: number;
  mayorista: number;
  minMayorista: number;
  stock: number;
  descripcion: string;
  fotos: string[];
  video: string;
  oro: string;
  gramos: string;
  detalles: string[];
};

const num = (s: string) => Number(String(s || '').replace(/\D/g, '')) || 0;

/** Convierte el JSON del diseñador de pulsera en líneas legibles para el cliente. */
function detallesDiseno(json: string, piezas: unknown): string[] {
  if (!json) return [];
  try {
    const d = JSON.parse(json);
    if (!d || !Array.isArray(d.balines)) return [];
    const p = (piezas ?? {}) as { tipos?: { id: string; nombre: string }[]; dijes?: { id: string; nombre: string }[] };
    const nt = (id: string) => p.tipos?.find((t) => t.id === id)?.nombre ?? id;
    const nd = (id: string) => p.dijes?.find((t) => t.id === id)?.nombre ?? id;
    const out: string[] = [];
    if (d.longitud) out.push(`Largo ${d.longitud} cm · ancho ${d.ancho} mm`);
    for (const b of d.balines as { tipo?: string; mm?: number; cant?: number }[]) {
      const c = Number(b.cant) || 0;
      if (c > 0) out.push(`${c} ${c === 1 ? 'balín' : 'balines'} ${nt(String(b.tipo)).toLowerCase()} de ${b.mm} mm`);
    }
    if (d.inicial?.txt) out.push(`Inicial «${d.inicial.txt}»`);
    if (d.dije?.id) out.push(`Dije: ${nd(String(d.dije.id))}`);
    return out;
  } catch {
    return [];
  }
}

/** Solo artículos publicados (interruptor "Publicado" del admin). Los precios ya vienen calculados en la hoja. */
export async function leerHansPublico(): Promise<HansPub[]> {
  const [todos, cfg] = await Promise.all([listarHans(), leerConfigHans().catch(() => null)]);
  return todos
    .filter((x) => x.activo === 'true')
    .map((x) => ({
      id: x.id,
      codigo: x.codigo,
      nombre: x.nombre,
      categoria: x.categoria,
      tipo: (['menudeo', 'mayorista', 'ambos', 'tejida'].includes(x.tipo) ? x.tipo : 'ambos') as HansPub['tipo'],
      material: x.material,
      menudeo: num(x.precio_menudeo),
      mayorista: num(x.precio_mayorista),
      minMayorista: num(x.min_mayorista),
      stock: num(x.stock),
      descripcion: x.descripcion,
      fotos: (x.foto_url || '').split('|').map((u) => u.trim()).filter(Boolean),
      video: x.video_url,
      oro: x.oro,
      gramos: x.gramos,
      detalles: detallesDiseno(x.diseno, cfg?.piezas),
    }));
}