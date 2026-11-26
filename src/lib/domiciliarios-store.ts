// 📁 RUTA: src/lib/domiciliarios-store.ts   (REEMPLAZA TODO EL ARCHIVO)
import 'server-only';
import { hojas, SHEET_ID, asegurarPestana } from './google-sheets';
import { borrarFila } from './sheets-util';
import { borrarFotoPorUrl } from './fotos-store';
import {
  ESTADOS,
  type Domiciliario,
  type DomiciliarioInput,
  type EstadoDomiciliario,
} from '@/types/domiciliario';

const HOJA = 'Domiciliarios';

/**
 * Encabezados estándar. La hoja se lee POR NOMBRE de encabezado, no por posición:
 * puedes insertar la columna "telefono" donde quieras (por ejemplo en la C) y todo sigue funcionando.
 * Si falta alguna columna, se agrega sola al final.
 */
const ENCABEZADOS = [
  'id', 'local_id', 'nombre', 'zona', 'vehiculo', 'entregas_hoy', 'estado', 'creado',
  'placa', 'foto_url', 'foto_vehiculo_url', 'telefono',
] as const;
type Campo = (typeof ENCABEZADOS)[number];
const ULT_COL = 'Z';

const letra = (n: number) => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
const norm = (h: unknown) => String(h ?? '').trim().toLowerCase();

type Hoja = {
  header: string[];
  idx: Record<Campo, number>;
  filas: { fila: number; raw: string[]; d: Domiciliario }[];
};

function normalizarEstado(v: string | undefined): EstadoDomiciliario {
  if (v && (ESTADOS as string[]).includes(v)) return v as EstadoDomiciliario;
  if (v === 'inactivo') return 'offline'; // estado de la versión anterior
  return 'creado';
}

function deFila(raw: string[], idx: Record<Campo, number>): Domiciliario {
  const g = (c: Campo) => (idx[c] >= 0 ? String(raw[idx[c]] ?? '') : '');
  return {
    id: g('id'),
    localId: g('local_id'),
    nombre: g('nombre'),
    zona: g('zona'),
    vehiculo: g('vehiculo'),
    entregasHoy: Number(g('entregas_hoy') || 0) || 0,
    estado: normalizarEstado(g('estado')),
    creadoEn: g('creado'),
    placa: g('placa'),
    fotoUrl: g('foto_url'),
    fotoVehiculoUrl: g('foto_vehiculo_url'),
    telefono: g('telefono').replace(/[^\d+]/g, ''),
  };
}

/** Arma la fila respetando el orden real de las columnas de la hoja (y conservando columnas ajenas). */
function aFila(d: Domiciliario, hoja: Pick<Hoja, 'header' | 'idx'>, base?: string[]): (string | number)[] {
  const fila: (string | number)[] = Array.from({ length: hoja.header.length }, (_, i) => base?.[i] ?? '');
  const valores: Record<Campo, string | number> = {
    id: d.id,
    local_id: d.localId,
    nombre: d.nombre,
    zona: d.zona,
    vehiculo: d.vehiculo,
    entregas_hoy: d.entregasHoy,
    estado: d.estado,
    creado: d.creadoEn,
    placa: d.placa,
    foto_url: d.fotoUrl,
    foto_vehiculo_url: d.fotoVehiculoUrl,
    telefono: d.telefono,
  };
  for (const c of ENCABEZADOS) {
    if (hoja.idx[c] >= 0) fila[hoja.idx[c]] = valores[c];
  }
  return fila;
}

