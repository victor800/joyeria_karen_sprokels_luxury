// 📁 RUTA: src/lib/prendas.ts
import 'server-only';
import { randomBytes } from 'node:crypto';
import { hojas, SHEET_ID, asegurarPestana } from './google-sheets';
import { leerConfig, type Config } from './configuracion';

export const HOJA_PRENDAS = 'Prendas';

export const COLS = [
  'id', 'codigo', 'nombre', 'categoria', 'quilate', 'peso', 'tamano', 'descripcion',
  'foto_url', 'precio_manual', 'stock', 'activo', 'creado', 'actualizado',
] as const;
type Col = (typeof COLS)[number];
export type Prenda = Record<Col, string>;
export type PrendaConPrecio = Prenda & { precio: number };

const EDITABLES: Col[] = [
  'nombre', 'categoria', 'quilate', 'peso', 'tamano', 'descripcion',
  'foto_url', 'precio_manual', 'stock', 'activo',
];

const CATEGORIAS = ['Anillos', 'Collares', 'Aretes', 'Pulseras', 'Dijes', 'Cadenas', 'Esclavas'];
const QUILATES = ['24', '18', '14'];

const pesoNum = (v: unknown) => Number(String(v ?? '').replace(',', '.')) || 0;
const moneyNum = (v: unknown) => Number(String(v ?? '').replace(/\D/g, '')) || 0;

/** Precio = precio manual, o peso × precio del gramo × (1 + margen) */
export function precioPrenda(p: Prenda, cfg: Config): number {
  const manual = moneyNum(p.precio_manual);
  if (manual > 0) return manual;
  const gramo = moneyNum(cfg[`p${p.quilate}`]);
  const peso = pesoNum(p.peso);
  const margen = pesoNum(cfg.margen);
  if (gramo <= 0 || peso <= 0) return 0;
  return Math.round(peso * gramo * (1 + margen / 100));
}

type Fila = { p: Prenda; fila: number };

async function leerFilas(): Promise<Fila[]> {
  const api = hojas();
  const leer = () =>
    api.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${HOJA_PRENDAS}!A:N` });

  let res;
  try {
    res = await leer();
  } catch {
    await asegurarPestana(HOJA_PRENDAS);
    res = await leer();
  }

  let values = res.data.values ?? [];
  if (!values.length) {
    await api.spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${HOJA_PRENDAS}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[...COLS]] },
    });
    values = [[...COLS]];
  }

  return values
    .slice(1)
    .map((r, i) => {
      const p = {} as Prenda;
      COLS.forEach((c, j) => { p[c] = String(r[j] ?? ''); });
      return { p, fila: i + 2 };
    })
    .filter((x) => x.p.id);
}

function limpiarCampo(c: Col, valor: unknown): string {
  const v = String(valor ?? '').trim();
  switch (c) {
    case 'nombre':
      if (!v) throw new Error('Escribe el nombre de la prenda');
      return v.slice(0, 80);
    case 'categoria':
      if (!CATEGORIAS.includes(v)) throw new Error('Elige una categoría válida');
      return v;
    case 'quilate':
      if (!QUILATES.includes(v)) throw new Error('Elige el quilate: 24, 18 o 14');
      return v;
    case 'peso':
      if (!/^\d{1,4}([.,]\d{1,3})?$/.test(v) || pesoNum(v) <= 0)
        throw new Error('El peso debe ser un número en gramos mayor que 0');
      return v.replace(',', '.');
    case 'tamano':
      return v.slice(0, 40);
    case 'descripcion':
      return v.slice(0, 300);
    case 'foto_url':
      if (v && !/^(https:\/\/|\/)/i.test(v)) throw new Error('La URL de la foto debe empezar con https:// o con /');
      return v.slice(0, 500);
    case 'precio_manual':
      if (v && !/^[\d.,\s]+$/.test(v)) throw new Error('El precio manual debe ser un número');
      return v.replace(/[.,\s]/g, '');
    case 'stock':
      if (!/^\d{1,5}$/.test(v || '1')) throw new Error('El stock debe ser un número entero');
      return v || '1';
    case 'activo':
      return v === 'true' ? 'true' : 'false';
    default:
      return '';
  }
}

export async function listarPrendas(): Promise<PrendaConPrecio[]> {
  const [filas, cfg] = await Promise.all([leerFilas(), leerConfig()]);
  return filas
    .map(({ p }) => ({ ...p, precio: precioPrenda(p, cfg) }))
    .sort((a, b) => b.creado.localeCompare(a.creado));
}

/** Nace inhabilitada: la administradora la activa con el toggle */
export async function crearPrenda(entrada: Record<string, unknown>): Promise<PrendaConPrecio> {
  const filas = await leerFilas();
  const n = filas.reduce((m, x) => Math.max(m, Number(x.p.codigo.replace(/\D/g, '')) || 0), 0) + 1;
  const ahora = new Date().toISOString();

  const p = {} as Prenda;
  COLS.forEach((c) => { p[c] = ''; });
  p.id = `prd_${randomBytes(5).toString('hex')}`;
  p.codigo = `JKS-${String(n).padStart(4, '0')}`;
  for (const c of EDITABLES) p[c] = limpiarCampo(c, entrada[c]);
  p.activo = 'false';
  p.creado = ahora;
  p.actualizado = ahora;

  await hojas().spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA_PRENDAS}!A:N`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [COLS.map((c) => p[c])] },
  });

  const cfg = await leerConfig();
  return { ...p, precio: precioPrenda(p, cfg) };
}

export async function actualizarPrenda(id: string, cambios: Record<string, unknown>): Promise<PrendaConPrecio> {
  const filas = await leerFilas();
  const x = filas.find((f) => f.p.id === id);
  if (!x) throw new Error('No existe la prenda');

  const p = { ...x.p };
  for (const c of EDITABLES) if (c in cambios) p[c] = limpiarCampo(c, cambios[c]);
  p.actualizado = new Date().toISOString();

  await hojas().spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA_PRENDAS}!A${x.fila}:N${x.fila}`,
    valueInputOption: 'RAW',
    requestBody: { values: [COLS.map((c) => p[c])] },
  });

  const cfg = await leerConfig();
  return { ...p, precio: precioPrenda(p, cfg) };
}

export async function eliminarPrenda(id: string): Promise<void> {
  const filas = await leerFilas();
  const x = filas.find((f) => f.p.id === id);
  if (!x) throw new Error('No existe la prenda');

  const api = hojas();
  const meta = await api.spreadsheets.get({
    spreadsheetId: SHEET_ID(),
    fields: 'sheets.properties(sheetId,title)',
  });
  const sheetId = meta.data.sheets?.find((s) => s.properties?.title === HOJA_PRENDAS)?.properties?.sheetId;
  if (sheetId == null) throw new Error('No se encontró la hoja de prendas');

  await api.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      requests: [{
        deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: x.fila - 1, endIndex: x.fila } },
      }],
    },
  });
}

/** Solo lo que ve el cliente: prendas activadas, sin ids ni datos internos */
export async function leerPrendasPublicas() {
  const lista = await listarPrendas();
  return lista
    .filter((p) => p.activo === 'true')
    .map((p) => ({
      nombre: p.nombre,
      categoria: p.categoria,
      foto: p.foto_url,
      precio: p.precio > 0 ? `$${p.precio.toLocaleString('es-CO')}` : '',
      detalle: `${p.quilate}K · ${p.peso} g${p.tamano ? ` · ${p.tamano}` : ''}`,
    }));
}