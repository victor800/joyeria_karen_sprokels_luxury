// 📁 RUTA: src/lib/google-sheets.ts
import 'server-only';
import { google } from 'googleapis';

export const HOJA_CONFIG = 'Configuracion';

function auth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key || !process.env.GOOGLE_SHEET_ID) {
    throw new Error('Faltan variables de entorno de Google Sheets');
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export function hojas() {
  return google.sheets({ version: 'v4', auth: auth() });
}

export const SHEET_ID = () => process.env.GOOGLE_SHEET_ID as string;

/** Crea la pestaña si no existe */
export async function asegurarPestana(nombre: string) {
  const api = hojas();
  const { data } = await api.spreadsheets.get({
    spreadsheetId: SHEET_ID(),
    fields: 'sheets.properties.title',
  });
  const existe = data.sheets?.some((s) => s.properties?.title === nombre);
  if (!existe) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID(),
      requestBody: { requests: [{ addSheet: { properties: { title: nombre } } }] },
    });
  }
}