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
const ENCABEZADOS = [
  'id', 'local_id', 'nombre', 'zona', 'vehiculo', 'entregas_hoy', 'estado', 'creado',
  'placa', 'foto_url', 'foto_vehiculo_url',
];

function aFila(d: Domiciliario): (string | number)[] {
  return [
    d.id, d.localId, d.nombre, d.zona, d.vehiculo, d.entregasHoy, d.estado, d.creadoEn,
    d.placa, d.fotoUrl, d.fotoVehiculoUrl,
  ];
}

function normalizarEstado(v: string | undefined): EstadoDomiciliario {
  if (v && (ESTADOS as string[]).includes(v)) return v as EstadoDomiciliario;
  if (v === 'inactivo') return 'offline'; // estado de la versión anterior
  return 'creado';
}

function deFila(f: string[]): Domiciliario {
  return {
    id: f[0] ?? '',
    localId: f[1] ?? '',
    nombre: f[2] ?? '',
    zona: f[3] ?? '',
    vehiculo: f[4] ?? '',
    entregasHoy: Number(f[5] ?? 0) || 0,
    estado: normalizarEstado(f[6]),
    creadoEn: f[7] ?? '',
    placa: f[8] ?? '',
    fotoUrl: f[9] ?? '',
    fotoVehiculoUrl: f[10] ?? '',
  };
}

/** Lee la pestaña (la crea si no existe, y deja los encabezados al día) y recuerda la fila de cada registro. */
async function leer(): Promise<{ fila: number; d: Domiciliario }[]> {
  const get = () =>
    hojas().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${HOJA}!A:K` });

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
      range: `${HOJA}!A1:K1`,
      valueInputOption: 'RAW',
      requestBody: { values: [ENCABEZADOS] },
    });
  }
  if (valores.length === 0) return [];

  return valores
    .slice(1)
    .map((f, i) => ({ fila: i + 2, d: deFila(f as string[]) }))
    .filter((x) => x.d.id);
}

function generarId(): string {
  return `DOM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function listar(localId?: string | null): Promise<Domiciliario[]> {
  const filas = (await leer()).map((x) => x.d);
  const out = localId ? filas.filter((d) => d.localId === localId) : filas;
  return out.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function obtener(id: string): Promise<Domiciliario | undefined> {
  return (await leer()).find((x) => x.d.id === id)?.d;
}

export async function crear(data: DomiciliarioInput): Promise<Domiciliario> {
  await leer(); // garantiza pestaña y encabezados
  const nuevo: Domiciliario = {
    id: generarId(),
    localId: data.localId,
    nombre: data.nombre,
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
    range: `${HOJA}!A:K`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [aFila(nuevo)] },
  });
  return nuevo;
}

export async function actualizar(id: string, data: DomiciliarioInput): Promise<Domiciliario | undefined> {
  const x = (await leer()).find((r) => r.d.id === id);
  if (!x) return undefined;

  const actualizado: Domiciliario = {
    ...x.d,
    localId: data.localId,
    nombre: data.nombre,
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
    range: `${HOJA}!A${x.fila}:K${x.fila}`,
    valueInputOption: 'RAW',
    requestBody: { values: [aFila(actualizado)] },
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
  const x = (await leer()).find((r) => r.d.id === id);
  if (!x) return false;

  await borrarFila(HOJA, x.fila);
  for (const url of [x.d.fotoUrl, x.d.fotoVehiculoUrl]) {
    if (url) await borrarFotoPorUrl(url).catch(() => {});
  }
  return true;
}