// 📁 RUTA: src/lib/inventario.ts
// Inventario sobre Google Sheets. La pestaña "Inventario" se crea sola la primera vez que se usa,
// y cada pieza se guarda con un ID único (INV-XXXXXXXX).
// Usa el MISMO cliente y libro que configuracion.ts (./google-sheets), para no depender de otras variables de entorno.
import 'server-only';
import { hojas, SHEET_ID } from './google-sheets';

export type Item = {
  id: string;
  nombre: string;
  categoria: string;
  quilate: string;
  peso: string;
  existencias: number;
  minimo: number;
  ubicacion: string;
  precio_manual: string;
  precio: number;
  foto_url: string;
  creado: string;
  actualizado: string;
  precio_fecha: string;
};
export type Precios = { p24: string; p18: string; p14: string; margen: string };

const HOJA = 'Inventario';
const COLUMNAS = [
  'id', 'nombre', 'categoria', 'quilate', 'peso', 'existencias', 'minimo', 'ubicacion',
  'precio_manual', 'precio', 'foto_url', 'creado', 'actualizado', 'precio_fecha',
];
const ULTIMA = 'N'; // 14 columnas: A..N

const sheets = () => hojas();
const ID_LIBRO = () => SHEET_ID();

/* ---------- Hoja automática ---------- */
let hojaId: number | null = null;

async function buscarHoja(): Promise<number | null> {
  const meta = await sheets().spreadsheets.get({
    spreadsheetId: ID_LIBRO(),
    fields: 'sheets.properties(sheetId,title)',
  });
  const existe = meta.data.sheets?.find((x) => x.properties?.title === HOJA);
  return existe ? (existe.properties?.sheetId ?? 0) : null;
}

