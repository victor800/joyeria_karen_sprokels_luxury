// 📁 RUTA: src/lib/contadores.ts
import 'server-only';
import { listarPrendas } from './prendas';

/**
 * Números que aparecen en los círculos del menú lateral.
 * Para sumar uno nuevo (pedidos, bóveda…) agrega una línea aquí:
 *   clave → función que devuelve la cantidad.
 * Esa misma clave se pone en el ítem del menú: contador: 'clave'.
 */
const FUENTES: Record<string, () => Promise<number>> = {
  // Total de prendas en el catálogo. Para contar solo las publicadas:
  // (await listarPrendas()).filter((p) => p.activo === 'true').length
  prendas: async () => (await listarPrendas()).length,

  // pedidos: async () => (await listarPedidos()).filter((x) => x.estado === 'pendiente').length,
};

let cache: { t: number; datos: Record<string, number> } | null = null;

/** Caché de 8 s: aunque haya varias pestañas abiertas, Google Sheets se consulta poco */
export async function leerContadores(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.t < 8000) return cache.datos;

  const claves = Object.keys(FUENTES);
  const res = await Promise.allSettled(claves.map((k) => FUENTES[k]()));

  // Si una fuente falla, conserva su último valor y no tumba a las demás
  const datos: Record<string, number> = { ...(cache?.datos ?? {}) };
  res.forEach((r, i) => {
    if (r.status === 'fulfilled') datos[claves[i]] = Math.max(0, Number(r.value) || 0);
  });

  cache = { t: Date.now(), datos };
  return datos;
}