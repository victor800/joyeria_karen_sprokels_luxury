import 'server-only';
import { listarPrendas } from './prendas';
import { listarInventario } from './inventario';
import { listar as listarDomiciliarios } from './domiciliarios-store';
import { listar as listarClientes } from './clientes-store';
import { listarHans } from './hans';
import { joyeriaActual } from './joyeria';
import { leerPedidos } from './pedidos';

/**
 * Números que aparecen en los círculos del menú lateral.
 * Para sumar uno nuevo agrega una línea aquí: clave → función que devuelve la cantidad.
 * Esa misma clave se pone en el ítem del menú: contador: 'clave'.
 */
const FUENTES: Record<string, () => Promise<number>> = {
  prendas: async () => (await listarPrendas()).length,
  hans: async () => (await listarHans()).length,
  inventario: async () => (await listarInventario()).length,
  domiciliarios: async () => (await listarDomiciliarios()).length,
  clientes: async () => (await listarClientes()).length,

  // Pedidos activos: todos menos entregados/cancelados (columna Estado = índice 5).
  // Para contar TODOS: return filas.length;
  pedidos: async () => {
    const filas = await leerPedidos(await joyeriaActual());
    return filas.filter((f) => {
      const c = f[5];
      const e = (typeof c === 'string' ? c : c?.chip ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      return !/entregad|complet|cancel|anulad/.test(e);
    }).length;
  },
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