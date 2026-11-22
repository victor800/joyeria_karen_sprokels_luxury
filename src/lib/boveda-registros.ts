// 📁 RUTA: src/lib/boveda-registros.ts
// Piezas en custodia de la bóveda, guardadas en la pestaña "Boveda" del mismo libro de Google Sheets.
// La pestaña se crea sola la primera vez. Usa el mismo cliente que configuracion.ts e inventario.ts.
import 'server-only';
import { hojas, SHEET_ID } from './google-sheets';

export type EstadoBoveda = 'custodia' | 'retiro' | 'retirada';

export type Registro = {
  id: string;
  socio: string;
  telefono: string;
  pieza: string;
  quilate: string;
  peso: string;
  ingreso: string; // AAAA-MM-DD
  estado: EstadoBoveda;
  nota: string;
  creado: string;
  actualizado: string;
};

const HOJA = 'Boveda';
const COLUMNAS = ['id', 'socio', 'telefono', 'pieza', 'quilate', 'peso', 'ingreso', 'estado', 'nota', 'creado', 'actualizado'];
const ULTIMA = 'K'; // 11 columnas: A..K
const ESTADOS: EstadoBoveda[] = ['custodia', 'retiro', 'retirada'];

const sheets = () => hojas();
const ID_LIBRO = () => SHEET_ID();

/* ---------- Hoja automática ---------- */
let hojaId: number | null = null;

async function buscarHoja(): Promise<number | null> {
  const meta = await sheets().spreadsheets.get({ spreadsheetId: ID_LIBRO(), fields: 'sheets.properties(sheetId,title)' });
  const h = meta.data.sheets?.find((x) => x.properties?.title === HOJA);
  return h ? (h.properties?.sheetId ?? 0) : null;
}

async function asegurarHoja(): Promise<number> {
  if (hojaId !== null) return hojaId;
  const actual = await buscarHoja();
  if (actual !== null) return (hojaId = actual);
  try {
    const r = await sheets().spreadsheets.batchUpdate({
      spreadsheetId: ID_LIBRO(),
      requestBody: { requests: [{ addSheet: { properties: { title: HOJA, gridProperties: { frozenRowCount: 1 } } } }] },
    });
    hojaId = r.data.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  } catch (e) {
    const otra = await buscarHoja(); // otra petición la creó al mismo tiempo
    if (otra === null) throw e;
    return (hojaId = otra);
  }
  await sheets().spreadsheets.values.update({
    spreadsheetId: ID_LIBRO(),
    range: `${HOJA}!A1:${ULTIMA}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [COLUMNAS] },
  });
  return hojaId;
}

/* ---------- Conversión fila <-> registro ---------- */
const txt = (v: unknown) => (v === undefined || v === null ? '' : String(v));
const estadoValido = (v: unknown): EstadoBoveda => (ESTADOS.includes(v as EstadoBoveda) ? (v as EstadoBoveda) : 'custodia');

function aRegistro(r: unknown[]): Registro {
  return {
    id: txt(r[0]), socio: txt(r[1]), telefono: txt(r[2]), pieza: txt(r[3]), quilate: txt(r[4]) || '18', peso: txt(r[5]),
    ingreso: txt(r[6]), estado: estadoValido(r[7]), nota: txt(r[8]), creado: txt(r[9]), actualizado: txt(r[10]),
  };
}
const aFila = (x: Registro): string[] => [x.id, x.socio, x.telefono, x.pieza, x.quilate, x.peso, x.ingreso, x.estado, x.nota, x.creado, x.actualizado];
const nuevoId = () => `BOV-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/** Deja solo los campos permitidos y con el tipo correcto */
export function limpiar(d: Record<string, unknown>): Partial<Registro> {
  const o: Partial<Registro> = {};
  if (d.socio !== undefined) o.socio = txt(d.socio).trim().slice(0, 80);
  if (d.telefono !== undefined) o.telefono = txt(d.telefono).trim().slice(0, 25);
  if (d.pieza !== undefined) o.pieza = txt(d.pieza).trim().slice(0, 120);
  if (d.quilate !== undefined) o.quilate = ['24', '18', '14'].includes(txt(d.quilate)) ? txt(d.quilate) : '18';
  if (d.peso !== undefined) o.peso = txt(d.peso).trim().slice(0, 12);
  if (d.ingreso !== undefined) o.ingreso = /^\d{4}-\d{2}-\d{2}$/.test(txt(d.ingreso)) ? txt(d.ingreso) : '';
  if (d.estado !== undefined) o.estado = estadoValido(d.estado);
  if (d.nota !== undefined) o.nota = txt(d.nota).trim().slice(0, 300);
  return o;
}

/* ---------- CRUD ---------- */
export async function listarRegistros(): Promise<Registro[]> {
  await asegurarHoja();
  const r = await sheets().spreadsheets.values.get({ spreadsheetId: ID_LIBRO(), range: `${HOJA}!A2:${ULTIMA}`, valueRenderOption: 'UNFORMATTED_VALUE' });
  return (r.data.values || []).map((f) => aRegistro(f)).filter((x) => x.id);
}

async function numeroDeFila(id: string): Promise<number> {
  const r = await sheets().spreadsheets.values.get({ spreadsheetId: ID_LIBRO(), range: `${HOJA}!A:A` });
  const idx = (r.data.values || []).findIndex((x) => x[0] === id);
  return idx < 0 ? -1 : idx + 1;
}

export async function crearRegistro(datos: Record<string, unknown>): Promise<Registro> {
  await asegurarHoja();
  const d = limpiar(datos);
  const ahora = new Date().toISOString();
  const item: Registro = {
    id: nuevoId(), socio: d.socio || '', telefono: d.telefono || '', pieza: d.pieza || '', quilate: d.quilate || '18', peso: d.peso || '',
    ingreso: d.ingreso || ahora.slice(0, 10), estado: d.estado || 'custodia', nota: d.nota || '', creado: ahora, actualizado: ahora,
  };
  await sheets().spreadsheets.values.append({
    spreadsheetId: ID_LIBRO(), range: `${HOJA}!A:${ULTIMA}`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [aFila(item)] },
  });
  return item;
}

export async function actualizarRegistro(id: string, datos: Record<string, unknown>): Promise<Registro | null> {
  await asegurarHoja();
  const fila = await numeroDeFila(id);
  if (fila < 2) return null;
  const rango = `${HOJA}!A${fila}:${ULTIMA}${fila}`;
  const s = sheets();
  const actual = aRegistro(((await s.spreadsheets.values.get({ spreadsheetId: ID_LIBRO(), range: rango, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [[]])[0]);
  const nuevo: Registro = { ...actual, ...limpiar(datos), id: actual.id, creado: actual.creado, actualizado: new Date().toISOString() };
  await s.spreadsheets.values.update({ spreadsheetId: ID_LIBRO(), range: rango, valueInputOption: 'RAW', requestBody: { values: [aFila(nuevo)] } });
  return nuevo;
}

export async function eliminarRegistro(id: string): Promise<boolean> {
  const sid = await asegurarHoja();
  const fila = await numeroDeFila(id);
  if (fila < 2) return false;
  await sheets().spreadsheets.batchUpdate({
    spreadsheetId: ID_LIBRO(),
    requestBody: { requests: [{ deleteDimension: { range: { sheetId: sid, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila } } }] },
  });
  return true;
}