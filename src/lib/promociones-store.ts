// 📁 RUTA: src/lib/promociones-store.ts
import 'server-only';
import { hojas, SHEET_ID, asegurarPestana } from './google-sheets';
import { borrarFila } from './sheets-util';
import { borrarFotoPorUrl } from './fotos-store';
import type { Promocion, PromocionInput, TipoDescuento } from '@/types/promocion';

const HOJA = 'Promociones';
const ENCABEZADOS = [
  'id', 'codigo', 'nombre', 'descripcion', 'tipo', 'valor', 'desde', 'hasta',
  'usos_max', 'usos', 'activa', 'foto_url', 'creado',
];

export class CodigoDuplicado extends Error {
  constructor() {
    super('Ya existe una promoción con ese código.');
  }
}

function aFila(p: Promocion): (string | number)[] {
  return [
    p.id, p.codigo, p.nombre, p.descripcion, p.tipo, p.valor, p.desde, p.hasta,
    p.usosMax, p.usos, p.activa ? 'true' : 'false', p.fotoUrl, p.creadoEn,
  ];
}

function deFila(f: string[]): Promocion {
  const tipo: TipoDescuento = f[4] === 'monto' ? 'monto' : 'porcentaje';
  return {
    id: f[0] ?? '',
    codigo: f[1] ?? '',
    nombre: f[2] ?? '',
    descripcion: f[3] ?? '',
    tipo,
    valor: Number(f[5] ?? 0) || 0,
    desde: f[6] ?? '',
    hasta: f[7] ?? '',
    usosMax: Number(f[8] ?? 0) || 0,
    usos: Number(f[9] ?? 0) || 0,
    activa: f[10] !== 'false',
    fotoUrl: f[11] ?? '',
    creadoEn: f[12] ?? '',
  };
}

/** Lee la pestaña (la crea si no existe y deja los encabezados al día) y recuerda la fila de cada registro. */
async function leer(): Promise<{ fila: number; p: Promocion }[]> {
  const get = () => hojas().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${HOJA}!A:M` });

  let res;
  try {
    res = await get();
  } catch {
    await asegurarPestana(HOJA);
    res = await get();
  }

  const valores = res.data.values ?? [];
  if (valores.length === 0 || valores[0].join('|') !== ENCABEZADOS.join('|')) {
    await hojas().spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${HOJA}!A1:M1`,
      valueInputOption: 'RAW',
      requestBody: { values: [ENCABEZADOS] },
    });
  }
  if (valores.length === 0) return [];

  return valores
    .slice(1)
    .map((f, i) => ({ fila: i + 2, p: deFila(f as string[]) }))
    .filter((x) => x.p.id);
}

function generarId(): string {
  return `PRM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function listar(): Promise<Promocion[]> {
  const filas = (await leer()).map((x) => x.p);
  return filas.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function crear(data: PromocionInput): Promise<Promocion> {
  const existentes = await leer(); // garantiza pestaña y encabezados
  if (existentes.some((x) => x.p.codigo === data.codigo)) throw new CodigoDuplicado();

  const nueva: Promocion = { id: generarId(), ...data, usos: 0, creadoEn: new Date().toISOString() };
  await hojas().spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA}!A:M`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [aFila(nueva)] },
  });
  return nueva;
}

export async function actualizar(id: string, data: PromocionInput): Promise<Promocion | undefined> {
  const todas = await leer();
  const x = todas.find((r) => r.p.id === id);
  if (!x) return undefined;
  if (todas.some((r) => r.p.id !== id && r.p.codigo === data.codigo)) throw new CodigoDuplicado();

  const actualizada: Promocion = { ...x.p, ...data }; // conserva "usos" y "creadoEn"
  await hojas().spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA}!A${x.fila}:M${x.fila}`,
    valueInputOption: 'RAW',
    requestBody: { values: [aFila(actualizada)] },
  });

  // Si se reemplazó o quitó la foto, se borra la anterior (sin bloquear si falla)
  if (x.p.fotoUrl && x.p.fotoUrl !== data.fotoUrl) await borrarFotoPorUrl(x.p.fotoUrl).catch(() => {});
  return actualizada;
}

export async function eliminar(id: string): Promise<boolean> {
  const x = (await leer()).find((r) => r.p.id === id);
  if (!x) return false;
  await borrarFila(HOJA, x.fila);
  if (x.p.fotoUrl) await borrarFotoPorUrl(x.p.fotoUrl).catch(() => {});
  return true;
}