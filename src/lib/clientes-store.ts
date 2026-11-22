// 📁 RUTA: src/lib/clientes-store.ts
import 'server-only';
import { hojas, SHEET_ID, asegurarPestana } from './google-sheets';
import { borrarFila } from './sheets-util';
import { ESTADOS_CLIENTE, type Cliente, type ClienteInput, type EstadoCliente } from '@/types/cliente';

const HOJA = 'Clientes';
const ENCABEZADOS = ['id', 'nombre', 'cedula', 'telefono', 'piezas', 'gramos', 'estado', 'creado'];

export class CedulaDuplicada extends Error {
  constructor() {
    super('Ya existe un socio con esa cédula.');
  }
}

function aFila(c: Cliente): (string | number)[] {
  return [c.id, c.nombre, c.cedula, c.telefono, c.piezas, c.gramos, c.estado, c.creadoEn];
}

function normalizarEstado(v: string | undefined): EstadoCliente {
  return v && (ESTADOS_CLIENTE as readonly string[]).includes(v) ? (v as EstadoCliente) : 'activo';
}

function deFila(f: string[]): Cliente {
  return {
    id: f[0] ?? '',
    nombre: f[1] ?? '',
    cedula: f[2] ?? '',
    telefono: f[3] ?? '',
    piezas: Number(f[4] ?? 0) || 0,
    gramos: Number(String(f[5] ?? '0').replace(',', '.')) || 0,
    estado: normalizarEstado(f[6]),
    creadoEn: f[7] ?? '',
  };
}

/** Lee la pestaña (la crea si no existe y deja los encabezados al día) y recuerda la fila de cada registro. */
async function leer(): Promise<{ fila: number; c: Cliente }[]> {
  const get = () => hojas().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${HOJA}!A:H` });

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
      range: `${HOJA}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [ENCABEZADOS] },
    });
  }
  if (valores.length === 0) return [];

  return valores
    .slice(1)
    .map((f, i) => ({ fila: i + 2, c: deFila(f as string[]) }))
    .filter((x) => x.c.id);
}

function generarId(): string {
  return `CLI-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function listar(): Promise<Cliente[]> {
  const filas = (await leer()).map((x) => x.c);
  return filas.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function obtener(id: string): Promise<Cliente | undefined> {
  return (await leer()).find((x) => x.c.id === id)?.c;
}

export async function crear(data: ClienteInput): Promise<Cliente> {
  const existentes = await leer(); // garantiza pestaña y encabezados
  if (existentes.some((x) => x.c.cedula === data.cedula)) throw new CedulaDuplicada();

  const nuevo: Cliente = { id: generarId(), ...data, creadoEn: new Date().toISOString() };
  await hojas().spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [aFila(nuevo)] },
  });
  return nuevo;
}

export async function actualizar(id: string, data: ClienteInput): Promise<Cliente | undefined> {
  const todos = await leer();
  const x = todos.find((r) => r.c.id === id);
  if (!x) return undefined;
  if (todos.some((r) => r.c.id !== id && r.c.cedula === data.cedula)) throw new CedulaDuplicada();

  const actualizado: Cliente = { ...x.c, ...data };
  await hojas().spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA}!A${x.fila}:H${x.fila}`,
    valueInputOption: 'RAW',
    requestBody: { values: [aFila(actualizado)] },
  });
  return actualizado;
}

export async function eliminar(id: string): Promise<boolean> {
  const x = (await leer()).find((r) => r.c.id === id);
  if (!x) return false;
  await borrarFila(HOJA, x.fila);
  return true;
}