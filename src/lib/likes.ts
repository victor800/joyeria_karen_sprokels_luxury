// 📁 RUTA: src/lib/likes.ts
import 'server-only';
import { hojas, SHEET_ID, asegurarPestana } from './google-sheets';
import { listarPrendas } from './prendas';

/** Pestaña "Likes": una fila por pieza → prenda_id | total | actualizado */
export const HOJA_LIKES = 'Likes';
const COLS = ['prenda_id', 'total', 'actualizado'] as const;

type Fila = { id: string; total: number; fila: number };

async function leerFilas(): Promise<Fila[]> {
  const api = hojas();
  const leer = () =>
    api.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${HOJA_LIKES}!A:C` });

  let res;
  try {
    res = await leer();
  } catch {
    await asegurarPestana(HOJA_LIKES);
    res = await leer();
  }

  let values = res.data.values ?? [];
  if (!values.length) {
    await api.spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${HOJA_LIKES}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[...COLS]] },
    });
    values = [[...COLS]];
  }

  return values
    .slice(1)
    .map((r, i) => ({ id: String(r[0] ?? ''), total: Math.max(0, Number(r[1]) || 0), fila: i + 2 }))
    .filter((x) => x.id);
}

/* ---------- Lectura (caché de 3 s para no saturar la cuota de Google Sheets) ---------- */
let cache: { t: number; datos: Record<string, number> } | null = null;

export async function leerLikes(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.t < 3000) return cache.datos;
  const filas = await leerFilas();
  const datos: Record<string, number> = {};
  for (const x of filas) datos[x.id] = x.total;
  cache = { t: Date.now(), datos };
  return datos;
}

/* ---------- Escritura: se hace de una en una para que no se pisen los likes ---------- */
let cola: Promise<unknown> = Promise.resolve();
function enCola<T>(fn: () => Promise<T>): Promise<T> {
  const r = cola.then(() => fn());
  cola = r.catch(() => undefined);
  return r;
}

/** Suma (+1) o quita (-1) un "me encanta" a la pieza. Devuelve el total nuevo. */
export function cambiarLike(id: string, delta: 1 | -1): Promise<number> {
  return enCola(async () => {
    const filas = await leerFilas();
    const x = filas.find((f) => f.id === id);
    const ahora = new Date().toISOString();
    const api = hojas();
    let total: number;

    if (x) {
      total = Math.max(0, x.total + delta);
      await api.spreadsheets.values.update({
        spreadsheetId: SHEET_ID(),
        range: `${HOJA_LIKES}!B${x.fila}:C${x.fila}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[total, ahora]] },
      });
    } else {
      total = delta > 0 ? 1 : 0;
      if (total > 0) {
        await api.spreadsheets.values.append({
          spreadsheetId: SHEET_ID(),
          range: `${HOJA_LIKES}!A:C`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [[id, total, ahora]] },
        });
      }
    }

    // El panel verá el cambio en su siguiente consulta
    cache = null;
    return total;
  });
}

/* ---------- Solo se aceptan likes para piezas publicadas ---------- */
let validas: { t: number; ids: Set<string> } | null = null;
export async function esPiezaPublicada(id: string): Promise<boolean> {
  if (!validas || Date.now() - validas.t > 60_000) {
    const lista = await listarPrendas();
    validas = { t: Date.now(), ids: new Set(lista.filter((p) => p.activo === 'true').map((p) => p.id)) };
  }
  return validas.ids.has(id);
}