import { sheets, SHEET_ID } from '../src/lib/sheets/client';
import { HOJAS } from '../src/lib/sheets/schema';

async function main() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existentes = new Set(meta.data.sheets?.map((s) => s.properties?.title));

  for (const [nombre, columnas] of Object.entries(HOJAS)) {
    if (!existentes.has(nombre)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: nombre } } }] },
      });
      console.log(`＋ Pestaña creada: ${nombre}`);
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${nombre}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[...columnas]] },
    });
    console.log(`✔ Encabezados listos: ${nombre}`);
  }
}

main().catch((e) => {
  console.error('✖ Error:', e?.message ?? e);
  process.exit(1);
});