async function asegurarHoja(): Promise<number> {
  if (hojaId !== null) return hojaId;
  const s = sheets();
  const spreadsheetId = ID_LIBRO();

  const actual = await buscarHoja();
  if (actual !== null) {
    hojaId = actual;
    return hojaId;
  }

  try {
    const r = await s.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: HOJA, gridProperties: { frozenRowCount: 1 } } } }] },
    });
    hojaId = r.data.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  } catch (e) {
    // Si dos peticiones la crean a la vez, la segunda falla: se vuelve a buscar
    const otra = await buscarHoja();
    if (otra === null) throw e;
    hojaId = otra;
    return hojaId;
  }

  await s.spreadsheets.values.update({
    spreadsheetId,
    range: `${HOJA}!A1:${ULTIMA}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [COLUMNAS] },
  });
  return hojaId;
}

/* ---------- Conversión fila <-> pieza ---------- */
const txt = (v: unknown) => (v === undefined || v === null ? '' : String(v));
const entero = (v: unknown) => Math.max(0, Math.floor(Number(String(v ?? '').replace(',', '.')) || 0));
const digitos = (v: unknown) => Number(String(v ?? '').replace(/\D/g, '')) || 0;

function aItem(r: unknown[]): Item {
  return {
    id: txt(r[0]), nombre: txt(r[1]), categoria: txt(r[2]), quilate: txt(r[3]) || '18', peso: txt(r[4]),
    existencias: entero(r[5]), minimo: entero(r[6]), ubicacion: txt(r[7]), precio_manual: txt(r[8]),
    precio: Number(r[9]) || 0, foto_url: txt(r[10]), creado: txt(r[11]), actualizado: txt(r[12]), precio_fecha: txt(r[13]),
  };
}
const aFila = (it: Item): (string | number)[] => [
  it.id, it.nombre, it.categoria, it.quilate, it.peso, it.existencias, it.minimo, it.ubicacion,
  it.precio_manual, it.precio, it.foto_url, it.creado, it.actualizado, it.precio_fecha,
];

const nuevoId = () => `INV-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/** Deja solo los campos permitidos y con el tipo correcto */
export function limpiar(d: Record<string, unknown>): Partial<Item> {
  const o: Partial<Item> = {};
  if (d.nombre !== undefined) o.nombre = txt(d.nombre).trim().slice(0, 120);
  if (d.categoria !== undefined) o.categoria = txt(d.categoria).trim().slice(0, 40);
  if (d.quilate !== undefined) o.quilate = ['24', '18', '14'].includes(txt(d.quilate)) ? txt(d.quilate) : '18';
  if (d.peso !== undefined) o.peso = txt(d.peso).trim().slice(0, 12);
  if (d.existencias !== undefined) o.existencias = entero(d.existencias);
  if (d.minimo !== undefined) o.minimo = entero(d.minimo);
  if (d.ubicacion !== undefined) o.ubicacion = txt(d.ubicacion).trim().slice(0, 60);
  if (d.precio_manual !== undefined) o.precio_manual = String(digitos(d.precio_manual) || '');
  if (d.precio !== undefined) o.precio = Math.max(0, Math.round(Number(d.precio) || 0));
  if (d.foto_url !== undefined) o.foto_url = txt(d.foto_url).trim().slice(0, 600);
  return o;
}

/* ---------- CRUD ---------- */
export async function listarInventario(): Promise<Item[]> {
  await asegurarHoja();
  const r = await sheets().spreadsheets.values.get({
    spreadsheetId: ID_LIBRO(),
    range: `${HOJA}!A2:${ULTIMA}`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return (r.data.values || []).map((f) => aItem(f)).filter((x) => x.id);
}

async function numeroDeFila(id: string): Promise<number> {
  const r = await sheets().spreadsheets.values.get({ spreadsheetId: ID_LIBRO(), range: `${HOJA}!A:A` });
  const idx = (r.data.values || []).findIndex((x) => x[0] === id);
  return idx < 0 ? -1 : idx + 1; // fila 1-based
}

export async function crearItem(datos: Record<string, unknown>): Promise<Item> {
  await asegurarHoja();
  const d = limpiar(datos);
  const ahora = new Date().toISOString();
  const item: Item = {
    id: nuevoId(), nombre: d.nombre || '', categoria: d.categoria || 'Anillos', quilate: d.quilate || '18', peso: d.peso || '',
    existencias: d.existencias ?? 0, minimo: d.minimo ?? 0, ubicacion: d.ubicacion || '', precio_manual: d.precio_manual || '',
    precio: d.precio ?? 0, foto_url: d.foto_url || '', creado: ahora, actualizado: ahora, precio_fecha: ahora,
  };
  await sheets().spreadsheets.values.append({
    spreadsheetId: ID_LIBRO(),
    range: `${HOJA}!A:${ULTIMA}`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [aFila(item)] },
  });
  return item;
}

export async function actualizarItem(id: string, datos: Record<string, unknown>): Promise<Item | null> {
  await asegurarHoja();
  const fila = await numeroDeFila(id);
  if (fila < 2) return null;
  const s = sheets();
  const rango = `${HOJA}!A${fila}:${ULTIMA}${fila}`;
  const actual = aItem(((await s.spreadsheets.values.get({ spreadsheetId: ID_LIBRO(), range: rango, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [[]])[0]);
  const d = limpiar(datos);
  const ahora = new Date().toISOString();
  const nuevo: Item = { ...actual, ...d, id: actual.id, creado: actual.creado, actualizado: ahora };
  if (d.precio !== undefined && d.precio !== actual.precio) nuevo.precio_fecha = ahora;
  await s.spreadsheets.values.update({
    spreadsheetId: ID_LIBRO(), range: rango, valueInputOption: 'RAW', requestBody: { values: [aFila(nuevo)] },
  });
  return nuevo;
}

export async function eliminarItem(id: string): Promise<boolean> {
  const sid = await asegurarHoja();
  const fila = await numeroDeFila(id);
  if (fila < 2) return false;
  await sheets().spreadsheets.batchUpdate({
    spreadsheetId: ID_LIBRO(),
    requestBody: { requests: [{ deleteDimension: { range: { sheetId: sid, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila } } }] },
  });
  return true;
}

/* ---------- Precio del oro aplicado a todas las piezas ---------- */
export function calcPrecio(quilate: string, peso: string, precios: Precios): number {
  const gramo = digitos(precios[`p${quilate}` as keyof Precios]);
  const pe = Number(String(peso || '').replace(',', '.'));
  const margen = Number(String(precios.margen || '0').replace(',', '.')) || 0;
  return pe > 0 && gramo > 0 ? Math.round(pe * gramo * (1 + margen / 100)) : 0;
}

/** Recalcula el precio de todas las piezas (peso × oro del quilate + margen). Respeta las de precio manual. */
export async function aplicarPreciosOro(precios: Precios): Promise<{ actualizadas: number; omitidas: number }> {
  await asegurarHoja();
  const s = sheets();
  const spreadsheetId = ID_LIBRO();
  const r = await s.spreadsheets.values.get({ spreadsheetId, range: `${HOJA}!A2:${ULTIMA}`, valueRenderOption: 'UNFORMATTED_VALUE' });
  const filas = r.data.values || [];
  if (!filas.length) return { actualizadas: 0, omitidas: 0 };

  const ahora = new Date().toISOString();
  const colPrecio: (string | number)[][] = [];
  const colFecha: (string | number)[][] = [];
  let actualizadas = 0;
  let omitidas = 0;

  for (const f of filas) {
    const it = aItem(f);
    const previoP = f[9] === undefined || f[9] === null ? '' : (f[9] as string | number);
    const previoF = f[13] === undefined || f[13] === null ? '' : (f[13] as string | number);
    if (!it.id) { colPrecio.push([previoP]); colFecha.push([previoF]); continue; }
    const nuevo = it.precio_manual ? 0 : calcPrecio(it.quilate, it.peso, precios);
    if (nuevo > 0) {
      colPrecio.push([nuevo]);
      colFecha.push([ahora]);
      actualizadas++;
    } else {
      colPrecio.push([previoP]);
      colFecha.push([previoF]);
      omitidas++;
    }
  }

  const ultimaFila = filas.length + 1;
  await s.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${HOJA}!J2:J${ultimaFila}`, values: colPrecio },
        { range: `${HOJA}!N2:N${ultimaFila}`, values: colFecha },
      ],
    },
  });
  return { actualizadas, omitidas };
}