/** Lee la pestaña (la crea si no existe), deja los encabezados al día y recuerda la fila de cada registro. */
async function leer(): Promise<Hoja> {
  const get = () =>
    hojas().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${HOJA}!A:${ULT_COL}` });

  let res;
  try {
    res = await get();
  } catch {
    await asegurarPestana(HOJA);
    res = await get();
  }

  const valores = (res.data.values ?? []) as string[][];
  const original = (valores[0] ?? []).map((h) => String(h ?? ''));
  let header = original.map(norm);

  const reconocida = header.includes('id') && header.includes('nombre');
  if (!reconocida) {
    // Hoja vacía o con encabezados de otra versión: se deja el orden estándar
    header = [...ENCABEZADOS];
    await hojas().spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${HOJA}!A1:${letra(header.length)}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  } else {
    const faltan = ENCABEZADOS.filter((c) => !header.includes(c));
    if (faltan.length) {
      const nuevoEnc = [...original, ...faltan];
      header = nuevoEnc.map(norm);
      await hojas().spreadsheets.values.update({
        spreadsheetId: SHEET_ID(),
        range: `${HOJA}!A1:${letra(nuevoEnc.length)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [nuevoEnc] },
      });
    }
  }

  const idx = Object.fromEntries(ENCABEZADOS.map((c) => [c, header.indexOf(c)])) as Record<Campo, number>;
  const filas = valores
    .slice(1)
    .map((raw, i) => ({ fila: i + 2, raw, d: deFila(raw, idx) }))
    .filter((x) => x.d.id);

  return { header, idx, filas };
}

function generarId(): string {
  return `DOM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function listar(localId?: string | null): Promise<Domiciliario[]> {
  const filas = (await leer()).filas.map((x) => x.d);
  const out = localId ? filas.filter((d) => d.localId === localId) : filas;
  return out.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function obtener(id: string): Promise<Domiciliario | undefined> {
  return (await leer()).filas.find((x) => x.d.id === id)?.d;
}

export async function crear(data: DomiciliarioInput): Promise<Domiciliario> {
  const hoja = await leer(); // garantiza pestaña y encabezados
  const nuevo: Domiciliario = {
    id: generarId(),
    localId: data.localId,
    nombre: data.nombre,
    telefono: data.telefono ?? '',
    zona: data.zona,
    vehiculo: data.vehiculo,
    placa: data.placa,
    estado: data.estado,
    fotoUrl: data.fotoUrl,
    fotoVehiculoUrl: data.fotoVehiculoUrl,
    entregasHoy: data.entregasHoy ?? 0,
    creadoEn: new Date().toISOString(),
  };
  await hojas().spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA}!A:${ULT_COL}`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [aFila(nuevo, hoja)] },
  });
  return nuevo;
}

export async function actualizar(id: string, data: DomiciliarioInput): Promise<Domiciliario | undefined> {
  const hoja = await leer();
  const x = hoja.filas.find((r) => r.d.id === id);
  if (!x) return undefined;

  const actualizado: Domiciliario = {
    ...x.d,
    localId: data.localId,
    nombre: data.nombre,
    telefono: data.telefono ?? x.d.telefono,
    zona: data.zona,
    vehiculo: data.vehiculo,
    placa: data.placa,
    estado: data.estado,
    fotoUrl: data.fotoUrl,
    fotoVehiculoUrl: data.fotoVehiculoUrl,
    entregasHoy: data.entregasHoy ?? x.d.entregasHoy,
  };
  await hojas().spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA}!A${x.fila}:${letra(hoja.header.length)}${x.fila}`,
    valueInputOption: 'RAW',
    requestBody: { values: [aFila(actualizado, hoja, x.raw)] },
  });

  // Si se reemplazó o quitó una foto, se borra la anterior de la pestaña Fotos (sin bloquear si falla).
  const cambios: [string, string][] = [
    [x.d.fotoUrl, data.fotoUrl],
    [x.d.fotoVehiculoUrl, data.fotoVehiculoUrl],
  ];
  for (const [antes, ahora] of cambios) {
    if (antes && antes !== ahora) await borrarFotoPorUrl(antes).catch(() => {});
  }
  return actualizado;
}

export async function eliminar(id: string): Promise<boolean> {
  const x = (await leer()).filas.find((r) => r.d.id === id);
  if (!x) return false;

  await borrarFila(HOJA, x.fila);
  for (const url of [x.d.fotoUrl, x.d.fotoVehiculoUrl]) {
    if (url) await borrarFotoPorUrl(url).catch(() => {});
  }
  return true;
}