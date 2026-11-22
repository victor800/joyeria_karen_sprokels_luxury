import 'server-only';
import { randomBytes } from 'node:crypto';
import { hojas, SHEET_ID, asegurarPestana } from './google-sheets';
import { origenSitio } from './configuracion';
import { borrarFila } from './sheets-util';
import { codigoDeUrl } from './foto-url';

const HOJA = 'Fotos';
const MAX_CHARS = 48000; // Google Sheets admite 50.000 caracteres por celda
const PATRON_IMG = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export function imagenValida(dataUrl: unknown): dataUrl is string {
  return typeof dataUrl === 'string' && dataUrl.length <= MAX_CHARS && PATRON_IMG.test(dataUrl);
}

export function urlCorta(codigo: string) {
  return `${origenSitio().replace(/\/$/, '')}/f/${codigo}`;
}

/** Lee la columna de códigos (la crea con encabezados si la pestaña no existe). El índice 0 es el encabezado. */
async function leerCodigos(): Promise<string[]> {
  const get = () => hojas().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${HOJA}!A:A` });

  let res;
  try {
    res = await get();
  } catch {
    await asegurarPestana(HOJA);
    res = await get();
  }

  const valores = res.data.values ?? [];
  if (valores.length === 0) {
    await hojas().spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${HOJA}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['codigo', 'imagen', 'creado']] },
    });
    return ['codigo'];
  }
  return valores.map((f) => String(f[0] ?? ''));
}

export async function guardarFoto(dataUrl: string): Promise<{ codigo: string; url: string }> {
  await leerCodigos();
  const codigo = randomBytes(6).toString('base64url'); // 8 caracteres
  await hojas().spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA}!A:C`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[codigo, dataUrl, new Date().toISOString()]] },
  });
  return { codigo, url: urlCorta(codigo) };
}

export async function leerFoto(codigo: string): Promise<{ mime: string; buffer: Buffer } | null> {
  const codigos = await leerCodigos();
  const i = codigos.indexOf(codigo);
  if (i < 1) return null;

  const res = await hojas().spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA}!B${i + 1}`,
  });
  const celda = String(res.data.values?.[0]?.[0] ?? '');
  const m = PATRON_IMG.exec(celda);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

export async function borrarFotoPorUrl(url: string) {
  const codigo = codigoDeUrl(url);
  if (!codigo) return;
  const codigos = await leerCodigos();
  const i = codigos.indexOf(codigo);
  if (i < 1) return;
  await borrarFila(HOJA, i + 1);
}