import 'server-only';
import { hojas, SHEET_ID } from './google-sheets';

const cache = new Map<string, number>();

export async function idPestana(titulo: string): Promise<number> {
  const guardado = cache.get(titulo);
  if (guardado !== undefined) return guardado;

  const res = await hojas().spreadsheets.get({
    spreadsheetId: SHEET_ID(),
    fields: 'sheets.properties(sheetId,title)',
  });
  const h = res.data.sheets?.find((x) => x.properties?.title === titulo);
  if (h?.properties?.sheetId == null) throw new Error(`No existe la pestaña "${titulo}"`);
  cache.set(titulo, h.properties.sheetId);
  return h.properties.sheetId;
}

/** Borra una fila completa (fila = número de fila de la hoja, empezando en 1). */
export async function borrarFila(titulo: string, fila: number) {
  await hojas().spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId: await idPestana(titulo), dimension: 'ROWS', startIndex: fila - 1, endIndex: fila },
          },
        },
      ],
    },
  });
}