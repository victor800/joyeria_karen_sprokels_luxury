import 'server-only';
import { asegurarPestana, hojas, SHEET_ID } from './google-sheets';
import { cop, type Cel } from './datos-dashboard';

export const HOJA_PEDIDOS = 'Pedidos';
export const ESTADOS = ['Pendiente', 'En proceso', 'Entregado', 'Cancelado'] as const;

const TONO: Record<string, 'ok' | 'warn' | 'mal' | 'info'> = {
  Pendiente: 'warn',
  'En proceso': 'info',
  Entregado: 'ok',
  Cancelado: 'mal',
};

const ENCABEZADO = ['ID Joyería', 'N°', 'Fecha creación', 'Cliente', 'Prenda', 'Total', 'Entrega', 'Estado'];

function fechaCorta(iso?: unknown) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/** Pedidos de UNA joyería, el más reciente primero. Mismo orden que las columnas de la tabla. */
export async function leerPedidos(joyeriaId: string): Promise<Cel[][]> {
  await asegurarPestana(HOJA_PEDIDOS);
  const { data } = await hojas().spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA_PEDIDOS}!A2:H`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return (data.values ?? [])
    .filter((r) => r[0] === joyeriaId)
    .reverse()
    .map((r): Cel[] => {
      const estado = String(r[7] ?? 'Pendiente');
      return [
        String(r[1] ?? ''),
        String(r[3] ?? ''),
        String(r[4] ?? ''),
        cop(Number(r[5]) || 0),
        fechaCorta(r[6]),
        { chip: estado, t: TONO[estado] ?? 'info' },
      ];
    });
}

export type NuevoPedido = {
  cliente: string;
  prenda: string;
  total: number;
  entrega: string; // YYYY-MM-DD o ''
  estado: string;
};

/** Agrega el pedido al final de la hoja con el ID de la joyería. Devuelve el N° generado. */
export async function crearPedido(joyeriaId: string, p: NuevoPedido): Promise<string> {
  await asegurarPestana(HOJA_PEDIDOS);
  const api = hojas();
  const spreadsheetId = SHEET_ID();

  const cab = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A1:H1` });
  if (!cab.data.values?.length) {
    await api.spreadsheets.values.update({
      spreadsheetId,
      range: `${HOJA_PEDIDOS}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [ENCABEZADO] },
    });
  }

  // Consecutivo por joyería: P-0001, P-0002…
  const { data } = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A2:B` });
  const max = (data.values ?? [])
    .filter((r) => r[0] === joyeriaId)
    .reduce((m, r) => Math.max(m, parseInt(String(r[1]).replace(/\D/g, ''), 10) || 0), 0);
  const numero = `P-${String(max + 1).padStart(4, '0')}`;

  await api.spreadsheets.values.append({
    spreadsheetId,
    range: `${HOJA_PEDIDOS}!A:H`,
    // RAW: un cliente llamado "=SUMA(...)" se guarda como texto, no como fórmula
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[joyeriaId, numero, new Date().toISOString(), p.cliente, p.prenda, p.total, p.entrega, p.estado]],
    },
  });
  return numero;
}