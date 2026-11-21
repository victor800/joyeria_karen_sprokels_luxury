import { sheets, SHEET_ID } from './client';
import { HOJAS, NombreHoja } from './schema';

type Fila = Record<string, string>;

/** Lee todas las filas de una pestaña como objetos { columna: valor }. */
export async function leerFilas(hoja: NombreHoja): Promise<Fila[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${hoja}!A1:Z`,
  });
  const [cabecera, ...filas] = res.data.values ?? [];
  if (!cabecera) return [];
  return filas.map((f) => Object.fromEntries(cabecera.map((c, i) => [c, f[i] ?? ''])));
}

/** Agrega una fila al final de la pestaña. */
export async function agregarFila(hoja: NombreHoja, datos: Record<string, string | number | boolean>) {
  const valores = HOJAS[hoja].map((c) => String(datos[c] ?? ''));
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${hoja}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [valores] },
  });
}

/** Actualiza la fila cuya columna 'id' (o 'clave') coincide. Devuelve false si no existe. */
export async function actualizarFila(
  hoja: NombreHoja,
  id: string,
  datos: Record<string, string | number | boolean>,
  columnaId = 'id'
) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${hoja}!A1:Z` });
  const filas = res.data.values ?? [];
  const idx = HOJAS[hoja].indexOf(columnaId as never);
  const pos = filas.findIndex((f, i) => i > 0 && f[idx] === id);
  if (pos === -1) return false;

  const valores = HOJAS[hoja].map((c) => String(datos[c] ?? ''));
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${hoja}!A${pos + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [valores] },
  });
  return true;
}

/** Elimina la fila cuya columna 'id' coincide. */
export async function eliminarFila(hoja: NombreHoja, id: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetId = meta.data.sheets?.find((s) => s.properties?.title === hoja)?.properties?.sheetId;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${hoja}!A1:A` });
  const pos = (res.data.values ?? []).findIndex((f, i) => i > 0 && f[0] === id);
  if (pos === -1 || sheetId == null) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: pos, endIndex: pos + 1 } } }],
    },
  });
  return true;
}
